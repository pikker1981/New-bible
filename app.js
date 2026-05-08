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
  romans: "롬", "1corinthians": "고", "2corinthians": "고",
  galatians: "갈", ephesians: "엡", philippians: "빌", colossians: "골",
  "1thessalonians": "살", "2thessalonians": "살",
  "1timothy": "딤", "2timothy": "딤", titus: "딛", philemon: "몬",
  hebrews: "히", james: "약", "1peter": "벧", "2peter": "벧",
  "1john": "요", "2john": "요", "3john": "요", jude: "유", revelation: "계"
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
  searchInput: $("searchInput"),
  searchMeta: $("searchMeta")
};

async function loadJSON(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(path + " 로딩 실패: HTTP " + response.status);
  return response.json();
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
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[\^([^\]]+)\]/g, function (_, noteId) {
    const safeId = escapeHTML(noteId);
    return '<button class="fn" type="button" data-note="' + safeId + '" title="설명 보기">' + safeId + "</button>";
  });
  return html;
}

function plainFromNote(note) {
  return String(note || "").replace(/\*\*/g, "").replace(/<[^>]+>/g, "").trim();
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
  updateSearchMeta();
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
    const target = document.getElementById("v-" + context.chapter + "-" + context.verse) ||
      document.getElementById("search-" + context.chapter + "-" + context.verse);
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
    bindResponsiveNoteLayout();
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
