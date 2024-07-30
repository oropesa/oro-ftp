import fsExtra from 'fs-extra';

import type { OFtpConfig } from '../OFtp.types';

// eslint-disable-next-line unicorn/prefer-module
export const DIRNAME = __dirname;

export const FTPCONFIG_BAD: OFtpConfig = {
  host: 'http://ftp-fake.oropensando.com',
  port: 21,
  user: 'chacho',
  password: 'loco',
} as const;

export const FTPCONFIG_DEFAULT: OFtpConfig = {
  host: 'localhost',
  port: 2221,
  user: 'oftp_user',
  password: 'oftp_pass',
};

export async function pathExists(path?: string) {
  return path
    ? await fsExtra
        .stat(path)
        .then(() => true)
        .catch(() => false)
    : false;
}
