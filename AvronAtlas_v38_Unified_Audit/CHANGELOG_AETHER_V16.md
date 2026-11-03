# AvronAtlas v16 — Navigation and scene corrections

- Removed the large centered «Открыть приключение» button, including its empty-state rendering.
- Added «Приключения» as an independent configurable navigation entry. If a campaign exists, the entry opens the expanded map time panel. If not, the chronology editor is opened in editor mode.
- Scene popup playback triggers only from its small inline glyph; map clicks no longer silently trigger scene playback.
- Guarded overlapping animation loops; animation remains inside map popup.
- Rendered Classic Pantheon arrangement inside shared Showcase Gallery with arched cards and staggered layout.
- Fixed drag destination indexing for moving slots between menu and dock.
- Migrated existing Avron JSON to schema 9; kept original entries, IDs, and embedded image sources.

Remaining: true pixel-perfect migration of full legacy Pantheon experience, complete canvas-based keyframe editing and full browser end-to-end test.
