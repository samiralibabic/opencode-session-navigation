# Contributing

Thanks for helping improve `opencode-session-navigation`.

This project is intentionally small: it adds Vim-like navigation keys to the OpenCode TUI session view without changing prompt editing behavior.

## Ways to Contribute

- Report bugs or compatibility issues
- Improve documentation
- Suggest focused UX improvements
- Open pull requests for small, reviewable changes

## Development

Requirements:

- Node.js and npm
- OpenCode `>=1.15.0` for local testing

Install dependencies and run checks:

```sh
npm ci
npm run typecheck
npm run build
npm pack --ignore-scripts
```

## Local Testing

Add the local plugin path to your OpenCode TUI config, `tui.json`:

```json
{
  "plugin": ["/absolute/path/to/opencode-session-navigation"]
}
```

Then open an idle session in the OpenCode TUI and press `Escape` to enter navigation mode.

## Pull Requests

Before opening a PR:

- Keep the change focused
- Update `README.md` or `CHANGELOG.md` when behavior changes
- Run `npm run typecheck`
- Run `npm run build`
- Do not commit `node_modules/` or generated `.tgz` files

This repo commits `dist/` so the package can be consumed directly from GitHub or npm.

## Release Checklist

For maintainers:

1. Update the version in `package.json` and `package-lock.json`
2. Update `CHANGELOG.md`
3. Run `npm run typecheck`
4. Run `npm run build`
5. Run `npm pack --ignore-scripts`
6. Create a GitHub tag/release
7. Publish to npm
