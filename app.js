const BOOK_ACCENTS = {
  matthew: "#C0392B",
  mark: "#2563EB",
  luke: "#16A34A",
  john: "#7C3AED",
  acts: "#D97706",
  romans: "#DC2626",
  "1corinthians": "#0891B2",
  "2corinthians": "#4F46E5",
  galatians: "#65A30D",
  ephesians: "#9333EA",
  philippians: "#0D9488",
  colossians: "#EA580C",
  "1thessalonians": "#0284C7",
  "2thessalonians": "#BE123C",
  "1timothy": "#7C2D12",
  "2timothy": "#4338CA",
  titus: "#15803D",
  philemon: "#A21CAF",
  hebrews: "#B45309",
  james: "#047857",
  "1peter": "#1D4ED8",
  "2peter": "#6D28D9",
  "1john": "#0F766E",
  "2john": "#B91C1C",
  "3john": "#0369A1",
  jude: "#92400E",
  revelation: "#111827"
};

const state = {
  manifest: null,
  books: {},
  currentBookId: null,
  currentChapter: 1,
  query: "",
  currentNoteId: null,
  highlights: loadHighlights(),
  pendingMark: null
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

function addVerseHighlight(bookId, chapter, verse, text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return false;

  const key = highlightKey(bookId, chapter, verse);
  const list = state.highlights[key] || [];
  if (!list.includes(clean)) list.push(clean);
  state.highlights[key] = list;
  saveHighlights();
  return true;
}

function applyBookAccent(bookId) {
  const color = BOOK_ACCENTS[bookId] || "#C0392B";
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
  els.bookCount.textContent = state.manifest.updatedBooks + " / " + state.manifest.totalTargetBooks;
  els.totalBookStat.innerHTML = state.manifest.updatedBooks + '<span class="u">권</span>';

  els.bookList.innerHTML = books.map((book) => {
    const active = book.id === state.currentBookId ? " active" : "";
    const order = String(book.order).padStart(2, "0");
    const color = BOOK_ACCENTS[book.id] || "#C0392B";
    return (
      '<button class="book-btn' + active + '" type="button" data-book="' + book.id + '" style="--book-accent:' + color + '">' +
      "<span>" + order + " " + escapeHTML(book.bookKo) + "</span>" +
      "<small>" + book.chapterCount + "장</small>" +
      "</button>"
    );
  }).join("");

  els.bookList.querySelectorAll(".book-btn").forEach((button) => {
    button.addEventListener("click", () => selectBook(button.dataset.book, 1));
  });
}

async function ensureBook(bookId) {
  if (state.books[bookId]) return state.books[bookId];
  const meta = state.manifest.books.find((book) => book.id === bookId);
  if (!meta) throw new Error("권 정보를 찾지 못했습니다: " + bookId);
  const book = await loadJSON(meta.data);
  state.books[bookId] = book;
  return book;
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
  renderChapter();

  const firstNote = Object.keys(book.notes || {})[0];
  if (firstNote) showNote(firstNote, false);
}

function renderChapter() {
  const book = state.books[state.currentBookId];
  if (!book) return;

  const query = state.query.trim();
  if (query) {
    renderSearchResults(book, query);
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

function renderSearchResults(book, query) {
  const results = [];
  book.chapters.forEach((chapter) => {
    chapter.verses.forEach((verse) => {
      if (verse.text.includes(query)) {
        results.push({ chapter: chapter.number, verse: verse.number, text: verse.text });
      }
    });
  });

  els.chapterTitle.textContent = "검색 결과";
  els.chapterButtons.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
  els.prevChapter.disabled = true;
  els.nextChapter.disabled = true;

  if (results.length === 0) {
    els.verses.innerHTML =
      '<div class="search-result-head"><strong>' + escapeHTML(query) + '</strong> 검색 결과가 없습니다.</div>' +
      '<p class="empty">띄어쓰기나 표현을 조금 바꿔 다시 검색해 보세요.</p>';
    updateSearchMeta();
    return;
  }

  els.verses.innerHTML =
    '<div class="search-result-head"><strong>' + escapeHTML(query) + '</strong> 검색 결과 ' + results.length + '개</div>' +
    results.map((item) => {
      let html = mdInlineToHTML(item.text);
      html = applyUserHighlights(html, book.id, item.chapter, item.verse);
      html = highlightHTML(html, query);
      return (
        '<article class="search-hit" id="search-' + item.chapter + '-' + item.verse + '">' +
        '<div class="search-ref">' + book.bookKo + '<br>' + item.chapter + ':' + item.verse + '</div>' +
        '<div class="verse-text">' + html + '</div>' +
        '</article>'
      );
    }).join("");

  bindFootnoteButtons();
  updateSearchMeta();
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
  els.noteList.innerHTML = ids.map((id) => {
    const title = noteTitleFromText(id, notes[id]);
    const preview = plainFromNote(notes[id]).slice(0, 76);
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
    const rail = document.querySelector(".right-rail");
    if (rail) rail.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function updateSearchMeta() {
  const query = state.query.trim();
  if (!query) {
    els.searchMeta.textContent = "검색어를 입력하세요.";
    return;
  }

  const book = state.books[state.currentBookId];
  let count = 0;
  book.chapters.forEach((chapter) => {
    chapter.verses.forEach((verse) => {
      if (verse.text.includes(query)) count += 1;
    });
  });

  els.searchMeta.textContent = book.bookKo + " 전체에서 " + count + "개 절이 검색어를 포함합니다.";
}

function getElementFromNode(node) {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function parseVerseMeta(article) {
  if (!article || !article.id) return null;
  const match = article.id.match(/^(?:v|search)-(\d+)-(\d+)$/);
  if (!match) return null;
  return {
    chapter: Number(match[1]),
    verse: Number(match[2])
  };
}

function getSelectionContext() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const text = selection.toString().replace(/\s+/g, " ").trim();
  if (!text || text.length < 2) return null;

  const anchorEl = getElementFromNode(selection.anchorNode);
  const focusEl = getElementFromNode(selection.focusNode);
  if (!anchorEl || !focusEl || !els.verses.contains(anchorEl) || !els.verses.contains(focusEl)) return null;

  const startArticle = anchorEl.closest(".verse, .search-hit");
  const endArticle = focusEl.closest(".verse, .search-hit");
  if (!startArticle || !endArticle || startArticle !== endArticle) return null;

  const meta = parseVerseMeta(startArticle);
  if (!meta) return null;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || rect.width === 0) return null;

  return {
    bookId: state.currentBookId,
    chapter: meta.chapter,
    verse: meta.verse,
    text,
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
    applyPendingMark();
  });

  return menu;
}

function showMarkMenu(context) {
  const menu = getMarkMenu();
  state.pendingMark = context;

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

function applyPendingMark() {
  const context = state.pendingMark;
  if (!context) return;

  const added = addVerseHighlight(context.bookId, context.chapter, context.verse, context.text);
  hideMarkMenu();
  window.getSelection()?.removeAllRanges();

  if (added) {
    renderChapter();
    const target = document.getElementById("v-" + context.chapter + "-" + context.verse) ||
      document.getElementById("search-" + context.chapter + "-" + context.verse);
    if (target) target.classList.add("mark-flash");
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
