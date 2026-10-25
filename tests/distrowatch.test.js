import test from "node:test";
import assert from "node:assert/strict";
import {
  SOURCE_URL,
  parseDistroWatch,
  parseDistroWatchMarkdown,
  fetchDistroWatch,
} from "../lib/distrowatch.js";

const currentMarkdown = `
| ChurrOS |
| --- |
| **Last Update:** 2026-10-13 11:19 UTC |
| **Popularity:**[410 (31 hits per day)](https://distrowatch.com/dwres.php?resource=popularity)
**[Popularity (hits per day)]:** 12 months: **502** (15), 6 months: **410** (31), 3 months: **216** (63), 4 weeks: **87** (191), 1 week: **144** (91)
**[Average visitor rating]:** **10.0**/10 from **1** review(s).
`;

test("parses DistroWatch's current Markdown response", () => {
  assert.deepEqual(parseDistroWatchMarkdown(currentMarkdown), {
    popularityRank: 410,
    pageHitsPerDay: 31,
    listingUpdatedAt: "2026-10-13",
    listingUpdatedAtFull: "2026-10-13T11:19:00Z",
    periods: [
      { label: "12 meses", rank: 502, hitsPerDay: 15 },
      { label: "6 meses", rank: 410, hitsPerDay: 31 },
      { label: "3 meses", rank: 216, hitsPerDay: 63 },
      { label: "4 semanas", rank: 87, hitsPerDay: 191 },
      { label: "1 semana", rank: 144, hitsPerDay: 91 },
    ],
    rating: { score: 10, reviews: 1 },
  });
});

test("parses the HTML representation", () => {
  const html = `<b>Popularity:</b> <a>410 (31 hits per day)</a> Last Update: 2026-10-13 11:19 UTC 12 months: <b>502</b> (15)`;
  const result = parseDistroWatch(html);
  assert.equal(result.popularityRank, 410);
  assert.equal(result.pageHitsPerDay, 31);
  assert.equal(result.listingUpdatedAtFull, "2026-10-13T11:19:00Z");
  assert.deepEqual(result.periods, [{ label: "12 meses", rank: 502, hitsPerDay: 15 }]);
});

test("uses Markdown reader when DistroWatch rejects the direct request", async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    const body = url === SOURCE_URL ? "Forbidden" : currentMarkdown;
    return { ok: url !== SOURCE_URL, status: url === SOURCE_URL ? 403 : 200, text: async () => body };
  };
  const result = await fetchDistroWatch({ fetchImpl });
  assert.equal(result.popularityRank, 410);
  assert.equal(result.pageHitsPerDay, 31);
  assert.equal(requested.length, 2);
});

test("rejects a response with no usable statistics", () => {
  assert.equal(parseDistroWatchMarkdown("DistroWatch unavailable"), null);
  assert.equal(parseDistroWatch(""), null);
});
