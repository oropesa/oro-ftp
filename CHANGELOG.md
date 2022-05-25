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