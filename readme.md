# TechGeek — страница обзорщика гаджетов

Адаптивная страница с обзорами гаджетов, карточками новинок, сравнительным дашбордом характеристик и интерактивным списком «Мои гаджеты» (добавление, удаление, скрытие списка, переключение темы).

## JavaScript

Скрипт script.js (defer) отвечает за интерактив, проверку элементов и хранение состояния:

**Поиск и проверка элементов**

getById(id) — обёртка над getElementById с логом об отсутствующем элементе.

getOne(selector) / getAll(selector) — querySelector и querySelectorAll с try/catch на некорректный селектор.

checkElements() — сверяет обязательные id (theme-toggle, gadget-form, gadget-name, gadget-specs, gadget-list, remove-last, toggle-list, status); при нехватке пишет ошибку в консоль и показывает сообщение в #status.

**Переключение темы**

getPreferredTheme() — сохранённая тема → prefers-color-scheme → light.

applyTheme(theme) — выставляет data-theme и класс theme-dark на html, обновляет текст кнопки, aria-pressed, aria-label и meta theme-color.

initTheme() — клик по #theme-toggle переключает тему и сохраняет её в localStorage. Ранний inline-скрипт в main.html ставит data-theme до первой отрисовки — без «вспышки».

**Карточки гаджетов**

handleAddGadget(event) — preventDefault, валидация названия (подсветка form-field--invalid), характеристики через запятую (до 10), createId() (crypto.randomUUID с fallback), сохранение и перерисовка.

renderGadgets() — полная перерисовка через DocumentFragment; карточки собираются через createElement и textContent (без innerHTML), у каждой кнопка «Удалить».

handleDeleteGadget(event) — поиск по data-id карточки, splice, сохранение и перерисовка.

handleRemoveLast() — pop последнего гаджета с проверкой на пустой список.

setListVisible(visible) — hidden + класс gadget-list--hidden, текст и aria-expanded у #toggle-list, сохранение видимости.

**Сохранение состояния в localStorage**

storage.read / storage.write — обёртка с try/catch и JSON; ключи techgeek:theme, techgeek:gadgets, techgeek:listVisible.

loadGadgets() — демо-набор по умолчанию и нормализация через normalizeGadget() (trim, лимиты, отбрасывание мусора) при повреждённых данных.

При загрузке страницы восстанавливаются тема, список гаджетов и видимость списка.

**Сообщения**

showStatus(message, type) — текст и классы form__message--success/--error в #status, автоочистка через 4 с.

**Анализ автономности**

findMax(arr) — максимум в массиве без Math.max.

filterByMinHours(arr, min) — фильтр устройств-долгожителей.

sumArray(arr) — сумма значений.

Подсчёт среднего времени, количества и доли устройств с малым временем работы (≤ 4 ч).

Вывод через alert и console.log, приветствие пользователя через prompt (обёрнуто в try/catch на случай блокировки).