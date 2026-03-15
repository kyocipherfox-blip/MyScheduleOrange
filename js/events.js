import { INTERVALS, END_MIN, PX_PER_MIN, START_MIN } from './config.js';
import { fmtTime, minToY, minToTimeStr, timeStrToMin, clamp, snapMin,
         strToDate, dateToStr, addDays, yToMin } from './utils.js';
import { state, saveData } from './store.js';
import { buildCategorySelect } from './categories.js';
import { DAY_JP } from './config.js';

/* ════════════════════════════════════════════
   Resize drag
════════════════════════════════════════════ */
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
    ev.startMin + INTERVALS[state.intervalIdx], END_MIN
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
  setRecentlyResized();
  document.body.classList.remove('dragging');
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup',   onResizeUp);
}

function setRecentlyResized() {
  recentlyResized = true;
  setTimeout(() => recentlyResized = false, 50);
}

/* ════════════════════════════════════════════
   Move drag (ドラッグ移動)
════════════════════════════════════════════ */
let moveDrag = null;

export function onEventMouseDown(e, evId) {
  if (e.target.closest('.resize-handle') || e.target.closest('.event-del')) return;
  e.preventDefault();
  const ev = state.events.find(x => x.id === evId);
  if (!ev) return;
  moveDrag = {
    id: evId,
    startX: e.clientX, startY: e.clientY,
    el: e.currentTarget,
    ghost: null,
    offsetX: 0, offsetY: 0,
    started: false,
    duration: ev.endMin - ev.startMin,
    origDate: ev.date,
    newDate: ev.date,
    newStartMin: ev.startMin
  };
  document.addEventListener('mousemove', onMoveMove);
  document.addEventListener('mouseup',   onMoveUp);
}

function onMoveMove(e) {
  if (!moveDrag) return;
  const dx = e.clientX - moveDrag.startX;
  const dy = e.clientY - moveDrag.startY;

  if (!moveDrag.started) {
    if (Math.sqrt(dx * dx + dy * dy) < 6) return;
    moveDrag.started = true;

    const el = moveDrag.el;
    const rect = el.getBoundingClientRect();
    moveDrag.offsetX = moveDrag.startX - rect.left;
    moveDrag.offsetY = moveDrag.startY - rect.top;

    const ghost = el.cloneNode(true);
    Object.assign(ghost.style, {
      position: 'fixed',
      width:  rect.width  + 'px',
      height: rect.height + 'px',
      left:   rect.left   + 'px',
      top:    rect.top    + 'px',
      opacity: '0.8',
      pointerEvents: 'none',
      zIndex: '500',
      boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
      borderRadius: '5px'
    });
    document.body.appendChild(ghost);
    moveDrag.ghost = ghost;
    el.style.opacity = '0.3';
    document.body.classList.add('moving');
  }

  if (!moveDrag.ghost) return;
  moveDrag.ghost.style.left = (e.clientX - moveDrag.offsetX) + 'px';
  moveDrag.ghost.style.top  = (e.clientY - moveDrag.offsetY) + 'px';

  // 対象列の時刻を計算（ghost は pointer-events:none なので elementFromPoint が正確）
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const dayCol = target?.closest('.day-col');
  if (dayCol) {
    const colRect = dayCol.getBoundingClientRect();
    const ghostTopVp  = e.clientY - moveDrag.offsetY;
    const relActualY  = (ghostTopVp - colRect.top) / state.zoomLevel;
    const snapped     = snapMin(yToMin(Math.max(0, relActualY)), state.intervalIdx);
    moveDrag.newStartMin = clamp(snapped, START_MIN, END_MIN - moveDrag.duration);
    moveDrag.newDate     = dayCol.dataset.date;
  }
}

function onMoveUp() {
  document.removeEventListener('mousemove', onMoveMove);
  document.removeEventListener('mouseup',   onMoveUp);
  if (!moveDrag) return;
  const { id, started, ghost, el, newDate, newStartMin, duration } = moveDrag;
  moveDrag = null;

  if (started && ghost) {
    ghost.remove();
    el.style.opacity = '';
    document.body.classList.remove('moving');

    const ev = state.events.find(x => x.id === id);
    if (ev) {
      const oldDate = ev.date;
      ev.date = newDate;
      ev.startMin = newStartMin;
      ev.endMin   = newStartMin + duration;
      // 繰り返しシリーズから独立させる
      if (ev.recurringId) {
        delete ev.recurringId; delete ev.recurType; delete ev.recurWeekdays;
        delete ev.recurEndDate; delete ev.recurStartDate;
      }
      saveData();
      if (oldDate !== newDate) renderCol(oldDate);
      renderCol(newDate);
    }
    setRecentlyResized();
  } else {
    if (el) el.style.opacity = '';
    document.body.classList.remove('moving');
  }
}

/* ════════════════════════════════════════════
   Event element
════════════════════════════════════════════ */
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

  el.addEventListener('mousedown', e => onEventMouseDown(e, ev.id));
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

/* ════════════════════════════════════════════
   Recurring event generation
════════════════════════════════════════════ */
export function generateRecurringEvents(base, recur, endDateStr, weekdays) {
  const recurringId   = 'recur_' + Date.now();
  const recurStartDate = base.date;
  const instances = [];
  const endDate  = strToDate(endDateStr);
  const baseDate = strToDate(base.date);

  let cur = new Date(baseDate);
  while (cur <= endDate) {
    const dow       = cur.getDay();
    const daysDiff  = Math.round((cur - baseDate) / 86400000);
    const weeksDiff = Math.floor(daysDiff / 7);
    let include = false;
    if      (recur === 'daily')    include = true;
    else if (recur === 'weekday')  include = dow >= 1 && dow <= 5;
    else if (recur === 'weekly')   include = weekdays.includes(dow);
    else if (recur === 'biweekly') include = weekdays.includes(dow) && weeksDiff % 2 === 0;
    else if (recur === 'monthly')  include = cur.getDate() === baseDate.getDate();
    if (include) {
      instances.push({
        id: state.nextId++,
        date: dateToStr(cur),
        startMin: base.startMin, endMin: base.endMin,
        name: base.name, category: base.category,
        recurringId, recurType: recur,
        recurWeekdays: weekdays, recurEndDate: endDateStr, recurStartDate
      });
    }
    cur = addDays(cur, 1);
  }
  return instances;
}

/* ════════════════════════════════════════════
   Event modal
════════════════════════════════════════════ */
let modalState = { dateStr: '', editId: null, editScope: 'single', recurringId: null };

/** スコープ切替（main.js から呼ぶ） */
export function setEditScope(scope) {
  modalState.editScope = scope;
  document.getElementById('scopeSingleBtn').classList.toggle('active', scope === 'single');
  document.getElementById('scopeSeriesBtn').classList.toggle('active', scope === 'series');

  if (scope === 'series' && modalState.recurringId) {
    // シリーズの繰り返し設定を事前入力
    const ev = state.events.find(e => e.id === modalState.editId);
    const recurType = ev?.recurType ?? 'none';
    document.getElementById('eventRecur').value = recurType;
    const showWeekdays = recurType === 'weekly' || recurType === 'biweekly';
    document.getElementById('recurWeekdaysRow').style.display = showWeekdays ? '' : 'none';
    document.getElementById('recurEndRow').style.display = recurType !== 'none' ? '' : 'none';
    if (showWeekdays && ev?.recurWeekdays?.length) {
      document.querySelectorAll('input[name="recurDay"]').forEach(cb => {
        cb.checked = ev.recurWeekdays.includes(Number(cb.value));
      });
    }
    if (ev?.recurEndDate) {
      document.getElementById('recurEndDate').value = ev.recurEndDate;
    }
    document.getElementById('recurSection').style.display = '';
  } else {
    // この予定のみ：繰り返しセクションを隠す
    document.getElementById('eventRecur').value = 'none';
    document.getElementById('recurSection').style.display = 'none';
  }
}

export function openModal(dateStr, defaultStart, defaultEnd, editId = null) {
  const ev = editId ? state.events.find(e => e.id === editId) : null;
  const hasRecurring = !!(editId && ev?.recurringId);
  modalState = { dateStr, editId, editScope: 'single', recurringId: ev?.recurringId ?? null };

  const d = strToDate(dateStr);
  const label = `${d.getMonth()+1}/${d.getDate()}（${DAY_JP[d.getDay()]}）`;
  document.getElementById('modalTitle').textContent =
    editId ? `予定を編集（${label}）` : `予定を追加（${label}）`;
  document.getElementById('eventName').value = ev?.name ?? '';
  buildCategorySelect(ev?.category ?? state.categories[0]?.id);
  document.getElementById('eventStart').value = minToTimeStr(ev ? ev.startMin : defaultStart);
  document.getElementById('eventEnd').value   = minToTimeStr(ev ? ev.endMin   : defaultEnd);
  document.getElementById('modalSaveBtn').textContent = editId ? '保存' : '追加';

  // スコープトグル：繰り返し予定の編集時のみ表示
  document.getElementById('editScopeRow').style.display = hasRecurring ? '' : 'none';
  document.getElementById('scopeSingleBtn').classList.toggle('active', true);
  document.getElementById('scopeSeriesBtn').classList.toggle('active', false);

  // シリーズ削除ボタン：繰り返し予定の編集時のみ表示
  document.getElementById('modalDeleteSeriesBtn').style.display = hasRecurring ? '' : 'none';

  // 繰り返しセクション
  document.getElementById('recurSection').style.display = hasRecurring ? 'none' : '';
  document.getElementById('eventRecur').value = 'none';
  document.getElementById('recurEndRow').style.display = 'none';
  document.getElementById('recurWeekdaysRow').style.display = 'none';
  document.getElementById('recurEndDate').value = dateToStr(addDays(d, 30));
  document.querySelectorAll('input[name="recurDay"]').forEach(cb => {
    cb.checked = String(d.getDay()) === cb.value;
  });

  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('eventName').focus();
}

export function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  modalState = { dateStr: '', editId: null, editScope: 'single', recurringId: null };
}

export function deleteCurrentEventSeries() {
  if (!modalState.editId || !modalState.recurringId) return false;
  const dates = [...new Set(
    state.events.filter(e => e.recurringId === modalState.recurringId).map(e => e.date)
  )];
  state.events = state.events.filter(e => e.recurringId !== modalState.recurringId);
  saveData();
  closeModal();
  dates.forEach(d => renderCol(d));
  return true;
}

function validateRecur(dateStr) {
  const recur = document.getElementById('eventRecur').value;
  if (recur === 'none') return { recur, weekdays: [], endDateStr: '' };
  const endDateStr = document.getElementById('recurEndDate').value;
  if (!endDateStr) { alert('繰り返し終了日を入力してください'); return null; }
  if (endDateStr < dateStr) { alert('終了日は開始日以降を指定してください'); return null; }
  let weekdays = [];
  if (recur === 'weekly' || recur === 'biweekly') {
    weekdays = [...document.querySelectorAll('input[name="recurDay"]:checked')]
                .map(cb => Number(cb.value));
    if (weekdays.length === 0) { alert('繰り返す曜日を1つ以上選択してください'); return null; }
  }
  return { recur, weekdays, endDateStr };
}

export function handleModalSave(onSaved) {
  const name  = document.getElementById('eventName').value.trim();
  const cat   = document.getElementById('eventCategory').value;
  const start = timeStrToMin(document.getElementById('eventStart').value);
  const end   = timeStrToMin(document.getElementById('eventEnd').value);
  if (!name) { document.getElementById('eventName').focus(); return; }
  if (end <= start) { alert('終了時間は開始時間より後にしてください'); return; }

  const { editId, editScope, recurringId, dateStr } = modalState;

  /* ── ケース A: 繰り返しシリーズの「この予定のみ編集」 ── */
  if (editId && recurringId && editScope === 'single') {
    const ev = state.events.find(e => e.id === editId);
    if (ev) {
      ev.name = name; ev.category = cat; ev.startMin = start; ev.endMin = end;
      // シリーズから外す
      delete ev.recurringId; delete ev.recurType; delete ev.recurWeekdays;
      delete ev.recurEndDate; delete ev.recurStartDate;
    }
    saveData(); renderCol(dateStr); closeModal(); return;
  }

  /* ── ケース B: シリーズ全体を編集 ── */
  if (editId && recurringId && editScope === 'series') {
    const validated = validateRecur(dateStr);
    if (!validated) return;
    const { recur, weekdays, endDateStr } = validated;

    if (recur === 'none') {
      // 全件の名前・カテゴリ・時間を一括更新
      state.events.filter(e => e.recurringId === recurringId)
                  .forEach(e => { e.name = name; e.category = cat; e.startMin = start; e.endMin = end; });
      saveData(); onSaved();
    } else {
      // 旧シリーズを削除し、起点日から新シリーズを生成
      const ev = state.events.find(e => e.id === editId);
      const seriesStart = ev?.recurStartDate ||
        state.events.filter(e => e.recurringId === recurringId)
                    .reduce((min, e) => e.date < min ? e.date : min, ev.date);
      state.events = state.events.filter(e => e.recurringId !== recurringId);
      const instances = generateRecurringEvents(
        { date: seriesStart, startMin: start, endMin: end, name, category: cat },
        recur, endDateStr, weekdays
      );
      state.events.push(...instances);
      saveData(); onSaved();
    }
    closeModal(); return;
  }

  /* ── ケース C: 新規追加 or 単発イベントの編集 ── */
  const validated = validateRecur(dateStr);
  if (!validated) return;
  const { recur, weekdays, endDateStr } = validated;

  if (recur !== 'none') {
    if (editId) state.events = state.events.filter(e => e.id !== editId);
    const instances = generateRecurringEvents(
      { date: dateStr, startMin: start, endMin: end, name, category: cat },
      recur, endDateStr, weekdays
    );
    state.events.push(...instances);
    saveData(); onSaved();
  } else if (editId) {
    const ev = state.events.find(e => e.id === editId);
    if (ev) { ev.name = name; ev.category = cat; ev.startMin = start; ev.endMin = end; }
    saveData(); renderCol(dateStr);
  } else {
    state.events.push({ id: state.nextId++, date: dateStr, startMin: start, endMin: end, name, category: cat });
    saveData(); renderCol(dateStr);
  }
  closeModal();
}
