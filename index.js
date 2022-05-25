const path = require( 'path' );
const fsExtra = require( 'fs-extra' );
const Ofn = require( 'oro-functions' );
const PromiseFtp = require( 'promise-ftp' );
const globToRegExp = require( 'glob-to-regexp' );

class OroFtp {

    #ftpClient
    #ftpConfig

    constructor( config = {} ) {
        ! Ofn.objIsEmpty( config ) && this.#setFtpConfig( config );

        this.#ftpClient = new PromiseFtp();
    }

    getClient() { return this.#ftpClient; }

    #setFtpConfig( config ) {
        this.#ftpConfig = Ofn.cloneObject( config, true );

        if( this.#ftpConfig.readyTimeout ) {
            this.#ftpConfig.connTimeout = this.#ftpConfig.readyTimeout;
            delete this.#ftpConfig.readyTimeout;
        }

        this.#ftpConfig.connTimeout === undefined && ( this.#ftpConfig.connTimeout = 3000 );
        this.#ftpConfig.disconnectWhenError === undefined && ( this.#ftpConfig.disconnectWhenError = true );
    }

    async connect( config = {} ) {
        ! Ofn.objIsEmpty( config ) && this.#setFtpConfig( config );

        if( Ofn.objIsEmpty( this.#ftpConfig ) ) {
            return Ofn.setResponseKO( `FTP Connect failed: ftpConfig is empty.` );
        }

        return await this.#ftpClient.connect( this.#ftpConfig )
            .then( data => Ofn.setResponseOK( data ) )
            .catch( err => {
                let cloneConfig = Ofn.cloneObject( this.#ftpConfig, true );
                cloneConfig.password && (cloneConfig.password = new Array( cloneConfig.password.length ).fill( '*' ).join( '' ));
                let errArray = err.toString().split( '\r\n' );
                let tryAgain = errArray[ 0 ] !== 'Error: Login or password incorrect!';
                return Ofn.setResponseKO( `FTP Connect failed: ${errArray[ 0 ]}.`, { ftpConfig: cloneConfig, ftpError: errArray }, tryAgain )
            } );
    }

    async upload( filepathFrom, filepathTo = '' ) {
        ! filepathTo && ( filepathTo = Ofn.getFilenameByPath( filepathFrom ) );
        ! path.isAbsolute( filepathFrom ) && ( filepathFrom = path.resolve( filepathFrom ) );

        if( ! await fsExtra.exists( filepathFrom ) ) {
            return Ofn.setResponseKO( `FTP Upload failed: File to upload not exist.`, { filepathFrom } );
        }

        return await this.#ftpClient.put( filepathFrom, filepathTo )
            .then( data =>  {
                return Ofn.setResponseOK( { filename: Ofn.getFilenameByPath( filepathTo ), filepath: filepathTo } );
            } )
            .catch( async err => {
                this.#ftpConfig.disconnectWhenError && ( await this.disconnect() );
                let errArray = err.toString().split( '\r\n' );
                return Ofn.setResponseKO( `FTP Upload failed: ${errArray[0]}.`, { ftp: errArray } );
            } );
    }

    async download( filepathFrom, filepathTo = '' ) {
        ! filepathTo && ( filepathTo = Ofn.getFilenameByPath( filepathFrom ) );
        ! path.isAbsolute( filepathTo ) && ( filepathTo = path.resolve( filepathTo ) );

        if( ! await fsExtra.exists( Ofn.getFolderByPath( filepathTo ) ) ) {
            return Ofn.setResponseKO( `FTP Download failed: Folder to download not exist.`, { filepathFrom } );
        }

        return await this.#ftpClient.get( filepathFrom )
            .then( async data => {
                let fileStream = fsExtra.createWriteStream( filepathTo );
                data.pipe( fileStream );

                let end = new Promise( ( resolve, reject ) => {
                    data.on( 'end', () => resolve(
                        Ofn.setResponseOK( { filename: Ofn.getFilenameByPath( filepathTo ), filepath: Ofn.sanitizePath( filepathTo ) } )
                    ) );
                    fileStream.on( 'error', ( err ) => reject( Ofn.setResponseKO( `FTP Download To failed: ${err.toString()}.`, err ) ) );
                } );

                return await end.catch( e => e );
            } )
            .catch( async err => {
                this.#ftpConfig.disconnectWhenError && ( await this.disconnect() );
                let errArray = err.toString().split( '\r\n' );
                return Ofn.setResponseKO( `FTP Download failed: ${errArray[0]}.`, { ftp: errArray } )
            } );
    }

    async list( folder = '', filters = {} ) {
        filters = Object.assign( { pattern: undefined, onlyFiles: false, onlyFolders: false }, filters );

        folder && folder.substr( 0, 1 ) === '/' && ( folder = folder.substr( 1 ) );
        folder && folder.substr( folder.length - 1 ) !== '/' && ( folder += '/' );

        return await this.#ftpClient.list( folder )
            .then( data => {
                let files = [];
                for( const elem of data ) {
                    if( ! elem ) { continue; }

                    if( filters.onlyFiles && elem.type !== '-' ) { continue; }
                    if( filters.onlyFolders && elem.type !== 'd' ) { continue; }
                    if( filters.pattern && Ofn.type( filters.pattern ) === 'regexp' && ! filters.pattern.test( elem.name ) ) { continue; }
                    if( filters.pattern && Ofn.isString( filters.pattern ) && ! globToRegExp( filters.pattern ).test( elem.name ) ) { continue; }

                    elem.path = `${folder}${elem.name}`;

                    files.push( elem );
                }

                return Ofn.setResponseOK( { count: files.length, list: files } );
            } )
            .catch( async err => {
                this.#ftpConfig.disconnectWhenError && ( await this.disconnect() );
                let errArray = err.toString().split( '\r\n' );
                return Ofn.setResponseKO( `FTP List failed: ${errArray[0]}.`, { ftp: errArray } );
            } );
    }

    async move( filepathFrom, filepathTo ) {
        return await this.#ftpClient.rename( filepathFrom, filepathTo )
            .then( () =>  {
                return Ofn.setResponseOK( { filename: Ofn.getFilenameByPath( filepathTo ), filepath: filepathTo, filepathFrom } );
            } )
            .catch( async err => {
                this.#ftpConfig.disconnectWhenError && ( await this.disconnect() );
                let errArray = err.toString().split( '\r\n' );
                return Ofn.setResponseKO( `FTP Move failed: ${errArray[0]}.`, { filepathFrom, filepathTo, ftp: errArray } );
            } );
    }

    async delete( filepathFrom, strict = false ) {
        return await this.#ftpClient.delete( filepathFrom )
            .then( () =>  {
                return Ofn.setResponseOK( 'deleted successfully', { filepath: filepathFrom, filename: Ofn.getFilenameByPath( filepathFrom ) } );
            } )
            .catch( async err => {
                let errArray = err.toString().split( '\r\n' );
                if( ! strict && errArray[0] === 'Error: File not found' ) {
                    return Ofn.setResponseOK( `file not found`, { filepath: filepathFrom, filename: Ofn.getFilenameByPath( filepathFrom ) } )
                }

                this.#ftpConfig.disconnectWhenError && ( await this.disconnect() );
                return Ofn.setResponseKO( `FTP Delete failed: ${errArray[0]}.`, { filepath: filepathFrom, ftp: errArray } )
            } );
    }

    async exists( filepathFrom, disconnectWhenError ) {
        let filename = Ofn.getFilenameByPath( filepathFrom );
        return await this.#ftpClient.list( Ofn.getFolderByPath( filepathFrom ) )
            .then( data => {
                let files = [];
                for( const elem of data ) {
                    if( elem.name !== filename ) { continue; }
                    files.push( elem );
                    break;
                }

                let response = Ofn.setResponseOK( { filepath: filepathFrom, filename: Ofn.getFilenameByPath( filepathFrom ) } );

                files[ 0 ] && ( response.type = files[ 0 ].type );
                response.status = !! files[ 0 ];
                return response;
            } )
            .catch( async err => {
                Ofn.isBoolean( disconnectWhenError ) && disconnectWhenError && ( await this.disconnect() );
                ! Ofn.isBoolean( disconnectWhenError ) && this.#ftpConfig.disconnectWhenError && ( await this.disconnect() );
                let errArray = err.toString().split( '\r\n' );
                return Ofn.setResponseKO( `FTP Exists failed: ${errArray[0]}.`, { filepath: filepathFrom, ftp: errArray } );
            } );
    }

    async mkdir( folder, recursive = false, strict = false ) {
        const response = await this.exists( folder, false );
        if( response.status && response.type === 'd' ) {
            return strict ?
                Ofn.setResponseKO( `FTP Mkdir failed: Error: EEXIST: folder already exists, ${folder}`, { folder } ) :
                Ofn.setResponseOK( 'Folder already exists.', { folderpath: folder, foldername: Ofn.getFilenameByPath( folder ) } );
        }

        if( ! recursive && Ofn.getFolderByPath( folder ).length ) {
            const response = await this.exists( Ofn.getFolderByPath( folder ), false );
            if( ! response.status ) {
                return Ofn.setResponseKO( `FTP Mkdir failed: Error: ENOENT: no such directory, ${Ofn.getFolderByPath( folder )}`, { folder } );
            }
        }

        return await this.#ftpClient.mkdir( folder, recursive )
            .then( () => Ofn.setResponseOK( { folderpath: folder, foldername: Ofn.getFilenameByPath( folder ) } ) )
            .catch( async err => {
                let errArray = err.toString().split( '\r\n' );
                this.#ftpConfig.disconnectWhenError && ( await this.disconnect() );
                return Ofn.setResponseKO( `FTP Mkdir failed: ${errArray[0]}.`, { folder, ftp: errArray } );
            } );
    }

    async rmdir( folder, strict = false ) {
        return await this.#ftpClient.rmdir( folder )
            .then( () => Ofn.setResponseOK( { folderpath: folder, foldername: Ofn.getFilenameByPath( folder ) } ) )
            .catch( async err => {
                let errArray = err.toString().split( '\r\n' );
                if( ! strict && errArray[ 0 ].match( /(Error: ENOENT: no such file or directory,)/ ) ) {
                    return Ofn.setResponseOK( `Folder not found.`, { folderpath: folder, foldername: Ofn.getFilenameByPath( folder ) } )
                }
                this.#ftpConfig.disconnectWhenError && ( await this.disconnect() );
                return Ofn.setResponseKO( `FTP Rmdir failed: ${errArray[0]}.`, { folder, ftp: errArray } );
            } );
    }

    async disconnect() {
        return this.#ftpClient.end()
            .then( () => Ofn.setResponseOK() )
            .catch( err => {
                let errArray = err.toString().split( '\r\n' );
                return Ofn.setResponseKO( `FTP Disconnect failed: ${errArray[0]}.`, { ftp: errArray }, true )
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

module.exports = OroFtp;