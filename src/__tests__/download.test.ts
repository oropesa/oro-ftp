import fsExtra from 'fs-extra';
import Ofn from 'oro-functions';

import OFtp from '../OFtp';
import { DIRNAME, FTPCONFIG_DEFAULT, pathExists } from './_consts.mocks';

//

const FTP_FOLDER = 'test-download-ts';

beforeAll(async () => {
  const ftpClient = new OFtp(FTPCONFIG_DEFAULT);
  await ftpClient.connect();
  await ftpClient.rmdir(FTP_FOLDER, true);
  await ftpClient.mkdir(`${FTP_FOLDER}/test`, true);
  await ftpClient.upload(`${DIRNAME}/zsilence2.pdf`, `${FTP_FOLDER}/silence2.pdf`);
  await ftpClient.upload(`${DIRNAME}/zsilence2.pdf`, `${FTP_FOLDER}/silence2-ts.pdf`);
  await ftpClient.upload(`${DIRNAME}/zsilence2.pdf`, `${FTP_FOLDER}/test/silence2-copy.pdf`);
  await ftpClient.disconnect();
});

afterAll(async () => {
  const ftpClient = new OFtp(FTPCONFIG_DEFAULT);
  await ftpClient.connect();
  await ftpClient.rmdir(FTP_FOLDER, true);
  await ftpClient.disconnect();
});

//

describe('download OFtp', () => {
  test('download without conection-config', async () => {
    const ftpClient = new OFtp();

    const response = await ftpClient.download(`${FTP_FOLDER}/silence2.pdf`, `${DIRNAME}/zsilence-copy-ts.pdf`);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP Download failed: config is empty.');
  });

  test('download and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    const response = await ftpClient.download(`${FTP_FOLDER}/silence2.pdf`, `${DIRNAME}/zsilence-copy-ts.pdf`);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP Download failed: FtpConnectionError: connection status is not yet connected.');
  });

  test('download bad file-from name', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.download(`${FTP_FOLDER}/pthon2.pdf`, `${DIRNAME}/zsilence-copy-ts.pdf`);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOTFOUND');
    expect(response.error.msg).toBe(
      `FTP Download failed: Can't open ${FTP_FOLDER}/pthon2.pdf: No such file or directory.`,
    );
  });

  test('download bad folder-to name', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.download(`${FTP_FOLDER}/silence2.pdf`, `${DIRNAME}/chacho/zsilence-copy-ts.pdf`);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOTFOUND');
    expect(response.error.msg).toBe('FTP Download failed: Folder (From) to download not exist.');
  });

  test('download simple one param', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.download(`${FTP_FOLDER}/silence2-ts.pdf`);
    await ftpClient.disconnect();

    const existsFile = await pathExists(`${process.cwd()}/silence2-ts.pdf`);
    if (existsFile) {
      await fsExtra.remove(`silence2-ts.pdf`);
    }

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('silence2-ts.pdf');
    expect(response.filepath).toBe(Ofn.sanitizePath(`${process.cwd()}/silence2-ts.pdf`));
    expect(existsFile).toBe(true);
  });

  test('download absolute', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.download(`${FTP_FOLDER}/silence2.pdf`, `${DIRNAME}/zsilence-copy-ts.pdf`);
    await ftpClient.disconnect();

    const existsFile = await pathExists(`${DIRNAME}/zsilence-copy-ts.pdf`);
    if (existsFile) {
      await fsExtra.remove(`${DIRNAME}/zsilence-copy-ts.pdf`);
    }

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('zsilence-copy-ts.pdf');
    expect(response.filepath).toBe(Ofn.sanitizePath(`${DIRNAME}/zsilence-copy-ts.pdf`));
    expect(existsFile).toBe(true);
  });

  test('download relative', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.download(`${FTP_FOLDER}/silence2.pdf`, `../zsilence2-copy-ts.pdf`);
    await ftpClient.disconnect();

    const existsFile = await pathExists(`../zsilence2-copy-ts.pdf`);
    if (existsFile) {
      await fsExtra.remove(`../zsilence2-copy-ts.pdf`);
    }

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('zsilence2-copy-ts.pdf');
    expect(response.filepath).toBe(Ofn.sanitizePath(`${Ofn.getFolderByPath(process.cwd())}/zsilence2-copy-ts.pdf`));
    expect(existsFile).toBe(true);
  });
});
