# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2022-06-27
- remove deprecated `extensions` api group
- remove *preview* flag

## [0.5.3] - 2022-06-15
- clean more fields
- bugfixes

## [0.5.2] - 2022-04-12
- extract @smpio/kube package
- handle errors on context switching
- show "Kubernating..." on context switching
- ignore non-critical API discovery errors

## [0.5.1] - 2022-04-11
- updated dependencies
- more tree decorations
- fixed caching
- fixed `Element with id is already registered` regression in [0.5.0]

## [0.5.0] - 2022-04-01
- switching kubectl contexts
- fixed possible situations, when "refresh" does nothing
- improved Job manifest cleaning
- "clean" now removes empty objects
- improved Pod manifest cleaning
- added status field near deployments, ds, etc
- fixed object icons in tree, added colors depending on status
- added status text to objects in tree

## [0.4.1] - 2021-07-13
- open created manifest (command `Kubernator: Create`) in non-preview editor
- fix creating objects in default namespace
- base64 decode: convert value to map with single item: "decoded: ..." and handle this on save, also don't decode if there are non-printable characters

## [0.4.0] - 2021-06-12
- disable "folding" of YAML block scalars, which replaces "|" with ">"
- prevent saving of manifests in non-active tabs
- secret encoding/decoding

## [0.3.3] - 2021-05-21
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
