'use strict';



const STORAGE_KEYS = Object.freeze({
  theme: 'techgeek:theme',
  gadgets: 'techgeek:gadgets',
  listVisible: 'techgeek:listVisible'
});

const THEME = Object.freeze({ light: 'light', dark: 'dark' });

const DEFAULT_GADGETS = [
  {
    id: 'seed-neo-phone',
    name: 'Neo Phone 12 Pro',
    specs: ['Камера 200 Мп, сенсор 1″', 'AMOLED 6,8″ · 120 Гц', 'Батарея 5500 мА·ч · 120 Вт']
  },
  {
    id: 'seed-pulse-watch',
    name: 'Pulse Watch 5',
    specs: ['ЭКГ за 2 минуты', 'Датчик температуры тела', 'Автономность до 7 дней']
  }
];

let gadgets = [];
let isListVisible = true;
let statusTimerId = null;

const STATUS_CLASSES = ['form__message--success', 'form__message--error'];



const storage = {
  read(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`[TechGeek] Не удалось прочитать "${key}" из localStorage:`, error);
      return fallback;
    }
  },

  write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[TechGeek] Не удалось сохранить "${key}" в localStorage:`, error);
      return false;
    }
  }
};



function getById(id, { silent = false } = {}) {
  const element = document.getElementById(id);
  if (!element && !silent) {
    console.error(`[TechGeek] Элемент с id="${id}" не найден в DOM`);
  }
  return element;
}

function getOne(selector, root = document) {
  try {
    const element = root.querySelector(selector);
    if (!element) {
      console.error(`[TechGeek] Элемент по селектору "${selector}" не найден`);
    }
    return element;
  } catch (error) {
    console.error(`[TechGeek] Некорректный селектор "${selector}":`, error);
    return null;
  }
}

function getAll(selector, root = document) {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch (error) {
    console.error(`[TechGeek] Некорректный селектор "${selector}":`, error);
    return [];
  }
}

function checkElements() {
  const requiredIds = [
    'theme-toggle',
    'gadget-form',
    'gadget-name',
    'gadget-specs',
    'gadget-list',
    'remove-last',
    'toggle-list',
    'status'
  ];

  const missing = requiredIds.filter((id) => !document.getElementById(id));

  if (missing.length) {
    console.error('[TechGeek] Не найдены элементы интерфейса:', missing.join(', '));
    showStatus('Часть интерфейса не загрузилась — подробности в консоли', 'error');
  } else {
    console.log('[TechGeek] Все ключевые элементы найдены ✔');
  }

  return missing;
}



function getPreferredTheme() {
  const stored = storage.read(STORAGE_KEYS.theme, null);
  if (stored === THEME.dark || stored === THEME.light) return stored;

  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEME.dark;
    }
  } catch (error) {
    console.warn('[TechGeek] matchMedia недоступен:', error);
  }

  return THEME.light;
}

function applyTheme(theme) {
  const isDark = theme === THEME.dark;
  const root = document.documentElement;

  
  root.dataset.theme = isDark ? THEME.dark : THEME.light;
  root.classList.toggle('theme-dark', isDark);

  const toggle = getById('theme-toggle', { silent: true });
  if (toggle) {
    toggle.textContent = isDark ? '☀️ Светлая тема' : '🌙 Тёмная тема';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute(
      'aria-label',
      isDark ? 'Включить светлую тему' : 'Включить тёмную тему'
    );
    toggle.title = isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему';
  }

  const meta = getById('theme-color', { silent: true });
  if (meta) {
    meta.setAttribute('content', isDark ? '#121212' : '#d9d9d9');
  }
}

function initTheme() {
  applyTheme(getPreferredTheme());

  const toggle = getById('theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === THEME.dark ? THEME.light : THEME.dark;

    applyTheme(next);
    storage.write(STORAGE_KEYS.theme, next);
    console.log(`[TechGeek] Тема переключена и сохранена: ${next}`);
  });
}



function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function normalizeGadget(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '';
  if (!name) return null;

  const specs = Array.isArray(raw.specs)
    ? raw.specs
        .filter((spec) => typeof spec === 'string')
        .map((spec) => spec.trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId(),
    name,
    specs
  };
}

function loadGadgets() {
  const saved = storage.read(STORAGE_KEYS.gadgets, null);

  if (saved === null) {
    return DEFAULT_GADGETS.map((gadget) => ({ ...gadget, specs: [...gadget.specs] }));
  }

  if (!Array.isArray(saved)) {
    console.warn('[TechGeek] Повреждённые данные гаджетов — использую демо-набор');
    return DEFAULT_GADGETS.map((gadget) => ({ ...gadget, specs: [...gadget.specs] }));
  }

  return saved.map(normalizeGadget).filter(Boolean);
}

function persistGadgets() {
  const ok = storage.write(STORAGE_KEYS.gadgets, gadgets);
  if (ok) {
    console.log(`[TechGeek] Гаджеты сохранены в localStorage (${gadgets.length})`);
  }
}

function loadListVisibility() {
  const saved = storage.read(STORAGE_KEYS.listVisible, true);
  return typeof saved === 'boolean' ? saved : true;
}

function createGadgetCard(gadget) {
  const item = document.createElement('li');
  item.className = 'gadget-card';
  item.dataset.id = gadget.id;

  const title = document.createElement('h3');
  title.className = 'gadget-card__title';
  title.textContent = gadget.name; 

  const specs = document.createElement('ul');
  specs.className = 'gadget-card__specs';

  if (gadget.specs.length) {
    for (const spec of gadget.specs) {
      const specItem = document.createElement('li');
      specItem.textContent = spec;
      specs.append(specItem);
    }
  } else {
    const emptySpec = document.createElement('li');
    emptySpec.className = 'gadget-card__specs-empty';
    emptySpec.textContent = 'Характеристики не указаны';
    specs.append(emptySpec);
  }

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn btn--danger gadget-card__delete';
  deleteButton.textContent = 'Удалить';
  deleteButton.setAttribute('aria-label', `Удалить гаджет «${gadget.name}»`);

  item.append(title, specs, deleteButton);
  return item;
}

function renderGadgets() {
  const list = getById('gadget-list');
  if (!list) return;

  list.replaceChildren();
  list.dataset.count = String(gadgets.length);
  list.setAttribute('aria-label', `Список гаджетов, всего: ${gadgets.length}`);

  if (!gadgets.length) {
    const empty = document.createElement('li');
    empty.className = 'gadget-list__empty';
    empty.textContent = 'Пока пусто — добавьте первый гаджет через форму выше.';
    list.append(empty);
    console.log('[TechGeek] Список гаджетов пуст');
    return;
  }

  const fragment = document.createDocumentFragment();
  gadgets.forEach((gadget) => fragment.append(createGadgetCard(gadget)));
  list.append(fragment);

  
  const cards = getAll('.gadget-card', list);
  cards.forEach((card) => {
    const button = getOne('.gadget-card__delete', card);
    if (button) button.addEventListener('click', handleDeleteGadget);
  });

  console.log(`[TechGeek] Отрисовано карточек: ${cards.length}`);
}

function setListVisible(visible, { persist = true } = {}) {
  const list = getById('gadget-list');
  const toggle = getById('toggle-list');

  if (!list || !toggle) return;

  isListVisible = Boolean(visible);

  
  list.hidden = !isListVisible;
  list.classList.toggle('gadget-list--hidden', !isListVisible);
  toggle.textContent = isListVisible ? 'Скрыть список' : 'Показать список';
  toggle.setAttribute('aria-expanded', String(isListVisible));
  toggle.setAttribute(
    'aria-label',
    isListVisible ? 'Скрыть список гаджетов' : 'Показать список гаджетов'
  );

  if (persist) {
    storage.write(STORAGE_KEYS.listVisible, isListVisible);
  }
}



function showStatus(message, type = 'info') {
  const status = getById('status');
  if (!status) return;

  status.textContent = message;
  status.classList.remove(...STATUS_CLASSES);

  if (type === 'success') status.classList.add('form__message--success');
  if (type === 'error') status.classList.add('form__message--error');

  status.dataset.type = type;

  window.clearTimeout(statusTimerId);
  statusTimerId = window.setTimeout(() => {
    status.textContent = '';
    status.classList.remove(...STATUS_CLASSES);
    delete status.dataset.type;
  }, 4000);
}



function handleAddGadget(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const nameInput = getById('gadget-name');
  const specsInput = getById('gadget-specs');

  if (!nameInput || !specsInput) {
    showStatus('Не удалось найти поля формы', 'error');
    return;
  }

  const name = nameInput.value.trim().slice(0, 80);

  if (!name) {
    nameInput.classList.add('form-field--invalid');
    nameInput.focus();
    showStatus('Введите название гаджета', 'error');
    return;
  }

  nameInput.classList.remove('form-field--invalid');

  const specs = specsInput.value
    .split(',')
    .map((spec) => spec.trim())
    .filter(Boolean)
    .slice(0, 10);

  gadgets.push({ id: createId(), name, specs });

  persistGadgets();
  renderGadgets();
  setListVisible(true);

  if (form && typeof form.reset === 'function') form.reset();
  nameInput.focus();

  showStatus(`Гаджет «${name}» добавлен. Всего: ${gadgets.length}`, 'success');
}

function handleRemoveLast() {
  if (!gadgets.length) {
    showStatus('Список пуст — удалять нечего', 'error');
    return;
  }

  const removed = gadgets.pop();

  persistGadgets();
  renderGadgets();
  showStatus(`Удалён последний гаджет: «${removed.name}»`, 'success');
}

function handleDeleteGadget(event) {
  const button = event.currentTarget;
  const card = button.closest('.gadget-card');

  if (!card) {
    console.error('[TechGeek] Не удалось найти карточку для удаления');
    showStatus('Ошибка: карточка не найдена', 'error');
    return;
  }

  const id = card.dataset.id;
  const index = gadgets.findIndex((gadget) => gadget.id === id);

  if (index === -1) {
    console.error('[TechGeek] Гаджет с id', id, 'не найден в состоянии');
    showStatus('Ошибка: гаджет не найден в сохранённом списке', 'error');
    renderGadgets();
    return;
  }

  const [removed] = gadgets.splice(index, 1);

  persistGadgets();
  renderGadgets();
  showStatus(`Гаджет «${removed.name}» удалён. Осталось: ${gadgets.length}`, 'success');
}

function initGadgets() {
  gadgets = loadGadgets();
  isListVisible = loadListVisibility();

  const form = getById('gadget-form');
  const removeLastButton = getById('remove-last');
  const toggleButton = getById('toggle-list');

  if (form) {
    form.addEventListener('submit', handleAddGadget);
  }

  if (removeLastButton) {
    removeLastButton.addEventListener('click', handleRemoveLast);
  }

  if (toggleButton) {
    toggleButton.addEventListener('click', () => setListVisible(!isListVisible));
  }

  renderGadgets();
  setListVisible(isListVisible, { persist: false });
}



function runBatteryAnalysis() {
  const batteryHours = [12.5, 10, 9, 7.5, 6, 4, 3.5];

  function findMax(arr) {
    if (!arr.length) return null;

    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > max) {
        max = arr[i];
      }
    }
    return max;
  }

  function filterByMinHours(arr, minHours) {
    const result = [];
    for (const hours of arr) {
      if (hours > minHours) {
        result.push(hours);
      }
    }
    return result;
  }

  function sumArray(arr) {
    let sum = 0;
    for (const value of arr) {
      sum += value;
    }
    return sum;
  }

  const totalHours = sumArray(batteryHours);
  const averageHours = totalHours / batteryHours.length;
  const longLastingDevices = filterByMinHours(batteryHours, 8);

  let lowBatteryCount = 0;
  const lowBatteryDevices = [];

  for (const hours of batteryHours) {
    if (hours <= 4) {
      lowBatteryCount++;
      lowBatteryDevices.push(hours);
    }
  }

  const lowBatteryShare = (lowBatteryCount / batteryHours.length) * 100;

  try {
    const userName = prompt('Как вас зовут?', 'Иван') || 'гость';
    alert(`Привет, ${userName}! Добро пожаловать в обзор автономности гаджетов.`);
    console.log(`Пользователь: ${userName}`);

    alert(
      `Среднее время работы – ${averageHours.toFixed(1)} часов, ` +
        `${longLastingDevices.length} устройств – долгожители.`
    );
  } catch (error) {
    console.warn('[TechGeek] Интерактивный опрос недоступен:', error);
  }

  console.log('Время автономной работы гаджетов, ч:', batteryHours);
  console.log('Максимальное время работы, ч:', findMax(batteryHours));
  console.log('Суммарное время работы, ч:', totalHours);
  console.log(
    `Устройств с малым временем работы (≤ 4 ч): ${lowBatteryCount}; ` +
      `доля: ${lowBatteryShare.toFixed(1)}%`
  );
  console.log('Значения малого времени работы, ч:', lowBatteryDevices);

  if (averageHours < 6) {
    console.log('Стоит обратить внимание на энергоэффективность');
  }
}



function init() {
  console.log('[TechGeek] Инициализация интерфейса…');

  initTheme();       
  checkElements();   
  initGadgets();     
  runBatteryAnalysis(); 
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}