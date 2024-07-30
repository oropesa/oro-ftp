import OFtp from '../OFtp';
import { DIRNAME, FTPCONFIG_DEFAULT } from './_consts.mocks';

//

const FTP_FOLDER = 'test-exists-ts';

beforeAll(async () => {
  const ftpClient = new OFtp(FTPCONFIG_DEFAULT);
  await ftpClient.connect();
  await ftpClient.rmdir(FTP_FOLDER, true);
  await ftpClient.mkdir(FTP_FOLDER);
  await ftpClient.upload(`${DIRNAME}/zsilence2.pdf`, `${FTP_FOLDER}/silence2.pdf`);
  await ftpClient.disconnect();
});

afterAll(async () => {
  const ftpClient = new OFtp(FTPCONFIG_DEFAULT);
  await ftpClient.connect();
  await ftpClient.rmdir(FTP_FOLDER, true);
  await ftpClient.disconnect();
});
//

describe('exists OFtp', () => {
  test('exists without conection-config', async () => {
    const ftpClient = new OFtp();

    const response = await ftpClient.exists('');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP Exists failed: config is empty.');
  });

  test('exists and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    const response = await ftpClient.exists('');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP Exists failed: FtpConnectionError: connection status is not yet connected.');
  });

  test('exists bad file-from', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.exists('pthon2.pdf');
    await ftpClient.disconnect();

    expect(response.status).toBe(false);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('pthon2.pdf');
    expect(response.filepath).toBe('pthon2.pdf');
  });

  test('exists file-from', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.exists(`${FTP_FOLDER}/silence2.pdf`);
    const responseList = await ftpClient.list(FTP_FOLDER);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.filename).toBe('silence2.pdf');
    expect(response.filepath).toBe(`${FTP_FOLDER}/silence2.pdf`);
    expect(response.type).toBe('-');

    expect(responseList.status).toBe(true);
    if (!responseList.status) {
      return;
    }

    expect(responseList.count).toBe(1);

    expect(responseList.list[0].name).toBe('silence2.pdf');
    expect(responseList.list[0].path).toBe(`${FTP_FOLDER}/silence2.pdf`);
    expect(responseList.list[0].type).toBe('-');
  });
});
