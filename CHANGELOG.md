# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2021-05-16
### Added
- strip `kubectl.kubernetes.io/last-applied-configuration` annotation

## [0.2.0] - 2021-05-14
### Changed
- close active editor on create
- [strip managedFields](https://github.com/kubernetes/kubernetes/pull/96878)
### Added
- PVC -> right click -> Go to PV
- reveal
- namespace -> right click -> edit
- right click on pod -> kubectl exec, kubectl debug
- start kubectl proxy with extension
### Fixed
- metadata.selfLink is deprecated

## [0.1.1] - 2021-05-13
### Changed
- Updated documentation

## [0.1.0] - 2021-05-13
- Initial release
