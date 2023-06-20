import OFtp from '../index';
import * as fsExtra from 'fs-extra';
import FtpSrv from 'ftp-srv';
import Ofn from 'oro-functions';

//

const FTPCONFIG_DEFAULT = {
    protocol: 'ftp',
    host: '127.0.0.1',
    pasv_url: '0.0.0.0',
    port: 34338,
    user: 'chacho',
    password: 'loco'
};

const serverPath = `${__dirname}/srv-upload-ts`;
let ftpServer;

beforeAll( async() => {
    if( await fsExtra.exists( serverPath ) ) {
        try {
            await fsExtra.rm( serverPath, { recursive: true } );
        } catch {}
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

describe( 'upload OFtp', () => {
    test( 'ts upload and no connected', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const response = await ftpClient.upload(
            `${__dirname}/zpython.pdf`,
            'python.pdf'
        );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'UNCONNECTED' );
        expect( response.error.msg ).toBe(
            'FTP Upload failed: FtpConnectionError: connection status is not yet connected.'
        );
    } );

    test( 'ts upload bad file-from name', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.upload(
            `${__dirname}/zpthon.pdf`,
            'python-copy.pdf'
        );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOTFOUND' );
        expect( response.error.msg ).toBe( 'FTP Upload failed: File (From) to upload not exist.' );
    } );

    test( 'ts upload bad folder-to name', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.upload(
            `${__dirname}/zpython.pdf`,
            'chacho/python-copy.pdf'
        );

        expect( response.status ).toBe( false );
        if( response.status === true ) {
            return
        }

        expect( response.error.code ).toBe( 'ENOENT' );
        expect( response.error.msg ).toMatch( /(FTP Upload failed: ENOENT: no such file or directory,)/ );
    } );

    test( 'ts upload simple', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.upload(
            `${__dirname}/zpython.pdf`
        );

        const responseList = await ftpClient.list();
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'zpython.pdf' );
        expect( response.filepath ).toBe( 'zpython.pdf' );

        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }

        expect( responseList.count ).toBe( 3 );

        const names = Ofn.arrayValuesByKey( responseList.list, 'name' );
        expect( names.includes( 'python2.pdf' ) ).toBe( true );
        expect( names.includes( 'zpython.pdf' ) ).toBe( true );
    } );

    test( 'ts upload absolute', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.upload(
            `${__dirname}/zpython.pdf`,
            'python-copy.pdf'
        );

        const responseList = await ftpClient.list();
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python-copy.pdf' );
        expect( response.filepath ).toBe( 'python-copy.pdf' );

        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }

        expect( responseList.count ).toBe( 4 );

        const names = Ofn.arrayValuesByKey( responseList.list, 'name' );
        expect( names.includes( 'python2.pdf' ) ).toBe( true );
        expect( names.includes( 'python-copy.pdf' ) ).toBe( true );
    } );

    test( 'ts upload relative', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await fsExtra.copy( `${__dirname}/zpython2.pdf`, `../python2-ts.pdf` );

        await ftpClient.connect();
        const response = await ftpClient.upload(
            `../python2-ts.pdf`,
            'python2-copy.pdf'
        );

        const responseList = await ftpClient.list();
        await ftpClient.disconnect();

        await fsExtra.remove( `../python2-ts.pdf` );

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

        expect( responseList.count ).toBe( 5 );

        const names = Ofn.arrayValuesByKey( responseList.list, 'name' );
        expect( names.includes( 'python2.pdf' ) ).toBe( true );
        expect( names.includes( 'python2-copy.pdf' ) ).toBe( true );
    } );

    test( 'ts upload to folder', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        const response = await ftpClient.upload(
            `${__dirname}/zpython.pdf`,
            'test/python-copy.pdf'
        );

        const responseList = await ftpClient.list( 'test' );
        await ftpClient.disconnect();

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python-copy.pdf' );
        expect( response.filepath ).toBe( 'test/python-copy.pdf' );

        expect( responseList.status ).toBe( true );
        if( responseList.status === false ) {
            return
        }

        expect( responseList.count ).toBe( 1 );
        expect( responseList.list[ 0 ].name ).toBe( 'python-copy.pdf' );
    } );

    test( 'ts upload one', async() => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        const response = await ftpClient.uploadOne(
            `${__dirname}/zpython.pdf`,
            'python-one.pdf'
        );

        expect( response.status ).toBe( true );
        if( response.status === false ) {
            return
        }

        expect( response.filename ).toBe( 'python-one.pdf' );
        expect( response.filepath ).toBe( 'python-one.pdf' );
    } );
} );

//endregion
