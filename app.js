const APP_BUILD_ID = "20260510-krv-esv-button-order-v45";
console.info("NT webapp build:", APP_BUILD_ID);
document.documentElement.dataset.appBuild = APP_BUILD_ID;

const DATA_CACHE_BUST = APP_BUILD_ID;

const ESV_WORKER_ENDPOINT = "https://solitary-credit-8f12.sdd98.workers.dev/";

const ESV_BOOK_NAMES = {
  matthew: "Matthew",
  mark: "Mark",
  luke: "Luke",
  john: "John",
  acts: "Acts",
  romans: "Romans",
  "1corinthians": "1 Corinthians",
  "2corinthians": "2 Corinthians",
  galatians: "Galatians",
  ephesians: "Ephesians",
  philippians: "Philippians",
  colossians: "Colossians",
  "1thessalonians": "1 Thessalonians",
  "2thessalonians": "2 Thessalonians",
  "1timothy": "1 Timothy",
  "2timothy": "2 Timothy",
  titus: "Titus",
  philemon: "Philemon",
  hebrews: "Hebrews",
  james: "James",
  "1peter": "1 Peter",
  "2peter": "2 Peter",
  "1john": "1 John",
  "2john": "2 John",
  "3john": "3 John",
  jude: "Jude",
  revelation: "Revelation"
};

const KOREAN_REVISED_BIBLE_PATHS = [
  "./data/public-bibles/korean-revised/bible.json",
  "./bible.json"
];

const KOREAN_REVISED_BOOK_KEYS = {
  matthew: "마",
  mark: "막",
  luke: "눅",
  john: "요",
  acts: "행",
  romans: "롬",
  "1corinthians": "고전",
  "2corinthians": "고후",
  galatians: "갈",
  ephesians: "엡",
  philippians: "빌",
  colossians: "골",
  "1thessalonians": "살전",
  "2thessalonians": "살후",
  "1timothy": "딤전",
  "2timothy": "딤후",
  titus: "딛",
  philemon: "몬",
  hebrews: "히",
  james: "약",
  "1peter": "벧전",
  "2peter": "벧후",
  "1john": "요일",
  "2john": "요이",
  "3john": "요삼",
  jude: "유",
  revelation: "계"
};

function withDataCacheBust(path) {
  if (!path || typeof path !== "string") return path;
  if (/^https?:/i.test(path)) return path;
  const separator = path.includes("?") ? "&" : "?";
  return path + separator + "v=" + encodeURIComponent(DATA_CACHE_BUST);
}

const BOOK_ACCENT_PALETTE = [
  "#C0392B", "#2563EB", "#16A34A", "#7C3AED", "#D97706",
  "#DC2626", "#0891B2", "#4F46E5", "#65A30D", "#9333EA",
  "#0D9488", "#EA580C", "#0284C7", "#BE123C", "#7C2D12",
  "#4338CA", "#15803D", "#A21CAF", "#B45309", "#047857",
  "#1D4ED8", "#6D28D9", "#0F766E", "#B91C1C", "#0369A1",
  "#92400E", "#111827", "#BE185D", "#2F855A", "#6B21A8",
  "#B7791F", "#1E40AF"
];

const BOOK_SHORT_LABELS = {
  matthew: "마", mark: "막", luke: "눅", john: "요", acts: "행",
  romans: "롬", "1corinthians": "고전", "2corinthians": "고후",
  galatians: "갈", ephesians: "엡", philippians: "빌", colossians: "골",
  "1thessalonians": "살전", "2thessalonians": "살후",
  "1timothy": "딤전", "2timothy": "딤후", titus: "딛", philemon: "몬",
  hebrews: "히", james: "약", "1peter": "벧전", "2peter": "벧후",
  "1john": "요1", "2john": "요2", "3john": "요3", jude: "유", revelation: "계"
};

function getBookShortLabel(book) {
  return BOOK_SHORT_LABELS[book?.id] || String(book?.bookKo || book?.bookEn || "?").trim().charAt(0) || "?";
}

function hashString(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function generatedAccentFromBook(book) {
  const seed = hashString((book?.id || "") + ":" + (book?.order || ""));
  const hue = (seed * 137.508) % 360;
  return "hsl(" + Math.round(hue) + " 68% 42%)";
}

function getBookAccent(bookOrId) {
  const books = state.manifest?.books || [];
  const book = typeof bookOrId === "string"
    ? books.find((item) => item.id === bookOrId) || { id: bookOrId }
    : bookOrId;

  const index = Number.isFinite(Number(book?.order)) ? Number(book.order) - 1 : books.findIndex((item) => item.id === book?.id);
  if (index >= 0 && index < BOOK_ACCENT_PALETTE.length) return BOOK_ACCENT_PALETTE[index];
  return generatedAccentFromBook(book);
}

const state = {
  manifest: null,
  books: {},
  currentBookId: null,
  currentChapter: 1,
  query: "",
  currentNoteId: null,
  highlights: {},
  highlightView: "all",
  contexts: {},
  contextStatus: {},
  sectionIntros: {},
  sectionIntroStatus: {},
  scholarNotes: {},
  scholarNoteStatus: {},
  contextView: "all",
  currentContextId: null,
  pendingMark: null,
  lastPointerPosition: null,
  selectionProbeTimer: null,
  searchRunId: 0,
  globalSearchResultCount: 0,
  motionReady: false,
  authUser: null,
  cloudHighlightsLoaded: false,
  cloudSyncInProgress: false,
  esvMemoryCache: {},
  koreanRevisedBible: null,
  koreanRevisedBiblePromise: null
};

const interpretiveTypingOriginalHtml = new WeakMap();
const interpretiveTypingTimers = new WeakMap();
let interpretiveTypingAnimationBound = false;

const $ = (id) => document.getElementById(id);

const els = {
  totalBookStat: $("totalBookStat"),
  bookCount: $("bookCount"),
  bookList: $("bookList"),
  bookTitle: $("bookTitle"),
  bookEnglishTitle: $("bookEnglishTitle"),
  bookDesc: $("bookDesc"),
  readerKicker: $("readerKicker"),
  chapterStat: $("chapterStat"),
  verseStat: $("verseStat"),
  chapterButtons: $("chapterButtons"),
  prevChapter: $("prevChapter"),
  nextChapter: $("nextChapter"),
  chapterTitle: $("chapterTitle"),
  verses: $("verses"),
  noteTitle: $("noteTitle"),
  noteBody: $("noteBody"),
  noteList: $("noteList"),
  noteCount: $("noteCount"),
  noteListToggle: $("noteListToggle"),
  searchInput: $("searchInput"),
  searchMeta: $("searchMeta"),
  highlightCount: $("highlightCount"),
  highlightList: $("highlightList"),
  highlightAllTab: $("highlightAllTab"),
  highlightCurrentTab: $("highlightCurrentTab"),
  mobileHighlightToggle: $("mobileHighlightToggle"),
  mobileHighlightCount: $("mobileHighlightCount"),
  contextCount: $("contextCount"),
  contextList: $("contextList"),
  contextBody: $("contextBody"),
  contextTabs: document.querySelectorAll("[data-context-view]"),
  authStatus: $("authStatus"),
  authUserName: $("authUserName"),
  authUserPhoto: $("authUserPhoto"),
  googleLoginBtn: $("googleLoginBtn"),
  googleLogoutBtn: $("googleLogoutBtn"),
  cloudSyncStatus: $("cloudSyncStatus")
};

async function loadJSON(path) {
  const requestPath = withDataCacheBust(path);
  const response = await fetch(requestPath, { cache: "no-store" });
  if (!response.ok) throw new Error(path + " 로딩 실패: HTTP " + response.status);
  return response.json();
}

async function tryLoadJSON(path) {
  try {
    const requestPath = withDataCacheBust(path);
    const response = await fetch(requestPath, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

function normalizeSectionIntroData(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.sections)) return raw.sections;
  if (raw.sections && typeof raw.sections === "object") return Object.values(raw.sections);
  return [];
}

async function ensureSectionIntros(bookId) {
  if (state.sectionIntroStatus[bookId] === "loaded") return state.sectionIntros[bookId] || [];

  const paths = [
    "./data/section-intros/" + bookId + "_intros.json",
    "./data/section-intros/" + bookId + ".json",
    "./data/" + bookId + "_section_intros.json"
  ];

  for (const path of paths) {
    const data = await tryLoadJSON(path);
    if (data) {
      state.sectionIntros[bookId] = normalizeSectionIntroData(data);
      state.sectionIntroStatus[bookId] = "loaded";
      return state.sectionIntros[bookId];
    }
  }

  state.sectionIntros[bookId] = [];
  state.sectionIntroStatus[bookId] = "loaded";
  return [];
}

function getSectionIntros(bookId, chapter, verse) {
  return (state.sectionIntros[bookId] || [])
    .filter((item) => Number(item.chapter) === Number(chapter) && Number(item.verse) === Number(verse));
}

function normalizeScholarNotesData(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.items)) return raw.items;
  if (raw.items && typeof raw.items === "object") return Object.values(raw.items);
  if (raw.scholarNotes && typeof raw.scholarNotes === "object") return Object.values(raw.scholarNotes);
  return [];
}

async function ensureScholarNotes(bookId) {
  if (state.scholarNoteStatus[bookId] === "loaded") return state.scholarNotes[bookId] || [];

  const paths = [
    "./data/interpretive-scholar-notes/" + bookId + "_scholars.json",
    "./data/interpretive-scholar-notes/" + bookId + ".json",
    "./data/" + bookId + "_scholar_notes.json"
  ];

  for (const path of paths) {
    const data = await tryLoadJSON(path);
    if (data) {
      state.scholarNotes[bookId] = normalizeScholarNotesData(data);
      state.scholarNoteStatus[bookId] = "loaded";
      return state.scholarNotes[bookId];
    }
  }

  state.scholarNotes[bookId] = [];
  state.scholarNoteStatus[bookId] = "loaded";
  return [];
}

function getScholarNoteEntryForIntro(item) {
  if (!item) return null;
  const notes = state.scholarNotes[state.currentBookId] || [];
  return notes.find((entry) => {
    if (!entry) return false;
    if (item.id && entry.introId === item.id) return true;
    if (item.id && entry.id === item.id) return true;
    return Number(entry.chapter) === Number(item.chapter) &&
      Number(entry.verse) === Number(item.verse) &&
      (!entry.title || !item.title || entry.title === item.title);
  }) || null;
}

function getScholarEntriesForKey(item, scholarKey) {
  const entry = getScholarNoteEntryForIntro(item);
  if (!entry) return [];
  const views = entry.views || {};
  const section = views[scholarKey] || entry[scholarKey] || {};
  if (Array.isArray(section)) return section;
  if (Array.isArray(section.scholars)) return section.scholars;
  if (Array.isArray(section.items)) return section.items;
  return [];
}

function renderSectionIntro(item) {
  const typeLabelMap = {
    event: "주요 사건",
    parable: "비유",
    discourse: "강론",
    sign: "표적",
    passion: "수난",
    resurrection: "부활",
    argument: "논쟁",
    warning: "경고",
    teaching: "가르침",
    vision: "환상",
    defense: "변론",
    household: "가정 규범",
    discipline: "교정",
    exposition: "해설",
    appeal: "호소",
    conflict: "갈등"
  };
  const type = typeLabelMap[item.type] || item.typeLabel || "안내";
  const title = item.title || "본문 안내";
  const intro = item.intro || item.summary || "";
  const hasViews = Boolean(item.interpretiveViews);

  return (
    '<aside class="section-intro-card" data-intro-id="' + escapeHTML(item.id || "") + '">' +
      '<div class="section-intro-topline">' +
        '<div class="section-intro-meta">' + escapeHTML(type) + '</div>' +
        (hasViews ? '<button class="section-intro-view-btn" type="button" data-intro-view="' + escapeHTML(item.id || "") + '">해석 관점</button>' : '') +
      '</div>' +
      '<strong>' + escapeDisplay(title) + '</strong>' +
      '<p>' + escapeDisplay(intro) + '</p>' +
    '</aside>'
  );
}

function getSectionIntroById(introId) {
  const intros = state.sectionIntros[state.currentBookId] || [];
  return intros.find((item) => item.id === introId) || null;
}

function hasInterpretiveDetail(item, detailKey) {
  const views = item?.interpretiveViews || {};
  if (["conservative", "moderate", "progressive"].includes(detailKey)) {
    const view = views[detailKey];
    return Boolean(view && (Array.isArray(view.details) || Array.isArray(view.detailPoints) || view.detail || view.detailText));
  }
  if (detailKey === "agreement") return Boolean(Array.isArray(views.agreementDetails) || views.agreementDetail);
  if (detailKey === "tension") return Boolean(Array.isArray(views.tensionDetails) || views.tensionDetail);
  return false;
}

function renderInterpretiveDetailButton(item, detailKey) {
  if (!hasInterpretiveDetail(item, detailKey)) return "";
  return '<button class="interpretive-detail-btn" type="button" data-interpretive-detail="' + escapeHTML(detailKey) + '" data-intro-id="' + escapeHTML(item.id || "") + '">자세히</button>';
}

function renderInterpretiveScholarButton(item, scholarKey) {
  return '<button class="interpretive-scholar-btn" type="button" data-interpretive-detail="scholars:' + escapeHTML(scholarKey) + '" data-intro-id="' + escapeHTML(item.id || "") + '">신학자별</button>';
}

function renderInterpretiveCardActions(item, detailKey) {
  return '<div class="interpretive-card-actions">' +
    renderInterpretiveDetailButton(item, detailKey) +
    renderInterpretiveScholarButton(item, detailKey) +
  '</div>';
}

function interpretiveViewLabel(viewKey, fallbackLabel) {
  return {
    conservative: "전통적 시선",
    moderate: "복음주의적 시선",
    progressive: "현대신학적 시선"
  }[viewKey] || fallbackLabel || "해석 관점";
}

function markableDisplay(value, bookId, chapter, verse) {
  const html = escapeDisplay(value);
  if (!bookId || !chapter || !verse) return html;
  return applyUserHighlights(html, bookId, chapter, verse);
}

function renderPointList(points, markMeta) {
  if (!Array.isArray(points) || points.length === 0) return "";
  return '<ul>' + points.map((point) => '<li>' + markableDisplay(point, markMeta?.bookId, markMeta?.chapter, markMeta?.verse) + '</li>').join("") + '</ul>';
}

function renderInterpretiveViewBlock(item, viewKey, fallbackLabel) {
  const views = item?.interpretiveViews || {};
  const view = views[viewKey];
  if (!view) return "";
  const label = interpretiveViewLabel(viewKey, view.label || fallbackLabel);
  const lens = view.lens ? '<span>' + markableDisplay(view.lens, state.currentBookId, item.chapter, item.verse) + '</span>' : '';
  const markMeta = { bookId: state.currentBookId, chapter: item.chapter, verse: item.verse };
  return (
    '<section class="interpretive-view-card" data-detail-card="' + escapeHTML(viewKey) + '">' +
      '<div class="interpretive-card-head">' +
        '<h4>' + escapeDisplay(label) + lens + '</h4>' +
        renderInterpretiveCardActions(item, viewKey) +
      '</div>' +
      renderPointList(view.points || [], markMeta) +
    '</section>'
  );
}

function renderInterpretiveSummaryBlock(item, title, points, detailKey) {
  return (
    '<section data-detail-card="' + escapeHTML(detailKey) + '">' +
      '<div class="interpretive-card-head">' +
        '<h4>' + escapeDisplay(title) + '</h4>' +
        renderInterpretiveCardActions(item, detailKey) +
      '</div>' +
      renderPointList(points, { bookId: state.currentBookId, chapter: item.chapter, verse: item.verse }) +
    '</section>'
  );
}

function normalizeDetailParagraphs(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [String(value)];
}

function getInterpretiveDetailPayload(item, detailKey) {
  const views = item?.interpretiveViews || {};
  if (["conservative", "moderate", "progressive"].includes(detailKey)) {
    const view = views[detailKey] || {};
    const title = interpretiveViewLabel(detailKey, view.label || { conservative: "전통적 시선", moderate: "복음주의적 시선", progressive: "현대신학적 시선" }[detailKey]);
    const lens = view.lens || "";
    const details = normalizeDetailParagraphs(view.details || view.detailPoints || view.detail || view.detailText);
    return { title, lens, details, points: view.points || [] };
  }

  if (detailKey === "agreement") {
    return {
      title: "공통 지점",
      lens: "관점들이 함께 붙드는 최소 합의",
      details: normalizeDetailParagraphs(views.agreementDetails || views.agreementDetail),
      points: views.agreement || []
    };
  }

  if (detailKey === "tension") {
    return {
      title: "충돌 지점",
      lens: "해석이 갈리는 실제 쟁점",
      details: normalizeDetailParagraphs(views.tensionDetails || views.tensionDetail),
      points: views.tension || []
    };
  }

  return null;
}

function renderInterpretiveDetailPanel(item, detailKey) {
  const payload = getInterpretiveDetailPayload(item, detailKey);
  if (!payload || payload.details.length === 0) return "";
  const lens = payload.lens ? '<span>' + escapeDisplay(payload.lens) + '</span>' : '';
  return (
    '<section class="interpretive-detail-panel" data-detail-panel="' + escapeHTML(detailKey) + '">' +
      '<div class="interpretive-detail-panel-head">' +
        '<div>' +
          '<div class="interpretive-detail-kicker">DETAIL</div>' +
          '<h3>' + escapeDisplay(payload.title) + lens + '</h3>' +
        '</div>' +
        '<button class="interpretive-detail-close" type="button" data-interpretive-detail-close="true">접기</button>' +
      '</div>' +
      '<div class="interpretive-detail-copy">' +
        payload.details.map((detail) => '<p>' + markableDisplay(detail, state.currentBookId, item.chapter, item.verse) + '</p>').join("") +
      '</div>' +
      (payload.points.length ? '<div class="interpretive-detail-recap"><strong>요점</strong>' + renderPointList(payload.points, { bookId: state.currentBookId, chapter: item.chapter, verse: item.verse }) + '</div>' : '') +
    '</section>'
  );
}

function scholarKeyLabel(scholarKey) {
  return {
    conservative: "전통적 시선",
    moderate: "복음주의적 시선",
    progressive: "현대신학적 시선",
    agreement: "공통 지점",
    tension: "충돌 지점"
  }[scholarKey] || "신학자별 보기";
}

function scholarRelationLabel(value) {
  return {
    direct: "직접 주석",
    methodology: "방법론 적용",
    related: "관련 관점",
    background: "배경 참고",
    reception: "수용사/해석사",
    contextual: "현대 맥락 적용"
  }[value] || "검증 필요";
}

function scholarConfidenceLabel(value) {
  return { high: "높음", medium: "중간", low: "낮음" }[value] || "미확인";
}

function renderScholarSourceLine(scholar) {
  const parts = [];
  if (scholar.sourceTitle || scholar.source) parts.push(escapeHTML(scholar.sourceTitle || scholar.source));
  if (scholar.work) parts.push(escapeHTML(scholar.work));
  const sourceYear = scholar.publicationYear || scholar.year;
  if (sourceYear) parts.push(escapeHTML(String(sourceYear)));
  if (scholar.license) parts.push("라이선스: " + escapeHTML(scholar.license));
  if (!parts.length) return "";
  const source = parts.join(" · ");
  const url = scholar.sourceUrl || scholar.url;
  if (url) return '<a href="' + escapeHTML(url) + '" target="_blank" rel="noopener noreferrer">' + source + '</a>';
  return source;
}


function renderSameViewScholars(scholar) {
  const related = Array.isArray(scholar.sameViewScholars) ? scholar.sameViewScholars : [];
  if (!related.length) return "";
  const names = related
    .map((item) => item && item.name ? String(item.name).trim() : "")
    .filter(Boolean)
    .slice(0, 8);
  const extraCount = Math.max(0, related.length - names.length);
  if (!names.length) return "";
  return (
    '<div class="interpretive-scholar-related">' +
      '<span>동일 요지 참고</span>' +
      '<strong>' + escapeHTML(names.join(", ") + (extraCount ? " 외 " + extraCount + "명" : "")) + '</strong>' +
    '</div>'
  );
}


function renderScholarClaimBody(scholar, markMeta) {
  const baseClaim = scholar.interpretationKo || scholar.summaryKo || scholar.claim || scholar.summary || scholar.note || "";
  const pieces = [];

  if (Array.isArray(baseClaim)) {
    pieces.push(...baseClaim);
  } else if (baseClaim) {
    pieces.push(...String(baseClaim).split(/\n{2,}/g));
  }

  if (Array.isArray(scholar.inlineDetailsKo)) {
    pieces.push(...scholar.inlineDetailsKo);
  }

  const paragraphs = pieces
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (!paragraphs.length) return '<p>검증된 요약이 아직 입력되지 않았습니다.</p>';

  if (paragraphs.length === 1) {
    return '<div class="interpretive-scholar-body single-paragraph">' +
      '<p>' + markableDisplay(paragraphs[0], markMeta?.bookId, markMeta?.chapter, markMeta?.verse) + '</p>' +
      '</div>'; 
  }

  return '<div class="interpretive-scholar-body collapsed" data-scholar-body>' +
    '<button class="scholar-content-toggle" type="button" data-scholar-content-toggle="true" aria-expanded="false">내용 보기</button>' +
    '<div class="interpretive-scholar-expanded" data-scholar-content hidden>' +
      paragraphs.map((paragraph) => '<p>' + markableDisplay(paragraph, markMeta?.bookId, markMeta?.chapter, markMeta?.verse) + '</p>').join("") +
    '</div>' +
    '</div>';
}

function renderInterpretiveScholarPanel(item, scholarKey) {
  const key = String(scholarKey || "").replace(/^scholars:/, "");
  const scholars = getScholarEntriesForKey(item, key);
  const title = scholarKeyLabel(key);
  const note = "직접 주석 / 방법론 적용 / 관련 관점을 구분해 표시합니다. 출처가 확인되지 않은 주장은 이 영역에 넣지 않습니다.";
  const markMeta = { bookId: state.currentBookId, chapter: item.chapter, verse: item.verse };

  return (
    '<section class="interpretive-detail-panel interpretive-scholar-panel" data-detail-panel="scholars:' + escapeHTML(key) + '">' +
      '<div class="interpretive-detail-panel-head">' +
        '<div>' +
          '<div class="interpretive-detail-kicker">SCHOLARS</div>' +
          '<h3>' + escapeDisplay(title) + '<span>신학자별 보기</span></h3>' +
        '</div>' +
        '<button class="interpretive-detail-close" type="button" data-interpretive-detail-close="true">접기</button>' +
      '</div>' +
      '<p class="interpretive-scholar-note">' + escapeDisplay(note) + '</p>' +
      (scholars.length ? '<div class="interpretive-scholar-list">' + scholars.map((scholar) => {
        const relation = scholarRelationLabel(scholar.relationType || scholar.relation || scholar.type);
        const confidence = scholarConfidenceLabel(scholar.confidence);
        const sourceLine = renderScholarSourceLine(scholar);
        return (
          '<article class="interpretive-scholar-card">' +
            '<div class="interpretive-scholar-head">' +
              '<strong>' + escapeHTML(scholar.name || "이름 미상") + '</strong>' +
              '<span>' + escapeHTML(relation) + '</span>' +
            '</div>' +
            (scholar.tradition || scholar.field ? '<div class="interpretive-scholar-tradition">' + escapeHTML(scholar.tradition || scholar.field) + '</div>' : '') +
            renderScholarClaimBody(scholar, markMeta) +
            '<div class="interpretive-scholar-meta">확실성: ' + escapeHTML(confidence) + (sourceLine ? ' · 출처: ' + sourceLine : ' · 출처: 미입력') + '</div>' +
            renderSameViewScholars(scholar) +
            (scholar.caution || scholar.warning ? '<div class="interpretive-scholar-caution">주의: ' + escapeDisplay(scholar.caution || scholar.warning) + '</div>' : '') +
          '</article>'
        );
      }).join("") + '</div>' :
      '<div class="interpretive-scholar-empty">이 항목에는 아직 검증된 신학자별 자료가 없습니다. 공개 라이선스 자료와 출처 확인이 끝난 주장만 추가하세요.</div>') +
    '</section>'
  );
}

function renderActiveInterpretivePanel(item, activeDetailKey) {
  if (!activeDetailKey) return "";
  if (String(activeDetailKey).startsWith("scholars:")) return renderInterpretiveScholarPanel(item, activeDetailKey);
  return renderInterpretiveDetailPanel(item, activeDetailKey);
}

function renderInterpretiveViewsContent(item, activeDetailKey) {
  const views = item?.interpretiveViews || {};
  const note = views.note || "아래 관점들은 정답 경쟁이 아니라, 본문을 읽는 대표적 해석 렌즈입니다.";
  const agreement = views.agreement || [];
  const tension = views.tension || [];

  return (
    '<div class="interpretive-popup-body" data-mark-scope="interpretive" data-book="' + escapeHTML(state.currentBookId || "") + '" data-chapter="' + escapeHTML(String(item.chapter || "")) + '" data-verse="' + escapeHTML(String(item.verse || "")) + '" data-intro-id="' + escapeHTML(item.id || "") + '" data-active-detail="' + escapeHTML(activeDetailKey || "") + '">' +
      '<p class="interpretive-popup-note" data-interpretive-wave-note="true" aria-live="polite">' + markableDisplay(note, state.currentBookId, item.chapter, item.verse) + '</p>' +
      '<div class="interpretive-view-grid">' +
        renderInterpretiveViewBlock(item, "conservative", "전통적 시선") +
        renderInterpretiveViewBlock(item, "moderate", "복음주의적 시선") +
        renderInterpretiveViewBlock(item, "progressive", "현대신학적 시선") +
      '</div>' +
      '<div class="interpretive-summary-grid">' +
        renderInterpretiveSummaryBlock(item, "공통 지점", agreement, "agreement") +
        renderInterpretiveSummaryBlock(item, "충돌 지점", tension, "tension") +
      '</div>' +
      renderActiveInterpretivePanel(item, activeDetailKey) +
    '</div>'
  );
}


const INTERPRETIVE_TYPING_TARGET_SELECTOR = ".interpretive-popup-note[data-interpretive-wave-note='true']";

function prefersReducedTypingMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function hasActiveSelectionInside(root) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return false;
  const anchorEl = getElementFromNode(selection.anchorNode);
  const focusEl = getElementFromNode(selection.focusNode);
  return Boolean(root && ((anchorEl && root.contains(anchorEl)) || (focusEl && root.contains(focusEl))));
}

function getInterpretiveTypingTargets(scope) {
  if (!scope) return [];
  const direct = scope.matches?.(INTERPRETIVE_TYPING_TARGET_SELECTOR) ? [scope] : [];
  const nested = Array.from(scope.querySelectorAll?.(INTERPRETIVE_TYPING_TARGET_SELECTOR) || []);
  const targets = [...direct, ...nested];
  return [...new Set(targets)].filter((target) => {
    if (!target || target.closest("[hidden]")) return false;
    const text = normalizeHighlightText(target.textContent || "");
    return text.length >= 6;
  });
}

function restoreInterpretiveTypingElement(target) {
  const originalHtml = interpretiveTypingOriginalHtml.get(target);
  if (typeof originalHtml === "string") target.innerHTML = originalHtml;
  target.classList.remove("interpretive-wave-entry-active");
  target.removeAttribute("aria-busy");
  interpretiveTypingTimers.delete(target);
}

function renderWaveCharacter(char, index) {
  const safeIndex = Math.min(index, 96);
  const safeChar = char === " " ? "&nbsp;" : char === "\n" ? "<br>" : escapeHTML(char);
  return '<span class="interpretive-wave-char" style="--i:' + safeIndex + '">' + safeChar + '</span>';
}

function animateInterpretiveTextElement(target) {
  if (!target || prefersReducedTypingMotion()) return;

  const existingTimer = interpretiveTypingTimers.get(target);
  if (existingTimer) {
    clearTimeout(existingTimer);
    restoreInterpretiveTypingElement(target);
  }

  const originalHtml = target.innerHTML;
  const plainText = normalizeHighlightText(target.textContent || "");
  if (plainText.length < 6) return;

  interpretiveTypingOriginalHtml.set(target, originalHtml);
  target.classList.add("interpretive-wave-entry-active");
  target.setAttribute("aria-busy", "true");
  target.innerHTML = Array.from(plainText).map(renderWaveCharacter).join("");

  const restoreDelay = Math.min(4800, 1300 + Array.from(plainText).length * 18);
  const timer = window.setTimeout(() => restoreInterpretiveTypingElement(target), restoreDelay);
  interpretiveTypingTimers.set(target, timer);
}

function runInterpretiveTypingAnimation(scope) {
  if (!scope || prefersReducedTypingMotion() || hasActiveSelectionInside(scope)) return;

  const target = getInterpretiveTypingTargets(scope)[0];
  if (!target) return;

  target.classList.add("interpretive-wave-box");
  window.setTimeout(() => target.classList.remove("interpretive-wave-box"), 1100);
  animateInterpretiveTextElement(target);
}

function scheduleInterpretiveTypingAnimation(scope) {
  if (!scope) return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => runInterpretiveTypingAnimation(scope));
  });
}

function bindInterpretiveTypingAnimation() {
  // v36: interpretive popup content itself is no longer animated.
  // The click on the main section intro card runs a typewriter animation first,
  // then opens the interpretation popup.
  if (interpretiveTypingAnimationBound) return;
  interpretiveTypingAnimationBound = true;
}

function refreshInterpretivePopupContent(introId, detailKey) {
  const item = getSectionIntroById(introId);
  if (!item || !item.interpretiveViews) return;

  const desktopPopup = document.getElementById("interpretivePopup");
  const desktopContent = desktopPopup?.querySelector("#interpretivePopupContent");
  if (desktopContent && desktopPopup.classList.contains("show")) {
    desktopContent.innerHTML = renderInterpretiveViewsContent(item, detailKey);
    markActiveInterpretiveDetailButton(desktopContent, detailKey);
    scrollInterpretiveDetailIntoView(desktopContent);
    // 자세히/신학자별 패널 본문은 애니메이션 대상에서 제외한다.
    return;
  }

  const mobilePopup = document.getElementById("mobileInfoPopup");
  const mobileContent = mobilePopup?.querySelector("#mobileInfoBody");
  if (mobileContent && mobilePopup.classList.contains("show")) {
    mobileContent.innerHTML = renderInterpretiveViewsContent(item, detailKey);
    markActiveInterpretiveDetailButton(mobileContent, detailKey);
    scrollInterpretiveDetailIntoView(mobileContent);
    // 자세히/신학자별 패널 본문은 애니메이션 대상에서 제외한다.
  }
}

function markActiveInterpretiveDetailButton(scope, detailKey) {
  if (!scope) return;
  scope.querySelectorAll("[data-interpretive-detail]").forEach((button) => {
    button.classList.toggle("active", button.dataset.interpretiveDetail === detailKey);
  });
}

function scrollInterpretiveDetailIntoView(scope) {
  const panel = scope?.querySelector(".interpretive-detail-panel");
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

let interpretiveDetailDelegationBound = false;

function bindInterpretiveDetailDelegation() {
  if (interpretiveDetailDelegationBound) return;
  interpretiveDetailDelegationBound = true;
  document.addEventListener("click", (event) => {
    const scholarContentToggle = event.target.closest("[data-scholar-content-toggle]");
    if (scholarContentToggle) {
      event.preventDefault();
      event.stopPropagation();
      const body = scholarContentToggle.closest("[data-scholar-body]");
      const content = body?.querySelector("[data-scholar-content]");
      if (!content) return;
      const willOpen = content.hasAttribute("hidden");
      content.toggleAttribute("hidden", !willOpen);
      scholarContentToggle.setAttribute("aria-expanded", String(willOpen));
      scholarContentToggle.textContent = willOpen ? "내용 접기" : "내용 보기";
      body.classList.toggle("expanded", willOpen);
      body.classList.toggle("collapsed", !willOpen);
      // 긴 자료 본문은 애니메이션 대상에서 제외한다. 첫 안내 박스만 wave 처리.
      return;
    }

    const detailButton = event.target.closest("[data-interpretive-detail]");
    if (detailButton) {
      event.preventDefault();
      event.stopPropagation();
      refreshInterpretivePopupContent(detailButton.dataset.introId, detailButton.dataset.interpretiveDetail);
      return;
    }

    const closeButton = event.target.closest("[data-interpretive-detail-close]");
    if (closeButton) {
      event.preventDefault();
      event.stopPropagation();
      const body = closeButton.closest(".interpretive-popup-body");
      const activeIntro = body?.querySelector("[data-intro-id]")?.dataset.introId;
      if (activeIntro) refreshInterpretivePopupContent(activeIntro, null);
    }
  });
}

function getInterpretivePopup() {
  let popup = document.getElementById("interpretivePopup");
  if (popup) return popup;

  popup = document.createElement("div");
  popup.id = "interpretivePopup";
  popup.className = "interpretive-popup";
  popup.setAttribute("aria-hidden", "true");
  popup.innerHTML =
    '<div class="interpretive-popup-backdrop" data-interpretive-close="true"></div>' +
    '<section class="interpretive-popup-sheet" role="dialog" aria-modal="true" aria-labelledby="interpretivePopupTitle" tabindex="-1">' +
      '<div class="interpretive-popup-head">' +
        '<div>' +
          '<div class="interpretive-popup-kicker">INTERPRETATION</div>' +
          '<h2 id="interpretivePopupTitle">해석 관점</h2>' +
        '</div>' +
        '<button class="interpretive-popup-close" type="button" data-interpretive-close="true" aria-label="해석 관점 닫기">닫기</button>' +
      '</div>' +
      '<div id="interpretivePopupContent" class="interpretive-popup-content"></div>' +
    '</section>';

  document.body.appendChild(popup);
  popup.querySelectorAll('[data-interpretive-close="true"]').forEach((item) => {
    item.addEventListener("click", closeInterpretivePopup);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && popup.classList.contains("show")) closeInterpretivePopup();
  });

  return popup;
}

function showInterpretiveView(introId) {
  const item = getSectionIntroById(introId);
  if (!item || !item.interpretiveViews) return;

  const title = item.title || "해석 관점";
  const body = renderInterpretiveViewsContent(item);

  if (showMobileInfoPopup({
    kicker: "INTERPRETATION · 해석 관점",
    title,
    body
  })) {
    const mobilePopup = document.getElementById("mobileInfoPopup");
    const mobileBody = mobilePopup?.querySelector("#mobileInfoBody");
    markActiveInterpretiveDetailButton(mobileBody, null);
    return;
  }

  const popup = getInterpretivePopup();
  const titleEl = popup.querySelector("#interpretivePopupTitle");
  const contentEl = popup.querySelector("#interpretivePopupContent");
  const sheet = popup.querySelector(".interpretive-popup-sheet");

  if (titleEl) titleEl.textContent = title;
  if (contentEl) {
    contentEl.innerHTML = body;
    markActiveInterpretiveDetailButton(contentEl, null);
  }

  popup.setAttribute("aria-hidden", "false");
  popup.classList.add("show");
  document.body.classList.add("interpretive-popup-open");
  hideMarkMenu();

  requestAnimationFrame(() => {
    if (sheet) sheet.focus({ preventScroll: true });
  });
}

function closeInterpretivePopup() {
  const popup = document.getElementById("interpretivePopup");
  if (!popup) return;
  popup.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
  document.body.classList.remove("interpretive-popup-open");
}


let sectionIntroTypewriterOpenPending = false;

function sectionIntroTypewriterDelay(char) {
  if (char === " " || char === "\n") return 18;
  if (/[.,!?;:。．、，…]/.test(char)) return 130;
  return 34;
}

function typeSectionIntroText(target, text) {
  return new Promise((resolve) => {
    if (!target) {
      resolve();
      return;
    }

    const chars = Array.from(text || "");
    target.textContent = "";
    target.classList.add("section-intro-typewriter-text");

    let index = 0;
    const step = () => {
      if (index >= chars.length) {
        target.classList.remove("section-intro-typewriter-text");
        resolve();
        return;
      }
      target.textContent += chars[index];
      const delay = sectionIntroTypewriterDelay(chars[index]);
      index += 1;
      window.setTimeout(step, delay);
    };

    step();
  });
}

async function animateSectionIntroBeforeInterpretiveOpen(card, callback) {
  if (!card || prefersReducedTypingMotion()) {
    callback?.();
    return;
  }

  if (sectionIntroTypewriterOpenPending || card.dataset.typewriterActive === "true") return;

  const titleEl = card.querySelector("strong");
  const bodyEl = card.querySelector("p");
  const button = card.querySelector(".section-intro-view-btn");
  const originalTitleHtml = titleEl?.innerHTML || "";
  const originalBodyHtml = bodyEl?.innerHTML || "";
  const titleText = normalizeHighlightText(titleEl?.textContent || "");
  const bodyText = normalizeHighlightText(bodyEl?.textContent || "");

  sectionIntroTypewriterOpenPending = true;
  card.dataset.typewriterActive = "true";
  card.classList.add("section-intro-typewriter-active");
  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }

  try {
    if (titleEl) titleEl.textContent = "";
    if (bodyEl) bodyEl.textContent = "";
    await typeSectionIntroText(titleEl, titleText);
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    await typeSectionIntroText(bodyEl, bodyText);
    await new Promise((resolve) => window.setTimeout(resolve, 420));
  } finally {
    if (titleEl) titleEl.innerHTML = originalTitleHtml;
    if (bodyEl) bodyEl.innerHTML = originalBodyHtml;
    card.classList.remove("section-intro-typewriter-active");
    delete card.dataset.typewriterActive;
    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
    sectionIntroTypewriterOpenPending = false;
  }

  callback?.();
}

function bindSectionIntroButtons() {
  els.verses.querySelectorAll(".section-intro-view-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.getSelection()?.removeAllRanges();
      const card = button.closest(".section-intro-card");
      animateSectionIntroBeforeInterpretiveOpen(card, () => showInterpretiveView(button.dataset.introView));
    });
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DIVINE_ENGLISH_TERMS = [
  ["Kingdom of Heaven", "KINGDOM OF HEAVEN"],
  ["Kingdom of God", "KINGDOM OF GOD"],
  ["Jesus Christ", "JESUS CHRIST"],
  ["Holy Spirit", "HOLY SPIRIT"],
  ["Spirit of God", "SPIRIT OF GOD"],
  ["Son of God", "SON OF GOD"],
  ["Son of Man", "SON OF MAN"],
  ["Lord Jesus", "LORD JESUS"],
  ["Lord", "LORD"],
  ["Messiah", "MESSIAH"],
  ["Christ", "CHRIST"],
  ["Jesus", "JESUS"],
  ["God", "GOD"]
];

function normalizeDivineEnglishTerms(value) {
  let result = String(value ?? "");
  DIVINE_ENGLISH_TERMS.forEach(([from, to]) => {
    const pattern = from.split(/\s+/).map(escapeRegExp).join("\\s+");
    result = result.replace(new RegExp("\\b" + pattern + "\\b", "gi"), to);
  });
  return result;
}

function escapeDisplay(value) {
  return escapeHTML(normalizeDivineEnglishTerms(value));
}

function divineNoteLabel(noteId) {
  const raw = String(noteId || "").trim();
  const spaced = raw.replace(/[-_]+/g, " ");
  const normalized = normalizeDivineEnglishTerms(spaced);
  if (normalized !== spaced) return normalized;
  return raw;
}


function storageKey() {
  return "nt-modern-ko-highlights-v1";
}

function legacyLocalHighlightStorageKey() {
  return storageKey();
}

function loadHighlights() {
  // 개인 마킹은 로그인한 계정의 Firestore 데이터만 화면에 표시합니다.
  // 비로그인 상태에서는 localStorage에 남은 이전 마킹도 읽지 않습니다.
  return {};
}

function loadLegacyLocalHighlights() {
  try {
    return JSON.parse(localStorage.getItem(legacyLocalHighlightStorageKey()) || "{}");
  } catch (_) {
    return {};
  }
}

function saveHighlights() {
  // 로그인 기반 개인 데이터 정책: 본문 마킹은 localStorage에 저장하지 않습니다.
  // Firestore 저장 실패 시에도 다른 사용자가 같은 브라우저에서 보는 것을 막기 위해 로컬 보존을 하지 않습니다.
}

function clearPrivateHighlightState() {
  state.highlights = {};
  state.cloudHighlightsLoaded = false;
  hideMarkMenu();
  renderChapter();
  renderHighlightList();
}

function firebaseApiReady() {
  return Boolean(window.firebaseAuth && window.firebaseDb && window.firebaseFns);
}

function getCurrentFirebaseUser() {
  return firebaseApiReady() ? window.firebaseAuth.currentUser : null;
}

function cloudHighlightDocId(bookId, chapter, verse, text) {
  const clean = normalizeHighlightText(text);
  const base = [bookId, chapter, verse].join("_");
  return base.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + hashString(clean);
}

function buildCloudHighlightPayload(bookId, chapter, verse, text) {
  const clean = normalizeHighlightText(text);
  return {
    bookId: String(bookId),
    chapter: Number(chapter),
    verse: Number(verse),
    text: clean,
    key: highlightKey(bookId, chapter, verse),
    updatedAt: Date.now(),
    appBuild: APP_BUILD_ID
  };
}

function setCloudSyncStatus(message, kind = "idle") {
  if (!els.cloudSyncStatus) return;
  els.cloudSyncStatus.textContent = message || "";
  els.cloudSyncStatus.dataset.kind = kind;
}

async function saveHighlightToCloud(bookId, chapter, verse, text) {
  const user = getCurrentFirebaseUser();
  if (!user || !firebaseApiReady()) return;

  const clean = normalizeHighlightText(text);
  if (!clean) return;

  const docId = cloudHighlightDocId(bookId, chapter, verse, clean);
  const payload = buildCloudHighlightPayload(bookId, chapter, verse, clean);

  try {
    await window.firebaseFns.setDoc(
      window.firebaseFns.doc(window.firebaseDb, "users", user.uid, "highlights", docId),
      payload,
      { merge: true }
    );
    setCloudSyncStatus("마킹 동기화됨", "ok");
  } catch (error) {
    console.error("마킹 클라우드 저장 실패", error);
    setCloudSyncStatus("클라우드 저장 실패 · 로그인 데이터에 저장되지 않음", "warn");
  }
}

async function deleteHighlightFromCloud(bookId, chapter, verse, text) {
  const user = getCurrentFirebaseUser();
  if (!user || !firebaseApiReady()) return;

  const clean = normalizeHighlightText(text);
  if (!clean) return;

  const docId = cloudHighlightDocId(bookId, chapter, verse, clean);

  try {
    await window.firebaseFns.deleteDoc(
      window.firebaseFns.doc(window.firebaseDb, "users", user.uid, "highlights", docId)
    );
    setCloudSyncStatus("마킹 삭제 동기화됨", "ok");
  } catch (error) {
    console.error("마킹 클라우드 삭제 실패", error);
    setCloudSyncStatus("클라우드 삭제 실패 · 화면에서만 반영됨", "warn");
  }
}

function mergeHighlightIntoState(bookId, chapter, verse, text) {
  const clean = normalizeHighlightText(text);
  if (!clean) return false;
  const key = highlightKey(bookId, chapter, verse);
  const list = state.highlights[key] || [];
  if (list.includes(clean)) return false;
  list.push(clean);
  state.highlights[key] = list;
  return true;
}

async function loadCloudHighlights(user) {
  if (!user || !firebaseApiReady()) return;
  try {
    setCloudSyncStatus("내 계정 마킹 불러오는 중...", "loading");
    state.highlights = {};

    const snapshot = await window.firebaseFns.getDocs(
      window.firebaseFns.collection(window.firebaseDb, "users", user.uid, "highlights")
    );

    snapshot.forEach((docSnap) => {
      const item = docSnap.data() || {};
      if (!item.bookId || !item.chapter || !item.verse || !item.text) return;
      mergeHighlightIntoState(item.bookId, item.chapter, item.verse, item.text);
    });

    renderChapter();
    renderHighlightList();

    state.cloudHighlightsLoaded = true;
    setCloudSyncStatus(snapshot.size + "개 내 계정 마킹 표시", "ok");
  } catch (error) {
    console.error("클라우드 마킹 불러오기 실패", error);
    state.highlights = {};
    renderChapter();
    renderHighlightList();
    setCloudSyncStatus("클라우드 마킹 불러오기 실패 · 개인 마킹 숨김", "warn");
  }
}
async function uploadLocalHighlightsToCloud(user) {
  // v23부터 자동 로컬 마킹 업로드를 중단합니다.
  // 공용 기기에서 이전 사용자의 localStorage 마킹이 다른 계정으로 섞이는 것을 막기 위한 정책입니다.
  return;
}
function updateAuthUI(user) {
  state.authUser = user || null;
  document.body.classList.toggle("is-signed-in", Boolean(user));

  if (els.googleLoginBtn) els.googleLoginBtn.hidden = Boolean(user);
  if (els.googleLogoutBtn) els.googleLogoutBtn.hidden = !user;

  if (els.authStatus) {
    els.authStatus.textContent = user ? "Google 계정 연결됨" : "로그인해야 개인 마킹이 표시됩니다.";
  }
  if (els.authUserName) {
    els.authUserName.textContent = user ? (user.displayName || user.email || "사용자") : "로그인 전";
  }
  if (els.authUserPhoto) {
    if (user && user.photoURL) {
      els.authUserPhoto.src = user.photoURL;
      els.authUserPhoto.alt = (user.displayName || "사용자") + " 프로필";
      els.authUserPhoto.hidden = false;
    } else {
      els.authUserPhoto.removeAttribute("src");
      els.authUserPhoto.alt = "";
      els.authUserPhoto.hidden = true;
    }
  }
}

function bindFirebaseAuth() {
  if (!firebaseApiReady()) {
    setCloudSyncStatus("Firebase 준비 중...", "loading");
    window.addEventListener("firebase-ready", bindFirebaseAuth, { once: true });
    window.addEventListener("firebase-error", (event) => {
      console.error("Firebase 초기화 실패", event.detail);
      setCloudSyncStatus("Firebase 초기화 실패 · 개인 마킹 숨김", "warn");
    }, { once: true });
    return;
  }

  if (els.googleLoginBtn) {
    els.googleLoginBtn.addEventListener("click", async () => {
      try {
        setCloudSyncStatus("Google 로그인 중...", "loading");
        await window.firebaseFns.signInWithPopup(window.firebaseAuth, window.firebaseProvider);
      } catch (error) {
        console.error("Google 로그인 실패", error);
        setCloudSyncStatus("Google 로그인 실패", "warn");
      }
    });
  }

  if (els.googleLogoutBtn) {
    els.googleLogoutBtn.addEventListener("click", async () => {
      try {
        await window.firebaseFns.signOut(window.firebaseAuth);
      } catch (error) {
        console.error("로그아웃 실패", error);
        setCloudSyncStatus("로그아웃 실패", "warn");
      }
    });
  }

  window.firebaseFns.onAuthStateChanged(window.firebaseAuth, async (user) => {
    updateAuthUI(user);
    if (user) {
      state.highlights = {};
      renderChapter();
      renderHighlightList();
      await loadCloudHighlights(user);
      renderHighlightList();
    } else {
      state.cloudHighlightsLoaded = false;
      state.highlights = {};
      setCloudSyncStatus("비로그인 상태 · 개인 마킹 숨김", "idle");
      renderChapter();
      renderHighlightList();
    }
  });
}

function noteListCollapseStorageKey() {
  return "nt-modern-ko-note-list-collapsed-v1";
}

function loadNoteListCollapsed() {
  try {
    return localStorage.getItem(noteListCollapseStorageKey()) === "true";
  } catch (_) {
    return false;
  }
}

function saveNoteListCollapsed(value) {
  try {
    localStorage.setItem(noteListCollapseStorageKey(), String(Boolean(value)));
  } catch (_) {
    // localStorage를 사용할 수 없는 환경에서는 현재 화면 상태만 유지합니다.
  }
}

function setNoteListCollapsed(collapsed, persist = true) {
  const card = document.querySelector(".note-list-card");
  if (!card || !els.noteListToggle) return;

  const nextCollapsed = Boolean(collapsed);
  card.classList.toggle("is-collapsed", nextCollapsed);
  els.noteListToggle.setAttribute("aria-expanded", String(!nextCollapsed));
  els.noteListToggle.textContent = nextCollapsed ? "펼치기" : "접기";
  els.noteListToggle.title = nextCollapsed ? "설명 리스트 펼치기" : "설명 리스트 접기";

  if (persist) saveNoteListCollapsed(nextCollapsed);
}

function syncNoteListCollapsedState() {
  setNoteListCollapsed(loadNoteListCollapsed(), false);
}

function bindNoteListToggle() {
  if (!els.noteListToggle) return;
  els.noteListToggle.addEventListener("click", () => {
    const card = document.querySelector(".note-list-card");
    const collapsed = card?.classList.contains("is-collapsed") || false;
    setNoteListCollapsed(!collapsed);
  });
  syncNoteListCollapsedState();
}

function highlightKey(bookId, chapter, verse) {
  return [bookId, chapter, verse].join(":");
}

function getVerseHighlights(bookId, chapter, verse) {
  return state.highlights[highlightKey(bookId, chapter, verse)] || [];
}

function normalizeHighlightText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function hasVerseHighlight(bookId, chapter, verse, text) {
  const clean = normalizeHighlightText(text);
  return getVerseHighlights(bookId, chapter, verse).includes(clean);
}

function addVerseHighlight(bookId, chapter, verse, text) {
  const user = getCurrentFirebaseUser();
  if (!user) {
    setCloudSyncStatus("마킹은 Google 로그인 후 사용할 수 있습니다.", "warn");
    return false;
  }

  const clean = normalizeHighlightText(text);
  if (!clean) return false;

  const key = highlightKey(bookId, chapter, verse);
  const list = state.highlights[key] || [];
  if (!list.includes(clean)) list.push(clean);
  state.highlights[key] = list;
  saveHighlights();
  saveHighlightToCloud(bookId, chapter, verse, clean);
  return true;
}

function removeVerseHighlight(bookId, chapter, verse, text) {
  const user = getCurrentFirebaseUser();
  if (!user) {
    setCloudSyncStatus("마킹 삭제는 Google 로그인 후 사용할 수 있습니다.", "warn");
    return false;
  }

  const clean = normalizeHighlightText(text);
  if (!clean) return false;

  const key = highlightKey(bookId, chapter, verse);
  const list = state.highlights[key] || [];
  const next = list.filter((item) => item !== clean);
  if (next.length === list.length) return false;

  if (next.length) state.highlights[key] = next;
  else delete state.highlights[key];
  saveHighlights();
  deleteHighlightFromCloud(bookId, chapter, verse, clean);
  return true;
}

function applyBookAccent(bookId) {
  const color = getBookAccent(bookId);
  document.documentElement.style.setProperty("--accent", color);
}

function mdInlineToHTML(text) {
  let html = escapeDisplay(text);
  html = html.replace(/\{\{ctx:([^}|]+)(?:\|([^}]+))?\}\}/g, function (_, contextId, label) {
    const safeId = escapeHTML(String(contextId || "").trim());
    const safeLabel = label ? escapeDisplay(String(label).trim()) : "맥락";
    const isInlineLabel = Boolean(label);
    return '<button class="ctx-link' + (isInlineLabel ? ' text-label' : '') + '" type="button" data-context="' + safeId + '" title="당시 배경 보기">' + safeLabel + '</button>';
  });
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[\^([^\]]+)\]/g, function (_, noteId) {
    const safeId = escapeHTML(noteId);
    return '<button class="fn" type="button" data-note="' + safeId + '" title="설명 보기">' + escapeDisplay(divineNoteLabel(noteId)) + "</button>";
  });
  return html;
}

function plainFromNote(note) {
  return String(note || "")
    .replace(/\{\{ctx:[^}]+\}\}/g, "")
    .replace(/\*\*/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function noteTitleFromText(noteId, note) {
  const text = plainFromNote(note);
  const match = text.match(/^([^—-]+)[—-]/);
  return match && match[1] ? match[1].trim() : noteId;
}

function replaceOutsideTags(html, pattern, replacer) {
  const parts = html.split(/(<[^>]+>)/g);
  return parts.map((part) => {
    if (part.startsWith("<") && part.endsWith(">")) return part;
    return part.replace(pattern, replacer);
  }).join("");
}

function highlightHTML(html, query) {
  const q = query.trim();
  if (!q) return html;
  const pattern = new RegExp("(" + escapeRegExp(q) + ")", "gi");
  return replaceOutsideTags(html, pattern, '<mark class="search-mark">$1</mark>');
}

function applyUserHighlights(html, bookId, chapter, verse) {
  const highlights = [...new Set(getVerseHighlights(bookId, chapter, verse))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return highlights.reduce((current, phrase) => {
    const escapedPhrase = escapeHTML(phrase);
    if (!escapedPhrase) return current;
    const pattern = new RegExp("(" + escapeRegExp(escapedPhrase) + ")", "g");
    return replaceOutsideTags(current, pattern, '<mark class="user-mark">$1</mark>');
  }, html);
}

function renderBookList() {
  const books = state.manifest.books || [];
  const totalTargetBooks = state.manifest.totalTargetBooks || 27;
  const updatedBooks = state.manifest.updatedBooks || books.length;
  els.bookCount.textContent = updatedBooks + " / " + totalTargetBooks;
  els.totalBookStat.innerHTML = updatedBooks + '<span class="u">권</span>';

  els.bookList.innerHTML = books.map((book) => {
    const active = book.id === state.currentBookId ? " active" : "";
    const order = String(book.order).padStart(2, "0");
    const color = getBookAccent(book);
    return (
      '<button class="book-btn' + active + '" type="button" data-book="' + book.id + '" style="--book-accent:' + color + '" aria-label="' + escapeHTML(order + ' ' + book.bookKo) + '">' +
      '<span class="book-abbr" aria-hidden="true">' + escapeHTML(getBookShortLabel(book)) + '</span>' +
      '<span class="book-mobile-name" aria-hidden="true">' + escapeHTML(book.bookEn || book.bookKo || book.id) + '</span>' +
      '<span class="book-full">' + order + ' ' + escapeHTML(book.bookKo) + '</span>' +
      '<small>' + book.chapterCount + '장</small>' +
      '<span class="book-select-indicator" aria-hidden="true">' + (active ? '선택됨' : '선택') + '</span>' +
      '</button>' 
    );
  }).join("");

  els.bookList.querySelectorAll(".book-btn").forEach((button) => {
    button.addEventListener("click", () => {
      closeMobileBookList();
      selectBook(button.dataset.book, 1);
    });
  });

  syncMobileBookToggle();
}

function getCurrentBookMeta() {
  const books = state.manifest?.books || [];
  return books.find((book) => book.id === state.currentBookId) || books[0] || null;
}

function ensureMobileBookToggle() {
  let toggle = document.getElementById("mobileBookToggle");
  if (toggle) return toggle;

  if (!els.bookList || !els.bookList.parentElement) return null;

  toggle = document.createElement("button");
  toggle.id = "mobileBookToggle";
  toggle.className = "mobile-book-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "bookList");
  toggle.innerHTML = '<span class="mobile-book-toggle-label">BOOK</span><strong>Matthew</strong>';

  toggle.addEventListener("click", () => {
    const willOpen = !els.bookList.classList.contains("mobile-open");
    els.bookList.classList.toggle("mobile-open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) {
      const active = els.bookList.querySelector(".book-btn.active");
      if (active) active.scrollIntoView({ block: "nearest" });
    }
  });

  els.bookList.insertAdjacentElement("beforebegin", toggle);
  return toggle;
}

function syncMobileBookToggle() {
  const toggle = ensureMobileBookToggle();
  if (!toggle) return;

  const current = getCurrentBookMeta();
  const label = current ? (current.bookEn || current.bookKo || current.id) : "Select book";
  const sub = current ? String(current.order || "").padStart(2, "0") + " · " + (current.bookKo || "") : "";

  toggle.innerHTML =
    '<span class="mobile-book-toggle-label">BOOKS</span>' +
    '<strong>' + escapeHTML(label) + '</strong>' +
    '<small>' + escapeHTML(sub) + '</small>';
}

function closeMobileBookList() {
  const toggle = document.getElementById("mobileBookToggle");
  if (els.bookList) els.bookList.classList.remove("mobile-open");
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

async function ensureBook(bookId) {
  if (state.books[bookId]) return state.books[bookId];
  const meta = state.manifest.books.find((book) => book.id === bookId);
  if (!meta) throw new Error("권 정보를 찾지 못했습니다: " + bookId);
  const book = await loadJSON(meta.data);
  state.books[bookId] = book;
  return book;
}

async function ensureAllBooks() {
  const metas = state.manifest?.books || [];
  await Promise.all(metas.map((meta) => ensureBook(meta.id)));
  return metas.map((meta) => state.books[meta.id]).filter(Boolean);
}

const READER_MOTION_MS = 560;

function restartElementAnimation(element, className) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), READER_MOTION_MS);
}

function animateReaderTransition(type) {
  const readerCard = document.querySelector(".reader-card");
  const chapterTitle = document.querySelector(".chapter-title-wrap");
  restartElementAnimation(readerCard, type === "book" ? "reader-book-switch" : "reader-chapter-switch");
  restartElementAnimation(chapterTitle, "chapter-title-enter");
  restartElementAnimation(els.verses, "verses-enter");
}

async function selectBook(bookId, chapterNumber) {
  const book = await ensureBook(bookId);
  await ensureContext(bookId);
  await ensureSectionIntros(bookId);
  await ensureScholarNotes(bookId);
  state.currentBookId = bookId;
  state.currentChapter = Math.min(Math.max(chapterNumber || 1, 1), book.chapterCount);
  state.currentNoteId = null;
  applyBookAccent(bookId);
  hideMarkMenu();
  render();
}

function render() {
  const book = state.books[state.currentBookId];
  if (!book) return;

  applyBookAccent(book.id);
  renderBookList();

  const order = String(book.order).padStart(2, "0");
  els.readerKicker.textContent = "NEW TESTAMENT · " + order;
  els.bookTitle.textContent = book.bookKo;
  if (els.bookEnglishTitle) els.bookEnglishTitle.textContent = book.bookEn || "";
  els.bookDesc.textContent = book.chapterCount + "장 · " + book.verseCount + "절 · 인명·지명·용어·시대 배경 설명 포함";
  els.chapterStat.textContent = book.chapterCount + "장";
  els.verseStat.textContent = book.verseCount;

  els.chapterButtons.innerHTML = book.chapters.map((chapter) => {
    const active = chapter.number === state.currentChapter ? " active" : "";
    return '<button class="' + active + '" type="button" data-chapter="' + chapter.number + '">' + chapter.number + "</button>";
  }).join("");

  els.chapterButtons.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const nextChapter = Number(button.dataset.chapter);
      if (nextChapter === state.currentChapter) return;
      state.currentChapter = nextChapter;
      state.query = "";
      els.searchInput.value = "";
      hideMarkMenu();
      renderChapter();
      animateReaderTransition("chapter");
    });
  });

  els.prevChapter.onclick = () => {
    if (state.currentChapter > 1) {
      state.currentChapter -= 1;
      state.query = "";
      els.searchInput.value = "";
      hideMarkMenu();
      renderChapter();
      animateReaderTransition("chapter");
    }
  };

  els.nextChapter.onclick = () => {
    if (state.currentChapter < book.chapterCount) {
      state.currentChapter += 1;
      state.query = "";
      els.searchInput.value = "";
      hideMarkMenu();
      renderChapter();
      animateReaderTransition("chapter");
    }
  };

  renderNoteList();
  renderHighlightList();
  renderContextList();
  setupResponsiveNoteLayout();
  renderChapter();

  if (state.motionReady) {
    animateReaderTransition("book");
  } else {
    state.motionReady = true;
  }

  const firstNote = Object.keys(book.notes || {})[0];
  if (firstNote) showNote(firstNote, false);
}


function getKoreanRevisedBookKey(bookId) {
  return KOREAN_REVISED_BOOK_KEYS[String(bookId || "").toLowerCase()] || null;
}

function getKoreanRevisedReferenceKey(bookId, chapter, verse) {
  const bookKey = getKoreanRevisedBookKey(bookId);
  if (!bookKey) return null;
  return bookKey + Number(chapter) + ":" + Number(verse);
}

async function loadKoreanRevisedBible() {
  if (state.koreanRevisedBible) return state.koreanRevisedBible;
  if (state.koreanRevisedBiblePromise) return state.koreanRevisedBiblePromise;

  state.koreanRevisedBiblePromise = (async () => {
    let lastError = null;
    for (const path of KOREAN_REVISED_BIBLE_PATHS) {
      try {
        const response = await fetch(withDataCacheBust(path), {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) {
          lastError = new Error("HTTP " + response.status + " @ " + path);
          continue;
        }
        const payload = await response.json();
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          lastError = new Error("개역개정 JSON 형식이 올바르지 않습니다. @ " + path);
          continue;
        }
        state.koreanRevisedBible = payload;
        return payload;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("개역개정 bible.json을 찾지 못했습니다.");
  })();

  try {
    return await state.koreanRevisedBiblePromise;
  } finally {
    state.koreanRevisedBiblePromise = null;
  }
}

function renderKoreanRevisedPanelContent(bookId, chapter, verse, text) {
  const book = state.books[bookId];
  const title = (book?.bookKo || bookId) + " " + Number(chapter) + ":" + Number(verse);
  return (
    '<div class="krv-panel-head">' +
      '<span>개역개정</span>' +
      '<strong>' + escapeHTML(title) + '</strong>' +
    '</div>' +
    '<p class="krv-text">' + escapeHTML(String(text || "").trim()) + '</p>' +
    '<div class="krv-copyright">' +
      '성경전서 개역개정판. 공개 서비스 전 대한성서공회 사용 허가 여부를 확인하세요.' +
    '</div>'
  );
}

function findKoreanRevisedPanel(button) {
  const controls = button?.getAttribute("aria-controls");
  if (!controls) return null;
  return document.getElementById(controls);
}

async function toggleKoreanRevisedPanel(button) {
  const panel = findKoreanRevisedPanel(button);
  if (!panel) return;

  const isOpen = button.getAttribute("aria-expanded") === "true";
  if (isOpen) {
    button.setAttribute("aria-expanded", "false");
    button.textContent = "개역개정";
    panel.hidden = true;
    return;
  }

  const bookId = button.dataset.book;
  const chapter = Number(button.dataset.chapter);
  const verse = Number(button.dataset.verse);
  const refKey = getKoreanRevisedReferenceKey(bookId, chapter, verse);

  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "개역개정";
  panel.hidden = false;
  panel.innerHTML = '<div class="krv-loading">개역개정 본문을 불러오는 중입니다.</div>';

  try {
    if (!refKey) throw new Error("지원하지 않는 권입니다.");
    const bible = await loadKoreanRevisedBible();
    const verseText = bible[refKey];
    if (!verseText) throw new Error(refKey + " 본문을 찾지 못했습니다.");
    panel.innerHTML = renderKoreanRevisedPanelContent(bookId, chapter, verse, verseText);
    button.setAttribute("aria-expanded", "true");
    button.textContent = "개역개정";
  } catch (error) {
    console.error(error);
    panel.innerHTML = '<div class="krv-error">개역개정 본문을 불러오지 못했습니다.<br><small>' + escapeHTML(error.message || "요청 실패") + '</small></div>';
    button.setAttribute("aria-expanded", "true");
    button.textContent = "개역개정";
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}

function bindKoreanRevisedButtons() {
  els.verses.querySelectorAll(".krv-toggle-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.getSelection()?.removeAllRanges();
      toggleKoreanRevisedPanel(button);
    });
  });
}

function getEsvBookName(bookId) {
  const key = String(bookId || "").toLowerCase();
  const book = state.books[bookId];
  return ESV_BOOK_NAMES[key] || book?.bookEn || book?.bookKo || bookId;
}

function esvCacheKey(bookId, chapter, verse) {
  return ["esv", bookId, chapter, verse].join(":");
}

function getEsvSessionCache(bookId, chapter, verse) {
  const key = esvCacheKey(bookId, chapter, verse);
  if (state.esvMemoryCache[key]) return state.esvMemoryCache[key];
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    state.esvMemoryCache[key] = parsed;
    return parsed;
  } catch (_) {
    return null;
  }
}

function setEsvSessionCache(bookId, chapter, verse, payload) {
  const key = esvCacheKey(bookId, chapter, verse);
  state.esvMemoryCache[key] = payload;
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (_) {
    /* 세션 캐시 실패는 표시 기능을 막지 않는다. */
  }
}

function renderBibleCompareSupport(bookId, chapter, verse) {
  const safeBookId = escapeHTML(String(bookId));
  const safeChapter = Number(chapter);
  const safeVerse = Number(verse);
  const esvId = "esv-" + safeBookId + "-" + safeChapter + "-" + safeVerse;
  const krId = "krv-" + safeBookId + "-" + safeChapter + "-" + safeVerse;

  return (
    '<div class="verse-support">' +
      '<button class="krv-toggle-btn" type="button" data-book="' + safeBookId + '" data-chapter="' + safeChapter + '" data-verse="' + safeVerse + '" aria-expanded="false" aria-controls="' + krId + '">개역개정</button>' +
      '<button class="esv-toggle-btn" type="button" data-book="' + safeBookId + '" data-chapter="' + safeChapter + '" data-verse="' + safeVerse + '" aria-expanded="false" aria-controls="' + esvId + '">ESV</button>' +
      '<div class="krv-panel" id="' + krId + '" hidden></div>' +
      '<div class="esv-panel" id="' + esvId + '" hidden></div>' +
    '</div>'
  );
}

function renderEsvVerseSupport(bookId, chapter, verse) {
  return renderBibleCompareSupport(bookId, chapter, verse);
}

function normalizeEsvPassageText(payload) {
  const passages = Array.isArray(payload?.passages) ? payload.passages : [];
  return passages
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function renderEsvPanelContent(payload) {
  const canonical = payload?.canonical || payload?.query || "ESV";
  const text = normalizeEsvPassageText(payload);
  if (!text) {
    return '<div class="esv-error">ESV 본문이 비어 있습니다.</div>';
  }

  return (
    '<div class="esv-panel-head">' +
      '<span>ESV</span>' +
      '<strong>' + escapeHTML(canonical) + '</strong>' +
    '</div>' +
    '<pre class="esv-text">' + escapeHTML(text) + '</pre>' +
    '<div class="esv-copyright">' +
      'ESV® Bible. © 2001 by Crossway. Used by permission. All rights reserved. ' +
      '<a href="https://www.esv.org/" target="_blank" rel="noopener">www.esv.org</a>' +
    '</div>'
  );
}

function buildEsvWorkerUrl(passage) {
  const url = new URL(ESV_WORKER_ENDPOINT);
  url.searchParams.set("q", passage);
  return url.toString();
}

async function fetchEsvPassage(bookId, chapter, verse) {
  const cached = getEsvSessionCache(bookId, chapter, verse);
  if (cached) return cached;

  const passage = getEsvBookName(bookId) + " " + Number(chapter) + ":" + Number(verse);
  const url = buildEsvWorkerUrl(passage);

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });
  } catch (error) {
    throw new Error(
      "Failed to fetch: Cloudflare Worker의 CORS 헤더 또는 네트워크 연결을 확인해야 합니다. " +
      "Worker 응답에 Access-Control-Allow-Origin: * 가 포함되어야 합니다."
    );
  }

  if (!response.ok) {
    throw new Error("ESV API 응답 오류: HTTP " + response.status);
  }

  const payload = await response.json();
  if (payload?.error) {
    throw new Error(String(payload.error));
  }

  setEsvSessionCache(bookId, chapter, verse, payload);
  return payload;
}

function findEsvPanel(button) {
  const controls = button?.getAttribute("aria-controls");
  if (!controls) return null;
  return document.getElementById(controls);
}

async function toggleEsvPanel(button) {
  const panel = findEsvPanel(button);
  if (!panel) return;

  const isOpen = button.getAttribute("aria-expanded") === "true";
  if (isOpen) {
    button.setAttribute("aria-expanded", "false");
    button.textContent = "ESV";
    panel.hidden = true;
    return;
  }

  const bookId = button.dataset.book;
  const chapter = Number(button.dataset.chapter);
  const verse = Number(button.dataset.verse);

  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "ESV";
  panel.hidden = false;
  panel.innerHTML = '<div class="esv-loading">ESV 본문을 불러오는 중입니다.</div>';

  try {
    const payload = await fetchEsvPassage(bookId, chapter, verse);
    panel.innerHTML = renderEsvPanelContent(payload);
    button.setAttribute("aria-expanded", "true");
    button.textContent = "ESV";
  } catch (error) {
    console.error(error);
    panel.innerHTML = '<div class="esv-error">ESV 본문을 불러오지 못했습니다.<br><small>' + escapeHTML(error.message || "요청 실패") + '</small></div>';
    button.setAttribute("aria-expanded", "true");
    button.textContent = "ESV";
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}

function bindEsvButtons() {
  els.verses.querySelectorAll(".esv-toggle-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.getSelection()?.removeAllRanges();
      toggleEsvPanel(button);
    });
  });
}

function renderChapter() {
  const book = state.books[state.currentBookId];
  if (!book) return;

  const query = state.query.trim();
  if (query) {
    renderGlobalSearchResults(query);
    return;
  }

  const chapter = book.chapters.find((item) => item.number === state.currentChapter);
  if (!chapter) {
    els.verses.innerHTML = '<p class="empty">장을 찾지 못했습니다.</p>';
    return;
  }

  els.chapterTitle.textContent = book.bookKo + " " + chapter.number + "장";
  els.verses.innerHTML = chapter.verses.map((verse) => {
    let html = mdInlineToHTML(verse.text);
    html = applyContextLinks(html, book.id, chapter.number, verse.number);
    html = applyUserHighlights(html, book.id, chapter.number, verse.number);
    const sectionIntroHtml = getSectionIntros(book.id, chapter.number, verse.number)
      .map(renderSectionIntro)
      .join("");

    return (
      sectionIntroHtml +
      '<article class="verse" id="v-' + chapter.number + "-" + verse.number + '" data-book="' + escapeHTML(book.id) + '" data-chapter="' + chapter.number + '" data-verse="' + verse.number + '">' +
      '<div class="verse-num">' + verse.number + "</div>" +
      '<div class="verse-text">' + html + "</div>" +
      renderEsvVerseSupport(book.id, chapter.number, verse.number) +
      "</article>"
    );
  }).join("") + renderChapterBottomNav(book, chapter);

  els.chapterButtons.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.chapter) === state.currentChapter);
  });

  els.prevChapter.disabled = state.currentChapter === 1;
  els.nextChapter.disabled = state.currentChapter === book.chapterCount;

  bindFootnoteButtons();
  bindContextButtons();
  bindSectionIntroButtons();
  bindChapterBottomNav();
  bindKoreanRevisedButtons();
  bindEsvButtons();
  updateSearchMeta();
  renderHighlightList();
  renderContextList();
}

async function renderGlobalSearchResults(query) {
  const currentRunId = state.searchRunId + 1;
  state.searchRunId = currentRunId;

  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    state.globalSearchResultCount = 0;
    renderChapter();
    return;
  }

  els.chapterTitle.textContent = "전체 검색 결과";
  els.chapterButtons.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
  els.prevChapter.disabled = true;
  els.nextChapter.disabled = true;
  els.verses.innerHTML =
    '<div class="search-result-head"><strong>' + escapeHTML(normalizedQuery) + '</strong> 전체 27권에서 검색 중입니다...</div>';
  els.searchMeta.textContent = "전체 27권에서 검색 중입니다.";

  try {
    const books = await ensureAllBooks();
    if (currentRunId !== state.searchRunId || normalizedQuery !== state.query.trim()) return;

    const results = [];
    books
      .slice()
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .forEach((book) => {
        (book.chapters || []).forEach((chapter) => {
          (chapter.verses || []).forEach((verse) => {
            const plainText = String(verse.text || "").replace(/\[\^[^\]]+\]/g, "");
            if (plainText.includes(normalizedQuery) || String(verse.text || "").includes(normalizedQuery)) {
              results.push({
                bookId: book.id,
                bookKo: book.bookKo,
                bookOrder: book.order,
                chapter: chapter.number,
                verse: verse.number,
                text: verse.text
              });
            }
          });
        });
      });

    state.globalSearchResultCount = results.length;

    if (results.length === 0) {
      els.verses.innerHTML =
        '<div class="search-result-head"><strong>' + escapeHTML(normalizedQuery) + '</strong> 전체 27권 검색 결과가 없습니다.</div>' +
        '<p class="empty">띄어쓰기나 표현을 조금 바꿔 다시 검색해 보세요.</p>';
      updateSearchMeta();
      return;
    }

    els.verses.innerHTML =
      '<div class="search-result-head"><strong>' + escapeHTML(normalizedQuery) + '</strong> 전체 27권 검색 결과 ' + results.length + '개</div>' +
      results.map((item) => {
        let html = mdInlineToHTML(item.text);
        html = applyContextLinks(html, item.bookId, item.chapter, item.verse);
        html = applyUserHighlights(html, item.bookId, item.chapter, item.verse);
        html = highlightHTML(html, normalizedQuery);
        const bookLabel = String(item.bookOrder || "").padStart(2, "0") + " " + escapeHTML(item.bookKo);
        return (
          '<article class="search-hit" id="search-' + item.bookId + '-' + item.chapter + '-' + item.verse + '" data-book="' + escapeHTML(item.bookId) + '" data-chapter="' + item.chapter + '" data-verse="' + item.verse + '">' +
          '<div class="search-ref" role="button" tabindex="0" data-book="' + escapeHTML(item.bookId) + '" data-chapter="' + item.chapter + '" data-verse="' + item.verse + '" title="해당 장으로 이동">' + bookLabel + '<br>' + item.chapter + ':' + item.verse + '</div>' +
          '<div class="verse-text">' + html + '</div>' +
          '</article>'
        );
      }).join("");

    function openSearchHit(targetEl) {
      const bookId = targetEl.dataset.book;
      const chapter = Number(targetEl.dataset.chapter);
      const verse = Number(targetEl.dataset.verse);
      state.query = "";
      els.searchInput.value = "";
      hideMarkMenu();
      selectBook(bookId, chapter).then(() => {
        requestAnimationFrame(() => {
          const target = document.getElementById("v-" + chapter + "-" + verse);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.classList.add("mark-flash");
          }
        });
      });
    }

    els.verses.querySelectorAll(".search-ref").forEach((item) => {
      item.addEventListener("click", () => openSearchHit(item));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSearchHit(item);
        }
      });
    });

    bindFootnoteButtons();
    bindContextButtons();
    updateSearchMeta();
  } catch (error) {
    console.error(error);
    els.verses.innerHTML =
      '<div class="error-box"><strong>전체 검색 데이터를 불러오지 못했습니다.</strong><br>' +
      escapeHTML(error.message) +
      '</div>';
    els.searchMeta.textContent = "전체 검색 로딩 실패";
  }
}


function renderChapterBottomNav(book, chapter) {
  if (!book || !chapter) return "";

  const current = Number(chapter.number || state.currentChapter || 1);
  const previous = current - 1;
  const next = current + 1;
  const hasPrevious = previous >= 1;
  const hasNext = next <= Number(book.chapterCount || 0);
  const prevFullLabel = hasPrevious ? book.bookKo + " " + previous + "장" : "이전 장 없음";
  const nextFullLabel = hasNext ? book.bookKo + " " + next + "장" : "다음 장 없음";
  const prevMobileLabel = hasPrevious ? previous + "장" : "처음";
  const nextMobileLabel = hasNext ? next + "장" : "마지막";

  return (
    '<nav class="chapter-bottom-nav" aria-label="장 하단 이동">' +
      '<button class="chapter-bottom-btn prev" type="button" data-bottom-chapter="' + previous + '" aria-label="' + escapeHTML(prevFullLabel) + '으로 이동" ' + (hasPrevious ? "" : "disabled") + '>' +
        '<span class="chapter-bottom-arrow" aria-hidden="true">←</span>' +
        '<span class="chapter-bottom-copy">' +
          '<span class="chapter-bottom-kicker">이전</span>' +
          '<strong><span class="chapter-bottom-full-label">' + escapeHTML(prevFullLabel) + '</span><span class="chapter-bottom-mobile-label">' + escapeHTML(prevMobileLabel) + '</span></strong>' +
        '</span>' +
      '</button>' +
      '<button class="chapter-bottom-btn next" type="button" data-bottom-chapter="' + next + '" aria-label="' + escapeHTML(nextFullLabel) + '으로 이동" ' + (hasNext ? "" : "disabled") + '>' +
        '<span class="chapter-bottom-copy">' +
          '<span class="chapter-bottom-kicker">다음</span>' +
          '<strong><span class="chapter-bottom-full-label">' + escapeHTML(nextFullLabel) + '</span><span class="chapter-bottom-mobile-label">' + escapeHTML(nextMobileLabel) + '</span></strong>' +
        '</span>' +
        '<span class="chapter-bottom-arrow" aria-hidden="true">→</span>' +
      '</button>' +
    '</nav>'
  );
}

function goToChapter(chapterNumber, options) {
  const book = state.books[state.currentBookId];
  const target = Number(chapterNumber);
  if (!book || !Number.isFinite(target)) return;
  if (target < 1 || target > Number(book.chapterCount || 0)) return;
  if (target === state.currentChapter && !(options && options.force)) return;

  state.currentChapter = target;
  state.query = "";
  if (els.searchInput) els.searchInput.value = "";
  hideMarkMenu();
  closeMobileInfoPopup();
  renderChapter();
  animateReaderTransition("chapter");

  requestAnimationFrame(() => {
    const targetTitle = document.querySelector(".chapter-title-wrap");
    if (targetTitle) targetTitle.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function bindChapterBottomNav() {
  els.verses.querySelectorAll(".chapter-bottom-btn[data-bottom-chapter]").forEach((button) => {
    button.addEventListener("click", () => goToChapter(Number(button.dataset.bottomChapter)));
  });
}

function bindFootnoteButtons() {
  els.verses.querySelectorAll(".fn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.getSelection()?.removeAllRanges();
      showNote(button.dataset.note, true);
    });
  });
}

function renderNoteList() {
  const book = state.books[state.currentBookId];
  const notes = book.notes || {};
  const ids = Object.keys(notes);

  els.noteCount.textContent = ids.length;
  syncMobileGlossaryCount();
  els.noteList.innerHTML = ids.map((id) => {
    const title = noteTitleFromText(id, notes[id]);
    const preview = plainFromNote(notes[id]).slice(0, 180);
    const active = id === state.currentNoteId ? " active" : "";
    return (
      '<button class="note-item' + active + '" type="button" data-note="' + escapeHTML(id) + '">' +
      "<strong>" + escapeDisplay(title) + "</strong>" +
      "<span>" + escapeDisplay(preview) + "</span>" +
      "</button>"
    );
  }).join("");

  els.noteList.querySelectorAll(".note-item").forEach((button) => {
    button.addEventListener("click", () => showNote(button.dataset.note, true));
  });
}


function findVerseText(bookId, chapterNumber, verseNumber) {
  const book = state.books[bookId];
  const chapter = book?.chapters?.find((item) => Number(item.number) === Number(chapterNumber));
  const verse = chapter?.verses?.find((item) => Number(item.number) === Number(verseNumber));
  return verse ? String(verse.text || "").replace(/\[\^[^\]]+\]/g, "").trim() : "";
}

function getHighlightItems() {
  const metas = state.manifest?.books || [];
  const metaById = new Map(metas.map((book) => [book.id, book]));
  const items = [];

  Object.entries(state.highlights || {}).forEach(([key, texts]) => {
    const parts = key.split(":");
    if (parts.length < 3 || !Array.isArray(texts)) return;

    const bookId = parts[0];
    const chapter = Number(parts[1]);
    const verse = Number(parts[2]);
    const meta = metaById.get(bookId) || state.books[bookId] || { id: bookId, bookKo: bookId, order: 999 };

    texts.forEach((text) => {
      const clean = normalizeHighlightText(text);
      if (!clean) return;
      items.push({
        key,
        bookId,
        bookKo: meta.bookKo || meta.bookEn || bookId,
        bookOrder: Number(meta.order || 999),
        chapter,
        verse,
        text: clean,
        fullVerseText: findVerseText(bookId, chapter, verse),
        color: getBookAccent(meta)
      });
    });
  });

  return items.sort((a, b) => {
    if (a.bookOrder !== b.bookOrder) return a.bookOrder - b.bookOrder;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    if (a.verse !== b.verse) return a.verse - b.verse;
    return a.text.localeCompare(b.text, "ko");
  });
}


function updateMobileHighlightToggle(count) {
  const total = Number.isFinite(Number(count)) ? Number(count) : getHighlightItems().length;
  if (els.mobileHighlightCount) els.mobileHighlightCount.textContent = String(total);
  if (els.mobileHighlightToggle) {
    els.mobileHighlightToggle.setAttribute("aria-label", "전체 마킹 리스트 열기, " + total + "개");
  }
}

function renderMobileHighlightListBody(items) {
  if (!items.length) {
    return '<div class="mobile-highlight-empty">아직 마킹된 텍스트가 없습니다.</div>';
  }

  return '<div class="mobile-highlight-list">' + items.map((item, index) => {
    const ref = item.bookKo + " " + item.chapter + ":" + item.verse;
    const excerpt = item.fullVerseText || "누르면 해당 구절로 이동합니다.";
    return (
      '<button class="mobile-highlight-item" type="button" data-index="' + index + '" style="--book-accent:' + escapeHTML(item.color) + '">' +
        '<span class="mobile-highlight-ref">' + escapeHTML(ref) + '</span>' +
        '<strong>' + escapeDisplay(item.text) + '</strong>' +
        '<em>' + escapeDisplay(excerpt) + '</em>' +
      '</button>'
    );
  }).join("") + '</div>';
}

function showMobileHighlightList() {
  const items = getHighlightItems();
  updateMobileHighlightToggle(items.length);

  const opened = showMobileInfoPopup({
    kicker: "HIGHLIGHTS · 마킹 모음",
    title: "전체 마킹 리스트",
    body: renderMobileHighlightListBody(items)
  });

  if (!opened) return;

  if (els.mobileHighlightToggle) els.mobileHighlightToggle.setAttribute("aria-expanded", "true");

  const popup = document.getElementById("mobileInfoPopup");
  popup?.querySelectorAll(".mobile-highlight-item").forEach((button) => {
    button.addEventListener("click", () => {
      const item = items[Number(button.dataset.index)];
      if (!item) return;
      closeMobileInfoPopup();
      openHighlightItem(item.bookId, item.chapter, item.verse);
    });
  });
}

function bindMobileHighlightToggle() {
  if (!els.mobileHighlightToggle) return;
  els.mobileHighlightToggle.addEventListener("click", () => {
    hideMarkMenu();
    window.getSelection()?.removeAllRanges();
    showMobileHighlightList();
  });
  updateMobileHighlightToggle();
}

function renderHighlightList() {
  if (!els.highlightList || !els.highlightCount) return;

  const allItems = getHighlightItems();
  updateMobileHighlightToggle(allItems.length);
  const items = state.highlightView === "current"
    ? allItems.filter((item) => item.bookId === state.currentBookId)
    : allItems;

  els.highlightCount.textContent = items.length;

  if (els.highlightAllTab) {
    els.highlightAllTab.classList.toggle("active", state.highlightView === "all");
    els.highlightAllTab.setAttribute("aria-selected", String(state.highlightView === "all"));
  }
  if (els.highlightCurrentTab) {
    els.highlightCurrentTab.classList.toggle("active", state.highlightView === "current");
    els.highlightCurrentTab.setAttribute("aria-selected", String(state.highlightView === "current"));
  }

  if (items.length === 0) {
    const emptyText = state.highlightView === "current"
      ? "현재 권에 마킹된 텍스트가 없습니다."
      : "아직 마킹된 텍스트가 없습니다.";
    els.highlightList.innerHTML = '<div class="highlight-empty">' + escapeHTML(emptyText) + '</div>';
    return;
  }

  els.highlightList.innerHTML = items.map((item, index) => {
    const ref = item.bookKo + " " + item.chapter + ":" + item.verse;
    const excerpt = item.fullVerseText || "본문 데이터를 아직 불러오지 않았습니다. 클릭하면 해당 장으로 이동합니다.";
    return (
      '<article class="highlight-item" tabindex="0" role="button" data-index="' + index + '" style="--book-accent:' + escapeHTML(item.color) + '">' +
        '<div class="highlight-ref">' + escapeHTML(ref) + '</div>' +
        '<div class="highlight-picked">' + escapeDisplay(item.text) + '</div>' +
        '<div class="highlight-excerpt">' + escapeDisplay(excerpt) + '</div>' +
        '<button class="highlight-remove" type="button" data-index="' + index + '" aria-label="마킹 삭제">삭제</button>' +
      '</article>'
    );
  }).join("");

  function openItem(item) {
    openHighlightItem(item.bookId, item.chapter, item.verse);
  }

  els.highlightList.querySelectorAll(".highlight-item").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".highlight-remove")) return;
      openItem(items[Number(card.dataset.index)]);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openItem(items[Number(card.dataset.index)]);
      }
    });
  });

  els.highlightList.querySelectorAll(".highlight-remove").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const item = items[Number(button.dataset.index)];
      if (!item) return;
      removeVerseHighlight(item.bookId, item.chapter, item.verse, item.text);
      renderChapter();
      renderHighlightList();
    });
  });
}

async function openHighlightItem(bookId, chapter, verse) {
  state.query = "";
  if (els.searchInput) els.searchInput.value = "";
  hideMarkMenu();
  await selectBook(bookId, Number(chapter));
  requestAnimationFrame(() => {
    const target = document.getElementById("v-" + chapter + "-" + verse);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("mark-flash");
    }
  });
}

function bindHighlightTabs() {
  if (els.highlightAllTab) {
    els.highlightAllTab.addEventListener("click", () => {
      state.highlightView = "all";
      renderHighlightList();
    });
  }
  if (els.highlightCurrentTab) {
    els.highlightCurrentTab.addEventListener("click", () => {
      state.highlightView = "current";
      renderHighlightList();
    });
  }
}


function normalizeContextPayload(payload, bookId) {
  if (!payload) return { bookId, contexts: {} };

  if (Array.isArray(payload)) {
    const contexts = {};
    payload.forEach((item) => {
      const id = item?.id || item?.key || item?.contextId;
      if (id) contexts[id] = item;
    });
    return { bookId, contexts };
  }

  if (Array.isArray(payload.contexts)) {
    const contexts = {};
    payload.contexts.forEach((item) => {
      const id = item?.id || item?.key || item?.contextId;
      if (id) contexts[id] = item;
    });
    return { ...payload, bookId: payload.bookId || bookId, contexts };
  }

  return {
    ...payload,
    bookId: payload.bookId || bookId,
    contexts: payload.contexts || {}
  };
}

async function ensureContext(bookId) {
  if (state.contextStatus[bookId] === "loaded" || state.contextStatus[bookId] === "empty") {
    return state.contexts[bookId] || { bookId, contexts: {} };
  }

  state.contextStatus[bookId] = "loading";
  const paths = [
    "./data/context/" + bookId + "_context.json",
    "./data/context/" + bookId + ".json",
    "./data/" + bookId + "_context.json"
  ];

  for (const path of paths) {
    const payload = await tryLoadJSON(path);
    if (payload) {
      const normalized = normalizeContextPayload(payload, bookId);
      state.contexts[bookId] = normalized;
      state.contextStatus[bookId] = "loaded";
      return normalized;
    }
  }

  state.contexts[bookId] = { bookId, contexts: {} };
  state.contextStatus[bookId] = "empty";
  return state.contexts[bookId];
}

function getCurrentContextPayload() {
  return state.contexts[state.currentBookId] || { bookId: state.currentBookId, contexts: {} };
}

function contextTypeLabel(type) {
  const value = String(type || "").toLowerCase();
  const map = {
    person: "인물",
    people: "인물",
    place: "지명",
    location: "지명",
    culture: "문화",
    custom: "문화",
    history: "역사",
    historical: "역사"
  };
  return map[value] || String(type || "기타");
}

function contextTypeValue(item) {
  if (!item) return "other";
  if (item.type) return String(item.type).toLowerCase();
  const categories = Array.isArray(item.category) ? item.category : Array.isArray(item.categories) ? item.categories : [];
  const joined = categories.join(" ");
  if (/인물|person|people/i.test(joined)) return "person";
  if (/지명|place|location/i.test(joined)) return "place";
  if (/문화|culture|custom/i.test(joined)) return "culture";
  if (/역사|history|historical/i.test(joined)) return "history";
  return "other";
}

function certaintyLabel(value) {
  const text = String(value || "").toLowerCase();
  if (text === "high" || text === "높음") return "확실성 높음";
  if (text === "medium" || text === "중간") return "확실성 중간";
  if (text === "low" || text === "낮음") return "확실성 낮음";
  return value ? "확실성 " + value : "확실성 미표기";
}

function sourceTypeLabel(value) {
  const text = String(value || "").toLowerCase();
  const map = {
    "text": "본문 근거",
    "biblical-text": "본문 근거",
    "historical-background": "역사 배경",
    "scholarly-consensus": "학술 합의",
    "scholarly-inference": "학술 추론",
    "traditional-interpretation": "전통 해석"
  };
  return map[text] || value || "근거 미표기";
}

function plainContextText(item) {
  return [item?.summary, item?.ancientContext, item?.body, item?.description, item?.text]
    .filter(Boolean)
    .join(" ")
    .replace(/\*\*/g, "")
    .trim();
}

function getContextItems() {
  const payload = getCurrentContextPayload();
  const contexts = payload.contexts || {};
  return Object.entries(contexts).map(([id, item]) => ({
    id,
    ...item,
    typeValue: contextTypeValue(item),
    typeLabel: contextTypeLabel(item?.type || contextTypeValue(item))
  })).sort((a, b) => {
    const order = { person: 1, place: 2, culture: 3, history: 4, other: 5 };
    const ao = order[a.typeValue] || 9;
    const bo = order[b.typeValue] || 9;
    if (ao !== bo) return ao - bo;
    return String(a.label || a.title || a.id).localeCompare(String(b.label || b.title || b.id), "ko");
  });
}


function getContextAliases(item) {
  const values = [];
  if (item?.label) values.push(item.label);
  if (item?.title) values.push(item.title);
  if (Array.isArray(item?.aliases)) values.push(...item.aliases);

  return [...new Set(values.map((value) => String(value || "").trim()).filter((value) => value.length >= 2))]
    .sort((a, b) => b.length - a.length);
}

function refMatchesVerse(ref, book, chapter, verse) {
  const raw = String(ref || "").trim();
  if (!raw) return false;

  const bookNames = [book?.id, book?.bookEn, book?.bookKo]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  const lower = raw.toLowerCase();

  let refPart = raw;
  bookNames.forEach((name) => {
    if (lower.startsWith(name + " ")) {
      refPart = raw.slice(name.length).trim();
    }
  });

  refPart = refPart.replace(/^\s+|\s+$/g, "");
  if (refPart === String(chapter) + ":" + String(verse)) return true;

  let match = refPart.match(/^(\d+):(\d+)\s*-\s*(\d+)$/);
  if (match) {
    const startChapter = Number(match[1]);
    const startVerse = Number(match[2]);
    const endVerse = Number(match[3]);
    return Number(chapter) === startChapter && Number(verse) >= startVerse && Number(verse) <= endVerse;
  }

  match = refPart.match(/^(\d+):(\d+)\s*-\s*(\d+):(\d+)$/);
  if (match) {
    const startChapter = Number(match[1]);
    const startVerse = Number(match[2]);
    const endChapter = Number(match[3]);
    const endVerse = Number(match[4]);
    const current = Number(chapter) * 1000 + Number(verse);
    const start = startChapter * 1000 + startVerse;
    const end = endChapter * 1000 + endVerse;
    return current >= start && current <= end;
  }

  return false;
}

function contextAppliesToVerse(item, book, chapter, verse) {
  const refs = Array.isArray(item?.refs) ? item.refs : item?.ref ? [item.ref] : [];
  if (refs.length === 0) return false;
  return refs.some((ref) => refMatchesVerse(ref, book, chapter, verse));
}

function applyContextLinks(html, bookId, chapter, verse) {
  const payload = state.contexts[bookId];
  if (!payload || !payload.contexts) return html;

  const book = state.books[bookId] || state.manifest?.books?.find((item) => item.id === bookId) || { id: bookId };
  const items = Object.entries(payload.contexts)
    .map(([id, item]) => ({ id, ...item }))
    .filter((item) => contextAppliesToVerse(item, book, chapter, verse));

  return items.reduce((current, item) => {
    const aliases = getContextAliases(item);
    if (aliases.length === 0) return current;

    let next = current;
    let linked = false;
    for (const alias of aliases) {
      if (linked) break;
      const pattern = new RegExp("(" + escapeRegExp(escapeHTML(alias)) + ")", "g");
      next = replaceOutsideTags(next, pattern, (match) => {
        if (linked) return match;
        linked = true;
        return '<button class="ctx-link text-label auto-context" type="button" data-context="' + escapeHTML(item.id) + '" title="당시 배경 보기">' + match + '</button>';
      });
    }
    return next;
  }, html);
}

function renderContextList() {
  if (!els.contextList || !els.contextCount) return;

  const status = state.contextStatus[state.currentBookId];
  const allItems = getContextItems();
  const items = state.contextView === "all"
    ? allItems
    : allItems.filter((item) => item.typeValue === state.contextView);

  els.contextCount.textContent = items.length;
  els.contextTabs?.forEach((tab) => {
    const active = tab.dataset.contextView === state.contextView;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  if (status === "loading") {
    els.contextList.innerHTML = '<div class="context-empty">컨텍스트 데이터를 불러오는 중입니다.</div>';
    return;
  }

  if (allItems.length === 0) {
    els.contextList.innerHTML = '<div class="context-empty">현재 권의 컨텍스트 데이터가 없습니다.<br><code>data/context/' + escapeHTML(state.currentBookId || "book") + '_context.json</code> 파일을 추가하면 자동으로 표시됩니다.</div>';
    if (els.contextBody) {
      els.contextBody.innerHTML = "본문의 컨텍스트 표시를 누르거나, 권별 컨텍스트 JSON을 추가하면 당시 인물·지명·문화·역사 설명이 여기에 표시됩니다.";
    }
    return;
  }

  if (items.length === 0) {
    els.contextList.innerHTML = '<div class="context-empty">이 분류에 해당하는 컨텍스트가 없습니다.</div>';
    return;
  }

  els.contextList.innerHTML = items.map((item) => {
    const title = item.label || item.title || item.id;
    const refs = Array.isArray(item.refs) ? item.refs.join(", ") : (item.ref || "");
    const preview = plainContextText(item).slice(0, 150);
    const active = item.id === state.currentContextId ? " active" : "";
    return (
      '<button class="context-item' + active + '" type="button" data-context="' + escapeHTML(item.id) + '">' +
        '<span class="context-type">' + escapeHTML(item.typeLabel) + '</span>' +
        '<strong>' + escapeDisplay(title) + '</strong>' +
        (refs ? '<em>' + escapeDisplay(refs) + '</em>' : '') +
        '<small>' + escapeDisplay(preview || "설명 내용 없음") + '</small>' +
      '</button>'
    );
  }).join("");

  els.contextList.querySelectorAll(".context-item").forEach((button) => {
    button.addEventListener("click", () => showContext(button.dataset.context, true));
  });
}

function renderContextParagraph(title, body) {
  if (!body) return "";
  return '<div class="context-section"><h4>' + escapeDisplay(title) + '</h4><p>' + mdInlineToHTML(body) + '</p></div>';
}

function renderContextSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return "";
  return '<div class="context-section context-sources"><h4>출처/근거</h4>' +
    sources.map((source) => {
      if (typeof source === "string") return '<p>' + escapeDisplay(source) + '</p>';
      const title = source.title || source.name || source.url || "출처";
      const note = source.note ? ' — ' + source.note : '';
      return '<p><strong>' + escapeDisplay(title) + '</strong>' + escapeDisplay(note) + '</p>';
    }).join("") +
    '</div>';
}


function isMobilePopupPreferred() {
  return isMobileReaderLayout();
}

function getMobileInfoPopup() {
  let popup = document.getElementById("mobileInfoPopup");
  if (popup) return popup;

  popup = document.createElement("div");
  popup.id = "mobileInfoPopup";
  popup.className = "mobile-info-popup";
  popup.setAttribute("aria-hidden", "true");
  popup.innerHTML =
    '<div class="mobile-info-backdrop" data-popup-close="true"></div>' +
    '<section class="mobile-info-sheet" role="dialog" aria-modal="true" aria-labelledby="mobileInfoTitle" tabindex="-1">' +
      '<div class="mobile-info-grip" aria-hidden="true"></div>' +
      '<div class="mobile-info-head">' +
        '<div>' +
          '<div id="mobileInfoKicker" class="mobile-info-kicker">NOTE</div>' +
          '<h2 id="mobileInfoTitle">설명</h2>' +
        '</div>' +
        '<button id="mobileInfoClose" class="mobile-info-close" type="button" aria-label="팝업 닫기">닫기</button>' +
      '</div>' +
      '<div id="mobileInfoBody" class="mobile-info-body"></div>' +
    '</section>';

  document.body.appendChild(popup);

  popup.querySelectorAll('[data-popup-close="true"], #mobileInfoClose').forEach((item) => {
    item.addEventListener("click", closeMobileInfoPopup);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && popup.classList.contains("show")) closeMobileInfoPopup();
  });

  return popup;
}

function showMobileInfoPopup(options) {
  if (!isMobilePopupPreferred()) return false;

  const popup = getMobileInfoPopup();
  const kicker = popup.querySelector("#mobileInfoKicker");
  const title = popup.querySelector("#mobileInfoTitle");
  const body = popup.querySelector("#mobileInfoBody");
  const sheet = popup.querySelector(".mobile-info-sheet");

  if (kicker) kicker.textContent = options.kicker || "NOTE";
  if (title) title.textContent = options.title || "설명";
  if (body) body.innerHTML = options.body || "내용을 찾지 못했습니다.";

  popup.setAttribute("aria-hidden", "false");
  popup.classList.add("show");
  document.body.classList.add("mobile-popup-open");
  hideMarkMenu();

  requestAnimationFrame(() => {
    if (sheet) sheet.focus({ preventScroll: true });
  });

  return true;
}

function closeMobileInfoPopup() {
  const popup = document.getElementById("mobileInfoPopup");
  if (!popup) return;
  popup.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
  document.body.classList.remove("mobile-popup-open");
  if (els.mobileHighlightToggle) els.mobileHighlightToggle.setAttribute("aria-expanded", "false");
}

function showContext(contextId, scrollToPanel) {
  const item = getContextItems().find((entry) => entry.id === contextId);
  state.currentContextId = contextId;

  if (!els.contextBody) return;

  if (!item) {
    els.contextBody.innerHTML = "컨텍스트 항목을 찾지 못했습니다.";
    renderContextList();
    return;
  }

  const title = item.label || item.title || item.id;
  const refs = Array.isArray(item.refs) ? item.refs.join(", ") : (item.ref || "");
  const categories = Array.isArray(item.category) ? item.category : Array.isArray(item.categories) ? item.categories : [];
  const meta = [
    item.typeLabel,
    refs,
    certaintyLabel(item.certainty),
    sourceTypeLabel(item.basis || item.sourceType)
  ].filter(Boolean);

  els.contextBody.innerHTML =
    '<div class="context-selected-head">' +
      '<span>' + escapeHTML(meta.join(" · ")) + '</span>' +
      '<h3>' + escapeDisplay(title) + '</h3>' +
      (categories.length ? '<div class="context-chips">' + categories.map((cat) => '<b>' + escapeHTML(cat) + '</b>').join("") + '</div>' : '') +
    '</div>' +
    renderContextParagraph("무엇인가", item.summary || item.definition || item.description) +
    renderContextParagraph("당시 상황", item.ancientContext || item.ancient_context) +
    renderContextParagraph("본문에서의 의미", item.textFunction || item.inText || item.biblicalContext || item.biblical_context) +
    renderContextParagraph("현대 독자의 오독 주의", item.avoidModernReading || item.avoid_modern_reading || item.warning) +
    (item.body || item.text ? renderContextParagraph("추가 설명", item.body || item.text) : "") +
    renderContextSources(item.sources);

  renderContextList();

  if (scrollToPanel) {
    if (showMobileInfoPopup({
      kicker: "CONTEXT · 시대 배경",
      title,
      body: els.contextBody.innerHTML
    })) {
      return;
    }

    if (window.innerWidth < 1280) {
      const rail = document.querySelector(".right-rail");
      if (rail) rail.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

function bindContextButtons() {
  els.verses.querySelectorAll(".ctx-link").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.getSelection()?.removeAllRanges();
      showContext(button.dataset.context, true);
    });
  });
}

function bindContextTabs() {
  els.contextTabs?.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.contextView = tab.dataset.contextView || "all";
      renderContextList();
    });
  });
}

function showNote(noteId, scrollToPanel) {
  const book = state.books[state.currentBookId];
  const raw = book && book.notes ? book.notes[noteId] : null;
  state.currentNoteId = noteId;

  els.noteTitle.textContent = raw ? noteTitleFromText(noteId, raw) : noteId;
  els.noteBody.innerHTML = raw ? mdInlineToHTML(raw) : "설명을 찾지 못했습니다.";

  els.noteList.querySelectorAll(".note-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.note === noteId);
  });

  if (scrollToPanel) {
    if (isMobileReaderLayout()) {
      closeMobileGlossary();
      showMobileInfoPopup({
        kicker: "SELECTED NOTE · 설명",
        title: els.noteTitle.textContent,
        body: els.noteBody.innerHTML
      });
      return;
    }

    if (window.innerWidth < 1280) {
      const rail = document.querySelector(".right-rail");
      if (rail) rail.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

function updateSearchMeta() {
  const query = state.query.trim();
  if (!query) {
    els.searchMeta.textContent = "검색어를 입력하세요.";
    return;
  }

  const totalBooks = state.manifest?.books?.length || 0;
  els.searchMeta.textContent = "전체 " + totalBooks + "권에서 " + state.globalSearchResultCount + "개 절이 검색어를 포함합니다.";
}

function getElementFromNode(node) {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function parseVerseMeta(article) {
  if (!article || !article.id) return null;

  if (article.dataset && article.dataset.book && article.dataset.chapter && article.dataset.verse) {
    return {
      bookId: article.dataset.book,
      chapter: Number(article.dataset.chapter),
      verse: Number(article.dataset.verse)
    };
  }

  const match = article.id.match(/^(?:v|search)-(\d+)-(\d+)$/);
  if (!match) return null;
  return {
    bookId: state.currentBookId,
    chapter: Number(match[1]),
    verse: Number(match[2])
  };
}

function getSelectionContext() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const selectedText = normalizeHighlightText(selection.toString());
  if (!selectedText || selectedText.length < 2) return null;

  const anchorEl = getElementFromNode(selection.anchorNode);
  const focusEl = getElementFromNode(selection.focusNode);
  if (!anchorEl || !focusEl) return null;

  let meta = null;
  let markScope = "verse";
  let introId = "";
  let activeDetail = "";

  if (els.verses.contains(anchorEl) && els.verses.contains(focusEl)) {
    const startArticle = anchorEl.closest(".verse, .search-hit");
    const endArticle = focusEl.closest(".verse, .search-hit");
    if (!startArticle || !endArticle || startArticle !== endArticle) return null;
    meta = parseVerseMeta(startArticle);
  } else {
    const startScope = anchorEl.closest('[data-mark-scope="interpretive"]');
    const endScope = focusEl.closest('[data-mark-scope="interpretive"]');
    if (!startScope || !endScope || startScope !== endScope) return null;
    meta = {
      bookId: startScope.dataset.book || state.currentBookId,
      chapter: Number(startScope.dataset.chapter),
      verse: Number(startScope.dataset.verse)
    };
    markScope = "interpretive";
    introId = startScope.dataset.introId || "";
    activeDetail = startScope.dataset.activeDetail || "";
  }

  if (!meta || !Number.isFinite(meta.chapter) || !Number.isFinite(meta.verse)) return null;

  const anchorMark = anchorEl.closest(".user-mark");
  const focusMark = focusEl.closest(".user-mark");
  const isSameExistingMark = Boolean(anchorMark && focusMark && anchorMark === focusMark);
  const text = isSameExistingMark ? normalizeHighlightText(anchorMark.textContent) : selectedText;
  const markBookId = meta.bookId || state.currentBookId;
  const mode = isSameExistingMark || hasVerseHighlight(markBookId, meta.chapter, meta.verse, text) ? "delete" : "mark";

  const range = selection.getRangeAt(0);
  let rect = range.getBoundingClientRect();
  const rects = range.getClientRects ? Array.from(range.getClientRects()) : [];

  if ((!rect || (rect.width === 0 && rect.height === 0)) && rects.length) {
    rect = rects[0];
  }

  if (!rect || (rect.width === 0 && rect.height === 0)) {
    const point = state.lastPointerPosition;
    if (!point) return null;
    rect = {
      top: point.clientY,
      left: point.clientX,
      width: 1,
      height: 1,
      right: point.clientX + 1,
      bottom: point.clientY + 1
    };
  }

  return {
    bookId: markBookId,
    chapter: meta.chapter,
    verse: meta.verse,
    text,
    mode,
    rect,
    markScope,
    introId,
    activeDetail
  };
}

function getMarkMenu() {
  let menu = document.getElementById("markMenu");
  if (menu) return menu;

  menu = document.createElement("div");
  menu.id = "markMenu";
  menu.className = "mark-menu";
  menu.innerHTML = '<button type="button" class="mark-menu-btn" title="빨간 밑줄 마킹">m</button>';
  document.body.appendChild(menu);

  menu.querySelector(".mark-menu-btn").addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  menu.querySelector(".mark-menu-btn").addEventListener("click", () => {
    applyPendingMarkAction();
  });

  return menu;
}

function shouldUseMobileMarkMenu() {
  return Boolean(
    isMobileReaderLayout() ||
    window.matchMedia?.("(pointer: coarse)")?.matches ||
    window.matchMedia?.("(hover: none)")?.matches ||
    navigator.maxTouchPoints > 0
  );
}

function showMarkMenu(context) {
  const menu = getMarkMenu();
  const button = menu.querySelector(".mark-menu-btn");
  state.pendingMark = context;

  const isDelete = context.mode === "delete";
  const isMobile = shouldUseMobileMarkMenu();
  button.textContent = isDelete ? "d" : "m";
  button.title = isDelete ? "빨간 밑줄 취소" : "빨간 밑줄 마킹";
  menu.classList.toggle("delete-mode", isDelete);
  menu.classList.toggle("mobile-below", isMobile);
  menu.classList.toggle("mobile-bottom-dock", isMobile);

  if (isMobile) {
    // Android Chrome can report a wide viewport or unstable selection rects.
    // For touch devices, dock the mark button at the lower screen area so it never appears above the selected text.
    menu.style.position = "fixed";
    menu.style.top = "auto";
    menu.style.left = "50%";
    menu.style.bottom = "calc(22px + env(safe-area-inset-bottom, 0px))";
    menu.classList.add("show");
    return;
  }

  menu.style.position = "absolute";
  menu.style.bottom = "auto";

  const viewportPadding = 8;
  const menuSize = 42;
  const aboveGap = 42;
  const preferredTop = window.scrollY + context.rect.top - aboveGap;
  const maxTop = window.scrollY + window.innerHeight - menuSize - viewportPadding;
  const minTop = window.scrollY + viewportPadding;
  const top = Math.min(Math.max(minTop, preferredTop), maxTop);

  const preferredLeft = window.scrollX + context.rect.left + context.rect.width / 2;
  const minLeft = window.scrollX + 28;
  const maxLeft = window.scrollX + window.innerWidth - 28;
  const left = Math.min(Math.max(minLeft, preferredLeft), maxLeft);

  menu.style.top = top + "px";
  menu.style.left = left + "px";
  menu.classList.add("show");
}

function hideMarkMenu() {
  const menu = document.getElementById("markMenu");
  if (menu) menu.classList.remove("show");
  state.pendingMark = null;
}

function applyPendingMarkAction() {
  const context = state.pendingMark;
  if (!context) return;

  const changed = context.mode === "delete"
    ? removeVerseHighlight(context.bookId, context.chapter, context.verse, context.text)
    : addVerseHighlight(context.bookId, context.chapter, context.verse, context.text);

  hideMarkMenu();
  window.getSelection()?.removeAllRanges();

  if (changed) {
    renderChapter();
    renderHighlightList();
    if (context.markScope === "interpretive" && context.introId) {
      refreshInterpretivePopupContent(context.introId, context.activeDetail || null);
    }
    const target = document.getElementById("v-" + context.chapter + "-" + context.verse) ||
      document.getElementById("search-" + context.bookId + "-" + context.chapter + "-" + context.verse);
    if (target) target.classList.add(context.mode === "delete" ? "mark-remove-flash" : "mark-flash");
  }
}

function rememberPointerPosition(event) {
  const point = event?.changedTouches?.[0] || event?.touches?.[0] || event;
  if (!point || typeof point.clientX !== "number" || typeof point.clientY !== "number") return;

  state.lastPointerPosition = {
    clientX: point.clientX,
    clientY: point.clientY,
    time: Date.now()
  };
}

function probeSelectionForMarkMenu() {
  clearTimeout(state.selectionProbeTimer);
  const context = getSelectionContext();
  if (context) showMarkMenu(context);
  else hideMarkMenu();
}

function scheduleSelectionProbe(delays) {
  const list = Array.isArray(delays) ? delays : [Number(delays) || 0];
  clearTimeout(state.selectionProbeTimer);

  list.forEach((delay) => {
    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        if (delay >= 240) hideMarkMenu();
        return;
      }

      const context = getSelectionContext();
      if (context) showMarkMenu(context);
    }, delay);
  });
}

function bindSelectionMarker() {
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hideMarkMenu();
      return;
    }

    scheduleSelectionProbe([80, 220, 520]);
  });

  document.addEventListener("pointerdown", (event) => {
    rememberPointerPosition(event);
  }, { passive: true });

  document.addEventListener("pointerup", (event) => {
    rememberPointerPosition(event);
    scheduleSelectionProbe([0, 120, 320, 700]);
  }, { passive: true });

  document.addEventListener("mouseup", (event) => {
    rememberPointerPosition(event);
    scheduleSelectionProbe([0, 120]);
  });

  document.addEventListener("touchstart", (event) => {
    rememberPointerPosition(event);
  }, { passive: true });

  document.addEventListener("touchend", (event) => {
    rememberPointerPosition(event);
    scheduleSelectionProbe([80, 240, 520, 900]);
  }, { passive: true });

  document.addEventListener("contextmenu", (event) => {
    rememberPointerPosition(event);
    scheduleSelectionProbe([120, 360, 720]);
  });

  document.addEventListener("keyup", () => {
    scheduleSelectionProbe([0, 80]);
  });

  document.addEventListener("scroll", (event) => {
    const target = event.target;
    const insideInterpretivePopup = target && target.closest && target.closest(".interpretive-popup-sheet, .mobile-info-body, .mobile-info-sheet");
    if (insideInterpretivePopup) {
      // 해석 관점 팝업 내부는 스크롤 가능한 영역이다.
      // 이 영역에서 텍스트를 선택하는 동안 scroll 이벤트가 먼저 발생하면
      // 마킹 메뉴가 즉시 사라지는 문제가 있어 선택 감지를 다시 예약한다.
      scheduleSelectionProbe([40, 160]);
      return;
    }
    hideMarkMenu();
  }, true);
}


function isMobileReaderLayout() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function ensureMobileNoteSlot() {
  let slot = document.getElementById("mobileNoteSlot");
  if (slot) return slot;

  const searchPanel = els.searchInput ? els.searchInput.closest(".panel") : null;
  const leftRail = document.querySelector(".left-rail");
  if (!searchPanel || !leftRail) return null;

  slot = document.createElement("div");
  slot.id = "mobileNoteSlot";
  slot.className = "mobile-note-slot";
  slot.setAttribute("aria-label", "모바일 선택 설명 영역");
  searchPanel.insertAdjacentElement("afterend", slot);
  return slot;
}

function ensureMobileGlossaryShell() {
  let shell = document.getElementById("mobileGlossaryShell");
  if (shell) return shell;

  shell = document.createElement("section");
  shell.id = "mobileGlossaryShell";
  shell.className = "mobile-glossary-shell";
  shell.innerHTML =
    '<button id="mobileGlossaryToggle" class="mobile-glossary-toggle" type="button" aria-expanded="false">' +
      '<span>설명 리스트</span>' +
      '<strong id="mobileGlossaryCount">0</strong>' +
    '</button>' +
    '<div id="mobileGlossaryPanel" class="mobile-glossary-panel" hidden></div>';

  shell.querySelector("#mobileGlossaryToggle").addEventListener("click", () => {
    const panel = shell.querySelector("#mobileGlossaryPanel");
    const toggle = shell.querySelector("#mobileGlossaryToggle");
    const nextOpen = panel.hasAttribute("hidden");
    panel.toggleAttribute("hidden", !nextOpen);
    shell.classList.toggle("open", nextOpen);
    toggle.setAttribute("aria-expanded", String(nextOpen));
  });

  return shell;
}

function syncMobileGlossaryCount() {
  const mobileCount = document.getElementById("mobileGlossaryCount");
  if (mobileCount && els.noteCount) mobileCount.textContent = els.noteCount.textContent || "0";
}

function closeMobileGlossary() {
  const shell = document.getElementById("mobileGlossaryShell");
  if (!shell) return;
  const panel = shell.querySelector("#mobileGlossaryPanel");
  const toggle = shell.querySelector("#mobileGlossaryToggle");
  if (panel) panel.setAttribute("hidden", "");
  if (toggle) toggle.setAttribute("aria-expanded", "false");
  shell.classList.remove("open");
}

function setupResponsiveNoteLayout() {
  const rightRail = document.querySelector(".right-rail");
  const activeNote = document.querySelector(".active-note");
  const noteListCard = document.querySelector(".note-list-card");
  const quoteSection = document.querySelector(".quote-section");
  if (!rightRail || !activeNote || !noteListCard) return;

  const mobile = isMobileReaderLayout();
  const slot = ensureMobileNoteSlot();
  const shell = ensureMobileGlossaryShell();
  const panel = shell.querySelector("#mobileGlossaryPanel");

  if (mobile && slot && panel) {
    if (activeNote.parentElement !== slot) slot.appendChild(activeNote);
    if (shell.parentElement !== slot) slot.appendChild(shell);
    if (noteListCard.parentElement !== panel) panel.appendChild(noteListCard);
  } else {
    if (activeNote.parentElement !== rightRail) rightRail.insertBefore(activeNote, rightRail.firstElementChild || null);
    const insertBefore = quoteSection && quoteSection.parentElement === rightRail ? quoteSection : null;
    if (noteListCard.parentElement !== rightRail) rightRail.insertBefore(noteListCard, insertBefore);
    closeMobileGlossary();
  }

  syncMobileGlossaryCount();
  syncNoteListCollapsedState();
}

function bindResponsiveNoteLayout() {
  setupResponsiveNoteLayout();
  window.addEventListener("resize", () => {
    setupResponsiveNoteLayout();
    if (!isMobileReaderLayout()) closeMobileInfoPopup();
  });
  window.addEventListener("orientationchange", () => setTimeout(setupResponsiveNoteLayout, 120));
}

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  hideMarkMenu();
  renderChapter();
});

async function init() {
  try {
    state.manifest = await loadJSON("./data/manifest.json");
    if (!state.manifest.books || state.manifest.books.length === 0) {
      throw new Error("manifest.json에 books 정보가 없습니다.");
    }
    bindSelectionMarker();
    bindNoteListToggle();
    bindResponsiveNoteLayout();
    bindHighlightTabs();
    bindMobileHighlightToggle();
    bindContextTabs();
    bindInterpretiveDetailDelegation();
    bindInterpretiveTypingAnimation();
    bindFirebaseAuth();
    await selectBook(state.manifest.books[0].id, 1);
  } catch (error) {
    console.error(error);
    els.bookTitle.textContent = "로딩 실패";
    if (els.bookEnglishTitle) els.bookEnglishTitle.textContent = "Loading failed";
    els.bookDesc.textContent = "데이터 파일 경로를 확인하세요.";
    els.verses.innerHTML =
      '<div class="error-box">' +
      "<strong>데이터를 불러오지 못했습니다.</strong><br>" +
      escapeHTML(error.message) +
      "<br><br>로컬에서는 index.html을 직접 열지 말고 <code>python -m http.server 8000</code>으로 실행하세요." +
      "</div>";
  }
}

document.addEventListener("DOMContentLoaded", init);
