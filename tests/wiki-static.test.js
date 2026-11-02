import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = process.env.WIKI_DATA_PATH || join(root, "wiki-data", "wiki.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

test("the production export identifies the official stable wiki revision", () => {
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.sourceRepo, "ChurrOS-GNU-Linux/ChurrOS");
  assert.match(data.sourceCommit, /^[0-9a-f]{40}$/);
  assert.ok(!Number.isNaN(Date.parse(data.syncedAt)));
  assert.equal(data.version, "1.4");
  assert.equal(data.pageCount, 57);
  assert.equal(data.chapters.length, 8);
  assert.equal(Object.keys(data.articles).length, 57);
  assert.equal(data.mainPage, "wiki-oficial-de-churros");
});

test("chapter navigation contains every article exactly once", () => {
  const navigation = data.chapters.flatMap((chapter) => chapter.articles);
  assert.equal(navigation.length, 57);
  assert.equal(new Set(navigation.map((article) => article.slug)).size, 57);
  for (const item of navigation) {
    assert.equal(data.articles[item.slug]?.title, item.title, `${item.slug} no coincide con su artículo`);
  }
});

test("every exported article has safe links, headings, edit URL, and valid relations", () => {
  const titles = new Set(Object.values(data.articles).map((article) => article.title));
  for (const article of Object.values(data.articles)) {
    assert.ok(article.summary.length >= 40, `${article.title}: resumen insuficiente`);
    assert.ok(article.headings.length >= 2, `${article.title}: faltan encabezados`);
    assert.match(article.editUrl, /^https:\/\/github\.com\/ChurrOS-GNU-Linux\/ChurrOS\/wiki\/[^/]+\/_edit$/);
    assert.doesNotMatch(article.html, /<script|javascript:|\son[a-z]+=/i);

    for (const match of article.html.matchAll(/href="wiki\.html\?article=([^"#]+)(?:#[^"]*)?"/g)) {
      const title = new URLSearchParams(`article=${match[1]}`).get("article");
      assert.ok(titles.has(title), `${article.title} enlaza a un título ausente: ${title}`);
    }
    for (const related of article.related) assert.ok(titles.has(related), `${article.title} se relaciona con ${related}, que no existe`);
  }
});

test("search covers titles, headings, prose, and commands", () => {
  assert.equal(data.searchIndex.length, 57);
  assert.ok(data.searchIndex.some((item) => item.title === "Guía de Niri" && /Wayland/.test(item.text)));
  assert.ok(data.searchIndex.some((item) => item.title === "Wi-Fi, Ethernet y DNS" && /resolvectl/.test(item.text)));
  assert.ok(data.searchIndex.some((item) => item.title === "Rollback con Btrfs" && /churros-snapshot/.test(item.text)));
  assert.ok(data.searchIndex.every((item) => item.text.length >= 420));
});

test("featured and recent items resolve to exported articles", () => {
  assert.ok(data.featured.length >= 7);
  assert.ok(data.recent.length >= 6);
  for (const item of [...data.featured, ...data.recent]) {
    assert.equal(data.articles[item.slug]?.title, item.title, `${item.title} no resuelve`);
  }
});
