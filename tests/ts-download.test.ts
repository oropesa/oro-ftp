import OFtp from '../index';
import * as fsExtra from 'fs-extra';
import FtpSrv from 'ftp-srv';
import Ofn from 'oro-functions';

//

const FTPCONFIG_DEFAULT = {
    protocol: 'ftp',
    host: '127.0.0.1',
    pasv_url: '0.0.0.0',
    port: 34332,
    user: 'chacho',
    password: 'loco'
};

const serverPath = `${__dirname}/srv-download-ts`;
let ftpServer;

beforeAll( async() => {
    if( await fsExtra.exists( serverPath ) ) {
        await fsExtra.rm( serverPath, { recursive: true } );
    }

    await fsExtra.mkdir( serverPath );
    await fsExtra.mkdir( `${serverPath}/test` );
    await fsExtra.copy( `${__dirname}/zpython2.pdf`, `${serverPath}/python2-ts.pdf` );

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
    if( await fsExtra.exists( `${__dirname}/zpython-copy-ts.pdf` ) ) {
        try {
            await fsExtra.remove( `${__dirname}/zpython-copy-ts.pdf` );
        } catch {}
    }

    ftpServer.close();
} );

//

describe( 'download OFtp', () => {
    test( 'ts download and no connected', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const response = await ftpClient.download(
            'python2-ts.pdf',
            `${__dirname}/zpython-copy.pdf`
        );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'UNCONNECTED' );
        expect( response.error.msg ).toBe(
            'FTP Download failed: FtpConnectionError: connection status is not yet connected.'
        );
    } );

    test( 'ts download bad file-from name', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.download(
            'python.pdf',
            `${__dirname}/zpython-copy.pdf`
        );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOENT' );
        expect( response.error.msg ).toMatch( /(FTP Download failed: ENOENT: no such file or directory,)/ );
    } );

    test( 'ts download bad folder-to name', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.download(
            'python2-ts.pdf',
            `${__dirname}/chacho/zpython-copy.pdf`
        );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOTFOUND' );
        expect( response.error.msg ).toBe( 'FTP Download failed: Folder (From) to download not exist.' );
    } );

    test( 'ts download simple', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.download( 'python2-ts.pdf' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python2-ts.pdf' );
        expect( response.filepath ).toBe( Ofn.sanitizePath( `${process.cwd()}/python2-ts.pdf` ) );
        expect( await fsExtra.exists( `${process.cwd()}/python2-ts.pdf` ) ).toBe( true );

        if( await fsExtra.exists( `${process.cwd()}/python2-ts.pdf` ) ) {
            await fsExtra.remove( `${process.cwd()}/python2-ts.pdf` );
        }
    } );

    test( 'ts download absolute', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.download(
            'python2-ts.pdf',
            `${__dirname}/zpython-copy-ts.pdf`
        );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'zpython-copy-ts.pdf' );
        expect( response.filepath ).toBe( Ofn.sanitizePath( `${__dirname}/zpython-copy-ts.pdf` ) );
    } );

    test( 'ts download relative', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.download(
            'python2-ts.pdf',
            `../python2-copy-ts.pdf`
        );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        const filepath = Ofn.sanitizePath(
            `${Ofn.getFolderByPath( process.cwd() )}/python2-copy-ts.pdf`
        );

        expect( response.filename ).toBe( 'python2-copy-ts.pdf' );
        expect( response.filepath ).toBe( filepath );

        if( await fsExtra.exists( filepath ) ) {
            await fsExtra.remove( filepath );
        }
    } );

} );

//endregion
