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
  highlights: loadHighlights(),
  highlightView: "all",
  contexts: {},
  contextStatus: {},
  contextView: "all",
  currentContextId: null,
  pendingMark: null,
  searchRunId: 0,
  globalSearchResultCount: 0
};

const $ = (id) => document.getElementById(id);

const els = {
  totalBookStat: $("totalBookStat"),
  bookCount: $("bookCount"),
  bookList: $("bookList"),
  bookTitle: $("bookTitle"),
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
  contextCount: $("contextCount"),
  contextList: $("contextList"),
  contextBody: $("contextBody"),
  contextTabs: document.querySelectorAll("[data-context-view]")
};

async function loadJSON(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(path + " 로딩 실패: HTTP " + response.status);
  return response.json();
}

async function tryLoadJSON(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
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

function storageKey() {
  return "nt-modern-ko-highlights-v1";
}

function loadHighlights() {
  try {
    return JSON.parse(localStorage.getItem(storageKey()) || "{}");
  } catch (_) {
    return {};
  }
}

function saveHighlights() {
  localStorage.setItem(storageKey(), JSON.stringify(state.highlights));
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
  const clean = normalizeHighlightText(text);
  if (!clean) return false;

  const key = highlightKey(bookId, chapter, verse);
  const list = state.highlights[key] || [];
  if (!list.includes(clean)) list.push(clean);
  state.highlights[key] = list;
  saveHighlights();
  return true;
}

function removeVerseHighlight(bookId, chapter, verse, text) {
  const clean = normalizeHighlightText(text);
  if (!clean) return false;

  const key = highlightKey(bookId, chapter, verse);
  const list = state.highlights[key] || [];
  const next = list.filter((item) => item !== clean);
  if (next.length === list.length) return false;

  if (next.length) state.highlights[key] = next;
  else delete state.highlights[key];
  saveHighlights();
  return true;
}

function applyBookAccent(bookId) {
  const color = getBookAccent(bookId);
  document.documentElement.style.setProperty("--accent", color);
}

function mdInlineToHTML(text) {
  let html = escapeHTML(text);
  html = html.replace(/\{\{ctx:([^}|]+)(?:\|([^}]+))?\}\}/g, function (_, contextId, label) {
    const safeId = escapeHTML(String(contextId || "").trim());
    const safeLabel = label ? escapeHTML(String(label).trim()) : "맥락";
    const isInlineLabel = Boolean(label);
    return '<button class="ctx-link' + (isInlineLabel ? ' text-label' : '') + '" type="button" data-context="' + safeId + '" title="당시 배경 보기">' + safeLabel + '</button>';
  });
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[\^([^\]]+)\]/g, function (_, noteId) {
    const safeId = escapeHTML(noteId);
    return '<button class="fn" type="button" data-note="' + safeId + '" title="설명 보기">' + safeId + "</button>";
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

async function selectBook(bookId, chapterNumber) {
  const book = await ensureBook(bookId);
  await ensureContext(bookId);
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
  els.bookDesc.textContent = book.bookEn + " · " + book.chapterCount + "장 · " + book.verseCount + "절 · 인명·지명·용어 설명 포함";
  els.chapterStat.textContent = book.chapterCount + "장";
  els.verseStat.textContent = book.verseCount;

  els.chapterButtons.innerHTML = book.chapters.map((chapter) => {
    const active = chapter.number === state.currentChapter ? " active" : "";
    return '<button class="' + active + '" type="button" data-chapter="' + chapter.number + '">' + chapter.number + "</button>";
  }).join("");

  els.chapterButtons.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentChapter = Number(button.dataset.chapter);
      state.query = "";
      els.searchInput.value = "";
      hideMarkMenu();
      renderChapter();
    });
  });

  els.prevChapter.onclick = () => {
    if (state.currentChapter > 1) {
      state.currentChapter -= 1;
      state.query = "";
      els.searchInput.value = "";
      hideMarkMenu();
      renderChapter();
    }
  };

  els.nextChapter.onclick = () => {
    if (state.currentChapter < book.chapterCount) {
      state.currentChapter += 1;
      state.query = "";
      els.searchInput.value = "";
      hideMarkMenu();
      renderChapter();
    }
  };

  renderNoteList();
  renderHighlightList();
  renderContextList();
  setupResponsiveNoteLayout();
  renderChapter();

  const firstNote = Object.keys(book.notes || {})[0];
  if (firstNote) showNote(firstNote, false);
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
    return (
      '<article class="verse" id="v-' + chapter.number + "-" + verse.number + '">' +
      '<div class="verse-num">' + verse.number + "</div>" +
      '<div class="verse-text">' + html + "</div>" +
      "</article>"
    );
  }).join("");

  els.chapterButtons.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.chapter) === state.currentChapter);
  });

  els.prevChapter.disabled = state.currentChapter === 1;
  els.nextChapter.disabled = state.currentChapter === book.chapterCount;

  bindFootnoteButtons();
  bindContextButtons();
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

function bindFootnoteButtons() {
  els.verses.querySelectorAll(".fn").forEach((button) => {
    button.addEventListener("click", () => showNote(button.dataset.note, true));
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
      "<strong>" + escapeHTML(title) + "</strong>" +
      "<span>" + escapeHTML(preview) + "</span>" +
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

function renderHighlightList() {
  if (!els.highlightList || !els.highlightCount) return;

  const allItems = getHighlightItems();
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
        '<div class="highlight-picked">' + escapeHTML(item.text) + '</div>' +
        '<div class="highlight-excerpt">' + escapeHTML(excerpt) + '</div>' +
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
        '<strong>' + escapeHTML(title) + '</strong>' +
        (refs ? '<em>' + escapeHTML(refs) + '</em>' : '') +
        '<small>' + escapeHTML(preview || "설명 내용 없음") + '</small>' +
      '</button>'
    );
  }).join("");

  els.contextList.querySelectorAll(".context-item").forEach((button) => {
    button.addEventListener("click", () => showContext(button.dataset.context, true));
  });
}

function renderContextParagraph(title, body) {
  if (!body) return "";
  return '<div class="context-section"><h4>' + escapeHTML(title) + '</h4><p>' + mdInlineToHTML(body) + '</p></div>';
}

function renderContextSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return "";
  return '<div class="context-section context-sources"><h4>출처/근거</h4>' +
    sources.map((source) => {
      if (typeof source === "string") return '<p>' + escapeHTML(source) + '</p>';
      const title = source.title || source.name || source.url || "출처";
      const note = source.note ? ' — ' + source.note : '';
      return '<p><strong>' + escapeHTML(title) + '</strong>' + escapeHTML(note) + '</p>';
    }).join("") +
    '</div>';
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
      '<h3>' + escapeHTML(title) + '</h3>' +
      (categories.length ? '<div class="context-chips">' + categories.map((cat) => '<b>' + escapeHTML(cat) + '</b>').join("") + '</div>' : '') +
    '</div>' +
    renderContextParagraph("무엇인가", item.summary || item.definition || item.description) +
    renderContextParagraph("당시 상황", item.ancientContext || item.ancient_context) +
    renderContextParagraph("본문에서의 의미", item.textFunction || item.inText || item.biblicalContext || item.biblical_context) +
    renderContextParagraph("현대 독자의 오독 주의", item.avoidModernReading || item.avoid_modern_reading || item.warning) +
    (item.body || item.text ? renderContextParagraph("추가 설명", item.body || item.text) : "") +
    renderContextSources(item.sources);

  renderContextList();

  if (scrollToPanel && window.innerWidth < 1280) {
    const rail = document.querySelector(".right-rail");
    if (rail) rail.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function bindContextButtons() {
  els.verses.querySelectorAll(".ctx-link").forEach((button) => {
    button.addEventListener("click", () => showContext(button.dataset.context, true));
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

  if (scrollToPanel && window.innerWidth < 1280) {
    if (isMobileReaderLayout()) {
      closeMobileGlossary();
      const note = document.querySelector(".active-note");
      if (note) note.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
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
  if (!anchorEl || !focusEl || !els.verses.contains(anchorEl) || !els.verses.contains(focusEl)) return null;

  const startArticle = anchorEl.closest(".verse, .search-hit");
  const endArticle = focusEl.closest(".verse, .search-hit");
  if (!startArticle || !endArticle || startArticle !== endArticle) return null;

  const meta = parseVerseMeta(startArticle);
  if (!meta) return null;

  const anchorMark = anchorEl.closest(".user-mark");
  const focusMark = focusEl.closest(".user-mark");
  const isSameExistingMark = Boolean(anchorMark && focusMark && anchorMark === focusMark);
  const text = isSameExistingMark ? normalizeHighlightText(anchorMark.textContent) : selectedText;
  const markBookId = meta.bookId || state.currentBookId;
  const mode = isSameExistingMark || hasVerseHighlight(markBookId, meta.chapter, meta.verse, text) ? "delete" : "mark";

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || rect.width === 0) return null;

  return {
    bookId: markBookId,
    chapter: meta.chapter,
    verse: meta.verse,
    text,
    mode,
    rect
  };
}

function getMarkMenu() {
  let menu = document.getElementById("markMenu");
  if (menu) return menu;

  menu = document.createElement("div");
  menu.id = "markMenu";
  menu.className = "mark-menu";
  menu.innerHTML = '<button type="button" class="mark-menu-btn" title="형광펜 마킹">m</button>';
  document.body.appendChild(menu);

  menu.querySelector(".mark-menu-btn").addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  menu.querySelector(".mark-menu-btn").addEventListener("click", () => {
    applyPendingMarkAction();
  });

  return menu;
}

function showMarkMenu(context) {
  const menu = getMarkMenu();
  const button = menu.querySelector(".mark-menu-btn");
  state.pendingMark = context;

  const isDelete = context.mode === "delete";
  button.textContent = isDelete ? "d" : "m";
  button.title = isDelete ? "형광펜 마킹 취소" : "형광펜 마킹";
  menu.classList.toggle("delete-mode", isDelete);

  const top = window.scrollY + context.rect.top - 42;
  const left = window.scrollX + context.rect.left + context.rect.width / 2;

  menu.style.top = Math.max(window.scrollY + 8, top) + "px";
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
    const target = document.getElementById("v-" + context.chapter + "-" + context.verse) ||
      document.getElementById("search-" + context.bookId + "-" + context.chapter + "-" + context.verse);
    if (target) target.classList.add(context.mode === "delete" ? "mark-remove-flash" : "mark-flash");
  }
}

function bindSelectionMarker() {
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) hideMarkMenu();
  });

  document.addEventListener("mouseup", () => {
    setTimeout(() => {
      const context = getSelectionContext();
      if (context) showMarkMenu(context);
      else hideMarkMenu();
    }, 0);
  });

  document.addEventListener("touchend", () => {
    setTimeout(() => {
      const context = getSelectionContext();
      if (context) showMarkMenu(context);
    }, 80);
  });

  document.addEventListener("scroll", () => hideMarkMenu(), true);
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
  window.addEventListener("resize", () => setupResponsiveNoteLayout());
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
    bindContextTabs();
    await selectBook(state.manifest.books[0].id, 1);
  } catch (error) {
    console.error(error);
    els.bookTitle.textContent = "로딩 실패";
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
