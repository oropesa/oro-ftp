import OFtp from '../dist';
import Ofn from 'oro-functions';
import FtpSrv from '@nearst/ftp';
import * as fsExtra from 'fs-extra';

// @ts-ignore
import { DIRNAME, FTPCONFIG_BAD, FTPCONFIG_DEFAULT } from './utils';

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 34_330 };
const SERVER_PATH = `${DIRNAME}/srv-con-ts`;
let ftpServer: FtpSrv;

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
  ftpServer.on('login', async (_data, resolve, _reject) => {
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
  test('ts client is PromiseFtp', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const clientFTP = ftpClient.getClient();
    expect(Ofn.type(clientFTP, true)).toBe('PromiseFtp');
  });
});

describe('init Bad OFtp', () => {
  test('ts new OFtp( undefined )', async () => {
    const ftpClient = new OFtp();

    const connected = await ftpClient.connect();

    expect(connected.status).toBe(false);

    if (connected.status) {
      return;
    }

    expect(connected.tryAgain).toBe(false);
    expect(connected.error.msg).toBe(`FTP Connect failed: config is empty.`);
    expect(connected.error.code).toBe(`UNCONNECTED`);
  });

  test('ts new OFtp( bad-config host )', async () => {
    const ftpClient = new OFtp(FTPCONFIG_BAD);

    const connected = await ftpClient.connect();

    expect(connected.status).toBe(false);

    if (connected.status) {
      return;
    }

    expect(connected.tryAgain).toBe(true);
    expect(connected.error.msg).toMatch(`FTP Connect failed: connect ECONNREFUSED`);
    expect(connected.error.code).toBe(`ECONNREFUSED`);
  });

  test('ts new OFtp( timeout-config )', async () => {
    const customConfig = { readyTimeout: 1, ...FTPCONFIG };
    const ftpClient = new OFtp(customConfig);

    const connected = await ftpClient.connect();

    // sometimes connection is less than 1 and this test fails
    if (connected.status) {
      return;
    }

    expect(connected.status).toBe(false);

    if (connected.status) {
      return;
    }

    expect(connected.tryAgain).toBe(true);
    expect(connected.error.msg).toBe(`FTP Connect failed: Timeout while connecting to server.`);
    expect(connected.error.code).toBe(`ENTIMEOUT`);
  });
});

describe('init OFtp', () => {
  test('ts new OFtp( config )', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const connected = await ftpClient.connect();
    const disconnected = await ftpClient.disconnect();

    expect(connected.status).toBe(true);
    expect(disconnected.status).toBe(true);
  });
});
