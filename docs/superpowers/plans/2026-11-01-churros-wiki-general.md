# Wiki general de ChurrOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar una wiki general de ChurrOS 1.4 con 56 artículos en GitHub Wiki, una experiencia web premium y sincronización automática verificable.

**Architecture:** La GitHub Wiki oficial es la única fuente editable. Un generador Node convierte su Markdown y `_Sidebar.md` en un JSON estático versionado; el frontend existente lee ese índice, mantiene las URLs actuales y presenta búsqueda, capítulos, tabla de contenido y edición en GitHub. Una Action sincroniza periódicamente el repositorio wiki y confirma el JSON antes de hacer commit, conservando el último export válido como fallback.

**Tech Stack:** HTML y CSS existentes, JavaScript ES modules, Node.js 22, GitHub Flavored Markdown, `marked`, `sanitize-html`, Node test runner, GitHub Actions y Vercel/Git deployment existente.

**Spec:** `docs/superpowers/specs/2026-11-01-churros-wiki-general-design.md`

## Global Constraints

- La documentación pública cubre ChurrOS 1.4, Niri y XFCE estables.
- No recomendar beta, pre-beta, i686, Raspberry Pi, ARM sin ISO publicada ni Server abandonado.
- La GitHub Wiki oficial `ChurrOS-GNU-Linux/ChurrOS.wiki.git` es la única fuente editorial.
- Conservar la integración MediaWiki/OAuth existente sin usarla como fuente pública.
- Mantener compatibles las URLs `wiki.html?article=…`.
- No mezclar ni revertir cambios no relacionados ya presentes en `download.html`.
- No introducir un framework frontend ni fuentes web bloqueantes.
- Todo HTML derivado de Markdown se sanitiza antes de llegar al DOM.
- Los comandos destructivos incluyen comprobación del dispositivo, copia de seguridad y recuperación.

## Review Focus

- Un `_Sidebar.md` con acentos, espacios, enlaces anclados o páginas repetidas debe producir un orden único y URLs correctas; Task 1 lo cubre.
- Markdown con HTML, URL `javascript:` o atributo `on*` debe quedar neutralizado; Tasks 1 y 4 lo cubren.
- Una página nueva, renombrada o borrada en GitHub Wiki debe actualizar búsqueda y capítulos sin dejar enlaces rotos; Tasks 1, 3 y 6 lo cubren.
- Una sincronización remota fallida no debe sobrescribir `wiki-data/wiki.json`; Task 6 lo cubre.
- En móvil, teclado, modo oscuro o sin resultados, la navegación debe seguir siendo operable y comprensible; Tasks 4 y 5 lo cubren.

---

### Task 1: Contrato y generador de GitHub Wiki

**Files:**
- Create: `scripts/github-wiki-core.mjs`
- Create: `scripts/build-github-wiki.mjs`
- Create: `tests/fixtures/github-wiki/Home.md`
- Create: `tests/fixtures/github-wiki/_Sidebar.md`
- Create: `tests/fixtures/github-wiki/Instalar-ChurrOS.md`
- Create: `tests/fixtures/github-wiki/Red-y-conectividad.md`
- Create: `tests/github-wiki-core.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `parseSidebar(markdown: string): Chapter[]`
- Produces: `parseMetadata(markdown: string): WikiMetadata`
- Produces: `buildWikiIndex({ sourceDir, repo, commit, syncedAt }): Promise<WikiIndex>`
- Produces: CLI `node scripts/build-github-wiki.mjs --source <dir> --output <file> [--repo <slug>] [--commit <sha>] [--synced-at <iso>]`

- [ ] **Step 1: Write failing parser tests**

Assert chapter order, Spanish accents, slug normalization, metadata comments, internal links, heading IDs, plaintext extraction, deterministic output and duplicate-page rejection.

- [ ] **Step 2: Run the parser tests and verify failure**

Run: `node --test tests/github-wiki-core.test.js`

Expected: FAIL because `scripts/github-wiki-core.mjs` does not exist.

- [ ] **Step 3: Add the minimal Markdown dependencies and generator**

Add `marked` and `sanitize-html`. Implement the exported interfaces, strict internal-link validation, safe URL schemes, sanitized HTML, search index and source metadata. Exclude `_Sidebar.md` and `_Footer.md` from article count.

- [ ] **Step 4: Run parser tests and static checks**

Run: `node --test tests/github-wiki-core.test.js && npm run check`

Expected: PASS.

- [ ] **Step 5: Commit the generator unit**

```bash
git add package.json package-lock.json scripts/github-wiki-core.mjs scripts/build-github-wiki.mjs tests/fixtures/github-wiki tests/github-wiki-core.test.js
git commit -m "feat: generate web index from GitHub Wiki"
```

### Task 2: Publicación editorial de 56 artículos

**Files:**
- Modify in official wiki clone: `Home.md`
- Create in official wiki clone: `_Sidebar.md`
- Create in official wiki clone: `_Footer.md`
- Create in official wiki clone: 56 article files listed by the approved spec
- Create: `tests/wiki-stable-content.test.js`

**Interfaces:**
- Consumes: `buildWikiIndex(...)` from Task 1.
- Produces: GitHub Wiki content whose `_Sidebar.md` exposes eight chapters and 56 unique articles.
- Produces: each article begins with `<!-- churros-wiki: {"chapter":"…","level":"…","minutes":N,"next":[…]} -->` followed by one H1.

- [ ] **Step 1: Write failing stable-content tests**

Assert 8 chapters, exactly 56 sidebar articles, ChurrOS 1.4 on Home, Niri/XFCE stable scope, minimum meaningful body length, headings, internal links, metadata validity, no beta/pre-beta recommendations and no experimental/abandoned edition in navigation.

- [ ] **Step 2: Run the content tests and verify failure against the current two-page wiki**

Run: `WIKI_SOURCE_DIR=<official-wiki-clone> node --test tests/wiki-stable-content.test.js`

Expected: FAIL on chapter and article counts.

- [ ] **Step 3: Author the Home, sidebar, footer and chapters 1–4**

Use the official `VERSION`, `README.md`, `docs/`, package lists and installer configuration as product sources. Include warnings, expected results and recovery paths for download, USB, partitioning, Btrfs and installation.

- [ ] **Step 4: Author chapters 5–8**

Cover Niri, XFCE, official apps, maintenance, troubleshooting, community and reference. Cross-check Arch operations against primary Arch documentation and keep unsupported variants outside navigation.

- [ ] **Step 5: Run content and link validation**

Run: `WIKI_SOURCE_DIR=<official-wiki-clone> node --test tests/wiki-stable-content.test.js tests/github-wiki-core.test.js`

Expected: PASS with 56 articles and zero broken internal links.

- [ ] **Step 6: Commit and push the official GitHub Wiki**

```bash
git -C <official-wiki-clone> add '*.md'
git -C <official-wiki-clone> commit -m "docs: publish the ChurrOS 1.4 general wiki"
git -C <official-wiki-clone> push origin master
```

Verify the remote commit and `https://github.com/ChurrOS-GNU-Linux/ChurrOS/wiki`.

### Task 3: Export de producción y pruebas de integridad

**Files:**
- Modify: `wiki-data/wiki.json`
- Replace/retire untracked draft: `scripts/build-wiki-static.mjs`
- Replace/retire untracked draft: `scripts/build-wiki-static.sh`
- Replace: `tests/wiki-static.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `node scripts/build-github-wiki.mjs` and official wiki clone.
- Produces: `wiki-data/wiki.json` with `schemaVersion`, `sourceRepo`, `sourceCommit`, `syncedAt`, `version`, `chapters`, `articles`, `featured`, `recent` and `searchIndex`.
- Produces: `npm run build:wiki -- --source <dir>`.

- [ ] **Step 1: Rewrite static export tests to the approved schema**

Assert source repo/commit, 56 articles, 8 chapters, Home, version 1.4, all internal links, unique slugs, edit URLs, headings, related articles and search coverage.

- [ ] **Step 2: Run static tests and verify failure on the MediaWiki draft schema**

Run: `node --test tests/wiki-static.test.js`

Expected: FAIL on `schemaVersion` or `chapters`.

- [ ] **Step 3: Generate the production JSON from the pushed wiki commit**

Use a fresh clone and an explicit ISO timestamp. Update package scripts so `build:wiki` uses the GitHub Wiki generator; keep legacy MediaWiki scripts addressable only under a clearly named legacy command if still needed.

- [ ] **Step 4: Run integrity and regression tests**

Run: `npm test`

Expected: all existing MediaWiki/backend tests and new GitHub Wiki tests PASS.

- [ ] **Step 5: Commit the verified export**

```bash
git add package.json package-lock.json wiki-data/wiki.json scripts/build-wiki-static.mjs scripts/build-wiki-static.sh tests/wiki-static.test.js tests/wiki-stable-content.test.js
git commit -m "docs: publish ChurrOS 1.4 wiki index"
```

### Task 4: Frontend de lectura, búsqueda y navegación

**Files:**
- Modify: `wiki.html`
- Modify: `js/wiki-core.js`
- Modify: `js/wiki.js`
- Modify: `css/wiki.css`
- Modify: `tests/wiki-core.test.js`
- Create: `tests/wiki-frontend-contract.test.js`

**Interfaces:**
- Consumes: `WikiIndex` from Task 3 at `wiki-data/wiki.json`.
- Produces: existing routes `home`, `article`, `category`, `recent` plus chapter-aware navigation.
- Produces: keyboard search shortcut `Ctrl/Cmd + K`, chapter drawer, article table of contents, copy-link action and GitHub edit action.

- [ ] **Step 1: Write failing route, search and HTML-contract tests**

Assert legacy query compatibility, chapter routes, accent-insensitive search, safe snippets, current chapter state, noscript fallback, semantic landmarks and required control labels.

- [ ] **Step 2: Run frontend contract tests and verify failure**

Run: `node --test tests/wiki-core.test.js tests/wiki-frontend-contract.test.js`

Expected: FAIL on chapter/search interfaces and missing markup.

- [ ] **Step 3: Implement the new data adapter and navigation**

Adapt the existing static loader to the Task 3 schema. Keep API/MediaWiki code intact but inactive. Add chapter/sidebar rendering, task-based home, breadcrumbs, table of contents, related/previous/next articles, source commit status and edit/contribution links.

- [ ] **Step 4: Implement safe search and interaction states**

Search title, summary, headings and body; preserve accent-insensitive matching and escaped snippets. Add `Ctrl/Cmd + K`, close-on-Escape, empty/error/offline/stale states and copy-link feedback without injecting unsanitized HTML.

- [ ] **Step 5: Run frontend and security tests**

Run: `node --test tests/wiki-core.test.js tests/wiki-frontend-contract.test.js tests/security.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the frontend behavior**

```bash
git add wiki.html js/wiki-core.js js/wiki.js css/wiki.css tests/wiki-core.test.js tests/wiki-frontend-contract.test.js
git commit -m "feat: add chapter navigation and advanced wiki search"
```

### Task 5: Dirección visual premium, responsive y accesible

**Files:**
- Modify: `wiki.html`
- Modify: `css/wiki.css`
- Modify: `tests/wiki-frontend-contract.test.js`

**Interfaces:**
- Consumes: existing ChurrOS assets `img/logo.churros.png`, `img/hero.churros.jpg`, `img/xfce.churros.jpg`.
- Produces: editorial light/dark theme, task cards, chapter rail/drawer, readable article surface, responsive tables/code, 44px targets and reduced-motion behavior.

- [ ] **Step 1: Add failing visual-contract assertions**

Assert logo dimensions and alt text, hero image dimensions/lazy behavior where applicable, theme tokens, focus-visible styles, 44px interactive minimums, mobile breakpoints and reduced-motion override.

- [ ] **Step 2: Run the contract tests and verify failure**

Run: `node --test tests/wiki-frontend-contract.test.js`

Expected: FAIL on the new premium layout selectors/tokens.

- [ ] **Step 3: Apply the approved editorial direction**

Use warm ivory, dark ink, ChurrOS orange, toasted borders and coffee dark mode. Keep reading width 70–76ch, make the search dominant, avoid excessive pills/cards, and use existing images as purposeful editorial anchors.

- [ ] **Step 4: Validate responsive and accessibility behavior in a browser**

Check 390×844, 768×1024 and 1440×900; keyboard-only navigation; light/dark; reduced motion; long headings, code and tables. Capture desktop and mobile screenshots for review.

- [ ] **Step 5: Run automated tests and commit visual work**

Run: `npm test && npm run check`

Expected: PASS.

```bash
git add wiki.html css/wiki.css tests/wiki-frontend-contract.test.js
git commit -m "style: polish the ChurrOS wiki experience"
```

### Task 6: Sincronización automática y fallback seguro

**Files:**
- Create: `.github/workflows/wiki-sync.yml`
- Create: `scripts/sync-github-wiki.sh`
- Create: `tests/wiki-sync.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `bash scripts/sync-github-wiki.sh <output>` that clones `ChurrOS-GNU-Linux/ChurrOS.wiki.git`, builds to a temporary file, validates it and atomically replaces the output only on success.
- Produces: workflow triggers `schedule`, `workflow_dispatch`, `repository_dispatch: wiki_updated`, and changes to generator/workflow files.

- [ ] **Step 1: Write failing sync contract tests**

Assert temporary output, validation before replacement, cleanup trap, explicit repository/branch, concurrency, Node 22, test-before-commit, bot identity and no embedded token.

- [ ] **Step 2: Run sync tests and verify failure**

Run: `node --test tests/wiki-sync.test.js`

Expected: FAIL because workflow and script do not exist.

- [ ] **Step 3: Implement atomic synchronization**

Clone into `mktemp -d`, capture wiki HEAD, generate a temporary JSON, run static tests against it, move it over the production JSON only after success and clean up. Do not use broad destructive paths.

- [ ] **Step 4: Implement the GitHub Action**

Schedule every 15 minutes, allow manual and repository dispatch, avoid overlapping runs, run full wiki tests, commit only `wiki-data/wiki.json`, rebase before push and leave no change commit when identical.

- [ ] **Step 5: Run shell, workflow-contract and full tests**

Run: `bash -n scripts/sync-github-wiki.sh && node --test tests/wiki-sync.test.js && npm test && npm run check`

Expected: PASS.

- [ ] **Step 6: Commit automation**

```bash
git add .github/workflows/wiki-sync.yml scripts/sync-github-wiki.sh tests/wiki-sync.test.js package.json
git commit -m "ci: sync the official GitHub Wiki"
```

### Task 7: Verificación final, publicación web y smoke test

**Files:**
- Modify if required: `sitemap-0.xml`
- Modify if required: `robots.txt`
- Modify: `.claude/napkin.md` only for reusable repository guidance discovered during implementation.

**Interfaces:**
- Consumes: completed wiki commits and web commits from Tasks 1–6.
- Produces: pushed web `main`, deployed `https://www.churroslinux.org/wiki.html`, and verified live JSON/source commit.

- [ ] **Step 1: Run the complete local verification suite**

Run: `npm ci && npm test && npm run check && npm run check:config`

Expected: PASS with zero failures.

- [ ] **Step 2: Run a local browser smoke test**

Serve the repository locally. Verify Home, a Niri article, an installation article, search, chapter navigation, direct URL, back/forward, copy link, GitHub edit link, console errors, dark mode and mobile layout.

- [ ] **Step 3: Inspect the final diff and isolate unrelated work**

Run: `git status --short && git diff --check && git diff --stat HEAD`

Expected: no staged `download.html` change and no accidental secret, temporary clone or build artifact.

- [ ] **Step 4: Push the web commits**

```bash
git push origin main
```

Verify the remote commit. If branch protection blocks direct push, preserve commits and report the exact required PR action without force-pushing.

- [ ] **Step 5: Verify production deployment**

Check `https://www.churroslinux.org/wiki.html` and `https://www.churroslinux.org/wiki-data/wiki.json`, confirm HTTP 200, ChurrOS 1.4, 56 articles, matching wiki source commit, assets, search and responsive layout. Use the existing deployment pipeline; do not create an unrelated Vercel project.

- [ ] **Step 6: Report completion and any optional immediate-dispatch setup**

Document the live URL, wiki URL, source commits, web commit, test counts and whether the optional cross-repository `repository_dispatch` secret is configured. The 15-minute schedule remains the required no-secret fallback.
