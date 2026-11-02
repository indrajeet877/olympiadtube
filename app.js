(() => {
  "use strict";

  const CFG = Object.assign(
    {
      platformId: "jee",
      brandName: "JEETube",
      brandSymbol: "∑",
      tagline: "IIT-JEE Main & Advanced",
      storagePrefix: "jeetube",
      heroBadge: "100% Pure YouTube Trend Ranking · Zero Paid or Coaching Bias",
      heroTitle: "Stuck on a chapter? Fix it with the #1 trending video.",
      heroSubtitle:
        "Every chapter ranked purely by real YouTube student traction, monthly view velocity, and watch depth.",
      searchPlaceholder: "Search any chapter, concept, or teacher…",
      quickProblems: [],
      subjectMeta: {},
      acronyms: {},
      ecosystem: [],
    },
    window.TUBE_CONFIG || {}
  );

  const SAVED_KEY = `${CFG.storagePrefix}_saved_v2`;
  const DONE_KEY = `${CFG.storagePrefix}_done_v2`;
  const CARDS_PER_CHAPTER_COLLAPSED = 4;
  const FLAT_PAGE_SIZE = 48;

  const WEIGHT_RANK = {
    "Very High": 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const state = {
    meta: null,
    syllabus: [],
    syllabusByNo: new Map(),
    subjects: [],
    educators: [],
    videos: [],
    subject: "All",
    mode: "trending",
    query: "",
    chapterNo: 0,
    sort: "trending",
    unit: "",
    educator: "",
    exam: "all",
    classLevel: "all",
    lang: "all",
    type: "all",
    chapterSearch: "",
    expandedChapters: new Set(),
    flatLimit: FLAT_PAGE_SIZE,
    saved: loadSet(SAVED_KEY),
    doneChapters: loadSet(DONE_KEY),
    rescueSubject: "All",
    rescueChapter: 0,
    rescueSituation: "backlog",
  };

  const el = {
    brandGlyph: document.getElementById("brand-glyph"),
    brandName: document.getElementById("brand-name"),
    brandTagline: document.getElementById("brand-tagline"),
    ecosystemNav: document.getElementById("ecosystem-nav"),
    openRescueBtn: document.getElementById("open-rescue-btn"),
    savedDeckBtn: document.getElementById("saved-deck-btn"),
    cntSaved: document.getElementById("cnt-saved"),
    themeToggle: document.getElementById("theme-toggle"),
    heroBadge: document.getElementById("hero-badge"),
    heroStats: document.getElementById("hero-stats"),
    heroTitle: document.getElementById("hero-title"),
    heroSubtitle: document.getElementById("hero-subtitle"),
    q: document.getElementById("q"),
    keyHint: document.getElementById("key-hint"),
    clearQ: document.getElementById("clear-q"),
    quickProblems: document.getElementById("quick-problems"),
    subline: document.getElementById("subline"),
    subjectTabs: document.getElementById("subject-tabs"),
    intentBtns: Array.from(document.querySelectorAll(".intent-btn")),
    openRefineBtn: document.getElementById("open-refine-btn"),
    refineBadge: document.getElementById("refine-badge"),
    clearChapterBtn: document.getElementById("clear-chapter-btn"),
    statProgress: document.getElementById("stat-progress"),
    syllabusProgress: document.getElementById("syllabus-progress"),
    chFilter: document.getElementById("ch-filter"),
    syllabusTree: document.getElementById("syllabus-tree"),
    openSyllabusDrawer: document.getElementById("open-syllabus-drawer"),
    mobileChLabel: document.getElementById("mobile-ch-label"),
    count: document.getElementById("count"),
    liveStatus: document.getElementById("live-status"),
    activeFilters: document.getElementById("active-filters"),
    spotlight: document.getElementById("trending-spotlight"),
    list: document.getElementById("list"),
    rescueDialog: document.getElementById("rescue-dialog"),
    rescueSubject: document.getElementById("rescue-subject"),
    rescueChapter: document.getElementById("rescue-chapter"),
    situationCards: Array.from(document.querySelectorAll(".situation-card")),
    rescueResultsLabel: document.getElementById("rescue-results-label"),
    rescueApplyMain: document.getElementById("rescue-apply-main"),
    rescueResults: document.getElementById("rescue-results"),
    refineDialog: document.getElementById("refine-dialog"),
    sortSelect: document.getElementById("sort-select"),
    unitSelect: document.getElementById("unit-select"),
    educatorSelect: document.getElementById("educator-select"),
    examSelect: document.getElementById("exam-select"),
    classSelect: document.getElementById("class-select"),
    langSelect: document.getElementById("lang-select"),
    typeSelect: document.getElementById("type-select"),
    refineResetBtn: document.getElementById("refine-reset-btn"),
    syllabusDialog: document.getElementById("syllabus-dialog"),
    drawerChFilter: document.getElementById("drawer-ch-filter"),
    drawerSyllabusTree: document.getElementById("drawer-syllabus-tree"),
    playerDialog: document.getElementById("player-dialog"),
    playerBadge: document.getElementById("player-badge"),
    playerChannel: document.getElementById("player-channel"),
    playerExt: document.getElementById("player-ext"),
    playerTitle: document.getElementById("player-title"),
    playerStage: document.getElementById("player-stage"),
    playerSamples: document.getElementById("player-samples"),
  };

  function loadSet(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function saveSet(key, setObj) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(setObj)));
    } catch {}
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function compactNum(n) {
    const val = Number(n) || 0;
    if (val >= 1_000_000) {
      const m = val / 1_000_000;
      return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (val >= 1_000) {
      const k = val / 1_000;
      return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}K`;
    }
    return String(val);
  }

  function formatAge(v) {
    if (v.published) {
      return v.published.replace(/^Streamed\s+/i, "").trim();
    }
    const m = Number(v.age_months) || 0;
    if (!m) return "";
    if (m < 1) return "this month";
    if (m < 12) return `${Math.round(m)} mo ago`;
    const yrs = Math.round(m / 12);
    return `${yrs} yr${yrs > 1 ? "s" : ""} ago`;
  }

  function itemKey(v) {
    return `${v.chapter_no}:${v.provider}:${v.video_id}`;
  }

  function shortRef(v) {
    const clean = String(v.video_id || "").replace(/[^a-zA-Z0-9]/g, "");
    return `C${pad2(v.chapter_no)}-${clean.slice(-6) || "yt"}`;
  }

  function makeHiddenSuffix(text) {
    const span = document.createElement("span");
    span.className = "visually-hidden";
    span.textContent = ` (${text})`;
    return span;
  }

  function creatorInitials(name) {
    const words = String(name || "YT")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return "YT";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function getTractionPill(v) {
    const vpm = Number(v._velocity ?? v.views_per_month) || 0;
    const views = Number(v.view_count) || 0;
    if (v.provider === "playlist") {
      const lessons = Number(v.lesson_count) || 0;
      if (vpm >= 15000) {
        return { text: `🔥 ${compactNum(vpm)}/mo`, cls: "is-hot" };
      }
      return {
        text: lessons > 0 ? `📚 ${lessons} Lectures` : "📚 Full Playlist",
        cls: "",
      };
    }
    if (vpm >= 25000) {
      return { text: `🔥 ${compactNum(vpm)}/mo`, cls: "is-hot" };
    }
    if (views >= 750000) {
      return { text: `⭐ ${compactNum(views)} views`, cls: "is-loved" };
    }
    if (vpm >= 5000) {
      return { text: `📈 ${compactNum(vpm)}/mo`, cls: "" };
    }
    if (views > 0) {
      return { text: `▶ ${compactNum(views)} views`, cls: "" };
    }
    return { text: v.trend_badge || "▶ Lecture", cls: "" };
  }

  function getMetricLine(v) {
    if (v.provider === "playlist") {
      const parts = [];
      if (v.lesson_count) parts.push(`${v.lesson_count} lectures`);
      parts.push("Complete playlist");
      if (v.language) parts.push(v.language);
      return parts.join(" · ");
    }
    const parts = [];
    if (v.view_count > 0) parts.push(`${compactNum(v.view_count)} views`);
    const age = formatAge(v);
    if (age) parts.push(age);
    if (!parts.length && v.format) parts.push(v.format);
    return parts.join(" · ");
  }

  /* Pure YouTube Trend Comparator — ZERO Coaching/Institute Priority */
  function comparePureTrend(a, b) {
    const rDiff = (Number(b._rankTrend) || 0) - (Number(a._rankTrend) || 0);
    if (Math.abs(rDiff) > 0.001) return rDiff;
    const vpmDiff = (Number(b._velocity) || 0) - (Number(a._velocity) || 0);
    if (vpmDiff !== 0) return vpmDiff;
    return (Number(b.view_count) || 0) - (Number(a.view_count) || 0);
  }

  function compareItems(a, b, sortKey) {
    if (sortKey === "views") {
      const vDiff = (Number(b.view_count) || 0) - (Number(a.view_count) || 0);
      if (vDiff !== 0) return vDiff;
      return comparePureTrend(a, b);
    }
    if (sortKey === "duration_asc") {
      const da = Number(a.duration_sec) > 0 ? Number(a.duration_sec) : 9999999;
      const db = Number(b.duration_sec) > 0 ? Number(b.duration_sec) : 9999999;
      if (da !== db) return da - db;
      return comparePureTrend(a, b);
    }
    if (sortKey === "duration_desc") {
      const dDiff = (Number(b.duration_sec) || 0) - (Number(a.duration_sec) || 0);
      if (dDiff !== 0) return dDiff;
      return comparePureTrend(a, b);
    }
    if (sortKey === "lessons") {
      const lDiff = (Number(b.lesson_count) || 0) - (Number(a.lesson_count) || 0);
      if (lDiff !== 0) return lDiff;
      return comparePureTrend(a, b);
    }
    return comparePureTrend(a, b);
  }

  function applyStaticBrandConfig() {
    document.documentElement.dataset.platform = CFG.platformId;
    if (el.brandGlyph) el.brandGlyph.textContent = CFG.brandSymbol;
    if (el.brandName) el.brandName.textContent = CFG.brandName;
    if (el.brandTagline) el.brandTagline.textContent = CFG.tagline;
    if (el.heroBadge) el.heroBadge.textContent = CFG.heroBadge;
    if (el.heroTitle) el.heroTitle.textContent = CFG.heroTitle;
    if (el.heroSubtitle) el.heroSubtitle.textContent = CFG.heroSubtitle;
    if (el.q && CFG.searchPlaceholder) el.q.placeholder = CFG.searchPlaceholder;

    if (el.ecosystemNav && Array.isArray(CFG.ecosystem) && CFG.ecosystem.length) {
      el.ecosystemNav.replaceChildren();
      for (const item of CFG.ecosystem) {
        const a = document.createElement("a");
        const isCurrent = item.id === CFG.platformId;
        a.className = `eco-pill${isCurrent ? " is-active" : ""}`;
        a.href = isCurrent ? "./" : item.url;
        if (isCurrent) a.setAttribute("aria-current", "page");

        const dot = document.createElement("span");
        dot.className = `eco-dot is-${item.id}`;
        dot.setAttribute("aria-hidden", "true");
        a.append(dot, document.createTextNode(item.name));
        el.ecosystemNav.appendChild(a);
      }
    }

    if (el.quickProblems && Array.isArray(CFG.quickProblems)) {
      el.quickProblems.replaceChildren();
      for (const prob of CFG.quickProblems) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "problem-pill";
        btn.textContent = prob.label;
        btn.addEventListener("click", () => {
          state.subject = prob.subject || "All";
          state.chapterNo = prob.chapterNo || 0;
          state.query = prob.query || "";
          state.mode = prob.mode || "trending";
          if (el.q) el.q.value = state.query;
          syncSearchClear();
          renderAll({ announce: true });
        });
        el.quickProblems.appendChild(btn);
      }
    }
  }

  function initThemeToggle() {
    const syncMetaFromStorage = () => {
      const meta = document.querySelector('meta[name="color-scheme"]');
      if (!meta) return;
      try {
        meta.content = localStorage.getItem("color-scheme") ?? "light dark";
      } catch {}
    };
    window.addEventListener("storage", (e) => {
      if (e.key === "color-scheme") syncMetaFromStorage();
    });
    if (!el.themeToggle) return;
    el.themeToggle.addEventListener("click", () => {
      const meta = document.querySelector('meta[name="color-scheme"]');
      if (!meta) return;
      const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
      const sysScheme = prefersDark ? "dark" : "light";
      let stored = null;
      try {
        stored = localStorage.getItem("color-scheme");
      } catch {}
      const rendered = stored === "dark" || stored === "light" ? stored : sysScheme;
      const target = rendered === "dark" ? "light" : "dark";
      if (target === sysScheme) {
        try {
          localStorage.removeItem("color-scheme");
        } catch {}
        meta.content = "light dark";
      } else {
        try {
          localStorage.setItem("color-scheme", target);
        } catch {}
        meta.content = target;
      }
    });
  }

  function initLightDismissFallback() {
    if ("closedBy" in HTMLDialogElement.prototype) return;
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener("pointerdown", (e) => {
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener("pointerup", (e) => {
        if (pressedOutside && outside(e, dialog)) dialog.close();
      });
    }
  }

  function indexRecord(v) {
    const chExtra = CFG.acronyms[v.chapter_no] || "";
    v._key = itemKey(v);
    const views = Number(v.view_count) || 0;
    const ageM = Math.max(Number(v.age_months) || 12, 0.5);
    if (v.provider === "youtube" && views > 0) {
      // Bayesian-smoothed monthly velocity prevents 1-week spikes from outranking sustained viral hits
      v._velocity = Math.round(views / Math.max(ageM + 1.5, 2.5));
      v._rankTrend = Math.log10(v._velocity + 10) * 30 + Math.log10(views + 10) * 0.25;
    } else {
      v._velocity = Number(v.views_per_month) || 0;
      v._rankTrend = Number(v.trend_score) || 0;
    }
    v._search = [
      v.title,
      v.chapter,
      `ch ${v.chapter_no}`,
      `chapter ${v.chapter_no}`,
      v.unit,
      v.subject,
      v.educator,
      v.channel,
      v.format,
      v.language,
      v.class_level,
      v.target_exam,
      chExtra,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function matchesMode(v, mode) {
    if (mode === "oneshot") {
      return (
        v.format === "One-Shot" ||
        (v.provider === "youtube" &&
          /one\s*-?\s*shot|complete\s+chapter|full\s+chapter|marathon|mahamarathon|rapid\s+revision|in\s+\d+\s*hours?/i.test(
            v.title || ""
          ))
      );
    }
    if (mode === "playlists") {
      return v.provider === "playlist" || v.format === "Full Course";
    }
    if (mode === "pyq") {
      return (
        v.format === "PYQ & Mock" ||
        /pyq|previous\s+year|problem|questions?|mock|booster|ranker|challenge|paper|olympiad\s+problems|numericals?|ncert\s+solutions?|important\s+questions/i.test(
          `${v.title || ""} ${v.format || ""}`
        )
      );
    }
    if (mode === "top_rated") {
      return v.provider === "youtube" ? (Number(v.view_count) || 0) > 0 : true;
    }
    return true;
  }

  function getFilteredVideos() {
    const tokens = state.query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return state.videos.filter((v) => {
      if (state.subject === "Saved") {
        if (!state.saved.has(v._key)) return false;
      } else if (state.subject !== "All" && v.subject !== state.subject) {
        return false;
      }

      if (state.chapterNo && v.chapter_no !== state.chapterNo) return false;
      if (!matchesMode(v, state.mode)) return false;
      if (state.unit && v.unit !== state.unit) return false;
      if (state.educator && v.educator !== state.educator && v.channel !== state.educator) {
        return false;
      }
      if (state.exam !== "all" && v.target_exam !== state.exam) return false;
      if (state.classLevel !== "all" && v.class_level !== state.classLevel) return false;
      if (state.lang !== "all" && v.language !== state.lang) return false;
      if (state.type !== "all" && v.provider !== state.type) return false;

      if (tokens.length) {
        for (const tok of tokens) {
          if (!v._search.includes(tok)) return false;
        }
      }
      return true;
    });
  }

  function effectiveSortKey() {
    if (state.mode === "top_rated" && state.sort === "trending") {
      return "views";
    }
    return state.sort;
  }

  function isFlatLeaderboardMode() {
    const sk = effectiveSortKey();
    return (
      sk === "views" ||
      sk === "duration_asc" ||
      sk === "duration_desc" ||
      sk === "lessons"
    );
  }

  function populateSelectOptions() {
    // Units
    if (el.unitSelect) {
      const units = Array.from(
        new Set(
          state.syllabus
            .filter((s) => state.subject === "All" || state.subject === "Saved" || s.subject === state.subject)
            .map((s) => s.unit)
            .filter(Boolean)
        )
      );
      const prev = state.unit;
      el.unitSelect.replaceChildren();
      const def = document.createElement("option");
      def.value = "";
      def.textContent = "All Syllabus Units";
      el.unitSelect.appendChild(def);
      for (const u of units) {
        const opt = document.createElement("option");
        opt.value = u;
        opt.textContent = u;
        el.unitSelect.appendChild(opt);
      }
      el.unitSelect.value = units.includes(prev) ? prev : "";
      state.unit = el.unitSelect.value;
    }

    // Educators (sorted by total trending reach, NOT coaching priority)
    if (el.educatorSelect && el.educatorSelect.options.length <= 1) {
      const byEducator = new Map();
      for (const v of state.videos) {
        const name = v.educator || v.channel;
        if (!name) continue;
        const cur = byEducator.get(name) || { count: 0, maxTrend: 0 };
        cur.count += 1;
        cur.maxTrend = Math.max(cur.maxTrend, Number(v.trend_score) || 0);
        byEducator.set(name, cur);
      }
      const sorted = Array.from(byEducator.entries()).sort(
        (a, b) => b[1].count - a[1].count || b[1].maxTrend - a[1].maxTrend
      );
      for (const [name, info] of sorted) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = `${name} (${info.count})`;
        el.educatorSelect.appendChild(opt);
      }
    }

    // Dynamic Target Exam Tiers
    if (el.examSelect && el.examSelect.options.length <= 1) {
      const exams = Array.from(
        new Set(state.videos.map((v) => v.target_exam).filter(Boolean))
      ).sort();
      for (const ex of exams) {
        const opt = document.createElement("option");
        opt.value = ex;
        opt.textContent = ex;
        el.examSelect.appendChild(opt);
      }
    }

    // Dynamic Class Levels
    if (el.classSelect && el.classSelect.options.length <= 1) {
      const classes = Array.from(
        new Set(state.videos.map((v) => v.class_level).filter(Boolean))
      ).sort();
      for (const cl of classes) {
        const opt = document.createElement("option");
        opt.value = cl;
        opt.textContent = cl;
        el.classSelect.appendChild(opt);
      }
    }

    // Dynamic Languages
    if (el.langSelect && el.langSelect.options.length <= 1) {
      const langs = Array.from(
        new Set(state.videos.map((v) => v.language).filter(Boolean))
      ).sort();
      for (const lg of langs) {
        const opt = document.createElement("option");
        opt.value = lg;
        opt.textContent = lg;
        el.langSelect.appendChild(opt);
      }
    }
  }

  function renderSubjectTabs() {
    if (!el.subjectTabs) return;
    el.subjectTabs.replaceChildren();

    const subjCounts = new Map();
    for (const v of state.videos) {
      subjCounts.set(v.subject, (subjCounts.get(v.subject) || 0) + 1);
    }

    const items = [
      { key: "All", label: "All Subjects", icon: "✦", count: state.videos.length },
      ...state.subjects.map((s) => {
        const meta = CFG.subjectMeta[s] || {};
        return {
          key: s,
          label: meta.short || s,
          icon: meta.icon || "•",
          count: subjCounts.get(s) || 0,
        };
      }),
    ];

    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "radio");
      btn.className = "subj-pill-btn";
      btn.dataset.subject = item.key;
      const checked = state.subject === item.key;
      btn.setAttribute("aria-checked", checked ? "true" : "false");
      btn.tabIndex = checked || (state.subject === "Saved" && item.key === "All") ? 0 : -1;

      const glyph = document.createElement("span");
      glyph.className = "subj-glyph";
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = item.icon;

      const txt = document.createElement("span");
      txt.textContent = item.label;

      const cnt = document.createElement("span");
      cnt.className = "subj-mini-cnt";
      cnt.textContent = String(item.count);

      btn.append(glyph, txt, cnt);
      btn.addEventListener("click", () => {
        state.subject = item.key;
        if (state.chapterNo) {
          const ch = state.syllabusByNo.get(state.chapterNo);
          if (ch && item.key !== "All" && ch.subject !== item.key) {
            state.chapterNo = 0;
          }
        }
        state.flatLimit = FLAT_PAGE_SIZE;
        populateSelectOptions();
        renderAll({ announce: true });
      });
      el.subjectTabs.appendChild(btn);
    });
  }

  function bindSubjectRadiogroupKeys() {
    if (!el.subjectTabs) return;
    el.subjectTabs.addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
      const radios = Array.from(el.subjectTabs.querySelectorAll('[role="radio"]'));
      if (!radios.length) return;
      const idx = Math.max(0, radios.indexOf(document.activeElement));
      let nextIdx = idx;
      if (e.key === "ArrowRight") nextIdx = (idx + 1) % radios.length;
      if (e.key === "ArrowLeft") nextIdx = (idx - 1 + radios.length) % radios.length;
      if (e.key === "Home") nextIdx = 0;
      if (e.key === "End") nextIdx = radios.length - 1;
      e.preventDefault();
      radios[nextIdx].focus();
      radios[nextIdx].click();
    });
  }

  function renderSyllabusTrees(filteredVideos) {
    const chCounts = new Map();
    for (const v of filteredVideos) {
      chCounts.set(v.chapter_no, (chCounts.get(v.chapter_no) || 0) + 1);
    }

    const buildInto = (container, filterQuery, closeDrawerOnPick) => {
      if (!container) return;
      container.replaceChildren();
      const q = (filterQuery || "").toLowerCase().trim();

      const visibleChapters = state.syllabus.filter((ch) => {
        if (
          state.subject !== "All" &&
          state.subject !== "Saved" &&
          ch.subject !== state.subject
        ) {
          return false;
        }
        if (!q) return true;
        const extra = CFG.acronyms[ch.chapter_no] || "";
        const hay = `${ch.chapter_no} ${pad2(ch.chapter_no)} ${ch.chapter} ${ch.unit} ${ch.subject} ${extra}`.toLowerCase();
        return hay.includes(q);
      });

      const byUnit = new Map();
      for (const ch of visibleChapters) {
        const uKey =
          state.subject === "All" || state.subject === "Saved"
            ? `${(CFG.subjectMeta[ch.subject] && CFG.subjectMeta[ch.subject].short) || ch.subject} · ${ch.unit}`
            : ch.unit;
        if (!byUnit.has(uKey)) byUnit.set(uKey, []);
        byUnit.get(uKey).push(ch);
      }

      if (!byUnit.size) {
        const empty = document.createElement("p");
        empty.className = "result-count";
        empty.style.padding = "0.75rem";
        empty.textContent = "No matching chapters.";
        container.appendChild(empty);
        return;
      }

      for (const [unitLabel, chapters] of byUnit.entries()) {
        const group = document.createElement("div");
        group.className = "unit-group";

        const heading = document.createElement("p");
        heading.className = "unit-heading";
        heading.textContent = unitLabel;
        group.appendChild(heading);

        const ul = document.createElement("ul");
        ul.className = "ch-nav-list";

        for (const ch of chapters) {
          const li = document.createElement("li");
          const btn = document.createElement("button");
          btn.type = "button";
          const isCurrent = state.chapterNo === ch.chapter_no;
          const isDone = state.doneChapters.has(String(ch.chapter_no));
          btn.className = `ch-nav-btn${isDone ? " is-done" : ""}`;
          if (isCurrent) btn.setAttribute("aria-current", "true");

          const noSpan = document.createElement("span");
          noSpan.className = "ch-no";
          noSpan.textContent = isDone ? "✓" : pad2(ch.chapter_no);

          const nameSpan = document.createElement("span");
          nameSpan.className = "ch-name";
          nameSpan.textContent = ch.chapter;

          const cntSpan = document.createElement("span");
          cntSpan.className = "ch-cnt";
          const c = state.chapterNo
            ? ch.count || 0
            : chCounts.get(ch.chapter_no) || 0;
          cntSpan.textContent = String(c);

          btn.append(noSpan, nameSpan, cntSpan);
          btn.addEventListener("click", () => {
            state.chapterNo =
              state.chapterNo === ch.chapter_no ? 0 : ch.chapter_no;
            state.flatLimit = FLAT_PAGE_SIZE;
            if (closeDrawerOnPick && el.syllabusDialog?.open) {
              el.syllabusDialog.close();
            }
            renderAll({ announce: true });
            document.getElementById("main-content")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });

          li.appendChild(btn);
          ul.appendChild(li);
        }

        group.appendChild(ul);
        container.appendChild(group);
      }
    };

    buildInto(el.syllabusTree, el.chFilter?.value || "", false);
    buildInto(el.drawerSyllabusTree, el.drawerChFilter?.value || "", true);
  }

  function updateChromeAndCounters() {
    const totalChapters = state.syllabus.length || 1;
    const doneCount = state.syllabus.filter((s) =>
      state.doneChapters.has(String(s.chapter_no))
    ).length;

    if (el.statProgress) {
      el.statProgress.textContent = `${doneCount} / ${state.syllabus.length}`;
    }
    if (el.syllabusProgress) {
      el.syllabusProgress.max = totalChapters;
      el.syllabusProgress.value = doneCount;
    }

    if (el.cntSaved) {
      el.cntSaved.textContent = String(state.saved.size);
    }
    if (el.savedDeckBtn) {
      el.savedDeckBtn.setAttribute(
        "aria-pressed",
        state.subject === "Saved" ? "true" : "false"
      );
    }

    if (el.clearChapterBtn) {
      el.clearChapterBtn.hidden = !state.chapterNo;
    }

    if (el.mobileChLabel) {
      if (state.chapterNo) {
        const ch = state.syllabusByNo.get(state.chapterNo);
        el.mobileChLabel.textContent = ch
          ? `Ch ${pad2(ch.chapter_no)}`
          : "Chapters";
      } else {
        el.mobileChLabel.textContent = `Chapters (${state.syllabus.length})`;
      }
    }

    el.intentBtns.forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        btn.dataset.mode === state.mode ? "true" : "false"
      );
    });

    const refineCount = [
      state.sort !== "trending",
      Boolean(state.unit),
      Boolean(state.educator),
      state.exam !== "all",
      state.classLevel !== "all",
      state.lang !== "all",
      state.type !== "all",
    ].filter(Boolean).length;

    if (el.refineBadge) {
      el.refineBadge.hidden = refineCount === 0;
      el.refineBadge.textContent = String(refineCount);
    }
  }

  function renderActiveFilterPills() {
    if (!el.activeFilters) return;
    el.activeFilters.replaceChildren();

    const chips = [];
    if (state.subject === "Saved") {
      chips.push({
        label: "★ Saved Deck",
        clear: () => {
          state.subject = "All";
        },
      });
    }
    if (state.chapterNo) {
      const ch = state.syllabusByNo.get(state.chapterNo);
      chips.push({
        label: ch ? `Ch ${pad2(ch.chapter_no)}: ${ch.chapter}` : `Ch ${state.chapterNo}`,
        clear: () => {
          state.chapterNo = 0;
        },
      });
    }
    if (state.query) {
      chips.push({
        label: `“${state.query}”`,
        clear: () => {
          state.query = "";
          if (el.q) el.q.value = "";
          syncSearchClear();
        },
      });
    }
    if (state.unit) {
      chips.push({
        label: `Unit: ${state.unit}`,
        clear: () => {
          state.unit = "";
          if (el.unitSelect) el.unitSelect.value = "";
        },
      });
    }
    if (state.educator) {
      chips.push({
        label: `Teacher: ${state.educator}`,
        clear: () => {
          state.educator = "";
          if (el.educatorSelect) el.educatorSelect.value = "";
        },
      });
    }
    if (state.exam !== "all") {
      chips.push({
        label: state.exam,
        clear: () => {
          state.exam = "all";
          if (el.examSelect) el.examSelect.value = "all";
        },
      });
    }
    if (state.classLevel !== "all") {
      chips.push({
        label: state.classLevel,
        clear: () => {
          state.classLevel = "all";
          if (el.classSelect) el.classSelect.value = "all";
        },
      });
    }
    if (state.lang !== "all") {
      chips.push({
        label: state.lang,
        clear: () => {
          state.lang = "all";
          if (el.langSelect) el.langSelect.value = "all";
        },
      });
    }
    if (state.type !== "all") {
      chips.push({
        label: state.type === "playlist" ? "Playlists Only" : "Single Videos Only",
        clear: () => {
          state.type = "all";
          if (el.typeSelect) el.typeSelect.value = "all";
        },
      });
    }
    if (state.sort !== "trending") {
      const sortText =
        el.sortSelect?.selectedOptions?.[0]?.textContent?.replace(/^[^\w]+/, "") ||
        state.sort;
      chips.push({
        label: `Sort: ${sortText}`,
        clear: () => {
          state.sort = "trending";
          if (el.sortSelect) el.sortSelect.value = "trending";
        },
      });
    }

    for (const c of chips) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-pill";
      btn.setAttribute("aria-label", `Remove filter ${c.label}`);
      btn.textContent = `${c.label} ✕`;
      btn.addEventListener("click", () => {
        c.clear();
        renderAll({ announce: true });
      });
      el.activeFilters.appendChild(btn);
    }

    if (chips.length >= 2) {
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "clear-all-pill";
      reset.textContent = "Reset all";
      reset.addEventListener("click", resetAllFilters);
      el.activeFilters.appendChild(reset);
    }
  }

  function resolveThumbUrls(v) {
    const vid =
      v.embed_video_id || (v.provider === "youtube" ? v.video_id : "");
    const raw = String(v.thumbnail || "").trim();
    const list = [];
    if (vid && /^[A-Za-z0-9_-]{11}$/.test(vid)) {
      list.push(`https://i.ytimg.com/vi/${vid}/hq720.jpg`);
      list.push(`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`);
    }
    if (raw && !list.includes(raw)) {
      list.push(raw);
    }
    return list;
  }

  function createThumbnailImage(v, opts = {}) {
    const urls = resolveThumbUrls(v);
    if (!urls.length) {
      const fb = document.createElement("div");
      fb.className = "thumb-fallback";
      fb.textContent = `${v.educator || v.channel || CFG.brandName} · ${v.chapter}`;
      return fb;
    }
    let idx = 0;
    const img = document.createElement("img");
    img.src = urls[0];
    img.alt = "";
    img.width = 480;
    img.height = 270;
    img.decoding = "async";
    if (opts.highPriority) {
      img.fetchPriority = "high";
    } else if (opts.lazy) {
      img.loading = "lazy";
    }
    img.addEventListener("error", () => {
      idx += 1;
      if (idx < urls.length) {
        img.src = urls[idx];
        return;
      }
      const fb = document.createElement("div");
      fb.className = "thumb-fallback";
      fb.textContent = `${v.educator || v.channel || CFG.brandName}`;
      img.replaceWith(fb);
    });
    return img;
  }

  function createPlayVeil() {
    const veil = document.createElement("span");
    veil.className = "play-veil";
    veil.setAttribute("aria-hidden", "true");
    const circle = document.createElement("span");
    circle.className = "play-circle";
    circle.textContent = "▶";
    veil.appendChild(circle);
    return veil;
  }

  /* Cinematic #1 Trending Bento Spotlight */
  function renderSpotlight(filtered) {
    if (!el.spotlight) return;
    const showSpotlight =
      !state.chapterNo &&
      !state.query &&
      state.subject !== "Saved" &&
      !state.unit &&
      !state.educator &&
      !isFlatLeaderboardMode();

    if (!showSpotlight || filtered.length < 4) {
      el.spotlight.hidden = true;
      el.spotlight.replaceChildren();
      return;
    }

    // Prefer single videos with rich thumbnails & velocity for Spotlight, fallback to any
    const pool = filtered
      .filter((v) => v.thumbnail)
      .slice()
      .sort(comparePureTrend);

    if (pool.length < 4) {
      el.spotlight.hidden = true;
      el.spotlight.replaceChildren();
      return;
    }

    const picked = [];
    const seenChapters = new Set();
    for (const v of pool) {
      if (seenChapters.has(v.chapter_no)) continue;
      picked.push(v);
      seenChapters.add(v.chapter_no);
      if (picked.length === 4) break;
    }
    if (picked.length < 4) {
      for (const v of pool) {
        if (!picked.includes(v)) picked.push(v);
        if (picked.length === 4) break;
      }
    }

    const [hero, ...runners] = picked;
    el.spotlight.hidden = false;
    el.spotlight.replaceChildren();

    const head = document.createElement("div");
    head.className = "spotlight-head";
    const h2 = document.createElement("h2");
    h2.id = "spotlight-heading";
    const subjTitle =
      state.subject === "All"
        ? CFG.brandName
        : (CFG.subjectMeta[state.subject] && CFG.subjectMeta[state.subject].short) ||
          state.subject;
    h2.textContent = `🔥 Trending Now on YouTube · ${subjTitle}`;

    const sub = document.createElement("span");
    sub.className = "spotlight-sub";
    sub.textContent = "Ranked strictly by monthly student view velocity";
    head.append(h2, sub);

    const bento = document.createElement("div");
    bento.className = "spotlight-bento";

    // Left Hero Card (#1 Trending)
    const heroCard = document.createElement("article");
    heroCard.className = "spotlight-hero-card";

    const mediaBtn = document.createElement("button");
    mediaBtn.type = "button";
    mediaBtn.className = "spotlight-hero-media";
    mediaBtn.setAttribute(
      "aria-label",
      `Play #1 trending video: ${hero.title} (${shortRef(hero)})`
    );
    mediaBtn.appendChild(createThumbnailImage(hero, { highPriority: true }));
    mediaBtn.appendChild(createPlayVeil());

    const pill = getTractionPill(hero);
    const pillEl = document.createElement("span");
    pillEl.className = `traction-overlay is-hot`;
    pillEl.textContent = `#1 Trending · ${pill.text.replace(/^[^\w\d]+\s*/, "")}`;
    mediaBtn.appendChild(pillEl);

    if (hero.duration || hero.lesson_count) {
      const dur = document.createElement("span");
      dur.className = "duration-overlay";
      dur.textContent = hero.duration || `${hero.lesson_count} Lectures`;
      mediaBtn.appendChild(dur);
    }
    mediaBtn.addEventListener("click", () => openPlayer(hero));

    const heroBody = document.createElement("div");
    heroBody.className = "spotlight-hero-body";

    const chTag = document.createElement("div");
    chTag.style.display = "flex";
    chTag.style.alignItems = "center";
    chTag.style.flexWrap = "wrap";
    chTag.style.gap = "0.4rem";

    const chChip = document.createElement("span");
    chChip.className = "trend-chip";
    chChip.textContent = `Ch ${pad2(hero.chapter_no)} · ${hero.chapter}`;
    chTag.appendChild(chChip);

    const h3 = document.createElement("h3");
    h3.className = "spotlight-hero-title";
    const titleLink = document.createElement("a");
    titleLink.href = hero.url;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    titleLink.textContent = hero.title;
    titleLink.appendChild(makeHiddenSuffix(`Spotlight ${shortRef(hero)}`));
    h3.appendChild(titleLink);

    const footer = document.createElement("div");
    footer.className = "spotlight-hero-footer";

    const metaSpan = document.createElement("span");
    metaSpan.className = "spotlight-mini-meta";
    metaSpan.textContent = `${hero.educator || hero.channel} · ${getMetricLine(hero)}`;

    const ctaGroup = document.createElement("div");
    ctaGroup.className = "spotlight-cta-group";

    const watchBtn = document.createElement("button");
    watchBtn.type = "button";
    watchBtn.className = "watch-primary-btn";
    watchBtn.textContent = "▶ Watch Now";
    watchBtn.setAttribute(
      "aria-label",
      `Watch ${hero.title} in theater player (${shortRef(hero)})`
    );
    watchBtn.addEventListener("click", () => openPlayer(hero));

    ctaGroup.appendChild(watchBtn);
    footer.append(metaSpan, ctaGroup);

    heroBody.append(chTag, h3, footer);
    heroCard.append(mediaBtn, heroBody);

    // Right Stack (#2, #3, #4 Trending)
    const stack = document.createElement("div");
    stack.className = "spotlight-side-stack";

    runners.forEach((v, idx) => {
      const mini = document.createElement("article");
      mini.className = "spotlight-mini-card";

      const tBtn = document.createElement("button");
      tBtn.type = "button";
      tBtn.className = "spotlight-mini-thumb";
      tBtn.setAttribute(
        "aria-label",
        `Play #${idx + 2} trending video: ${v.title} (${shortRef(v)})`
      );
      tBtn.appendChild(createThumbnailImage(v, { highPriority: false, lazy: false }));
      if (v.duration || v.lesson_count) {
        const d = document.createElement("span");
        d.className = "duration-overlay";
        d.textContent = v.duration || `${v.lesson_count} Lec`;
        tBtn.appendChild(d);
      }
      tBtn.addEventListener("click", () => openPlayer(v));

      const info = document.createElement("div");
      info.className = "spotlight-mini-info";

      const rankLine = document.createElement("div");
      rankLine.className = "spotlight-mini-meta";
      const rankChip = document.createElement("span");
      rankChip.className = "trend-chip is-hot";
      const rp = getTractionPill(v);
      rankChip.textContent = `#${idx + 2} · ${rp.text}`;
      const chMini = document.createElement("span");
      chMini.textContent = `Ch ${pad2(v.chapter_no)}`;
      rankLine.append(rankChip, chMini);

      const mh = document.createElement("h3");
      mh.className = "spotlight-mini-title";
      const ma = document.createElement("a");
      ma.href = v.url;
      ma.target = "_blank";
      ma.rel = "noopener noreferrer";
      ma.textContent = v.title;
      ma.appendChild(makeHiddenSuffix(`Trending #${idx + 2} ${shortRef(v)}`));
      mh.appendChild(ma);

      const mMeta = document.createElement("div");
      mMeta.className = "spotlight-mini-meta";
      mMeta.textContent = `${v.educator || v.channel} · ${getMetricLine(v)}`;

      info.append(rankLine, mh, mMeta);
      mini.append(tBtn, info);
      stack.appendChild(mini);
    });

    bento.append(heroCard, stack);
    el.spotlight.append(head, bento);
  }

  /* Minimalist Zero-Noise Video Card */
  function createVideoCard(v, opts = {}) {
    const card = document.createElement("article");
    card.className = `card${opts.deferCard ? " is-deferred" : ""}`;

    const media = document.createElement("div");
    media.className = "card-media";

    const thumbBtn = document.createElement("button");
    thumbBtn.type = "button";
    thumbBtn.className = "thumb-btn";
    thumbBtn.setAttribute(
      "aria-label",
      `Preview ${v.title} by ${v.educator || v.channel} (${shortRef(v)})`
    );
    thumbBtn.appendChild(createThumbnailImage(v, { lazy: opts.lazyImage }));
    thumbBtn.appendChild(createPlayVeil());

    const pill = getTractionPill(v);
    const tr = document.createElement("span");
    tr.className = `traction-overlay${pill.cls ? ` ${pill.cls}` : ""}`;
    tr.textContent = pill.text;
    thumbBtn.appendChild(tr);

    if (v.duration || v.lesson_count) {
      const dur = document.createElement("span");
      dur.className = "duration-overlay";
      dur.textContent =
        v.duration || `${v.lesson_count} Lec`;
      thumbBtn.appendChild(dur);
    }

    thumbBtn.addEventListener("click", () => openPlayer(v));
    media.appendChild(thumbBtn);

    const body = document.createElement("div");
    body.className = "card-body";

    if (opts.showChapterContext) {
      const chBadge = document.createElement("div");
      chBadge.className = "spotlight-mini-meta";
      const cp = document.createElement("span");
      cp.className = "ch-pill";
      cp.textContent = `Ch ${pad2(v.chapter_no)} · ${v.chapter}`;
      chBadge.appendChild(cp);
      body.appendChild(chBadge);
    }

    const titleRow = document.createElement("div");
    titleRow.className = "card-title-row";

    const h3 = document.createElement("h3");
    h3.className = "card-title";
    const link = document.createElement("a");
    link.href = v.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = v.title;
    link.appendChild(makeHiddenSuffix(shortRef(v)));
    h3.appendChild(link);

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "bookmark-icon-btn";
    const isSaved = state.saved.has(v._key);
    saveBtn.setAttribute("aria-pressed", isSaved ? "true" : "false");
    saveBtn.setAttribute(
      "aria-label",
      `${isSaved ? "Remove from saved" : "Save video"}: ${v.title} (${shortRef(v)})`
    );
    saveBtn.textContent = isSaved ? "★" : "☆";
    saveBtn.addEventListener("click", () => {
      if (state.saved.has(v._key)) {
        state.saved.delete(v._key);
      } else {
        state.saved.add(v._key);
      }
      saveSet(SAVED_KEY, state.saved);
      const nowSaved = state.saved.has(v._key);
      saveBtn.setAttribute("aria-pressed", nowSaved ? "true" : "false");
      saveBtn.textContent = nowSaved ? "★" : "☆";
      if (el.cntSaved) el.cntSaved.textContent = String(state.saved.size);
      if (state.subject === "Saved") renderAll({ announce: true });
    });

    titleRow.append(h3, saveBtn);

    const creatorRow = document.createElement("div");
    creatorRow.className = "card-creator-row";

    const creatorName = v.educator || v.channel || "Educator";
    const av = document.createElement("span");
    av.className = "creator-avatar";
    av.setAttribute("aria-hidden", "true");
    av.textContent = creatorInitials(creatorName);

    const cBtn = document.createElement("button");
    cBtn.type = "button";
    cBtn.className = "creator-btn";
    cBtn.textContent = creatorName;
    cBtn.setAttribute(
      "aria-label",
      `Filter videos by educator ${creatorName} (${shortRef(v)})`
    );
    cBtn.addEventListener("click", () => {
      state.educator = state.educator === creatorName ? "" : creatorName;
      if (el.educatorSelect) el.educatorSelect.value = state.educator;
      renderAll({ announce: true });
    });

    creatorRow.append(av, cBtn);

    const metricsRow = document.createElement("div");
    metricsRow.className = "card-metrics-row";

    const metricSpan = document.createElement("span");
    metricSpan.className = "metric-text";
    metricSpan.textContent = getMetricLine(v);

    const ytLink = document.createElement("a");
    ytLink.className = "yt-mini-link";
    ytLink.href = v.url;
    ytLink.target = "_blank";
    ytLink.rel = "noopener noreferrer";
    ytLink.textContent = v.provider === "playlist" ? "Playlist ↗" : "YouTube ↗";
    ytLink.appendChild(makeHiddenSuffix(`${v.title} ${shortRef(v)}`));

    metricsRow.append(metricSpan, ytLink);

    body.append(titleRow, creatorRow, metricsRow);
    card.append(media, body);
    return card;
  }

  function renderEmptyState() {
    el.list.replaceChildren();
    const box = document.createElement("div");
    box.className = "empty-state";
    const h2 = document.createElement("h2");
    h2.textContent =
      state.subject === "Saved"
        ? "No saved videos yet"
        : "No videos matched this exact filter combination";
    const p = document.createElement("p");
    p.textContent =
      state.subject === "Saved"
        ? "Tap the ☆ star on any lecture or playlist card to build your personal study deck."
        : "Reset your active filters or switch back to 🔥 Trending to see top-ranked YouTube solutions.";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary-btn";
    btn.textContent = "Reset Filters & Show Trending";
    btn.addEventListener("click", resetAllFilters);
    box.append(h2, p, btn);
    el.list.appendChild(box);
  }

  function renderMainStream(filtered) {
    if (!el.list) return;
    if (!filtered.length) {
      renderEmptyState();
      return;
    }

    const sk = effectiveSortKey();

    // Flat Leaderboard View (Most Watched, Quickest, Longest, Deepest Playlists)
    if (isFlatLeaderboardMode()) {
      el.list.replaceChildren();
      const sorted = filtered.slice().sort((a, b) => compareItems(a, b, sk));
      const slice = sorted.slice(0, state.flatLimit);

      const grid = document.createElement("div");
      grid.className = "cards-grid";
      slice.forEach((v, idx) => {
        grid.appendChild(
          createVideoCard(v, {
            showChapterContext: true,
            lazyImage: idx >= 8,
            deferCard: idx >= 12,
          })
        );
      });
      el.list.appendChild(grid);

      if (sorted.length > state.flatLimit) {
        const moreWrap = document.createElement("div");
        moreWrap.style.textAlign = "center";
        moreWrap.style.paddingTop = "0.5rem";
        const moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.className = "secondary-btn";
        moreBtn.textContent = `Show more (${sorted.length - state.flatLimit} remaining) →`;
        moreBtn.addEventListener("click", () => {
          state.flatLimit += FLAT_PAGE_SIZE;
          renderMainStream(filtered);
        });
        moreWrap.appendChild(moreBtn);
        el.list.appendChild(moreWrap);
      }
      return;
    }

    // Chapterwise Structured Stream
    const grouped = new Map();
    for (const v of filtered) {
      if (!grouped.has(v.chapter_no)) grouped.set(v.chapter_no, []);
      grouped.get(v.chapter_no).push(v);
    }

    const chapterEntries = [];
    for (const [chNo, items] of grouped.entries()) {
      items.sort((a, b) => compareItems(a, b, "trending"));
      const chMeta = state.syllabusByNo.get(chNo) || {
        chapter_no: chNo,
        chapter: items[0].chapter,
        subject: items[0].subject,
        unit: items[0].unit,
        weightage: items[0].weightage,
      };
      const peakTrend = Number(items[0]?._rankTrend ?? items[0]?.trend_score) || 0;
      chapterEntries.push({ chNo, chMeta, items, peakTrend });
    }

    if (sk === "trending") {
      chapterEntries.sort(
        (a, b) => b.peakTrend - a.peakTrend || a.chNo - b.chNo
      );
    } else if (sk === "weightage") {
      chapterEntries.sort((a, b) => {
        const wDiff =
          (WEIGHT_RANK[b.chMeta.weightage] || 0) -
          (WEIGHT_RANK[a.chMeta.weightage] || 0);
        if (wDiff !== 0) return wDiff;
        return b.peakTrend - a.peakTrend;
      });
    } else {
      chapterEntries.sort((a, b) => a.chNo - b.chNo);
    }

    el.list.replaceChildren();
    const frag = document.createDocumentFragment();

    chapterEntries.forEach(({ chNo, chMeta, items }, secIdx) => {
      const section = document.createElement("section");
      section.className = `chapter-section${secIdx >= 2 ? " is-deferred" : ""}`;
      section.id = `chapter-${chNo}`;

      const header = document.createElement("div");
      header.className = "chapter-header";

      const titleCluster = document.createElement("div");
      titleCluster.className = "chapter-title-cluster";

      const chPill = document.createElement("span");
      chPill.className = "ch-pill";
      const shortSubj =
        (CFG.subjectMeta[chMeta.subject] && CFG.subjectMeta[chMeta.subject].short) ||
        chMeta.subject;
      chPill.textContent = `Ch ${pad2(chNo)} · ${shortSubj}`;

      const h2 = document.createElement("h2");
      h2.className = "chapter-heading";
      h2.textContent = chMeta.chapter;

      titleCluster.append(chPill, h2);

      if (chMeta.weightage === "Very High" || chMeta.weightage === "High") {
        const wt = document.createElement("span");
        wt.className = "weight-tag";
        wt.textContent = `${chMeta.weightage} Yield`;
        titleCluster.appendChild(wt);
      }

      const actionsCluster = document.createElement("div");
      actionsCluster.className = "chapter-actions-cluster";

      const doneBtn = document.createElement("button");
      doneBtn.type = "button";
      doneBtn.className = "done-chip";
      const isDone = state.doneChapters.has(String(chNo));
      doneBtn.setAttribute("aria-pressed", isDone ? "true" : "false");
      doneBtn.setAttribute(
        "aria-label",
        `${isDone ? "Mark chapter incomplete" : "Mark chapter mastered"}: Chapter ${pad2(chNo)} ${chMeta.chapter}`
      );
      doneBtn.textContent = isDone ? "✓ Mastered" : "Mark Done";
      doneBtn.addEventListener("click", () => {
        const k = String(chNo);
        if (state.doneChapters.has(k)) state.doneChapters.delete(k);
        else state.doneChapters.add(k);
        saveSet(DONE_KEY, state.doneChapters);
        renderAll({ announce: false });
      });
      actionsCluster.appendChild(doneBtn);

      const isIsolated =
        state.chapterNo === chNo ||
        Boolean(state.query) ||
        state.expandedChapters.has(chNo);
      const visibleItems = isIsolated
        ? items
        : items.slice(0, CARDS_PER_CHAPTER_COLLAPSED);

      if (!state.chapterNo && !state.query && items.length > CARDS_PER_CHAPTER_COLLAPSED) {
        const expBtn = document.createElement("button");
        expBtn.type = "button";
        expBtn.className = "expand-ch-btn";
        const expanded = state.expandedChapters.has(chNo);
        expBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
        expBtn.textContent = expanded
          ? "Show top 4"
          : `View all ${items.length} →`;
        expBtn.setAttribute(
          "aria-label",
          expanded
            ? `Show top 4 trending videos for Chapter ${pad2(chNo)} ${chMeta.chapter}`
            : `View all ${items.length} trending videos for Chapter ${pad2(chNo)} ${chMeta.chapter}`
        );
        expBtn.addEventListener("click", () => {
          if (state.expandedChapters.has(chNo)) {
            state.expandedChapters.delete(chNo);
          } else {
            state.expandedChapters.add(chNo);
          }
          renderMainStream(filtered);
        });
        actionsCluster.appendChild(expBtn);
      }

      header.append(titleCluster, actionsCluster);

      const grid = document.createElement("div");
      grid.className = "cards-grid";
      visibleItems.forEach((v) => {
        grid.appendChild(
          createVideoCard(v, {
            showChapterContext: false,
            lazyImage: secIdx >= 1,
            deferCard: false,
          })
        );
      });

      section.append(header, grid);
      frag.appendChild(section);
    });

    el.list.appendChild(frag);
  }

  function renderAll({ announce = false } = {}) {
    const filtered = getFilteredVideos();
    const chaptersRepresented = new Set(filtered.map((v) => v.chapter_no)).size;

    renderSubjectTabs();
    updateChromeAndCounters();
    renderActiveFilterPills();
    renderSyllabusTrees(filtered);
    renderSpotlight(filtered);
    renderMainStream(filtered);

    const summary = `${filtered.length.toLocaleString()} trending solutions across ${chaptersRepresented} chapter${chaptersRepresented === 1 ? "" : "s"}`;
    if (el.count) el.count.textContent = summary;
    if (announce && el.liveStatus) el.liveStatus.textContent = summary;
  }

  function resetAllFilters() {
    state.subject = "All";
    state.mode = "trending";
    state.query = "";
    state.chapterNo = 0;
    state.sort = "trending";
    state.unit = "";
    state.educator = "";
    state.exam = "all";
    state.classLevel = "all";
    state.lang = "all";
    state.type = "all";
    state.flatLimit = FLAT_PAGE_SIZE;

    if (el.q) el.q.value = "";
    if (el.sortSelect) el.sortSelect.value = "trending";
    if (el.educatorSelect) el.educatorSelect.value = "";
    if (el.examSelect) el.examSelect.value = "all";
    if (el.classSelect) el.classSelect.value = "all";
    if (el.langSelect) el.langSelect.value = "all";
    if (el.typeSelect) el.typeSelect.value = "all";
    syncSearchClear();
    populateSelectOptions();
    renderAll({ announce: true });
  }

  /* Theater Player Modal */
  function openPlayer(v) {
    if (!el.playerDialog) {
      window.open(v.url, "_blank", "noopener,noreferrer");
      return;
    }

    const embedId = v.embed_video_id || (v.provider === "youtube" ? v.video_id : "");
    if (!embedId && v.provider === "playlist") {
      // Playlist embed via videoseries
      const listId = v.video_id;
      if (!listId) {
        window.open(v.url, "_blank", "noopener,noreferrer");
        return;
      }
      mountIframe(
        `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(listId)}&rel=0`,
        v
      );
      return;
    }

    if (v.provider === "playlist" && v.video_id) {
      mountIframe(
        `https://www.youtube-nocookie.com/embed/${encodeURIComponent(embedId)}?list=${encodeURIComponent(v.video_id)}&autoplay=1&rel=0`,
        v
      );
      return;
    }

    mountIframe(
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(embedId)}?autoplay=1&rel=0`,
      v
    );
  }

  function mountIframe(src, v) {
    const pill = getTractionPill(v);
    if (el.playerBadge) el.playerBadge.textContent = pill.text;
    if (el.playerChannel) {
      el.playerChannel.textContent = `${v.educator || v.channel} · Ch ${pad2(v.chapter_no)} ${v.chapter}`;
    }
    if (el.playerTitle) el.playerTitle.textContent = v.title;
    if (el.playerExt) {
      el.playerExt.href = v.url;
      el.playerExt.setAttribute(
        "aria-label",
        `Open ${v.title} directly on YouTube`
      );
    }

    if (el.playerStage) {
      el.playerStage.replaceChildren();
      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = v.title;
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      el.playerStage.appendChild(iframe);
    }

    if (el.playerSamples) {
      const samples = Array.isArray(v.sample_lectures) ? v.sample_lectures : [];
      if (samples.length) {
        el.playerSamples.hidden = false;
        el.playerSamples.replaceChildren();
        for (const s of samples.slice(0, 5)) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "player-sample-btn";
          b.textContent = `▶ ${s.title}`;
          b.addEventListener("click", () => {
            const iframe = el.playerStage?.querySelector("iframe");
            if (iframe && s.video_id) {
              iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(s.video_id)}?list=${encodeURIComponent(v.video_id)}&autoplay=1&rel=0`;
            }
          });
          el.playerSamples.appendChild(b);
        }
      } else {
        el.playerSamples.hidden = true;
        el.playerSamples.replaceChildren();
      }
    }

    if (!el.playerDialog.open) {
      el.playerDialog.showModal();
    }
  }

  /* Interactive "Solve My Problem" Video Prescription Wizard */
  function initRescueWizard() {
    if (!el.rescueDialog) return;

    const populateRescueSubjects = () => {
      if (!el.rescueSubject) return;
      el.rescueSubject.replaceChildren();
      const allOpt = document.createElement("option");
      allOpt.value = "All";
      allOpt.textContent = "All Subjects";
      el.rescueSubject.appendChild(allOpt);
      for (const s of state.subjects) {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        el.rescueSubject.appendChild(opt);
      }
      el.rescueSubject.value =
        state.subject !== "All" && state.subject !== "Saved"
          ? state.subject
          : "All";
      state.rescueSubject = el.rescueSubject.value;
    };

    const populateRescueChapters = () => {
      if (!el.rescueChapter) return;
      el.rescueChapter.replaceChildren();
      const allOpt = document.createElement("option");
      allOpt.value = "0";
      allOpt.textContent = "All Chapters (Show #1 Across Syllabus)";
      el.rescueChapter.appendChild(allOpt);

      const chapters = state.syllabus.filter(
        (c) => state.rescueSubject === "All" || c.subject === state.rescueSubject
      );
      for (const c of chapters) {
        const opt = document.createElement("option");
        opt.value = String(c.chapter_no);
        opt.textContent = `Ch ${pad2(c.chapter_no)} · ${c.chapter}`;
        el.rescueChapter.appendChild(opt);
      }
      const target =
        state.chapterNo && chapters.some((c) => c.chapter_no === state.chapterNo)
          ? String(state.chapterNo)
          : "0";
      el.rescueChapter.value = target;
      state.rescueChapter = Number(target);
    };

    const renderPrescriptions = () => {
      if (!el.rescueResults) return;
      const basePool = state.videos.filter((v) => {
        if (state.rescueSubject !== "All" && v.subject !== state.rescueSubject) {
          return false;
        }
        if (state.rescueChapter && v.chapter_no !== state.rescueChapter) {
          return false;
        }
        return true;
      });

      let candidates = [];
      const sit = state.rescueSituation;
      if (sit === "zero") {
        candidates = basePool.filter((v) => matchesMode(v, "playlists"));
      } else if (sit === "backlog") {
        candidates = basePool.filter((v) => matchesMode(v, "oneshot"));
      } else if (sit === "questions") {
        candidates = basePool.filter((v) => matchesMode(v, "pyq"));
      } else if (sit === "quick") {
        candidates = basePool.filter(
          (v) =>
            v.provider === "youtube" &&
            Number(v.duration_sec) > 300 &&
            Number(v.duration_sec) <= 6300
        );
      }

      if (candidates.length < 3) {
        const extra = basePool
          .slice()
          .sort(comparePureTrend)
          .filter((v) => !candidates.includes(v));
        candidates = candidates.concat(extra);
      } else {
        candidates = candidates.slice().sort(comparePureTrend);
      }

      const top3 = candidates.slice(0, 3);
      el.rescueResults.replaceChildren();

      if (!top3.length) {
        const p = document.createElement("p");
        p.className = "result-count";
        p.textContent = "Select a subject or chapter to see prescriptions.";
        el.rescueResults.appendChild(p);
        return;
      }

      top3.forEach((v, idx) => {
        const row = document.createElement("div");
        row.className = "rescue-item";

        const img = createThumbnailImage(v, { lazy: false });
        const info = document.createElement("div");
        info.className = "rescue-item-info";

        const h4 = document.createElement("h4");
        h4.textContent = `#${idx + 1} · ${v.title}`;

        const p = document.createElement("p");
        const pill = getTractionPill(v);
        p.textContent = `${pill.text} · ${v.educator || v.channel} · Ch ${pad2(v.chapter_no)} ${v.chapter}`;

        info.append(h4, p);

        const watchBtn = document.createElement("button");
        watchBtn.type = "button";
        watchBtn.className = "primary-btn";
        watchBtn.textContent = "▶ Watch Fix";
        watchBtn.setAttribute(
          "aria-label",
          `Watch prescription #${idx + 1}: ${v.title} (${shortRef(v)})`
        );
        watchBtn.addEventListener("click", () => {
          el.rescueDialog.close();
          openPlayer(v);
        });

        row.append(img, info, watchBtn);
        el.rescueResults.appendChild(row);
      });
    };

    el.openRescueBtn?.addEventListener("click", () => {
      populateRescueSubjects();
      populateRescueChapters();
      renderPrescriptions();
      el.rescueDialog.showModal();
    });

    el.rescueSubject?.addEventListener("change", () => {
      state.rescueSubject = el.rescueSubject.value;
      state.rescueChapter = 0;
      populateRescueChapters();
      renderPrescriptions();
    });

    el.rescueChapter?.addEventListener("change", () => {
      state.rescueChapter = Number(el.rescueChapter.value) || 0;
      renderPrescriptions();
    });

    el.situationCards.forEach((card) => {
      card.addEventListener("click", () => {
        state.rescueSituation = card.dataset.situation || "backlog";
        el.situationCards.forEach((c) =>
          c.setAttribute("aria-pressed", c === card ? "true" : "false")
        );
        renderPrescriptions();
      });
    });

    el.rescueApplyMain?.addEventListener("click", () => {
      state.subject = state.rescueSubject;
      state.chapterNo = state.rescueChapter;
      if (state.rescueSituation === "zero") state.mode = "playlists";
      else if (state.rescueSituation === "backlog") state.mode = "oneshot";
      else if (state.rescueSituation === "questions") state.mode = "pyq";
      else {
        state.mode = "trending";
        state.sort = "duration_asc";
        if (el.sortSelect) el.sortSelect.value = "duration_asc";
      }
      populateSelectOptions();
      el.rescueDialog.close();
      renderAll({ announce: true });
    });
  }

  function syncSearchClear() {
    const hasText = Boolean(el.q?.value);
    if (el.clearQ) el.clearQ.hidden = !hasText;
    if (el.keyHint) el.keyHint.hidden = hasText;
  }

  function bindEvents() {
    let searchTimer = null;
    el.q?.addEventListener("input", () => {
      syncSearchClear();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = el.q.value.trim();
        state.flatLimit = FLAT_PAGE_SIZE;
        renderAll({ announce: true });
      }, 90);
    });

    el.clearQ?.addEventListener("click", () => {
      if (el.q) el.q.value = "";
      state.query = "";
      syncSearchClear();
      renderAll({ announce: true });
      el.q?.focus();
    });

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName || ""
        )
      ) {
        e.preventDefault();
        el.q?.focus();
      }
    });

    el.intentBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode || "trending";
        state.flatLimit = FLAT_PAGE_SIZE;
        renderAll({ announce: true });
      });
    });

    el.savedDeckBtn?.addEventListener("click", () => {
      state.subject = state.subject === "Saved" ? "All" : "Saved";
      renderAll({ announce: true });
    });

    el.clearChapterBtn?.addEventListener("click", () => {
      state.chapterNo = 0;
      renderAll({ announce: true });
    });

    el.chFilter?.addEventListener("input", () => {
      renderSyllabusTrees(getFilteredVideos());
    });

    el.drawerChFilter?.addEventListener("input", () => {
      renderSyllabusTrees(getFilteredVideos());
    });

    el.openSyllabusDrawer?.addEventListener("click", () => {
      el.syllabusDialog?.showModal();
    });

    el.openRefineBtn?.addEventListener("click", () => {
      el.refineDialog?.showModal();
    });

    el.sortSelect?.addEventListener("change", () => {
      state.sort = el.sortSelect.value;
      state.flatLimit = FLAT_PAGE_SIZE;
      renderAll({ announce: true });
    });

    el.unitSelect?.addEventListener("change", () => {
      state.unit = el.unitSelect.value;
      renderAll({ announce: true });
    });

    el.educatorSelect?.addEventListener("change", () => {
      state.educator = el.educatorSelect.value;
      renderAll({ announce: true });
    });

    el.examSelect?.addEventListener("change", () => {
      state.exam = el.examSelect.value;
      renderAll({ announce: true });
    });

    el.classSelect?.addEventListener("change", () => {
      state.classLevel = el.classSelect.value;
      renderAll({ announce: true });
    });

    el.langSelect?.addEventListener("change", () => {
      state.lang = el.langSelect.value;
      renderAll({ announce: true });
    });

    el.typeSelect?.addEventListener("change", () => {
      state.type = el.typeSelect.value;
      renderAll({ announce: true });
    });

    el.refineResetBtn?.addEventListener("click", () => {
      resetAllFilters();
    });

    el.playerDialog?.addEventListener("close", () => {
      if (el.playerStage) el.playerStage.replaceChildren();
    });

    bindSubjectRadiogroupKeys();
    initRescueWizard();
  }

  async function boot() {
    applyStaticBrandConfig();
    initThemeToggle();
    initLightDismissFallback();
    bindEvents();

    try {
      const res = await fetch("data/videos.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();

      state.meta = payload.meta || {};
      state.syllabus = Array.isArray(payload.syllabus) ? payload.syllabus : [];
      state.syllabusByNo = new Map(
        state.syllabus.map((s) => [Number(s.chapter_no), s])
      );
      state.subjects = Array.from(
        new Set(state.syllabus.map((s) => s.subject).filter(Boolean))
      );
      state.educators = Array.isArray(payload.educators) ? payload.educators : [];
      state.videos = Array.isArray(payload.videos) ? payload.videos : [];
      state.videos.forEach(indexRecord);

      if (el.heroStats) {
        const chTotal = state.syllabus.length;
        const vidTotal = state.videos.length.toLocaleString();
        const chCount =
          state.meta.distinct_channels || state.meta.distinct_educators || "";
        el.heroStats.textContent = `${chTotal} Chapters · ${vidTotal} Trending Solutions${chCount ? ` · ${chCount} YouTube Channels` : ""}`;
      }

      populateSelectOptions();
      renderAll({ announce: false });
    } catch (err) {
      if (el.subline) {
        el.subline.hidden = false;
        el.subline.textContent = `Could not load data/videos.json (${err.message}). Serve this folder over HTTP or GitHub Pages.`;
      }
      if (el.count) {
        el.count.textContent = "Unable to load dataset.";
      }
    }
  }

  boot();
})();
