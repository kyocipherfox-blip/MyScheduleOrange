import { state } from './store.js';
import { generateCatColors } from './utils.js';

export function applyCategoriesToCSS() {
  document.getElementById('dynamic-cat-css').textContent =
    state.categories.map(c => [
      `.event-block.${c.id}{background:${c.bg};color:${c.color};border:1.5px solid ${c.border};}`,
      `.legend-badge.${c.id}{background:${c.bg};color:${c.color};border:1px solid ${c.border};}`
    ].join('')).join('');
}

export function buildLegend() {
  document.getElementById('legend').innerHTML =
    state.categories.map(c => `<span class="legend-badge ${c.id}">${c.name}</span>`).join('');
}

export function buildCategorySelect(selectedId) {
  document.getElementById('eventCategory').innerHTML =
    state.categories.map(c =>
      `<option value="${c.id}"${c.id===selectedId?' selected':''}>${c.name}</option>`
    ).join('');
}

/* ── Category modal ── */
let editingCategories = [];

export function openCatModal() {
  editingCategories = state.categories.map(c => ({ ...c }));
  renderCatList();
  document.getElementById('catModalOverlay').classList.add('active');
}

export function closeCatModal() {
  document.getElementById('catModalOverlay').classList.remove('active');
}

export function renderCatList() {
  const list = document.getElementById('catList');
  list.innerHTML = '';
  editingCategories.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'cat-row';

    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'cat-swatch';
    swatch.value = c.accent || c.bg;
    swatch.title = '色を選択';
    swatch.addEventListener('input', () => {
      editingCategories[i].accent = swatch.value;
      Object.assign(editingCategories[i], generateCatColors(swatch.value));
    });

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'cat-name-input';
    nameInput.value = c.name;
    nameInput.maxLength = 20;
    nameInput.placeholder = 'カテゴリ名';
    nameInput.addEventListener('input', () => editingCategories[i].name = nameInput.value);

    const delBtn = document.createElement('button');
    delBtn.className = 'cat-del-btn';
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', () => { editingCategories.splice(i, 1); renderCatList(); });

    row.append(swatch, nameInput, delBtn);
    list.appendChild(row);
  });
}

export function addNewCat() {
  const accent = '#6366f1';
  editingCategories.push({
    id: 'cat_' + Date.now(), name: '新しいカテゴリ',
    accent, ...generateCatColors(accent)
  });
  renderCatList();
}

export function saveCatModal(onSaved) {
  if (editingCategories.length === 0) { alert('カテゴリは1つ以上必要です'); return; }
  if (editingCategories.some(c => !c.name.trim())) { alert('カテゴリ名を入力してください'); return; }

  const validIds = new Set(editingCategories.map(c => c.id));
  const fallback = editingCategories[0].id;
  state.events.forEach(ev => { if (!validIds.has(ev.category)) ev.category = fallback; });

  state.categories = editingCategories.map(c => ({ ...c, name: c.name.trim() }));
  closeCatModal();
  onSaved();
}
