## 2.0.0 / 2023-10-31
**NOTE:**<br>
⚠️ It's not valid anymore:<br>`const OFtp = require('oro-ftp')`,<br>
✔️ use the following instead:<br>`const { OFtp } = require('oro-ftp')`

* Refactored `./index.js` to `./src/index.ts`.
* Updated _package_ as `type: "module"`.
* Added `tsup` and now _package_ is compiled to `cjs` _(common)_ and `mjs` _(module)_.
* Added _github actions_:
    * `validate_pr_to_master`
    * `npm_publish_on_pr_merge_to_master`.
* Added `husky` (to ensure only valid commits).
* Added `eslint` (and applied it).
* Added `prettier` (and applied it).
* Updated _package description_
* Updated libs:
    * `oro-functions` to `v2.0.0`.
* Updated _dev_ libs:
    * `ftp-svr` to `@nearst/ftp`.
    * `@babel/core` to `v7.23.2`.
    * `@babel/preset-env` to `v7.23.2`.
    * `@babel/preset-typescript` to `v7.23.2`.
    * `@types/jest` to `v29.5.7`.
    * `@types/fs-extra` to `v11.0.3`.
    * `@types/promise-ftp` to `v1.3.7`.
    * `babel-jest` to `v29.7.0`.
    * `jest` to `v29.7.0`.

## 1.1.1 & 1.1.0 / 2023-06-21
* Added `TS` support.
* Added _ts tests_.
* Added `package-lock.json`.
* Improved _tests_.
* Improved _readme_.
* Improved _error messages_ and added param `code` in _responseKO error_.
* Updated lib `fs-extra` to `v11.1.1`.
* Updated lib `oro-functions` to `v1.3.2`.
* Updated lib-dev `ftp-srv` to `v4.6.2`.
* Updated lib-dev `jest` to `v29.5.0`.

## 1.0.4 / 2022-06-21
* Updated lib `oro-functions` to `v1.1.6`.
* Updated lib-dev `jest` to `v28.1.1`.

## 1.0.3 / 2022-05-25
* Updated lib `fs-extra` to `v10.1.0`.
* Updated lib `oro-functions` to `v1.1.4`.
* Fixed `this.disconnect()` it's called always with `await`.
* Fixed `this.mkdir()` behavior because the _RFC 959 standard_ changed.
* Updated `this.exists` adding second param `disconnectWhenError` to choose it if it's desired.

## 1.0.2 / 2021-12-14
* Fixed by default `ftpConfig.readyTimeout` is `3000` miliseconds.

## 1.0.1 / 2021-12-14
* Fixed and improved `Readme`.

## 1.0.0 / 2021-12-14
* Added `MIT License`.
* Added _unit testing_ `Jest`.
* Added _package_ in `github.com` & `npmjs.com`.

## 0.1.0 / 2021-06-18
* Init project, it respects `oro-sftp` methods.