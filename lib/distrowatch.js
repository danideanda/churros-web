const SOURCE_URL = "https://distrowatch.com/table.php?distribution=churros";
const READER_URL = `https://r.jina.ai/${SOURCE_URL}`;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 churros-web/1.0";

function toNumber(value) {
  const parsed = Number.parseInt(String(value).replace(/,/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function periodLabel(amount, unit) {
  const isMonth = unit.toLowerCase().startsWith("month");
  if (amount === 1) return `1 ${isMonth ? "mes" : "semana"}`;
  return `${amount} ${isMonth ? "meses" : "semanas"}`;
}

function parsePeriods(text, pattern) {
  const periods = [];
  let match = pattern.exec(text);

  while (match) {
    const amount = Number.parseInt(match[1], 10);
    const rank = toNumber(match[3]);
    const hitsPerDay = toNumber(match[4]);

    if (rank !== null && hitsPerDay !== null) {
      periods.push({ label: periodLabel(amount, match[2]), rank, hitsPerDay });
    }

    match = pattern.exec(text);
  }

  return periods;
}

function parseDistroWatch(html) {
  if (typeof html !== "string" || !html.trim()) return null;

  const popularityMatch = html.match(
    /Popularity:<\/b>\s*<a[^>]*>\s*([\d,]+)\s*\(\s*([\d,]+)\s+hits?\s+per\s+day\s*\)\s*<\/a>/i,
  );
  if (!popularityMatch) return null;

  const popularityRank = toNumber(popularityMatch[1]);
  const pageHitsPerDay = toNumber(popularityMatch[2]);
  if (popularityRank === null || pageHitsPerDay === null) return null;

  const updateMatch = html.match(
    /Last Update:\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2})(?::\d{2})?)?\s*UTC/i,
  );
  const listingUpdatedAt = updateMatch ? updateMatch[1] : null;
  const listingUpdatedAtFull = updateMatch
    ? `${updateMatch[1]}T${updateMatch[2] || "00:00"}:00Z`
    : null;

  const ratingMatch = html.match(
    /Average visitor rating<\/a><\/b>:\s*<b>\s*([\d.]+)\s*<\/b>\s*\/\s*10\s+from\s+<b>\s*([\d,]+)\s*<\/b>/i,
  );

  return {
    popularityRank,
    pageHitsPerDay,
    listingUpdatedAt,
    listingUpdatedAtFull,
    periods: parsePeriods(
      html,
      /(\d+)\s*(months?|weeks?):\s*<b>\s*([\d,]+)\s*<\/b>\s*\(\s*([\d,]+)\s*\)/gi,
    ),
    rating: ratingMatch
      ? { score: Number.parseFloat(ratingMatch[1]), reviews: toNumber(ratingMatch[2]) }
      : null,
  };
}

function parseDistroWatchMarkdown(markdown) {
  if (typeof markdown !== "string" || !markdown.trim()) return null;

  const popularityMatch = markdown.match(
    /\*{0,2}Popularity\*{0,2}:\s*\*{0,2}\s*\[?\s*([\d,]+)\s*\(\s*([\d,]+)\s+hits?\s+per\s+day\s*\)/i,
  );
  if (!popularityMatch) return null;

  const popularityRank = toNumber(popularityMatch[1]);
  const pageHitsPerDay = toNumber(popularityMatch[2]);
  if (popularityRank === null || pageHitsPerDay === null) return null;

  const updateMatch = markdown.match(
    /Last Update\*{0,2}:\*{0,2}\s*(\d{4}-\d{2}-\d{2})(?:[\sT]+(\d{2}:\d{2})(?::\d{2})?)?/i,
  );
  const listingUpdatedAt = updateMatch ? updateMatch[1] : null;
  const listingUpdatedAtFull = updateMatch
    ? `${updateMatch[1]}T${updateMatch[2] || "00:00"}:00Z`
    : null;

  const ratingMatch = markdown.match(
    /\*\*\s*([\d.]+)\s*\*\*\s*\/\s*10\s+from\s+\*\*\s*([\d,]+)\s*\*\*/i,
  );

  return {
    popularityRank,
    pageHitsPerDay,
    listingUpdatedAt,
    listingUpdatedAtFull,
    periods: parsePeriods(
      markdown,
      /(\d+)\s*(months?|weeks?):\s*\*\*\s*([\d,]+)\s*\*\*\s*\(\s*([\d,]+)\s*\)/gi,
    ),
    rating: ratingMatch
      ? { score: Number.parseFloat(ratingMatch[1]), reviews: toNumber(ratingMatch[2]) }
      : null,
  };
}

async function requestText(fetchImpl, url, accept, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDistroWatch({ fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch no está disponible en este entorno");
  }

  let primaryError;

  try {
    const html = await requestText(
      fetchImpl,
      SOURCE_URL,
      "text/html,application/xhtml+xml",
      timeoutMs,
    );
    const parsed = parseDistroWatch(html);
    if (!parsed) throw new Error("No se encontraron estadísticas en la ficha");
    return parsed;
  } catch (error) {
    primaryError = error;
  }

  try {
    const markdown = await requestText(fetchImpl, READER_URL, "text/plain", timeoutMs);
    const parsed = parseDistroWatchMarkdown(markdown);
    if (!parsed) throw new Error("No se encontraron estadísticas en la respuesta de respaldo");
    return parsed;
  } catch (fallbackError) {
    const error = new Error(
      `DistroWatch no respondió (${primaryError.message}; respaldo: ${fallbackError.message})`,
    );
    error.cause = primaryError;
    throw error;
  }
}

export {
  SOURCE_URL,
  READER_URL,
  USER_AGENT,
  parseDistroWatch,
  parseDistroWatchMarkdown,
  fetchDistroWatch,
};
