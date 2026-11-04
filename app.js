(() => {
  "use strict";

  const CFG = Object.assign(
    {
      platformId: "jee",
      brandName: "JEETube",
      brandSymbol: "∑",
      tagline: "IIT-JEE · State CETs · BITSAT",
      storagePrefix: "jeetube",
      searchPlaceholder: "Search chapter, topic, or teacher…",
      quickProblems: [],
      subjectMeta: {},
      acronyms: {},
      ecosystem: [],
    },
    window.TUBE_CONFIG || {}
  );

  const BASE_TITLE = document.title;
  const SAVED_KEY = `${CFG.storagePrefix}_saved_v2`;
  const DONE_KEY = `${CFG.storagePrefix}_done_v2`;
  const ROLE_KEY = `${CFG.storagePrefix}_role_v3`;
  const CARDS_PER_CHAPTER_COLLAPSED = 4;
  const FLAT_PAGE_SIZE = 48;

  const LANGUAGE_META = {
    Hinglish: {
      badge: "Hinglish",
      option: "Hinglish (Hindi + Eng)",
      aliases: "hinglish hindi english mix",
      regional: false,
    },
    English: {
      badge: "English",
      option: "English Medium",
      aliases: "english medium pure english",
      regional: false,
    },
    Hindi: {
      badge: "हिंदी · Hindi",
      option: "हिंदी · Hindi",
      aliases: "hindi medium हिंदी माध्यम हिन्दी bseb upmsp rbse mp board",
      regional: true,
    },
    "Hindi / Hinglish": {
      badge: "हिंदी · Hinglish",
      option: "हिंदी · Hindi / Hinglish",
      aliases: "hindi hinglish हिंदी माध्यम हिन्दी",
      regional: false,
    },
    Telugu: {
      badge: "తెలుగు · Telugu",
      option: "తెలుగు · Telugu",
      aliases: "telugu తెలుగు ap ts eapcet eamcet ipe andhra telangana",
      regional: true,
    },
    Tamil: {
      badge: "தமிழ் · Tamil",
      option: "தமிழ் · Tamil",
      aliases: "tamil தமிழ் tn state board tamilnadu",
      regional: true,
    },
    Malayalam: {
      badge: "മലയാളം · Malayalam",
      option: "മലയാളം · Malayalam",
      aliases: "malayalam മലയാളം kerala keam plus two sslc",
      regional: true,
    },
    Kannada: {
      badge: "ಕನ್ನಡ · Kannada",
      option: "ಕನ್ನಡ · Kannada",
      aliases: "kannada ಕನ್ನಡ karnataka kcet puc",
      regional: true,
    },
    Marathi: {
      badge: "मराठी · Marathi",
      option: "मराठी · Marathi",
      aliases: "marathi मराठी maharashtra mht cet mhtcet hsc ssc",
      regional: true,
    },
    Bengali: {
      badge: "বাংলা · Bengali",
      option: "বাংলা · Bengali",
      aliases: "bengali bangla বাংলা wbjee wbchse madhyamik west bengal",
      regional: true,
    },
    Gujarati: {
      badge: "ગુજરાતી · Gujarati",
      option: "ગુજરાતી · Gujarati",
      aliases: "gujarati ગુજરાતી gujcet gseb gujarat",
      regional: true,
    },
    Odia: {
      badge: "ଓଡ଼ିଆ · Odia",
      option: "ଓଡ଼ିଆ · Odia",
      aliases: "odia oriya ଓଡ଼ିଆ ojee chse odisha",
      regional: true,
    },
    Punjabi: {
      badge: "ਪੰਜਾਬੀ · Punjabi",
      option: "ਪੰਜਾਬੀ · Punjabi",
      aliases: "punjabi ਪੰਜਾਬੀ pseb punjab",
      regional: true,
    },
    Assamese: {
      badge: "অসমীয়া · Assamese",
      option: "অসমীয়া · Assamese",
      aliases: "assamese অসমীয়া ahsec seba assam",
      regional: true,
    },
  };

  function getLangMeta(lang) {
    const key = String(lang || "").trim();
    return (
      LANGUAGE_META[key] || {
        badge: key || "Hinglish",
        option: key || "Hinglish",
        aliases: key.toLowerCase(),
        regional: false,
      }
    );
  }

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

  function loadInitialRole() {
    try {
      const saved = localStorage.getItem(ROLE_KEY);
      if (saved === "student" || saved === "teacher") return saved;
    } catch {}
    return "teacher";
  }

  const state = {
    meta: null,
    syllabus: [],
    syllabusByNo: new Map(),
    subjects: [],
    allLanguages: [],
    allExams: [],
    allEducators: [],
    videos: [],
    userRole: loadInitialRole(),
    subject: "All",
    classLevel: "all",
    chapterNo: 0,
    query: "",
    lang: "all",
    exam: "all",
    educator: "",
    sort: "trending",
    expandedChapters: new Set(),
    flatLimit: FLAT_PAGE_SIZE,
    saved: loadSet(SAVED_KEY),
    doneChapters: loadSet(DONE_KEY),
    pickerKind: "lang",
    activePlayerVideo: null,
  };

  const el = {
    brandGlyph: document.getElementById("brand-glyph"),
    brandName: document.getElementById("brand-name"),
    heroStats: document.getElementById("hero-stats"),
    ecosystemNav: document.getElementById("ecosystem-nav"),
    roleTeacherBtn: document.getElementById("role-teacher-btn"),
    roleStudentBtn: document.getElementById("role-student-btn"),
    shareWhatsappBtn: document.getElementById("share-whatsapp-btn"),
    shareCopyBtn: document.getElementById("share-copy-btn"),
    savedDeckBtn: document.getElementById("saved-deck-btn"),
    cntSaved: document.getElementById("cnt-saved"),
    themeToggle: document.getElementById("theme-toggle"),
    subline: document.getElementById("subline"),
    subjectTabs: document.getElementById("subject-tabs"),
    classPills: document.getElementById("class-pills"),
    q: document.getElementById("q"),
    keyHint: document.getElementById("key-hint"),
    clearQ: document.getElementById("clear-q"),
    langSelect: document.getElementById("lang-select"),
    examSelect: document.getElementById("exam-select"),
    educatorSelect: document.getElementById("educator-select"),
    sortSelect: document.getElementById("sort-select"),
    railChTotal: document.getElementById("rail-ch-total"),
    clearChapterBtn: document.getElementById("clear-chapter-btn"),
    studentProgressBox: document.getElementById("student-progress-box"),
    statProgress: document.getElementById("stat-progress"),
    syllabusProgress: document.getElementById("syllabus-progress"),
    chFilter: document.getElementById("ch-filter"),
    syllabusTree: document.getElementById("syllabus-tree"),
    liveStatus: document.getElementById("live-status"),
    count: document.getElementById("count"),
    studentShortcutsBar: document.getElementById("student-shortcuts-bar"),
    quickProblems: document.getElementById("quick-problems"),
    activeFiltersBar: document.getElementById("active-filters-bar"),
    activeSummary: document.getElementById("active-summary"),
    activeFilters: document.getElementById("active-filters"),
    list: document.getElementById("list"),
    mobChaptersBtn: document.getElementById("mob-chapters-btn"),
    mobChLabel: document.getElementById("mob-ch-label"),
    mobLangBtn: document.getElementById("mob-lang-btn"),
    mobLangLabel: document.getElementById("mob-lang-label"),
    mobEducatorBtn: document.getElementById("mob-educator-btn"),
    mobEduLabel: document.getElementById("mob-edu-label"),
    mobShareBtn: document.getElementById("mob-share-btn"),
    syllabusDialog: document.getElementById("syllabus-dialog"),
    drawerAllChBtn: document.getElementById("drawer-all-ch-btn"),
    drawerChFilter: document.getElementById("drawer-ch-filter"),
    drawerSyllabusTree: document.getElementById("drawer-syllabus-tree"),
    pickerDialog: document.getElementById("picker-dialog"),
    pickerTitle: document.getElementById("picker-title"),
    pickerSearchWrap: document.getElementById("picker-search-wrap"),
    pickerSearch: document.getElementById("picker-search"),
    pickerList: document.getElementById("picker-list"),
    shareDialog: document.getElementById("share-dialog"),
    shareSheetPreview: document.getElementById("share-sheet-preview"),
    shareSheetWa: document.getElementById("share-sheet-wa"),
    shareSheetCopy: document.getElementById("share-sheet-copy"),
    playerDialog: document.getElementById("player-dialog"),
    playerBadge: document.getElementById("player-badge"),
    playerChannel: document.getElementById("player-channel"),
    playerShareBtn: document.getElementById("player-share-btn"),
    playerExt: document.getElementById("player-ext"),
    playerTitle: document.getElementById("player-title"),
    playerStage: document.getElementById("player-stage"),
    playerSamples: document.getElementById("player-samples"),
    shareToast: document.getElementById("share-toast"),
    toastMsg: document.getElementById("toast-msg"),
    toastWaLink: document.getElementById("toast-wa-link"),
    toastCloseBtn: document.getElementById("toast-close-btn"),
  };

  let toastTimer = null;

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

  function itemKey(v) {
    return `${v.chapter_no}:${v.provider}:${v.video_id}`;
  }

  function shortRef(v) {
    const clean = String(v.video_id || "").replace(/[^a-zA-Z0-9]/g, "");
    return `C${pad2(v.chapter_no)}-${clean.slice(-6) || "yt"}`;
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

  function getDurationBadge(v) {
    if (v.provider === "playlist") {
      const n = Number(v.lesson_count) || 0;
      return n > 0 ? `📚 ${n} Lectures` : "📚 Full Playlist";
    }
    if (v.duration) {
      return `⏱ ${v.duration}`;
    }
    const sec = Number(v.duration_sec) || 0;
    if (sec > 0) {
      const h = Math.floor(sec / 3600);
      const m = Math.round((sec % 3600) / 60);
      return h > 0 ? `⏱ ${h}h ${m}m` : `⏱ ${m}m`;
    }
    return "▶ Lecture";
  }

  function getTractionPill(v) {
    const vpm = Number(v._velocity ?? v.views_per_month) || 0;
    const views = Number(v.view_count) || 0;
    if (vpm >= 22000) {
      return { text: `🔥 ${compactNum(vpm)}/mo`, cls: "is-hot" };
    }
    if (views >= 600000) {
      return { text: `⭐ ${compactNum(views)}`, cls: "" };
    }
    if (vpm >= 4500) {
      return { text: `📈 ${compactNum(vpm)}/mo`, cls: "" };
    }
    if (views > 0) {
      return { text: `▶ ${compactNum(views)}`, cls: "" };
    }
    if (v.provider === "playlist") {
      return { text: "Full Course", cls: "" };
    }
    return { text: "Verified", cls: "" };
  }

  /* Pure YouTube Trend Comparator — ZERO Coaching/Institute Bias */
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
    return comparePureTrend(a, b);
  }

  /* Class / Level Definitions Across All 5 Platforms */
  function getPlatformClassDefs() {
    if (CFG.platformId === "board" || CFG.platformId === "upboard") {
      return [
        { key: "all", label: "All" },
        { key: "Class 12", label: "Class 12" },
        { key: "Class 10", label: "Class 10" },
      ];
    }
    if (CFG.platformId === "olympiad") {
      return [
        { key: "all", label: "All" },
        { key: "jr", label: "Jr (8–10)" },
        { key: "sr", label: "Sr (11–12)" },
      ];
    }
    return [
      { key: "all", label: "All" },
      { key: "Class 11", label: "Class 11" },
      { key: "Class 12", label: "Class 12" },
      { key: "dropper", label: "Dropper" },
    ];
  }

  function matchesClassLevel(v, classKey) {
    if (!classKey || classKey === "all") return true;
    if (classKey === "dropper") {
      return (
        v.class_level === "Dropper" ||
        v.format === "One-Shot" ||
        v.format === "PYQ & Mock" ||
        Boolean(v._isDropperReady)
      );
    }
    if (classKey === "jr") {
      return ["Class 8–10", "Class 8–12", "Class 9–12", "Class 10–12"].includes(
        v.class_level
      );
    }
    if (classKey === "sr") {
      return [
        "Class 11–12",
        "Class 12",
        "Class 10–12",
        "Class 8–12",
        "Class 9–12",
      ].includes(v.class_level);
    }
    return v.class_level === classKey;
  }

  function matchesSortScope(v, sortKey) {
    if (sortKey === "quick_revision") {
      return Boolean(v._isQuickRevision);
    }
    if (sortKey === "playlists") {
      return v.provider === "playlist" || v.format === "Full Course";
    }
    if (sortKey === "pyq") {
      return Boolean(v._isPyq);
    }
    return true;
  }

  function indexRecord(v) {
    const chExtra = CFG.acronyms[v.chapter_no] || "";
    const langMeta = getLangMeta(v.language);
    const tx = String(v.target_exam || "").toLowerCase();
    let examExtra = "";
    if (tx.includes("cet") || tx.includes("bitsat")) {
      examExtra +=
        " engineering cet mht cet mhtcet kcet eapcet eamcet wbjee keam gujcet ojee comedk bitsat";
    }
    if (tx.includes("board") || tx.includes("class 12") || tx.includes("class 10")) {
      examExtra += " board boards cbse isc ncert state board hsc puc ipe";
    }
    if (tx.includes("aiims") || tx.includes("medical") || tx.includes("nursing")) {
      examExtra += " medical aiims jipmer bsc nursing paramedical";
    }

    const titleAndFmt = `${v.title || ""} ${v.format || ""}`;
    v._isQuickRevision =
      v.format === "One-Shot" ||
      (v.provider === "youtube" &&
        (/one\s*-?\s*shot|complete\s+chapter|full\s+chapter|marathon|mahamarathon|rapid\s+revision|quick\s+revision|in\s+\d+\s*hours?/i.test(
          titleAndFmt
        ) ||
          (Number(v.duration_sec) >= 900 && Number(v.duration_sec) <= 10800)));

    v._isPyq =
      v.format === "PYQ & Mock" ||
      /pyq|previous\s+year|problem|questions?|mock|booster|ranker|challenge|paper|olympiad\s+problems|numericals?|ncert\s+solutions?|important\s+questions/i.test(
        titleAndFmt
      );

    v._isDropperReady =
      v._isQuickRevision ||
      v._isPyq ||
      /dropper|prayas|yakeen|bounceback|manzil|leader|achiever|target/i.test(
        titleAndFmt
      );

    v._key = itemKey(v);
    const views = Number(v.view_count) || 0;
    const ageM = Math.max(Number(v.age_months) || 12, 0.5);
    if (v.provider === "youtube" && views > 0) {
      v._velocity = Math.round(views / Math.max(ageM + 1.5, 2.5));
      v._rankTrend =
        Math.log10(v._velocity + 10) * 30 + Math.log10(views + 10) * 0.25;
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
      langMeta.badge,
      langMeta.aliases,
      v.class_level,
      v.target_exam,
      examExtra,
      chExtra,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function filterVideosCustom(overrides = {}) {
    const subj = overrides.subject ?? state.subject;
    const cls = overrides.classLevel ?? state.classLevel;
    const chNo = overrides.chapterNo ?? state.chapterNo;
    const qText = overrides.query ?? state.query;
    const lang = overrides.lang ?? state.lang;
    const exam = overrides.exam ?? state.exam;
    const edu = overrides.educator ?? state.educator;
    const sortKey = overrides.sort ?? state.sort;

    const tokens = String(qText || "")
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return state.videos.filter((v) => {
      if (subj === "Saved") {
        if (!state.saved.has(v._key)) return false;
      } else if (subj !== "All" && v.subject !== subj) {
        return false;
      }
      if (!matchesClassLevel(v, cls)) return false;
      if (chNo && v.chapter_no !== chNo) return false;
      if (lang !== "all" && v.language !== lang) return false;
      if (exam !== "all" && v.target_exam !== exam) return false;
      if (edu && v.educator !== edu && v.channel !== edu) return false;
      if (!matchesSortScope(v, sortKey)) return false;

      if (tokens.length) {
        for (const tok of tokens) {
          if (!v._search.includes(tok)) return false;
        }
      }
      return true;
    });
  }

  function getFilteredVideos() {
    return filterVideosCustom();
  }

  /* ==========================================================================
     URL DEEP-LINKING (URLSearchParams <-> history.replaceState)
     ========================================================================== */
  function resolveSubjectParam(raw) {
    if (!raw) return "All";
    const clean = raw.trim();
    if (clean.toLowerCase() === "all") return "All";
    if (clean.toLowerCase() === "saved") return "Saved";
    const exact = state.subjects.find(
      (s) => s.toLowerCase() === clean.toLowerCase()
    );
    if (exact) return exact;

    const low = clean.toLowerCase();
    for (const s of state.subjects) {
      const short = (CFG.subjectMeta[s]?.short || "").toLowerCase();
      if (short && short === low) return s;
    }
    if (low === "maths" || low === "math") {
      const m = state.subjects.find((s) => /math|गणित/i.test(s));
      if (m) return m;
    }
    if (low === "phy" || low === "physics") {
      const p = state.subjects.find((s) => /phys|भौतिकी/i.test(s));
      if (p) return p;
    }
    if (low === "chem" || low === "chemistry") {
      const c = state.subjects.find((s) => /chem|रसायन/i.test(s));
      if (c) return c;
    }
    if (low === "bio" || low === "biology") {
      const b = state.subjects.find((s) => /bio|botany|जीव/i.test(s));
      if (b) return b;
    }
    const partial = state.subjects.find((s) => s.toLowerCase().includes(low));
    return partial || "All";
  }

  function resolveChapterParam(raw) {
    if (!raw) return 0;
    const trimmed = raw.trim();
    const leadNum = trimmed.match(/^(\d{1,3})\b/);
    if (leadNum) {
      const n = Number(leadNum[1]);
      if (state.syllabusByNo.has(n)) return n;
    }
    const low = trimmed.toLowerCase();
    for (const ch of state.syllabus) {
      if (ch.chapter.toLowerCase() === low) return ch.chapter_no;
    }
    for (const ch of state.syllabus) {
      if (ch.chapter.toLowerCase().includes(low)) return ch.chapter_no;
    }
    return 0;
  }

  function resolveFromList(raw, list) {
    if (!raw) return "";
    const low = raw.trim().toLowerCase();
    const exact = list.find((item) => item.toLowerCase() === low);
    if (exact) return exact;
    const partial = list.find((item) => item.toLowerCase().includes(low));
    return partial || "";
  }

  function hydrateStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].length === 0) return;

    const subjParam = params.get("subject");
    if (subjParam) state.subject = resolveSubjectParam(subjParam);

    const clsParam = params.get("class");
    if (clsParam) {
      const defs = getPlatformClassDefs();
      const low = clsParam.trim().toLowerCase();
      const found = defs.find(
        (d) =>
          d.key.toLowerCase() === low ||
          d.label.toLowerCase() === low ||
          (low === "11" && d.key === "Class 11") ||
          (low === "12" && d.key === "Class 12") ||
          (low === "10" && d.key === "Class 10")
      );
      if (found) state.classLevel = found.key;
    }

    const chParam = params.get("chapter");
    if (chParam) state.chapterNo = resolveChapterParam(chParam);

    const langParam = params.get("lang");
    if (langParam && langParam.toLowerCase() !== "all") {
      const matched = resolveFromList(langParam, state.allLanguages);
      state.lang = matched || langParam.trim();
    }

    const streamParam = params.get("stream") || params.get("exam");
    if (streamParam && streamParam.toLowerCase() !== "all") {
      const matched = resolveFromList(streamParam, state.allExams);
      state.exam = matched || streamParam.trim();
    }

    const eduParam = params.get("educator");
    if (eduParam) {
      const matched = resolveFromList(eduParam, state.allEducators);
      state.educator = matched || eduParam.trim();
    }

    const sortParam = params.get("sort");
    const validSorts = [
      "trending",
      "chapterwise",
      "views",
      "quick_revision",
      "playlists",
      "pyq",
    ];
    if (sortParam && validSorts.includes(sortParam)) {
      state.sort = sortParam;
    }

    const qParam = params.get("q");
    if (qParam !== null) {
      state.query = qParam.trim();
      if (el.q) el.q.value = state.query;
    }

    const roleParam = params.get("role");
    if (roleParam === "student" || roleParam === "teacher") {
      state.userRole = roleParam;
    }
  }

  function syncUrlAndTitle() {
    const params = new URLSearchParams();
    if (state.subject !== "All") params.set("subject", state.subject);
    if (state.classLevel !== "all") params.set("class", state.classLevel);
    if (state.chapterNo > 0) params.set("chapter", String(state.chapterNo));
    if (state.lang !== "all") params.set("lang", state.lang);
    if (state.exam !== "all") params.set("stream", state.exam);
    if (state.educator) params.set("educator", state.educator);
    if (state.sort !== "trending") params.set("sort", state.sort);
    if (state.query) params.set("q", state.query);
    if (state.userRole === "student") params.set("role", "student");

    const qs = params.toString();
    const nextRel = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash || ""}`;
    try {
      window.history.replaceState(null, "", nextRel);
    } catch {}

    // Accessible dynamic page title for deep-linked views
    const titleParts = [];
    if (state.chapterNo) {
      const ch = state.syllabusByNo.get(state.chapterNo);
      if (ch) titleParts.push(`Ch ${pad2(ch.chapter_no)} ${ch.chapter}`);
    } else if (state.subject !== "All") {
      titleParts.push(state.subject);
    }
    if (state.educator) titleParts.push(state.educator);
    if (state.lang !== "all") titleParts.push(state.lang);

    document.title = titleParts.length
      ? `${titleParts.join(" · ")} | ${CFG.brandName}`
      : BASE_TITLE;
  }

  /* ==========================================================================
     CLASSROOM SHARE (WhatsApp + Clipboard + Toast)
     ========================================================================== */
  function buildCurrentViewSharePayload(overrideChapterNo = 0) {
    const urlObj = new URL(window.location.href);
    if (overrideChapterNo > 0) {
      urlObj.searchParams.set("chapter", String(overrideChapterNo));
    }
    const shareUrl = urlObj.toString();

    const parts = [CFG.brandName];
    const targetChNo = overrideChapterNo || state.chapterNo;
    if (targetChNo > 0) {
      const ch = state.syllabusByNo.get(targetChNo);
      if (ch) parts.push(`Ch ${pad2(ch.chapter_no)} ${ch.chapter}`);
    } else {
      if (state.subject !== "All") parts.push(state.subject);
      if (state.classLevel !== "all") parts.push(state.classLevel);
    }
    if (state.educator) parts.push(`by ${state.educator}`);
    if (state.lang !== "all") parts.push(getLangMeta(state.lang).badge);
    if (state.exam !== "all") parts.push(state.exam);

    const count = overrideChapterNo
      ? filterVideosCustom({ chapterNo: overrideChapterNo }).length
      : getFilteredVideos().length;

    const text = `📚 ${parts.join(" · ")} (${count.toLocaleString()} Verified Lectures): ${shareUrl}`;
    return { text, url: shareUrl };
  }

  function buildVideoShareText(v) {
    const creator = v.educator || v.channel || CFG.brandName;
    const lang = v.language ? getLangMeta(v.language).badge : "Hinglish";
    return `📚 [Ch ${pad2(v.chapter_no)} · ${v.chapter}] — ${v.title} by ${creator} (${lang}): ${v.url}`;
  }

  async function copyToClipboard(str) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(str);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = str;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }

  function showShareToast(label, fullShareText) {
    if (!el.shareToast) return;
    if (el.toastMsg) el.toastMsg.textContent = label;
    if (el.toastWaLink) {
      el.toastWaLink.href = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
    }
    el.shareToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (el.shareToast) el.shareToast.hidden = true;
    }, 5500);
  }

  async function shareVideoCard(v) {
    const msg = buildVideoShareText(v);
    await copyToClipboard(msg);
    showShareToast("✓ Homework message copied! Tap to send on WhatsApp:", msg);
  }

  /* ==========================================================================
     RENDERING: TABS, INLINE PILLS, DYNAMIC DROPDOWNS & MOBILE PICKERS
     ========================================================================== */
  function applyStaticBrandConfig() {
    document.documentElement.dataset.platform = CFG.platformId;
    if (el.brandGlyph) el.brandGlyph.textContent = CFG.brandSymbol;
    if (el.brandName) el.brandName.textContent = CFG.brandName;
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
          state.lang = prob.lang || "all";
          state.exam = prob.exam || "all";
          if (prob.mode === "oneshot") state.sort = "quick_revision";
          else if (prob.mode === "playlists") state.sort = "playlists";
          else if (prob.mode === "pyq") state.sort = "pyq";
          else state.sort = "trending";
          if (el.q) el.q.value = state.query;
          syncSearchClear();
          renderAll({ announce: true });
        });
        el.quickProblems.appendChild(btn);
      }
    }
  }

  function renderSubjectTabs() {
    if (!el.subjectTabs) return;
    el.subjectTabs.replaceChildren();

    const poolForSubj = filterVideosCustom({ subject: "All", chapterNo: 0 });
    const subjCounts = new Map();
    for (const v of poolForSubj) {
      subjCounts.set(v.subject, (subjCounts.get(v.subject) || 0) + 1);
    }

    const items = [
      { key: "All", label: "All", icon: "✦", count: poolForSubj.length },
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
      btn.tabIndex =
        checked || (state.subject === "Saved" && item.key === "All") ? 0 : -1;

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
        renderAll({ announce: true });
      });
      el.subjectTabs.appendChild(btn);
    });
  }

  function renderClassPills() {
    if (!el.classPills) return;
    el.classPills.replaceChildren();
    const defs = getPlatformClassDefs();

    defs.forEach((def) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "radio");
      btn.className = "class-pill-btn";
      btn.dataset.classLevel = def.key;
      const checked = state.classLevel === def.key;
      btn.setAttribute("aria-checked", checked ? "true" : "false");
      btn.tabIndex = checked ? 0 : -1;
      btn.textContent = def.label;

      btn.addEventListener("click", () => {
        state.classLevel = def.key;
        // On Board/UPBoard, if switching to Class 10 while a Class 12 subject is active, widen subject to All
        if (state.subject !== "All" && state.subject !== "Saved") {
          const check = filterVideosCustom({
            subject: state.subject,
            classLevel: def.key,
            chapterNo: 0,
          });
          if (check.length === 0) state.subject = "All";
        }
        if (state.chapterNo) {
          const chCheck = filterVideosCustom({
            chapterNo: state.chapterNo,
            classLevel: def.key,
          });
          if (chCheck.length === 0) state.chapterNo = 0;
        }
        state.flatLimit = FLAT_PAGE_SIZE;
        renderAll({ announce: true });
      });

      el.classPills.appendChild(btn);
    });
  }

  function bindRadiogroupArrowKeys(container) {
    if (!container) return;
    container.addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
      const radios = Array.from(container.querySelectorAll('[role="radio"]'));
      if (!radios.length) return;
      const idx = Math.max(0, radios.indexOf(document.activeElement));
      let nextIdx = idx;
      if (e.key === "ArrowRight") nextIdx = (idx + 1) % radios.length;
      if (e.key === "ArrowLeft")
        nextIdx = (idx - 1 + radios.length) % radios.length;
      if (e.key === "Home") nextIdx = 0;
      if (e.key === "End") nextIdx = radios.length - 1;
      e.preventDefault();
      radios[nextIdx].focus();
      radios[nextIdx].click();
    });
  }

  /* Faceted Dropdown Counts — Never Leave Teachers Guessing */
  function updateFacetedSelects() {
    // 1. Language Select
    if (el.langSelect) {
      const baseLangPool = filterVideosCustom({ lang: "all" });
      const counts = new Map();
      for (const v of baseLangPool) {
        if (v.language) counts.set(v.language, (counts.get(v.language) || 0) + 1);
      }
      const langs = Array.from(
        new Set([
          ...state.allLanguages,
          ...(state.lang !== "all" ? [state.lang] : []),
        ])
      ).sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b));

      el.langSelect.replaceChildren();
      const allOpt = document.createElement("option");
      allOpt.value = "all";
      allOpt.textContent = `🌐 All Languages (${baseLangPool.length.toLocaleString()})`;
      el.langSelect.appendChild(allOpt);

      for (const lg of langs) {
        const meta = getLangMeta(lg);
        const c = counts.get(lg) || 0;
        const opt = document.createElement("option");
        opt.value = lg;
        opt.textContent = `🌐 ${meta.option} (${c.toLocaleString()})`;
        el.langSelect.appendChild(opt);
      }
      el.langSelect.value = state.lang;
      el.langSelect.classList.toggle("is-filtered", state.lang !== "all");
    }

    // 2. Exam / Board Stream Select
    if (el.examSelect) {
      const baseExamPool = filterVideosCustom({ exam: "all" });
      const counts = new Map();
      for (const v of baseExamPool) {
        if (v.target_exam) {
          counts.set(v.target_exam, (counts.get(v.target_exam) || 0) + 1);
        }
      }
      const exams = Array.from(
        new Set([
          ...state.allExams,
          ...(state.exam !== "all" ? [state.exam] : []),
        ])
      ).sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b));

      el.examSelect.replaceChildren();
      const allOpt = document.createElement("option");
      allOpt.value = "all";
      allOpt.textContent = `🎓 All Streams (${baseExamPool.length.toLocaleString()})`;
      el.examSelect.appendChild(allOpt);

      for (const ex of exams) {
        const c = counts.get(ex) || 0;
        const opt = document.createElement("option");
        opt.value = ex;
        opt.textContent = `🎓 ${ex} (${c.toLocaleString()})`;
        el.examSelect.appendChild(opt);
      }
      el.examSelect.value = state.exam;
      el.examSelect.classList.toggle("is-filtered", state.exam !== "all");
    }

    // 3. Educator / Channel Select (Directly in Row 2!)
    if (el.educatorSelect) {
      const baseEduPool = filterVideosCustom({ educator: "" });
      const counts = new Map();
      for (const v of baseEduPool) {
        const name = v.educator || v.channel;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      }
      const educators = Array.from(
        new Set([
          ...state.allEducators,
          ...(state.educator ? [state.educator] : []),
        ])
      ).sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b));

      el.educatorSelect.replaceChildren();
      const allOpt = document.createElement("option");
      allOpt.value = "";
      allOpt.textContent = `👨‍🏫 All Educators (${counts.size || educators.length})`;
      el.educatorSelect.appendChild(allOpt);

      for (const name of educators) {
        const c = counts.get(name) || 0;
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = `👨‍🏫 ${name} (${c})`;
        el.educatorSelect.appendChild(opt);
      }
      el.educatorSelect.value = state.educator;
      el.educatorSelect.classList.toggle("is-filtered", Boolean(state.educator));
    }

    // 4. Sort Select
    if (el.sortSelect) {
      el.sortSelect.value = state.sort;
      el.sortSelect.classList.toggle("is-filtered", state.sort !== "trending");
    }
  }

  function renderSyllabusTrees() {
    const chPool = filterVideosCustom({ chapterNo: 0 });
    const chCounts = new Map();
    for (const v of chPool) {
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
        if (
          state.classLevel !== "all" &&
          state.classLevel !== "dropper" &&
          state.chapterNo !== ch.chapter_no &&
          (chCounts.get(ch.chapter_no) || 0) === 0
        ) {
          return false;
        }
        if (!q) return true;
        const extra = CFG.acronyms[ch.chapter_no] || "";
        const hay =
          `${ch.chapter_no} ${pad2(ch.chapter_no)} ${ch.chapter} ${ch.unit} ${ch.subject} ${extra}`.toLowerCase();
        return hay.includes(q);
      });

      if (el.railChTotal && !closeDrawerOnPick) {
        el.railChTotal.textContent = String(visibleChapters.length);
      }

      const byUnit = new Map();
      for (const ch of visibleChapters) {
        const uKey =
          state.subject === "All" || state.subject === "Saved"
            ? `${CFG.subjectMeta[ch.subject]?.short || ch.subject} · ${ch.unit}`
            : ch.unit;
        if (!byUnit.has(uKey)) byUnit.set(uKey, []);
        byUnit.get(uKey).push(ch);
      }

      if (!byUnit.size) {
        const empty = document.createElement("p");
        empty.style.padding = "0.75rem";
        empty.style.color = "var(--muted)";
        empty.style.fontSize = "0.82rem";
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
        ul.setAttribute("role", "list");

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
          noSpan.textContent =
            state.userRole === "student" && isDone ? "✓" : pad2(ch.chapter_no);

          const nameSpan = document.createElement("span");
          nameSpan.className = "ch-name";
          nameSpan.textContent = ch.chapter;

          const cntSpan = document.createElement("span");
          cntSpan.className = "ch-cnt";
          cntSpan.textContent = String(chCounts.get(ch.chapter_no) || 0);

          btn.append(noSpan, nameSpan, cntSpan);
          btn.addEventListener("click", () => {
            state.chapterNo =
              state.chapterNo === ch.chapter_no ? 0 : ch.chapter_no;
            state.flatLimit = FLAT_PAGE_SIZE;
            if (closeDrawerOnPick && el.syllabusDialog?.open) {
              el.syllabusDialog.close();
            }
            renderAll({ announce: true });
            window.scrollTo({ top: 0, behavior: "smooth" });
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

  function updateChromeAndCounters(filtered) {
    const isStudent = state.userRole === "student";
    el.roleTeacherBtn?.setAttribute("aria-pressed", isStudent ? "false" : "true");
    el.roleStudentBtn?.setAttribute("aria-pressed", isStudent ? "true" : "false");

    if (el.studentProgressBox) el.studentProgressBox.hidden = !isStudent;
    if (el.studentShortcutsBar) el.studentShortcutsBar.hidden = !isStudent;

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

    if (el.cntSaved) el.cntSaved.textContent = String(state.saved.size);
    el.savedDeckBtn?.setAttribute(
      "aria-pressed",
      state.subject === "Saved" ? "true" : "false"
    );

    if (el.clearChapterBtn) el.clearChapterBtn.hidden = !state.chapterNo;
    if (el.drawerAllChBtn) el.drawerAllChBtn.hidden = !state.chapterNo;

    // Mobile Bottom Nav Dynamic Labels & Active States
    if (el.mobChLabel) {
      if (state.chapterNo) {
        const ch = state.syllabusByNo.get(state.chapterNo);
        el.mobChLabel.textContent = ch
          ? `Ch ${pad2(ch.chapter_no)}`
          : "Chapters";
      } else {
        el.mobChLabel.textContent = `Chapters (${state.syllabus.length})`;
      }
    }
    el.mobChaptersBtn?.classList.toggle("is-active", state.chapterNo > 0);

    if (el.mobLangLabel) {
      el.mobLangLabel.textContent =
        state.lang === "all" ? "Language" : state.lang;
    }
    el.mobLangBtn?.classList.toggle("is-active", state.lang !== "all");

    if (el.mobEduLabel) {
      el.mobEduLabel.textContent = state.educator
        ? state.educator.split(/\s+/)[0]
        : "Educators";
    }
    el.mobEducatorBtn?.classList.toggle("is-active", Boolean(state.educator));

    if (el.heroStats && state.syllabus.length) {
      const chWord = CFG.platformId === "olympiad" ? "Mod" : "Ch";
      el.heroStats.textContent = `${state.syllabus.length} ${chWord} · ${state.videos.length.toLocaleString()} Verified Lectures`;
    }

    // Screen-reader count
    const chaptersRepresented = new Set(filtered.map((v) => v.chapter_no)).size;
    const summaryText = `${filtered.length.toLocaleString()} matching lectures across ${chaptersRepresented} chapter${chaptersRepresented === 1 ? "" : "s"}`;
    if (el.count) el.count.textContent = summaryText;
  }

  function renderActiveFilterPills(filtered) {
    if (!el.activeFiltersBar || !el.activeFilters) return;
    el.activeFilters.replaceChildren();

    const chips = [];
    if (state.subject === "Saved") {
      chips.push({
        label: "★ Saved Deck",
        clear: () => {
          state.subject = "All";
        },
      });
    } else if (state.subject !== "All") {
      chips.push({
        label: state.subject,
        clear: () => {
          state.subject = "All";
        },
      });
    }
    if (state.classLevel !== "all") {
      const lbl =
        getPlatformClassDefs().find((d) => d.key === state.classLevel)?.label ||
        state.classLevel;
      chips.push({
        label: lbl,
        clear: () => {
          state.classLevel = "all";
        },
      });
    }
    if (state.chapterNo) {
      const ch = state.syllabusByNo.get(state.chapterNo);
      chips.push({
        label: ch
          ? `Ch ${pad2(ch.chapter_no)}: ${ch.chapter}`
          : `Ch ${state.chapterNo}`,
        clear: () => {
          state.chapterNo = 0;
        },
      });
    }
    if (state.lang !== "all") {
      chips.push({
        label: `🌐 ${getLangMeta(state.lang).badge}`,
        clear: () => {
          state.lang = "all";
        },
      });
    }
    if (state.exam !== "all") {
      chips.push({
        label: `🎓 ${state.exam}`,
        clear: () => {
          state.exam = "all";
        },
      });
    }
    if (state.educator) {
      chips.push({
        label: `👨‍🏫 ${state.educator}`,
        clear: () => {
          state.educator = "";
        },
      });
    }
    if (state.sort !== "trending") {
      const sortLbl =
        el.sortSelect?.selectedOptions?.[0]?.textContent?.replace(
          /^.*?Sort:\s*/,
          ""
        ) || state.sort;
      chips.push({
        label: sortLbl,
        clear: () => {
          state.sort = "trending";
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

    if (!chips.length) {
      el.activeFiltersBar.hidden = true;
      return;
    }

    el.activeFiltersBar.hidden = false;
    if (el.activeSummary) {
      el.activeSummary.textContent = `${filtered.length.toLocaleString()} matching lecture${filtered.length === 1 ? "" : "s"}`;
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
      reset.textContent = "Reset All";
      reset.addEventListener("click", resetAllFilters);
      el.activeFilters.appendChild(reset);
    }
  }

  /* ==========================================================================
     HIGH-RES THUMBNAILS (hqdefault.jpg + Grey Placeholder Guard)
     ========================================================================== */
  function resolveThumbUrls(v) {
    const vid =
      v.embed_video_id || (v.provider === "youtube" ? v.video_id : "");
    const raw = String(v.thumbnail || "").trim();
    const list = [];
    if (vid && /^[A-Za-z0-9_-]{11}$/.test(vid)) {
      list.push(`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`);
      list.push(`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`);
    }
    if (raw && /^https?:\/\//i.test(raw) && !list.includes(raw)) {
      list.push(raw);
    }
    return list;
  }

  function buildPosterFallback(v) {
    const fb = document.createElement("div");
    fb.className = "thumb-fallback";
    const st = document.createElement("strong");
    st.textContent = `Ch ${pad2(v.chapter_no)} · ${v.chapter}`;
    const sp = document.createElement("span");
    sp.textContent = v.educator || v.channel || CFG.brandName;
    fb.append(st, sp);
    return fb;
  }

  function createThumbnailImage(v, opts = {}) {
    const urls = resolveThumbUrls(v);
    if (!urls.length) {
      return buildPosterFallback(v);
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

    const advanceOrFallback = () => {
      idx += 1;
      if (idx < urls.length) {
        img.src = urls[idx];
        return;
      }
      img.replaceWith(buildPosterFallback(v));
    };

    img.addEventListener("error", advanceOrFallback);
    img.addEventListener("load", () => {
      // YouTube returns a 120x90 grey placeholder when a thumbnail doesn't exist
      if (img.naturalWidth > 0 && img.naturalWidth <= 120) {
        advanceOrFallback();
      }
    });
    return img;
  }

  /* ==========================================================================
     CLASSROOM VIDEO CARD (Clean Hierarchy + Dual Action Footer + Share)
     ========================================================================== */
  function createVideoCard(v, opts = {}) {
    const card = document.createElement("article");
    card.className = "card";

    // 1. Top 16:9 Thumbnail Bar
    const media = document.createElement("div");
    media.className = "card-media";

    const creatorName = v.educator || v.channel || "Educator";
    const thumbBtn = document.createElement("button");
    thumbBtn.type = "button";
    thumbBtn.className = "thumb-btn";
    thumbBtn.setAttribute(
      "aria-label",
      `Watch inline: ${v.title} by ${creatorName} (${shortRef(v)})`
    );
    thumbBtn.appendChild(
      createThumbnailImage(v, {
        highPriority: opts.highPriority,
        lazy: opts.lazyImage,
      })
    );

    const veil = document.createElement("span");
    veil.className = "play-veil";
    veil.setAttribute("aria-hidden", "true");
    const circle = document.createElement("span");
    circle.className = "play-circle";
    circle.textContent = "▶";
    veil.appendChild(circle);
    thumbBtn.appendChild(veil);

    // Top Badge Bar: Language Pill in Native Script
    const topBar = document.createElement("span");
    topBar.className = "thumb-bar-top";
    const lMeta = getLangMeta(v.language || "Hinglish");
    const langPill = document.createElement("span");
    langPill.className = `thumb-lang-pill${lMeta.regional ? " is-regional" : ""}`;
    langPill.textContent = lMeta.badge;
    topBar.appendChild(langPill);
    thumbBtn.appendChild(topBar);

    // Bottom Badge Bar: Traction + Duration / Lecture Count
    const bottomBar = document.createElement("span");
    bottomBar.className = "thumb-bar-bottom";

    const traction = getTractionPill(v);
    const trPill = document.createElement("span");
    trPill.className = `thumb-traction-pill${traction.cls ? ` ${traction.cls}` : ""}`;
    trPill.textContent = traction.text;

    const durPill = document.createElement("span");
    durPill.className = "thumb-dur-pill";
    durPill.textContent = getDurationBadge(v);

    bottomBar.append(trPill, durPill);
    thumbBtn.appendChild(bottomBar);

    thumbBtn.addEventListener("click", () => openPlayer(v));
    media.appendChild(thumbBtn);

    // 2. Card Body
    const body = document.createElement("div");
    body.className = "card-body";

    // Chapter & Stream Tag + Bookmark Button
    const metaTop = document.createElement("div");
    metaTop.className = "card-meta-top";

    const chBtn = document.createElement("button");
    chBtn.type = "button";
    chBtn.className = "card-chapter-pill";
    const shortSubj = CFG.subjectMeta[v.subject]?.short || v.subject;
    const streamTxt = v.target_exam ? ` · ${v.target_exam}` : "";
    chBtn.textContent = `${shortSubj} · Ch ${pad2(v.chapter_no)} ${v.chapter}${streamTxt}`;
    chBtn.setAttribute(
      "aria-label",
      `Filter to Chapter ${pad2(v.chapter_no)} ${v.chapter} (${shortRef(v)})`
    );
    chBtn.addEventListener("click", () => {
      state.chapterNo = state.chapterNo === v.chapter_no ? 0 : v.chapter_no;
      renderAll({ announce: true });
    });

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "bookmark-icon-btn";
    const isSaved = state.saved.has(v._key);
    saveBtn.setAttribute("aria-pressed", isSaved ? "true" : "false");
    saveBtn.setAttribute(
      "aria-label",
      `${isSaved ? "Remove saved video" : "Save video"}: ${v.title} (${shortRef(v)})`
    );
    saveBtn.textContent = isSaved ? "★" : "☆";
    saveBtn.addEventListener("click", () => {
      if (state.saved.has(v._key)) state.saved.delete(v._key);
      else state.saved.add(v._key);
      saveSet(SAVED_KEY, state.saved);
      const nowSaved = state.saved.has(v._key);
      saveBtn.setAttribute("aria-pressed", nowSaved ? "true" : "false");
      saveBtn.textContent = nowSaved ? "★" : "☆";
      if (el.cntSaved) el.cntSaved.textContent = String(state.saved.size);
      if (state.subject === "Saved") renderAll({ announce: true });
    });

    metaTop.append(chBtn, saveBtn);

    // Full 2-Line Readable Title
    const h3 = document.createElement("h3");
    h3.className = "card-title";
    h3.textContent = v.title;

    // Clickable Educator Badge Row
    const eduRow = document.createElement("div");
    eduRow.className = "card-educator-row";

    const eduBtn = document.createElement("button");
    eduBtn.type = "button";
    eduBtn.className = "educator-pill";
    eduBtn.setAttribute(
      "aria-label",
      `Filter all lectures by educator ${creatorName} (${shortRef(v)})`
    );

    const av = document.createElement("span");
    av.className = "creator-avatar";
    av.setAttribute("aria-hidden", "true");
    av.textContent = creatorInitials(creatorName);

    const eduTxt = document.createElement("span");
    eduTxt.className = "educator-name-txt";
    eduTxt.textContent = creatorName;

    eduBtn.append(av, eduTxt);
    eduBtn.addEventListener("click", () => {
      state.educator = state.educator === creatorName ? "" : creatorName;
      renderAll({ announce: true });
    });

    eduRow.appendChild(eduBtn);
    if (v.view_count > 0) {
      const viewsHint = document.createElement("span");
      viewsHint.className = "card-views-hint";
      viewsHint.textContent = `${compactNum(v.view_count)} views`;
      eduRow.appendChild(viewsHint);
    }

    // 3. Dual Action Footer + 1-Tap Homework Share
    const footer = document.createElement("div");
    footer.className = "card-actions-footer";

    const watchBtn = document.createElement("button");
    watchBtn.type = "button";
    watchBtn.className = "action-watch-btn";
    watchBtn.textContent = "▶ Watch Inline";
    watchBtn.setAttribute(
      "aria-label",
      `Watch inline: ${v.title} (${shortRef(v)})`
    );
    watchBtn.addEventListener("click", () => openPlayer(v));

    const ytLink = document.createElement("a");
    ytLink.className = "action-yt-btn";
    ytLink.href = v.url;
    ytLink.target = "_blank";
    ytLink.rel = "noopener noreferrer";
    ytLink.textContent = "↗ YouTube App";
    ytLink.setAttribute(
      "aria-label",
      `Open in YouTube App: ${v.title} (${shortRef(v)})`
    );

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "action-share-btn";
    shareBtn.textContent = "📲";
    shareBtn.setAttribute(
      "aria-label",
      `Share lecture on WhatsApp or copy link: ${v.title} (${shortRef(v)})`
    );
    shareBtn.addEventListener("click", () => shareVideoCard(v));

    footer.append(watchBtn, ytLink, shareBtn);

    body.append(metaTop, h3, eduRow, footer);
    card.append(media, body);
    return card;
  }

  /* ==========================================================================
     SMART EMPTY-STATE RECOVERY (1-Click Alternative Suggestions)
     ========================================================================== */
  function renderSmartEmptyState() {
    el.list.replaceChildren();
    const box = document.createElement("div");
    box.className = "empty-state";

    const h2 = document.createElement("h2");
    const p = document.createElement("p");
    const actions = document.createElement("div");
    actions.className = "recovery-actions";

    if (state.subject === "Saved") {
      h2.textContent = "Your Saved Deck is currently empty";
      p.textContent =
        "Tap ☆ on any lecture or playlist card to bookmark videos for upcoming classes or revision.";
      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "primary-btn";
      allBtn.textContent = "Browse All Verified Lectures";
      allBtn.addEventListener("click", () => {
        state.subject = "All";
        renderAll({ announce: true });
      });
      actions.appendChild(allBtn);
      box.append(h2, p, actions);
      el.list.appendChild(box);
      return;
    }

    h2.textContent = "No lectures matched all active filters simultaneously";

    // Compute smart relaxations
    const withoutLang =
      state.lang !== "all" ? filterVideosCustom({ lang: "all" }) : [];
    const withoutEducator = state.educator
      ? filterVideosCustom({ educator: "" })
      : [];
    const withoutExam =
      state.exam !== "all" ? filterVideosCustom({ exam: "all" }) : [];
    const withoutSort =
      state.sort !== "trending" ? filterVideosCustom({ sort: "trending" }) : [];
    const withoutQuery = state.query ? filterVideosCustom({ query: "" }) : [];

    if (withoutLang.length > 0) {
      const topLangs = Array.from(
        new Set(withoutLang.map((v) => v.language).filter(Boolean))
      )
        .slice(0, 2)
        .join("/");
      const chDesc = state.chapterNo
        ? `Ch ${pad2(state.chapterNo)}`
        : "this selection";
      p.textContent = `No videos in ${state.lang} for ${chDesc} yet — ${withoutLang.length} verified lectures are ready in ${topLangs || "other languages"}.`;

      const langFixBtn = document.createElement("button");
      langFixBtn.type = "button";
      langFixBtn.className = "primary-btn";
      langFixBtn.textContent = `🌐 View ${withoutLang.length} ${topLangs || "All-Language"} Lectures`;
      langFixBtn.addEventListener("click", () => {
        state.lang = "all";
        renderAll({ announce: true });
      });
      actions.appendChild(langFixBtn);
    } else {
      p.textContent =
        "Pick one of the 1-click recovery suggestions below to immediately view available lectures:";
    }

    if (withoutEducator.length > 0) {
      const eduBtn = document.createElement("button");
      eduBtn.type = "button";
      eduBtn.className = actions.children.length ? "secondary-btn" : "primary-btn";
      eduBtn.textContent = `👨‍🏫 Show All Educators (${withoutEducator.length} Lectures)`;
      eduBtn.addEventListener("click", () => {
        state.educator = "";
        renderAll({ announce: true });
      });
      actions.appendChild(eduBtn);
    }

    if (withoutExam.length > 0) {
      const exBtn = document.createElement("button");
      exBtn.type = "button";
      exBtn.className = actions.children.length ? "secondary-btn" : "primary-btn";
      exBtn.textContent = `🎓 All Exam Streams (${withoutExam.length} Lectures)`;
      exBtn.addEventListener("click", () => {
        state.exam = "all";
        renderAll({ announce: true });
      });
      actions.appendChild(exBtn);
    }

    if (withoutSort.length > 0) {
      const sBtn = document.createElement("button");
      sBtn.type = "button";
      sBtn.className = "secondary-btn";
      sBtn.textContent = `🔥 Show All Formats (${withoutSort.length})`;
      sBtn.addEventListener("click", () => {
        state.sort = "trending";
        renderAll({ announce: true });
      });
      actions.appendChild(sBtn);
    }

    if (withoutQuery.length > 0) {
      const qBtn = document.createElement("button");
      qBtn.type = "button";
      qBtn.className = "secondary-btn";
      qBtn.textContent = `Clear Search “${state.query}” (${withoutQuery.length})`;
      qBtn.addEventListener("click", () => {
        state.query = "";
        if (el.q) el.q.value = "";
        syncSearchClear();
        renderAll({ announce: true });
      });
      actions.appendChild(qBtn);
    }

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = actions.children.length ? "secondary-btn" : "primary-btn";
    resetBtn.textContent = "↺ Reset All Filters";
    resetBtn.addEventListener("click", resetAllFilters);
    actions.appendChild(resetBtn);

    box.append(h2, p, actions);
    el.list.appendChild(box);
  }

  /* ==========================================================================
     MAIN VIDEO STREAM (Chapterwise & Most Viewed Leaderboard)
     ========================================================================== */
  function renderMainStream(filtered) {
    if (!el.list) return;
    if (!filtered.length) {
      renderSmartEmptyState();
      return;
    }

    if (state.sort === "views") {
      el.list.replaceChildren();
      const sorted = filtered
        .slice()
        .sort((a, b) => compareItems(a, b, "views"));
      const slice = sorted.slice(0, state.flatLimit);

      const grid = document.createElement("div");
      grid.className = "cards-grid";
      slice.forEach((v, idx) => {
        grid.appendChild(
          createVideoCard(v, {
            highPriority: idx < 4,
            lazyImage: idx >= 8,
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

    // Group by Chapter
    const grouped = new Map();
    for (const v of filtered) {
      if (!grouped.has(v.chapter_no)) grouped.set(v.chapter_no, []);
      grouped.get(v.chapter_no).push(v);
    }

    const chapterEntries = [];
    for (const [chNo, items] of grouped.entries()) {
      items.sort(comparePureTrend);
      const chMeta = state.syllabusByNo.get(chNo) || {
        chapter_no: chNo,
        chapter: items[0].chapter,
        subject: items[0].subject,
        unit: items[0].unit,
        weightage: items[0].weightage,
      };
      const peakTrend =
        Number(items[0]?._rankTrend ?? items[0]?.trend_score) || 0;
      chapterEntries.push({ chNo, chMeta, items, peakTrend });
    }

    if (state.sort === "chapterwise") {
      chapterEntries.sort((a, b) => a.chNo - b.chNo);
    } else {
      chapterEntries.sort(
        (a, b) => b.peakTrend - a.peakTrend || a.chNo - b.chNo
      );
    }

    el.list.replaceChildren();
    const frag = document.createDocumentFragment();
    const isStudent = state.userRole === "student";

    chapterEntries.forEach(({ chNo, chMeta, items }, secIdx) => {
      const section = document.createElement("section");
      section.className = `chapter-section${secIdx >= 3 ? " is-deferred" : ""}`;
      section.id = `chapter-${chNo}`;

      const header = document.createElement("div");
      header.className = "chapter-header";

      const titleCluster = document.createElement("div");
      titleCluster.className = "chapter-title-cluster";

      const chPill = document.createElement("span");
      chPill.className = "ch-pill";
      const shortSubj =
        CFG.subjectMeta[chMeta.subject]?.short || chMeta.subject;
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

      // 1-Tap Share Chapter Button for Teachers
      const chShareBtn = document.createElement("button");
      chShareBtn.type = "button";
      chShareBtn.className = "ch-share-btn";
      chShareBtn.textContent = "📲 Share Ch";
      chShareBtn.setAttribute(
        "aria-label",
        `Share Chapter ${pad2(chNo)} ${chMeta.chapter} view`
      );
      chShareBtn.addEventListener("click", async () => {
        const payload = buildCurrentViewSharePayload(chNo);
        await copyToClipboard(payload.text);
        showShareToast(
          `✓ Ch ${pad2(chNo)} classroom link copied!`,
          payload.text
        );
      });
      actionsCluster.appendChild(chShareBtn);

      if (isStudent) {
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
      }

      const isIsolated =
        state.chapterNo === chNo ||
        Boolean(state.query) ||
        Boolean(state.educator) ||
        state.expandedChapters.has(chNo);
      const visibleItems = isIsolated
        ? items
        : items.slice(0, CARDS_PER_CHAPTER_COLLAPSED);

      if (
        !state.chapterNo &&
        !state.query &&
        !state.educator &&
        items.length > CARDS_PER_CHAPTER_COLLAPSED
      ) {
        const expBtn = document.createElement("button");
        expBtn.type = "button";
        expBtn.className = "expand-ch-btn";
        const expanded = state.expandedChapters.has(chNo);
        expBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
        expBtn.textContent = expanded
          ? "Top 4"
          : `All ${items.length} →`;
        expBtn.setAttribute(
          "aria-label",
          expanded
            ? `Show top 4 lectures for Chapter ${pad2(chNo)} ${chMeta.chapter}`
            : `View all ${items.length} lectures for Chapter ${pad2(chNo)} ${chMeta.chapter}`
        );
        expBtn.addEventListener("click", () => {
          if (state.expandedChapters.has(chNo)) state.expandedChapters.delete(chNo);
          else state.expandedChapters.add(chNo);
          renderMainStream(filtered);
        });
        actionsCluster.appendChild(expBtn);
      }

      header.append(titleCluster, actionsCluster);

      const grid = document.createElement("div");
      grid.className = "cards-grid";
      visibleItems.forEach((v, cardIdx) => {
        grid.appendChild(
          createVideoCard(v, {
            highPriority: secIdx === 0 && cardIdx < 4,
            lazyImage: secIdx >= 1,
          })
        );
      });

      section.append(header, grid);
      frag.appendChild(section);
    });

    el.list.appendChild(frag);
  }

  function renderAll({ announce = false, syncUrl = true } = {}) {
    const filtered = getFilteredVideos();
    renderSubjectTabs();
    renderClassPills();
    updateFacetedSelects();
    updateChromeAndCounters(filtered);
    renderActiveFilterPills(filtered);
    renderSyllabusTrees();
    renderMainStream(filtered);

    if (syncUrl) syncUrlAndTitle();

    if (announce && el.liveStatus) {
      const chCount = new Set(filtered.map((v) => v.chapter_no)).size;
      el.liveStatus.textContent = `${filtered.length.toLocaleString()} lectures across ${chCount} chapters`;
    }
  }

  function resetAllFilters() {
    state.subject = "All";
    state.classLevel = "all";
    state.chapterNo = 0;
    state.query = "";
    state.lang = "all";
    state.exam = "all";
    state.educator = "";
    state.sort = "trending";
    state.flatLimit = FLAT_PAGE_SIZE;
    if (el.q) el.q.value = "";
    syncSearchClear();
    renderAll({ announce: true });
  }

  /* ==========================================================================
     INLINE CLASSROOM PLAYER (referrerpolicy="strict-origin-when-cross-origin")
     ========================================================================== */
  function openPlayer(v) {
    if (!el.playerDialog) {
      window.open(v.url, "_blank", "noopener,noreferrer");
      return;
    }

    state.activePlayerVideo = v;
    const embedId =
      v.embed_video_id || (v.provider === "youtube" ? v.video_id : "");

    if (!embedId && v.provider === "playlist") {
      const listId = v.video_id;
      if (!listId) {
        window.open(v.url, "_blank", "noopener,noreferrer");
        return;
      }
      mountIframe(
        `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(listId)}&rel=0`,
        v
      );
      return;
    }

    if (v.provider === "playlist" && v.video_id) {
      mountIframe(
        `https://www.youtube.com/embed/${encodeURIComponent(embedId)}?list=${encodeURIComponent(v.video_id)}&autoplay=1&rel=0`,
        v
      );
      return;
    }

    mountIframe(
      `https://www.youtube.com/embed/${encodeURIComponent(embedId)}?autoplay=1&rel=0`,
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
        `Open ${v.title} in YouTube App`
      );
    }

    if (el.playerStage) {
      el.playerStage.replaceChildren();
      const iframe = document.createElement("iframe");
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
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
              iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(s.video_id)}?list=${encodeURIComponent(v.video_id)}&autoplay=1&rel=0`;
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

  /* ==========================================================================
     MOBILE BOTTOM-SHEET PICKER (Language & Educator 1-Thumb Picker)
     ========================================================================== */
  function openMobilePicker(kind) {
    if (!el.pickerDialog || !el.pickerList) return;
    state.pickerKind = kind;
    if (el.pickerSearch) el.pickerSearch.value = "";

    if (kind === "lang") {
      if (el.pickerTitle) el.pickerTitle.textContent = "🌐 Select Language Medium";
      if (el.pickerSearchWrap) {
        el.pickerSearchWrap.hidden = state.allLanguages.length <= 5;
      }
      if (el.pickerSearch) {
        el.pickerSearch.placeholder = "Search language (Hindi, Tamil, Telugu)…";
      }
    } else {
      if (el.pickerTitle) el.pickerTitle.textContent = "👨‍🏫 Select Educator / Channel";
      if (el.pickerSearchWrap) el.pickerSearchWrap.hidden = false;
      if (el.pickerSearch) {
        el.pickerSearch.placeholder = "Search educator (Om Sharma, Mohit Tyagi)…";
      }
    }

    renderMobilePickerOptions();
    if (!el.pickerDialog.open) el.pickerDialog.showModal();
  }

  function renderMobilePickerOptions() {
    if (!el.pickerList) return;
    el.pickerList.replaceChildren();
    const q = (el.pickerSearch?.value || "").toLowerCase().trim();

    if (state.pickerKind === "lang") {
      const basePool = filterVideosCustom({ lang: "all" });
      const counts = new Map();
      for (const v of basePool) {
        if (v.language) counts.set(v.language, (counts.get(v.language) || 0) + 1);
      }

      const rows = [
        {
          value: "all",
          label: "🌐 All Languages",
          search: "all any",
          count: basePool.length,
        },
        ...state.allLanguages
          .slice()
          .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0))
          .map((lg) => {
            const m = getLangMeta(lg);
            return {
              value: lg,
              label: `🌐 ${m.option}`,
              search: `${lg} ${m.option} ${m.aliases}`.toLowerCase(),
              count: counts.get(lg) || 0,
            };
          }),
      ];

      for (const r of rows) {
        if (q && r.value !== "all" && !r.search.includes(q)) continue;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `picker-option-btn${state.lang === r.value ? " is-selected" : ""}`;
        const span = document.createElement("span");
        span.textContent = r.label;
        const cnt = document.createElement("span");
        cnt.className = "picker-opt-cnt";
        cnt.textContent = r.count.toLocaleString();
        btn.append(span, cnt);
        btn.addEventListener("click", () => {
          state.lang = r.value;
          el.pickerDialog?.close();
          renderAll({ announce: true });
        });
        el.pickerList.appendChild(btn);
      }
      return;
    }

    // Educator Picker
    const basePool = filterVideosCustom({ educator: "" });
    const counts = new Map();
    for (const v of basePool) {
      const n = v.educator || v.channel;
      if (n) counts.set(n, (counts.get(n) || 0) + 1);
    }

    const sortedEdu = state.allEducators
      .slice()
      .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b));

    const rows = [
      {
        value: "",
        label: "👨‍🏫 All Educators & Channels",
        count: basePool.length,
      },
      ...sortedEdu.map((name) => ({
        value: name,
        label: `👨‍🏫 ${name}`,
        count: counts.get(name) || 0,
      })),
    ];

    for (const r of rows) {
      if (q && r.value !== "" && !r.label.toLowerCase().includes(q)) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `picker-option-btn${state.educator === r.value ? " is-selected" : ""}`;
      const span = document.createElement("span");
      span.textContent = r.label;
      const cnt = document.createElement("span");
      cnt.className = "picker-opt-cnt";
      cnt.textContent = r.count.toLocaleString();
      btn.append(span, cnt);
      btn.addEventListener("click", () => {
        state.educator = r.value;
        el.pickerDialog?.close();
        renderAll({ announce: true });
      });
      el.pickerList.appendChild(btn);
    }
  }

  /* ==========================================================================
     THEME TOGGLE, LIGHT-DISMISS FALLBACK & EVENT BINDINGS
     ========================================================================== */
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
    el.themeToggle?.addEventListener("click", () => {
      const meta = document.querySelector('meta[name="color-scheme"]');
      if (!meta) return;
      const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
      const sysScheme = prefersDark ? "dark" : "light";
      let stored = null;
      try {
        stored = localStorage.getItem("color-scheme");
      } catch {}
      const rendered =
        stored === "dark" || stored === "light" ? stored : sysScheme;
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
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      });
    }
  }

  function syncSearchClear() {
    const hasText = Boolean(el.q?.value);
    if (el.clearQ) el.clearQ.hidden = !hasText;
    if (el.keyHint) el.keyHint.hidden = hasText;
  }

  function setRole(role) {
    state.userRole = role === "student" ? "student" : "teacher";
    try {
      localStorage.setItem(ROLE_KEY, state.userRole);
    } catch {}
    renderAll({ announce: true });
  }

  function bindEvents() {
    // Teacher / Student Mode Toggle
    el.roleTeacherBtn?.addEventListener("click", () => setRole("teacher"));
    el.roleStudentBtn?.addEventListener("click", () => setRole("student"));

    // 1-Click Share Current Filtered View (Desktop Topbar)
    el.shareCopyBtn?.addEventListener("click", async () => {
      const payload = buildCurrentViewSharePayload();
      await copyToClipboard(payload.text);
      showShareToast("✓ Filtered classroom view copied!", payload.text);
    });

    el.shareWhatsappBtn?.addEventListener("click", async () => {
      const payload = buildCurrentViewSharePayload();
      await copyToClipboard(payload.text);
      showShareToast("✓ Opening WhatsApp share…", payload.text);
      window.open(
        `https://wa.me/?text=${encodeURIComponent(payload.text)}`,
        "_blank",
        "noopener,noreferrer"
      );
    });

    // Saved Deck
    el.savedDeckBtn?.addEventListener("click", () => {
      state.subject = state.subject === "Saved" ? "All" : "Saved";
      renderAll({ announce: true });
    });

    // Instant Search (#q)
    let searchTimer = null;
    el.q?.addEventListener("input", () => {
      syncSearchClear();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = el.q.value.trim();
        state.flatLimit = FLAT_PAGE_SIZE;
        renderAll({ announce: true });
      }, 75);
    });

    el.clearQ?.addEventListener("click", () => {
      if (el.q) el.q.value = "";
      state.query = "";
      syncSearchClear();
      renderAll({ announce: true });
      el.q?.focus();
    });

    document.addEventListener("keydown", (e) => {
      if (e.isComposing || e.keyCode === 229) return;
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

    // Row 2 Native Dropdowns
    el.langSelect?.addEventListener("change", () => {
      state.lang = el.langSelect.value || "all";
      state.flatLimit = FLAT_PAGE_SIZE;
      renderAll({ announce: true });
    });

    el.examSelect?.addEventListener("change", () => {
      state.exam = el.examSelect.value || "all";
      state.flatLimit = FLAT_PAGE_SIZE;
      renderAll({ announce: true });
    });

    el.educatorSelect?.addEventListener("change", () => {
      state.educator = el.educatorSelect.value || "";
      state.flatLimit = FLAT_PAGE_SIZE;
      renderAll({ announce: true });
    });

    el.sortSelect?.addEventListener("change", () => {
      state.sort = el.sortSelect.value || "trending";
      state.flatLimit = FLAT_PAGE_SIZE;
      renderAll({ announce: true });
    });

    // Syllabus Search & Reset
    el.clearChapterBtn?.addEventListener("click", () => {
      state.chapterNo = 0;
      renderAll({ announce: true });
    });

    el.drawerAllChBtn?.addEventListener("click", () => {
      state.chapterNo = 0;
      el.syllabusDialog?.close();
      renderAll({ announce: true });
    });

    el.chFilter?.addEventListener("input", () => renderSyllabusTrees());
    el.drawerChFilter?.addEventListener("input", () => renderSyllabusTrees());

    // Mobile Sticky Bottom Nav (4 Thumb-Friendly Actions)
    el.mobChaptersBtn?.addEventListener("click", () => {
      el.syllabusDialog?.showModal();
    });

    el.mobLangBtn?.addEventListener("click", () => {
      openMobilePicker("lang");
    });

    el.mobEducatorBtn?.addEventListener("click", () => {
      openMobilePicker("educator");
    });

    el.mobShareBtn?.addEventListener("click", () => {
      const payload = buildCurrentViewSharePayload();
      if (el.shareSheetPreview) el.shareSheetPreview.textContent = payload.text;
      if (el.shareSheetWa) {
        el.shareSheetWa.href = `https://wa.me/?text=${encodeURIComponent(payload.text)}`;
      }
      el.shareDialog?.showModal();
    });

    el.shareSheetCopy?.addEventListener("click", async () => {
      const payload = buildCurrentViewSharePayload();
      await copyToClipboard(payload.text);
      el.shareDialog?.close();
      showShareToast("✓ Filtered classroom link copied!", payload.text);
    });

    el.pickerSearch?.addEventListener("input", () => {
      renderMobilePickerOptions();
    });

    // Player Modal Share & Cleanup
    el.playerShareBtn?.addEventListener("click", () => {
      if (state.activePlayerVideo) shareVideoCard(state.activePlayerVideo);
    });

    el.playerDialog?.addEventListener("close", () => {
      if (el.playerStage) el.playerStage.replaceChildren();
    });

    el.toastCloseBtn?.addEventListener("click", () => {
      if (el.shareToast) el.shareToast.hidden = true;
    });

    window.addEventListener("popstate", () => {
      state.subject = "All";
      state.classLevel = "all";
      state.chapterNo = 0;
      state.query = "";
      state.lang = "all";
      state.exam = "all";
      state.educator = "";
      state.sort = "trending";
      hydrateStateFromUrl();
      syncSearchClear();
      renderAll({ announce: false, syncUrl: false });
    });

    bindRadiogroupArrowKeys(el.subjectTabs);
    bindRadiogroupArrowKeys(el.classPills);
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
      state.videos = Array.isArray(payload.videos) ? payload.videos : [];
      state.videos.forEach(indexRecord);

      // Canonical global lists for URL hydration & faceted dropdowns
      const langTotals = new Map();
      const examTotals = new Map();
      const eduTotals = new Map();
      for (const v of state.videos) {
        if (v.language) {
          langTotals.set(v.language, (langTotals.get(v.language) || 0) + 1);
        }
        if (v.target_exam) {
          examTotals.set(
            v.target_exam,
            (examTotals.get(v.target_exam) || 0) + 1
          );
        }
        const ed = v.educator || v.channel;
        if (ed) eduTotals.set(ed, (eduTotals.get(ed) || 0) + 1);
      }

      state.allLanguages = Array.from(langTotals.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([k]) => k);
      state.allExams = Array.from(examTotals.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([k]) => k);
      state.allEducators = Array.from(eduTotals.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([k]) => k);

      hydrateStateFromUrl();
      syncSearchClear();
      renderAll({ announce: false, syncUrl: true });
    } catch (err) {
      if (el.subline) {
        el.subline.hidden = false;
        el.subline.textContent = `Could not load data/videos.json (${err.message}). Serve this folder over HTTP or GitHub Pages.`;
      }
    }
  }

  boot();
})();
