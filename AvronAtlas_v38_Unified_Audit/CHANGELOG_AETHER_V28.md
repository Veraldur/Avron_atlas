# AvronAtlas v28 — Reliability and Scale

- `ui.js`: fix `ReferenceError: field is not defined` in `popupBlockEditor` when a popup has image blocks. Replaced orphaned `field` and `commit` calls with standard `controls.push(row(...))` and `edit`.
- Upper/lower slot chooser: replace browser `prompt()` numeric list with native searchable in-app dialog; hidden upper slots remain hidden.
- World console button relocated away from Viewer/Editor controls and raised above ordinary UI.
- Adventures catalog: client-side search, type filter, pages of 24 items, scales to 300–400 rooms.
- Adventure room deletion: in-app confirmation; preserves original linked map entity and logs deletion.
- This iteration does NOT convert every showcase into the full Adventure Room format; that architectural work remains incomplete.
- Tests: static syntax, archive integrity, JSON checks. Interactive browser test not guaranteed.
- Showcase format chooser now includes **Gallery / Hall / Room**. Room format can reference an existing adventure room by ID. Hall keeps the legacy engine; Room opens the corresponding adventure room when linked. This is a routing integration, not a full single-canvas refactor.
- Console materials now supports search, deletion of adventure rooms, and explicit deletion of dungeon map entities. Room deletion retains map entities; deleting a dungeon unlinks its room and removes direct relation edges.
