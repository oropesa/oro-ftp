const OFtp = require( '../index' );
const fsExtra = require( 'fs-extra' );
const FtpSrv = require( 'ftp-srv' );

//

const FTPCONFIG_DEFAULT = { protocol: 'ftp', host: '127.0.0.1', pasv_url: '0.0.0.0', port: 33331, user: 'chacho', password: 'loco' };

let serverPath = `${__dirname}/srv-delete`;
let ftpServer;

beforeAll(async () => {
    if( await fsExtra.exists( serverPath ) ) { await fsExtra.rmdir( serverPath, { recursive: true } ); }

    await fsExtra.mkdir( serverPath );
    await fsExtra.mkdir( `${serverPath}/test` );
    await fsExtra.copy( `${__dirname}/zpython2.pdf`, `${serverPath}/python2.pdf` );
    await fsExtra.copy( `${__dirname}/zpython2.pdf`, `${serverPath}/test/python2-copy.pdf` );

    ftpServer = new FtpSrv( {
        url: `${FTPCONFIG_DEFAULT.protocol}://${FTPCONFIG_DEFAULT.host}:${FTPCONFIG_DEFAULT.port}`,
        pasv_url: FTPCONFIG_DEFAULT.pasv_url
    } );
    ftpServer.on( 'login', ( data, resolve, reject ) => { return resolve( { root: serverPath } ); });
    ftpServer.listen();
});

afterAll(async () => {
    if( await fsExtra.exists( serverPath ) ) { await fsExtra.rmdir( serverPath, { recursive: true } ); }

    ftpServer.close();
});

//

describe('delete OFtp', () => {
    test( 'delete and no connected' , async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        let response = await ftpClient.delete();

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( 'FTP Delete failed: FtpConnectionError: '
                                           + 'can\'t perform \'delete\' command when connection status is: not yet connected.' );
    } );

    test( 'delete bad file-from', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.delete( 'pthon2.pdf' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Delete failed: Error: ENOENT: no such file or directory,)/ );
    } );

    test( 'delete bad folder with file', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.delete( 'test' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Delete failed: Error: ENOTEMPTY: directory not empty,)/ );
    } );

    test( 'delete simple', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.delete( 'python2.pdf' );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python2.pdf' );
        expect( response.filepath ).toBe( 'python2.pdf' );

        response = await ftpClient.list();

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 1 );

        expect( response.list[ 0 ].name ).toBe( 'test' );
        expect( response.list[ 0 ].path ).toBe( 'test' );
        expect( response.list[ 0 ].type ).toBe( 'd' );

        await ftpClient.disconnect();
    } );

    test( 'delete file of folder', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.delete( 'test/python2-copy.pdf' );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python2-copy.pdf' );
        expect( response.filepath ).toBe( 'test/python2-copy.pdf' );

        response = await ftpClient.list( 'test' );

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 0 );

        await ftpClient.disconnect();
    } );

    test( 'delete folder empty', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.delete( 'test' );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'test' );
        expect( response.filepath ).toBe( 'test' );

        response = await ftpClient.list();

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 0 );

        await ftpClient.disconnect();
    } );
});
