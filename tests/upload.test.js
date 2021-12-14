const OFtp = require( '../index' );
const fsExtra = require( 'fs-extra' );
const FtpSrv = require( 'ftp-srv' );
const Ofn = require( 'oro-functions' );

//

const FTPCONFIG_DEFAULT = { protocol: 'ftp', host: '127.0.0.1', pasv_url: '0.0.0.0', port: 33338, user: 'chacho', password: 'loco' };

let serverPath = `${__dirname}/srv-upload`;
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

describe('upload OFtp', () => {
    test( 'upload and no connected', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        let response = await ftpClient.upload( `${__dirname}/zpython.pdf`, 'python.pdf' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( 'FTP Upload failed: FtpConnectionError: '
                                           + 'can\'t perform \'put\' command when connection status is: not yet connected.' );
    } );

    test( 'upload bad file-from name', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.upload( `${__dirname}/zpthon.pdf`, 'python-copy.pdf' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( 'FTP Upload failed: File to upload not exist.' );
    } );

    test( 'upload bad folder-to name', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.upload( `${__dirname}/zpython.pdf`, 'chacho/python-copy.pdf' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(FTP Upload failed: Error: ENOENT: no such file or directory,)/ );
    } );

    test( 'upload simple', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.upload( `${__dirname}/zpython.pdf` );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'zpython.pdf' );
        expect( response.filepath ).toBe( 'zpython.pdf' );

        response = await ftpClient.list();

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 3 );

        let names = Ofn.arrayValuesByKey( response.list, 'name' );
        expect( names.includes( 'python2.pdf' ) ).toBe( true );
        expect( names.includes( 'zpython.pdf' ) ).toBe( true );

        await ftpClient.disconnect();
    } );

    test( 'upload absolute', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.upload( `${__dirname}/zpython.pdf`, 'python-copy.pdf' );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python-copy.pdf' );
        expect( response.filepath ).toBe( 'python-copy.pdf' );

        response = await ftpClient.list();

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 4 );

        let names = Ofn.arrayValuesByKey( response.list, 'name' );
        expect( names.includes( 'python2.pdf'     ) ).toBe( true );
        expect( names.includes( 'python-copy.pdf' ) ).toBe( true );

        await ftpClient.disconnect();
    } );

    test( 'upload relative', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await fsExtra.copy( `${__dirname}/zpython2.pdf`, `../python2.pdf` );

        await ftpClient.connect();
        let response = await ftpClient.upload( `../python2.pdf`, 'python2-copy.pdf' );

        await fsExtra.remove( `../python2.pdf` );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python2-copy.pdf' );
        expect( response.filepath ).toBe( 'python2-copy.pdf' );

        response = await ftpClient.list();

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 5 );

        let names = Ofn.arrayValuesByKey( response.list, 'name' );
        expect( names.includes( 'python2.pdf'     ) ).toBe( true );
        expect( names.includes( 'python2-copy.pdf' ) ).toBe( true );

        await ftpClient.disconnect();
    } );

    test( 'upload to folder', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        await ftpClient.connect();
        let response = await ftpClient.upload( `${__dirname}/zpython.pdf`, 'test/python-copy.pdf' );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python-copy.pdf' );
        expect( response.filepath ).toBe( 'test/python-copy.pdf' );

        response = await ftpClient.list( 'test' );

        expect( response.status ).toBe( true );
        expect( response.count ).toBe( 1 );
        expect( response.list[ 0 ].name ).toBe( 'python-copy.pdf' );

        await ftpClient.disconnect();
    } );

    test( 'upload one', async () => {
        const ftpClient = new OFtp( FTPCONFIG_DEFAULT );

        let response = await ftpClient.uploadOne( `${__dirname}/zpython.pdf`, 'python-one.pdf' );

        expect( response.status ).toBe( true );
        expect( response.filename ).toBe( 'python-one.pdf' );
        expect( response.filepath ).toBe( 'python-one.pdf' );
    } );
});

//endregion
