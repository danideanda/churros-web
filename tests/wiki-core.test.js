import assert from "node:assert/strict";
import test from "node:test";

import {
  articleHref,
  attributeIsSafe,
  chapterHref,
  elementIsAllowed,
  normalizeHistory,
  normalizeRoute,
  normalizeSearchResults,
  rewriteWikiHref,
  searchWikiIndex,
} from "../js/wiki-core.js";

test("normalizeRoute recognizes article, category, recent, history, diff, and edit views", () => {
  assert.deepEqual(normalizeRoute("?article=Instalaci%C3%B3n"), { view: "article", title: "Instalación" });
  assert.deepEqual(normalizeRoute("?view=category&category=Gu%C3%ADas"), { view: "category", category: "Guías" });
  assert.deepEqual(normalizeRoute("?view=recent"), { view: "recent" });
  assert.deepEqual(normalizeRoute("?view=categories"), { view: "categories" });
  assert.deepEqual(normalizeRoute("?view=history&article=Gu%C3%ADa"), { view: "history", title: "Guía" });
  assert.deepEqual(normalizeRoute("?view=diff&article=Gu%C3%ADa&from=10&to=11"), { view: "diff", title: "Guía", from: 10, to: 11 });
  assert.deepEqual(normalizeRoute("?view=edit&article=Nueva"), { view: "edit", title: "Nueva" });
  assert.deepEqual(normalizeRoute("?view=chapter&chapter=primeros-pasos"), { view: "chapter", chapter: "primeros-pasos" });
  assert.deepEqual(normalizeRoute(""), { view: "home" });
});

test("normalizeRoute falls back safely for malformed revisions and overlong titles", () => {
  assert.deepEqual(normalizeRoute("?view=diff&from=bad&to=-1"), { view: "home" });
  assert.deepEqual(normalizeRoute(`?article=${"x".repeat(200)}`), { view: "home" });
  assert.deepEqual(normalizeRoute("?view=chapter&chapter=../privado"), { view: "home" });
});

test("chapterHref builds a stable chapter route", () => {
  assert.equal(chapterHref("primeros-pasos"), "wiki.html?view=chapter&chapter=primeros-pasos");
});

test("articleHref encodes titles without producing executable URLs", () => {
  assert.equal(articleHref("Guía de instalación"), "wiki.html?article=Gu%C3%ADa+de+instalaci%C3%B3n");
  assert.equal(articleHref("javascript:alert(1)"), "wiki.html?article=javascript%3Aalert%281%29");
});

test("rewriteWikiHref maps MediaWiki article URLs to the native reader", () => {
  const base = "https://wiki.internal/w/index.php";
  assert.equal(rewriteWikiHref("/wiki/Primeros_pasos", base), "wiki.html?article=Primeros+pasos");
  assert.equal(rewriteWikiHref("/w/index.php?title=Instalaci%C3%B3n", base), "wiki.html?article=Instalaci%C3%B3n");
  assert.equal(rewriteWikiHref("#Secci%C3%B3n", base), "#Secci%C3%B3n");
  assert.equal(rewriteWikiHref("https://example.org/manual", base), "https://example.org/manual");
  assert.equal(rewriteWikiHref("javascript:alert(1)", base), null);
});

test("attribute policy removes active content and permits safe article markup", () => {
  assert.equal(attributeIsSafe("onclick", "alert(1)"), false);
  assert.equal(attributeIsSafe("style", "background:url(javascript:x)"), false);
  assert.equal(attributeIsSafe("srcdoc", "<script>x</script>"), false);
  assert.equal(attributeIsSafe("href", "javascript:alert(1)"), false);
  assert.equal(attributeIsSafe("href", "/wiki/Guía"), true);
  assert.equal(attributeIsSafe("class", "mw-parser-output"), true);
  assert.equal(attributeIsSafe("data-mw", "private parser data"), false);
});

test("element policy rejects SVG, MathML, and active embedded content", () => {
  for (const tag of ["svg", "math", "set", "animate", "foreignObject", "script", "iframe"]) {
    assert.equal(elementIsAllowed(tag), false, tag);
  }
  for (const tag of ["p", "table", "a", "img", "code"]) {
    assert.equal(elementIsAllowed(tag), true, tag);
  }
});

test("search and history view models tolerate missing optional fields", () => {
  assert.deepEqual(normalizeSearchResults({ results: [{ title: "Guía", snippet: null }, null] }), [
    { title: "Guía", snippet: "", timestamp: null },
  ]);
  assert.deepEqual(normalizeHistory({ title: "Guía", revisions: [{ revid: 4 }, { revisionId: 3, user: null }] }), {
    title: "Guía",
    revisions: [
      { revisionId: 4, parentRevisionId: null, user: "Usuario oculto", timestamp: null, comment: "Sin resumen", size: 0, minor: false },
      { revisionId: 3, parentRevisionId: null, user: "Usuario oculto", timestamp: null, comment: "Sin resumen", size: 0, minor: false },
    ],
  });
});

test("searchWikiIndex is accent-insensitive, ranks titles first, and returns plain snippets", () => {
  const index = [
    {
      title: "Conexión Wi-Fi",
      slug: "conexion-wifi",
      chapter: "Uso diario",
      text: "Conecta el equipo a una red inalámbrica desde el panel.",
    },
    {
      title: "Diagnóstico rápido",
      slug: "diagnostico-rapido",
      chapter: "Solución de problemas",
      text: "Si falla la conexión wifi, revisa NetworkManager. <img src=x onerror=alert(1)>",
    },
  ];

  assert.deepEqual(searchWikiIndex(index, "conexion wifi"), [
    {
      title: "Conexión Wi-Fi",
      slug: "conexion-wifi",
      chapter: "Uso diario",
      snippet: "Conecta el equipo a una red inalámbrica desde el panel.",
    },
    {
      title: "Diagnóstico rápido",
      slug: "diagnostico-rapido",
      chapter: "Solución de problemas",
      snippet: "Si falla la conexión wifi, revisa NetworkManager. img src=x onerror=alert(1)",
    },
  ]);
});
