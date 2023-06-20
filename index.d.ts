import * as PromiseFtp from 'promise-ftp';
import { SResponse, SResponseOK, SResponseKO } from 'oro-functions/src';

export type OFtpConfig = PromiseFtp.Options &  {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    readyTimeout?: number;
    disconnectWhenError?: boolean;
}

type OFtpErrorCode =
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
    rights: {
        user: string;
        group: string;
        other: string;
    }
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

export type OFtpConnectResponse = SResponse<SResponseOK, OFtpConnectError>;

export type OFtpDisconnectResponse = SResponse<SResponseOK, SResponseKO>;

export type OFtpFileResponse = SResponse<OFtpFileObject, OFtpFileError>;

export type OFtpFolderResponse = SResponse<OFtpFolderObject, OFtpFolderError>;

export type OFtpExistResponse = SResponse<OFtpExistObject, OFtpExistError>;

export type OFtpListResponse = SResponse<OFtpListObject, OFtpListError>;

export type OFtpUploadOneResponse = SResponse<OFtpFileObject, OFtpFileError | OFtpConnectError>;

declare class OFtp {
    constructor( config?: OFtpConfig );

    getClient(): PromiseFtp;

    connect( config?: OFtpConfig ): Promise<OFtpConnectResponse>;

    disconnect(): Promise<OFtpDisconnectResponse>;

    upload( filepathFrom: string, filepathTo?: string ): Promise<OFtpFileResponse>;

    uploadOne( filepathFrom: string, filepathTo?: string ): Promise<OFtpUploadOneResponse>;

    download( filepathFrom: string, filepathTo?: string ): Promise<OFtpFileResponse>;

    list( folder?: string, filters?: OFtpListFilters ): Promise<OFtpListResponse>;

    move( filepathFrom: string, filepathTo: string ): Promise<OFtpFileResponse>;

    delete( filepathFrom: string, strict?: boolean ): Promise<OFtpFileResponse>;

    exists( filepathFrom: string, disconnectWhenError?: boolean ): Promise<OFtpExistResponse>;

    mkdir( folder, recursive?: boolean, strict?: boolean ): Promise<OFtpFolderResponse>;

    rmdir( folder, strict?: boolean ): Promise<OFtpFolderResponse>;

}

export default OFtp;