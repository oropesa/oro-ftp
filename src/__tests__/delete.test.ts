import OFtp from '../OFtp';
import { DIRNAME, FTPCONFIG_DEFAULT } from './_consts.mocks';

//

const FTP_FOLDER = 'test-delete-ts';

beforeAll(async () => {
  const ftpClient = new OFtp(FTPCONFIG_DEFAULT);
  await ftpClient.connect();
  await ftpClient.rmdir(FTP_FOLDER, true);
  await ftpClient.mkdir(FTP_FOLDER, true);
  await ftpClient.mkdir(`${FTP_FOLDER}/chacho`, true);
  await ftpClient.upload(`${DIRNAME}/zsilence2.pdf`, `${FTP_FOLDER}/silence2.pdf`);
  await ftpClient.upload(`${DIRNAME}/zsilence2.pdf`, `${FTP_FOLDER}/chacho/silence2-copy.pdf`);
  await ftpClient.disconnect();
});

afterAll(async () => {
  const ftpClient = new OFtp(FTPCONFIG_DEFAULT);
  await ftpClient.connect();
  await ftpClient.rmdir(FTP_FOLDER, true);
  await ftpClient.disconnect();
});

//

describe('delete OFtp', () => {
  test('delete without conection-config', async () => {
    const ftpClient = new OFtp();

    const response = await ftpClient.delete('');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP Delete failed: config is empty.');
  });

  test('delete and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    const response = await ftpClient.delete('');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP Delete failed: FtpConnectionError: connection status is not yet connected.');
  });

  test('delete bad file strict', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.delete(`${FTP_FOLDER}/pthon2.pdf`, true);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOTFOUND');
    expect(response.error.msg).toBe(
      `FTP Delete failed: Could not delete ${FTP_FOLDER}/pthon2.pdf: No such file or directory.`,
    );
  });

  test('delete bad file', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.delete(`${FTP_FOLDER}/pthon2.pdf`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('pthon2.pdf');
    expect(response.filepath).toBe(`${FTP_FOLDER}/pthon2.pdf`);
  });

  test('delete bad folder with file', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.delete(`${FTP_FOLDER}/chacho`);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOTEMPTY');
    expect(response.error.msg).toBe(`FTP Delete failed: Can't remove directory: Directory not empty.`);
  });

  test('delete file', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.delete(`${FTP_FOLDER}/silence2.pdf`);
    const responseList = await ftpClient.list(`${FTP_FOLDER}/`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('silence2.pdf');
    expect(response.filepath).toBe(`${FTP_FOLDER}/silence2.pdf`);

    expect(responseList.status).toBe(true);
    if (!responseList.status) {
      return;
    }

    expect(responseList.count).toBe(1);
    expect(responseList.list[0].name).toBe('chacho');
    expect(responseList.list[0].path).toBe(`${FTP_FOLDER}/chacho`);
    expect(responseList.list[0].type).toBe('d');
  });

  test('delete file of folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.delete(`${FTP_FOLDER}/chacho/silence2-copy.pdf`);
    const responseList = await ftpClient.list(`${FTP_FOLDER}/chacho`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('silence2-copy.pdf');
    expect(response.filepath).toBe(`${FTP_FOLDER}/chacho/silence2-copy.pdf`);

    expect(responseList.status).toBe(true);
    if (!responseList.status) {
      return;
    }

    expect(responseList.count).toBe(0);
  });

  test('delete folder empty', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.delete(`${FTP_FOLDER}/chacho`);
    const responseList = await ftpClient.list(`${FTP_FOLDER}`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('chacho');
    expect(response.filepath).toBe(`${FTP_FOLDER}/chacho`);

    expect(responseList.status).toBe(true);
    if (!responseList.status) {
      return;
    }

    expect(responseList.count).toBe(0);
  });
});
