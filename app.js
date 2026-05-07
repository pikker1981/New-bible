// 신약 현대어 번역 웹앱
// 권 선택 + 장 선택 + 오른쪽 설명 리스트 복구 버전

const state = {
  manifest: null,
  books: {},
  currentBookId: null,
  currentChapter: 1,
  query: "",
  currentNoteId: null
};

const els = {
  totalBookStat: document.getElementById("totalBookStat"),
  bookCount: document.getElementById("bookCount"),
  bookList: document.getElementById("bookList"),
  bookTitle: document.getElementById("bookTitle"),
  bookDesc: document.getElementById("bookDesc"),
  readerKicker: document.getElementById("readerKicker"),
  chapterStat: document.getElementById("chapterStat"),
  verseStat: document.getElementById("verseStat"),
  chapterButtons: document.getElementById("chapterButtons"),
  prevChapter: document.getElementById("prevChapter"),
  nextChapter: document.getElementById("nextChapter"),
  chapterTitle: document.getElementById("chapterTitle"),
  verses: document.getElementById("verses"),
  noteTitle: document.getElementById("noteTitle"),
  noteBody: document.getElementById("noteBody"),
  noteList: document.getElementById("noteList"),
  noteCount: document.getElementById("noteCount"),
  searchInput: document.getElementById("searchInput"),
  searchMeta: document.getElementById("searchMeta")
};

async function loadJSON(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(path + " 파일을 불러오지 못했습니다. HTTP " + response.status);
  }
  return await response.json();
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mdInlineToHTML(text) {
  let html = escapeHTML(text || "");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[\^([^\]]+)\]/g, function (_, noteId) {
    const safeId = escapeHTML(noteId);
    return '<button class="fn" type="button" data-note="' + safeId + '" title="설명 보기">' + safeId + "</button>";
  });
  return html;
}

function plainFromNote(note) {
  return String(note || "")
    .replace(/\*\*/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function noteTitleFromText(noteId, note) {
  const text = plainFromNote(note);
  const m = text.match(/^([^—-]+)[—-]/);
  if (m && m[1]) return m[1].trim();
  return noteId;
}

function highlightHTML(html, query) {
  const q = query.trim();
  if (!q) return html;

  const parts = html.split(/(<[^>]+>)/g);
  const pattern = new RegExp("(" + escapeRegExp(q) + ")", "gi");

  return parts.map(function (part) {
    if (part.startsWith("<") && part.endsWith(">")) return part;
    return part.replace(pattern, "<mark>$1</mark>");
  }).join("");
}

function renderBookList() {
  if (!state.manifest || !els.bookList) return;

  els.bookCount.textContent = state.manifest.updatedBooks + " / " + state.manifest.totalTargetBooks;
  if (els.totalBookStat) {
    els.totalBookStat.innerHTML = state.manifest.updatedBooks + '<span class="u">권</span>';
  }

  els.bookList.innerHTML = state.manifest.books.map(function (book) {
    const active = book.id === state.currentBookId ? " active" : "";
    const order = String(book.order).padStart(2, "0");
    return (
      '<button class="book-btn' + active + '" type="button" data-book="' + book.id + '">' +
        "<span>" + order + " " + book.bookKo + "</span>" +
        "<small>" + book.chapterCount + "장</small>" +
      "</button>"
    );
  }).join("");

  els.bookList.querySelectorAll(".book-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      selectBook(button.dataset.book, 1);
    });
  });
}

async function ensureBook(bookId) {
  if (state.books[bookId]) return state.books[bookId];

  const meta = state.manifest.books.find(function (book) {
    return book.id === bookId;
  });

  if (!meta) {
    throw new Error("권 정보를 찾지 못했습니다: " + bookId);
  }

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

  els.chapterButtons.innerHTML = book.chapters.map(function (chapter) {
    const active = chapter.number === state.currentChapter ? " active" : "";
    return '<button class="' + active + '" type="button" data-chapter="' + chapter.number + '">' + chapter.number + "</button>";
  }).join("");

  els.chapterButtons.querySelectorAll("button").forEach(function (button) {
    button.addEventListener("click", function () {
      state.currentChapter = Number(button.dataset.chapter);
      renderChapter();
    });
  });

  els.prevChapter.onclick = function () {
    if (state.currentChapter > 1) {
      state.currentChapter -= 1;
      renderChapter();
    }
  };

  els.nextChapter.onclick = function () {
    if (state.currentChapter < book.chapterCount) {
      state.currentChapter += 1;
      renderChapter();
    }
  };

  renderNoteList();
  renderChapter();

  if (!state.currentNoteId) {
    const firstNote = Object.keys(book.notes || {})[0];
    if (firstNote) showNote(firstNote, false);
  }
}

function renderChapter() {
  const book = state.books[state.currentBookId];
  if (!book) return;

  const chapter = book.chapters.find(function (item) {
    return item.number === state.currentChapter;
  });

  if (!chapter) {
    els.verses.innerHTML = '<p class="empty">장을 찾지 못했습니다.</p>';
    return;
  }

  els.chapterTitle.textContent = book.bookKo + " " + chapter.number + "장";

  const query = state.query.trim();

  els.verses.innerHTML = chapter.verses.map(function (verse) {
    let html = mdInlineToHTML(verse.text);
    html = highlightHTML(html, query);

    return (
      '<article class="verse" id="v-' + chapter.number + "-" + verse.number + '">' +
        '<div class="verse-num">' + verse.number + "</div>" +
        '<div class="verse-text">' + html + "</div>" +
      "</article>"
    );
  }).join("");

  els.chapterButtons.querySelectorAll("button").forEach(function (button) {
    button.classList.toggle("active", Number(button.dataset.chapter) === state.currentChapter);
  });

  els.prevChapter.disabled = state.currentChapter === 1;
  els.nextChapter.disabled = state.currentChapter === book.chapterCount;

  els.verses.querySelectorAll(".fn").forEach(function (button) {
    button.addEventListener("click", function () {
      showNote(button.dataset.note, true);
    });
  });

  updateSearchMeta();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderNoteList() {
  const book = state.books[state.currentBookId];
  const notes = book.notes || {};
  const ids = Object.keys(notes);

  els.noteCount.textContent = ids.length;

  els.noteList.innerHTML = ids.map(function (id) {
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

  els.noteList.querySelectorAll(".note-item").forEach(function (button) {
    button.addEventListener("click", function () {
      showNote(button.dataset.note, true);
    });
  });
}

function showNote(noteId, scrollToPanel) {
  const book = state.books[state.currentBookId];
  const raw = book && book.notes ? book.notes[noteId] : null;

  state.currentNoteId = noteId;

  const title = raw ? noteTitleFromText(noteId, raw) : noteId;
  els.noteTitle.textContent = title || "설명";
  els.noteBody.innerHTML = raw ? mdInlineToHTML(raw) : "설명을 찾지 못했습니다.";

  els.noteList.querySelectorAll(".note-item").forEach(function (button) {
    button.classList.toggle("active", button.dataset.note === noteId);
  });

  if (scrollToPanel && window.innerWidth < 1280) {
    document.querySelector(".right-rail").scrollIntoView({ behavior: "smooth", block: "start" });
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

  book.chapters.forEach(function (chapter) {
    chapter.verses.forEach(function (verse) {
      if (verse.text.includes(query)) count += 1;
    });
  });

  els.searchMeta.textContent = book.bookKo + "에서 " + count + "개 절이 검색어를 포함합니다. 현재 장에는 노란색으로 표시됩니다.";
}

if (els.searchInput) {
  els.searchInput.addEventListener("input", function (event) {
    state.query = event.target.value;
    renderChapter();
  });
}

async function init() {
  try {
    state.manifest = await loadJSON("./data/manifest.json");

    if (!state.manifest.books || state.manifest.books.length === 0) {
      throw new Error("manifest.json에 books 정보가 없습니다.");
    }

    const firstBookId = state.manifest.books[0].id;
    await selectBook(firstBookId, 1);
  } catch (error) {
    console.error(error);

    if (els.verses) {
      els.verses.innerHTML =
        '<div class="error-box">' +
        "<strong>데이터를 불러오지 못했습니다.</strong><br>" +
        escapeHTML(error.message) +
        "<br><br>로컬에서 확인할 때는 index.html을 직접 열지 말고, 터미널에서 <code>python -m http.server 8000</code> 실행 후 접속하세요." +
        "</div>";
    }

    if (els.searchMeta) {
      els.searchMeta.textContent = "데이터 로딩 실패";
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
