import path from 'node:path';
import fsExtra from 'fs-extra';
import Ofn from 'oro-functions';
import PromiseFtp from 'promise-ftp';
import globToRegExp from 'glob-to-regexp';
import type {
  SResponseKOObject,
  SResponseOKBasic,
  SResponseKOBasic,
  SResponseKOObjectAgain,
  SResponseOKObject,
} from 'oro-functions';

export type OFtpConfig = PromiseFtp.Options & {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  readyTimeout?: number;
  disconnectWhenError?: boolean;
};

export type OFtpErrorCode =
  | 'ECONNREFUSED'
  | 'UNCONNECTED'
  | 'ENOTFOUND'
  | 'ENTIMEOUT'
  | 'ENOENT'
  | 'EEXIST'
  | 'ENOTEMPTY';

export interface OFtpConnectError {
  msg: string;
  code: OFtpErrorCode;
  config: OFtpConfig;
}

export interface OFtpFileObject {
  filename: string;
  filepath: string;
}

export interface OFtpFileError {
  msg: string;
  filepathFrom: string;
  filepathTo?: string;
  code?: OFtpErrorCode;
}

export interface OFtpFolderObject {
  msg?: string;
  foldername: string;
  folderpath: string;
}

export interface OFtpFolderError {
  msg: string;
  folder: string;
  code?: OFtpErrorCode;
}

export interface OFtpExistObject {
  filename: string;
  filepath: string;
  type: string;
}

export interface OFtpExistError {
  msg: string;
  filename: string;
  filepath: string;
  code?: OFtpErrorCode;
}

export interface OFtpListFilters {
  onlyFiles?: boolean | undefined;
  onlyFolders?: boolean | undefined;
  pattern?: string | RegExp | undefined;
}

export type OFtpListFileType = '-' | 'd' | 'l';

export interface OFtpListFile {
  path: string;
  name: string;
  type: OFtpListFileType;
  date: Date;
  size: number;
  owner: string;
  group: string;
  target: string | undefined;
  rights?: {
    user: string;
    group: string;
    other: string;
  };
}

export interface OFtpListObject {
  count: number;
  list: OFtpListFile[];
}

export interface OFtpListError {
  msg: string;
  folder: string;
  filters: OFtpListFilters;
  code?: OFtpErrorCode;
}

export type OFtpConnectResponse = SResponseOKBasic | SResponseKOObjectAgain<OFtpConnectError>;
export type OFtpDisconnectResponse = SResponseOKBasic | SResponseKOBasic;
export type OFtpFileResponse = SResponseOKObject<OFtpFileObject> | SResponseKOObject<OFtpFileError>;
export type OFtpFolderResponse =
  | SResponseOKObject<OFtpFolderObject>
  | SResponseKOObject<OFtpFolderError>;
export type OFtpExistResponse =
  | SResponseOKObject<OFtpExistObject>
  | SResponseKOObject<OFtpExistError>;
export type OFtpListResponse = SResponseOKObject<OFtpListObject> | SResponseKOObject<OFtpListError>;
export type OFtpUploadOneResponse =
  | SResponseOKObject<OFtpFileObject>
  | SResponseKOObject<OFtpFileError | OFtpConnectError>;

export class OFtp {
  readonly #ftpClient: PromiseFtp;
  // @ts-ignore
  #config: OFtpConfig;

  public constructor(config: OFtpConfig = {}) {
    if (Ofn.objIsNotEmpty(config)) {
      this.#setFtpConfig(config);
    }

    this.#ftpClient = new PromiseFtp();
  }

  public getClient(): PromiseFtp {
    return this.#ftpClient;
  }

  public async connect(config: OFtpConfig = {}): Promise<OFtpConnectResponse> {
    if (Ofn.objIsNotEmpty(config)) {
      this.#setFtpConfig(config);
    }

    if (Ofn.objIsEmpty(this.#config)) {
      const config = Ofn.cloneObject(this.#config);
      if (config.password) {
        config.password = Array.from({ length: config.password.length }).fill('*').join('');
      }

      return Ofn.setResponseKO(
        `FTP Connect failed: config is empty.`,
        {
          code: 'UNCONNECTED',
          config,
        },
        false,
      );
    }

    return this.#ftpClient
      .connect(this.#config)
      .then(() => Ofn.setResponseOK())
      .catch((error) => {
        const config = Ofn.cloneObject(this.#config);
        if (config.password) {
          config.password = Array.from({ length: config.password.length }).fill('*').join('');
        }

        const { msg } = getMsgAndCodeByError(error);
        const code =
          msg === 'Timeout while connecting to server'
            ? 'ENTIMEOUT'
            : (String(error.code) as OFtpErrorCode);
        const tryAgain = msg !== 'Login or password incorrect!';
        return Ofn.setResponseKO(`FTP Connect failed: ${msg}.`, { code, config }, tryAgain);
      });
  }

  public async upload(filepathFrom: string, filepathTo = ''): Promise<OFtpFileResponse> {
    // eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary
    const filepathDestiny = filepathTo ? filepathTo : Ofn.getFilenameByPath(filepathFrom);
    const filepathOrigin = path.isAbsolute(filepathFrom)
      ? filepathFrom
      : path.resolve(filepathFrom);

    if (!(await fsExtra.exists(filepathOrigin))) {
      return Ofn.setResponseKO(`FTP Upload failed: File (From) to upload not exist.`, {
        filepathFrom: filepathOrigin,
        filepathTo: filepathDestiny,
        code: 'ENOTFOUND',
      });
    }

    return this.#ftpClient
      .put(filepathOrigin, filepathDestiny)
      .then(() => {
        return Ofn.setResponseOK({
          filename: Ofn.getFilenameByPath(filepathDestiny),
          filepath: filepathDestiny,
        });
      })
      .catch(async (error: Error) => {
        this.#config.disconnectWhenError && (await this.disconnect());

        const { msg, code } = getMsgAndCodeByError(error);
        return Ofn.setResponseKO(`FTP Upload failed: ${msg}.`, {
          filepathFrom: filepathOrigin,
          filepathTo: filepathDestiny,
          code,
        });
      });
  }

  public async download(filepathFrom: string, filepathTo = ''): Promise<OFtpFileResponse> {
    // eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary
    let filepathDestiny = filepathTo ? filepathTo : Ofn.getFilenameByPath(filepathFrom);
    if (!path.isAbsolute(filepathTo)) {
      filepathDestiny = path.resolve(filepathDestiny);
    }

    if (!(await fsExtra.exists(Ofn.getFolderByPath(filepathDestiny)))) {
      return Ofn.setResponseKO(`FTP Download failed: Folder (From) to download not exist.`, {
        filepathFrom,
        filepathTo: filepathDestiny,
        code: 'ENOTFOUND',
      });
    }

    return this.#ftpClient
      .get(filepathFrom)
      .then(async (data) => {
        const fileStream = fsExtra.createWriteStream(filepathDestiny);
        data.pipe(fileStream);

        const end: Promise<OFtpFileResponse> = new Promise((resolve, reject) => {
          data.on('end', () =>
            resolve(
              Ofn.setResponseOK({
                filename: Ofn.getFilenameByPath(filepathDestiny),
                filepath: Ofn.sanitizePath(filepathDestiny),
              }),
            ),
          );
          fileStream.on('error', (error: Error) => {
            const { msg, code } = getMsgAndCodeByError(error);

            return reject(
              Ofn.setResponseKO(`FTP Download To failed: ${msg}.`, {
                filepathFrom,
                filepathTo: filepathDestiny,
                code,
              }),
            );
          });
        });

        return await end.catch((error) => error);
      })
      .catch(async (error: Error | SResponseKOObject<OFtpFileError>) => {
        this.#config.disconnectWhenError && (await this.disconnect());

        if ('status' in error && Ofn.isBoolean(error.status)) {
          return error;
        }

        const { msg, code } = getMsgAndCodeByError(error as Error);

        return Ofn.setResponseKO(`FTP Download failed: ${msg}.`, {
          filepathFrom,
          filepathTo: filepathDestiny,
          code,
        });
      });
  }

  public async list(folder = '', filters: OFtpListFilters = {}): Promise<OFtpListResponse> {
    const listFilter: OFtpListFilters = {
      pattern: undefined,
      onlyFiles: false,
      onlyFolders: false,
      ...filters,
    };

    let listFolder = folder ?? '';
    listFolder && listFolder.slice(0, 1) === '/' && (listFolder = listFolder.slice(1));
    listFolder && listFolder.slice(-1) !== '/' && (listFolder += '/');

    return this.#ftpClient
      .list(listFolder)
      .then((data) => {
        const files: OFtpListFile[] = [];
        for (const element of data) {
          if (!element || Ofn.isString(element)) {
            continue;
          }

          switch (true) {
            case listFilter.onlyFiles && element.type !== '-':
            case listFilter.onlyFolders && element.type !== 'd':
            case listFilter.pattern &&
              Ofn.isRegexp(listFilter.pattern) &&
              !listFilter.pattern.test(element.name):
            case listFilter.pattern &&
              Ofn.isString(listFilter.pattern) &&
              !globToRegExp(listFilter.pattern).test(element.name):
              continue;
          }

          const file: OFtpListFile = {
            path: `${listFolder}${element.name}`,
            name: element.name,
            type: element.type as OFtpListFileType,
            date: element.date,
            size: element.size,
            owner: element.owner ?? '',
            group: element.group ?? '',
            target: element.target,
            rights: element.rights,
          };

          files.push(file);
        }

        return Ofn.setResponseOK({ count: files.length, list: files });
      })
      .catch(async (error: Error) => {
        this.#config.disconnectWhenError && (await this.disconnect());

        const { msg, code } = getMsgAndCodeByError(error);

        return Ofn.setResponseKO(`FTP List failed: ${msg}.`, {
          folder: listFolder,
          filters: listFilter,
          code,
        });
      });
  }

  public async move(filepathFrom: string, filepathTo: string): Promise<OFtpFileResponse> {
    return this.#ftpClient
      .rename(filepathFrom, filepathTo)
      .then(() => {
        return Ofn.setResponseOK({
          filename: Ofn.getFilenameByPath(filepathTo),
          filepath: filepathTo,
        });
      })
      .catch(async (error: Error) => {
        this.#config.disconnectWhenError && (await this.disconnect());

        const { msg, code } = getMsgAndCodeByError(error);

        return Ofn.setResponseKO(`FTP Move failed: ${msg}.`, { filepathFrom, filepathTo, code });
      });
  }

  public async delete(filepathFrom: string, strict = false): Promise<OFtpFileResponse> {
    return this.#ftpClient
      .delete(filepathFrom)
      .then(() => {
        return Ofn.setResponseOK('deleted successfully', {
          filepath: filepathFrom,
          filename: Ofn.getFilenameByPath(filepathFrom),
        });
      })
      .catch(async (error: Error) => {
        const { msg, code } = getMsgAndCodeByError(error);

        if (!strict && msg === 'File not found') {
          return Ofn.setResponseOK(`file not found`, {
            filepath: filepathFrom,
            filename: Ofn.getFilenameByPath(filepathFrom),
          });
        }

        this.#config.disconnectWhenError && (await this.disconnect());

        return Ofn.setResponseKO(`FTP Delete failed: ${msg}.`, { filepathFrom, code });
      });
  }

  public async exists(
    filepathFrom: string,
    disconnectWhenError?: boolean,
  ): Promise<OFtpExistResponse> {
    const filename = Ofn.getFilenameByPath(filepathFrom);
    return this.#ftpClient
      .list(Ofn.getFolderByPath(filepathFrom))
      .then((data) => {
        const files = [];
        for (const element of data) {
          if (Ofn.isString(element) || element.name !== filename) {
            continue;
          }
          files.push(element);
          break;
        }

        return files[0]
          ? Ofn.setResponseOK({
              filepath: filepathFrom,
              filename: Ofn.getFilenameByPath(filepathFrom),
              type: files[0].type,
            })
          : Ofn.setResponseKO(`File not exist`, {
              filepath: filepathFrom,
              filename: Ofn.getFilenameByPath(filepathFrom),
              code: 'ENOENT' as OFtpErrorCode,
            });
      })
      .catch(async (error) => {
        Ofn.isBoolean(disconnectWhenError) && disconnectWhenError && (await this.disconnect());
        !Ofn.isBoolean(disconnectWhenError) &&
          this.#config.disconnectWhenError &&
          (await this.disconnect());

        const { msg, code } = getMsgAndCodeByError(error);

        return Ofn.setResponseKO(`FTP Exists failed: ${msg}.`, {
          filepath: filepathFrom,
          filename: Ofn.getFilenameByPath(filepathFrom),
          code,
        });
      });
  }

  public async mkdir(
    folder: string,
    recursive = false,
    strict = false,
  ): Promise<OFtpFolderResponse> {
    const response = await this.exists(folder, false);
    if (response.status && response.type === 'd') {
      return strict
        ? Ofn.setResponseKO(`FTP Mkdir failed: EEXIST: folder already exists, ${folder}`, {
            folder,
            code: 'EEXIST',
          })
        : Ofn.setResponseOK('Folder already exists.', {
            folderpath: folder,
            foldername: Ofn.getFilenameByPath(folder),
          });
    }

    if (!recursive && Ofn.getFolderByPath(folder).length > 0) {
      const response = await this.exists(Ofn.getFolderByPath(folder), false);
      if (!response.status) {
        return Ofn.setResponseKO(
          `FTP Mkdir failed: ENOENT: no such directory, ${Ofn.getFolderByPath(folder)}`,
          { folder, code: 'ENOENT' },
        );
      }
    }

    return this.#ftpClient
      .mkdir(folder, recursive)
      .then(() =>
        Ofn.setResponseOK({
          folderpath: folder,
          foldername: Ofn.getFilenameByPath(folder),
        }),
      )
      .catch(async (error: Error) => {
        this.#config.disconnectWhenError && (await this.disconnect());

        const { msg, code } = getMsgAndCodeByError(error);
        return Ofn.setResponseKO(`FTP Mkdir failed: ${msg}.`, { folder, code });
      });
  }

  public async rmdir(folder: string, strict = false): Promise<OFtpFolderResponse> {
    return this.#ftpClient
      .rmdir(folder)
      .then(() =>
        Ofn.setResponseOK({
          folderpath: folder,
          foldername: Ofn.getFilenameByPath(folder),
        }),
      )
      .catch(async (error: Error) => {
        const { msg, code } = getMsgAndCodeByError(error);

        if (!strict && /(ENOENT: no such file or directory,)/.test(msg)) {
          return Ofn.setResponseOK(`Folder not found.`, {
            folderpath: folder,
            foldername: Ofn.getFilenameByPath(folder),
          });
        }
        this.#config.disconnectWhenError && (await this.disconnect());

        return Ofn.setResponseKO(`FTP Rmdir failed: ${msg}.`, { folder, code });
      });
  }

  public async disconnect(): Promise<OFtpDisconnectResponse> {
    return this.#ftpClient
      .end()
      .then(() => Ofn.setResponseOK())
      .catch((error: Error) => {
        const { msg } = getMsgAndCodeByError(error);
        return Ofn.setResponseKO(`FTP Disconnect failed: ${msg}.`, undefined, true);
      });
  }

  public async uploadOne(filepathFrom: string, filepathTo = ''): Promise<OFtpUploadOneResponse> {
    const sftpConnect = await this.connect();
    if (!sftpConnect.status) {
      return sftpConnect;
    }

    const sftpUpload = await this.upload(filepathFrom, filepathTo);
    if (!sftpUpload.status) {
      return sftpUpload;
    }

    await this.disconnect();

    return sftpUpload;
  }

  #setFtpConfig(config: OFtpConfig) {
    this.#config = Ofn.cloneObject(config);

    if (this.#config.readyTimeout) {
      this.#config.connTimeout = this.#config.readyTimeout;
      delete this.#config.readyTimeout;
    }

    this.#config.connTimeout === undefined && (this.#config.connTimeout = 3000);
    this.#config.disconnectWhenError === undefined && (this.#config.disconnectWhenError = true);
  }
}

function getMsgAndCodeByError(error: Error): { msg: string; code: OFtpErrorCode } {
  let msg = error.toString().split('\r\n')[0].replace('Error: ', '');
  let code = msg.slice(0, msg.indexOf(' ') - 1) as OFtpErrorCode;

  if (msg.indexOf('FtpConnection') === 0) {
    msg = `FtpConnectionError: connection status is ${msg.slice(msg.lastIndexOf(':') + 2)}`;
    code = 'UNCONNECTED';
  }

  return { msg, code };
}

export default OFtp;
