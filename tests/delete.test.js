const { OFtp } = require('../dist');
const fsExtra = require('fs-extra');
const FtpSrv = require('@nearst/ftp');

const { DIRNAME, FTPCONFIG_DEFAULT } = require('./utils');

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 33_331 };
const SERVER_PATH = `${DIRNAME}/srv-delete`;
let ftpServer;

beforeAll(async () => {
  if (await fsExtra.exists(SERVER_PATH)) {
    await fsExtra.rm(SERVER_PATH, { recursive: true });
  }

  await fsExtra.mkdir(SERVER_PATH);
  await fsExtra.mkdir(`${SERVER_PATH}/test`);
  await fsExtra.copy(`${__dirname}/zsilence2.pdf`, `${SERVER_PATH}/silence2.pdf`);
  await fsExtra.copy(`${__dirname}/zsilence2.pdf`, `${SERVER_PATH}/test/silence2-copy.pdf`);

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

describe('delete OFtp', () => {
  test('delete and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.delete();

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe(
      'FTP Delete failed: FtpConnectionError: connection status is not yet connected.',
    );
  });

  test('delete bad file-from', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.delete('pthon2.pdf');

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/(FTP Delete failed: ENOENT: no such file or directory,)/);
  });

  test('delete bad folder with file', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.delete('test');

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('ENOTEMPTY');
    expect(response.error.msg).toMatch(/(FTP Delete failed: ENOTEMPTY: directory not empty,)/);
  });

  test('delete simple', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.delete('silence2.pdf');

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('silence2.pdf');
    expect(response.filepath).toBe('silence2.pdf');

    const responseList = await ftpClient.list();
    await ftpClient.disconnect();

    expect(responseList.status).toBe(true);
    if (responseList.status === false) {
      return;
    }

    expect(responseList.count).toBe(1);

    expect(responseList.list[0].name).toBe('test');
    expect(responseList.list[0].path).toBe('test');
    expect(responseList.list[0].type).toBe('d');
  });

  test('delete file of folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.delete('test/silence2-copy.pdf');

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('silence2-copy.pdf');
    expect(response.filepath).toBe('test/silence2-copy.pdf');

    const responseList = await ftpClient.list('test');
    await ftpClient.disconnect();

    expect(responseList.status).toBe(true);
    if (responseList.status === false) {
      return;
    }

    expect(responseList.count).toBe(0);
  });

  test('delete folder empty', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.delete('test');
    const responseList = await ftpClient.list();
    await ftpClient.disconnect();

    expect(response.status).toBe(true);

    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('test');
    expect(response.filepath).toBe('test');

    expect(responseList.status).toBe(true);
    if (responseList.status === false) {
      return;
    }

    expect(responseList.count).toBe(0);
  });
});
