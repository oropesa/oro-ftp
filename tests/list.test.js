const { OFtp } = require('../dist');
const fsExtra = require('fs-extra');
const FtpSrv = require('@nearst/ftp');

const { DIRNAME, FTPCONFIG_DEFAULT } = require('./utils');

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 33_334 };
const SERVER_PATH = `${DIRNAME}/srv-list`;
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

describe('list OFtp', () => {
  test('list and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.list();

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.msg).toBe(
      'FTP List failed: FtpConnectionError: connection status is not yet connected.',
    );
  });

  test('list main', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.list();
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.count).toBe(2);

    expect(response.list[0].name).toBe('silence2.pdf');
    expect(response.list[0].path).toBe('silence2.pdf');
    expect(response.list[0].type).toBe('-');

    expect(response.list[1].name).toBe('test');
    expect(response.list[1].path).toBe('test');
    expect(response.list[1].type).toBe('d');
  });

  test('list folder main', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.list('/');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.count).toBe(2);

    expect(response.list[0].name).toBe('silence2.pdf');
    expect(response.list[0].path).toBe('silence2.pdf');
    expect(response.list[0].type).toBe('-');

    expect(response.list[1].name).toBe('test');
    expect(response.list[1].path).toBe('test');
    expect(response.list[1].type).toBe('d');
  });

  test('list folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.list('test');

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.count).toBe(0);

    //

    await fsExtra.copy(`${__dirname}/zsilence2.pdf`, `${SERVER_PATH}/test/silence-copy2.pdf`);

    const response2 = await ftpClient.list('test');
    await ftpClient.disconnect();

    expect(response2.status).toBe(true);
    if (response2.status === false) {
      return;
    }

    expect(response2.list[0].name).toBe('silence-copy2.pdf');
    expect(response2.list[0].path).toBe('test/silence-copy2.pdf');
    expect(response2.list[0].type).toBe('-');

    const fileKeys = Object.keys(response2.list[0]);
    expect(fileKeys.includes('name')).toBe(true);
    expect(fileKeys.includes('path')).toBe(true);
    expect(fileKeys.includes('type')).toBe(true);
    expect(fileKeys.includes('date')).toBe(true);
    expect(fileKeys.includes('size')).toBe(true);
    expect(fileKeys.includes('rights')).toBe(true);
    expect(fileKeys.includes('owner')).toBe(true);
    expect(fileKeys.includes('group')).toBe(true);

    const rightKeys = Object.keys(response2.list[0].rights);

    expect(rightKeys.includes('user')).toBe(true);
    expect(rightKeys.includes('group')).toBe(true);
    expect(rightKeys.includes('other')).toBe(true);
  });
});
