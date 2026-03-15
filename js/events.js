import { INTERVALS, END_MIN } from './config.js';
import { fmtTime, minToY, minToTimeStr, timeStrToMin, clamp, snapMin, strToDate, dateToStr } from './utils.js';
import { state, saveData } from './store.js';
import { buildCategorySelect } from './categories.js';
import { DAY_JP } from './config.js';

/* ── Resize drag ── */
let drag = null;
export let recentlyResized = false;

function startResize(e, id) {
  e.preventDefault(); e.stopPropagation();
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  drag = { id, startY: e.clientY, origEnd: ev.endMin, newEnd: null };
  document.body.classList.add('dragging');
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup',   onResizeUp);
}

function onResizeMove(e) {
  if (!drag) return;
  const ev = state.events.find(e => e.id === drag.id);
  if (!ev) return;
  const newEnd = clamp(
    snapMin(drag.origEnd + (e.clientY - drag.startY) / 1.2, state.intervalIdx),
    ev.startMin + INTERVALS[state.intervalIdx],
    END_MIN
  );
  drag.newEnd = newEnd;
  const el = document.querySelector(`.event-block[data-id="${drag.id}"]`);
  if (el) {
    el.style.height = Math.max(16, (newEnd - ev.startMin) * 1.2) + 'px';
    const t = el.querySelector('.event-time-label');
    if (t) t.textContent = `${fmtTime(ev.startMin)}〜${fmtTime(newEnd)}`;
  }
}

function onResizeUp() {
  if (drag?.newEnd != null) {
    const ev = state.events.find(e => e.id === drag.id);
    if (ev) { ev.endMin = drag.newEnd; saveData(); renderCol(ev.date); }
  }
  drag = null;
  recentlyResized = true;
  setTimeout(() => recentlyResized = false, 50);
  document.body.classList.remove('dragging');
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup',   onResizeUp);
}

/* ── Event element ── */
export function createEventEl(ev) {
  const el = document.createElement('div');
  el.className = `event-block ${ev.category}`;
  el.dataset.id = ev.id;
  el.style.top    = minToY(ev.startMin) + 'px';
  el.style.height = Math.max(16, (ev.endMin - ev.startMin) * 1.2) + 'px';

  const content = document.createElement('div');
  content.className = 'event-content';
  const nameEl = document.createElement('span');
  nameEl.className = 'event-name';
  nameEl.textContent = ev.name;
  const timeEl = document.createElement('span');
  timeEl.className = 'event-time-label';
  timeEl.textContent = `${fmtTime(ev.startMin)}〜${fmtTime(ev.endMin)}`;
  content.append(nameEl, timeEl);

  const delBtn = document.createElement('button');
  delBtn.className = 'event-del';
  delBtn.textContent = '×';
  delBtn.addEventListener('click', e => { e.stopPropagation(); deleteEvent(ev.id); });

  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.addEventListener('mousedown', e => startResize(e, ev.id));

  el.append(content, delBtn, handle);

  el.addEventListener('dblclick', e => {
    e.stopPropagation();
    openModal(ev.date, ev.startMin, ev.endMin, ev.id);
  });

  return el;
}

export function renderCol(dateStr) {
  const div = document.querySelector(`.day-col[data-date="${dateStr}"]`);
  if (!div) return;
  div.querySelectorAll('.event-block').forEach(el => el.remove());
  state.events.filter(ev => ev.date === dateStr)
              .forEach(ev => div.appendChild(createEventEl(ev)));
}

export function renderAll(dates) {
  dates.forEach(d => renderCol(dateToStr(d)));
}

export function deleteEvent(id) {
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  state.events = state.events.filter(e => e.id !== id);
  saveData();
  renderCol(ev.date);
}

/* ── Event modal ── */
let modalState = null;

export function openModal(dateStr, defaultStart, defaultEnd, editId = null) {
  const ev = editId ? state.events.find(e => e.id === editId) : null;
  modalState = { dateStr, editId };
  const d = strToDate(dateStr);
  const label = `${d.getMonth()+1}/${d.getDate()}（${DAY_JP[d.getDay()]}）`;
  document.getElementById('modalTitle').textContent =
    editId ? `予定を編集（${label}）` : `予定を追加（${label}）`;
  document.getElementById('eventName').value = ev?.name ?? '';
  buildCategorySelect(ev?.category ?? state.categories[0]?.id);
  document.getElementById('eventStart').value = minToTimeStr(ev ? ev.startMin : defaultStart);
  document.getElementById('eventEnd').value   = minToTimeStr(ev ? ev.endMin   : defaultEnd);
  document.getElementById('modalSaveBtn').textContent = editId ? '保存' : '追加';
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('eventName').focus();
}

export function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  modalState = null;
}

export function handleModalSave() {
  const name  = document.getElementById('eventName').value.trim();
  const cat   = document.getElementById('eventCategory').value;
  const start = timeStrToMin(document.getElementById('eventStart').value);
  const end   = timeStrToMin(document.getElementById('eventEnd').value);
  if (!name) { document.getElementById('eventName').focus(); return; }
  if (end <= start) { alert('終了時間は開始時間より後にしてください'); return; }

  if (modalState.editId) {
    const ev = state.events.find(e => e.id === modalState.editId);
    if (ev) { ev.name = name; ev.category = cat; ev.startMin = start; ev.endMin = end; }
  } else {
    state.events.push({
      id: state.nextId++, date: modalState.dateStr,
      startMin: start, endMin: end, name, category: cat
    });
  }
  saveData();
  renderCol(modalState.dateStr);
  closeModal();
}
