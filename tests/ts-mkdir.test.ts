import OFtp from '../index';
import * as fsExtra from 'fs-extra';
import FtpSrv from 'ftp-srv';

//

const FTPCONFIG_DEFAULT = {
    protocol: 'ftp',
    host: '127.0.0.1',
    pasv_url: '0.0.0.0',
    port: 34335,
    user: 'chacho',
    password: 'loco'
};

const serverPath = `${__dirname}/srv-mkdir-ts`;
let ftpServer;

beforeAll( async() => {
    if( await fsExtra.exists( serverPath ) ) {
        await fsExtra.rm( serverPath, { recursive: true } );
    }

    await fsExtra.mkdir( serverPath );
    await fsExtra.mkdir( `${serverPath}/test` );
    await fsExtra.copy( `${__dirname}/zpython2.pdf`, `${serverPath}/python2.pdf` );

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

describe( 'mkdir OFtp', () => {
    test( 'ts mkdir and no connected', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const response = await ftpClient.mkdir( undefined );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'UNCONNECTED' );
        expect( response.error.msg ).toBe(
            'FTP Mkdir failed: FtpConnectionError: connection status is not yet connected.'
        );
    } );

    test( 'ts mkdir folder already exists', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.mkdir( 'test' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.msg ).toBe( 'Folder already exists.' );
        expect( response.folderpath ).toBe( 'test' );
        expect( response.foldername ).toBe( 'test' );
    } );

    test( 'ts mkdir folder already exists strict', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.mkdir(
            'test',
            false,
            true
        );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'EEXIST' );
        expect( response.error.msg ).toMatch( /(FTP Mkdir failed: EEXIST: folder already exists,)/ )
    } );

    test( 'ts mkdir folder not recursive', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.mkdir( 'chacho/loco/tio' );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOENT' );
        expect( response.error.msg ).toMatch( /(FTP Mkdir failed: ENOENT: no such directory,)/ )
    } );

    test( 'ts mkdir folder recursive', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.mkdir( 'chacho/loco/tio', true );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.foldername ).toBe( 'tio' );
        expect( response.folderpath ).toBe( 'chacho/loco/tio' );
    } );

    test( 'ts mkdir folder', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.mkdir( 'foo' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.foldername ).toBe( 'foo' );
        expect( response.folderpath ).toBe( 'foo' );
    } );

    test( 'ts mkdir folder in folder', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.mkdir( 'foo/bar' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.foldername ).toBe( 'bar' );
        expect( response.folderpath ).toBe( 'foo/bar' );
    } );
} );
