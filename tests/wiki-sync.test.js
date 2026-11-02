import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  try { return await readFile(new URL(`../${path}`, import.meta.url), "utf8"); }
  catch { return ""; }
}

const script = await source("scripts/sync-github-wiki.sh");
const workflow = await source(".github/workflows/wiki-sync.yml");
const packageJson = JSON.parse(await source("package.json"));

test("the sync script clones the explicit official wiki into a disposable directory", () => {
  assert.match(script, /mktemp -d/);
  assert.match(script, /trap ['"][^'"\n]*['"] EXIT/);
  assert.match(script, /https:\/\/github\.com\/ChurrOS-GNU-Linux\/ChurrOS\.wiki\.git/);
  assert.match(script, /--branch master/);
  assert.doesNotMatch(script, /(?:TOKEN|PASSWORD|SECRET)=/i);
});

test("the sync script validates temporary output before atomic replacement", () => {
  assert.match(script, /build-github-wiki\.mjs[\s\S]{0,300}--output\s+"\$output_tmp"/);
  assert.match(script, /WIKI_SOURCE_DIR=[^\n]*node --test tests\/wiki-stable-content\.test\.js/);
  assert.match(script, /WIKI_DATA_FILE=[^\n]*node --test tests\/wiki-static\.test\.js/);
  const validation = script.indexOf("wiki-static.test.js");
  const replacement = script.indexOf("mv ");
  assert.ok(validation >= 0 && replacement > validation, "replacement must happen after validation");
});

test("the workflow supports scheduled, manual, repository, and generator-change triggers", () => {
  assert.match(workflow, /cron:\s*["']\*\/15 \* \* \* \*["']/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /repository_dispatch:[\s\S]*wiki_updated/);
  assert.match(workflow, /paths:[\s\S]*scripts\/github-wiki-core\.mjs/);
});

test("the workflow serializes runs and verifies before its narrowly scoped bot commit", () => {
  assert.match(workflow, /concurrency:[\s\S]*group:\s*wiki-sync[\s\S]*cancel-in-progress:\s*false/);
  assert.match(workflow, /node-version:\s*22/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /git add wiki-data\/wiki\.json/);
  assert.match(workflow, /github-actions\[bot\]/);
  assert.match(workflow, /git pull --rebase/);
  assert.match(workflow, /git push/);
  assert.doesNotMatch(workflow, /(?:ghp_|github_pat_)[A-Za-z0-9_]+/);
});

test("package scripts expose a local sync command", () => {
  assert.equal(packageJson.scripts?.["sync:wiki"], "bash scripts/sync-github-wiki.sh wiki-data/wiki.json");
});
