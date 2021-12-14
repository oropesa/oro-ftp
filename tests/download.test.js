const OFtp = require( '../index' );
const fsExtra = require( 'fs-extra' );
const FtpSrv = require( 'ftp-srv' );
const Ofn = require( 'oro-functions' );

//

const FTPCONFIG_DEFAULT = { protocol: 'ftp', host: '127.0.0.1', pasv_url: '0.0.0.0', port: 33332, user: 'chacho', password: 'loco' };

let serverPath = `${__dirname}/srv-download`;
let ftpServer;

beforeAll(async () => {
    if( await fsExtra.exists( serverPath ) ) { await fsExtra.rmdir( serverPath, { recursive: true } ); }

    await fsExtra.mkdir( serverPath );
    await fsExtra.mkdir( `${serverPath}/test` );
    await fsExtra.copy( `${__dirname}/zpython2.pdf`, `${serverPath}/python2.pdf` );

    ftpServer = new FtpSrv( {
        url: `${FTPCONFIG_DEFAULT.protocol}://${FTPCONFIG_DEFAULT.host}:${FTPCONFIG_DEFAULT.port}`,
        pasv_url: FTPCONFIG_DEFAULT.pasv_url
    } );
    ftpServer.on( 'login', ( data, resolve, reject ) => { return resolve( { root: serverPath } ); });
    ftpServer.listen();
});

afterAll(async () => {
    if( await fsExtra.exists( serverPath ) ) { await fsExtra.rmdir( serverPath, { recursive: true } ); }
    if( await fsExtra.exists( `${__dirname}/zpython-copy.pdf` ) ) { await fsExtra.remove( `${__dirname}/zpython-copy.pdf` ); }

    ftpServer.close();
});

//

describe('download OFtp', () => {
    test( 'download and no connected', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        let response = await ftpClient.download( 'python2.pdf', `${__dirname}/zpython-copy.pdf` );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( 'FTP Download failed: FtpConnectionError: '
                                           + 'can\'t perform \'get\' command when connection status is: not yet connected.' );
    } );

    test( 'download bad file-from name', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.download( 'python.pdf', `${__dirname}/zpython-copy.pdf` );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Download failed: Error: ENOENT: no such file or directory,)/ );
    } );

    test( 'download bad folder-to name', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.download( 'python2.pdf', `${__dirname}/chacho/zpython-copy.pdf` );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( 'FTP Download failed: Folder to download not exist.' );
    } );

    test( 'download simple', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.download( 'python2.pdf' );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python2.pdf' );
        expect( response.filepath ).toBe( Ofn.sanitizePath( `${process.cwd()}/python2.pdf` ) );
        expect( await fsExtra.exists( `${process.cwd()}/python2.pdf` ) ).toBe( true );

        if( await fsExtra.exists( `python2.pdf` ) ) {
            await fsExtra.remove( `python2.pdf` );
        }

        await ftpClient.disconnect();
    } );

    test( 'download absolute', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.download( 'python2.pdf', `${__dirname}/zpython-copy.pdf` );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'zpython-copy.pdf' );
        expect( response.filepath ).toBe( Ofn.sanitizePath( `${__dirname}/zpython-copy.pdf` ) );

        await ftpClient.disconnect();
    } );

    test( 'download relative', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.download( 'python2.pdf', `../python2-copy.pdf` );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python2-copy.pdf' );
        expect( response.filepath ).toBe( Ofn.sanitizePath( `${Ofn.getFolderByPath( process.cwd() )}/python2-copy.pdf` ) );

        if( await fsExtra.exists( `../python2-copy.pdf` ) ) {
            await fsExtra.remove( `../python2-copy.pdf` );
        }

        await ftpClient.disconnect();
    } );

});

//endregion
