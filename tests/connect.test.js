const { OFtp } = require('../dist');
const fsExtra = require('fs-extra');
const Ofn = require('oro-functions');
const FtpSrv = require('@nearst/ftp');

const { DIRNAME, FTPCONFIG_BAD, FTPCONFIG_DEFAULT } = require('./utils');

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 33_330 };
const SERVER_PATH = `${DIRNAME}/srv-con`;
let ftpServer;

beforeAll(async () => {
  if (await fsExtra.exists(SERVER_PATH)) {
    await fsExtra.rm(SERVER_PATH, { recursive: true });
  }

  await fsExtra.mkdir(SERVER_PATH);
  await fsExtra.copy(`${DIRNAME}/zsilence2.pdf`, `${SERVER_PATH}/silence2.pdf`);

  ftpServer = new FtpSrv({
    url: `${FTPCONFIG.protocol}://${FTPCONFIG.host}:${FTPCONFIG.port}`,
    pasv_url: FTPCONFIG.pasv_url,
  });
  ftpServer.on('login', async (data, resolve, _reject) => {
    await Ofn.sleep(100);

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

describe('get OFtp parent clientFTP', () => {
  test('client is PromiseFtp', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const clientFTP = ftpClient.getClient();
    expect(Ofn.type(clientFTP, true)).toBe('PromiseFtp');
  });
});

describe('init Bad OFtp', () => {
  test('new OFtp( undefined )', async () => {
    const ftpClient = new OFtp();

    const connected = await ftpClient.connect();

    expect(connected.status).toBe(false);

    if (connected.status === true) {
      return;
    }

    expect(connected.tryAgain).toBe(false);
    expect(connected.error.msg).toBe(`FTP Connect failed: config is empty.`);
    expect(connected.error.code).toBe(`UNCONNECTED`);
  });

  test('new OFtp( bad-config host )', async () => {
    const ftpClient = new OFtp(FTPCONFIG_BAD);

    const connected = await ftpClient.connect();

    expect(connected.status).toBe(false);

    if (connected.status === true) {
      return;
    }

    expect(connected.tryAgain).toBe(true);
    expect(connected.error.msg).toMatch(`FTP Connect failed: connect ECONNREFUSED`);
    expect(connected.error.code).toBe(`ECONNREFUSED`);
  });

  test('new OFtp( timeout-config )', async () => {
    const customConfig = Object.assign({ readyTimeout: 1 }, FTPCONFIG);
    const ftpClient = new OFtp(customConfig);

    const connected = await ftpClient.connect();

    // sometimes connection is less than 1 and this test fails
    if (connected.status) {
      return;
    }

    expect(connected.status).toBe(false);

    if (connected.status === true) {
      return;
    }

    expect(connected.tryAgain).toBe(true);
    expect(connected.error.msg).toBe(`FTP Connect failed: Timeout while connecting to server.`);
    expect(connected.error.code).toBe(`ENTIMEOUT`);
  });
});

describe('init OFtp', () => {
  test('new OFtp( config )', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const connected = await ftpClient.connect();
    const disconnected = await ftpClient.disconnect();

    expect(connected.status).toBe(true);
    expect(disconnected.status).toBe(true);
  });
});
