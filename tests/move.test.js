const OFtp = require( '../index' );
const fsExtra = require( 'fs-extra' );
const FtpSrv = require( 'ftp-srv' );

//

const FTPCONFIG_DEFAULT = { protocol: 'ftp', host: '127.0.0.1', pasv_url: '0.0.0.0', port: 33336, user: 'chacho', password: 'loco' };

let serverPath = `${__dirname}/srv-move`;
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

describe('move OFtp', () => {
    test( 'move and no connected' , async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        let response = await ftpClient.move();

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( 'FTP Move failed: FtpConnectionError: '
                                           + 'can\'t perform \'rename\' command when connection status is: not yet connected.' );
    } );

    test( 'move bad file-from', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.move( 'pthon2.pdf', 'python2-copy.pdf' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Move failed: Error: ENOENT: no such file or directory,)/ );
    } );

    test( 'move bad file-to', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.move( 'python2.pdf', 'chacho/python2-copy.pdf' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Move failed: Error: ENOENT: no such file or directory,)/ );
    } );

    test( 'move simple', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.move( 'python2.pdf', 'python2-copy.pdf' );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python2-copy.pdf' );
        expect( response.filepath ).toBe( 'python2-copy.pdf' );
        expect( response.filepathFrom ).toBe( 'python2.pdf' );

        response = await ftpClient.list();

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 2 );

        expect( response.list[ 0 ].name ).toBe( 'python2-copy.pdf' );
        expect( response.list[ 0 ].path ).toBe( 'python2-copy.pdf' );
        expect( response.list[ 0 ].type ).toBe( '-' );

        expect( response.list[ 1 ].name ).toBe( 'test' );
        expect( response.list[ 1 ].path ).toBe( 'test' );
        expect( response.list[ 1 ].type ).toBe( 'd' );

        await ftpClient.disconnect();
    } );

    test( 'move to folder', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.move( 'python2-copy.pdf', 'test/python2-cc.pdf' );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python2-cc.pdf' );
        expect( response.filepath ).toBe( 'test/python2-cc.pdf' );
        expect( response.filepathFrom ).toBe( 'python2-copy.pdf' );

        response = await ftpClient.list();

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 1 );

        expect( response.list[ 0 ].name ).toBe( 'test' );
        expect( response.list[ 0 ].path ).toBe( 'test' );
        expect( response.list[ 0 ].type ).toBe( 'd' );

        response = await ftpClient.list( 'test' );

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 1 );

        expect( response.list[ 0 ].name ).toBe( 'python2-cc.pdf' );
        expect( response.list[ 0 ].path ).toBe( 'test/python2-cc.pdf' );
        expect( response.list[ 0 ].type ).toBe( '-' );

        await ftpClient.disconnect();
    } );
});
