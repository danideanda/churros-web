import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const META_PATTERN = /<!--\s*churros-wiki:\s*(\{[\s\S]*?\})\s*-->/i;
const INTERNAL_LINK_PATTERN = /(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decoded(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`Enlace con codificación inválida: ${value}`);
  }
}

function splitDestination(destination) {
  const [path, ...fragmentParts] = String(destination).split("#");
  return { path, anchor: decoded(fragmentParts.join("#")) };
}

function sourceName(destination) {
  const { path } = splitDestination(destination);
  return decoded(path)
    .replace(/^\.\//, "")
    .replace(/\.md$/i, "")
    .replaceAll("_", " ");
}

function sourceKey(value) {
  return sourceName(value).normalize("NFC").toLocaleLowerCase("es");
}

function isExternal(destination) {
  if (String(destination).startsWith("//")) return true;
  if (/^[a-z][a-z\d+.-]*:/i.test(String(destination))) return true;
  try {
    return SAFE_EXTERNAL_PROTOCOLS.has(new URL(destination).protocol);
  } catch {
    return false;
  }
}

export function parseSidebar(markdown) {
  const chapters = [];
  const seen = new Set();
  let chapter = null;

  for (const rawLine of String(markdown || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      chapter = { title: heading[1].trim(), slug: slugify(heading[1]), articles: [] };
      chapters.push(chapter);
      continue;
    }

    const link = /^[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*$/.exec(line);
    if (!link) continue;
    if (!chapter) throw new Error(`Artículo fuera de un capítulo: ${link[1]}`);

    const { path, anchor } = splitDestination(link[2].trim());
    const source = sourceName(path);
    const key = sourceKey(source);
    if (seen.has(key)) throw new Error(`Página repetida en _Sidebar.md: ${source}`);
    seen.add(key);
    chapter.articles.push({ title: link[1].trim(), source, anchor });
  }

  if (!chapters.length) throw new Error("_Sidebar.md no define capítulos");
  if (chapters.some((item) => !item.title || !item.articles.length)) throw new Error("Cada capítulo debe contener al menos un artículo");
  return chapters;
}

export function parseMetadata(markdown) {
  const match = META_PATTERN.exec(String(markdown || ""));
  if (!match) return { chapter: "", level: "", minutes: null, next: [] };

  let value;
  try {
    value = JSON.parse(match[1]);
  } catch {
    throw new Error("Metadatos churros-wiki inválidos");
  }

  const minutes = Number(value.minutes);
  return {
    chapter: String(value.chapter || "").trim(),
    level: String(value.level || "").trim(),
    minutes: Number.isInteger(minutes) && minutes > 0 ? minutes : null,
    next: Array.isArray(value.next) ? value.next.map((item) => String(item).trim()).filter(Boolean) : [],
  };
}

function plainText(html) {
  return sanitizeHtml(String(html || ""), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

function articleHref(title) {
  return `wiki.html?${new URLSearchParams({ article: title })}`;
}

function headingIds(html) {
  const counts = new Map();
  const headings = [];
  const rendered = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/gi, (match, depthValue, body) => {
    const depth = Number(depthValue);
    const text = plainText(body);
    const base = slugify(text) || "seccion";
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    if (depth > 1) headings.push({ depth, id, text });
    return `<h${depth} id="${id}">${body}</h${depth}>`;
  });
  return { html: rendered, headings };
}

function safeHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      "a", "blockquote", "br", "code", "del", "details", "div", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6",
      "hr", "img", "kbd", "li", "mark", "ol", "p", "pre", "s", "small", "span", "strong", "sub", "summary", "sup", "table", "tbody",
      "td", "th", "thead", "tr", "ul",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      code: ["class"],
      h1: ["id"], h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      td: ["align"], th: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        if (/^https?:\/\//i.test(attribs.href || "")) return { tagName, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } };
        return { tagName, attribs };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: attribs.loading || "lazy" } }),
    },
  });
}

function rewriteLinks(markdown, sourceToTitle, currentTitle) {
  const related = new Set();
  const rewritten = String(markdown).replace(INTERNAL_LINK_PATTERN, (full, label, destination) => {
    if (destination.startsWith("#") || isExternal(destination)) return full;
    const { anchor } = splitDestination(destination);
    const targetTitle = sourceToTitle.get(sourceKey(destination));
    if (!targetTitle) throw new Error(`Enlace interno roto en ${currentTitle}: ${sourceName(destination)}`);
    if (targetTitle !== currentTitle) related.add(targetTitle);
    return `[${label}](${articleHref(targetTitle)}${anchor ? `#${encodeURIComponent(anchor)}` : ""})`;
  });
  return { markdown: rewritten, related: [...related] };
}

function titleFromMarkdown(markdown, source) {
  const match = /^#\s+(.+?)\s*$/m.exec(String(markdown));
  if (!match) throw new Error(`${source}.md no tiene un título H1`);
  return match[1].replace(/[*_`]/g, "").trim();
}

function firstParagraph(html) {
  for (const match of String(html).matchAll(/<p>([\s\S]*?)<\/p>/gi)) {
    const text = plainText(match[1]);
    if (text) return text;
  }
  return "";
}

export async function buildWikiIndex({ sourceDir, repo, commit, syncedAt }) {
  if (!sourceDir) throw new Error("Falta sourceDir");
  if (!repo) throw new Error("Falta repo");
  if (!commit) throw new Error("Falta commit");
  if (!syncedAt || Number.isNaN(Date.parse(syncedAt))) throw new Error("syncedAt debe ser una fecha ISO válida");

  const sidebarMarkdown = await readFile(join(sourceDir, "_Sidebar.md"), "utf8");
  const chapters = parseSidebar(sidebarMarkdown);
  const navEntries = chapters.flatMap((chapter) => chapter.articles.map((article) => ({ ...article, chapter: chapter.title })));
  const available = new Map((await readdir(sourceDir))
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => [sourceKey(file.slice(0, -3)), file]));
  const sourceToTitle = new Map();
  const markdownBySource = new Map();
  const titles = new Set();

  for (const entry of navEntries) {
    const file = available.get(sourceKey(entry.source));
    if (!file) throw new Error(`_Sidebar.md enlaza una página ausente: ${entry.source}`);
    const markdown = await readFile(join(sourceDir, file), "utf8");
    const title = titleFromMarkdown(markdown, entry.source);
    const titleKey = title.toLocaleLowerCase("es");
    if (titles.has(titleKey)) throw new Error(`Título repetido: ${title}`);
    titles.add(titleKey);
    sourceToTitle.set(sourceKey(entry.source), title);
    markdownBySource.set(sourceKey(entry.source), { markdown, file, title });
  }

  const articles = {};
  const searchIndex = [];
  for (const entry of navEntries) {
    const item = markdownBySource.get(sourceKey(entry.source));
    const metadata = parseMetadata(item.markdown);
    if (metadata.chapter && metadata.chapter !== entry.chapter) {
      throw new Error(`${item.title}: el capítulo de metadatos no coincide con _Sidebar.md`);
    }
    const linked = rewriteLinks(item.markdown.replace(META_PATTERN, ""), sourceToTitle, item.title);
    const rendered = headingIds(marked.parse(linked.markdown, { gfm: true }));
    const html = safeHtml(rendered.html);
    const text = plainText(html);
    const slug = slugify(item.title);
    const related = [...new Set([...linked.related, ...metadata.next])].filter((title) => title !== item.title);
    const editSource = entry.source.replaceAll(" ", "-");

    articles[slug] = {
      title: item.title,
      slug,
      source: entry.source,
      chapter: entry.chapter,
      level: metadata.level,
      minutes: metadata.minutes,
      summary: firstParagraph(html),
      html,
      headings: rendered.headings,
      related,
      editUrl: `https://github.com/${repo}/wiki/${encodeURIComponent(editSource)}/_edit`,
    };
    searchIndex.push({ title: item.title, slug, chapter: entry.chapter, text });
  }

  const home = Object.values(articles).find((article) => sourceKey(article.source) === sourceKey("Home"));
  if (!home) throw new Error("_Sidebar.md debe incluir Home");
  const version = /\bChurrOS\s+([1-9]\d*(?:\.\d+)+)\b/i.exec(searchIndex.find((item) => item.slug === home.slug)?.text || "")?.[1] || null;

  const normalizedChapters = chapters.map((chapter) => ({
    title: chapter.title,
    slug: chapter.slug,
    articles: chapter.articles.map((entry) => {
      const title = sourceToTitle.get(sourceKey(entry.source));
      return { title, slug: slugify(title) };
    }),
  }));

  return {
    schemaVersion: 1,
    sourceRepo: repo,
    sourceCommit: String(commit),
    syncedAt: new Date(syncedAt).toISOString(),
    version,
    mainPage: home.slug,
    pageCount: Object.keys(articles).length,
    chapters: normalizedChapters,
    articles,
    featured: normalizedChapters.map((chapter) => chapter.articles[0]).filter((item) => item && item.slug !== home.slug),
    recent: Object.values(articles).slice(0, 8).map(({ title, slug, chapter, summary }) => ({ title, slug, chapter, summary })),
    searchIndex,
  };
}
