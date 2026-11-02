import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildWikiIndex, parseMetadata, parseSidebar } from "../scripts/github-wiki-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "tests", "fixtures", "github-wiki");
const fixedTime = "2026-11-01T12:00:00.000Z";

test("parseSidebar keeps chapter and Spanish article order", () => {
  const markdown = [
    "## Conocer ChurrOS",
    "- [Qué es ChurrOS](Qu%C3%A9-es-ChurrOS)",
    "- [Edición XFCE](Edici%C3%B3n-XFCE)",
    "## Resolver problemas",
    "- [Wi-Fi y DNS](Wi-Fi-y-DNS#diagn%C3%B3stico)",
  ].join("\n");

  assert.deepEqual(parseSidebar(markdown), [
    {
      title: "Conocer ChurrOS",
      slug: "conocer-churros",
      articles: [
        { title: "Qué es ChurrOS", source: "Qué-es-ChurrOS", anchor: "" },
        { title: "Edición XFCE", source: "Edición-XFCE", anchor: "" },
      ],
    },
    {
      title: "Resolver problemas",
      slug: "resolver-problemas",
      articles: [{ title: "Wi-Fi y DNS", source: "Wi-Fi-y-DNS", anchor: "diagnóstico" }],
    },
  ]);
});

test("parseSidebar rejects the same page in two navigation positions", () => {
  assert.throws(
    () => parseSidebar("## Uno\n- [Inicio](Home)\n## Dos\n- [Inicio otra vez](Home)"),
    /página repetida.*Home/i,
  );
});

test("parseMetadata reads the invisible article contract", () => {
  const markdown = '<!-- churros-wiki: {"chapter":"Instalar","level":"Intermedio","minutes":18,"next":["Después de instalar"]} -->\n# Título';
  assert.deepEqual(parseMetadata(markdown), {
    chapter: "Instalar",
    level: "Intermedio",
    minutes: 18,
    next: ["Después de instalar"],
  });
});

test("buildWikiIndex creates a deterministic safe searchable index", async () => {
  const options = {
    sourceDir: fixture,
    repo: "ChurrOS-GNU-Linux/ChurrOS",
    commit: "0123456789abcdef",
    syncedAt: fixedTime,
  };
  const first = await buildWikiIndex(options);
  const second = await buildWikiIndex(options);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.version, "1.4");
  assert.equal(first.sourceRepo, "ChurrOS-GNU-Linux/ChurrOS");
  assert.equal(first.sourceCommit, "0123456789abcdef");
  assert.equal(first.syncedAt, fixedTime);
  assert.equal(first.pageCount, 3);
  assert.deepEqual(first.chapters.map((chapter) => chapter.title), ["Empieza aquí", "Instalar", "Conectividad"]);

  const install = first.articles["instalar-churros"];
  assert.equal(install.title, "Instalar ChurrOS");
  assert.equal(install.chapter, "Instalar");
  assert.equal(install.summary, "Instala ChurrOS 1.4 desde la sesión Live sin perder de vista tus copias de seguridad.");
  assert.deepEqual(install.headings, [
    { depth: 2, id: "antes-de-empezar", text: "Antes de empezar" },
    { depth: 2, id: "instalacion", text: "Instalación" },
  ]);
  assert.match(install.html, /href="wiki\.html\?article=Red\+y\+conectividad"/);
  assert.doesNotMatch(install.html, /<script|javascript:|on[a-z]+=/i);
  assert.match(install.editUrl, /github\.com\/ChurrOS-GNU-Linux\/ChurrOS\/wiki\/Instalar-ChurrOS\/_edit$/);

  const network = first.searchIndex.find((item) => item.title === "Red y conectividad");
  assert.match(network.text, /NetworkManager/);
  assert.match(network.text, /nmcli device wifi list/);
  assert.ok(first.featured.some((item) => item.title === "Instalar ChurrOS"));
});

test("buildWikiIndex rejects a broken internal article link", async () => {
  const sourceDir = await mkdtemp(join(tmpdir(), "churros-wiki-broken-"));
  await writeFile(join(sourceDir, "_Sidebar.md"), "## Inicio\n- [Inicio](Home)\n");
  await writeFile(join(sourceDir, "Home.md"), "# Inicio\n\nLee la [guía ausente](No-existe).\n");

  await assert.rejects(
    buildWikiIndex({ sourceDir, repo: "ChurrOS-GNU-Linux/ChurrOS", commit: "abc", syncedAt: fixedTime }),
    /enlace interno roto.*No-existe/i,
  );
});

test("buildWikiIndex rejects duplicate article titles", async () => {
  const sourceDir = await mkdtemp(join(tmpdir(), "churros-wiki-duplicate-"));
  const sidebar = await readFile(join(fixture, "_Sidebar.md"), "utf8");
  await writeFile(join(sourceDir, "_Sidebar.md"), `${sidebar}\n- [Duplicado](Duplicado)\n`);
  await writeFile(join(sourceDir, "Home.md"), "# Mismo título\n\nPrimera página con contenido suficiente.\n");
  await writeFile(join(sourceDir, "Instalar-ChurrOS.md"), "# Mismo título\n\nSegunda página con contenido suficiente.\n");
  await writeFile(join(sourceDir, "Red-y-conectividad.md"), "# Red\n\nContenido.\n");
  await writeFile(join(sourceDir, "Duplicado.md"), "# Duplicado\n\nContenido.\n");

  await assert.rejects(
    buildWikiIndex({ sourceDir, repo: "ChurrOS-GNU-Linux/ChurrOS", commit: "abc", syncedAt: fixedTime }),
    /título repetido.*Mismo título/i,
  );
});
