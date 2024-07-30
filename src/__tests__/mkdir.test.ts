import OFtp from '../OFtp';
import { FTPCONFIG_DEFAULT } from './_consts.mocks';

//

const FTP_FOLDER = 'test-mkdir-ts';

//

beforeAll(async () => {
  const ftpClient = new OFtp(FTPCONFIG_DEFAULT);
  await ftpClient.connect();
  await ftpClient.rmdir(FTP_FOLDER, true);
  await ftpClient.disconnect();
});

afterAll(async () => {
  const ftpClient = new OFtp(FTPCONFIG_DEFAULT);
  await ftpClient.connect();
  await ftpClient.rmdir(FTP_FOLDER, true);
  await ftpClient.disconnect();
});

//

describe('mkdir OFtp', () => {
  test('mkdir without conection-config', async () => {
    const ftpClient = new OFtp();

    const response = await ftpClient.mkdir(FTP_FOLDER);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP Mkdir failed: config is empty.');
  });

  test('mkdir and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    const response = await ftpClient.mkdir(FTP_FOLDER);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe('FTP Mkdir failed: FtpConnectionError: connection status is not yet connected.');
  });

  test('mkdir folder null', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.mkdir('');

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.msg).toBe('FTP Mkdir failed: param folder is required.');
  });

  test('mkdir folder', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.mkdir(FTP_FOLDER);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.foldername).toBe(FTP_FOLDER);
    expect(response.folderpath).toBe(FTP_FOLDER);
  });

  test('mkdir folder already exists', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.mkdir(FTP_FOLDER);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.msg).toBe('Folder already exists.');
    expect(response.foldername).toBe(FTP_FOLDER);
    expect(response.folderpath).toBe(FTP_FOLDER);
  });

  test('mkdir folder already exists strict', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.mkdir(FTP_FOLDER, true, true);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('EEXIST');
    expect(response.error.msg).toMatch(/folder already exists/);
  });

  test('mkdir folder not recursive', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.mkdir(`${FTP_FOLDER}/chacho/loco/tio`, false);

    expect(response.status).toBe(false);
    if (response.status) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/no such directory/);
  });

  test('mkdir folder recursive', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.mkdir(`${FTP_FOLDER}/chacho/loco/tio`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.foldername).toBe('tio');
    expect(response.folderpath).toBe(`${FTP_FOLDER}/chacho/loco/tio`);
  });

  test('mkdir subfolder', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.mkdir(`${FTP_FOLDER}/loco`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.foldername).toBe('loco');
    expect(response.folderpath).toBe(`${FTP_FOLDER}/loco`);
  });

  test('mkdir subfolder dot', async () => {
    const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

    await ftpClient.connect();
    const response = await ftpClient.mkdir(`./${FTP_FOLDER}/tio`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (!response.status) {
      return;
    }

    expect(response.foldername).toBe('tio');
    expect(response.folderpath).toBe(`${FTP_FOLDER}/tio`);
  });
});
