import OFtp from '../index';
import * as fsExtra from 'fs-extra';
import FtpSrv from 'ftp-srv';

//

const FTPCONFIG_DEFAULT = {
    protocol: 'ftp',
    host: '127.0.0.1',
    pasv_url: '0.0.0.0',
    port: 34336,
    user: 'chacho',
    password: 'loco'
};

const serverPath = `${__dirname}/srv-move-ts`;
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

describe( 'move OFtp', () => {
    test( 'ts move and no connected', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const response = await ftpClient.move( undefined, undefined );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'UNCONNECTED' );
        expect( response.error.msg ).toBe(
            'FTP Move failed: FtpConnectionError: connection status is not yet connected.'
        );
    } );

    test( 'ts move bad file-from', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.move(
            'pthon2.pdf',
            'python2-copy.pdf'
        );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOENT' );
        expect( response.error.msg ).toMatch( /(FTP Move failed: ENOENT: no such file or directory,)/ );
    } );

    test( 'ts move bad file-to', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.move(
            'python2.pdf',
            'chacho/python2-copy.pdf'
        );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOENT' );
        expect( response.error.msg ).toMatch( /(FTP Move failed: ENOENT: no such file or directory,)/ );
    } );

    test( 'ts move simple', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.move(
            'python2.pdf',
            'python2-copy.pdf'
        );

        const responseList = await ftpClient.list();
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python2-copy.pdf' );
        expect( response.filepath ).toBe( 'python2-copy.pdf' );

        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }
        
        expect( responseList.count ).toBe( 2 );

        expect( responseList.list[ 0 ].name ).toBe( 'python2-copy.pdf' );
        expect( responseList.list[ 0 ].path ).toBe( 'python2-copy.pdf' );
        expect( responseList.list[ 0 ].type ).toBe( '-' );

        expect( responseList.list[ 1 ].name ).toBe( 'test' );
        expect( responseList.list[ 1 ].path ).toBe( 'test' );
        expect( responseList.list[ 1 ].type ).toBe( 'd' );
    } );

    test( 'ts move to folder', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.move(
            'python2-copy.pdf',
            'test/python2-cc.pdf'
        );

        const responseList = await ftpClient.list();
        const responseList2 = await ftpClient.list( 'test' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python2-cc.pdf' );
        expect( response.filepath ).toBe( 'test/python2-cc.pdf' );

        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }
        
        expect( responseList.count ).toBe( 1 );

        expect( responseList.list[ 0 ].name ).toBe( 'test' );
        expect( responseList.list[ 0 ].path ).toBe( 'test' );
        expect( responseList.list[ 0 ].type ).toBe( 'd' );

        expect( responseList2.status ).toBe( true );
        if( responseList2.status === false ) {
            return
        }
        
        expect( responseList2.count ).toBe( 1 );

        expect( responseList2.list[ 0 ].name ).toBe( 'python2-cc.pdf' );
        expect( responseList2.list[ 0 ].path ).toBe( 'test/python2-cc.pdf' );
        expect( responseList2.list[ 0 ].type ).toBe( '-' );
    } );
} );
