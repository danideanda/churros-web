import {
  articleHref,
  attributeIsSafe,
  chapterHref,
  elementIsAllowed,
  normalizeRoute,
  rewriteWikiHref,
  searchWikiIndex,
} from "./wiki-core.js";

const DATA_URL = "wiki-data/wiki.json";
const WIKI_BASE = "https://github.com/ChurrOS-GNU-Linux/ChurrOS/wiki";
const state = { data: null, route: null };

const content = document.getElementById("wiki-content");
const workspace = document.querySelector(".wiki-workspace");
const toolbar = document.getElementById("wiki-toolbar");
const breadcrumb = document.getElementById("wiki-breadcrumb");
const notice = document.getElementById("wiki-notice");
const context = document.getElementById("wiki-context");
const toc = document.getElementById("wiki-article-toc");
const related = document.getElementById("wiki-related");
const editLink = document.getElementById("wiki-edit-link");
const copyLink = document.getElementById("wiki-copy-link");
const chapterList = document.getElementById("wiki-chapter-list");
const chapterNavigation = document.getElementById("wiki-chapter-navigation");
const chapterToggle = document.getElementById("wiki-chapter-toggle");
const sourceStatus = document.getElementById("wiki-source-status");
const searchDialog = document.getElementById("wiki-search-dialog");
const searchInput = document.getElementById("wiki-search-input");
const searchResults = document.getElementById("wiki-search-results");

function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of Array.isArray(children) ? children : [children]) if (child) node.append(child);
  return node;
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
}

function findArticle(reference) {
  if (!state.data) return null;
  const direct = state.data.articles[String(reference || "")];
  if (direct) return direct;
  const key = normalize(reference);
  return Object.values(state.data.articles).find((article) => normalize(article.title) === key || normalize(article.slug) === key) || null;
}

function findChapter(reference) {
  const key = normalize(reference);
  return state.data?.chapters.find((chapter) => normalize(chapter.slug) === key || normalize(chapter.title) === key) || null;
}

async function loadData() {
  const response = await fetch(DATA_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("No se pudo descargar el índice de la wiki.");
  const data = await response.json();
  if (data?.schemaVersion !== 1 || !data.articles?.[data.mainPage] || !Array.isArray(data.chapters)) {
    throw new Error("El índice de la wiki tiene un formato no compatible.");
  }
  state.data = data;
  return data;
}

function loading() {
  workspace.setAttribute("aria-busy", "true");
  toolbar.hidden = true;
  context.hidden = true;
  content.replaceChildren(element("div", { class: "wiki-loading", "aria-label": "Cargando contenido" }, [
    element("span"), element("span"), element("span"), element("span"),
  ]));
}

function finish() {
  workspace.setAttribute("aria-busy", "false");
  markCurrentNavigation();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function setNotice(message, kind = "info") {
  notice.hidden = !message;
  notice.dataset.kind = kind;
  notice.textContent = message || "";
}

function sanitizeFragment(html) {
  const parsed = new DOMParser().parseFromString(`<div>${String(html || "")}</div>`, "text/html");
  parsed.querySelectorAll("*").forEach((node) => {
    if (!elementIsAllowed(node.localName) || node.namespaceURI !== "http://www.w3.org/1999/xhtml") {
      node.remove();
      return;
    }
    for (const attribute of [...node.attributes]) {
      if (!attributeIsSafe(attribute.name, attribute.value)) node.removeAttribute(attribute.name);
    }
    if (node instanceof HTMLAnchorElement && node.hasAttribute("href")) {
      const rewritten = rewriteWikiHref(node.getAttribute("href"), `${location.origin}/wiki/index.php`);
      if (!rewritten) node.removeAttribute("href");
      else {
        node.setAttribute("href", rewritten);
        if (rewritten.startsWith("wiki.html?")) node.dataset.wikiNav = "";
        else if (/^https?:\/\//.test(rewritten) && new URL(rewritten).origin !== location.origin) {
          node.target = "_blank";
          node.rel = "noopener noreferrer";
        }
      }
    }
    if (node instanceof HTMLImageElement) {
      node.loading = "lazy";
      node.decoding = "async";
      if (!node.width && !node.height) node.classList.add("wiki-content-image");
    }
  });
  const fragment = document.createDocumentFragment();
  const root = parsed.body.firstElementChild;
  while (root?.firstChild) fragment.append(root.firstChild);
  return fragment;
}

function routeUrl(route) {
  if (route.view === "home") return "wiki.html";
  if (route.view === "article") return articleHref(route.title);
  if (route.view === "chapter") return chapterHref(route.chapter);
  return `wiki.html?${new URLSearchParams({ view: route.view })}`;
}

function navigate(route, { replace = false } = {}) {
  const url = typeof route === "string" ? route : routeUrl(route);
  history[replace ? "replaceState" : "pushState"]({}, "", url);
  renderRoute();
}

function setToolbar(items, article = null) {
  toolbar.hidden = false;
  breadcrumb.replaceChildren(element("a", { href: "wiki.html", "data-wiki-nav": "", text: "Wiki" }));
  for (const item of items) {
    breadcrumb.append(element("span", { "aria-hidden": "true", text: "/" }));
    breadcrumb.append(item.href
      ? element("a", { href: item.href, "data-wiki-nav": "", text: item.label })
      : element("strong", { text: item.label }));
  }
  editLink.href = article?.editUrl || WIKI_BASE;
  editLink.textContent = article ? "Editar en GitHub" : "Ver GitHub Wiki";
}

function renderChapterNavigation() {
  chapterList.replaceChildren();
  state.data.chapters.forEach((chapter, index) => {
    chapterList.append(element("a", {
      href: chapterHref(chapter.slug), "data-wiki-nav": "", "data-chapter": chapter.slug,
    }, [
      element("span", { class: "wiki-route-number", text: String(index + 1).padStart(2, "0") }),
      element("span", { text: chapter.title }),
      element("small", { text: String(chapter.articles.length) }),
    ]));
  });
}

function chapterCard(chapter, index) {
  const firstArticle = findArticle(chapter.articles[0]?.slug);
  return element("a", { class: "wiki-route-card", href: chapterHref(chapter.slug), "data-wiki-nav": "" }, [
    element("span", { class: "wiki-route-card-number", text: String(index + 1).padStart(2, "0") }),
    element("div", {}, [
      element("h2", { text: chapter.title }),
      element("p", { text: firstArticle?.summary || `${chapter.articles.length} artículos para recorrer este tema.` }),
      element("span", { class: "wiki-route-card-meta", text: `${chapter.articles.length} artículos →` }),
    ]),
  ]);
}

function renderHome() {
  setToolbar([{ label: "Mapa de la wiki" }]);
  const root = element("div", { class: "wiki-home" });
  root.append(element("header", { class: "wiki-page-heading" }, [
    element("span", { class: "wiki-kicker", text: `Manual oficial · ChurrOS ${state.data.version}` }),
    element("h1", { text: "¿Qué quieres hacer hoy?" }),
    element("p", { text: "Sigue una ruta completa o salta directamente al artículo que necesitas." }),
  ]));

  const quick = element("section", { class: "wiki-quick-paths", "aria-label": "Accesos rápidos" });
  for (const slug of ["descargar-churros", "instalar-churros-paso-a-paso", "recorrido-inicial", "diagnostico-rapido"]) {
    const article = findArticle(slug);
    if (article) quick.append(element("a", { href: articleHref(article.title), "data-wiki-nav": "" }, [
      element("strong", { text: article.title }), element("span", { text: article.summary }),
    ]));
  }
  root.append(quick);
  root.append(element("div", { class: "wiki-section-rule" }, [
    element("h2", { text: "Recorre el manual" }),
    element("span", { text: `${state.data.chapters.length} capítulos · ${state.data.pageCount} artículos` }),
  ]));
  const routes = element("div", { class: "wiki-route-map" });
  state.data.chapters.forEach((chapter, index) => routes.append(chapterCard(chapter, index)));
  root.append(routes);
  content.replaceChildren(root);
  context.hidden = true;
}

function renderChapter(chapter) {
  setToolbar([{ label: chapter.title }]);
  const root = element("div", { class: "wiki-chapter-view" }, element("header", { class: "wiki-page-heading" }, [
    element("span", { class: "wiki-kicker", text: `Capítulo · ${chapter.articles.length} artículos` }),
    element("h1", { text: chapter.title }),
    element("p", { text: "Lee en orden para completar el recorrido o abre solo la respuesta que necesitas." }),
  ]));
  const list = element("ol", { class: "wiki-chapter-articles" });
  chapter.articles.forEach((reference, index) => {
    const article = findArticle(reference.slug);
    if (!article) return;
    list.append(element("li", {}, element("a", { href: articleHref(article.title), "data-wiki-nav": "" }, [
      element("span", { class: "wiki-article-order", text: String(index + 1).padStart(2, "0") }),
      element("div", {}, [element("h2", { text: article.title }), element("p", { text: article.summary })]),
      element("small", { text: `${article.level} · ${article.minutes} min` }),
    ])));
  });
  root.append(list);
  content.replaceChildren(root);
  context.hidden = true;
}

function renderArticleContext(article) {
  toc.replaceChildren(element("h2", { text: "En esta página" }));
  const tocList = element("ol");
  for (const heading of article.headings || []) {
    tocList.append(element("li", { class: `depth-${heading.depth}` }, element("a", { href: `#${heading.id}`, text: heading.text })));
  }
  toc.append(tocList);
  related.replaceChildren();
  const titles = (article.related || []).map(findArticle).filter(Boolean).slice(0, 4);
  if (titles.length) {
    related.append(element("h2", { text: "Continúa leyendo" }));
    const list = element("ul");
    for (const item of titles) list.append(element("li", {}, element("a", { href: articleHref(item.title), "data-wiki-nav": "", text: item.title })));
    related.append(list);
  }
  context.hidden = !(article.headings?.length || titles.length);
}

function renderArticle(article) {
  const chapter = findChapter(article.chapter);
  setToolbar([...(chapter ? [{ label: chapter.title, href: chapterHref(chapter.slug) }] : []), { label: article.title }], article);
  const header = element("header", { class: "wiki-article-header" }, [
    element("span", { class: "wiki-kicker", text: `${article.chapter} · ${article.level}` }),
    element("h1", { text: article.title }),
    element("p", { class: "wiki-article-summary", text: article.summary }),
    element("div", { class: "wiki-article-meta" }, [
      element("span", { text: `${article.minutes} min de lectura` }), element("span", { text: `ChurrOS ${state.data.version}` }),
    ]),
  ]);
  const prose = element("div", { class: "wiki-prose" });
  prose.append(sanitizeFragment(article.html));
  prose.querySelector(":scope > h1")?.remove();
  prose.querySelector(":scope > p:has(img[alt*='Logo'])")?.remove();
  for (const paragraph of prose.querySelectorAll(":scope > p")) {
    if (normalize(paragraph.textContent) === normalize(article.summary)) {
      paragraph.remove();
      break;
    }
  }

  const flat = state.data.chapters.flatMap((item) => item.articles.map((reference) => findArticle(reference.slug))).filter(Boolean);
  const position = flat.findIndex((item) => item.slug === article.slug);
  const previous = flat[position - 1];
  const next = flat[position + 1];
  const pagination = element("nav", { class: "wiki-pagination", "aria-label": "Navegación entre artículos" });
  if (previous) pagination.append(element("a", { href: articleHref(previous.title), "data-wiki-nav": "" }, [element("small", { text: "Anterior" }), document.createTextNode(previous.title)]));
  if (next) pagination.append(element("a", { href: articleHref(next.title), "data-wiki-nav": "" }, [element("small", { text: "Siguiente" }), document.createTextNode(next.title)]));
  content.replaceChildren(header, prose, pagination);
  renderArticleContext(article);
}

function renderError(error, route) {
  const missing = route?.view === "article";
  setToolbar([{ label: "No disponible" }]);
  content.replaceChildren(element("div", { class: "wiki-empty" }, [
    element("span", { class: "wiki-kicker", text: "No pudimos completar la ruta" }),
    element("h1", { text: missing ? "Este artículo no existe" : "La wiki no está disponible" }),
    element("p", { text: missing ? "Revisa el título o vuelve al mapa de la wiki." : `${error.message} Comprueba tu conexión e inténtalo de nuevo.` }),
    element("button", { type: "button", class: "wiki-primary-action", text: "Volver al inicio", onclick: () => navigate({ view: "home" }) }),
  ]));
  context.hidden = true;
}

function markCurrentNavigation() {
  const currentChapter = state.route?.view === "chapter" ? state.route.chapter
    : state.route?.view === "article" ? findChapter(findArticle(state.route.title)?.chapter)?.slug : null;
  document.querySelectorAll("[data-view], [data-chapter]").forEach((item) => {
    const active = item.dataset.view === state.route?.view || (item.dataset.chapter && item.dataset.chapter === currentChapter);
    if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
  });
}

function formatSourceStatus() {
  const synced = new Date(state.data.syncedAt);
  const stale = !Number.isNaN(synced.valueOf()) && Date.now() - synced.valueOf() > 1000 * 60 * 60 * 24 * 30;
  sourceStatus.textContent = stale
    ? `ChurrOS ${state.data.version} · sincronización pendiente`
    : `ChurrOS ${state.data.version} · ${state.data.pageCount} páginas`;
  if (stale) sourceStatus.dataset.stale = "true";
}

async function renderRoute() {
  loading();
  setNotice("");
  const route = normalizeRoute(location.search);
  state.route = route;
  try {
    if (!state.data) {
      await loadData();
      renderChapterNavigation();
      formatSourceStatus();
    }
    if (route.view === "home" || ["categories", "recent"].includes(route.view)) renderHome();
    else if (route.view === "chapter") {
      const chapter = findChapter(route.chapter);
      if (!chapter) throw new Error("El capítulo solicitado no existe.");
      renderChapter(chapter);
    } else if (route.view === "article") {
      const article = findArticle(route.title);
      if (!article) throw new Error("El artículo solicitado no existe.");
      renderArticle(article);
    } else renderHome();
    document.title = `${route.title || findChapter(route.chapter)?.title || "Wiki"} — ChurrOS`;
  } catch (error) {
    renderError(error, route);
  } finally {
    finish();
  }
}

function resultNode(result) {
  return element("a", { class: "wiki-search-result", href: articleHref(result.title), "data-wiki-nav": "" }, [
    element("span", { class: "wiki-search-result-chapter", text: result.chapter }),
    element("strong", { text: result.title }),
    element("p", { text: result.snippet }),
  ]);
}

function updateSearch() {
  const query = searchInput.value.trim();
  searchResults.replaceChildren();
  if (query.length < 2) {
    searchResults.append(element("p", { class: "wiki-search-hint", text: "Escribe al menos dos caracteres. Puedes buscar “Niri”, “Wi-Fi” o “GRUB”." }));
    return;
  }
  const results = searchWikiIndex(state.data?.searchIndex, query, 12);
  searchResults.append(element("p", { class: "wiki-search-count", text: `${results.length} ${results.length === 1 ? "resultado" : "resultados"}` }));
  if (!results.length) {
    searchResults.append(element("div", { class: "wiki-empty wiki-search-empty" }, [
      element("h3", { text: "No encontramos esa respuesta" }), element("p", { text: "Prueba con menos palabras o explora los capítulos del manual." }),
    ]));
    return;
  }
  const list = element("div", { class: "wiki-search-result-list" });
  results.forEach((result) => list.append(resultNode(result)));
  searchResults.append(list);
}

function openSearch() {
  if (!state.data || searchDialog.open) return;
  searchDialog.showModal();
  updateSearch();
  requestAnimationFrame(() => searchInput.focus());
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-wiki-nav]");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !url.pathname.endsWith("/wiki.html")) return;
  event.preventDefault();
  if (searchDialog.open) searchDialog.close();
  navigate(`${url.pathname.split("/").pop()}${url.search}${url.hash}`);
});

document.getElementById("wiki-search-launcher").addEventListener("click", openSearch);
document.getElementById("wiki-search-close").addEventListener("click", () => searchDialog.close());
document.getElementById("wiki-search").addEventListener("submit", (event) => event.preventDefault());
searchInput.addEventListener("input", updateSearch);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && searchDialog.open) {
    event.preventDefault();
    searchDialog.close();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  }
});

chapterToggle.addEventListener("click", () => {
  const open = chapterToggle.getAttribute("aria-expanded") !== "true";
  chapterToggle.setAttribute("aria-expanded", String(open));
  chapterNavigation.classList.toggle("is-open", open);
});

copyLink.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    copyLink.textContent = "Enlace copiado";
    setTimeout(() => { copyLink.textContent = "Copiar enlace"; }, 1800);
  } catch {
    setNotice("No pudimos copiar el enlace. Cópialo desde la barra del navegador.", "error");
  }
});

window.addEventListener("popstate", renderRoute);
await renderRoute();
