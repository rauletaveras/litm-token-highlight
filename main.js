var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LitmTokenPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_view = require("@codemirror/view");
var import_state = require("@codemirror/state");
var TOKENS = [
  { prefix: "T:", emoji: "\u{1F3F7}\uFE0F", color: "orange" },
  { prefix: "S:", emoji: "\u{1F342}", color: "#4caf50" }
];
var TOKEN_RE = /\[([TS]):(.*?)\]/g;
var STYLE_ID = "litm-token-styles";
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
var tokenViewPlugin = import_view.ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.build(view);
    }
    update(u) {
      if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
    }
    build(view) {
      const builder = new import_state.RangeSetBuilder();
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let m;
        TOKEN_RE.lastIndex = 0;
        while ((m = TOKEN_RE.exec(text)) !== null) {
          const start = from + m.index;
          const end = start + m[0].length;
          builder.add(
            start,
            end,
            import_view.Decoration.mark({ class: `litm-token-${m[1]}` })
          );
        }
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations }
);
function processReadingView(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const replacements = [];
  let node;
  while (node = walker.nextNode()) {
    if (!TOKEN_RE.test(node.textContent ?? "")) continue;
    TOKEN_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    const src = node.textContent;
    while ((m = TOKEN_RE.exec(src)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(src.slice(last, m.index)));
      const { emoji, color } = TOKENS.find((t) => t.prefix === `${m[1]}:`);
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
  for (const { node: node2, frag } of replacements) node2.parentNode?.replaceChild(frag, node2);
}
var LitmTokenPlugin = class extends import_obsidian.Plugin {
  async onload() {
    injectStyles();
    this.registerEditorExtension([tokenViewPlugin]);
    this.registerMarkdownPostProcessor((el) => processReadingView(el));
  }
  onunload() {
    document.getElementById(STYLE_ID)?.remove();
  }
};
