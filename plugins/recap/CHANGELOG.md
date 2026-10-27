## [0.3.1](https://github.com/kingsleydon/paseo-plugins/compare/recap-v0.3.0...recap-v0.3.1) (2026-10-28)

### Fixes

* **Router:** send `thinking: {"type": "disabled"}` — a recap is one-shot JSON, and thinking spends output-rate credits (matches the CLI paths' low/no thinking).
* **Usage guard:** auto recaps via the Router now skip when the zcode-native provider (same quota pool) is near its limit, instead of never being throttled.

## [0.3.0](https://github.com/kingsleydon/paseo-plugins/compare/recap-v0.2.5...recap-v0.3.0) (2026-10-28)

### Features

* **Router provider:** recaps can call an Anthropic-compatible messages API directly — no CLI login needed. Added for GLM via a local router (`http://127.0.0.1:8787`, `glm-5.3-flash`). In `auto` an enabled router leads the candidate list; picking Router in settings forces it; connection details are editable in settings. Router failures fall through to the CLI candidates as before.

# Changelog

## [0.2.5](https://github.com/kingsleydon/paseo-plugins/compare/recap-v0.2.4...recap-v0.2.5) (2026-10-27)


### Bug Fixes

* **recap:** read the conversation when a recap runs ([#23](https://github.com/kingsleydon/paseo-plugins/issues/23)) ([e656993](https://github.com/kingsleydon/paseo-plugins/commit/e656993cc084536c5864edef2e7c26c77a1ad7ab))

## [0.2.4](https://github.com/kingsleydon/paseo-plugins/compare/v0.2.3...recap-v0.2.4) (2026-10-20)

### Bug Fixes

* Support the opencode 2.x CLI, which removed `run --pure` and `--dir` ([#19](https://github.com/kingsleydon/paseo-plugins/pull/19))

### Miscellaneous Chores

* Move to `plugins/recap` in the paseo-plugins monorepo; tags are now `recap-v<version>` ([#15](https://github.com/kingsleydon/paseo-plugins/pull/15))

## [0.2.3](https://github.com/kingsleydon/paseo-plugins/compare/v0.2.2...v0.2.3) (2026-10-12)

### Bug Fixes

* Load on iOS and Android: no class syntax in client code ([#14](https://github.com/kingsleydon/paseo-plugins/pull/14))

## [0.2.2](https://github.com/kingsleydon/paseo-plugins/compare/v0.2.1...v0.2.2) (2026-10-12)

### Documentation

* The overview says that short error messages from recent turns reach the recap model ([#13](https://github.com/kingsleydon/paseo-plugins/pull/13))

## [0.2.1](https://github.com/kingsleydon/paseo-plugins/compare/v0.2.0...v0.2.1) (2026-10-12)

### Miscellaneous Chores

* Clean up code and add listing metadata (description, author) ([#12](https://github.com/kingsleydon/paseo-plugins/pull/12))

## [0.2.0](https://github.com/kingsleydon/paseo-plugins/releases/tag/v0.2.0) (2026-10-12)

### Features

* Pick recap models the way Paseo's metadata generation does ([#9](https://github.com/kingsleydon/paseo-plugins/pull/9))

### Miscellaneous Chores

* Publish to npm with trusted publishing (OIDC) ([#8](https://github.com/kingsleydon/paseo-plugins/pull/8), [#10](https://github.com/kingsleydon/paseo-plugins/pull/10))

## 0.1.0 (2026-10-12)

### Features

* Recaps that behave and look like Claude Code's: conversation line, pill, card, and typed settings ([#1](https://github.com/kingsleydon/paseo-plugins/pull/1))
* Store overview; the command is now `/paseo-recap` ([#3](https://github.com/kingsleydon/paseo-plugins/pull/3))
* First npm release ([#7](https://github.com/kingsleydon/paseo-plugins/pull/7))

### Bug Fixes

* Install from GitHub: import Paseo types from the plugin SDK ([#2](https://github.com/kingsleydon/paseo-plugins/pull/2))
* Clipped recap card and a quieter Regenerate ([#4](https://github.com/kingsleydon/paseo-plugins/pull/4))
* Clipped spinner in the Recap pill ([#6](https://github.com/kingsleydon/paseo-plugins/pull/6))

### Documentation

* The overview explains model fallback and OpenCode session cleanup ([#5](https://github.com/kingsleydon/paseo-plugins/pull/5))
