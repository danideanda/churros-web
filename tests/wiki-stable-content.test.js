import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildWikiIndex, parseMetadata, parseSidebar } from "../scripts/github-wiki-core.mjs";

const sourceDir = process.env.WIKI_SOURCE_DIR ? resolve(process.env.WIKI_SOURCE_DIR) : null;
const wikiTest = sourceDir ? test : test.skip;
const expectedChapters = [
  "Conocer ChurrOS",
  "Descargar y probar",
  "Instalar",
  "Primeros pasos",
  "Escritorios",
  "Administración",
  "Resolver problemas",
  "Comunidad y referencia",
];

async function sourceCommit() {
  return execFileSync("git", ["-C", sourceDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

async function loadIndex() {
  assert.ok(sourceDir, "WIKI_SOURCE_DIR debe apuntar al clon de la GitHub Wiki oficial");
  return buildWikiIndex({
    sourceDir,
    repo: "ChurrOS-GNU-Linux/ChurrOS",
    commit: await sourceCommit(),
    syncedAt: "2026-11-01T12:00:00.000Z",
  });
}

wikiTest("the stable wiki publishes eight chapters, Home, and 56 guide articles", async () => {
  const sidebar = await readFile(join(sourceDir, "_Sidebar.md"), "utf8");
  const chapters = parseSidebar(sidebar);

  assert.deepEqual(chapters.map((chapter) => chapter.title), expectedChapters);
  assert.equal(chapters.flatMap((chapter) => chapter.articles).length, 57);
  assert.equal(new Set(chapters.flatMap((chapter) => chapter.articles).map((article) => article.source)).size, 57);
  assert.doesNotMatch(sidebar, /\b(?:beta|pre[- ]?beta|i686|raspberry|aarch64|server)\b/i);
});

wikiTest("every stable article has metadata, useful depth, and safe scope", async () => {
  const index = await loadIndex();
  assert.equal(index.pageCount, 57);

  for (const article of Object.values(index.articles)) {
    const markdown = await readFile(join(sourceDir, `${article.source.replaceAll(" ", "-")}.md`), "utf8");
    const metadata = parseMetadata(markdown);
    const body = index.searchIndex.find((item) => item.slug === article.slug)?.text || "";

    assert.ok(metadata.chapter, `${article.title}: falta chapter`);
    assert.ok(metadata.level, `${article.title}: falta level`);
    assert.ok(metadata.minutes >= 3, `${article.title}: minutes debe ser útil`);
    assert.ok(body.length >= 420, `${article.title}: el artículo es demasiado corto (${body.length})`);
    assert.ok(article.headings.length >= 2, `${article.title}: necesita al menos dos secciones`);
    assert.doesNotMatch(article.title, /\b(?:beta|pre[- ]?beta|i686|raspberry|aarch64|server)\b/i);
  }
});

wikiTest("Home describes the stable 1.4 experience and both published desktops", async () => {
  const index = await loadIndex();
  const home = index.articles[index.mainPage];

  assert.equal(index.version, "1.4");
  assert.match(home.html, /ChurrOS 1\.4/);
  assert.match(home.html, /Niri/);
  assert.match(home.html, /XFCE/);
  assert.doesNotMatch(home.html, /\b(?:beta|pre[- ]?beta|experimental)\b/i);
});

wikiTest("high-risk guides include checks, backup, expected result, and recovery", async () => {
  const index = await loadIndex();
  const risky = [
    "crear-un-usb-desde-linux",
    "particionado-manual-y-arranque-dual",
    "cifrado-y-btrfs",
    "rollback-con-btrfs",
    "recuperacion-desde-la-iso-live",
  ];

  for (const slug of risky) {
    const text = index.searchIndex.find((item) => item.slug === slug)?.text || "";
    assert.match(text, /comprueba|verifica|revisa/i, `${slug}: falta una comprobación previa`);
    assert.match(text, /copia de seguridad|respaldo/i, `${slug}: falta copia de seguridad`);
    assert.match(text, /resultado esperado|debe (?:aparecer|ocurrir|mostrar)/i, `${slug}: falta resultado esperado`);
    assert.match(text, /si algo sale mal|recupera|restaura|vuelve/i, `${slug}: falta recuperación`);
  }
});
