import solidPlugin from "@opentui/solid/bun-plugin"

const external = [
  "@opencode-ai/plugin",
  "@opencode-ai/plugin/tui",
  "@opentui/core",
  "@opentui/keymap",
  "@opentui/solid",
  "solid-js",
]

await Bun.$`bunx tsup src/tui.tsx --format esm --dts-only --clean ${external.flatMap((item) => ["--external", item])}`

const result = await Bun.build({
  entrypoints: ["src/tui.tsx"],
  target: "bun",
  outdir: "dist",
  external,
  plugins: [solidPlugin],
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
