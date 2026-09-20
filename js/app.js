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

  async function initVersionHistory() {
    const niriContainer = document.getElementById("version-grid-niri");
    const xfceContainer = document.getElementById("version-grid-xfce");
    if (!niriContainer || !xfceContainer) return;

    try {
      const [niriRes, xfceRes] = await Promise.all([
        fetch("https://download.churroslinux.org/updates_ISO/NIRI/update.json", { cache: "no-store" }),
        fetch("https://download.churroslinux.org/updates_ISO/XFE/update.json", { cache: "no-store" }),
      ]);

      if (!niriRes.ok || !xfceRes.ok) throw new Error("Failed to fetch version data");

      const niriData = await niriRes.json();
      const xfceData = await xfceRes.json();

      const renderCards = (data, edition) => {
        return data
          .slice()
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((release) => {
            const versionLabel = `${edition === "niri" ? "Niri" : "XFCE"} v${release.version}`;
            const editionLabel = edition === "niri" ? "NIRI Edition" : "XFCE Edition";
            const hasTorrent = release.url.torrent && release.url.torrent.trim() !== "";
            const torrentBtn = hasTorrent
              ? `<a href="${release.url.torrent}" class="prototype-btn prototype-btn-soft" download>
                   <svg width="1em" height="1em" class="w-4 h-4 mr-1"><use href="#ai:tabler:magnet"></use></svg>
                   Torrent
                 </a>`
              : "";

            return `
              <div class="prototype-card prototype-card-warm" data-edition="${edition}">
                <div class="prototype-header">
                  <h3>${versionLabel}</h3>
                  <span class="prototype-pill">${editionLabel}</span>
                </div>
                <div class="prototype-version-list">
                  <div class="prototype-version-row">
                    <div>
                      <span class="prototype-version-name">${release.date}</span>
                      <small>${hasTorrent ? "ISO y Torrent disponibles" : "Solo ISO"}</small>
                    </div>
                    <div class="prototype-action-group">
                      <a href="${release.url.ISO}" class="prototype-btn prototype-btn-primary">
                        <svg width="1em" height="1em" class="w-4 h-4 mr-1"><use href="#ai:tabler:download"></use></svg>
                        ISO
                      </a>
                      ${torrentBtn}
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");
      };

      niriContainer.innerHTML = renderCards(niriData, "niri");
      xfceContainer.innerHTML = renderCards(xfceData, "xfce");
    } catch (err) {
      console.warn("Version history load failed, using fallback:", err);
      // Fallback: keep any static content or show error state
      niriContainer.innerHTML = '<div class="text-center py-8 text-gray-500 dark:text-gray-400">No se pudo cargar el historial de Niri</div>';
      xfceContainer.innerHTML = '<div class="text-center py-8 text-gray-500 dark:text-gray-400">No se pudo cargar el historial de XFCE</div>';
    }
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
    });
  } else {
    initUI();
    initScrollListener();
    initAOS();
    openExternalLinksInNewTab();
    initDonationMenu();
    initEditionSwitch();
    initVersionHistory();
  }
})();
