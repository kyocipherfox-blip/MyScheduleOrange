import { INTERVALS, END_MIN, PX_PER_MIN } from './config.js';
import { fmtTime, minToY, minToTimeStr, timeStrToMin, clamp, snapMin,
         strToDate, dateToStr, addDays } from './utils.js';
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
    snapMin(drag.origEnd + (e.clientY - drag.startY) / (PX_PER_MIN * state.zoomLevel), state.intervalIdx),
    ev.startMin + INTERVALS[state.intervalIdx],
    END_MIN
  );
  drag.newEnd = newEnd;
  const el = document.querySelector(`.event-block[data-id="${drag.id}"]`);
  if (el) {
    el.style.height = Math.max(16, (newEnd - ev.startMin) * PX_PER_MIN) + 'px';
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
  el.style.height = Math.max(16, (ev.endMin - ev.startMin) * PX_PER_MIN) + 'px';

  const content = document.createElement('div');
  content.className = 'event-content';
  const nameEl = document.createElement('span');
  nameEl.className = 'event-name';
  nameEl.textContent = (ev.recurringId ? '↻ ' : '') + ev.name;
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

  if (ev.recurringId) {
    const siblings = state.events.filter(e => e.recurringId === ev.recurringId);
    if (siblings.length > 1) {
      const deleteAll = confirm(
        `繰り返し予定が ${siblings.length} 件あります。\n\nOK → すべての繰り返しを削除\nキャンセル → この予定のみ削除`
      );
      if (deleteAll) {
        const dates = [...new Set(siblings.map(e => e.date))];
        state.events = state.events.filter(e => e.recurringId !== ev.recurringId);
        saveData();
        dates.forEach(d => renderCol(d));
        return;
      }
    }
  }

  state.events = state.events.filter(e => e.id !== id);
  saveData();
  renderCol(ev.date);
}

/* ── Recurring event generation ── */
export function generateRecurringEvents(base, recur, endDateStr, weekdays) {
  const recurringId = 'recur_' + Date.now();
  const instances = [];
  const endDate = strToDate(endDateStr);
  const baseDate = strToDate(base.date);

  let cur = new Date(baseDate);
  while (cur <= endDate) {
    const dow = cur.getDay();
    let include = false;
    if (recur === 'daily')   include = true;
    else if (recur === 'weekday') include = dow >= 1 && dow <= 5;
    else if (recur === 'weekly')  include = weekdays.includes(dow);
    else if (recur === 'monthly') include = cur.getDate() === baseDate.getDate();
    if (include) {
      instances.push({
        id: state.nextId++,
        date: dateToStr(cur),
        startMin: base.startMin,
        endMin: base.endMin,
        name: base.name,
        category: base.category,
        recurringId
      });
    }
    cur = addDays(cur, 1);
  }
  return instances;
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

  // 繰り返しセクション：常時表示。「なし」で初期化
  document.getElementById('eventRecur').value = 'none';
  document.getElementById('recurEndRow').style.display = 'none';
  document.getElementById('recurWeekdaysRow').style.display = 'none';
  // デフォルト終了日：1ヶ月後
  document.getElementById('recurEndDate').value = dateToStr(addDays(d, 30));
  // 毎週のデフォルト曜日：対象日の曜日
  document.querySelectorAll('input[name="recurDay"]').forEach(cb => {
    cb.checked = String(d.getDay()) === cb.value;
  });

  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('eventName').focus();
}

export function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  modalState = null;
}

export function handleModalSave(onSaved) {
  const name  = document.getElementById('eventName').value.trim();
  const cat   = document.getElementById('eventCategory').value;
  const start = timeStrToMin(document.getElementById('eventStart').value);
  const end   = timeStrToMin(document.getElementById('eventEnd').value);
  if (!name) { document.getElementById('eventName').focus(); return; }
  if (end <= start) { alert('終了時間は開始時間より後にしてください'); return; }

  const recur = document.getElementById('eventRecur').value;

  if (recur !== 'none') {
    // 繰り返し設定あり：バリデーション → 元イベント削除 → 新シリーズ生成
    const endDateStr = document.getElementById('recurEndDate').value;
    if (!endDateStr) { alert('繰り返し終了日を入力してください'); return; }
    if (endDateStr < modalState.dateStr) { alert('終了日は開始日以降を指定してください'); return; }

    let weekdays = [];
    if (recur === 'weekly') {
      weekdays = [...document.querySelectorAll('input[name="recurDay"]:checked')]
                  .map(cb => Number(cb.value));
      if (weekdays.length === 0) { alert('繰り返す曜日を1つ以上選択してください'); return; }
    }

    // 編集中の既存イベントを削除（新規追加時は何もしない）
    if (modalState.editId) {
      state.events = state.events.filter(e => e.id !== modalState.editId);
    }

    const base = { date: modalState.dateStr, startMin: start, endMin: end, name, category: cat };
    const instances = generateRecurringEvents(base, recur, endDateStr, weekdays);
    state.events.push(...instances);
    saveData();
    onSaved();
  } else if (modalState.editId) {
    // 編集・繰り返しなし：対象1件のみ更新
    const ev = state.events.find(e => e.id === modalState.editId);
    if (ev) { ev.name = name; ev.category = cat; ev.startMin = start; ev.endMin = end; }
    saveData();
    renderCol(modalState.dateStr);
  } else {
    // 新規追加・繰り返しなし
    state.events.push({
      id: state.nextId++, date: modalState.dateStr,
      startMin: start, endMin: end, name, category: cat
    });
    saveData();
    renderCol(modalState.dateStr);
  }
  closeModal();
}
