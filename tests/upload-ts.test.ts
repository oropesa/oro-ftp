import OFtp from '../dist';
import Ofn from 'oro-functions';
import FtpSrv from '@nearst/ftp';
import * as fsExtra from 'fs-extra';

// @ts-ignore
import { DIRNAME, FTPCONFIG_DEFAULT } from './utils';

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 34_338 };
const SERVER_PATH = `${DIRNAME}/srv-upload-ts`;
let ftpServer: FtpSrv;

beforeAll(async () => {
  if (await fsExtra.exists(SERVER_PATH)) {
    try {
      await fsExtra.rm(SERVER_PATH, { recursive: true });
    } catch {}
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

describe('upload OFtp', () => {
  test('ts upload and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.upload(`${DIRNAME}/zsilence.pdf`, 'silence.pdf');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe(
      'FTP Upload failed: FtpConnectionError: connection status is not yet connected.',
    );
  });

  test('ts upload bad file-from name', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${DIRNAME}/zpthon.pdf`, 'silence-copy.pdf');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOTFOUND');
    expect(response.error.msg).toBe('FTP Upload failed: File (From) to upload not exist.');
  });

  test('ts upload bad folder-to name', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${DIRNAME}/zsilence.pdf`, 'chacho/silence-copy.pdf');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/(FTP Upload failed: ENOENT: no such file or directory,)/);
  });

  test('ts upload simple', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${DIRNAME}/zsilence.pdf`);

    const responseList = await ftpClient.list();
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('zsilence.pdf');
    expect(response.filepath).toBe('zsilence.pdf');

    expect(responseList.status).toBe(true);
    if (!responseList.status) {
      return;
    }

    expect(responseList.count).toBe(3);

    const names = Ofn.arrayValuesByKey(responseList.list, 'name');
    expect(names.includes('silence2.pdf')).toBe(true);
    expect(names.includes('zsilence.pdf')).toBe(true);
  });

  test('ts upload absolute', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${DIRNAME}/zsilence.pdf`, 'silence-copy.pdf');

    const responseList = await ftpClient.list();
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('silence-copy.pdf');
    expect(response.filepath).toBe('silence-copy.pdf');

    expect(responseList.status).toBe(true);
    if (!responseList.status) {
      return;
    }

    expect(responseList.count).toBe(4);

    const names = Ofn.arrayValuesByKey(responseList.list, 'name');
    expect(names.includes('silence2.pdf')).toBe(true);
    expect(names.includes('silence-copy.pdf')).toBe(true);
  });

  test('ts upload relative', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await fsExtra.copy(`${DIRNAME}/zsilence2.pdf`, `../silence2-ts.pdf`);

    await ftpClient.connect();
    const response = await ftpClient.upload(`../silence2-ts.pdf`, 'silence2-copy.pdf');

    const responseList = await ftpClient.list();
    await ftpClient.disconnect();

    await fsExtra.remove(`../silence2-ts.pdf`);

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('silence2-copy.pdf');
    expect(response.filepath).toBe('silence2-copy.pdf');

    expect(responseList.status).toBe(true);
    if (!responseList.status) {
      return;
    }

    expect(responseList.count).toBe(5);

    const names = Ofn.arrayValuesByKey(responseList.list, 'name');
    expect(names.includes('silence2.pdf')).toBe(true);
    expect(names.includes('silence2-copy.pdf')).toBe(true);
  });

  test('ts upload to folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.upload(`${DIRNAME}/zsilence.pdf`, 'test/silence-copy.pdf');

    const responseList = await ftpClient.list('test');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('silence-copy.pdf');
    expect(response.filepath).toBe('test/silence-copy.pdf');

    expect(responseList.status).toBe(true);
    if (!responseList.status) {
      return;
    }

    expect(responseList.count).toBe(1);
    expect(responseList.list[0].name).toBe('silence-copy.pdf');
  });

  test('ts upload one', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.uploadOne(`${DIRNAME}/zsilence.pdf`, 'silence-one.pdf');

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('silence-one.pdf');
    expect(response.filepath).toBe('silence-one.pdf');
  });
});
