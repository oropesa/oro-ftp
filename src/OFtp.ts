import fsExtra from 'fs-extra';
import globToRegExp from 'glob-to-regexp';
import path from 'node:path';
import Ofn, { SResponseKOObjectSimple, SResponseOKBasic } from 'oro-functions';
import type { SResponseKOObject } from 'oro-functions';
import PromiseFtp from 'promise-ftp';

import {
  OFtpConfig,
  OFtpConnectResponse,
  OFtpDisconnectResponse,
  OFtpErrorCode,
  OFtpExistResponse,
  OFtpFileError,
  OFtpFileResponse,
  OFtpFolderResponse,
  OFtpListFile,
  OFtpListFileType,
  OFtpListFilters,
  OFtpListResponse,
  OFtpUploadOneResponse,
} from './OFtp.types';

async function pathExists(path?: string) {
  return path
    ? await fsExtra
        .stat(path)
        .then(() => true)
        .catch(() => false)
    : false;
}

function getMsgAndCodeByError(error: Error): { msg: string; code: OFtpErrorCode } {
  let msg = error.toString().split('\r\n')[0].replace('Error: ', '');
  let code = msg.slice(0, msg.indexOf(' ') - 1) as OFtpErrorCode;

  if (msg.indexOf('FtpConnection') === 0) {
    msg = `FtpConnectionError: connection status is ${msg.slice(msg.lastIndexOf(':') + 2)}`;
    code = 'UNCONNECTED';
  }

  if (
    msg.includes('getaddrinfo') ||
    msg.includes('No such') ||
    msg.includes('no such') ||
    msg.includes("file doesn't exist")
  ) {
    code = 'ENOTFOUND';
  }

  if (msg.includes('Not empty') || msg.includes('not empty')) {
    code = 'ENOTEMPTY';
  }

  return { msg, code };
}

export class OFtp {
  readonly #ftpClient: PromiseFtp;

  #config?: OFtpConfig;

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

    const exposedConfig = Ofn.cloneObject(this.#config);
    if (exposedConfig.password) {
      exposedConfig.password = Array.from({ length: exposedConfig.password.length }).fill('*').join('').substring(0, 5);
    }

    const checkResponse = this.#checkFtpConfig('Connect');
    if (!checkResponse.status) {
      return Ofn.setResponseKO(
        checkResponse.error.msg,
        { code: checkResponse.error.code, config: exposedConfig },
        false,
      );
    }

    return this.#ftpClient
      .connect(this.#config!)
      .then(() => Ofn.setResponseOK())
      .catch((error) => {
        const { msg, code } = getMsgAndCodeByError(error);
        const sanitizeCode = msg === 'Timeout while connecting to server' ? 'ENTIMEOUT' : code;
        const tryAgain = msg !== 'Login or password incorrect!';
        return Ofn.setResponseKO(
          `FTP Connect failed: ${msg}.`,
          { code: sanitizeCode, config: exposedConfig },
          tryAgain,
        );
      });
  }

  public async upload(filepathFrom: string, filepathTo = ''): Promise<OFtpFileResponse> {
    const filepathDestiny = filepathTo ? filepathTo : Ofn.getFilenameByPath(filepathFrom);
    const filepathOrigin = path.isAbsolute(filepathFrom) ? filepathFrom : path.resolve(filepathFrom);

    const checkResponse = this.#checkFtpConfig('Upload');
    if (!checkResponse.status) {
      return Ofn.setResponseKO(checkResponse.error.msg, {
        filepathFrom: filepathOrigin,
        filepathTo: filepathDestiny,
        code: checkResponse.error.code,
      });
    }

    if (!(await pathExists(filepathOrigin))) {
      if (this.#config!.disconnectWhenError) {
        await this.disconnect();
      }
      return Ofn.setResponseKO(`FTP Upload failed: File (From) to upload not exist.`, {
        filepathFrom: filepathOrigin,
        filepathTo: filepathDestiny,
        code: 'ENOTFOUND',
      });
    }

    if (await Ofn.pathIsFolder(filepathOrigin)) {
      if (this.#config!.disconnectWhenError) {
        await this.disconnect();
      }
      return Ofn.setResponseKO(`FTP Upload failed: File (From) to upload is a directory.`, {
        filepathFrom: filepathOrigin,
        filepathTo: filepathDestiny,
        code: 'EISDIR',
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
        if (this.#config!.disconnectWhenError) {
          await this.disconnect();
        }

        const { msg, code } = getMsgAndCodeByError(error);
        return Ofn.setResponseKO(`FTP Upload failed: ${msg}.`, {
          filepathFrom: filepathOrigin,
          filepathTo: filepathDestiny,
          code,
        });
      });
  }

  public async download(filepathFrom: string, filepathTo = ''): Promise<OFtpFileResponse> {
    let filepathDestiny = filepathTo ? filepathTo : Ofn.getFilenameByPath(filepathFrom);
    if (!path.isAbsolute(filepathTo)) {
      filepathDestiny = path.resolve(filepathDestiny);
    }

    const checkResponse = this.#checkFtpConfig('Download');
    if (!checkResponse.status) {
      return Ofn.setResponseKO(checkResponse.error.msg, {
        filepathFrom,
        filepathTo: filepathDestiny,
        code: checkResponse.error.code,
      });
    }

    if (!(await pathExists(Ofn.getFolderByPath(filepathDestiny)))) {
      if (this.#config!.disconnectWhenError) {
        await this.disconnect();
      }
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
        if (this.#config!.disconnectWhenError) {
          await this.disconnect();
        }

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

    let listFolder = folder ? folder : '';
    if (listFolder && listFolder[0] === '/') {
      listFolder = `.${folder}`;
    }
    if (listFolder && listFolder.slice(-1) !== '/') {
      listFolder += '/';
    }

    const folderPath = listFolder.indexOf('./') === 0 ? listFolder.slice(2) : listFolder;

    const checkResponse = this.#checkFtpConfig('List');
    if (!checkResponse.status) {
      return Ofn.setResponseKO(checkResponse.error.msg, {
        folder: listFolder,
        filters: listFilter,
        code: checkResponse.error.code,
      });
    }

    return this.#ftpClient
      .list(listFolder)
      .then((data) => {
        const listMap = new Map<string, OFtpListFile>();

        for (let index = 0, length = data.length; index < length; index++) {
          const element = data[index];

          if (!element || Ofn.isString(element)) {
            continue;
          }

          switch (true) {
            case listFilter.onlyFiles && element.type !== '-':
            case listFilter.onlyFolders && element.type !== 'd':
            case listFilter.pattern && Ofn.isRegexp(listFilter.pattern) && !listFilter.pattern.test(element.name):
            case listFilter.pattern &&
              Ofn.isString(listFilter.pattern) &&
              !globToRegExp(listFilter.pattern).test(element.name):
              continue;
          }

          const file: OFtpListFile = {
            path: `${folderPath}${element.name}`,
            name: element.name,
            type: element.type as OFtpListFileType,
            date: element.date,
            size: element.size,
            owner: element.owner ?? '',
            group: element.group ?? '',
            target: element.target,
            rights: element.rights,
          };

          // NOTE: fileKey to sort by "name"-"type"-"default order"
          const fileKey = `${file.name}-${element.type === '-' ? 'x' : element.type}-${Ofn.strPad(index, 8, '0')}`;

          listMap.set(fileKey, file);
        }

        const list = [...listMap.entries()].sort(([a], [b]) => String(a).localeCompare(b)).map(([_, file]) => file);
        return Ofn.setResponseOK({ count: list.length, list });
      })
      .catch(async (error: Error) => {
        if (this.#config!.disconnectWhenError) {
          await this.disconnect();
        }

        const { msg, code } = getMsgAndCodeByError(error);

        return Ofn.setResponseKO(`FTP List failed: ${msg}.`, {
          folder: listFolder,
          filters: listFilter,
          code,
        });
      });
  }

  public async move(filepathFrom: string, filepathTo: string): Promise<OFtpFileResponse> {
    const checkResponse = this.#checkFtpConfig('Move');
    if (!checkResponse.status) {
      return Ofn.setResponseKO(checkResponse.error.msg, {
        filepathFrom,
        filepathTo,
        code: checkResponse.error.code,
      });
    }

    return this.#ftpClient
      .rename(filepathFrom, filepathTo)
      .then(() => {
        return Ofn.setResponseOK({
          filename: Ofn.getFilenameByPath(filepathTo),
          filepath: filepathTo,
        });
      })
      .catch(async (error: Error) => {
        if (this.#config!.disconnectWhenError) {
          await this.disconnect();
        }

        const { msg, code } = getMsgAndCodeByError(error);

        return Ofn.setResponseKO(`FTP Move failed: ${msg}.`, { filepathFrom, filepathTo, code });
      });
  }

  public async delete(filepathFrom: string, strict = false): Promise<OFtpFileResponse> {
    const checkResponse = this.#checkFtpConfig('Delete');
    if (!checkResponse.status) {
      return Ofn.setResponseKO(checkResponse.error.msg, {
        filepathFrom,
        code: checkResponse.error.code,
      });
    }

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

        if ((!strict && code === 'ENOTFOUND') || msg.includes('Invalid argument')) {
          const exists = await this.exists(filepathFrom);
          if (!exists.status || exists.type !== 'd') {
            return Ofn.setResponseOK(`file not found`, {
              filepath: filepathFrom,
              filename: Ofn.getFilenameByPath(filepathFrom),
            });
          }

          const rmdir = await this.rmdir(filepathFrom, false, true);
          return rmdir.status
            ? Ofn.setResponseOK({
                msg: rmdir.msg,
                filepath: rmdir.folderpath,
                filename: rmdir.foldername,
              })
            : Ofn.setResponseKO(rmdir.error.msg.replace('Rmdir', 'Delete'), {
                filepathFrom: rmdir.error.folder,
                code: rmdir.error.code,
              });
        }

        if (this.#config!.disconnectWhenError) {
          await this.disconnect();
        }

        const sanitizeCode = msg.includes('Invalid argument') ? 'ENOENT' : code;
        return Ofn.setResponseKO(`FTP Delete failed: ${msg}.`, { filepathFrom, code: sanitizeCode });
      });
  }

  public async exists(filepathFrom: string, disconnectWhenError?: boolean): Promise<OFtpExistResponse> {
    const filename = Ofn.getFilenameByPath(filepathFrom);

    const checkResponse = this.#checkFtpConfig('Exists');
    if (!checkResponse.status) {
      return Ofn.setResponseKO(checkResponse.error.msg, {
        filepath: filepathFrom,
        filename,
        code: checkResponse.error.code,
      });
    }

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
        if (Ofn.isBoolean(disconnectWhenError) && disconnectWhenError) {
          await this.disconnect();
        }
        if (!Ofn.isBoolean(disconnectWhenError) && this.#config!.disconnectWhenError) {
          await this.disconnect();
        }

        const { msg, code } = getMsgAndCodeByError(error);

        return Ofn.setResponseKO(`FTP Exists failed: ${msg}.`, {
          filepath: filepathFrom,
          filename: Ofn.getFilenameByPath(filepathFrom),
          code,
        });
      });
  }

  public async mkdir(folder: string, recursive = true, strict = false): Promise<OFtpFolderResponse> {
    const checkResponse = this.#checkFtpConfig('Mkdir');
    if (!checkResponse.status) {
      return Ofn.setResponseKO(checkResponse.error.msg, {
        folder,
        code: checkResponse.error.code,
      });
    }

    if (!folder) {
      if (this.#config!.disconnectWhenError) {
        await this.disconnect();
      }
      return Ofn.setResponseKO(`FTP Mkdir failed: param folder is required.`, { folder });
    }

    const dirFolder = folder[0] === '/' ? `.${folder}` : folder;
    const folderpath = dirFolder.indexOf('./') === 0 ? dirFolder.slice(2) : dirFolder;

    const response = await this.exists(folder, false);
    if (response.status && response.type === 'd') {
      if (strict) {
        if (this.#config!.disconnectWhenError) {
          await this.disconnect();
        }
        return Ofn.setResponseKO(`FTP Mkdir failed: EEXIST: folder already exists, ${dirFolder}`, {
          folder: dirFolder,
          code: 'EEXIST',
        });
      }

      return Ofn.setResponseOK('Folder already exists.', {
        folderpath,
        foldername: Ofn.getFilenameByPath(dirFolder),
      });
    }

    if (!recursive && Ofn.getFolderByPath(dirFolder).length > 0) {
      const response = await this.exists(Ofn.getFolderByPath(dirFolder), false);
      if (!response.status) {
        if (this.#config!.disconnectWhenError) {
          await this.disconnect();
        }
        return Ofn.setResponseKO(`FTP Mkdir failed: ENOENT: no such directory, ${Ofn.getFolderByPath(dirFolder)}`, {
          folder: dirFolder,
          code: 'ENOENT',
        });
      }
    }

    return this.#ftpClient
      .mkdir(dirFolder, recursive)
      .then(() =>
        Ofn.setResponseOK({
          folderpath,
          foldername: Ofn.getFilenameByPath(dirFolder),
        }),
      )
      .catch(async (error: Error) => {
        if (this.#config!.disconnectWhenError) {
          await this.disconnect();
        }

        const { msg, code } = getMsgAndCodeByError(error);
        return Ofn.setResponseKO(`FTP Mkdir failed: ${msg}.`, { folder: dirFolder, code });
      });
  }

  public async rmdir(folder: string, recursive = false, strict = false): Promise<OFtpFolderResponse> {
    const checkResponse = this.#checkFtpConfig('Rmdir');
    if (!checkResponse.status) {
      return Ofn.setResponseKO(checkResponse.error.msg, {
        folder,
        code: checkResponse.error.code,
      });
    }

    if (!folder) {
      if (this.#config!.disconnectWhenError) {
        await this.disconnect();
      }
      return Ofn.setResponseKO(`FTP Rmdir failed: param folder is required.`, { folder });
    }

    return this.#ftpClient
      .rmdir(folder, recursive)
      .then(() =>
        Ofn.setResponseOK({
          folderpath: folder,
          foldername: Ofn.getFilenameByPath(folder),
        }),
      )
      .catch(async (error: Error) => {
        const { msg, code } = getMsgAndCodeByError(error);

        if (!strict && code === 'ENOTFOUND') {
          return Ofn.setResponseOK(`Folder not found.`, {
            folderpath: folder,
            foldername: Ofn.getFilenameByPath(folder),
          });
        }
        if (this.#config!.disconnectWhenError) {
          await this.disconnect();
        }

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

  #checkFtpConfig(action: string): SResponseOKBasic | SResponseKOObjectSimple<{ code: OFtpErrorCode }> {
    return !this.#config || Ofn.objIsEmpty(this.#config)
      ? Ofn.setResponseKO(`FTP ${action} failed: config is empty.`, { code: 'UNCONNECTED' })
      : Ofn.setResponseOK();
  }

  #setFtpConfig(config: OFtpConfig) {
    this.#config = Ofn.cloneObject(config);

    if (this.#config.readyTimeout) {
      this.#config.connTimeout = this.#config.readyTimeout;
      delete this.#config.readyTimeout;
    }

    if (this.#config.connTimeout === undefined) {
      this.#config.connTimeout = 3000;
    }
    if (this.#config.disconnectWhenError === undefined) {
      this.#config.disconnectWhenError = true;
    }
  }
}

export default OFtp;
