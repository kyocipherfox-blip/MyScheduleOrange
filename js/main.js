import { INTERVALS, INT_LABELS, START_MIN, END_MIN, ZOOM_STEP, ZOOM_MIN, ZOOM_MAX } from './config.js';
import { clamp, snapMin, yToMin, addDays } from './utils.js';
import { state, loadData, saveData, seedSample, getDisplayDates } from './store.js';
import { applyCategoriesToCSS, buildLegend, openCatModal, closeCatModal, addNewCat, saveCatModal } from './categories.js';
import { renderAll, openModal, closeModal, handleModalSave, recentlyResized,
         setEditScope, deleteCurrentEventSeries } from './events.js';
import { rebuildAll, buildAxis, buildDayCols } from './schedule.js';

/* ── Column click handler ── */
function onColClick(e, div, dateStr) {
  if (recentlyResized || e.target.closest('.event-block')) return;
  const rect = div.getBoundingClientRect();
  const snap = INTERVALS[state.intervalIdx];
  const actualY  = (e.clientY - rect.top) / state.zoomLevel;
  const startMin = clamp(snapMin(yToMin(actualY), state.intervalIdx), START_MIN, END_MIN - snap);
  const endMin   = clamp(startMin + 60, START_MIN + snap, END_MIN);
  openModal(dateStr, startMin, endMin);
}

/* ── Interval slider ── */
const slider = document.getElementById('intervalSlider');
const badge  = document.getElementById('intervalBadge');
const ticks  = document.querySelectorAll('.slider-ticks span');

function applyInterval(idx) {
  state.intervalIdx = idx;
  slider.value = idx;
  badge.textContent = INT_LABELS[idx];
  slider.style.setProperty('--fill', (idx / 3 * 100) + '%');
  ticks.forEach((s,i) => s.classList.toggle('active', i === idx));
  buildAxis();
  buildDayCols(getDisplayDates(), onColClick);
  renderAll(getDisplayDates());
  saveData();
}

slider.addEventListener('input', () => applyInterval(+slider.value));
ticks.forEach(s => s.addEventListener('click', () => applyInterval(+s.dataset.idx)));

/* ── Zoom control ── */
const zoomLabel  = document.getElementById('zoomLabel');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomInBtn  = document.getElementById('zoomInBtn');

function applyZoom(level) {
  state.zoomLevel = Math.round(level * 100) / 100;
  document.getElementById('scheduleInner').style.zoom = state.zoomLevel;
  zoomLabel.textContent = Math.round(state.zoomLevel * 100) + '%';
  zoomOutBtn.disabled = state.zoomLevel <= ZOOM_MIN;
  zoomInBtn.disabled  = state.zoomLevel >= ZOOM_MAX;
  saveData();
}

zoomOutBtn.addEventListener('click', () => applyZoom(clamp(state.zoomLevel - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX)));
zoomInBtn.addEventListener('click',  () => applyZoom(clamp(state.zoomLevel + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX)));

/* ── Week navigation ── */
document.getElementById('prevWeekBtn').addEventListener('click', () => {
  state.currentWeekStart = addDays(state.currentWeekStart, -7);
  saveData(); rebuildAll(onColClick);
});
document.getElementById('nextWeekBtn').addEventListener('click', () => {
  state.currentWeekStart = addDays(state.currentWeekStart, 7);
  saveData(); rebuildAll(onColClick);
});
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.viewMode = +btn.dataset.weeks;
    saveData(); rebuildAll(onColClick);
  });
});

/* ── Event modal listeners ── */
document.getElementById('modalCancel').addEventListener('click', closeModal);

document.getElementById('modalSaveBtn').addEventListener('click', () => {
  handleModalSave(() => renderAll(getDisplayDates()));
});

document.getElementById('eventName').addEventListener('keydown', e => {
  if (e.key === 'Enter')  document.getElementById('modalSaveBtn').click();
  if (e.key === 'Escape') closeModal();
});

document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

/* ── Edit scope toggle ── */
document.getElementById('scopeSingleBtn').addEventListener('click', () => setEditScope('single'));
document.getElementById('scopeSeriesBtn').addEventListener('click', () => setEditScope('series'));

/* ── Series delete button ── */
document.getElementById('modalDeleteSeriesBtn').addEventListener('click', () => {
  if (!confirm('このシリーズの繰り返し予定をすべて削除しますか？')) return;
  deleteCurrentEventSeries();
});

/* ── Recurrence select listener ── */
document.getElementById('eventRecur').addEventListener('change', () => {
  const val = document.getElementById('eventRecur').value;
  const showOptions = val !== 'none';
  document.getElementById('recurEndRow').style.display      = showOptions ? '' : 'none';
  document.getElementById('recurWeekdaysRow').style.display =
    (val === 'weekly' || val === 'biweekly') ? '' : 'none';
});

/* ── Category modal listeners ── */
document.getElementById('catSettingsBtn').addEventListener('click', openCatModal);
document.getElementById('catModalCancel').addEventListener('click', closeCatModal);
document.getElementById('addCatBtn').addEventListener('click', addNewCat);
document.getElementById('catModalSave').addEventListener('click', () => {
  saveCatModal(() => {
    saveData();
    applyCategoriesToCSS();
    buildLegend();
    renderAll(getDisplayDates());
  });
});
document.getElementById('catModalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('catModalOverlay')) closeCatModal();
});

/* ── Init ── */
loadData();
seedSample();
applyCategoriesToCSS();
buildLegend();
applyInterval(state.intervalIdx);
applyZoom(state.zoomLevel);
rebuildAll(onColClick);
