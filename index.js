const path = require( 'path' );
const fsExtra = require( 'fs-extra' );
const Ofn = require( 'oro-functions' );
const PromiseFtp = require( 'promise-ftp' );
const globToRegExp = require( 'glob-to-regexp' );

function getMsgAndCodeByErr( err ) {
    let msg = err.toString().split( '\r\n' )[ 0 ].replace( 'Error: ', '' );
    let code = msg.slice( 0, msg.indexOf( ' ' ) - 1 );

    if( msg.indexOf( 'FtpConnection' ) === 0 ) {
        msg = `FtpConnectionError: connection status is ${msg.slice( msg.lastIndexOf( ':' ) + 2 )}`;
        code = 'UNCONNECTED';
    }

    return { msg, code };
}

class OFtp {

    #ftpClient;
    #config;

    constructor( config = {} ) {
        ! Ofn.objIsEmpty( config ) && this.#setFtpConfig( config );

        this.#ftpClient = new PromiseFtp();
    }

    getClient() { return this.#ftpClient; }

    #setFtpConfig( config ) {
        this.#config = Ofn.cloneObject( config );

        if( this.#config.readyTimeout ) {
            this.#config.connTimeout = this.#config.readyTimeout;
            delete this.#config.readyTimeout;
        }

        this.#config.connTimeout === undefined && ( this.#config.connTimeout = 3000 );
        this.#config.disconnectWhenError === undefined && ( this.#config.disconnectWhenError = true );
    }

    async connect( config = {} ) {
        ! Ofn.objIsEmpty( config ) && this.#setFtpConfig( config );

        if( Ofn.objIsEmpty( this.#config ) ) {
            const config = Ofn.cloneObject( this.#config );
            if( config.password ) {
                config.password = new Array( config.password.length ).fill( '*' ).join( '' )
            }

            return Ofn.setResponseKO(
                `FTP Connect failed: config is empty.`,
                { code: 'UNCONNECTED', config }
            );
        }

        return await this.#ftpClient.connect( this.#config )
            .then( () => Ofn.setResponseOK() )
            .catch( err => {
                const config = Ofn.cloneObject( this.#config );
                if( config.password ) {
                    config.password = new Array( config.password.length ).fill( '*' ).join( '' )
                }

                const { msg } = getMsgAndCodeByErr( err );
                const code = msg === 'Timeout while connecting to server' ? 'ENTIMEOUT' : err.code +'';
                const tryAgain = msg !== 'Login or password incorrect!';
                return Ofn.setResponseKO( `FTP Connect failed: ${msg}.`, { code, config }, tryAgain );
            } );
    }

    async upload( filepathFrom, filepathTo = '' ) {
        ! filepathTo && ( filepathTo = Ofn.getFilenameByPath( filepathFrom ) );
        ! path.isAbsolute( filepathFrom ) && ( filepathFrom = path.resolve( filepathFrom ) );

        if( ! await fsExtra.exists( filepathFrom ) ) {
            return Ofn.setResponseKO(
                `FTP Upload failed: File (From) to upload not exist.`,
                { filepathFrom, filepathTo, code: 'ENOTFOUND' }
            );
        }

        return await this.#ftpClient.put( filepathFrom, filepathTo )
            .then( () =>  {
                return Ofn.setResponseOK( {
                    filename: Ofn.getFilenameByPath( filepathTo ),
                    filepath: filepathTo
                } );
            } )
            .catch( async err => {
                this.#config.disconnectWhenError && ( await this.disconnect() );

                const { msg, code } = getMsgAndCodeByErr( err );
                return Ofn.setResponseKO(
                    `FTP Upload failed: ${msg}.`,
                    { filepathFrom, filepathTo, code }
                );
            } );
    }

    async download( filepathFrom, filepathTo = '' ) {
        ! filepathTo && ( filepathTo = Ofn.getFilenameByPath( filepathFrom ) );
        ! path.isAbsolute( filepathTo ) && ( filepathTo = path.resolve( filepathTo ) );

        if( ! await fsExtra.exists( Ofn.getFolderByPath( filepathTo ) ) ) {
            return Ofn.setResponseKO(
                `FTP Download failed: Folder (From) to download not exist.`,
                { filepathFrom, filepathTo, code: 'ENOTFOUND' }
            );
        }

        return await this.#ftpClient.get( filepathFrom )
            .then( async data => {
                const fileStream = fsExtra.createWriteStream( filepathTo );
                data.pipe( fileStream );

                const end = new Promise( ( resolve, reject ) => {
                    data.on( 'end', () => resolve(
                        Ofn.setResponseOK( {
                            filename: Ofn.getFilenameByPath( filepathTo ),
                            filepath: Ofn.sanitizePath( filepathTo )
                        } )
                    ) );
                    fileStream.on( 'error', ( err ) => {
                        const { msg, code } = getMsgAndCodeByErr( err );

                        return reject( Ofn.setResponseKO(
                            `FTP Download To failed: ${msg}.`,
                            { filepathFrom, filepathTo, code }
                        ) );
                    } );
                } );

                return await end.catch( e => e );
            } )
            .catch( async err => {
                this.#config.disconnectWhenError && ( await this.disconnect() );

                if( typeof err.status === 'boolean' ) {
                    return err;
                }

                const { msg, code } = getMsgAndCodeByErr( err );

                return Ofn.setResponseKO(
                    `FTP Download failed: ${msg}.`,
                    { filepathFrom, filepathTo, code }
                )
            } );
    }

    async list( folder = '', filters = {} ) {
        filters = Object.assign( { pattern: undefined, onlyFiles: false, onlyFolders: false }, filters );

        folder && folder.slice( 0, 1 ) === '/' && ( folder = folder.slice( 1 ) );
        folder && folder.slice( folder.length - 1 ) !== '/' && ( folder += '/' );

        return await this.#ftpClient.list( folder )
            .then( data => {
                const files = [];
                for( const elem of data ) {
                    if( ! elem ) { continue; }

                    switch( true ) {
                        case filters.onlyFiles && elem.type !== '-':
                        case filters.onlyFolders && elem.type !== 'd':
                        case filters.pattern && Ofn.isRegexp( filters.pattern ) && ! filters.pattern.test( elem.name ):
                        case filters.pattern && Ofn.isString( filters.pattern ) && ! globToRegExp( filters.pattern ).test( elem.name ):
                            continue;
                    }

                    delete elem.sticky;
                    delete elem.acl;
                    elem.path = `${folder}${elem.name}`;

                    files.push( elem );
                }

                return Ofn.setResponseOK( { count: files.length, list: files } );
            } )
            .catch( async err => {
                this.#config.disconnectWhenError && ( await this.disconnect() );

                const { msg, code } = getMsgAndCodeByErr( err );

                return Ofn.setResponseKO( `FTP List failed: ${msg}.`, { folder, filters, code } );
            } );
    }

    async move( filepathFrom, filepathTo ) {
        return await this.#ftpClient.rename( filepathFrom, filepathTo )
            .then( () =>  {
                return Ofn.setResponseOK( {
                    filename: Ofn.getFilenameByPath( filepathTo ),
                    filepath: filepathTo,
                } );
            } )
            .catch( async err => {
                this.#config.disconnectWhenError && ( await this.disconnect() );

                const { msg, code } = getMsgAndCodeByErr( err );

                return Ofn.setResponseKO(
                    `FTP Move failed: ${msg}.`,
                    { filepathFrom, filepathTo, code }
                );
            } );
    }

    async delete( filepathFrom, strict = false ) {
        return await this.#ftpClient.delete( filepathFrom )
            .then( () =>  {
                return Ofn.setResponseOK( 'deleted successfully', {
                    filepath: filepathFrom,
                    filename: Ofn.getFilenameByPath( filepathFrom )
                } );
            } )
            .catch( async err => {
                const { msg, code } = getMsgAndCodeByErr( err );

                if( ! strict && msg === 'File not found' ) {
                    return Ofn.setResponseOK( `file not found`, {
                        filepath: filepathFrom,
                        filename: Ofn.getFilenameByPath( filepathFrom )
                    } )
                }

                this.#config.disconnectWhenError && ( await this.disconnect() );

                return Ofn.setResponseKO(
                    `FTP Delete failed: ${msg}.`,
                    { filepathFrom, code }
                )
            } );
    }

    async exists( filepathFrom, disconnectWhenError ) {
        const filename = Ofn.getFilenameByPath( filepathFrom );
        return await this.#ftpClient.list( Ofn.getFolderByPath( filepathFrom ) )
            .then( data => {
                const files = [];
                for( const elem of data ) {
                    if( elem.name !== filename ) { continue; }
                    files.push( elem );
                    break;
                }

                return !! files[ 0 ]
                    ? Ofn.setResponseOK( {
                        filepath: filepathFrom,
                        filename: Ofn.getFilenameByPath( filepathFrom ),
                        type: files[ 0 ].type
                    } )
                    : Ofn.setResponseKO(
                        `File not exist`,
                        {
                            filepath: filepathFrom,
                            filename: Ofn.getFilenameByPath( filepathFrom ),
                            code: 'ENOENT'
                        } );
            } )
            .catch( async err => {
                Ofn.isBoolean( disconnectWhenError ) && disconnectWhenError && ( await this.disconnect() );
                ! Ofn.isBoolean( disconnectWhenError ) && this.#config.disconnectWhenError && ( await this.disconnect() );

                const { msg, code } = getMsgAndCodeByErr( err );

                return Ofn.setResponseKO(
                    `FTP Exists failed: ${msg}.`,
                    {
                        filepath: filepathFrom,
                        filename: Ofn.getFilenameByPath( filepathFrom ),
                        code
                    }
                );
            } );
    }

    async mkdir( folder, recursive = false, strict = false ) {
        const response = await this.exists( folder, false );
        if( response.status && response.type === 'd' ) {
            return strict ?
                Ofn.setResponseKO(
                    `FTP Mkdir failed: EEXIST: folder already exists, ${folder}`,
                    { folder, code: 'EEXIST' }
                ) :
                Ofn.setResponseOK( 'Folder already exists.', {
                    folderpath: folder,
                    foldername: Ofn.getFilenameByPath( folder )
                } );
        }

        if( ! recursive && Ofn.getFolderByPath( folder ).length ) {
            const response = await this.exists( Ofn.getFolderByPath( folder ), false );
            if( ! response.status ) {
                return Ofn.setResponseKO(
                    `FTP Mkdir failed: ENOENT: no such directory, ${Ofn.getFolderByPath( folder )}`,
                    { folder, code: 'ENOENT' }
                );
            }
        }

        return await this.#ftpClient.mkdir( folder, recursive )
            .then( () => Ofn.setResponseOK( {
                folderpath: folder,
                foldername: Ofn.getFilenameByPath( folder )
            } ) )
            .catch( async err => {
                this.#config.disconnectWhenError && ( await this.disconnect() );

                const { msg, code } = getMsgAndCodeByErr( err );

                return Ofn.setResponseKO(
                    `FTP Mkdir failed: ${msg}.`,
                    { folder, code }
                );
            } );
    }

    async rmdir( folder, strict = false ) {
        return await this.#ftpClient.rmdir( folder )
            .then( () => Ofn.setResponseOK( {
                folderpath: folder,
                foldername: Ofn.getFilenameByPath( folder )
            } ) )
            .catch( async err => {
                const { msg, code } = getMsgAndCodeByErr( err );

                if( ! strict && msg.match( /(ENOENT: no such file or directory,)/ ) ) {
                    return Ofn.setResponseOK( `Folder not found.`, {
                        folderpath: folder,
                        foldername: Ofn.getFilenameByPath( folder )
                    } )
                }
                this.#config.disconnectWhenError && ( await this.disconnect() );

                return Ofn.setResponseKO(
                    `FTP Rmdir failed: ${msg}.`,
                    { folder, code }
                );
            } );
    }

    async disconnect() {
        return this.#ftpClient.end()
            .then( () => Ofn.setResponseOK() )
            .catch( err => {
                const { msg } = getMsgAndCodeByErr( err );
                return Ofn.setResponseKO(
                    `FTP Disconnect failed: ${msg}.`,
                    undefined,
                    true
                )
            } );
    }

    async uploadOne( filepathFrom, filepathTo = '' ) {
        const sftpConnect = await this.connect();
        if( ! sftpConnect.status ) { return sftpConnect; }

        const sftpUpload = await this.upload( filepathFrom, filepathTo );
        if( ! sftpUpload.status ) { return sftpUpload; }

        await this.disconnect();

        return sftpUpload;
    }
}

module.exports = OFtp;