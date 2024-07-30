import OFtp from '../OFtp';
import { DIRNAME, FTPCONFIG_DEFAULT } from './_consts.mocks';

//

const FTP_FOLDER = 'test-list-ts';

beforeAll(async () => {
  const ftpClient = new OFtp(FTPCONFIG_DEFAULT);
  await ftpClient.connect();
  await ftpClient.mkdir(`${FTP_FOLDER}/test`, true);
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

describe('list OFtp', () => {
  test('list without conection-config', async () => {
    const ftpClient = new OFtp();

    const response = await ftpClient.list();

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP List failed: config is empty.');
  });

  test('list and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    const response = await ftpClient.list();

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP List failed: FtpConnectionError: connection status is not yet connected.');
  });

  test('list simple', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.list(FTP_FOLDER);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.count).toBe(2);

    expect(response.list[0].name).toBe('silence2.pdf');
    expect(response.list[0].path).toBe(`${FTP_FOLDER}/silence2.pdf`);
    expect(response.list[0].type).toBe('-');

    expect(response.list[1].name).toBe('test');
    expect(response.list[1].path).toBe(`${FTP_FOLDER}/test`);
    expect(response.list[1].type).toBe('d');
  });

  test('list simple start dot', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.list(`./${FTP_FOLDER}`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.count).toBe(2);

    expect(response.list[0].name).toBe('silence2.pdf');
    expect(response.list[0].path).toBe(`${FTP_FOLDER}/silence2.pdf`);
    expect(response.list[0].type).toBe('-');

    expect(response.list[1].name).toBe('test');
    expect(response.list[1].path).toBe(`${FTP_FOLDER}/test`);
    expect(response.list[1].type).toBe('d');
  });

  test('list details', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const responseListEmpty = await ftpClient.list(`${FTP_FOLDER}/test`);

    await ftpClient.upload(`${DIRNAME}/zsilence2.pdf`, `${FTP_FOLDER}/test/silence2-copy.pdf`);

    const responseListTest = await ftpClient.list(`${FTP_FOLDER}/test`);
    await ftpClient.disconnect();

    //

    expect(responseListEmpty.status).toBe(true);
    if (!responseListEmpty.status) {
      return;
    }

    expect(responseListEmpty.count).toBe(0);

    //

    expect(responseListTest.status).toBe(true);
    if (!responseListTest.status) {
      return;
    }

    expect(responseListTest.count).toBe(1);

    expect(responseListTest.list[0].name).toBe('silence2-copy.pdf');
    expect(responseListTest.list[0].path).toBe(`${FTP_FOLDER}/test/silence2-copy.pdf`);
    expect(responseListTest.list[0].type).toBe('-');

    const fileKeys = Object.keys(responseListTest.list[0]);
    expect(fileKeys.includes('name')).toBe(true);
    expect(fileKeys.includes('path')).toBe(true);
    expect(fileKeys.includes('type')).toBe(true);
    expect(fileKeys.includes('date')).toBe(true);
    expect(fileKeys.includes('size')).toBe(true);
    expect(fileKeys.includes('rights')).toBe(true);
    expect(fileKeys.includes('owner')).toBe(true);
    expect(fileKeys.includes('group')).toBe(true);

    const rightKeys = Object.keys(responseListTest.list[0].rights ?? {});

    expect(rightKeys.includes('user')).toBe(true);
    expect(rightKeys.includes('group')).toBe(true);
    expect(rightKeys.includes('other')).toBe(true);
  });
});
