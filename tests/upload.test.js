const { OFtp } = require('../dist');
const fsExtra = require('fs-extra');
const FtpSrv = require('@nearst/ftp');
const Ofn = require('oro-functions');

const { DIRNAME, FTPCONFIG_DEFAULT } = require('./utils');

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 33_338 };
const SERVER_PATH = `${DIRNAME}/srv-upload`;
let ftpServer;

beforeAll(async () => {
  if (await fsExtra.exists(SERVER_PATH)) {
    await fsExtra.rm(SERVER_PATH, { recursive: true });
  }

  await fsExtra.mkdir(SERVER_PATH);
  await fsExtra.mkdir(`${SERVER_PATH}/test`);
  await fsExtra.copy(`${__dirname}/zsilence2.pdf`, `${SERVER_PATH}/silence2.pdf`);

  ftpServer = new FtpSrv({
    url: `${FTPCONFIG.protocol}://${FTPCONFIG.host}:${FTPCONFIG.port}`,
    pasv_url: FTPCONFIG.pasv_url,
  });
  ftpServer.on('login', (data, resolve, _reject) => {
    return resolve({ root: SERVER_PATH });
  });
  ftpServer.listen();
});

afterAll(async () => {
  if (await fsExtra.exists(SERVER_PATH)) {
    try {
      await fsExtra.rm(SERVER_PATH, { recursive: true });
    } catch {}
  }

  ftpServer.close();
});

//

describe('upload OFtp', () => {
  test('upload and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.upload(`${__dirname}/zsilence.pdf`, 'silence.pdf');

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe(
      'FTP Upload failed: FtpConnectionError: connection status is not yet connected.',
    );
  });

  test('upload bad file-from name', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${__dirname}/zpthon.pdf`, 'silence-copy.pdf');

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('ENOTFOUND');
    expect(response.error.msg).toBe('FTP Upload failed: File (From) to upload not exist.');
  });

  test('upload bad folder-to name', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${__dirname}/zsilence.pdf`, 'chacho/silence-copy.pdf');

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/(FTP Upload failed: ENOENT: no such file or directory,)/);
  });

  test('upload simple', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${__dirname}/zsilence.pdf`);

    const responseList = await ftpClient.list();
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('zsilence.pdf');
    expect(response.filepath).toBe('zsilence.pdf');

    expect(responseList.status).toBe(true);
    if (responseList.status === false) {
      return;
    }

    expect(responseList.count).toBe(3);

    const names = Ofn.arrayValuesByKey(responseList.list, 'name');
    expect(names.includes('silence2.pdf')).toBe(true);
    expect(names.includes('zsilence.pdf')).toBe(true);
  });

  test('upload absolute', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${__dirname}/zsilence.pdf`, 'silence-copy.pdf');

    const responseList = await ftpClient.list();
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('silence-copy.pdf');
    expect(response.filepath).toBe('silence-copy.pdf');

    expect(responseList.status).toBe(true);
    if (responseList.status === false) {
      return;
    }

    expect(responseList.count).toBe(4);

    const names = Ofn.arrayValuesByKey(responseList.list, 'name');
    expect(names.includes('silence2.pdf')).toBe(true);
    expect(names.includes('silence-copy.pdf')).toBe(true);
  });

  test('upload relative', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await fsExtra.copy(`${__dirname}/zsilence2.pdf`, `../silence2.pdf`);

    await ftpClient.connect();
    const response = await ftpClient.upload(`../silence2.pdf`, 'silence2-copy.pdf');

    const responseList = await ftpClient.list();
    await ftpClient.disconnect();

    await fsExtra.remove(`../silence2.pdf`);

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('silence2-copy.pdf');
    expect(response.filepath).toBe('silence2-copy.pdf');

    expect(responseList.status).toBe(true);
    if (responseList.status === false) {
      return;
    }

    expect(responseList.count).toBe(5);

    const names = Ofn.arrayValuesByKey(responseList.list, 'name');
    expect(names.includes('silence2.pdf')).toBe(true);
    expect(names.includes('silence2-copy.pdf')).toBe(true);
  });

  test('upload to folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${__dirname}/zsilence.pdf`, 'test/silence-copy.pdf');

    const responseList = await ftpClient.list('test');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('silence-copy.pdf');
    expect(response.filepath).toBe('test/silence-copy.pdf');

    expect(responseList.status).toBe(true);
    if (responseList.status === false) {
      return;
    }

    expect(responseList.count).toBe(1);
    expect(responseList.list[0].name).toBe('silence-copy.pdf');
  });

  test('upload one', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.uploadOne(`${__dirname}/zsilence.pdf`, 'silence-one.pdf');

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('silence-one.pdf');
    expect(response.filepath).toBe('silence-one.pdf');
  });
});

//endregion
