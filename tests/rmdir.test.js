const OFtp = require( '../index' );
const fsExtra = require( 'fs-extra' );
const FtpSrv = require( 'ftp-srv' );

//

const FTPCONFIG_DEFAULT = { protocol: 'ftp', host: '127.0.0.1', pasv_url: '0.0.0.0', port: 33337, user: 'chacho', password: 'loco' };

let serverPath = `${__dirname}/srv-rmdir`;
let ftpServer;

beforeAll(async () => {
    if( await fsExtra.exists( serverPath ) ) { await fsExtra.rmdir( serverPath, { recursive: true } ); }

    await fsExtra.mkdir( serverPath );
    await fsExtra.mkdir( `${serverPath}/test` );
    await fsExtra.mkdir( `${serverPath}/chacho/loco/tio`, { recursive: true } );
    await fsExtra.mkdir( `${serverPath}/foo/bar/baz`, { recursive: true } );
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

    ftpServer.close();
});

//

describe('rmdir OFtp', () => {
    test( 'rmdir and no connected' , async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        let response = await ftpClient.rmdir();

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( 'FTP Rmdir failed: FtpConnectionError: '
                                           + 'can\'t perform \'rmdir\' command when connection status is: not yet connected.' );
    } );

    test( 'rmdir folder not exist', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.rmdir( 'loco' );

        expect( response.status ).toBe( true );
        expect( response.msg ).toBe( 'Folder not found.' );
        expect( response.folderpath ).toBe( 'loco' );
        expect( response.foldername ).toBe( 'loco' );

        await ftpClient.disconnect();
    } );

    test( 'rmdir folder not exist strict', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.rmdir( 'loco', true );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Rmdir failed: Error: ENOENT: no such file or directory,)/ )
    } );

    test( 'rmdir folder with content', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.rmdir( 'chacho' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Rmdir failed: Error: ENOTEMPTY: directory not empty,)/ )
    } );

    test( 'rmdir folder', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.rmdir( 'test' );

        expect( response.status ).toBe( true );
        expect( response.foldername ).toBe( 'test' );
        expect( response.folderpath ).toBe( 'test' );

        await ftpClient.disconnect();
    } );

    test( 'rmdir folder in folder', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.rmdir( 'foo/bar/baz' );

        expect( response.status ).toBe( true );
        expect( response.foldername ).toBe( 'baz' );
        expect( response.folderpath ).toBe( 'foo/bar/baz' );

        await ftpClient.disconnect();
    } );
});
