# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-11-02] GitHub Wiki is the editorial source; `wiki-data/wiki.json` is generated**
   Do instead: edit `ChurrOS-GNU-Linux/ChurrOS.wiki.git`, then run `npm run sync:wiki`; never hand-edit the generated JSON.

2. **[2026-11-02] The stable wiki contract is Home plus 56 guides across eight chapters**
   Do instead: preserve 57 unique indexed pages and run both source tests with `WIKI_SOURCE_DIR` and the checked-in static tests before publishing.

## Shell & Command Reliability

## Domain Behavior Guardrails
1. **[2026-11-02] Wiki synchronization must fail without replacing the last valid export**
   Do instead: generate and validate a sibling `.tmp` file, then atomically move it over `wiki-data/wiki.json` only after all content tests pass.

## User Directives
1. **[2026-11-01] ChurrOS documentation targets the stable/general product**
   Do instead: keep beta and pre-beta material out of the main wiki unless the user explicitly expands the scope.
