# opencode-session-navigation

Vim-like navigation mode for the OpenCode TUI session view.

## Install

After the package is published to npm:

```sh
opencode plugin opencode-session-navigation
```

Or use the shorter alias:

```sh
opencode plug opencode-session-navigation
```

You can also add it manually to your OpenCode TUI config, `tui.json`:

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

When the current session is idle, press `Escape` to enter navigation mode. The prompt blurs and a small `NAV` indicator appears on the right side of the session prompt.

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

## Development

```sh
npm install
npm run typecheck
npm run build
npm pack
```
