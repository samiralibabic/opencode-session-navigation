// src/tui.tsx
import { createSignal, Show } from "solid-js";
var PLUGIN_ID = "opencode-session-navigation";
var LAYER_PRIORITY = 1e3;
var command = {
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
  previousMessage: "session.navigation.message.previous"
};
var defaultKeybinds = {
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
  previousMessage: "shift+n,p"
};
var hostCommand = {
  lineDown: "session.line.down",
  lineUp: "session.line.up",
  halfPageDown: "session.half.page.down",
  halfPageUp: "session.half.page.up",
  pageDown: "session.page.down",
  pageUp: "session.page.up",
  first: "session.first",
  last: "session.last",
  nextMessage: "session.message.next",
  previousMessage: "session.message.previous"
};
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readOptions(value) {
  return isObject(value) ? value : {};
}
function keyList(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
function keybindsFromOptions(options) {
  const configured = isObject(options.keybinds) ? options.keybinds : {};
  const next = {};
  for (const key of Object.keys(defaultKeybinds)) {
    next[key] = keyList(defaultKeybinds[key]);
    const value = configured[key];
    if (value === false) {
      next[key] = [];
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      next[key] = keyList(value);
      continue;
    }
    if (Array.isArray(value)) {
      const list = value.flatMap((item) => typeof item === "string" ? keyList(item) : []);
      if (list.length) next[key] = list;
    }
  }
  return next;
}
function sessionID(api) {
  const route = api.route.current;
  if (route.name !== "session" || !route.params) return void 0;
  const id = route.params.sessionID;
  return typeof id === "string" ? id : void 0;
}
function sessionIsIdle(api, id) {
  const status = api.state.session.status(id);
  return !status || status.type === "idle";
}
function hasBlockingSessionPrompt(api, id) {
  return api.state.session.permission(id).length > 0 || api.state.session.question(id).length > 0;
}
function canUseNavigation(api, activeID) {
  const currentID = sessionID(api);
  if (!currentID) return false;
  if (activeID && currentID !== activeID) return false;
  if (api.ui.dialog.open) return false;
  if (!sessionIsIdle(api, currentID)) return false;
  if (hasBlockingSessionPrompt(api, currentID)) return false;
  return true;
}
function dispatchHost(api, name) {
  return api.keymap.dispatchCommand(name);
}
function isUsableTextPart(part) {
  if (!part || part.type !== "text") return false;
  const maybe = part;
  return !maybe.synthetic && !maybe.ignored;
}
function isUserMessageWithText(api, message) {
  return message.role === "user" && api.state.part(message.id).some(isUsableTextPart);
}
function isScrollish(value) {
  const maybe = value;
  return typeof maybe?.scrollBy === "function" && typeof maybe.scrollTo === "function";
}
function findScrollContainer(child) {
  let current = child?.parent;
  while (current) {
    if (isScrollish(current)) return current;
    current = current.parent;
  }
  return void 0;
}
function scrollTop(scroll) {
  return typeof scroll.scrollTop === "number" ? scroll.scrollTop : scroll.y;
}
function findUserMessageRenderables(api, id) {
  return api.state.session.messages(id).filter((message) => isUserMessageWithText(api, message)).map((message) => api.renderer.root.findDescendantById(message.id)).filter((value) => Boolean(value && !value.isDestroyed)).sort((left, right) => left.y - right.y);
}
function fallbackScrollMessage(api, direction) {
  const id = sessionID(api);
  if (!id) return false;
  const renderables = findUserMessageRenderables(api, id);
  if (renderables.length === 0) return false;
  const scroll = findScrollContainer(renderables[0]);
  if (!scroll || scroll.isDestroyed) return false;
  const top = scrollTop(scroll);
  const margin = 10;
  const target = direction === "next" ? renderables.find((child) => child.y > top + margin) : [...renderables].reverse().find((child) => child.y < top - margin);
  if (target) {
    scroll.scrollTo(Math.max(0, target.y - 1));
  } else {
    scroll.scrollBy(direction === "next" ? scroll.height : -scroll.height);
  }
  return true;
}
function fallbackScroll(api, action) {
  if (action === "nextMessage") return fallbackScrollMessage(api, "next");
  if (action === "previousMessage") return fallbackScrollMessage(api, "previous");
  const id = sessionID(api);
  if (!id) return false;
  const firstMessage = findUserMessageRenderables(api, id)[0];
  const scroll = findScrollContainer(firstMessage);
  if (!scroll || scroll.isDestroyed) return false;
  switch (action) {
    case "lineDown":
      scroll.scrollBy(1);
      return true;
    case "lineUp":
      scroll.scrollBy(-1);
      return true;
    case "halfPageDown":
      scroll.scrollBy(scroll.height / 4);
      return true;
    case "halfPageUp":
      scroll.scrollBy(-scroll.height / 4);
      return true;
    case "pageDown":
      scroll.scrollBy(scroll.height / 2);
      return true;
    case "pageUp":
      scroll.scrollBy(-scroll.height / 2);
      return true;
    case "first":
      scroll.scrollTo(0);
      return true;
    case "last":
      scroll.scrollTo(scroll.scrollHeight);
      return true;
  }
}
function bindings(keys, cmd) {
  return keys.map((key) => ({ key, cmd, preventDefault: true }));
}
function keyMatchers(api, keys) {
  return keys.flatMap((key) => {
    try {
      return [api.keymap.createKeyMatcher(key)];
    } catch {
      return [];
    }
  });
}
var plugin = {
  id: PLUGIN_ID,
  tui: async (api, rawOptions) => {
    const options = readOptions(rawOptions);
    const keys = keybindsFromOptions(options);
    const enterMatchers = keyMatchers(api, keys.enter);
    const exitMatchers = keyMatchers(api, keys.exit);
    const [activeSession, setActiveSession] = createSignal();
    const isActive = () => {
      const id = activeSession();
      return Boolean(id && canUseNavigation(api, id));
    };
    const exitNavigation = () => {
      if (!activeSession()) return;
      api.keymap.clearPendingSequence();
      setActiveSession(void 0);
      api.ui.dialog.clear();
      api.renderer.requestRender();
    };
    const enterNavigation = () => {
      const id = sessionID(api);
      if (!id || !canUseNavigation(api)) return;
      api.keymap.clearPendingSequence();
      setActiveSession(id);
      api.ui.dialog.clear();
      api.renderer.requestRender();
    };
    const runNavigation = (action) => {
      if (!isActive()) return;
      const result = dispatchHost(api, hostCommand[action]);
      if (!result.ok && result.reason === "not-found") fallbackScroll(api, action);
      api.ui.dialog.clear();
      api.renderer.requestRender();
    };
    const commands = [
      {
        name: command.enter,
        title: "Enter session navigation mode",
        desc: "Use Vim-like keys to scroll the current idle session without editing the prompt.",
        category: "Session",
        hidden: true,
        enabled: () => !isActive() && canUseNavigation(api),
        run: enterNavigation
      },
      {
        name: command.exit,
        title: "Exit session navigation mode",
        desc: "Return focus to the prompt.",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: exitNavigation
      },
      {
        name: command.lineDown,
        title: "Navigation mode line down",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("lineDown")
      },
      {
        name: command.lineUp,
        title: "Navigation mode line up",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("lineUp")
      },
      {
        name: command.halfPageDown,
        title: "Navigation mode half page down",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("halfPageDown")
      },
      {
        name: command.halfPageUp,
        title: "Navigation mode half page up",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("halfPageUp")
      },
      {
        name: command.pageDown,
        title: "Navigation mode page down",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("pageDown")
      },
      {
        name: command.pageUp,
        title: "Navigation mode page up",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("pageUp")
      },
      {
        name: command.first,
        title: "Navigation mode first message",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("first")
      },
      {
        name: command.last,
        title: "Navigation mode last message",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("last")
      },
      {
        name: command.nextMessage,
        title: "Navigation mode next user message",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("nextMessage")
      },
      {
        name: command.previousMessage,
        title: "Navigation mode previous user message",
        category: "Session",
        hidden: true,
        enabled: isActive,
        run: () => runNavigation("previousMessage")
      }
    ];
    const enterBindings = bindings(keys.enter, command.enter);
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
      ...bindings(keys.previousMessage, command.previousMessage)
    ];
    api.lifecycle.onDispose(
      api.keymap.registerLayer({
        priority: LAYER_PRIORITY,
        commands
      })
    );
    api.lifecycle.onDispose(
      api.keymap.intercept(
        "key",
        (ctx) => {
          if (!enterMatchers.some((match) => match(ctx.event))) return;
          if (isActive() || !canUseNavigation(api)) return;
          ctx.consume();
          enterNavigation();
        },
        { priority: LAYER_PRIORITY }
      )
    );
    api.lifecycle.onDispose(
      api.keymap.intercept(
        "key",
        (ctx) => {
          if (!exitMatchers.some((match) => match(ctx.event))) return;
          if (!isActive()) return;
          ctx.consume();
          exitNavigation();
        },
        { priority: LAYER_PRIORITY }
      )
    );
    api.lifecycle.onDispose(
      api.keymap.registerLayer({
        priority: LAYER_PRIORITY,
        enabled: () => !isActive() && canUseNavigation(api),
        bindings: enterBindings
      })
    );
    api.lifecycle.onDispose(
      api.keymap.registerLayer({
        priority: LAYER_PRIORITY,
        enabled: isActive,
        bindings: navigationBindings
      })
    );
    api.lifecycle.onDispose(
      api.event.on("session.status", (event) => {
        if (event.properties.sessionID === activeSession() && event.properties.status.type !== "idle") exitNavigation();
      })
    );
    api.lifecycle.onDispose(
      api.event.on("permission.asked", (event) => {
        if (event.properties.sessionID === activeSession()) exitNavigation();
      })
    );
    api.lifecycle.onDispose(
      api.event.on("question.asked", (event) => {
        if (event.properties.sessionID === activeSession()) exitNavigation();
      })
    );
    const indicator = options.indicator === false ? void 0 : typeof options.indicator === "string" ? options.indicator : "NAV";
    if (indicator) {
      api.slots.register({
        order: 50,
        slots: {
          session_prompt_right(ctx, props) {
            return /* @__PURE__ */ React.createElement(Show, { when: activeSession() === props.session_id }, /* @__PURE__ */ React.createElement("text", null, /* @__PURE__ */ React.createElement("span", { style: { fg: ctx.theme.current.warning, bold: true } }, indicator)));
          }
        }
      });
    }
  }
};
var tui_default = plugin;
export {
  tui_default as default
};
