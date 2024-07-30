import type {
  SResponseKOBasic,
  SResponseKOObject,
  SResponseKOObjectAgain,
  SResponseOKBasic,
  SResponseOKObject,
} from 'oro-functions';
import PromiseFtp from 'promise-ftp';

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
  | 'ENOTEMPTY'
  | 'EISDIR';

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
export type OFtpFolderResponse = SResponseOKObject<OFtpFolderObject> | SResponseKOObject<OFtpFolderError>;
export type OFtpExistResponse = SResponseOKObject<OFtpExistObject> | SResponseKOObject<OFtpExistError>;
export type OFtpListResponse = SResponseOKObject<OFtpListObject> | SResponseKOObject<OFtpListError>;
export type OFtpUploadOneResponse =
  | SResponseOKObject<OFtpFileObject>
  | SResponseKOObject<OFtpFileError | OFtpConnectError>;
