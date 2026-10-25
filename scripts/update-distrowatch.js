import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_URL, fetchDistroWatch } from "../lib/distrowatch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "distrowatch.json");

function readDataset() {
  try {
    const dataset = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    if (!dataset || !Array.isArray(dataset.history)) {
      throw new Error("El archivo no contiene una lista history válida");
    }
    return dataset;
  } catch (error) {
    if (error.code === "ENOENT") {
      return { sourceUrl: SOURCE_URL, history: [] };
    }
    throw error;
  }
}

async function main() {
  const stats = await fetchDistroWatch();
  const today = new Date().toISOString().slice(0, 10);
  const entry = {
    date: today,
    listingUpdatedAt: stats.listingUpdatedAt || today,
    popularityRank: stats.popularityRank,
    pageHitsPerDay: stats.pageHitsPerDay,
  };

  const dataset = readDataset();
  dataset.sourceUrl = SOURCE_URL;

  const index = dataset.history.findIndex((item) => item.date === today);
  let changed = false;

  if (index === -1) {
    dataset.history.push(entry);
    changed = true;
  } else {
    const current = dataset.history[index];
    if (
      current.listingUpdatedAt !== entry.listingUpdatedAt ||
      current.popularityRank !== entry.popularityRank ||
      current.pageHitsPerDay !== entry.pageHitsPerDay
    ) {
      dataset.history[index] = entry;
      changed = true;
    }
  }

  dataset.history.sort((left, right) => left.date.localeCompare(right.date));

  if (!changed) {
    console.log(`Sin cambios: ranking ${entry.popularityRank}, ${entry.pageHitsPerDay} visitas/día.`);
    return;
  }

  fs.writeFileSync(DATA_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(
    `Registro actualizado: ${entry.date} · ranking ${entry.popularityRank} · ${entry.pageHitsPerDay} visitas/día.`,
  );
}

main().catch((error) => {
  console.error("No se pudo actualizar DistroWatch:", error.message);
  process.exitCode = 1;
});
