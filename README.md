# Oro Ftp

Class OroFtp is a wrapper of promise-ftp to simplify their use.

[promise-ftp](https://www.npmjs.com/package/promise-ftp) is an FTP client module for node.js that provides an asynchronous interface for communicating with an FTP server.

```shell
npm install oro-ftp
```

Example:

```js
const OFtp = require( 'oro-ftp' );

const ftpClient = new OFtp( { config: { 
    host: 'custom-server.com', 
    port: 22, 
    user: 'custom-user', 
    password: 'custom-password' 
} } );

const ftpUpload = await ftpClient.uploadOne( `./folder-from/filename`, 'folder-to/filename' );
console.log( ftpUpload );
// { status: true, ... }
```

### new OFtp( { config: object = {} } )

On the construct, you can pass the server config data.  You can also do it in `.connect()`.

In addition, `config` has a new param `disconnectWhenError` default `true`, so when an error happens the connection close automatically.

```js
const OFtp = require( 'oro-sftp' );
const config = {
    host: 'custom-server.com',
    port: 22,
    user: 'custom-user',
    password: 'custom-password',
    readyTimeout: 3000,
    
    disconnectWhenError: true
}

const ftpClient = new OFtp( { config } );

```

### .getClient()

If you want to use the library promise-ftp, you can get the object.

```js
const ftpClient = new OFtp( { config } );

const promiseFtp = await ftpClient.getClient();
```

### await .connect( config: object = {} )

When you create a connection, it's expected that you will disconnect it later.

The action return a response, which is an object with `status: true` or `status: false`.

```js
const ftpClient = new OFtp( { config } );

const connected = await ftpClient.connect();
console.log( connected ); 
// { status: true }
```

### await .disconnect()

Note: It's not necessary to use `await` in `.disconnect()`.

```js
const ftpClient = new OFtp( { config } );

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

### await .download( filepathFrom, filepathTo = '' )

If `filepathTo` is not declared, it takes the filename of `filepathFrom` and save it on the main folder.

```js
const ftpClient = new OFtp( { config } );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const downloaded = await ftpClient.download( 'custom-file.pdf' );
console.log( downloaded );

ftpClient.disconnect();
```

### await .uploadOne( filepathFrom, filepathTo = '' )

If you want to upload just one file, you can use this method and inside it creates the connection/disconnection flow.

```js
const ftpClient = new OFtp( { config } );

const uploaded = await ftpClient.uploadOne( './files/custom-file.pdf' );
console.log( uploaded );
```

### await .list( folder = '', filters = {} )

```js
// Default filters:
{
    pattern: undefined,
    onlyFiles: false,
    onlyFolders: false,
}

// The filter options can be a regular expression (most powerful option) or
// a simple glob-like string where * will match any number of characters, e.g.

foo* => foo, foobar, foobaz
*bar => bar, foobar, tabbar
*oo* => foo, foobar, look, book

// Response
{
    status: true,
    count: // list.length
    list:: [
        {
            type: // file type(-, d, l)
            name: // file name
            date: // file date of modified time
            size: // file size
            rights: { user: group: other: } // rwx

            modifyTime: // file timestamp of modified time
            accessTime: // file timestamp of access time
            owner: // user number ID
            group: // group number ID
        },
        ...
    ]
}
```

```js
const ftpClient = new OFtp( { config } );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const files = await ftpClient.list();
console.log( files );

ftpClient.disconnect();
```

### await .move( filepathFrom, filepathTo )

```js
const ftpClient = new OFtp( { config } );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const moved = await ftpClient.move( 'custom-file.pdf', 'backup/custom-file.pdf' );
console.log( moved );

ftpClient.disconnect();
```

### await .delete( filepathFrom, strict = false )

When `strict = false` and not found the file, it returns `{ status: true }`.

```js
const ftpClient = new OFtp( { config } );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const deleted = await ftpClient.delete( 'custom-file.pdf' );
console.log( deleted );

ftpClient.disconnect();
```

### await .exists( filepathFrom )

It returns `{ status: Boolean, filepath: filepathFrom, [ type: <- only when file exists ] }`.

```js
const ftpClient = new OFtp( { config } );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const exists = await ftpClient.exists( 'custom-file.pdf' );
console.log( exists );

ftpClient.disconnect();
```

### await .mkdir( folder )

It allows to create folders recursively.

```js
const ftpClient = new OFtp( { config } );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const created = await ftpClient.mkdir( 'custom-folder/custom-subfolder' );
console.log( created );

ftpClient.disconnect();
```

### await .rmdir( folder, recursive = false, strict = false )

When `recursive = true` it allows to remove the folder-content too.
When `strict = false` and not found the folder, it returns `{ status: true }`.

```js
const ftpClient = new OFtp( { config } );

const connected = await ftpClient.connect();
if( ! connected.status ) { return connected; }

const removed = await ftpClient.rmdir( 'custom-folder', true );
console.log( removed );

ftpClient.disconnect();
```