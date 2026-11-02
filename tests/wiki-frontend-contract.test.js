import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../wiki.html", import.meta.url), "utf8");

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
});
