const OFtp = require( '../index' );
const fsExtra = require( 'fs-extra' );
const FtpSrv = require( 'ftp-srv' );

//

const FTPCONFIG_DEFAULT = { protocol: 'ftp', host: '127.0.0.1', pasv_url: '0.0.0.0', port: 33334, user: 'chacho', password: 'loco' };

let serverPath = `${__dirname}/srv-list`;
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

describe('list OFtp', () => {
    test( 'list and no connected' , async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        let response = await ftpClient.list();

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( 'FTP List failed: FtpConnectionError: '
                                           + 'can\'t perform \'list\' command when connection status is: not yet connected.' );
    } );

    test( 'list main', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.list();

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 2 );

        expect( response.list[ 0 ].name ).toBe( 'python2.pdf' );
        expect( response.list[ 0 ].path ).toBe( 'python2.pdf' );
        expect( response.list[ 0 ].type ).toBe( '-' );

        expect( response.list[ 1 ].name ).toBe( 'test' );
        expect( response.list[ 1 ].path ).toBe( 'test' );
        expect( response.list[ 1 ].type ).toBe( 'd' );

        await ftpClient.disconnect();
    } );

    test( 'list folder main', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.list( '/' );

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 2 );

        expect( response.list[ 0 ].name ).toBe( 'python2.pdf' );
        expect( response.list[ 0 ].path ).toBe( 'python2.pdf' );
        expect( response.list[ 0 ].type ).toBe( '-' );

        expect( response.list[ 1 ].name ).toBe( 'test' );
        expect( response.list[ 1 ].path ).toBe( 'test' );
        expect( response.list[ 1 ].type ).toBe( 'd' );

        await ftpClient.disconnect();
    } );

    test( 'list folder', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.list( 'test' );

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 0 );

        //

        await fsExtra.copy( `${__dirname}/zpython2.pdf`, `${serverPath}/test/python-copy2.pdf` );

        response = await ftpClient.list( 'test' );

        expect( response.list[ 0 ].name ).toBe( 'python-copy2.pdf' );
        expect( response.list[ 0 ].path ).toBe( 'test/python-copy2.pdf' );
        expect( response.list[ 0 ].type ).toBe( '-' );

        let fileKeys = Object.keys( response.list[ 0 ] );
        expect( fileKeys.includes( 'name' ) ).toBe( true );
        expect( fileKeys.includes( 'path' ) ).toBe( true );
        expect( fileKeys.includes( 'type' ) ).toBe( true );
        expect( fileKeys.includes( 'date' ) ).toBe( true );
        expect( fileKeys.includes( 'size' ) ).toBe( true );
        expect( fileKeys.includes( 'rights' ) ).toBe( true );
        expect( fileKeys.includes( 'owner' ) ).toBe( true );
        expect( fileKeys.includes( 'group' ) ).toBe( true );

        let rightKeys = Object.keys( response.list[ 0 ].rights );

        expect( rightKeys.includes( 'user' ) ).toBe( true );
        expect( rightKeys.includes( 'group' ) ).toBe( true );
        expect( rightKeys.includes( 'other' ) ).toBe( true );

        await ftpClient.disconnect();
    } );
});
