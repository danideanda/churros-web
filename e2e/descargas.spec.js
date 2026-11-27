import { test, expect } from "@playwright/test";

// La página de descargas, en un navegador de verdad: los botones y el
// historial (que js/app.js genera desde data/releases-*.json) llevan a ISO
// que existen en el servidor y que están en su SHA256SUMS.

const SERVER = "https://download.churroslinux.org/";
const ISO = /^https:\/\/download\.churroslinux\.org\/ChurrOS-[^/]+\.iso$/;
// Cloudflare trata mal a los clientes sin User-Agent.
const HEADERS = { "User-Agent": "churros-web-e2e" };

async function openDownloads(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/download.html");
  // El historial se rellena con fetch: esperar a que haya tarjetas.
  await expect(page.locator("#version-grid-niri .prototype-card").first()).toBeAttached();
  await expect(page.locator("#version-grid-xfce .prototype-card").first()).toBeAttached();
  return errors;
}

const hrefs = (locator) => locator.evaluateAll((links) => links.map((a) => a.href));

// download.churroslinux.org responde 503 cuando está ocupado (varias descargas
// a la vez): eso no es un enlace roto. Se reintenta con espera; un 404, no.
async function withRetry(request, method, url, attempts = 5) {
  let response;
  for (let i = 0; i < attempts; i++) {
    response = await request[method](url, { headers: HEADERS, timeout: 60_000, maxRedirects: 10 });
    if (response.status() < 500) return response;
    await new Promise((resolve) => setTimeout(resolve, 5_000 * (i + 1)));
  }
  return response;
}

test("la página de descargas carga sin errores y con su historial", async ({ page }) => {
  const errors = await openDownloads(page);
  expect(errors, "errores de JavaScript en la página").toEqual([]);
  await expect(page.getByText(/No se pudo cargar el historial/)).toHaveCount(0);
  await expect(page.locator("a.btn-edition-download")).toHaveCount(2);
});

test("los botones principales son la versión más nueva del historial", async ({ page }) => {
  await openDownloads(page);
  const [niri, xfce] = await hrefs(page.locator("a.btn-edition-download"));
  for (const href of [niri, xfce]) expect(href).toMatch(ISO);
  expect(niri).toContain("niri");
  expect(xfce).toContain("xfce");
  // Ordenado por fecha: la primera tarjeta es la más reciente.
  const [newestNiri] = await hrefs(page.locator("#version-grid-niri .prototype-btn-primary"));
  const [newestXfce] = await hrefs(page.locator("#version-grid-xfce .prototype-btn-primary"));
  expect(newestNiri, "download.html y data/releases-niri.json no anuncian la misma versión").toBe(niri);
  expect(newestXfce, "download.html y data/releases-xfce.json no anuncian la misma versión").toBe(xfce);
});

test.describe("en el servidor de descargas", () => {
  // Es la misma comprobación de red en los tres navegadores: basta con uno.
  test.skip(({ browserName }) => browserName !== "chromium", "comprobación de red, no del navegador");

  test("cada ISO enlazada existe", async ({ page, request }) => {
    test.setTimeout(10 * 60_000);
    await openDownloads(page);
    const links = [
      ...(await hrefs(page.locator("a.btn-edition-download"))),
      ...(await hrefs(page.locator(".prototype-grid-edition .prototype-btn-primary"))),
    ];
    // Todo el historial, también lo que está en SourceForge o GitHub.
    const isos = [...new Set(links)];
    expect(isos.length).toBeGreaterThan(2);
    const broken = [];
    for (const iso of isos) {
      const response = await withRetry(request, "head", iso);
      const size = Number(response.headers()["content-length"] || 0);
      // Una ISO de verdad, no una página de error servida con 200.
      if (response.status() !== 200 || size < 500_000_000) broken.push(`${iso} → HTTP ${response.status()}, ${size} bytes`);
    }
    expect(broken, "enlaces de descarga rotos").toEqual([]);
  });

  test("las ISO de los botones están en SHA256SUMS", async ({ page, request }) => {
    await openDownloads(page);
    const response = await withRetry(request, "get", `${SERVER}SHA256SUMS`);
    expect(response.status()).toBe(200);
    const sums = await response.text();
    for (const href of await hrefs(page.locator("a.btn-edition-download"))) {
      const name = decodeURIComponent(new URL(href).pathname.slice(1));
      expect(sums, `${name} no tiene suma en SHA256SUMS`).toMatch(new RegExp(`^[0-9a-f]{64}  ${name.replace(/[.+]/g, "\\$&")}$`, "m"));
    }
  });
});
