import { TOTAL_H, INTERVALS, DAY_JP, DAY_CLASS, START_MIN, END_MIN } from './config.js';
import { dateToStr, fmtDateShort, fmtTime, minToY } from './utils.js';
import { state, getDisplayDates } from './store.js';
import { renderAll } from './events.js';

export function buildHeader(dates) {
  const header = document.getElementById('scheduleHeader');
  header.style.gridTemplateColumns = `70px repeat(${dates.length}, 1fr)`;
  header.innerHTML = '<div class="col-header time-col">時間</div>';
  dates.forEach(d => {
    const dow = d.getDay();
    const el = document.createElement('div');
    el.className = `col-header ${DAY_CLASS[dow]}`;
    el.innerHTML = `<span class="day-name">${DAY_JP[dow]}</span><span class="day-date">${d.getMonth()+1}/${d.getDate()}</span>`;
    header.appendChild(el);
  });
}

export function updateWeekLabel(dates) {
  document.getElementById('weekLabel').textContent =
    `${fmtDateShort(dates[0])} 〜 ${fmtDateShort(dates[dates.length-1])}`;
}

export function buildAxis() {
  const axis = document.getElementById('timeAxis');
  axis.style.height = TOTAL_H + 'px';
  axis.innerHTML = '';
  const interval = INTERVALS[state.intervalIdx];
  for (let t = START_MIN; t <= END_MIN; t += interval) {
    const el = document.createElement('div');
    el.className = 'time-label' + (t % 60 === 0 ? ' hour' : '');
    el.style.top = minToY(t) + 'px';
    el.textContent = fmtTime(t);
    axis.appendChild(el);
  }
}

export function buildDayCols(dates, onColClick) {
  const wrapper = document.getElementById('daysWrapper');
  wrapper.innerHTML = '';
  const slotH  = INTERVALS[state.intervalIdx] * 1.2;
  const gridBg = `repeating-linear-gradient(to bottom, transparent 0, transparent ${slotH-1}px, #e0e0e0 ${slotH-1}px, #e0e0e0 ${slotH}px)`;

  dates.forEach(d => {
    const dateStr = dateToStr(d);
    const div = document.createElement('div');
    div.className = 'day-col';
    div.dataset.date = dateStr;
    div.style.height = TOTAL_H + 'px';
    div.style.backgroundImage = gridBg;
    div.addEventListener('click', e => onColClick(e, div, dateStr));
    wrapper.appendChild(div);
  });

  document.getElementById('scheduleInner').style.minWidth = (70 + dates.length * 80) + 'px';
}

export function rebuildAll(onColClick) {
  const dates = getDisplayDates();
  buildHeader(dates);
  updateWeekLabel(dates);
  buildAxis();
  buildDayCols(dates, onColClick);
  renderAll(dates);
  document.querySelectorAll('.view-btn').forEach(btn =>
    btn.classList.toggle('active', +btn.dataset.weeks === state.viewMode));
}
