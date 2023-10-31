import OFtp from '../dist';
import FtpSrv from '@nearst/ftp';
import * as fsExtra from 'fs-extra';

// @ts-ignore
import { DIRNAME, FTPCONFIG_DEFAULT } from './utils';

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 34_335 };
const SERVER_PATH = `${DIRNAME}/srv-mkdir-ts`;
let ftpServer: FtpSrv;

beforeAll(async () => {
  if (await fsExtra.exists(SERVER_PATH)) {
    await fsExtra.rm(SERVER_PATH, { recursive: true });
  }

  await fsExtra.mkdir(SERVER_PATH);
  await fsExtra.mkdir(`${SERVER_PATH}/test`);
  await fsExtra.copy(`${DIRNAME}/zsilence2.pdf`, `${SERVER_PATH}/silence2.pdf`);

  ftpServer = new FtpSrv({
    url: `${FTPCONFIG.protocol}://${FTPCONFIG.host}:${FTPCONFIG.port}`,
    pasv_url: FTPCONFIG.pasv_url,
  });
  ftpServer.on('login', (_data, resolve, _reject) => {
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

describe('mkdir OFtp', () => {
  test('ts mkdir and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.mkdir('');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe(
      'FTP Mkdir failed: FtpConnectionError: connection status is not yet connected.',
    );
  });

  test('ts mkdir folder already exists', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.mkdir('test');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.msg).toBe('Folder already exists.');
    expect(response.folderpath).toBe('test');
    expect(response.foldername).toBe('test');
  });

  test('ts mkdir folder already exists strict', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.mkdir('test', false, true);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('EEXIST');
    expect(response.error.msg).toMatch(/(FTP Mkdir failed: EEXIST: folder already exists,)/);
  });

  test('ts mkdir folder not recursive', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.mkdir('chacho/loco/tio');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/(FTP Mkdir failed: ENOENT: no such directory,)/);
  });

  test('ts mkdir folder recursive', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.mkdir('chacho/loco/tio', true);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.foldername).toBe('tio');
    expect(response.folderpath).toBe('chacho/loco/tio');
  });

  test('ts mkdir folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.mkdir('foo');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.foldername).toBe('foo');
    expect(response.folderpath).toBe('foo');
  });

  test('ts mkdir folder in folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.mkdir('foo/bar');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.foldername).toBe('bar');
    expect(response.folderpath).toBe('foo/bar');
  });
});
