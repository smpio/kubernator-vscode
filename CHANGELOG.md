# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.3.3] - 2012-05-21
- focus on reveal

## [0.3.2] - 2021-05-18
- yes/no are booleans (https://github.com/kubernetes/kubernetes/issues/34146)

## [0.3.1] - 2021-05-16
### Fixed
- some resources (kinds) may have schema only for non-preferred group version (e.g. batch/v1beta1 CronJob in 1.8)
- prevent from outputting complex YAML keys

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
