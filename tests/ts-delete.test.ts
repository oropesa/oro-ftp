import OFtp from '../index';
import * as fsExtra from 'fs-extra';
import FtpSrv from 'ftp-srv';

//

const FTPCONFIG_DEFAULT = {
    protocol: 'ftp',
    host: '127.0.0.1',
    pasv_url: '0.0.0.0',
    port: 34331,
    user: 'chacho',
    password: 'loco'
};

const serverPath = `${__dirname}/srv-delete-ts`;
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

describe( 'delete OFtp', () => {
    test( 'ts delete and no connected', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const response = await ftpClient.delete( undefined );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'UNCONNECTED' );
        expect( response.error.msg ).toBe(
            'FTP Delete failed: FtpConnectionError: connection status is not yet connected.'
        );
    } );

    test( 'ts delete bad file-from', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.delete( 'pthon2.pdf' );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOENT' );
        expect( response.error.msg ).toMatch( /(FTP Delete failed: ENOENT: no such file or directory,)/ );
    } );

    test( 'ts delete bad folder with file', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.delete( 'test' );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOTEMPTY' );
        expect( response.error.msg ).toMatch( /(FTP Delete failed: ENOTEMPTY: directory not empty,)/ );
    } );

    test( 'ts delete simple', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.delete( 'python2.pdf' );

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python2.pdf' );
        expect( response.filepath ).toBe( 'python2.pdf' );

        const responseList = await ftpClient.list();
        await ftpClient.disconnect();

        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }

        expect( responseList.count ).toBe( 1 );

        expect( responseList.list[ 0 ].name ).toBe( 'test' );
        expect( responseList.list[ 0 ].path ).toBe( 'test' );
        expect( responseList.list[ 0 ].type ).toBe( 'd' );
    } );

    test( 'ts delete file of folder', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.delete( 'test/python2-copy.pdf' );

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python2-copy.pdf' );
        expect( response.filepath ).toBe( 'test/python2-copy.pdf' );

        const responseList = await ftpClient.list( 'test' );
        await ftpClient.disconnect();

        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }

        expect( responseList.count ).toBe( 0 );

    } );

    test( 'ts delete folder empty', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.delete( 'test' );

        expect( response.status ).toBe( true );

        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'test' );
        expect( response.filepath ).toBe( 'test' );

        const responseList = await ftpClient.list();
        await ftpClient.disconnect();

        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }

        expect( responseList.count ).toBe( 0 );
    } );
} );
