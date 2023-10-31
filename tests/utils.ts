import type { OFtpConfig } from '../dist';

// eslint-disable-next-line unicorn/prefer-module
export const DIRNAME = __dirname;

export const FTPCONFIG_BAD: OFtpConfig = {
  host: 'http://ftp-fake.oropensando.com',
  port: 21,
  user: 'chacho',
  password: 'loco',
} as const;

export const FTPCONFIG_DEFAULT: OFtpConfig & { protocol: string; pasv_url: string } = {
  protocol: 'ftp',
  pasv_url: '0.0.0.0',
  host: '127.0.0.1',
  port: 34_330,
  user: 'chacho',
  password: 'loco',
};
