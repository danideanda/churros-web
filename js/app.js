(function () {
  const defaultTheme = "system";

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  const setThemeMode = () => {
    if (defaultTheme && defaultTheme.endsWith(":only")) {
      applyTheme(defaultTheme.replace(":only", ""));
      return;
    }

    if (localStorage.theme === "dark") {
      applyTheme("dark");
    } else if (localStorage.theme === "light") {
      applyTheme("light");
    } else if (
      defaultTheme === "system" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      applyTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      );
    } else {
      applyTheme(defaultTheme === "dark" ? "dark" : "light");
    }
  };

  setThemeMode();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-transition");
    });
  });

  function getMenuButton() {
    return document.querySelector("[data-aw-toggle-menu]");
  }

  function getNav() {
    return document.querySelector("#header nav");
  }

  function setMenuOpen(open) {
    const menuBtn = getMenuButton();
    const nav = getNav();

    if (menuBtn) {
      menuBtn.classList.toggle("expanded", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    document.body.classList.toggle("overflow-hidden", open);
    document.getElementById("header")?.classList.toggle("h-screen", open);
    document.getElementById("gradient")?.classList.toggle("hidden", !open);

    if (nav) {
      nav.classList.toggle("hidden", !open);
    }
  }

  function initUI() {
    setMenuOpen(false);

    const header = document.getElementById("header");
    if (!header) return;
    if (window.scrollY > 60) {
      header.classList.add("scroll");
    } else {
      header.classList.remove("scroll");
    }
  }

  function initScrollListener() {
    if (window.churrosScrollListenerAttached) return;

    let ticking = false;
    document.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const header = document.getElementById("header");
          if (header) {
            if (window.scrollY > 60) {
              header.classList.add("scroll");
            } else {
              header.classList.remove("scroll");
            }
          }
          ticking = false;
        });
      },
      { passive: true },
    );

    window.churrosScrollListenerAttached = true;
  }

  function initAOS() {
    const aosElements = document.querySelectorAll(".aos, .aos-fade");
    if (!aosElements.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      aosElements.forEach((el) => el.classList.add("animated"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animated");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    aosElements.forEach((el) => observer.observe(el));
  }

  function openExternalLinksInNewTab() {
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      let isExternal = false;
      try {
        if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) {
          const url = new URL(href, window.location.href);
          const currentHost = window.location.hostname;

          if (currentHost && currentHost !== "localhost" && currentHost !== "127.0.0.1" && currentHost !== "") {
            isExternal = url.hostname !== currentHost;
          } else {
            isExternal = url.hostname !== "churroslinux.org" && url.hostname !== "www.churroslinux.org";
          }
        }
      } catch (e) {
        isExternal = false;
      }

      if (isExternal) {
        link.setAttribute("target", "_blank");
        const relParts = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
        relParts.add("noopener");
        relParts.add("noreferrer");
        link.setAttribute("rel", [...relParts].join(" "));
      } else if (link.getAttribute("target") === "_blank") {
        link.removeAttribute("target");
      }
    });
  }

  function initDonationMenu() {
    const donationMenu = document.getElementById("donation-menu");
    if (!donationMenu) return;

    document.querySelectorAll('a[href*="download.churroslinux.org"]').forEach((link) => {
      link.addEventListener("click", () => {
        donationMenu.open = true;
      });
    });
  }

  function initEditionSwitch() {
    const editionSwitch = document.getElementById("edition-switch");
    const versionGrid = document.getElementById("version-grid");
    if (!editionSwitch || !versionGrid) return;

    editionSwitch.addEventListener("click", (e) => {
      const btn = e.target.closest(".edition-switch-option");
      if (!btn) return;
      const edition = btn.getAttribute("data-edition");

      editionSwitch.querySelectorAll(".edition-switch-option").forEach((o) => {
        o.classList.toggle("is-active", o === btn);
        o.setAttribute("aria-selected", o === btn ? "true" : "false");
      });
      editionSwitch.setAttribute("data-active", edition);
      versionGrid.setAttribute("data-active", edition);
    });
  }

  const VERSION_FEEDS = [
    { edition: "niri", label: "Niri", feed: "https://download.churroslinux.org/updates_ISO/NIRI/update.json" },
    { edition: "xfce", label: "XFCE", feed: "https://download.churroslinux.org/updates_ISO/XFCE/update.json" },
  ];

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeUrl = (value) => {
    const url = typeof value === "string" ? value.trim() : "";
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : "";
  };

  const readUrlField = (release, ...keys) => {
    const urls = release && typeof release.url === "object" && release.url !== null ? release.url : {};
    for (const key of keys) {
      const found = safeUrl(urls[key]);
      if (found) return found;
    }
    return "";
  };

  const toTimestamp = (value) => {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const toVersionParts = (value) =>
    String(value ?? "")
      .trim()
      .split(".")
      .map((part) => parseInt(part, 10))
      .map((num) => (Number.isNaN(num) ? 0 : num));

  const compareVersionParts = (a, b) => {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const diff = (a[i] || 0) - (b[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  const normalizeReleases = (payload) => {
    const list = Array.isArray(payload) ? payload : Array.isArray(payload && payload.releases) ? payload.releases : [];
    return list
      .filter((release) => release && typeof release === "object")
      .map((release) => ({
        version: String(release.version ?? "").trim(),
        date: String(release.date ?? "").trim(),
        iso: readUrlField(release, "ISO", "iso", "Iso"),
        torrent: readUrlField(release, "torrent", "Torrent"),
      }))
      .filter((release) => release.version !== "" && release.iso !== "");
  };

  const renderReleaseCard = (release, { edition, label }) => {
    const hasTorrent = release.torrent !== "";
    const torrentBtn = hasTorrent
      ? `<a href="${escapeHtml(release.torrent)}" class="prototype-btn prototype-btn-soft" download>
           <svg width="1em" height="1em" class="w-4 h-4 mr-1"><use href="#ai:tabler:magnet"></use></svg>
           Torrent
         </a>`
      : "";

    return `
      <div class="prototype-card prototype-card-warm" data-edition="${escapeHtml(edition)}">
        <div class="prototype-header">
          <h3>${escapeHtml(label)} v${escapeHtml(release.version)}</h3>
          <span class="prototype-pill">${escapeHtml(label)} Edition</span>
        </div>
        <div class="prototype-version-list">
          <div class="prototype-version-row">
            <div>
              <span class="prototype-version-name">${escapeHtml(release.date)}</span>
              <small>${hasTorrent ? "ISO y Torrent disponibles" : "Solo ISO"}</small>
            </div>
            <div class="prototype-action-group">
              <a href="${escapeHtml(release.iso)}" class="prototype-btn prototype-btn-primary">
                <svg width="1em" height="1em" class="w-4 h-4 mr-1"><use href="#ai:tabler:download"></use></svg>
                ISO
              </a>
              ${torrentBtn}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  async function loadEditionReleases(feed) {
    const response = await fetch(feed, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch (err) {
      throw new Error(`invalid JSON in ${feed} (${err.message})`);
    }

    const releases = normalizeReleases(payload);

    if (releases.length === 0) {
      throw new Error(`no valid releases in ${feed}`);
    }

    return releases.sort((a, b) => {
      const byDate = toTimestamp(b.date) - toTimestamp(a.date);
      if (byDate !== 0) return byDate;
      return compareVersionParts(toVersionParts(b.version), toVersionParts(a.version));
    });
  }

  async function initVersionHistory() {
    await Promise.all(
      VERSION_FEEDS.map(async ({ edition, label, feed }) => {
        const container = document.getElementById(`version-grid-${edition}`);
        if (!container) return;

        try {
          const releases = await loadEditionReleases(feed);
          container.innerHTML = releases.map((release) => renderReleaseCard(release, { edition, label })).join("");
        } catch (err) {
          console.warn(`Version history load failed for ${edition}:`, err);
          container.innerHTML = `<div class="text-center py-8 text-gray-500 dark:text-gray-400">No se pudo cargar el historial de ${escapeHtml(label)}</div>`;
        }
      }),
    );
  }

  function initDistroWatchStats() {
    const section = document.getElementById("distrowatch");
    const chart = section?.querySelector("[data-dw-chart]");
    const periodControls = section?.querySelector("[data-dw-periods]");
    const chartNote = section?.querySelector("[data-dw-chart-note]");
    const status = section?.querySelector("[data-dw-status]");
    if (!section || !chart || !periodControls || !chartNote || !status) return;

    let activePeriod = "30";
    let history = [];

    function setMetric(name, value) {
      const element = section.querySelector(`[data-dw-value="${name}"]`);
      if (element) element.textContent = value;
    }

    function renderChart(period) {
      activePeriod = period;
      const days = Number(period);
      const latestDate = history.length ? new Date(`${history[history.length - 1].date}T23:59:59Z`) : new Date();
      const firstDate = new Date(latestDate);
      firstDate.setUTCDate(firstDate.getUTCDate() - days + 1);
      const entries = history.filter((entry) => {
        const entryDate = new Date(`${entry.date}T00:00:00Z`);
        return entryDate >= firstDate && entryDate <= latestDate;
      });
      const width = Math.max(240, chart.parentElement.clientWidth);
      const height = 280;
      const padding = { top: 18, right: 12, bottom: 46, left: width < 420 ? 38 : 48 };
      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;
      const highestValue = Math.max(0, ...entries.map((entry) => entry.pageHitsPerDay));
      const maximum = Math.max(5, Math.ceil(highestValue / 5) * 5);
      const y = (value) => padding.top + (1 - value / maximum) * plotHeight;
      const baseline = height - padding.bottom;
      const barStep = entries.length ? plotWidth / entries.length : plotWidth;
      const barWidth = Math.min(36, barStep * 0.62);
      const svgNamespace = "http://www.w3.org/2000/svg";
      const createSvgElement = (name, attributes = {}) => {
        const element = document.createElementNS(svgNamespace, name);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        return element;
      };

      chart.replaceChildren();
      chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
      chart.setAttribute("aria-label", `Historial de visitas diarias verificadas de los últimos ${period} días`);

      for (let tick = 0; tick <= 4; tick += 1) {
        const value = Math.round((maximum * tick) / 4);
        const yPosition = y(value);
        const gridLine = createSvgElement("line", {
          x1: padding.left,
          x2: width - padding.right,
          y1: yPosition,
          y2: yPosition,
          class: "distrowatch-chart-grid",
        });
        const label = createSvgElement("text", {
          x: padding.left - 10,
          y: yPosition + 4,
          "text-anchor": "end",
          class: "distrowatch-chart-label",
        });
        label.textContent = value.toLocaleString("es-CO");
        chart.append(gridLine, label);
      }

      entries.forEach((entry, index) => {
        const barHeight = baseline - y(entry.pageHitsPerDay);
        const barX = padding.left + index * barStep + (barStep - barWidth) / 2;
        const bar = createSvgElement("rect", {
          x: barX,
          y: baseline - barHeight,
          width: barWidth,
          height: barHeight,
          rx: 4,
          class: "distrowatch-chart-bar",
        });
        const barTitle = createSvgElement("title");
        barTitle.textContent = `${entry.date}: ${entry.pageHitsPerDay} visitas diarias; ranking de popularidad ${entry.popularityRank}`;
        bar.append(barTitle);

        const periodLabel = createSvgElement("text", {
          x: barX + barWidth / 2,
          y: height - 16,
          "text-anchor": "middle",
          class: "distrowatch-chart-label",
        });
        const [, month, day] = entry.date.split("-");
        periodLabel.textContent = `${day}/${month}`;
        chart.append(bar, periodLabel);
      });

      const periodLabel = period === "365" ? "12 meses" : `${period} días`;
      chartNote.textContent = entries.length
        ? `${entries.length} ${entries.length === 1 ? "captura verificada" : "capturas verificadas"} en los últimos ${periodLabel}`
        : `Sin capturas verificadas en los últimos ${periodLabel}`;
    }

    periodControls.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-period]");
      if (!button || !periodControls.contains(button)) return;
      periodControls.querySelectorAll("button[data-period]").forEach((periodButton) => {
        periodButton.setAttribute("aria-pressed", periodButton === button ? "true" : "false");
      });
      renderChart(button.dataset.period);
    });

    fetch("data/distrowatch.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (
          !data ||
          !Array.isArray(data.history) ||
          !data.history.length ||
          !data.history.every((entry) =>
            /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
            /^\d{4}-\d{2}-\d{2}$/.test(entry.listingUpdatedAt) &&
            Number.isInteger(entry.popularityRank) &&
            entry.popularityRank > 0 &&
            Number.isInteger(entry.pageHitsPerDay) &&
            entry.pageHitsPerDay >= 0,
          )
        ) {
          throw new Error("Formato de datos inválido");
        }

        history = [...data.history].sort((left, right) => left.date.localeCompare(right.date));
        const latest = history[history.length - 1];
        setMetric("rank", `#${latest.popularityRank}`);
        setMetric("page-hits", latest.pageHitsPerDay.toLocaleString("es-CO"));
        setMetric("updated", new Date(`${latest.date}T00:00:00Z`).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }));
        setMetric("listing", new Date(`${latest.listingUpdatedAt}T00:00:00Z`).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }));
        chartNote.textContent = "Datos verificados · actualizando gráfico…";
        renderChart(activePeriod);
      })
      .catch((error) => {
        console.error("No se pudieron cargar las estadísticas de DistroWatch:", error);
        status.lastChild.textContent = " Datos no disponibles";
        status.classList.add("is-error");
        chartNote.textContent = "No se pudieron cargar los datos. Comprueba el archivo data/distrowatch.json.";
      });

    window.addEventListener("resize", () => {
      if (history.length) renderChart(activePeriod);
    }, { passive: true });
  }

  document.addEventListener("click", (e) => {
    const menuBtn = e.target.closest("[data-aw-toggle-menu]");
    if (menuBtn) {
      const isOpen = menuBtn.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
      return;
    }

    const themeBtn = e.target.closest("[data-aw-toggle-color-scheme]");
    if (themeBtn) {
      if (defaultTheme.endsWith(":only")) return;
      document.documentElement.classList.toggle("dark");
      localStorage.theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
      return;
    }

    const nav = getNav();
    const toggle = getMenuButton();
    if (
      nav &&
      toggle &&
      toggle.getAttribute("aria-expanded") === "true" &&
      !nav.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const toggle = getMenuButton();
    if (toggle && toggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      toggle.focus();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initUI();
      initScrollListener();
      initAOS();
      openExternalLinksInNewTab();
      initDonationMenu();
      initEditionSwitch();
      initVersionHistory();
      initDistroWatchStats();
    });
  } else {
    initUI();
    initScrollListener();
    initAOS();
    openExternalLinksInNewTab();
    initDonationMenu();
    initEditionSwitch();
    initVersionHistory();
    initDistroWatchStats();
  }
})();
