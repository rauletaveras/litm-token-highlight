import { Plugin, MarkdownView } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

// ── Token definitions ─────────────────────────────────────────────────────────
const TOKENS = [
  { prefix: "T:", emoji: "🏷️", color: "orange"  },
  { prefix: "S:", emoji: "🍂", color: "#4caf50" },
];

const TOKEN_RE = /\[([TS]):(.*?)\]/g;

// ── Shared style injection ────────────────────────────────────────────────────
const STYLE_ID = "litm-token-styles";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    .litm-token-T { color: orange; font-weight: 500; }
    .litm-token-S { color: #4caf50; font-weight: 500; }
  `;
  document.head.appendChild(el);
}

// ── CodeMirror ViewPlugin (Source mode) ──────────────────────────────────────
// Uses Decoration.mark so the text stays fully editable; only colour is added.
const tokenViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) { this.decorations = this.build(view); }

    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
    }

    build(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let m: RegExpExecArray | null;
        TOKEN_RE.lastIndex = 0;
        while ((m = TOKEN_RE.exec(text)) !== null) {
          const start = from + m.index;
          const end   = start + m[0].length;
          builder.add(
            start, end,
            Decoration.mark({ class: `litm-token-${m[1]}` })
          );
        }
      }
      return builder.finish();
    }
  },
  { decorations: v => v.decorations }
);

// ── Reading-view post-processor ───────────────────────────────────────────────
function processReadingView(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const replacements: Array<{ node: Text; frag: DocumentFragment }> = [];

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (!TOKEN_RE.test(node.textContent ?? "")) continue;
    TOKEN_RE.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    const src = node.textContent!;

    while ((m = TOKEN_RE.exec(src)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(src.slice(last, m.index)));
      const { emoji, color } = TOKENS.find(t => t.prefix === `${m![1]}:`)!;
      const span = document.createElement("span");
      span.className = `litm-token-${m[1]}`;
      span.style.color = color;
      span.textContent = `[${emoji} ${m[2]}]`;
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < src.length) frag.appendChild(document.createTextNode(src.slice(last)));
    replacements.push({ node, frag });
  }

  for (const { node, frag } of replacements) node.parentNode?.replaceChild(frag, node);
}

// ── Plugin entry point ────────────────────────────────────────────────────────
export default class LitmTokenPlugin extends Plugin {
  async onload() {
    injectStyles();

    // Source / Live-preview mode
    this.registerEditorExtension([tokenViewPlugin]);

    // Reading view
    this.registerMarkdownPostProcessor((el) => processReadingView(el));
  }

  onunload() {
    document.getElementById(STYLE_ID)?.remove();
  }
}
