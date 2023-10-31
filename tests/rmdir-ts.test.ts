import OFtp from '../dist';
import FtpSrv from '@nearst/ftp';
import * as fsExtra from 'fs-extra';

// @ts-ignore
import { DIRNAME, FTPCONFIG_DEFAULT } from './utils';

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 34_337 };
const SERVER_PATH = `${DIRNAME}/srv-rmdir-ts`;
let ftpServer: FtpSrv;

beforeAll(async () => {
  if (await fsExtra.exists(SERVER_PATH)) {
    await fsExtra.rm(SERVER_PATH, { recursive: true });
  }

  await fsExtra.mkdir(SERVER_PATH);
  await fsExtra.mkdir(`${SERVER_PATH}/test`);
  await fsExtra.mkdir(`${SERVER_PATH}/chacho/loco/tio`, { recursive: true });
  await fsExtra.mkdir(`${SERVER_PATH}/foo/bar/baz`, { recursive: true });
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

describe('rmdir OFtp', () => {
  test('ts rmdir and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.rmdir('');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe(
      'FTP Rmdir failed: FtpConnectionError: connection status is not yet connected.',
    );
  });

  test('ts rmdir folder not exist', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.rmdir('loco');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.msg).toBe('Folder not found.');
    expect(response.folderpath).toBe('loco');
    expect(response.foldername).toBe('loco');
  });

  test('ts rmdir folder not exist strict', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.rmdir('loco', true);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/(FTP Rmdir failed: ENOENT: no such file or directory,)/);
  });

  test('ts rmdir folder with content', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.rmdir('chacho');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOTEMPTY');
    expect(response.error.msg).toMatch(/(FTP Rmdir failed: ENOTEMPTY: directory not empty,)/);
  });

  test('ts rmdir folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.rmdir('test');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.foldername).toBe('test');
    expect(response.folderpath).toBe('test');
  });

  test('ts rmdir folder in folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.rmdir('foo/bar/baz');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.foldername).toBe('baz');
    expect(response.folderpath).toBe('foo/bar/baz');
  });
});
