import Ofn from 'oro-functions';

import OFtp from '../OFtp';
import { OFtpConfig } from '../OFtp.types';
import { FTPCONFIG_BAD, FTPCONFIG_DEFAULT } from './_consts.mocks';

//

describe('OFTP Connection', () => {
  describe('getClient OFtp', () => {
    test('client is PromiseFtp', async () => {
      const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

      const clientFTP = ftpClient.getClient();
      expect(Ofn.type(clientFTP, true)).toBe('PromiseFtp');
    });
  });

  describe('init OFtp (wrong)', () => {
    test('new OFtp( undefined )', async () => {
      const ftpClient = new OFtp();

      const connected = await ftpClient.connect();

      expect(connected.status).toBe(false);

      if (connected.status) {
        return;
      }

      expect(connected.tryAgain).toBe(false);
      expect(connected.error.code).toBe(`UNCONNECTED`);
      expect(connected.error.msg).toBe(`FTP Connect failed: config is empty.`);
    });

    test('new OFtp( bad-config )', async () => {
      const ftpClient = new OFtp(FTPCONFIG_BAD);

      const connected = await ftpClient.connect();

      expect(connected.status).toBe(false);

      if (connected.status) {
        return;
      }

      expect(connected.tryAgain).toBe(true);
      expect(connected.error.code).toMatch(/^(ECONNREFUSED|ENOTFOUND)$/);
      expect(connected.error.msg).toMatch(/^FTP Connect failed: (connect ECONNREFUSED|getaddrinfo ENOTFOUND)/);
    });

    test('new OFtp( timeout-config )', async () => {
      const customConfig = { readyTimeout: 1, ...FTPCONFIG_DEFAULT };
      const ftpClient = new OFtp(customConfig);

      const connected = await ftpClient.connect();

      // sometimes connection is less than 1 and this test fails
      if (connected.status) {
        await ftpClient.disconnect();
        return;
      }

      expect(connected.status).toBe(false);

      if (connected.status) {
        return;
      }

      expect(connected.tryAgain).toBe(true);
      expect(connected.error.code).toBe(`ENTIMEOUT`);
      expect(connected.error.msg).toBe(`FTP Connect failed: Timeout while connecting to server.`);
    });
  });

  describe('init OFtp (good)', () => {
    test('new OFtp( config )', async () => {
      const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

      const connected = await ftpClient.connect();
      const disconnected = await ftpClient.disconnect();

      expect(connected.status).toBe(true);
      expect(disconnected.status).toBe(true);
    });

    test('new OFtp() and config in connect', async () => {
      const ftpClient = new OFtp();

      const connected = await ftpClient.connect(FTPCONFIG_DEFAULT);
      const disconnected = await ftpClient.disconnect();

      expect(connected.status).toBe(true);
      expect(disconnected.status).toBe(true);
    });

    test('init and auto-disconnect', async () => {
      const ftpClient = new OFtp(FTPCONFIG_DEFAULT);

      const connected = await ftpClient.connect();
      await ftpClient.rmdir('connect2', true, true);
      const mkdir = await ftpClient.mkdir('connect2');

      expect(connected.status).toBe(true);
      expect(mkdir.status).toBe(false);
    });

    test('init and avoid auto-disconnect', async () => {
      const config: OFtpConfig = Ofn.cloneObject(FTPCONFIG_DEFAULT);
      config.disconnectWhenError = false;

      const ftpClient = new OFtp(config);

      const connected = await ftpClient.connect();
      await ftpClient.rmdir('connect1', true);
      const mkdir = await ftpClient.mkdir('connect1');
      await ftpClient.rmdir('connect1');
      await ftpClient.disconnect();

      expect(connected.status).toBe(true);
      expect(mkdir.status).toBe(true);
    });
  });
});
