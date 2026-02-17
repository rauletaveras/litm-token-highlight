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

// --- Lonelog tag type prefixes ---
// These are the known lonelog element types. Pipe-separated values inside a
// lonelog tag are parsed as sub-tokens; each sub-token is coloured based on
// its own T:/S: prefix if present, otherwise it inherits the tag colour.
var LONELOG_TYPES = new Set(["N", "#N", "L", "E", "PC", "Thread", "Clock", "Track", "Timer"]);

// Original litm tokens (kept for backward-compat)
var TOKENS = [
  { prefix: "T:", emoji: "\u{1F3F7}\uFE0F", color: "orange" },
  { prefix: "S:", emoji: "\u{1F342}", color: "#4caf50" }
];

// A single regex that matches ANY [...] tag so we can decide how to colour it.
// Group 1: everything between [ and ]
var BRACKET_RE = /\[([^\]]+)\]/g;

var STYLE_ID = "litm-token-styles";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    .litm-token-T  { color: orange;   font-weight: 500; }
    .litm-token-S  { color: #4caf50;  font-weight: 500; }
    .lonelog-tag   { font-weight: 500; }
    .lonelog-key   { color: #9b59b6; } /* tag type prefix  e.g. N:  */
    .lonelog-name  { color: #3498db; } /* element name     e.g. Lucas */
    .lonelog-pipe  { color: #888;    } /* pipe separator | */
    .lonelog-T     { color: orange;  } /* T: sub-token     */
    .lonelog-S     { color: #4caf50; } /* S: sub-token     */
    .lonelog-attr  { color: #aaa;    } /* plain attribute  */
  `;
  document.head.appendChild(el);
}

// ---------------------------------------------------------------------------
// Parse a bracket's inner text and decide whether it is a lonelog tag.
// Returns null if it's not a lonelog tag.
// Returns an array of { text, cssClass } segments if it is.
// ---------------------------------------------------------------------------
function parseLonelogTag(inner) {
  // Must start with a known type prefix followed by ':'
  const colonIdx = inner.indexOf(":");
  if (colonIdx === -1) return null;
  const typeKey = inner.slice(0, colonIdx);
  if (!LONELOG_TYPES.has(typeKey)) return null;

  const rest = inner.slice(colonIdx + 1); // everything after "N:"
  const parts = rest.split("|");
  const name = parts[0];
  const attrs = parts.slice(1);

  const segments = [];
  segments.push({ text: "[",             cssClass: "lonelog-tag"  });
  segments.push({ text: typeKey + ":",   cssClass: "lonelog-key"  });
  segments.push({ text: name,            cssClass: "lonelog-name" });

  for (const attr of attrs) {
    segments.push({ text: "|", cssClass: "lonelog-pipe" });
    if (attr.startsWith("T:")) {
      segments.push({ text: attr, cssClass: "lonelog-T" });
    } else if (attr.startsWith("S:")) {
      segments.push({ text: attr, cssClass: "lonelog-S" });
    } else {
      segments.push({ text: attr, cssClass: "lonelog-attr" });
    }
  }

  segments.push({ text: "]", cssClass: "lonelog-tag" });
  return segments;
}

// ---------------------------------------------------------------------------
// CodeMirror editor decorations
// ---------------------------------------------------------------------------

// For the editor view we need character-level Decoration.mark ranges.
// We walk every visible bracket token and add fine-grained marks.
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
      const ranges = [];

      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        BRACKET_RE.lastIndex = 0;
        let m;
        while ((m = BRACKET_RE.exec(text)) !== null) {
          const inner = m[1];
          const tagStart = from + m.index; // absolute position of '['

          // --- Try lonelog first ---
          const segments = parseLonelogTag(inner);
          if (segments) {
            let pos = tagStart;
            for (const seg of segments) {
              const end = pos + seg.text.length;
              ranges.push({ from: pos, to: end, class: seg.cssClass });
              pos = end;
            }
            continue;
          }

          // --- Fallback: legacy T:/S: standalone tokens ---
          // These are tags like [T:master key] outside of a lonelog bracket.
          const legacyMatch = inner.match(/^([TS]):(.*)$/);
          if (legacyMatch) {
            ranges.push({
              from: tagStart,
              to: tagStart + m[0].length,
              class: `litm-token-${legacyMatch[1]}`
            });
          }
        }
      }

      // RangeSetBuilder requires ranges sorted by `from`
      ranges.sort((a, b) => a.from - b.from || a.to - b.to);
      for (const r of ranges) {
        builder.add(r.from, r.to, import_view.Decoration.mark({ class: r.class }));
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations }
);

// ---------------------------------------------------------------------------
// Reading-view post-processor
// ---------------------------------------------------------------------------
function processReadingView(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const replacements = [];
  let node;

  while ((node = walker.nextNode())) {
    const src = node.textContent ?? "";
    BRACKET_RE.lastIndex = 0;
    if (!BRACKET_RE.test(src)) continue;

    BRACKET_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;

    while ((m = BRACKET_RE.exec(src)) !== null) {
      // text before this match
      if (m.index > last) frag.appendChild(document.createTextNode(src.slice(last, m.index)));

      const inner = m[1];

      // --- Lonelog tag ---
      const segments = parseLonelogTag(inner);
      if (segments) {
        for (const seg of segments) {
          const span = document.createElement("span");
          span.className = seg.cssClass;
          span.textContent = seg.text;
          frag.appendChild(span);
        }
        last = m.index + m[0].length;
        continue;
      }

      // --- Legacy litm token ---
      const legacyMatch = inner.match(/^([TS]):(.*)$/);
      if (legacyMatch) {
        const token = TOKENS.find((t) => t.prefix === `${legacyMatch[1]}:`);
        const span = document.createElement("span");
        span.className = `litm-token-${legacyMatch[1]}`;
        span.style.color = token.color;
        span.textContent = `[${token.emoji} ${legacyMatch[2]}]`;
        frag.appendChild(span);
        last = m.index + m[0].length;
        continue;
      }

      // Not a recognised token — leave as-is
      frag.appendChild(document.createTextNode(m[0]));
      last = m.index + m[0].length;
    }

    if (last < src.length) frag.appendChild(document.createTextNode(src.slice(last)));
    replacements.push({ node, frag });
  }

  for (const { node: n, frag } of replacements) n.parentNode?.replaceChild(frag, n);
}

// ---------------------------------------------------------------------------
// Plugin entry point
// ---------------------------------------------------------------------------
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
