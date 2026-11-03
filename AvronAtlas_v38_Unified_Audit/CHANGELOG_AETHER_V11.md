# AvronAtlas XI — Unified World Studio (integration build)

## Migration

- `examples/Avron_Migrated_v11.json`: original uploaded world retained (266 entities, original maps, assets, articles and both active Pop-ups). Schema 4; adds `showcases`, `chronicleBooks`, and `interfaceSlots`.
- `examples/Avron_Original_Backup.json`: unchanged original world, schema 3.
- `examples/Empty_World_v11.json`: data-only empty example with no author-created showcases, sections, or chronicle books.
- `avron-demo.json` is the migrated world as an example. Existing browser storage takes precedence; import the migrated JSON explicitly through the editor's import action.

## Implemented

- World Studio screen for creating custom gallery, landscape country showcase, illustrated chronicle book and section.
- Section-based Pantheon showcase references the *existing* section `pantheon` and its entry IDs rather than cloning gods.
- Chronicle books reference existing world event and article IDs. Books appear as separate navigable top slots. Historical timelines remain in original timeline engine.
- Global editor/viewer toggles accessible outside the map.
- Popup Atelier: free drag, negative positions, overlap, free resize beyond canvas edges, image object-position X/Y and improved text wrap.
- Existing navigation handlers preserved; section/showcase names listed from world data.
- Explicit JSON download in editor Studio.

## Known limitations

- Legacy Pantheon rendering and chronology timeline engine remain available; this is a *bridge* not a complete single-engine rewrite.
- Chronicle books do not yet render dated events from `timeline.events` as a true scaled timeline. They link authored event entities and articles.
- New `chronicleBooks` and `showcases` are locally saved where browser quota permits; export migrated JSON after editing.
- Existing popup viewer may still clip objects lying outside the defined popup canvas; avoid relying on off-canvas display for published cards.
- Dragging inside the visual popup designer is pointer-based and has not been end-to-end tested in a browser.
- Existing original archive content and asset paths are retained.
