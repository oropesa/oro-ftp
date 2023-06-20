import OFtp from '../index';
import * as fsExtra from 'fs-extra';
import FtpSrv from 'ftp-srv';

//

const FTPCONFIG_DEFAULT = {
    protocol: 'ftp',
    host: '127.0.0.1',
    pasv_url: '0.0.0.0',
    port: 34337,
    user: 'chacho',
    password: 'loco'
};

const serverPath = `${__dirname}/srv-rmdir-ts`;
let ftpServer;

beforeAll( async() => {
    if( await fsExtra.exists( serverPath ) ) {
        await fsExtra.rm( serverPath, { recursive: true } );
    }

    await fsExtra.mkdir( serverPath );
    await fsExtra.mkdir( `${serverPath}/test` );
    await fsExtra.mkdir( `${serverPath}/chacho/loco/tio`, { recursive: true } );
    await fsExtra.mkdir( `${serverPath}/foo/bar/baz`, { recursive: true } );
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

describe( 'rmdir OFtp', () => {
    test( 'ts rmdir and no connected', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const response = await ftpClient.rmdir( undefined );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'UNCONNECTED' );
        expect( response.error.msg ).toBe(
            'FTP Rmdir failed: FtpConnectionError: connection status is not yet connected.'
        );
    } );

    test( 'ts rmdir folder not exist', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.rmdir( 'loco' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.msg ).toBe( 'Folder not found.' );
        expect( response.folderpath ).toBe( 'loco' );
        expect( response.foldername ).toBe( 'loco' );
    } );

    test( 'ts rmdir folder not exist strict', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.rmdir( 'loco', true );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOENT' );
        expect( response.error.msg ).toMatch( /(FTP Rmdir failed: ENOENT: no such file or directory,)/ )
    } );

    test( 'ts rmdir folder with content', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.rmdir( 'chacho' );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOTEMPTY' );
        expect( response.error.msg ).toMatch( /(FTP Rmdir failed: ENOTEMPTY: directory not empty,)/ )
    } );

    test( 'ts rmdir folder', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.rmdir( 'test' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.foldername ).toBe( 'test' );
        expect( response.folderpath ).toBe( 'test' );
    } );

    test( 'ts rmdir folder in folder', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.rmdir( 'foo/bar/baz' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.foldername ).toBe( 'baz' );
        expect( response.folderpath ).toBe( 'foo/bar/baz' );
    } );
} );
