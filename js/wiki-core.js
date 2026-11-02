const MAX_TITLE_LENGTH = 160;
const BLOCKED_ELEMENTS = new Set([
  "animate", "applet", "audio", "base", "button", "embed", "foreignobject", "form", "iframe", "input",
  "link", "math", "meta", "object", "script", "select", "set", "style", "svg", "textarea", "video",
]);

export function elementIsAllowed(tagName) {
  return !BLOCKED_ELEMENTS.has(String(tagName || "").toLowerCase());
}

function cleanTitle(value) {
  const title = String(value || "").trim().replace(/\s+/g, " ");
  return title && title.length <= MAX_TITLE_LENGTH ? title : null;
}

export function articleHref(title) {
  const params = new URLSearchParams({ article: String(title || "") });
  return `wiki.html?${params}`;
}

export function chapterHref(chapter) {
  const params = new URLSearchParams({ view: "chapter", chapter: String(chapter || "") });
  return `wiki.html?${params}`;
}

export function normalizeRoute(search = "") {
  const params = new URLSearchParams(search);
  const view = params.get("view") || (params.has("article") ? "article" : "home");
  const title = cleanTitle(params.get("article"));

  if (view === "home") return { view: "home" };
  if (view === "recent" || view === "categories") return { view };
  if (view === "chapter") {
    const chapter = String(params.get("chapter") || "").trim();
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapter) ? { view, chapter } : { view: "home" };
  }
  if (view === "category") {
    const category = cleanTitle(params.get("category"));
    return category ? { view, category } : { view: "home" };
  }
  if (["article", "history", "edit"].includes(view)) {
    return title ? { view, title } : { view: "home" };
  }
  if (view === "diff") {
    const from = Number(params.get("from"));
    const to = Number(params.get("to"));
    return title && Number.isInteger(from) && from > 0 && Number.isInteger(to) && to > 0
      ? { view, title, from, to }
      : { view: "home" };
  }
  return { view: "home" };
}

function safeProtocol(value, { image = false } = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) return true;
  if (image && /^data:image\/(?:png|gif|jpeg|webp);base64,/i.test(trimmed)) return true;
  try {
    const url = new URL(trimmed, "https://wiki.invalid/");
    return url.protocol === "http:" || url.protocol === "https:" || (!image && url.protocol === "mailto:");
  } catch {
    return false;
  }
}

export function attributeIsSafe(name, value) {
  const attribute = String(name || "").toLowerCase();
  if (attribute.startsWith("on") || ["style", "srcdoc", "formaction", "attributename", "to", "values", "begin", "end"].includes(attribute)) return false;
  if (attribute === "data-mw" || attribute === "data-parsoid") return false;
  if (attribute === "href" || attribute === "xlink:href") return safeProtocol(value);
  if (attribute === "src" || attribute === "poster") return safeProtocol(value, { image: true });
  return true;
}

export function rewriteWikiHref(href, mediaWikiBase = "https://wiki.invalid/w/index.php") {
  const value = String(href || "").trim();
  if (!safeProtocol(value)) return null;
  if (value.startsWith("#")) return value;
  let url;
  try {
    url = new URL(value, mediaWikiBase);
  } catch {
    return null;
  }
  const base = new URL(mediaWikiBase);
  if (url.origin !== base.origin) return url.toString();
  if (url.pathname.startsWith("/wiki/")) {
    const title = decodeURIComponent(url.pathname.slice(6)).replace(/_/g, " ");
    return articleHref(title) + url.hash;
  }
  const title = url.searchParams.get("title");
  if (title && /\/index\.php$/.test(url.pathname)) return articleHref(title) + url.hash;
  return url.pathname + url.search + url.hash;
}

export function normalizeSearchResults(payload) {
  return (Array.isArray(payload?.results) ? payload.results : [])
    .filter((item) => item && cleanTitle(item.title))
    .map((item) => ({
      title: cleanTitle(item.title),
      snippet: String(item.snippet || ""),
      timestamp: item.timestamp || null,
    }));
}

function foldSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function plainSnippet(value, maxLength = 180) {
  const plain = String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength - 1).trimEnd()}…` : plain;
}

export function searchWikiIndex(index, query, limit = 12) {
  const terms = foldSearchText(query).split(" ").filter(Boolean);
  if (!terms.length || !Array.isArray(index)) return [];

  return index
    .map((entry, order) => {
      const title = cleanTitle(entry?.title);
      const slug = String(entry?.slug || "").trim();
      if (!title || !slug) return null;
      const titleText = foldSearchText(title);
      const chapterText = foldSearchText(entry.chapter);
      const bodyText = foldSearchText(entry.text);
      const searchable = `${titleText} ${chapterText} ${bodyText}`;
      const compactTitle = titleText.replaceAll(" ", "");
      const compactSearchable = searchable.replaceAll(" ", "");
      if (!terms.every((term) => searchable.includes(term) || compactSearchable.includes(term))) return null;
      const score = terms.reduce((total, term) => (
        total + (titleText.includes(term) || compactTitle.includes(term) ? 12 : 0) + (chapterText.includes(term) ? 3 : 0) + (bodyText.includes(term) ? 1 : 0)
      ), titleText === terms.join(" ") ? 30 : 0);
      return {
        score,
        order,
        result: {
          title,
          slug,
          chapter: cleanTitle(entry.chapter) || "Wiki ChurrOS",
          snippet: plainSnippet(entry.text),
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, Math.max(0, Number(limit) || 0))
    .map(({ result }) => result);
}

export function normalizeHistory(payload) {
  return {
    title: cleanTitle(payload?.title) || "Artículo",
    revisions: (Array.isArray(payload?.revisions) ? payload.revisions : [])
      .map((revision) => ({
        revisionId: Number(revision.revisionId ?? revision.revid) || null,
        parentRevisionId: Number(revision.parentRevisionId ?? revision.parentid) || null,
        user: revision.user ? String(revision.user) : "Usuario oculto",
        timestamp: revision.timestamp || null,
        comment: revision.comment ? String(revision.comment) : "Sin resumen",
        size: Number(revision.size) || 0,
        minor: Boolean(revision.minor),
      }))
      .filter((revision) => revision.revisionId),
  };
}
