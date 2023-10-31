const { OFtp } = require('../dist');
const fsExtra = require('fs-extra');
const FtpSrv = require('@nearst/ftp');

const { DIRNAME, FTPCONFIG_DEFAULT } = require('./utils');

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 33_336 };
const SERVER_PATH = `${DIRNAME}/srv-move`;
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
  ftpServer.on('login', (data, resolve, reject) => {
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

describe('move OFtp', () => {
  test('move and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.move();

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe(
      'FTP Move failed: FtpConnectionError: connection status is not yet connected.',
    );
  });

  test('move bad file-from', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.move('pthon2.pdf', 'silence2-copy.pdf');

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/(FTP Move failed: ENOENT: no such file or directory,)/);
  });

  test('move bad file-to', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.move('silence2.pdf', 'chacho/silence2-copy.pdf');

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/(FTP Move failed: ENOENT: no such file or directory,)/);
  });

  test('move simple', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.move('silence2.pdf', 'silence2-copy.pdf');
    const responseList = await ftpClient.list();
    await ftpClient.disconnect();

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

    expect(responseList.count).toBe(2);

    expect(responseList.list[0].name).toBe('silence2-copy.pdf');
    expect(responseList.list[0].path).toBe('silence2-copy.pdf');
    expect(responseList.list[0].type).toBe('-');

    expect(responseList.list[1].name).toBe('test');
    expect(responseList.list[1].path).toBe('test');
    expect(responseList.list[1].type).toBe('d');
  });

  test('move to folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.move('silence2-copy.pdf', 'test/silence2-cc.pdf');

    const responseList = await ftpClient.list();
    const responseList2 = await ftpClient.list('test');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('silence2-cc.pdf');
    expect(response.filepath).toBe('test/silence2-cc.pdf');

    expect(responseList.status).toBe(true);
    if (responseList.status === false) {
      return;
    }

    expect(responseList.count).toBe(1);

    expect(responseList.list[0].name).toBe('test');
    expect(responseList.list[0].path).toBe('test');
    expect(responseList.list[0].type).toBe('d');

    expect(responseList2.status).toBe(true);
    if (responseList2.status === false) {
      return;
    }

    expect(responseList2.count).toBe(1);

    expect(responseList2.list[0].name).toBe('silence2-cc.pdf');
    expect(responseList2.list[0].path).toBe('test/silence2-cc.pdf');
    expect(responseList2.list[0].type).toBe('-');
  });
});
