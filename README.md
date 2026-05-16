# opencode-session-navigation

Vim-like navigation mode for the OpenCode TUI session view.

This is a standalone TUI plugin based on the `session-navigation-mode` branch behavior. It does not patch OpenCode core.

## Install

```sh
opencode plugin install opencode-session-navigation
```

Or add it manually to your OpenCode config:

```json
{
  "plugin": ["opencode-session-navigation"]
}
```

For local development from this repository:

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

## Notes

The plugin uses OpenCode's public TUI keymap APIs:

- `api.keymap.registerLayer({ commands, bindings })`
- `api.keymap.dispatchCommand(name)`
- `api.slots.register(...)` for the prompt indicator

For message jumps it first dispatches OpenCode's host commands (`session.message.next` and `session.message.previous`). If those commands are unavailable in an older build, it falls back to locating visible user-message renderables by message id.

## Development

```sh
npm install
npm run typecheck
npm run build
npm pack
```
