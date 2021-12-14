# Oro Ftp

Class OroFtp is a wrapper of promise-ftp to simplify their use.

[promise-ftp](https://www.npmjs.com/package/promise-ftp) is a FTP client module for node.js that provides an asynchronous interface for communicating with an FTP server.

```shell
npm install oro-ftp
```

Example:

```js
const OFtp = require( 'oro-ftp' );

const ftpClient = new OFtp( { 
    host: 'custom-server.com', 
    port: 21, 
    user: 'custom-user', 
    password: 'custom-password' 
} );

const ftpUpload = await ftpClient.uploadOne( `./folder-from/filename`, 'folder-to/filename' );
console.log( ftpUpload );
// { status: true, ... }
```

## Methods

* [new OFtp()](#new-oftp-config---)
* [.getClient()](#getclient)
* [await .connect( config = {} )](#await-connect-config---)
* [await .disconnect()](#await-disconnect)
* [await .upload( filepathFrom, filepathTo = '' )](#await-upload-filepathfrom-filepathto---)
* [await .uploadOne( filepathFrom, filepathTo = '' )](#await-uploadone-filepathfrom-filepathto---)
* [await .download( filepathFrom, filepathTo = '' )](#await-download-filepathfrom-filepathto---)
* [await .list( folder = '', filters = {} )](#await-list-folder---filters---)
* [await .move( filepathFrom, filepathTo )](#await-move-filepathfrom-filepathto-)
* [await .delete( filepathFrom, strict = false )](#await-delete-filepathfrom-strict--false-)
* [await .exists( filepathFrom )](#await-exists-filepathfrom-)
* [await .mkdir( folder, recursive = false, strict = false )](#await-mkdir-folder-recursive--false-strict--false-)
* [await .rmdir( folder, strict = false )](#await-rmdir-folder-strict--false-)

### new OFtp( config = {} )

On the construct, you can pass the server config data. You can also do it in `.connect()`.

In addition, `config` has a new param `disconnectWhenError` default `true`, so when an error happens the connection close automatically.

```js
const OFtp = require( 'oro-sftp' );
const config = {
    host: 'custom-server.com',
    port: 21,
    user: 'custom-user',
    password: 'custom-password',
    readyTimeout: 3000,
    disconnectWhenError: true
}

const ftpClient = new OFtp( config );

```

### .getClient()

If you want to use the library promise-ftp, you can get the object.

```js
const ftpClient = new OFtp( config );

const promiseFtp = await ftpClient.getClient();
```

### await .connect( config = {} )

When you create a connection, it's expected that you will disconnect it later.

The action return a response, which is an object with `status: true` or `status: false`.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
console.log( connected ); 
// { status: true }
```

### await .disconnect()

Note: If you don't `.disconnect()` when finish, the script still running.

Note2: There is a param in _config_ `disconnectWhenError` by default `true`. 
This means that if a method return `status: false`, the _ftpClient_ will disconnect automatically.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();

// ...

const disconnected = await ftpClient.disconnect();
console.log( disconnected );
// { status: true }
```

### await .upload( filepathFrom, filepathTo = '' )

If `filepathTo` is not declared, it takes the filename of `filepathFrom` and save it on the main folder.

```js
const ftpClient = new OFtp( { config } );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const uploaded = await ftpClient.upload( './files/custom-file.pdf' );
console.log( uploaded );

ftpClient.disconnect();
```

### await .uploadOne( filepathFrom, filepathTo = '' )

If you want to upload just one file, you can use this method and inside it creates the connection/disconnection flow.

```js
const ftpClient = new OFtp( { config } );

const uploaded = await ftpClient.uploadOne( './files/custom-file.pdf' );
console.log( uploaded );
```

### await .download( filepathFrom, filepathTo = '' )

If `filepathTo` is not declared, it takes the filename of `filepathFrom` and save it on the main folder.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const downloaded = await ftpClient.download( 'custom-file.pdf' );
console.log( downloaded );

ftpClient.disconnect();
```

### await .list( folder = '', filters = {} )

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const files = await ftpClient.list();
console.log( files );

ftpClient.disconnect();
```

Default filters:
```js
{
    pattern: undefined,
    onlyFiles: false,
    onlyFolders: false
}
```

The filter options can be a regular expression (most powerful option) or
a simple glob-like string where * will match any number of characters, e.g.
```js
foo* => foo, foobar, foobaz
*bar => bar, foobar, tabbar
*oo* => foo, foobar, look, book
```
Json Response
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

### await .move( filepathFrom, filepathTo )

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const moved = await ftpClient.move( 'custom-file.pdf', 'backup/custom-file.pdf' );
console.log( moved );

ftpClient.disconnect();
```

### await .delete( filepathFrom, strict = false )

When `strict = false` and not found the file, it returns `{ status: true }`.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const deleted = await ftpClient.delete( 'custom-file.pdf' );
console.log( deleted );

ftpClient.disconnect();
```

### await .exists( filepathFrom )

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const exists = await ftpClient.exists( 'custom-file.pdf' );
console.log( exists );

ftpClient.disconnect();
```

### await .mkdir( folder, recursive = false, strict = false )

When `recursive = true` it allows to create the subfolders too.

When `strict = false` and folder already exist, it returns `{ status: true }`.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const created = await ftpClient.mkdir( 'custom-folder/custom-subfolder', true );
console.log( created );

ftpClient.disconnect();
```

### await .rmdir( folder, strict = false )

When `strict = false` and not found the folder, it returns `{ status: true }`.

```js
const ftpClient = new OFtp( config );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const removed = await ftpClient.rmdir( 'custom-folder', true );
console.log( removed );

ftpClient.disconnect();
```