const state = {
  manifest: null,
  books: {},
  currentBookId: null,
  currentChapter: 1,
  query: "",
  currentNoteId: null
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

function highlightHTML(html, query) {
  const q = query.trim();
  if (!q) return html;
  const parts = html.split(/(<[^>]+>)/g);
  const pattern = new RegExp("(" + escapeRegExp(q) + ")", "gi");
  return parts.map((part) => {
    if (part.startsWith("<") && part.endsWith(">")) return part;
    return part.replace(pattern, "<mark>$1</mark>");
  }).join("");
}

function renderBookList() {
  const books = state.manifest.books || [];
  els.bookCount.textContent = state.manifest.updatedBooks + " / " + state.manifest.totalTargetBooks;
  els.totalBookStat.innerHTML = state.manifest.updatedBooks + '<span class="u">권</span>';

  els.bookList.innerHTML = books.map((book) => {
    const active = book.id === state.currentBookId ? " active" : "";
    const order = String(book.order).padStart(2, "0");
    return (
      '<button class="book-btn' + active + '" type="button" data-book="' + book.id + '">' +
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
  render();
}

function render() {
  const book = state.books[state.currentBookId];
  if (!book) return;

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
      renderChapter();
    });
  });

  els.prevChapter.onclick = () => {
    if (state.currentChapter > 1) {
      state.currentChapter -= 1;
      state.query = "";
      els.searchInput.value = "";
      renderChapter();
    }
  };

  els.nextChapter.onclick = () => {
    if (state.currentChapter < book.chapterCount) {
      state.currentChapter += 1;
      state.query = "";
      els.searchInput.value = "";
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
    const html = mdInlineToHTML(verse.text);
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

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderChapter();
});

async function init() {
  try {
    state.manifest = await loadJSON("./data/manifest.json");
    if (!state.manifest.books || state.manifest.books.length === 0) {
      throw new Error("manifest.json에 books 정보가 없습니다.");
    }
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
