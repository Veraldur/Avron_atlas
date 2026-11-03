# World Editor — foundation for a world encyclopedia

Phaser 3, plain JavaScript, no build step. The project remains compatible with the existing `index.html` + local `phaser.js` workflow.

## Run

Open the folder through a local static server or the Phaser editor environment. A static server is recommended; direct `file://` loading may block assets. No npm install is required.

## Core files

- `src/model.js` — world data model, migration/sanitization, demo world and browser restore.
- `src/scene.js` — map camera, map textures, markers, regions, relations and pointer interaction.
- `src/ui.js` — panels, object inspector, relation editor, library/article editor, media selection and JSON export/import.
- `src/main.js` — startup and restoration of embedded map assets.
- `src/style.css` — interface styling.

## Current foundation

- Schema version 3 adds libraries, folders, standalone articles, a `media` slot for world music and empty `timeline` extension points (`calendars`, `eras`, `campaigns`).
- Existing schema v2 worlds and older object-based JSON are still accepted through sanitization/migration.
- New blank worlds start with a 6500 × 4500 canvas; canvas dimensions are editable per map and capped at 50,000 × 50,000.
- Map images, object images and world music can be selected from the file picker. Selected assets are embedded as data URLs in the project JSON so the JSON export can carry them with the project. This can make JSON files large.
- The library now supports multiple library records, folders, standalone article records, a Markdown text editor and a preview. The preview implements a useful subset of Markdown (headings, paragraphs, lists, blockquotes, bold/italic, inline code and `[[wiki links]]`); it is **not yet a complete CommonMark/GFM implementation**.
- Object properties include per-object color override, opacity, hidden map label, fixed screen-size option and circle/plain marker shape. Embedded image assets can be used as marker artwork and appear in article cards.
- Browser autosave errors are surfaced in the status line instead of being silently swallowed. JSON export remains the portable backup mechanism.

## Important limitations / next implementation pass

The following are architectural targets, not represented as complete features yet:

1. Full Markdown/CommonMark/GFM support, rendered internal links to both articles and map entities, backlinks, article navigation and a complete folder tree with rename/move/delete controls.
2. Dedicated line geometry for rivers, ridges and borders; line editing, rounded caps/joins, and per-relation visual styling.
3. Complete marker-image layout controls (circle masking, custom outline), line/region geometry editing and stronger popup validation.
4. A robust project bundle format with assets stored separately or in an archive, and IndexedDB-backed persistence for large media. Browser `localStorage` has a small quota; large embedded map images may exceed it. Export JSON immediately when working with large assets.
5. A real full-screen encyclopedia/pantheon mode and the interactive timeline/calendar UI. Timeline data slots are reserved only; chronology is not implemented yet.
6. Multi-version world states, custom month/day definitions, six moon visibility, date-range filtering, event dates and campaign-specific timelines.

## Data model notes

`world.libraries[]`, `world.folders[]` and `world.articles[]` are separate from map entities, so an article does not need a map marker. `world.timeline` is reserved for future timeline data. Entities retain stable IDs and should be referenced by ID when temporal versions are introduced; do not duplicate a map entity merely to represent a later state.

## Controls

Mouse wheel zooms; right/middle mouse button or Space + drag pans; Escape cancels the current tool; Delete removes the selected entity; Backspace removes the last point while drawing an area.


## Lore update

- Top navigation switches between the map, the encyclopedia, and configurable lore sections.
- Lore sections are stored in `world.sections`; each section has editable entries. The initial section is Pantheon, but additional sections (for example, Artifacts) can be created from the top navigation.
- Entries and regular library articles use the bundled `marked.js` Markdown parser (GFM tables, task lists, fenced code, blockquotes, images, links, emphasis, and strikethrough). Internal world references use `[[Name]]` or `[[Name|label]]`.
- Map entities have a `popup` model with orientation, dimensions, and positioned text/image blocks. In read mode, clicking an entity with `popup.enabled` opens its card beside the map location.
- Object editing and left-side editor sections can be collapsed.
- The timeline remains a data-only placeholder; no calendar UI is implemented in this update.

The Markdown renderer sanitizes generated HTML before inserting it into the page. This is a browser-based authoring editor; client-engine migration will still need a separate renderer that consumes the portable world JSON and media data.

## Обновления текущей итерации

- Пересекающиеся области определяются все сразу; подсказка показывает список областей под курсором.
- По клику в пересечении открывается выбор области, а повторный быстрый клик по той же точке открывает доступные Pop-up карточки рядом.
- В Pop-up добавлен числовой приоритет (меньше число — раньше/левее), прокрутка содержимого и настраиваемая кнопка «Перейти» с картой и/или статьёй.
- Для изображений Pop-up добавлена команда подгонки высоты под ширину с сохранением пропорций.
- В редакторе объекта кнопка «Статья» создаёт статью в библиотеке или открывает уже связанную статью.

Исходный JSON пользователя добавлен как `avron-demo.json`. Его можно загрузить кнопкой «Загрузить JSON» в интерфейсе. Данные не подменяются автоматически: это защищает существующее автосохранение браузера от неожиданного перезаписывания.


## ✧ Редактор летописей
Верхнее меню → «✧ Летописи»: выберите карту/область приближения, божество, тексты и порядок слайдов, темп и автоматическое перелистывание. «Предпросмотр» показывает полный синематик. Настройки сохраняются в браузере, перенос через экспорт/импорт отдельного JSON (не входит в файл мира). Подробности — PANTHEON_README.md.

### Настройка синематиков (библиотека эффектов)

В разделе «✧ Летописи» можно редактировать непосредственно текст вступления, выбирать два независимых атмосферных эффекта и их интенсивность, применять пресеты (гроза, спектр/цветение, мир снов, змеи/тени, война, звёзды и т. д.). Есть пять стартовых сцен для сравнения. Молнии показываются только если включён эффект «Буря». Для точного выбора участка карты доступны численные параметры X/Y и ширины/высоты рамки с шагом 0.01%. Тексты примеров — предварительные, не канонические. 


### Новое: визуальная композиция летописей
Редактор летописей теперь позволяет не только выбирать эффекты, но и собирать фон сцены из нескольких слоёв: карта, дополнительный арт, градиент и разделитель. Поддерживаются режимы «только карта», «только арт», «карта + арт (наложение)» и «карта + арт (разделитель)». Пользователь может загружать свой фон-арт локально, регулировать цветокор сцены и отдельно смещать оттенок/контраст процедурных эффектов.

### Пантеон и летописи: версия с общим реестром
Верхнее меню содержит «✦ Пантеон» (настраиваемые божества) и «✧ Летописи» (читательская библиотека). В режиме редактора можно менять богов и создавать синематики; режим просмотра показывает архив, досье и воспроизведение без авторских элементов управления. Летописи назначаются статьям и объектам, а обратные кнопки появляются автоматически. Оба массива `pantheon` и `chronicles` включены в основной JSON мира вместе с изображениями, заданными через локальную загрузку.

Сцены в библиотеке могут быть опубликованы или оставлены черновиками. Поля «Раздел библиотеки», «Порядок карточки» и «Краткая аннотация каталога» регулируют публичную витрину. В режиме просмотра черновики не показываются, но остаются в JSON проекта.

## Редактор времени, Матрица и Finder

Обновление описано в `REFACTOR_UPDATE_NOTES.md`. Для проверки загружайте `examples/avron-timeline-matrix-demo.json` (или нажимайте «Демо-мир»). В новой Хронологии исправлено перетаскивание между годами и вариантами истории. Пантеон → Матрица позволяет сохранять пересечения и их статьи. В Энциклопедии Finder ищет, явно создаёт и помогает ставить ссылки без переписывания исходного Markdown.


## Aether v9
См. CHANGELOG_AETHER_V9.md: визуальный редактор Pop-up и перетаскивание экспонатов витрин.
