# Oro Ftp

- [Overview](#overview)
- [Installation](#installation)
- [Example](#example)
- [Methods](#methods)
- [Testing](#testing)

## Overview

OroFtp Class is a wrapper of promise-ftp to simplify their use.

[promise-ftp](https://www.npmjs.com/package/promise-ftp) is a FTP client module for node.js that provides an asynchronous interface for communicating with a FTP server.

To have the same interface using SFTP, you can utilize the OroSFtp class available through [OroSFtp package](https://www.npmjs.com/package/oro-sftp).

## Installation

```shell
npm install oro-ftp
```

## Example

```js
// cjs
const { OFtp } = require( 'oro-ftp' );

// mjs, ts
import OFtp from 'oro-ftp';

const ftpClient = new OFtp( {
  host: 'custom-server.com',
  port: 21,
  user: 'custom-user',
  password: 'custom-password'
} );

const ftpUpload = await ftpClient.uploadOne( `./folder-from/filename`, 'folder-to/filename' );

console.log( ftpUpload );
// -> { status: true, ... }
```

## Methods

<hr>

- [Error Code List](#error-code-list)
- [new OFtp()](#new-oftp)
- [.getClient()](#getclient)
- [await .connect()](#await-connect)
- [await .disconnect()](#await-disconnect)
- [await .upload()](#await-upload)
- [await .uploadOne()](#await-uploadone)
- [await .download()](#await-download)
- [await .list()](#await-list)
- [await .move()](#await-move)
- [await .delete()](#await-delete)
- [await .exists()](#await-exists)
- [await .mkdir()](#await-mkdir)
- [await .rmdir()](#await-rmdir)

<hr>

### Error Code List

When an error happens, instead to throw an error, it's returned a managed _responseKO_.

_responseKO_ is an object with 3 fields:

```ts
interface responseKO {
  status: false;
  error: {
    msg: string;         // explaining the error
    code: OFtpErrorCode; // string
    // ...               // other data, it depends on method error
  };
  tryAgain: boolean;
}

type OFtpErrorCode =
  | 'ECONNREFUSED'
  | 'UNCONNECTED'
  | 'ENOTFOUND'
  | 'ENTIMEOUT'
  | 'ENOENT'
  | 'EEXIST'
  | 'ENOTEMPTY';
```

<hr>

### new OFtp()

```ts
new OFtp( config?: OFtpConfig );

type OFtpConfig = PromiseFtp.Options &  {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  readyTimeout?: number;          // def: 3000
  disconnectWhenError?: boolean;  // def: true
}
```

As parameters, you can pass the server config data (you can also do it in `.connect()`).

In addition, `config` has param `disconnectWhenError` (default `true`), so when an error happens, connection closes automatically.

```js
const OFtp = require('oro-ftp');

const config = {
  host: 'custom-server.com',
  port: 21,
  user: 'custom-user',
  password: 'custom-password',
  readyTimeout: 3000,
  disconnectWhenError: true,
};

const ftpClient = new OFtp(config);
```

<hr>

### .getClient()

```ts
ftpClient.getClient(): PromiseFtp;
```

If you want to use the library `promise-ftp`, you can get the object.

```js
const ftpClient = new OFtp(config);

const promiseFtp = ftpClient.getClient();
```

<hr>

### await .connect()

```ts
await ftpClient.connect( config?: OFtpConfig ) => Promise<OFtpConnectResponse>;

type OFtpConfig = PromiseFtp.Options &  {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  readyTimeout?: number;          // def: 3000
  disconnectWhenError?: boolean;  // def: true
}

export type OFtpConnectResponse =
  | SResponseOKBasic
  | SResponseKOObjectAgain<OFtpConnectError>;

interface SResponseOKBasic {
  status: true;
}

interface SResponseKOObjectAgain {
  status: false;
  error: {
    msg: string;
    code: OFtpErrorCode;
    config: OFtpConfig;
  },
  tryAgain: boolean;
}

interface OFtpConnectError {
  msg: string;
  code: OFtpErrorCode;
  config: OFtpConfig;
}
```

When you create a connection, it's expected that you will disconnect it later.

This method return a _response_, which is an object with `status: true | false`.

```js
const ftpClient = new OFtp(config);

const connected = await ftpClient.connect();
console.log(connected);
// -> { status: true }
```

<hr>

### await .disconnect()

```ts
await ftpClient.disconnect() => Promise<OFtpDisconnectResponse>;

export type OFtpDisconnectResponse =
  | SResponseOKBasic
  | SResponseKOBasic;

interface SResponseOKBasic {
  status: true;
}

interface SResponseKOBasic {
  status: false;
}
```

**Note**: If you don't `.disconnect()` when finished, the script still running.

**Note2**: There is a param in _config_ `disconnectWhenError` by default `true`.
This means that if a method (like `upload` or `move`) return `status: false`, the _ftpClient_ will be disconnected automatically.

This method return a _response_, which is an object with `status: true | false`.

```js
const ftpClient = new OFtp(config);

const connected = await ftpClient.connect();

// ...

const disconnected = await ftpClient.disconnect();
console.log(disconnected);
// -> { status: true }
```

<hr>

### await .upload()

```ts
await ftpClient.upload( filepathFrom: string, filepathTo?: string )
  => Promise<OFtpFileResponse>;

export type OFtpFileResponse =
  | SResponseOKObject<OFtpFileObject>
  | SResponseKOObject<OFtpFileError>;

interface SResponseOKObject {
  status: true;
  filename: string;
  filepath: string;
}

interface SResponseKOObject {
  status: false;
  error: {
    msg: string;
    filepathFrom: string;
    filepathTo?: string;
    code?: OFtpErrorCode;
  }
}

interface OFtpFileObject {
  filename: string;
  filepath: string;
}

interface OFtpFileError {
  msg: string;
  filepathFrom: string;
  filepathTo?: string;
  code?: OFtpErrorCode;
}
```

`upload` is the action to copy from _local_ to _ftp folder_.

If `filepathTo` is not declared, it takes the filename of `filepathFrom` and save it on _ftp_ main folder.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const uploaded = await ftpClient.upload( './files/custom-file.pdf' );
console.log( uploaded );
// -> { status: true, filename: 'custom-file.pdf', ... }

await ftpClient.disconnect();
```

<hr>

### await .uploadOne()

```ts
await ftpClient.upload( filepathFrom: string, filepathTo?: string )
  => Promise<OFtpUploadOneResponse>;

export type OFtpUploadOneResponse =
  | SResponseOKObject<OFtpFileObject>
  | SResponseKOObject<OFtpFileError | OFtpConnectError>;

interface SResponseOKObject {
  status: true;
  filename: string;
  filepath: string;
}

type SResponseKOObject =
  | {
      status: false;
      error: {
        msg: string;
        filepathFrom: string;
        filepathTo?: string;
        code?: OFtpErrorCode;
      }
    }
  | {
      status: false;
      error: {
        msg: string;
        code: OFtpErrorCode;
        config: OFtpConfig;
      }
    }

interface OFtpFileObject {
  filename: string;
  filepath: string;
}

interface OFtpFileError {
  msg: string;
  filepathFrom: string;
  filepathTo?: string;
  code?: OFtpErrorCode;
}

interface OFtpConnectError {
  msg: string;
  code: OFtpErrorCode;
  config: OFtpConfig;
}
```

If you want to upload just one file, you can use this method and inside:

1. it's connected,
2. file is uploaded,
3. it's disconnected.

```js
const ftpClient = new OFtp({ config });

const uploaded = await ftpClient.uploadOne('./files/custom-file.pdf');
console.log(uploaded);
// -> { status: true, filename: 'custom-file.pdf', ... }
```

<hr>

### await .download()

```ts
await ftpClient.download( filepathFrom: string, filepathTo?: string )
  => Promise<OFtpFileResponse>;

export type OFtpFileResponse =
  | SResponseOKObject<OFtpFileObject>
  | SResponseKOObject<OFtpFileError>;

interface SResponseOKObject {
  status: true;
  filename: string;
  filepath: string;
}

interface SResponseKOObject {
  status: false;
  error: {
    msg: string;
    filepathFrom: string;
    filepathTo?: string;
    code?: OFtpErrorCode;
  }
}

interface OFtpFileObject {
  filename: string;
  filepath: string;
}

interface OFtpFileError {
  msg: string;
  filepathFrom: string;
  filepathTo?: string;
  code?: OFtpErrorCode;
}
```

`download` is the action to copy from _ftp folder_ to _local_.

If `filepathTo` is not declared, it takes the filename of `filepathFrom` and save it on _local_ main folder.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const downloaded = await ftpClient.download( 'custom-file.pdf' );
console.log( downloaded );
// -> { status: true, filename: 'custom-file.pdf', ... }

ftpClient.disconnect();
```

<hr>

### await .list()

```ts
await ftpClient.list( folder?: string, filters?: OFtpListFilters )
  => Promise<OFtpListResponse>;

interface OFtpListFilters {
  onlyFiles?: boolean | undefined;        // def: false
  onlyFolders?: boolean | undefined;      // def: false
  pattern?: string | RegExp | undefined;
}

export type OFtpListResponse =
  | SResponseOKObject<OFtpListObject>
  | SResponseKOObject<OFtpListError>;

interface SResponseOKObject {
  status: true;
  count: number; // list.length
  list: OFtpListFile[];
}

interface SResponseKOObject {
  status: false;
  error: {
    msg: string;
    folder: string;
    filters: OFtpListFilters;
    code?: OFtpErrorCode;
  }
}

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

type OFtpListFileType = '-' | 'd' | 'l';
// 'file' | 'folder' | 'symlink'

export interface OFtpListObject {
  count: number; // list.length
  list: OFtpListFile[];
}

export interface OFtpListError {
  msg: string;
  folder: string;
  filters: OFtpListFilters;
  code?: OFtpErrorCode;
}
```

`list` is the action to take a look at what is in _ftp folder_.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const files = await ftpClient.list();
console.log( files );
// -> { status: true, count: 7, list: [ ... ] }

ftpClient.disconnect();
```

- Filter: `pattern`

`pattern` filter can be a regular expression (most powerful option) or
a simple glob-like string where `*` will match any number of characters, e.g.

```js
foo* => foo, foobar, foobaz
*bar => bar, foobar, tabbar
*oo* => foo, foobar, look, book
```

response example

```js
{
  status: true,
  count: // list.length
  list: [
    {
      type: // file type(-, d, l)
      name: // file name
      path: // file path
      date: // file date of modified time
      size: // file size
      rights: { user: 'rwx', group: 'rwx', other: 'rwx' }
      owner: // user number ID
      group: // group number ID
    },
    ...
  ]
}
```

<hr>

### await .move()

```ts
await ftpClient.move( filepathFrom: string, filepathTo?: string )
  => Promise<OFtpFileResponse>;

export type OFtpFileResponse =
  | SResponseOKObject<OFtpFileObject>
  | SResponseKOObject<OFtpFileError>;

interface SResponseOKObject {
  status: true;
  filename: string;
  filepath: string;
}

interface SResponseKOObject {
  status: false;
  error: {
    msg: string;
    filepathFrom: string;
    filepathTo?: string;
    code?: OFtpErrorCode;
  }
}

interface OFtpFileObject {
  filename: string;
  filepath: string;
}

interface OFtpFileError {
  msg: string;
  filepathFrom: string;
  filepathTo?: string;
  code?: OFtpErrorCode;
}
```

`move` is the action to move from _ftp folder_ to _ftp folder_ (or event _rename_).

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const moved = await ftpClient.move( 'custom-file.pdf', 'backup/custom-file.pdf' );
console.log( moved );
// -> { status: true, filename: 'custom-file.pdf', ... }

ftpClient.disconnect();
```

<hr>

### await .delete()

```ts
await ftpClient.delete( filepathFrom: string, strict?: boolean )
  => Promise<OFtpFileResponse>;

export type OFtpFileResponse =
  | SResponseOKObject<OFtpFileObject>
  | SResponseKOObject<OFtpFileError>;

interface SResponseOKObject {
  status: true;
  filename: string;
  filepath: string;
}

interface SResponseKOObject {
  status: false;
  error: {
    msg: string;
    filepathFrom: string;
    code?: OFtpErrorCode;
  }
}

interface OFtpFileObject {
  filename: string;
  filepath: string;
}

interface OFtpFileError {
  msg: string;
  filepathFrom: string;
  code?: OFtpErrorCode;
}
```

`delete` is the action to remove a file from _ftp folder_.

When `strict = false` and not found the file, it returns `{ status: true }`.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const deleted = await ftpClient.delete( 'custom-file.pdf' );
console.log( deleted );
// -> { status: true, filename: 'custom-file.pdf', ... }

ftpClient.disconnect();
```

<hr>

### await .exists()

```ts
await ftpClient.exists( filepathFrom: string, disconnectWhenError?: boolean )
  => Promise<OFtpExistResponse>;

export type OFtpExistResponse =
  | SResponseOKObject<OFtpExistObject>
  | SResponseKOObject<OFtpExistError>;

interface SResponseOKObject {
  status: true;
  filename: string;
  filepath: string;
  type: string;
}

interface SResponseKOObject {
  status: false;
  error: {
    msg: string;
    filename: string;
    filepath: string;
    code?: OFtpErrorCode;
  }
}

interface OFtpExistObject {
  filename: string;
  filepath: string;
  type: string;
}

interface OFtpExistError {
  msg: string;
  filename: string;
  filepath: string;
  code?: OFtpErrorCode;
}
```

`exists` is the action to check if a file or folder exists in _ftp folder_.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const exists = await ftpClient.exists( 'custom-file.pdf' );
console.log( exists );
// -> { status: true, filename: 'custom-file.pdf', ... }

ftpClient.disconnect();
```

<hr>

### await .mkdir()

```ts
await ftpClient.mkdir( folder, recursive?: boolean, strict?: boolean )
  => Promise<OFtpFolderResponse>;

export type OFtpFolderResponse =
  | SResponseOKObject<OFtpFolderObject>
  | SResponseKOObject<OFtpFolderError>;

interface SResponseOKObject {
  status: true;
  foldername: string;
  folderpath: string;
}

interface SResponseKOObject {
  status: false;
  error: {
    msg: string;
    filepathFrom: string;
    code?: OFtpErrorCode;
  }
}

interface OFtpFolderObject {
  foldername: string;
  folderpath: string;
}

interface OFtpFolderError {
  msg: string;
  folder: string;
  code?: OFtpErrorCode;
}
```

`mkdir` is the action to create folders in _ftp folder_.

When `recursive = true` it allows to create the subfolders too.

When `strict = false` and folder already exist, it returns `{ status: true }`.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const created = await ftpClient.mkdir( 'custom-folder/custom-subfolder', true );
console.log( created );
// -> { status: true, foldername: 'custom-subfolder', ... }

ftpClient.disconnect();
```

<hr>

### await .rmdir()

```ts
await ftpClient.rmdir( folder, recursive?: boolean, strict?: boolean )
  => Promise<OFtpFolderResponse>;

export type OFtpFolderResponse =
  | SResponseOKObject<OFtpFolderObject>
  | SResponseKOObject<OFtpFolderError>;

interface SResponseOKObject {
  status: true;
  foldername: string;
  folderpath: string;
}

interface SResponseKOObject {
  status: false;
  error: {
    msg: string;
    filepathFrom: string;
    code?: OFtpErrorCode;
  }
}

interface OFtpFolderObject {
  foldername: string;
  folderpath: string;
}

interface OFtpFolderError {
  msg: string;
  folder: string;
  code?: OFtpErrorCode;
}
```

`rmdir` is the action to remove folders in _ftp folder_.

When `recursive = true` it allows to remove the folder-content too.

When `strict = false` and not found the folder, it returns `{ status: true }`.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const removed = await ftpClient.rmdir( 'custom-folder', true );
console.log( removed );
// -> { status: true, foldername: 'custom-folder', ... }

ftpClient.disconnect();
```

## Testing

If you want to run `npm run test` in local, first you need to run a ftp server (i.e. via docker):

```bash
# 'stilliard/pure-ftpd' image
> docker run -d --name ORO_FTP_SERVER \
    -p 2221:21 -p 10000-10009:10000-10009 --expose=10000-10009 \
    -e FTP_USER_NAME=oftp_user \
    -e FTP_USER_PASS=oftp_pass \
    -e FTP_USER_HOME=/home/osftp_folder \
    -e FTP_PASSIVE_PORTS=10000:10009 \
    -e PUBLICHOST=localhost \
    stilliard/pure-ftpd
```

Then, you have to declare your own `./src/__tests__/config.json`, <br>
_(Note:_ you can copypaste it from `./src/__tests__/config-default.json`._)_

```json
{
  "host": "localhost",
  "port": 2221,
  "user": "oftp_user",
  "password": "oftp_pass"
}
```

Finally, you can run tests (and coverages)

```shell
> npm run test
# or
> yarn test
```