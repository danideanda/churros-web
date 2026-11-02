import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../wiki.html", import.meta.url), "utf8");
const css = await readFile(new URL("../css/wiki.css", import.meta.url), "utf8");

test("the wiki exposes semantic reading landmarks and a no-script fallback", () => {
  assert.match(html, /<main[^>]+id="wiki-main"/);
  assert.match(html, /<nav[^>]+aria-label="Capítulos de la wiki"/);
  assert.match(html, /<article[^>]+id="wiki-content"/);
  assert.match(html, /<noscript>[\s\S]*GitHub Wiki[\s\S]*<\/noscript>/);
});

test("search and chapter controls have explicit accessible labels", () => {
  assert.match(html, /id="wiki-search-dialog"[^>]+aria-labelledby="wiki-search-dialog-title"/);
  assert.match(html, /id="wiki-chapter-toggle"[^>]+aria-controls="wiki-chapter-navigation"/);
  assert.match(html, /aria-label="Cerrar búsqueda"/);
  assert.match(html, /<kbd[^>]*>Ctrl K<\/kbd>/);
});

test("article actions include copy, edit, and contextual navigation targets", () => {
  assert.match(html, /id="wiki-copy-link"/);
  assert.match(html, /id="wiki-edit-link"/);
  assert.match(html, /id="wiki-article-toc"/);
  assert.match(html, /id="wiki-source-status"/);
});

test("brand imagery reserves dimensions to avoid layout shift", () => {
  const logos = [...html.matchAll(/<img[^>]+src="img\/logo\.churros\.png"[^>]*>/g)];
  assert.ok(logos.length >= 1);
  for (const [tag] of logos) {
    assert.match(tag, /width="\d+"/);
    assert.match(tag, /height="\d+"/);
  }
  assert.match(html, /<img[^>]+src="img\/hero\.churros\.jpg"[^>]+width="1280"[^>]+height="720"[^>]+loading="lazy"/);
  assert.match(html, /alt="Escritorio Niri de ChurrOS 1\.4 con una terminal abierta"/);
});

test("the premium theme exposes the approved three-layer visual tokens", () => {
  for (const token of [
    "--wiki-color-paper: #fffdf9",
    "--wiki-color-flour: #f7f1e8",
    "--wiki-color-orange: #f97316",
    "--wiki-color-toast: #c2410c",
    "--wiki-color-ink: #1f2937",
    "--wiki-surface-page: var(--wiki-color-paper)",
    "--wiki-action-primary: var(--wiki-color-orange)",
  ]) assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(css, /font-family:\s*Inter,\s*ui-sans-serif/);
});

test("reading, focus, touch, responsive, and reduced-motion contracts are explicit", () => {
  assert.match(css, /\.wiki-prose\s*\{[^}]*max-width:\s*(?:74|75|76)ch/s);
  assert.match(css, /:focus-visible[^}]*outline:/s);
  assert.match(css, /min-height:\s*2\.75rem/);
  assert.match(css, /@media\s*\(max-width:\s*48rem\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*transition-duration:\s*0\.01ms/);
});
