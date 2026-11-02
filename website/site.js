// Copy button and WebMCP tools. Every answer is read from the page at call time,
// so the English and Persian pages share this file and stay in their own language.
const LANGS = { en: "/", fa: "/fa/" };
const TOOL_NAMES = ["describe", "get_install_steps", "list_limits", "copy_install_command", "switch_language"];
const REPO = "https://github.com/cocodedk/portguard";
const RELEASES = "https://github.com/cocodedk/portguard/releases";
const STATUS_RESET_MS = 2500;

const text = (sel) => (document.querySelector(sel)?.textContent ?? "").trim();
const lines = (sel) => text(sel).split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const lang = () => (document.documentElement.lang === "fa" ? "fa" : "en");
const out = (obj) => obj;

async function copyInstall() {
  const command = lines("#install-cmds").join("\n");
  try {
    await navigator.clipboard.writeText(command);
    return { copied: true, command };
  } catch {
    return { copied: false, command };
  }
}

function wireButton() {
  const btn = document.querySelector("[data-copy-install]");
  const status = document.querySelector("[data-copy-status]");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const { copied } = await copyInstall();
    status.textContent = copied ? btn.dataset.done : btn.dataset.fail;
    setTimeout(() => { status.textContent = ""; }, STATUS_RESET_MS);
  });
}

const tools = [
  {
    name: "describe",
    description: "Say what is on this page: its language, sections, WebMCP tools and links.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => out({
      site: "portguard",
      summary: text(".lede"),
      language: lang(),
      title: document.title,
      sections: [...document.querySelectorAll("main h2")].map((h) => ({ id: h.closest("section").id, heading: h.textContent.trim() })),
      tools: TOOL_NAMES,
      links: { repository: REPO, releases: RELEASES, other_language: LANGS[lang() === "en" ? "fa" : "en"] },
    }),
  },
  {
    name: "get_install_steps",
    description: "Return the install commands, the command that undoes a block, and how to keep a port open, in the page's language.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => out({
      install: lines("#install-cmds"),
      undo: lines("#undo-cmd"),
      keep_port_open: text("#keep-open"),
      source: RELEASES,
    }),
  },
  {
    name: "list_limits",
    description: "List what portguard does not cover, in the page's language.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => out({ limits: [...document.querySelectorAll("#limits-list li")].map((li) => li.textContent.trim()) }),
  },
  {
    name: "copy_install_command",
    description: "Copy the install commands to the visitor's clipboard and return them; nothing is run.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => out(await copyInstall()),
  },
  {
    name: "switch_language",
    description: "Open this page in English (en) or Persian (fa); returns the language the page will be in.",
    inputSchema: {
      type: "object",
      properties: { language: { type: "string", enum: Object.keys(LANGS) } },
      required: ["language"],
      additionalProperties: false,
    },
    execute: async (input) => {
      const want = input && typeof input === "object" ? input.language : undefined;
      if (!Object.hasOwn(LANGS, want ?? "")) return out({ ok: false, error: "language must be 'en' or 'fa'", allowed: Object.keys(LANGS) });
      const changed = want !== lang();
      if (changed) setTimeout(() => { location.assign(LANGS[want]); }, 0);
      return out({ ok: true, language: want, changed });
    },
  },
];

async function register() {
  const mc = document.modelContext;
  if (!mc || typeof mc.registerTool !== "function") return;
  for (const tool of tools) {
    try { await mc.registerTool(tool); } catch { /* one refusal must not stop the rest */ }
  }
}

wireButton();
register().catch(() => {});
