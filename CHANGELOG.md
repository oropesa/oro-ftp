## 2.1.0 / 2024-07-30
- Re-init `package-lock.json`.
- Added _coverage_ for testing.
- Added _watcher_ for coding.
- Updated _eslint_ to flat `eslint.config.js`.
- Improved `OSftp.list` to return always a sortened list by name.
- Improved `OSftp.rmdir` adding second param `recursive` (as _oro-sftp_ package).
- Improved _github cicd_ adding a sftp-server as a service for testing.
- Improved _github cicd_ replacing `actions/--@v3` by `actions/--@v4`, and replacing `npm install` to `npm ci`.
- Improved `export` declarations in index files.
- Enhanced _linter_ adding some extensions.
- Enhanced _prettier_ adding import-sorter.
- Updated _prettier_ `printWidth: 120`
- Simplified `tsup.config.ts`.
- Moved _tests_ inside `src` and simplified `*.test.ts`.
- Updated libs:
  - `fs-extra` from `v11.1.1` to `v11.2.0`.
  - `oro-functions` from `v2.0.2` to `v2.3.1`.
- Added _dev_ libs:
  - `@eslint/js`
  - `@trivago/prettier-plugin-sort-imports`
  - `eslint-config-prettier`
  - `eslint-plugin-jest`
  - `globals`
  - `nodemon`
  - `typescript-eslint`
- Updated _dev_ libs:
  - `@babel/core` from `v7.23.3` to `v7.24.9`.
  - `@babel/preset-env` from `v7.23.` to `v7.25.0`.
  - `@babel/preset-typescript` from `v7.23.3` to `v7.24.7`.
  - `@types/jest` from `v29.5.10` to `v29.5.12`.
  - `eslint` from `v8.54.0` to `v^^8.57.0`.
  - `eslint-plugin-unicorn` from `v49.0.0` to `v55.0.0`.
  - `husky` from `v8.0.3` to `v9.1.3`.
  - `prettier` from `v3.1.0` to `v3.3.3`.
  - `tsup` from `v8.0.1` to `v8.2.3`.
  - `typescript` from `v5.2.2` to `v5.5.4`.
- Removed _dev_ libs:
  - `@typescript-eslint/eslint-plugin` removed.
  - `@typescript-eslint/parser` removed.
  - `eslint-config-alloy` removed.

## 2.0.1 / 2023-11-22
* Fixed _github action_ `npm_publish_on_pr_merge_to_master`.
* Updated libs:
  * `oro-functions` from `v2.0.0` to `v2.0.2`.
* Updated _dev_ libs:
  * `@babel/core` from `v7.23.2` to `v7.23.3`.
  * `@babel/preset-env` from `v7.23.2` to `v7.23.3`.
  * `@babel/preset-typescript` from `v7.23.2` to `v7.23.3`.
  * `@types/fs-extra` from `v11.0.3` to `v11.0.4`.
  * `@types/glob-to-regexp` from `v0.4.3` to `v0.4.4`.
  * `@types/jest` from `v29.5.7` to `v29.5.10`.
  * `@types/promise-ftp` from `v1.3.7` to `v1.3.8`.
  * `@typescript-eslint/eslint-plugin` from `v6.9.1` to `v6.12.0`.
  * `@typescript-eslint/parser` from `v6.9.1` to `v6.12.0`.
  * `eslint` from `v8.52.0` to `v8.54.0`.
  * `prettier` from `v3.0.3` to `v3.1.0`.
  * `tsup` from `v7.2.0` to `v8.0.1`.

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