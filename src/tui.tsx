import type { KeyEvent, Renderable, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import type { Binding, Command, RunCommandResult } from "@opentui/keymap"
import { createSignal, Show } from "solid-js"

const PLUGIN_ID = "opencode-session-navigation"
const LAYER_PRIORITY = 1_000

type Api = TuiPluginApi
type TuiCommand = Command<Renderable, KeyEvent>
type TuiBinding = Binding<Renderable, KeyEvent>
type Message = ReturnType<Api["state"]["session"]["messages"]>[number]
type Part = ReturnType<Api["state"]["part"]>[number]

type Scrollish = Renderable & {
  scrollBy: (amount: number) => void
  scrollTo: (position: number | { top?: number; left?: number }) => void
  readonly scrollHeight: number
  readonly scrollTop?: number
}

type PluginOptions = {
  keybinds?: Partial<Record<KeybindName, string | readonly string[] | false>>
  indicator?: false | string
}

const command = {
  enter: "session.navigation.enter",
  exit: "session.navigation.exit",
  lineDown: "session.navigation.line.down",
  lineUp: "session.navigation.line.up",
  halfPageDown: "session.navigation.half.page.down",
  halfPageUp: "session.navigation.half.page.up",
  pageDown: "session.navigation.page.down",
  pageUp: "session.navigation.page.up",
  first: "session.navigation.first",
  last: "session.navigation.last",
  nextMessage: "session.navigation.message.next",
  previousMessage: "session.navigation.message.previous",
} as const

const defaultKeybinds = {
  enter: "escape",
  exit: "i,a,return",
  lineDown: "j",
  lineUp: "k",
  halfPageDown: "ctrl+d",
  halfPageUp: "ctrl+u",
  pageDown: "ctrl+f",
  pageUp: "ctrl+b",
  first: "gg",
  last: "shift+g",
  nextMessage: "n",
  previousMessage: "shift+n,p",
}

type KeybindName = keyof typeof defaultKeybinds
type Keybinds = Record<KeybindName, readonly string[]>

const hostCommand = {
  lineDown: "session.line.down",
  lineUp: "session.line.up",
  halfPageDown: "session.half.page.down",
  halfPageUp: "session.half.page.up",
  pageDown: "session.page.down",
  pageUp: "session.page.up",
  first: "session.first",
  last: "session.last",
  nextMessage: "session.message.next",
  previousMessage: "session.message.previous",
} as const

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readOptions(value: unknown): PluginOptions {
  return isObject(value) ? (value as PluginOptions) : {}
}

function keyList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function keybindsFromOptions(options: PluginOptions): Keybinds {
  const configured = isObject(options.keybinds) ? options.keybinds : {}
  const next = {} as Record<KeybindName, string[]>

  for (const key of Object.keys(defaultKeybinds) as KeybindName[]) {
    next[key] = keyList(defaultKeybinds[key])
    const value = configured[key]
    if (value === false) {
      next[key] = []
      continue
    }
    if (typeof value === "string" && value.trim()) {
      next[key] = keyList(value)
      continue
    }
    if (Array.isArray(value)) {
      const list = value.flatMap((item) => (typeof item === "string" ? keyList(item) : []))
      if (list.length) next[key] = list
    }
  }

  return next
}

function sessionID(api: Api): string | undefined {
  const route = api.route.current
  if (route.name !== "session" || !route.params) return undefined
  const id = route.params.sessionID
  return typeof id === "string" ? id : undefined
}

function sessionIsIdle(api: Api, id: string): boolean {
  const status = api.state.session.status(id)
  return !status || status.type === "idle"
}

function hasBlockingSessionPrompt(api: Api, id: string): boolean {
  return api.state.session.permission(id).length > 0 || api.state.session.question(id).length > 0
}

function canUseNavigation(api: Api, activeID?: string): boolean {
  const currentID = sessionID(api)
  if (!currentID) return false
  if (activeID && currentID !== activeID) return false
  if (api.ui.dialog.open) return false
  if (!sessionIsIdle(api, currentID)) return false
  if (hasBlockingSessionPrompt(api, currentID)) return false
  return true
}

function dispatchHost(api: Api, name: string): RunCommandResult<Renderable, KeyEvent> {
  return api.keymap.dispatchCommand(name)
}

function isUsableTextPart(part: Part): boolean {
  if (!part || part.type !== "text") return false
  const maybe = part as Part & { synthetic?: boolean; ignored?: boolean }
  return !maybe.synthetic && !maybe.ignored
}

function isUserMessageWithText(api: Api, message: Message): boolean {
  return message.role === "user" && api.state.part(message.id).some(isUsableTextPart)
}

function isScrollish(value: Renderable | null | undefined): value is Scrollish {
  const maybe = value as Partial<Scrollish> | null | undefined
  return typeof maybe?.scrollBy === "function" && typeof maybe.scrollTo === "function"
}

function findScrollContainer(child: Renderable | undefined): Scrollish | undefined {
  let current: Renderable | null | undefined = child?.parent
  while (current) {
    if (isScrollish(current)) return current
    current = current.parent
  }
  return undefined
}

function scrollTop(scroll: Scrollish): number {
  return typeof scroll.scrollTop === "number" ? scroll.scrollTop : scroll.y
}

function findUserMessageRenderables(api: Api, id: string): Renderable[] {
  return api.state.session
    .messages(id)
    .filter((message) => isUserMessageWithText(api, message))
    .map((message) => api.renderer.root.findDescendantById(message.id))
    .filter((value): value is Renderable => Boolean(value && !value.isDestroyed))
    .sort((left, right) => left.y - right.y)
}

function fallbackScrollMessage(api: Api, direction: "next" | "previous"): boolean {
  const id = sessionID(api)
  if (!id) return false

  const renderables = findUserMessageRenderables(api, id)
  if (renderables.length === 0) return false

  const scroll = findScrollContainer(renderables[0])
  if (!scroll || scroll.isDestroyed) return false

  const top = scrollTop(scroll)
  const margin = 10
  const target =
    direction === "next"
      ? renderables.find((child) => child.y > top + margin)
      : [...renderables].reverse().find((child) => child.y < top - margin)

  if (target) {
    scroll.scrollTo(Math.max(0, target.y - 1))
  } else {
    scroll.scrollBy(direction === "next" ? scroll.height : -scroll.height)
  }

  return true
}

function fallbackScroll(api: Api, action: keyof typeof hostCommand): boolean {
  if (action === "nextMessage") return fallbackScrollMessage(api, "next")
  if (action === "previousMessage") return fallbackScrollMessage(api, "previous")

  const id = sessionID(api)
  if (!id) return false
  const firstMessage = findUserMessageRenderables(api, id)[0]
  const scroll = findScrollContainer(firstMessage)
  if (!scroll || scroll.isDestroyed) return false

  switch (action) {
    case "lineDown":
      scroll.scrollBy(1)
      return true
    case "lineUp":
      scroll.scrollBy(-1)
      return true
    case "halfPageDown":
      scroll.scrollBy(scroll.height / 4)
      return true
    case "halfPageUp":
      scroll.scrollBy(-scroll.height / 4)
      return true
    case "pageDown":
      scroll.scrollBy(scroll.height / 2)
      return true
    case "pageUp":
      scroll.scrollBy(-scroll.height / 2)
      return true
    case "first":
      scroll.scrollTo(0)
      return true
    case "last":
      scroll.scrollTo(scroll.scrollHeight)
      return true
  }
}

function bindings(keys: readonly string[], cmd: string): TuiBinding[] {
  return keys.map((key) => ({ key, cmd, preventDefault: true }))
}

function keyMatchers(api: Api, keys: readonly string[]) {
  return keys.flatMap((key) => {
    try {
      return [api.keymap.createKeyMatcher(key)]
    } catch {
      return []
    }
  })
}

const plugin: TuiPluginModule = {
  id: PLUGIN_ID,
  tui: async (api, rawOptions) => {
    const options = readOptions(rawOptions)
    const keys = keybindsFromOptions(options)
    const enterMatchers = keyMatchers(api, keys.enter)
    const exitMatchers = keyMatchers(api, keys.exit)
    const [activeSession, setActiveSession] = createSignal<string | undefined>()

    const isActive = () => {
      const id = activeSession()
      return Boolean(id && canUseNavigation(api, id))
    }

    const exitNavigation = () => {
      if (!activeSession()) return
      api.keymap.clearPendingSequence()
      setActiveSession(undefined)
      api.ui.dialog.clear()
      api.renderer.requestRender()
    }

    const enterNavigation = () => {
      const id = sessionID(api)
      if (!id || !canUseNavigation(api)) return
      api.keymap.clearPendingSequence()
      setActiveSession(id)
      api.ui.dialog.clear()
      api.renderer.requestRender()
    }

    const runNavigation = (action: keyof typeof hostCommand) => {
      if (!isActive()) return
      const result = dispatchHost(api, hostCommand[action])
      if (!result.ok && result.reason === "not-found") fallbackScroll(api, action)
      api.ui.dialog.clear()
      api.renderer.requestRender()
    }

    const commands: TuiCommand[] = [
      {
        name: command.enter,
        title: "Enter session navigation mode",
        desc: "Use Vim-like keys to scroll the current idle session without editing the prompt.",
        category: "Session",
        hidden: true,
        enabled: () => !isActive() && canUseNavigation(api),
        run: enterNavigation,
      },
      {
        name: command.exit,
        title: "Exit session navigation mode",
        desc: "Return focus to the prompt.",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: exitNavigation,
      },
      {
        name: command.lineDown,
        title: "Navigation mode line down",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("lineDown"),
      },
      {
        name: command.lineUp,
        title: "Navigation mode line up",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("lineUp"),
      },
      {
        name: command.halfPageDown,
        title: "Navigation mode half page down",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("halfPageDown"),
      },
      {
        name: command.halfPageUp,
        title: "Navigation mode half page up",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("halfPageUp"),
      },
      {
        name: command.pageDown,
        title: "Navigation mode page down",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("pageDown"),
      },
      {
        name: command.pageUp,
        title: "Navigation mode page up",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("pageUp"),
      },
      {
        name: command.first,
        title: "Navigation mode first message",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("first"),
      },
      {
        name: command.last,
        title: "Navigation mode last message",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("last"),
      },
      {
        name: command.nextMessage,
        title: "Navigation mode next user message",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("nextMessage"),
      },
      {
        name: command.previousMessage,
        title: "Navigation mode previous user message",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("previousMessage"),
      },
    ]

    const enterBindings = bindings(keys.enter, command.enter)
    const navigationBindings = [
      ...bindings(keys.exit, command.exit),
      ...bindings(keys.lineDown, command.lineDown),
      ...bindings(keys.lineUp, command.lineUp),
      ...bindings(keys.halfPageDown, command.halfPageDown),
      ...bindings(keys.halfPageUp, command.halfPageUp),
      ...bindings(keys.pageDown, command.pageDown),
      ...bindings(keys.pageUp, command.pageUp),
      ...bindings(keys.first, command.first),
      ...bindings(keys.last, command.last),
      ...bindings(keys.nextMessage, command.nextMessage),
      ...bindings(keys.previousMessage, command.previousMessage),
    ]

    api.lifecycle.onDispose(
      api.keymap.registerLayer({
        priority: LAYER_PRIORITY,
        commands,
      }),
    )

    api.lifecycle.onDispose(
      api.keymap.intercept(
        "key",
        (ctx) => {
          if (!enterMatchers.some((match) => match(ctx.event))) return
          if (isActive() || !canUseNavigation(api)) return
          ctx.consume()
          enterNavigation()
        },
        { priority: LAYER_PRIORITY },
      ),
    )

    api.lifecycle.onDispose(
      api.keymap.intercept(
        "key",
        (ctx) => {
          if (!exitMatchers.some((match) => match(ctx.event))) return
          if (!isActive()) return
          ctx.consume()
          exitNavigation()
        },
        { priority: LAYER_PRIORITY },
      ),
    )

    api.lifecycle.onDispose(
      api.keymap.registerLayer({
        priority: LAYER_PRIORITY,
        enabled: () => !isActive() && canUseNavigation(api),
        bindings: enterBindings,
      }),
    )

    api.lifecycle.onDispose(
      api.keymap.registerLayer({
        priority: LAYER_PRIORITY,
        enabled: isActive,
        bindings: navigationBindings,
      }),
    )

    api.lifecycle.onDispose(
      api.event.on("session.status", (event) => {
        if (event.properties.sessionID === activeSession() && event.properties.status.type !== "idle") exitNavigation()
      }),
    )
    api.lifecycle.onDispose(
      api.event.on("permission.asked", (event) => {
        if (event.properties.sessionID === activeSession()) exitNavigation()
      }),
    )
    api.lifecycle.onDispose(
      api.event.on("question.asked", (event) => {
        if (event.properties.sessionID === activeSession()) exitNavigation()
      }),
    )

    const indicator = options.indicator === false ? undefined : typeof options.indicator === "string" ? options.indicator : "NAV"

    if (indicator) {
      api.slots.register({
        order: 50,
        slots: {
          session_prompt_right(ctx, props) {
            return (
              <Show when={activeSession() === props.session_id}>
                <text>
                  <span style={{ fg: ctx.theme.current.warning, bold: true }}>{indicator}</span>
                </text>
              </Show>
            )
          },
        },
      })
    }
  },
}

export default plugin
