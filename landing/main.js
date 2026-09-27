(() => {
  "use strict";

  const I18N = window.COLORCUT_I18N;
  const LANGS = ["pt-BR", "en", "es", "de"];
  const STORAGE_KEY = "colorcut-landing-lang";

  // Cutout timings and palettes below were produced by ColorCut's own Rust
  // services (isnet-general-use background removal + weighted median cut,
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
      original: [["#CFBCC7", 25], ["#D4C5CF", 25], ["#C8B0B8", 12.5], ["#CBB6C2", 12.5], ["#9B6845", 6.3], ["#C1A8AD", 6.3], ["#542E19", 6.2], ["#AC968B", 6.2]],
      subject: [["#BD9C7E", 12.5], ["#C6C2BB", 12.5], ["#AF8C6D", 12.5], ["#67391E", 12.5], ["#986944", 12.5], ["#908070", 12.5], ["#371C0D", 12.5], ["#874D2C", 12.5]],
    },
    irene: {
      original: [["#DCDCD9", 25], ["#F4EFEC", 24.8], ["#485A4F", 12.5], ["#F1E3DC", 12.5], ["#C0A18E", 6.3], ["#D4D1CB", 6.3], ["#EFC8B0", 6.3], ["#EED9CE", 6.3]],
      subject: [["#3F6E65", 24.9], ["#679D94", 12.5], ["#C7C1A9", 12.5], ["#3D291B", 12.5], ["#864125", 12.5], ["#1E2C24", 12.5], ["#88826A", 6.3], ["#F2965C", 6.3]],
    },
    olena: {
      original: [["#121E12", 25], ["#78A857", 12.5], ["#CFD6B3", 12.5], ["#3D642D", 12.5], ["#20391D", 12.5], ["#2A5022", 12.5], ["#647F44", 6.3], ["#4D7736", 6.2]],
      subject: [["#BFE1A8", 12.5], ["#4D602D", 12.5], ["#97BF7D", 12.5], ["#E5E8CE", 12.5], ["#BFBB98", 12.5], ["#14350D", 12.5], ["#6D9E4B", 12.5], ["#EDCEC9", 12.5]],
    },
    mahbod: {
      original: [["#64FBF0", 24.9], ["#FA8D0C", 12.5], ["#E6C974", 12.5], ["#5AF1E6", 12.5], ["#6EFEFC", 12.5], ["#8AFEFD", 12.5], ["#52D5CB", 6.3], ["#55EADF", 6.3]],
      subject: [["#FBD378", 12.5], ["#FEFCE0", 12.5], ["#FEA30C", 12.5], ["#CCAF5E", 12.5], ["#FEC14E", 12.5], ["#EE8619", 12.5], ["#FB8E0A", 12.5], ["#FE7E05", 12.5]],
    },
    freddie: {
      original: [["#444335", 12.5], ["#7A6142", 12.5], ["#8A7959", 12.5], ["#788894", 12.5], ["#AEA08E", 12.5], ["#CCBFB0", 12.5], ["#C9C1BD", 12.5], ["#DED5CD", 12.5]],
      subject: [["#4A503A", 12.5], ["#626A54", 12.5], ["#A9A395", 12.5], ["#CEC7C7", 12.5], ["#E7E5E6", 12.5], ["#3B382E", 12.5], ["#877F67", 12.5], ["#1C2720", 12.5]],
    },
    // A landscape has no single subject, so it only shows the whole-image palette.
    anders: {
      original: [["#161212", 25], ["#98756F", 12.5], ["#514E5A", 12.5], ["#745458", 12.5], ["#292933", 12.5], ["#343F53", 12.5], ["#BF9A89", 6.3], ["#7D7787", 6.2]],
      subject: null,
    },
  };

  // Vernazza palettes for the "coming next" section. OLD is the 1.0.0 pipeline
  // (plain median cut); NEW and AUTO come from the unreleased ADR-015/016 engine.
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
