import OFtp from '../index';
import * as fsExtra from 'fs-extra';
import FtpSrv from 'ftp-srv';

//

const FTPCONFIG_DEFAULT = {
    protocol: 'ftp',
    host: '127.0.0.1',
    pasv_url: '0.0.0.0',
    port: 34333,
    user: 'chacho',
    password: 'loco'
};

const serverPath = `${__dirname}/srv-exists-ts`;
let ftpServer;

beforeAll( async() => {
    if( await fsExtra.exists( serverPath ) ) {
        await fsExtra.rm( serverPath, { recursive: true } );
    }

    await fsExtra.mkdir( serverPath );
    await fsExtra.mkdir( `${serverPath}/test` );
    await fsExtra.copy( `${__dirname}/zpython2.pdf`, `${serverPath}/python2.pdf` );
    await fsExtra.copy( `${__dirname}/zpython2.pdf`, `${serverPath}/test/python2-copy.pdf` );

    ftpServer = new FtpSrv( {
        url: `${FTPCONFIG_DEFAULT.protocol}://${FTPCONFIG_DEFAULT.host}:${FTPCONFIG_DEFAULT.port}`,
        pasv_url: FTPCONFIG_DEFAULT.pasv_url
    } );
    ftpServer.on( 'login', ( data, resolve, reject ) => {
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

describe( 'exists OFtp', () => {
    test( 'ts exists and no connected', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const response = await ftpClient.exists( undefined );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'UNCONNECTED' );
        expect( response.error.msg ).toBe(
            'FTP Exists failed: FtpConnectionError: connection status is not yet connected.'
        );
    } );

    test( 'ts exists bad file-from', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.exists( 'pthon2.pdf' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOENT' );
        expect( response.error.filename ).toBe( 'pthon2.pdf' );
        expect( response.error.filepath ).toBe( 'pthon2.pdf' );
    } );

    test( 'ts exists file-from', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.exists( 'python2.pdf' );

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python2.pdf' );
        expect( response.filepath ).toBe( 'python2.pdf' );
        expect( response.type ).toBe( '-' );

        const responseList = await ftpClient.list();
        await ftpClient.disconnect();

        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }

        expect( responseList.count ).toBe( 2 );

        expect( responseList.list[ 0 ].name ).toBe( 'python2.pdf' );
        expect( responseList.list[ 0 ].path ).toBe( 'python2.pdf' );
        expect( responseList.list[ 0 ].type ).toBe( '-' );
    } );

    test( 'ts exists file-from folder', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.exists( 'test/python2-copy.pdf' );

        const responseList = await ftpClient.list( 'test' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python2-copy.pdf' );
        expect( response.filepath ).toBe( 'test/python2-copy.pdf' );
        expect( response.type ).toBe( '-' );


        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }

        expect( responseList.count ).toBe( 1 );

        expect( responseList.list[ 0 ].name ).toBe( 'python2-copy.pdf' );
        expect( responseList.list[ 0 ].path ).toBe( 'test/python2-copy.pdf' );
        expect( responseList.list[ 0 ].type ).toBe( '-' );
    } );
} );
