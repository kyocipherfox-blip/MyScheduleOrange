import { STORE_KEY, SEED_KEY, DEFAULT_CATS } from './config.js';
import { getMondayOf, dateToStr, strToDate, addDays, generateCatColors } from './utils.js';

export const state = {
  events: [],
  nextId: 1,
  intervalIdx: 2,
  viewMode: 1,
  currentWeekStart: getMondayOf(new Date()),
  categories: DEFAULT_CATS.map(c => ({ ...c, ...generateCatColors(c.accent) }))
};

export function getDisplayDates() {
  return Array.from({ length: 7 * state.viewMode }, (_, i) =>
    addDays(state.currentWeekStart, i)
  );
}

export function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    state.events      = d.events      || [];
    state.nextId      = d.nextId      || 1;
    state.intervalIdx = d.intervalIdx ?? 2;
    state.viewMode    = d.viewMode    || 1;
    if (d.currentWeekStart) state.currentWeekStart = strToDate(d.currentWeekStart);
    if (d.categories?.length) state.categories = d.categories;
  } catch {}
}

export function saveData() {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    events:           state.events,
    nextId:           state.nextId,
    intervalIdx:      state.intervalIdx,
    viewMode:         state.viewMode,
    currentWeekStart: dateToStr(state.currentWeekStart),
    categories:       state.categories
  }));
}

export function seedSample() {
  if (localStorage.getItem(SEED_KEY)) return;
  const mon = getMondayOf(new Date());
  const add = (off, sh, sm, eh, em, name, cat) =>
    state.events.push({ id: state.nextId++, date: dateToStr(addDays(mon, off)),
                  startMin: sh*60+sm, endMin: eh*60+em, name, category: cat });
  add(0, 7,0, 8,0,'朝食','meal');        add(0, 8,0, 9,0,'通勤','work');
  add(0, 9,0,10,0,'朝礼・メール','work'); add(0,10,0,12,0,'開発作業','work');
  add(0,12,0,13,0,'ランチ','meal');       add(0,13,0,14,0,'定例MTG','work');
  add(0,14,0,18,0,'開発作業','work');     add(0,18,0,19,0,'退勤','work');
  add(0,19,0,20,0,'夕食','meal');         add(0,20,0,21,0,'ジム','exercise');
  add(1, 7,0, 8,0,'朝食','meal');         add(1, 8,0, 9,0,'通勤','work');
  add(1, 9,0,12,0,'開発作業','work');     add(1,12,0,13,0,'ランチ','meal');
  add(1,13,0,15,0,'設計レビュー','work'); add(1,15,0,18,0,'テスト','work');
  add(1,18,0,19,0,'退勤','work');         add(1,19,0,20,0,'夕食','meal');
  add(1,21,0,22,0,'読書','leisure');
  add(2, 7,0, 8,0,'朝食','meal');         add(2, 8,0, 9,0,'通勤','work');
  add(2, 9,0,10,0,'会議','work');         add(2,10,0,12,0,'開発作業','work');
  add(2,12,0,13,0,'ランチ','meal');       add(2,13,0,15,0,'開発作業','work');
  add(2,15,0,18,0,'テスト','work');       add(2,18,0,19,0,'退勤','work');
  add(2,19,0,20,0,'夕食','meal');         add(2,20,0,21,0,'ジム','exercise');
  add(3, 7,0, 8,0,'朝食','meal');         add(3, 8,0, 9,0,'通勤','work');
  add(3, 9,0,12,0,'開発作業','work');     add(3,12,0,13,0,'ランチ','meal');
  add(3,13,0,14,0,'1on1','work');         add(3,14,0,18,0,'開発作業','work');
  add(3,18,0,19,0,'退勤','work');         add(3,19,0,20,0,'夕食','meal');
  add(3,21,0,22,0,'読書','leisure');
  add(4, 7,0, 8,0,'朝食','meal');         add(4, 8,0, 9,0,'通勤','work');
  add(4, 9,0,10,0,'週次報告','work');     add(4,10,0,12,0,'開発作業','work');
  add(4,12,0,13,0,'ランチ','meal');       add(4,13,0,15,0,'開発作業','work');
  add(4,15,0,17,0,'リリース作業','work'); add(4,17,0,18,0,'まとめ・日報','work');
  add(4,18,0,19,0,'退勤','work');         add(4,19,0,20,0,'外食','meal');
  add(4,21,0,22,0,'読書','leisure');
  add(5, 7,0, 8,0,'朝食','meal');         add(5, 9,0,11,0,'買い物','leisure');
  add(5,12,0,13,0,'ランチ','meal');       add(5,13,0,15,0,'映画','leisure');
  add(5,18,0,19,0,'夕食','meal');         add(5,20,0,22,0,'読書','leisure');
  add(6,10,0,11,0,'朝食','meal');         add(6,12,0,13,0,'ランチ','meal');
  add(6,13,0,15,0,'散歩','exercise');     add(6,18,0,19,0,'夕食','meal');
  add(6,20,0,22,0,'読書','leisure');
  saveData();
  localStorage.setItem(SEED_KEY, '1');
}
