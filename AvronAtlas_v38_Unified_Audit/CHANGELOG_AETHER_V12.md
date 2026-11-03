# AvronAtlas v12 — integration and correction

- Pop-up: coordinates may be negative, blocks may overlap and extend beyond the original artboard; map renderer does not clamp width to the remaining right-hand space. Image object-position is now the same in editor and viewer.
- Chronicles: create world events and articles directly from a book, reorder within the two source lists, assign an icon. Existing source records remain shared.
- Lower dock: adds navigable map tools to the common registry, making them selectable using the existing + control.
- v12 JSON: original records retained; schema version 5; references unchanged.

## Limitations
- Full browser end-to-end testing is not complete.
- Chronology remains an integration of representations, not a fully unified drag-and-drop chronology composer.
- The legacy Pantheon has not been fully replaced by the showcase renderer.
- LocalStorage may not hold large image-containing JSON; explicitly export your world.
