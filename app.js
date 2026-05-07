
const state = { data:null, chapter:1, query:'', selectedNote:null };

const $ = (sel) => document.querySelector(sel);

function escapeHtml(str){
  return String(str).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function highlight(text, query){
  let safe = escapeHtml(text);
  if(!query.trim()) return safe;
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(q, 'gi'), m => `<span class="mark">${m}</span>`);
}

function makeVerseText(verse){
  let text = highlight(verse.text, state.query);
  if(verse.refs && verse.refs.length){
    const chips = verse.refs.map(id => `<button class="note-chip" data-note="${escapeHtml(id)}" title="설명 보기">${escapeHtml(id.split('-')[0].slice(0,2).toUpperCase())}</button>`).join('');
    text += ' ' + chips;
  }
  return text;
}

async function init(){
  const res = await fetch('data/matthew.json');
  state.data = await res.json();
  $('#statChapters').textContent = state.data.stats.chapters;
  $('#statVerses').textContent = state.data.stats.verses;
  $('#statNotes').textContent = state.data.stats.notes;
  buildNav();
  buildNoteList();
  bindEvents();
  render();
}

function buildNav(){
  const nav = $('#chapterNav');
  nav.innerHTML = state.data.chapters.map(ch => `<button class="chapter-btn" data-chapter="${ch.chapter}">${ch.chapter}</button>`).join('');
}

function buildNoteList(){
  const list = $('#noteList');
  list.innerHTML = state.data.noteItems.map(item => {
    const title = escapeHtml(item.text.split('—')[0].trim());
    return `<button class="note-item" data-note="${escapeHtml(item.id)}"><strong>${title}</strong><br>${escapeHtml(item.text.slice(0,80))}${item.text.length>80?'…':''}</button>`;
  }).join('');
}

function bindEvents(){
  $('#chapterNav').addEventListener('click', e => {
    const btn = e.target.closest('[data-chapter]');
    if(!btn) return;
    state.chapter = Number(btn.dataset.chapter);
    state.query = '';
    $('#searchInput').value = '';
    render();
    window.scrollTo({top:0, behavior:'smooth'});
  });
  $('#prevChapter').addEventListener('click', () => { if(state.chapter>1){state.chapter--; render(); window.scrollTo({top:0, behavior:'smooth'});} });
  $('#nextChapter').addEventListener('click', () => { if(state.chapter<state.data.stats.chapters){state.chapter++; render(); window.scrollTo({top:0, behavior:'smooth'});} });
  $('#searchInput').addEventListener('input', e => { state.query = e.target.value; renderVerses(); });
  document.body.addEventListener('click', e => {
    const note = e.target.closest('[data-note]');
    if(note){ showNote(note.dataset.note); }
  });
}

function render(){
  document.querySelectorAll('.chapter-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.chapter) === state.chapter));
  $('#readerTitle').textContent = `마태복음 ${state.chapter}장`;
  $('#readerDesc').textContent = `${state.chapter}장 본문을 읽고 있습니다. 붉은 설명 표시는 클릭할 수 있습니다.`;
  $('#prevChapter').disabled = state.chapter <= 1;
  $('#nextChapter').disabled = state.chapter >= state.data.stats.chapters;
  renderFeatured();
  renderVerses();
}

function currentChapter(){ return state.data.chapters.find(ch => ch.chapter === state.chapter); }

function renderFeatured(){
  const ch = currentChapter();
  const verse = ch.verses[0];
  $('#featuredVerse').innerHTML = `
    <div class="quote-mark">"</div>
    <div class="q-text">${escapeHtml(verse.text)}</div>
    <div class="q-src">— 마태복음 ${state.chapter}:${verse.verse}</div>
  `;
}

function renderVerses(){
  const ch = currentChapter();
  const q = state.query.trim();
  let verses = ch.verses;
  if(q){
    const lower = q.toLowerCase();
    verses = state.data.chapters.flatMap(c => c.verses.map(v => ({...v, chapter:c.chapter}))).filter(v => {
      const noteText = (v.refs || []).map(id => state.data.notes[id] || '').join(' ');
      return (v.text + ' ' + noteText).toLowerCase().includes(lower);
    });
  }
  const heading = q ? `<div class="chapter-heading"><div class="num">검색</div><div class="label">${verses.length} RESULTS</div></div>` : `<div class="chapter-heading"><div class="num">${state.chapter}</div><div class="label">CHAPTER</div></div>`;
  if(!verses.length){
    $('#verseList').innerHTML = heading + `<div class="no-results">검색 결과가 없습니다. 다른 단어로 다시 검색해 보세요.</div>`;
    return;
  }
  $('#verseList').innerHTML = heading + verses.map(v => {
    const chNo = v.chapter || state.chapter;
    return `<article class="verse-card" id="v-${chNo}-${v.verse}"><div class="verse-no">${chNo}:${v.verse}</div><p class="verse-text">${makeVerseText(v)}</p></article>`;
  }).join('');
}

function showNote(id){
  const text = state.data.notes[id];
  if(!text) return;
  const [title, ...rest] = text.split('—');
  $('#noteContent').classList.remove('empty');
  $('#noteContent').innerHTML = `<div class="note-title">${escapeHtml(id)}</div><strong>${escapeHtml(title.trim())}</strong>${rest.length ? `<p style="margin-top:8px">${escapeHtml(rest.join('—').trim())}</p>` : ''}`;
}

init().catch(err => {
  console.error(err);
  document.body.innerHTML = '<main style="padding:32px;font-family:sans-serif">데이터를 불러오지 못했습니다. GitHub Pages 또는 로컬 서버에서 실행해 주세요.</main>';
});
