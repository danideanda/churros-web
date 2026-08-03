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
    });
  } else {
    initUI();
    initScrollListener();
    initAOS();
    openExternalLinksInNewTab();
  }
})();
