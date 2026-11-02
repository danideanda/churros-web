import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { buildWikiIndex } from "./github-wiki-core.mjs";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!name.startsWith("--")) throw new Error(`Argumento inesperado: ${name}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Falta valor para ${name}`);
    options[name.slice(2)] = value;
    index += 1;
  }
  return options;
}

const args = parseArgs(process.argv.slice(2));
if (!args.source || !args.output) {
  throw new Error("Uso: node scripts/build-github-wiki.mjs --source <dir> --output <file> [--repo <slug>] [--commit <sha>] [--synced-at <iso>]");
}

const output = resolve(args.output);
const payload = await buildWikiIndex({
  sourceDir: resolve(args.source),
  repo: args.repo || "ChurrOS-GNU-Linux/ChurrOS",
  commit: args.commit || process.env.WIKI_SOURCE_COMMIT || "local",
  syncedAt: args["synced-at"] || process.env.WIKI_SYNCED_AT || new Date().toISOString(),
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Generados ${payload.pageCount} artículos desde ${payload.sourceRepo}@${payload.sourceCommit}`);
