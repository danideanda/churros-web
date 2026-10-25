import { SOURCE_URL, fetchDistroWatch } from "../lib/distrowatch.js";

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    response.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const stats = await fetchDistroWatch();

    response.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400");
    response.status(200).json({
      sourceUrl: SOURCE_URL,
      fetchedAt: new Date().toISOString(),
      ...stats,
    });
  } catch (error) {
    console.error("DistroWatch fetch failed:", error);

    response.setHeader("Cache-Control", "no-store");
    response.status(502).json({
      error: "No se pudieron obtener las estadísticas de DistroWatch",
      sourceUrl: SOURCE_URL,
      fetchedAt: new Date().toISOString(),
    });
  }
};
