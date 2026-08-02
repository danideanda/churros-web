(function () {
  const defaultTheme = "light";

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  const setThemeMode = () => {
    if ((defaultTheme && defaultTheme.endsWith(":only")) || (!localStorage.theme && defaultTheme !== "system")) {
      applyTheme(defaultTheme.replace(":only", ""));
    } else if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      applyTheme("dark");
    } else {
      applyTheme("light");
    }
  };

  setThemeMode();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-transition");
    });
  });

  function initUI() {
    document.querySelector("#header nav")?.classList.add("hidden");
    const menuBtn = document.querySelector("[data-aw-toggle-menu]");
    if (menuBtn) menuBtn.classList.remove("expanded");
    document.body.classList.remove("overflow-hidden");
    document.getElementById("header")?.classList.remove("h-screen");

    let ticking = false;
    let lastKnownScrollPosition = window.scrollY;

    function applyHeaderStylesOnScroll() {
      const header = document.getElementById("header");
      if (!header) return;
      if (lastKnownScrollPosition > 60 && !header.classList.contains("scroll")) {
        header.classList.add("scroll");
      } else if (lastKnownScrollPosition <= 60 && header.classList.contains("scroll")) {
        header.classList.remove("scroll");
      }
      ticking = false;
    }

    applyHeaderStylesOnScroll();
  }

  function initScrollListener() {
    if (window.churrosScrollListenerAttached) return;
    let ticking = false;
    let lastKnownScrollPosition = window.scrollY;
    document.addEventListener("scroll", () => {
      lastKnownScrollPosition = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const header = document.getElementById("header");
          if (!header) return;
          if (lastKnownScrollPosition > 60 && !header.classList.contains("scroll")) {
            header.classList.add("scroll");
          } else if (lastKnownScrollPosition <= 60 && header.classList.contains("scroll")) {
            header.classList.remove("scroll");
          }
          ticking = false;
        });
        ticking = true;
      }
    });
    window.churrosScrollListenerAttached = true;
  }

  function initAOS() {
    const aosElements = document.querySelectorAll(".aos, .aos-fade");
    if (aosElements.length) {
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
      } else {
        if (link.getAttribute("target") === "_blank") {
          link.removeAttribute("target");
        }
      }
    });
  }

  document.addEventListener("click", (e) => {
    const menuBtn = e.target.closest("[data-aw-toggle-menu]");
    if (menuBtn) {
      menuBtn.classList.toggle("expanded");
      document.body.classList.toggle("overflow-hidden");
      document.getElementById("header")?.classList.toggle("h-screen");
      document.getElementById("gradient")?.classList.toggle("hidden");
      document.querySelector("#header nav")?.classList.toggle("hidden");
      return;
    }

    const themeBtn = e.target.closest("[data-aw-toggle-color-scheme]");
    if (themeBtn) {
      if (defaultTheme.endsWith(":only")) return;
      document.documentElement.classList.toggle("dark");
      localStorage.theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
      return;
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