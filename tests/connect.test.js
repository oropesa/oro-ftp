const OFtp = require( '../index' );
const fsExtra = require( 'fs-extra' );
const FtpSrv = require( 'ftp-srv' );

//

const FTPCONFIG_BAD = { host: 'http://ftp-fake.oropensando.com', port: 21, user: 'chacho', password: 'loco' };
const FTPCONFIG_DEFAULT = { protocol: 'ftp', host: '127.0.0.1', pasv_url: '0.0.0.0', port: 33330, user: 'chacho', password: 'loco' };

let serverPath = `${__dirname}/srv-con`;
let ftpServer;

beforeAll(async () => {
    if( await fsExtra.exists( serverPath ) ) { await fsExtra.rmdir( serverPath, { recursive: true } ); }

    await fsExtra.mkdir( serverPath );
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

describe('get OFtp parent clientFTP', () => {
    test( 'client is PromiseFtp', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        let clientFTP = ftpClient.getClient();
        expect( clientFTP.constructor.name ).toBe( 'PromiseFtp' );
    } );
});

describe('init Bad OFtp', () => {
    test( 'new OFtp( undefined )', async () => {
        const ftpClient = new OFtp();

        const connected = await ftpClient.connect();

        expect( connected.status ).toBe( false );
        expect( connected.tryAgain ).toBe( undefined );
        expect( connected.error.msg ).toBe( `FTP Connect failed: ftpConfig is empty.` );
    } );

    test( 'new OFtp( bad-config )', async () => {
        const ftpClient = new OFtp( FTPCONFIG_BAD );

        const connected = await ftpClient.connect();

        expect( connected.status ).toBe( false );
        expect( connected.tryAgain ).toBe( true );
        expect( connected.error.msg ).toBe( `FTP Connect failed: Error: getaddrinfo ENOTFOUND ${FTPCONFIG_BAD.host}.` );
    } );

    test( 'new OFtp( timeout-config )', async () => {
        const customConfig = Object.assign( { readyTimeout: 1 }, FTPCONFIG_DEFAULT );
        const ftpClient = new OFtp( customConfig );

        const connected = await ftpClient.connect();

        expect( connected.status ).toBe( false );
        expect( connected.tryAgain ).toBe( true );
        expect( connected.error.msg ).toBe( `FTP Connect failed: Error: Timeout while connecting to server.` );
    } );
});

describe('init OFtp', () => {
    test( 'new OFtp( config )', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const connected = await ftpClient.connect();
        const disconnected = await ftpClient.disconnect();

        expect( connected.status ).toBe( true );
        expect( disconnected.status ).toBe( true );
    } );
});