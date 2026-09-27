(() => {
  "use strict";

  const I18N = window.COLORCUT_I18N;
  const LANGS = ["pt-BR", "en", "es", "de"];
  const STORAGE_KEY = "colorcut-landing-lang";

  // Cutout timings and palettes below were produced by ColorCut's own Rust
  // services (isnet-general-use background removal; 1.1.0 palette engine,
  // 8 colors) on the example photos; nothing here is hand-picked. The portrait
  // uses the licensed Photoroom cutout (ColorCut Pro) because the local model
  // drops the white top against the light wall (known ADR-005 limitation).
  const EXAMPLES = [
    { id: "averie", pro: true },
    { id: "irene", ms: 1158 },
    { id: "olena", ms: 658 },
    { id: "amber", ms: 654 },
    { id: "freddie", ms: 1079 },
    { id: "vinicius", ms: 1234 },
    { id: "mahbod", ms: 899 },
  ];

  const PALETTES = {
    averie: {
      original: [["#C9B4C1", 38.3], ["#D6C3CE", 37.5], ["#B7A7B1", 7.8], ["#BA9372", 4.7], ["#95623C", 3.9], ["#884324", 3.9], ["#5F2C11", 2.3], ["#271206", 1.6]],
      subject: [["#AD7C58", 22.5], ["#C2A991", 21.1], ["#64361B", 14.1], ["#966843", 12.5], ["#815636", 12.5], ["#461706", 9.4], ["#CCD5D7", 6.3], ["#0F0802", 1.6]],
    },
    irene: {
      original: [["#E1E1E1", 82.9], ["#578F86", 3.1], ["#F4975E", 3.1], ["#37655C", 3.1], ["#1F1810", 2.3], ["#622712", 2.3], ["#AB4F2B", 1.6], ["#26473F", 1.6]],
      subject: [["#639B92", 20.3], ["#391609", 17.2], ["#2A5950", 17.2], ["#45796F", 15.6], ["#FBC892", 10.9], ["#692210", 7.8], ["#E67546", 6.3], ["#AC4220", 4.7]],
    },
    olena: {
      original: [["#173714", 23.3], ["#2E5729", 18.8], ["#09100B", 15.6], ["#3E7226", 14.1], ["#629A3E", 12.5], ["#99C572", 7.8], ["#F3E6D8", 6.3], ["#E0BCB4", 1.6]],
      subject: [["#A2C98C", 23.5], ["#FAE3DE", 18.8], ["#CBEAB4", 18.7], ["#193E10", 12.5], ["#63954A", 12.5], ["#38701D", 7.8], ["#071804", 3.1], ["#B66B5D", 3.1]],
    },
    mahbod: {
      original: [["#6EFFFB", 36], ["#5CF4E8", 32.8], ["#F9AD2C", 10.9], ["#FE7105", 7.8], ["#51D6CD", 5.9], ["#FEE05D", 3.1], ["#FEFEFD", 3.1], ["#40AC83", 0.4]],
      subject: [["#FE980A", 49.3], ["#FE6A05", 14.8], ["#FED348", 13.3], ["#FEF4BC", 10.9], ["#FEFEFD", 7.8], ["#70E0CF", 2.3], ["#548850", 0.8], ["#BD671B", 0.8]],
    },
    freddie: {
      original: [["#C0B2A2", 23.4], ["#DED5CD", 21.9], ["#725939", 18], ["#90795A", 11.7], ["#7A8EA1", 9.4], ["#AA8E6B", 7.8], ["#3C4738", 4.7], ["#1D1F1E", 3.1]],
      subject: [["#564A3C", 20.3], ["#817963", 19.5], ["#1A291E", 18.7], ["#D3CBCA", 14.1], ["#BCAEA1", 12.5], ["#EEEEEE", 9.4], ["#205A30", 3.9], ["#488160", 1.6]],
    },
    // A landscape has no single subject, so it only shows the whole-image palette.
    anders: {
      original: [["#78656B", 21.9], ["#424A5D", 20.3], ["#17130E", 18.7], ["#262831", 17.2], ["#B9685D", 7], ["#E69A6F", 6.3], ["#040406", 6.3], ["#842015", 2.3]],
      subject: null,
    },
  };

  // Vernazza palettes for the "new in 1.1" section. OLD is the 1.0.0 pipeline
  // (plain median cut); NEW and AUTO come from the 1.1.0 engine (ADR-015/016).
  const NEXT_PALETTES = {
    old: [["#343F53", 12.5], ["#0C0C0E", 12.5], ["#201816", 12.5], ["#BF9A89", 6.3], ["#525768", 6.3], ["#352E34", 6.3], ["#7D7787", 6.2], ["#7A6C73", 6.2], ["#50444B", 6.2], ["#1D2531", 6.2], ["#9D4F47", 3.1], ["#AB8175", 3.1], ["#6F565D", 3.1], ["#624B4F", 3.1], ["#62606E", 3.1], ["#C17B61", 3.1]],
    new: [["#17151B", 17.0], ["#414859", 10.9], ["#5D545E", 10.2], ["#2B394E", 10.2], ["#896869", 10.2], ["#192536", 7.8], ["#666C84", 7.8], ["#040406", 6.3], ["#BE8C76", 4.7], ["#8C8595", 4.7], ["#441C16", 3.9], ["#EBA678", 2.3], ["#C96858", 1.2], ["#842015", 1.2], ["#A24E39", 0.8], ["#E08E66", 0.8]],
    auto: ["#10090C", "#50576A", "#63646F", "#766977", "#434B5D", "#1C1A1E", "#0F1421", "#23344C", "#252026", "#19150A", "#334156", "#64535A", "#9D7E7A", "#8A6E6F", "#33282A", "#453F4A", "#343846", "#040302", "#1A293C", "#767488", "#AB9694", "#442C33", "#938B9B", "#977474", "#593E44", "#885C5E", "#BF8368", "#332715", "#EEB890", "#D4906D", "#D0A288", "#33120D", "#F4AB76", "#D66B57", "#5B2C2E", "#EC8D5F", "#AB615A", "#BC655A", "#5A1D17", "#441311", "#73160C", "#7F3B34", "#A76F68", "#B33B1E", "#8A1F13", "#A6230F", "#F0CEB3", "#DD4F1B"],
  };

  let lang = "pt-BR";
  let currentExample = EXAMPLES[0];
  let paletteSource = "original";

  const t = (key, vars) => {
    let s = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };

  const storage = {
    get() { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch { /* private mode */ } },
  };

  function detectLang() {
    const param = new URLSearchParams(location.search).get("lang");
    const candidates = [param, storage.get(), ...(navigator.languages || [navigator.language])].filter(Boolean);
    for (const c of candidates) {
      const lower = c.toLowerCase();
      if (lower.startsWith("pt")) return "pt-BR";
      const base = lower.slice(0, 2);
      if (LANGS.includes(base)) return base;
    }
    return "en";
  }

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":");
        el.setAttribute(attr, t(key));
      });
    });
    document.querySelectorAll(".lang-switch button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
    document.querySelectorAll(".shot").forEach((fig) => {
      fig.querySelector("img").alt = fig.querySelector("figcaption").textContent;
    });
    renderTabs();
    showExample(currentExample, false);
    renderPalettes();
    renderNext();
  }

  // ---------- Before / after ----------
  const stage = document.getElementById("ba-stage");
  const beforeWrap = document.getElementById("ba-before-wrap");
  const beforeImg = document.getElementById("ba-before");
  const afterImg = document.getElementById("ba-after");
  const handle = document.getElementById("ba-handle");
  const range = document.getElementById("ba-range");
  const timeEl = document.getElementById("ba-time");
  const tabs = document.getElementById("ba-tabs");

  function setPosition(pos) {
    // Left of the handle shows the original ("before"), right shows the cutout.
    beforeWrap.style.clipPath = `inset(0 ${100 - pos}% 0 0)`;
    handle.style.left = `${pos}%`;
    range.value = String(pos);
  }

  function renderTabs() {
    tabs.innerHTML = "";
    EXAMPLES.forEach((ex, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.role = "tab";
      b.className = "ba__tab";
      b.setAttribute("aria-selected", String(ex === currentExample));
      b.tabIndex = ex === currentExample ? 0 : -1;
      b.innerHTML = `<img src="assets/examples/${ex.id}-before.jpg" alt="" loading="lazy" /><span></span>`;
      b.querySelector("span").textContent = t(`ba.cat.${ex.id}`);
      if (ex.pro) b.insertAdjacentHTML("beforeend", '<em class="ba__pro">Pro</em>');
      b.addEventListener("click", () => showExample(ex, true));
      b.addEventListener("keydown", (e) => {
        const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = EXAMPLES[(i + dir + EXAMPLES.length) % EXAMPLES.length];
        showExample(next, true);
        tabs.children[EXAMPLES.indexOf(next)].focus();
      });
      tabs.appendChild(b);
    });
  }

  function showExample(ex, resetPosition) {
    currentExample = ex;
    beforeImg.onload = () => {
      const ratio = beforeImg.naturalWidth / beforeImg.naturalHeight;
      stage.style.aspectRatio = String(ratio);
      stage.style.width = `min(100%, calc(70vh * ${ratio.toFixed(4)}))`;
    };
    beforeImg.src = `assets/examples/${ex.id}-before.jpg`;
    afterImg.src = `assets/examples/${ex.id}-after.webp?v=2`;
    const cat = t(`ba.cat.${ex.id}`);
    beforeImg.alt = `${t("ba.before")} — ${cat}`;
    afterImg.alt = `${t("ba.after")} — ${cat}`;
    timeEl.textContent = ex.pro ? t("ba.pro") : t("ba.time", { ms: ex.ms.toLocaleString(lang) });
    timeEl.previousElementSibling.classList.toggle("dot--blue", Boolean(ex.pro));
    [...tabs.children].forEach((b, i) => {
      const selected = EXAMPLES[i] === ex;
      b.setAttribute("aria-selected", String(selected));
      b.tabIndex = selected ? 0 : -1;
    });
    if (resetPosition) animateIntro();
  }

  let introFrame = 0;
  function animateIntro() {
    cancelAnimationFrame(introFrame);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setPosition(50);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setPosition(Math.round(85 - 35 * eased));
      if (p < 1) introFrame = requestAnimationFrame(step);
    };
    introFrame = requestAnimationFrame(step);
  }

  range.addEventListener("input", () => {
    cancelAnimationFrame(introFrame);
    setPosition(Number(range.value));
  });

  // Pointer drag anywhere on the stage (the range input covers it for keyboard/AT).
  stage.addEventListener("pointerdown", (e) => {
    cancelAnimationFrame(introFrame);
    const move = (ev) => {
      const r = stage.getBoundingClientRect();
      setPosition(Math.round(Math.min(100, Math.max(0, ((ev.clientX - r.left) / r.width) * 100))));
    };
    move(e);
    stage.setPointerCapture(e.pointerId);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", () => stage.removeEventListener("pointermove", move), { once: true });
  });

  document.getElementById("ba-bg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-bg]");
    if (!b) return;
    stage.dataset.bg = b.dataset.bg;
    b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });

  // ---------- Palettes ----------
  const grid = document.getElementById("palettes-grid");

  function renderPalettes() {
    grid.innerHTML = "";
    for (const [id, data] of Object.entries(PALETTES)) {
      const useSubject = paletteSource === "subject" && data.subject;
      const colors = useSubject ? data.subject : data.original;
      const card = document.createElement("article");
      card.className = "palette-card";
      const image = useSubject
        ? `<div class="palette-card__img checker"><img src="assets/examples/${id}-after.webp?v=2" alt="" loading="lazy" /></div>`
        : `<div class="palette-card__img"><img src="assets/examples/${id}-before.jpg" alt="" loading="lazy" /></div>`;
      card.innerHTML = `${image}
        <div class="palette-card__bar" aria-hidden="true">${colors.map(([hex, pct]) => `<i style="background:${hex};flex:${pct}"></i>`).join("")}</div>
        <ul class="palette-card__swatches"></ul>
        <p class="palette-card__note"></p>`;
      const list = card.querySelector("ul");
      for (const [hex, pct] of colors) {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "swatch";
        b.innerHTML = `<i style="background:${hex}"></i><code>${hex}</code><small>${pct.toLocaleString(lang)}%</small>`;
        b.setAttribute("aria-label", `${hex}, ${pct.toLocaleString(lang)}%`);
        b.addEventListener("click", () => copyHex(hex));
        li.appendChild(b);
        list.appendChild(li);
      }
      card.querySelector("img").alt = id === "anders" ? "Vernazza, Cinque Terre" : t(`ba.cat.${id}`);
      const note = card.querySelector(".palette-card__note");
      if (paletteSource === "subject" && !data.subject) note.textContent = t("pal.noSubject");
      else note.remove();
      grid.appendChild(card);
    }
  }

  document.getElementById("pal-source").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-source]");
    if (!b) return;
    paletteSource = b.dataset.source;
    b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderPalettes();
  });

  const toast = document.getElementById("toast");
  let toastTimer = 0;
  async function copyHex(hex) {
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      /* clipboard can be blocked (e.g. insecure context); still confirm the value */
    }
    toast.textContent = t("pal.copied", { hex });
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  // ---------- Coming next ----------
  function swatchButton(hex, pct) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "strip__swatch";
    b.style.background = hex;
    const label = pct === undefined ? hex : `${hex}, ${pct.toLocaleString(lang)}%`;
    b.title = label;
    b.setAttribute("aria-label", label);
    b.addEventListener("click", () => copyHex(hex));
    return b;
  }

  function renderNext() {
    const old = document.getElementById("strip-old");
    const next = document.getElementById("strip-new");
    const auto = document.getElementById("strip-auto");
    old.replaceChildren(...NEXT_PALETTES.old.map(([hex, pct]) => swatchButton(hex, pct)));
    next.replaceChildren(...NEXT_PALETTES.new.map(([hex, pct]) => swatchButton(hex, pct)));
    auto.replaceChildren(...NEXT_PALETTES.auto.map((hex) => swatchButton(hex)));
  }

  // ---------- Screenshot lightbox ----------
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  document.querySelectorAll(".shot__open").forEach((btn) => {
    btn.addEventListener("click", () => {
      const img = btn.querySelector("img");
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxCaption.textContent = btn.parentElement.querySelector("figcaption").textContent;
      if (typeof lightbox.showModal === "function") lightbox.showModal();
      else window.open(img.src, "_blank", "noopener");
    });
  });
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.close();
  });

  // ---------- Language switch ----------
  document.querySelector(".lang-switch").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lang]");
    if (!b) return;
    storage.set(b.dataset.lang);
    const url = new URL(location.href);
    url.searchParams.set("lang", b.dataset.lang);
    history.replaceState(null, "", url);
    applyLang(b.dataset.lang);
  });

  // ---------- Header shadow on scroll ----------
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  applyLang(detectLang());
  setPosition(50);
})();
