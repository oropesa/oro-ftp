const OFtp = require( '../index' );
const fsExtra = require( 'fs-extra' );
const FtpSrv = require( 'ftp-srv' );

//

const FTPCONFIG_DEFAULT = { protocol: 'ftp', host: '127.0.0.1', pasv_url: '0.0.0.0', port: 33335, user: 'chacho', password: 'loco' };

let serverPath = `${__dirname}/srv-mkdir`;
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

    ftpServer.close();
});

//

describe('mkdir OFtp', () => {
    test( 'mkdir and no connected' , async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        let response = await ftpClient.mkdir();

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( 'FTP Mkdir failed: FtpConnectionError: '
                                           + 'can\'t perform \'mkdir\' command when connection status is: not yet connected.' );
    } );

    test( 'mkdir folder already exists', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.mkdir( 'test' );

        expect( response.status ).toBe( true );
        expect( response.msg ).toBe( 'Folder already exists.' );
        expect( response.folderpath ).toBe( 'test' );
        expect( response.foldername ).toBe( 'test' );

        await ftpClient.disconnect();
    } );

    test( 'mkdir folder already exists strict', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.mkdir( 'test', false, true );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Mkdir failed: Error: EEXIST: folder already exists,)/ )
    } );

    test( 'mkdir folder not recursive', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.mkdir( 'chacho/loco/tio' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Mkdir failed: Error: ENOENT: no such directory,)/ )
    } );

    test( 'mkdir folder recursive', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.mkdir( 'chacho/loco/tio', true );

        expect( response.status ).toBe( true );
        expect( response.foldername ).toBe( 'tio' );
        expect( response.folderpath ).toBe( 'chacho/loco/tio' );

        await ftpClient.disconnect();
    } );

    test( 'mkdir folder', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.mkdir( 'foo' );

        expect( response.status ).toBe( true );
        expect( response.foldername ).toBe( 'foo' );
        expect( response.folderpath ).toBe( 'foo' );

        await ftpClient.disconnect();
    } );

    test( 'mkdir folder in folder', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.mkdir( 'foo/bar' );

        expect( response.status ).toBe( true );
        expect( response.foldername ).toBe( 'bar' );
        expect( response.folderpath ).toBe( 'foo/bar' );

        await ftpClient.disconnect();
    } );
});
