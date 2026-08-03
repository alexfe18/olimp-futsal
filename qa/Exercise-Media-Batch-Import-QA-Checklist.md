# Exercise Media Batch Import — QA Checklist

## 1. Навігація

- Відкрити `Робочий простір тренера` у desktop sidebar.
- Перевірити пункт `Імпорт медіа`.
- Повторити у mobile menu.
- Відкрити `/admin/coach/exercises/media-import`.
- Переконатися, що активний лише пункт `Імпорт медіа`.

## 2. Mixed preview fixture

Завантажити:

`qa/test-files/01-preview-mixed-statuses.zip`

Очікування залежно від поточного стану вправ `TECH-001` і `TECH-002`, але обов'язково:

- `UNKNOWN-999-cover.png` — помилка: вправу не знайдено;
- `wrong-name.png` — помилка filename contract;
- обидва `TECH-002-diagram.png` — помилка дублювання типу медіа в одному пакеті;
- `README.md`, `__MACOSX` і `.DS_Store` не показуються у preview;
- `TECH-001-cover.png` — `Заміни`, якщо обкладинка вже є;
- `TECH-001-diagram.png` — `Готові` або `Заміни` залежно від даних.

Цей fixture рекомендовано використовувати лише для preview, не підтверджувати імпорт тестових зображень.

## 3. Invalid image fixture

Завантажити:

`qa/test-files/02-invalid-image-content.zip`

Очікування:

- `TECH-003-diagram.png` отримує помилку читання зображення;
- `manifest.json` ігнорується.

## 4. Real visual pack

Завантажити `Sprint-04.2.1-Technical-Visual-Pack-v1.zip`.

Очікування:

- у preview рівно 15 PNG;
- README, manifest, docs і QA файли з пакета ігноруються;
- коди `TECH-001–TECH-015` успішно прив'язані;
- якщо обкладинки вже додані вручну, усі 15 потрапляють у `Заміни`;
- за стратегії `Пропустити` кнопка недоступна, якщо немає нових медіа;
- після вибору `Замінити` кнопка стає доступною.

Не запускати заміну без потреби, якщо поточні обкладинки вже правильні.

## 5. Safe replacement

На одній тестовій вправі:

1. Зафіксувати поточний `cover_image_path` або `diagram_image_path`.
2. Завантажити новий файл із правильним кодом.
3. Обрати `Замінити після успішного завантаження`.
4. Підтвердити імпорт.
5. Перевірити новий path у вправі.
6. Перевірити Library Card / Details Hero / Edit Preview.
7. Переконатися, що медіа іншого типу не змінилося.

## 6. Responsive / Accessibility

- Desktop, tablet, mobile.
- Preview table не ламає layout; горизонтальний scroll доступний.
- Thumbnail має alt.
- Summary filters працюють як tablist.
- Disabled filter і disabled import button мають зрозумілий стан.
- Keyboard focus видно на controls.
