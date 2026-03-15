export const PX_PER_MIN = 1.2;
export const START_MIN  = 6 * 60;
export const END_MIN    = 22 * 60;
export const TOTAL_H    = (END_MIN - START_MIN) * PX_PER_MIN;
export const INTERVALS  = [15, 30, 60, 120];
export const INT_LABELS = ['15分', '30分', '1時間', '2時間'];
export const DAY_JP     = ['日','月','火','水','木','金','土'];
export const DAY_CLASS  = ['sun','mon','tue','wed','thu','fri','sat'];
export const STORE_KEY  = 'schedule_v5';
export const SEED_KEY   = 'schedule_seeded_v5';

export const DEFAULT_CATS = [
  { id:'work',     name:'仕事・通勤',    accent:'#3b82f6' },
  { id:'meal',     name:'食事',          accent:'#f97316' },
  { id:'exercise', name:'運動',          accent:'#22c55e' },
  { id:'leisure',  name:'レジャー・趣味', accent:'#a855f7' }
];
