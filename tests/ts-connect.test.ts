import OFtp from '../index';
import FtpSrv from 'ftp-srv';
import * as fsExtra from 'fs-extra';
import Ofn from 'oro-functions';

//

const FTPCONFIG_BAD = {
    host: 'http://ftp-fake.oropensando.com',
    port: 21,
    user: 'chacho',
    password: 'loco'
};
const FTPCONFIG_DEFAULT = {
    protocol: 'ftp',
    host: '127.0.0.1',
    pasv_url: '0.0.0.0',
    port: 34330,
    user: 'chacho',
    password: 'loco'
};

const serverPath = `${__dirname}/srv-con-ts`;
let ftpServer;

beforeAll( async() => {
    if( await fsExtra.exists( serverPath ) ) {
        await fsExtra.rm( serverPath, { recursive: true } );
    }

    await fsExtra.mkdir( serverPath );
    await fsExtra.copy( `${__dirname}/zpython2.pdf`, `${serverPath}/python2.pdf` );

    ftpServer = new FtpSrv( {
        url: `${FTPCONFIG_DEFAULT.protocol}://${FTPCONFIG_DEFAULT.host}:${FTPCONFIG_DEFAULT.port}`,
        pasv_url: FTPCONFIG_DEFAULT.pasv_url
    } );
    ftpServer.on( 'login', async ( data, resolve, reject ) => {
        await Ofn.sleep( 100 );

        return resolve( { root: serverPath } );
    } );
    ftpServer.listen();
} );

afterAll( async() => {
    if( await fsExtra.exists( serverPath ) ) {
        try {
            await fsExtra.rm( serverPath, { recursive: true } );
        } catch {}
    }

    ftpServer.close();
} );

//

describe( 'get OFtp parent clientFTP', () => {
    test( 'ts client is PromiseFtp', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const clientFTP = ftpClient.getClient();
        expect( Ofn.type( clientFTP, true ) ).toBe( 'PromiseFtp' );
    } );
} );

describe( 'init Bad OFtp', () => {
    test( 'ts new OFtp( undefined )', async() => {
        const ftpClient = new OFtp();

        const connected = await ftpClient.connect();

        expect( connected.status ).toBe( false );

        if( connected.status === true ) {
            return
        }

        expect( connected.tryAgain ).toBe( undefined );
        expect( connected.error.msg ).toBe( `FTP Connect failed: config is empty.` );
        expect( connected.error.code ).toBe( `UNCONNECTED` );
    } );

    test( 'ts new OFtp( bad-config host )', async() => {
        const ftpClient = new OFtp( FTPCONFIG_BAD );

        const connected = await ftpClient.connect();

        expect( connected.status ).toBe( false );

        if( connected.status === true ) {
            return
        }

        expect( connected.tryAgain ).toBe( true );
        expect( connected.error.msg ).toBe( `FTP Connect failed: getaddrinfo ENOTFOUND ${FTPCONFIG_BAD.host}.` );
        expect( connected.error.code ).toBe( `ENOTFOUND` );
    } );

    test( 'ts new OFtp( timeout-config )', async() => {
        const customConfig = Object.assign( { readyTimeout: 1 }, FTPCONFIG_DEFAULT );
        const ftpClient = new OFtp( customConfig );

        const connected = await ftpClient.connect();

        expect( connected.status ).toBe( false );

        if( connected.status === true ) {
            return
        }

        expect( connected.tryAgain ).toBe( true );
        expect( connected.error.msg ).toBe( `FTP Connect failed: Timeout while connecting to server.` );
        expect( connected.error.code ).toBe( `ENTIMEOUT` );
    } );
} );

describe( 'init OFtp', () => {
    test( 'ts new OFtp( config )', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const connected = await ftpClient.connect();
        const disconnected = await ftpClient.disconnect();

        expect( connected.status ).toBe( true );
        expect( disconnected.status ).toBe( true );
    } );
} );