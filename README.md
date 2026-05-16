# opencode-session-navigation

Vim-like navigation mode for the OpenCode TUI session view.

## Install

Install globally from npm:

```sh
opencode plugin --global opencode-session-navigation
```

Or use the shorter alias:

```sh
opencode plug --global opencode-session-navigation
```

Global install keeps the plugin available in every repo and avoids modifying a repository-local `.opencode/tui.json` when you run the command from inside a git worktree.

To enable it for one project only, add it manually to that project's OpenCode TUI config, `tui.json`:

```json
{
  "plugin": ["opencode-session-navigation"]
}
```

For local development from this repository, add the local path to `tui.json`:

```json
{
  "plugin": ["/absolute/path/to/opencode-session-navigation"]
}
```

## Usage

When the current session is idle, press `Escape` to enter navigation mode. A small `NAV` indicator appears on the right side of the session prompt, and navigation keys are captured without editing the prompt.

Default keys:

| Key | Action |
| --- | --- |
| `Escape` | Enter navigation mode |
| `i`, `a`, `Return` | Exit navigation mode and refocus the prompt |
| `j` / `k` | Scroll down/up one line |
| `Ctrl+d` / `Ctrl+u` | Scroll down/up half a page |
| `Ctrl+f` / `Ctrl+b` | Scroll down/up a page |
| `gg` | Jump to the first message |
| `G` | Jump to the bottom/latest output |
| `n` | Jump to the next user message |
| `N` or `p` | Jump to the previous user message |

Navigation mode is ignored while a session is running, while a dialog is open, or while permission/question prompts are pending.

## Configure

You can override keys through plugin options:

```json
{
  "plugin": [
    [
      "opencode-session-navigation",
      {
        "keybinds": {
          "enter": "escape",
          "exit": ["i", "a", "return"],
          "lineDown": "j",
          "lineUp": "k",
          "halfPageDown": "ctrl+d",
          "halfPageUp": "ctrl+u",
          "pageDown": "ctrl+f",
          "pageUp": "ctrl+b",
          "first": "gg",
          "last": "shift+g",
          "nextMessage": "n",
          "previousMessage": ["shift+n", "p"]
        },
        "indicator": "NAV"
      }
    ]
  ]
}
```

Set any keybind to `false` to disable it. Set `indicator` to `false` to hide the prompt indicator.

## Compatibility

Message jumps work with current OpenCode builds and include a fallback for older builds where needed.

## Project Docs

- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Support](SUPPORT.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## Development

```sh
npm install
npm run typecheck
npm run build
npm pack
```
