import OFtp from '../dist';
import Ofn from 'oro-functions';
import FtpSrv from '@nearst/ftp';
import * as fsExtra from 'fs-extra';

// @ts-ignore
import { DIRNAME, FTPCONFIG_DEFAULT } from './utils';

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 34_332 };
const SERVER_PATH = `${DIRNAME}/srv-download-ts`;
let ftpServer: FtpSrv;

beforeAll(async () => {
  if (await fsExtra.exists(SERVER_PATH)) {
    await fsExtra.rm(SERVER_PATH, { recursive: true });
  }

  await fsExtra.mkdir(SERVER_PATH);
  await fsExtra.mkdir(`${SERVER_PATH}/test`);
  await fsExtra.copy(`${DIRNAME}/zsilence2.pdf`, `${SERVER_PATH}/silence2-ts.pdf`);

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
  if (await fsExtra.exists(`${DIRNAME}/zsilence-copy-ts.pdf`)) {
    try {
      await fsExtra.remove(`${DIRNAME}/zsilence-copy-ts.pdf`);
    } catch {}
  }

  ftpServer.close();
});

//

describe('download OFtp', () => {
  test('ts download and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.download('silence2-ts.pdf', `${DIRNAME}/zsilence-copy.pdf`);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe(
      'FTP Download failed: FtpConnectionError: connection status is not yet connected.',
    );
  });

  test('ts download bad file-from name', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download('silence.pdf', `${DIRNAME}/zsilence-copy.pdf`);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/(FTP Download failed: ENOENT: no such file or directory,)/);
  });

  test('ts download bad folder-to name', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download(
      'silence2-ts.pdf',
      `${DIRNAME}/chacho/zsilence-copy.pdf`,
    );

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOTFOUND');
    expect(response.error.msg).toBe('FTP Download failed: Folder (From) to download not exist.');
  });

  test('ts download simple', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download('silence2-ts.pdf');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('silence2-ts.pdf');
    expect(response.filepath).toBe(Ofn.sanitizePath(`${process.cwd()}/silence2-ts.pdf`));
    expect(await fsExtra.exists(`${process.cwd()}/silence2-ts.pdf`)).toBe(true);

    if (await fsExtra.exists(`${process.cwd()}/silence2-ts.pdf`)) {
      await fsExtra.remove(`${process.cwd()}/silence2-ts.pdf`);
    }
  });

  test('ts download absolute', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download('silence2-ts.pdf', `${DIRNAME}/zsilence-copy-ts.pdf`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('zsilence-copy-ts.pdf');
    expect(response.filepath).toBe(Ofn.sanitizePath(`${DIRNAME}/zsilence-copy-ts.pdf`));
  });

  test('ts download relative', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download('silence2-ts.pdf', `../silence2-copy-ts.pdf`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    const filepath = Ofn.sanitizePath(`${Ofn.getFolderByPath(process.cwd())}/silence2-copy-ts.pdf`);

    expect(response.filename).toBe('silence2-copy-ts.pdf');
    expect(response.filepath).toBe(filepath);

    if (await fsExtra.exists(filepath)) {
      await fsExtra.remove(filepath);
    }
  });
});
