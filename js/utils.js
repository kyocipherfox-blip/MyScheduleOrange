import { START_MIN, PX_PER_MIN, INTERVALS } from './config.js';

/* ── Color utilities ── */
export function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
export function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(x =>
    Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,'0')
  ).join('');
}
export function generateCatColors(accent) {
  const [r,g,b] = hexToRgb(accent);
  return {
    bg:     rgbToHex(r*0.18+255*0.82, g*0.18+255*0.82, b*0.18+255*0.82),
    border: rgbToHex(r*0.55+255*0.45, g*0.55+255*0.45, b*0.55+255*0.45),
    color:  rgbToHex(r*0.48, g*0.48, b*0.48)
  };
}

/* ── Date utilities ── */
export function getMondayOf(date) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}
export function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function strToDate(s) {
  const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d);
}
export function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
export function fmtDateShort(d) {
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

/* ── Time utilities ── */
export function fmtTime(min) {
  return `${Math.floor(min/60)}:${String(min%60).padStart(2,'0')}`;
}
export function minToTimeStr(min) {
  return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
}
export function timeStrToMin(s) { const [h,m] = s.split(':').map(Number); return h*60+m; }
export function minToY(min)     { return (min - START_MIN) * PX_PER_MIN; }
export function yToMin(y)       { return y / PX_PER_MIN + START_MIN; }
export function snapMin(min, intervalIdx) {
  const s = INTERVALS[intervalIdx]; return Math.round(min/s)*s;
}
export function clamp(v,lo,hi)  { return Math.max(lo, Math.min(hi, v)); }
