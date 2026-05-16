# Changelog

All notable changes to this project will be documented in this file.

## [0.1.4] - 2026-05-16

### Fixed

- Make navigation mode independent of prompt focus so `NAV` appears on the first `Escape` and exits on the first `Return`, `i`, or `a`

### Documentation

- Clarify global install versus project-local install instructions

## [0.1.3] - 2026-05-16

### Fixed

- Register alternative keybinds explicitly and clear pending key sequences when switching navigation modes

### Documentation

- Recommend global installation with `opencode plugin --global opencode-session-navigation`

## [0.1.2] - 2026-05-16

### Documentation

- Update install copy now that the package is published on npm

## [0.1.1] - 2026-05-16

### Documentation

- Add standard open source project docs: contributing, security, support, and code of conduct
- Include changelog in the published npm package

## [0.1.0] - 2026-05-16

### Added

- Initial OpenCode TUI plugin package
- Idle-session navigation mode with Vim-like keys
- Bare-key scrolling and jumping for session history
- User-message navigation with `n`, `N`, and `p`
- Quick return to latest output with `G`
- `NAV` indicator in the session prompt metadata row
- Plugin options for key overrides and indicator visibility
- `engines.opencode` compatibility metadata

### Compatibility

- Requires OpenCode `>=1.15.0`
