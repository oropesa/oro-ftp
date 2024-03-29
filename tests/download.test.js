const { OFtp } = require('../dist');
const fsExtra = require('fs-extra');
const Ofn = require('oro-functions');
const FtpSrv = require('@nearst/ftp');

const { DIRNAME, FTPCONFIG_DEFAULT } = require('./utils');

//

const FTPCONFIG = { ...FTPCONFIG_DEFAULT, port: 33_332 };
const SERVER_PATH = `${DIRNAME}/srv-download`;
let ftpServer;

beforeAll(async () => {
  if (await fsExtra.exists(SERVER_PATH)) {
    await fsExtra.rm(SERVER_PATH, { recursive: true });
  }

  await fsExtra.mkdir(SERVER_PATH);
  await fsExtra.mkdir(`${SERVER_PATH}/test`);
  await fsExtra.copy(`${__dirname}/zsilence2.pdf`, `${SERVER_PATH}/silence2.pdf`);

  ftpServer = new FtpSrv({
    url: `${FTPCONFIG.protocol}://${FTPCONFIG.host}:${FTPCONFIG.port}`,
    pasv_url: FTPCONFIG.pasv_url,
  });
  ftpServer.on('login', (data, resolve, reject) => {
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
  if (await fsExtra.exists(`${__dirname}/zsilence-copy.pdf`)) {
    try {
      await fsExtra.rm(`${__dirname}/zsilence-copy.pdf`);
    } catch {}
  }

  ftpServer.close();
});

//

describe('download OFtp', () => {
  test('download and no connected', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    const response = await ftpClient.download('silence2.pdf', `${__dirname}/zsilence-copy.pdf`);

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('UNCONNECTED');
    expect(response.error.msg).toBe(
      'FTP Download failed: FtpConnectionError: connection status is not yet connected.',
    );
  });

  test('download bad file-from name', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download('silence.pdf', `${__dirname}/zsilence-copy.pdf`);

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('ENOENT');
    expect(response.error.msg).toMatch(/(FTP Download failed: ENOENT: no such file or directory,)/);
  });

  test('download bad folder-to name', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download(
      'silence2.pdf',
      `${__dirname}/chacho/zsilence-copy.pdf`,
    );

    expect(response.status).toBe(false);
    if (response.status === true) {
      return;
    }

    expect(response.error.code).toBe('ENOTFOUND');
    expect(response.error.msg).toBe('FTP Download failed: Folder (From) to download not exist.');
  });

  test('download simple', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download('silence2.pdf');
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('silence2.pdf');
    expect(response.filepath).toBe(Ofn.sanitizePath(`${process.cwd()}/silence2.pdf`));
    expect(await fsExtra.exists(`${process.cwd()}/silence2.pdf`)).toBe(true);

    if (await fsExtra.exists(`${process.cwd()}/silence2.pdf`)) {
      await fsExtra.remove(`${process.cwd()}/silence2.pdf`);
    }
  });

  test('download absolute', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download('silence2.pdf', `${__dirname}/zsilence-copy.pdf`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    expect(response.filename).toBe('zsilence-copy.pdf');
    expect(response.filepath).toBe(Ofn.sanitizePath(`${__dirname}/zsilence-copy.pdf`));
  });

  test('download relative', async () => {
    const ftpClient = new OFtp(FTPCONFIG);

    await ftpClient.connect();
    const response = await ftpClient.download('silence2.pdf', `../silence2-copy.pdf`);
    await ftpClient.disconnect();

    expect(response.status).toBe(true);
    if (response.status === false) {
      return;
    }

    const filepath = Ofn.sanitizePath(`${Ofn.getFolderByPath(process.cwd())}/silence2-copy.pdf`);

    expect(response.filename).toBe('silence2-copy.pdf');
    expect(response.filepath).toBe(filepath);

    if (await fsExtra.exists(filepath)) {
      await fsExtra.remove(filepath);
    }
  });
});

//endregion
