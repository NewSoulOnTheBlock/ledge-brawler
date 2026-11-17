# Typefaces

Two faces, kept here at a fixed address so that the first paint does not wait on another site and the static pages
can use them too. The design tokens name them (`sans`, `mono`; `display` in main.css); the canvas names them by size.

- Seven Swordsmen BB by Nate Piekos, Blambot (https://blambot.com), one weight, used under the owner's license: titles,
  headings, buttons and every other uppercase `display` line, and canvas lettering of 17px and up. The designer's
  own notes travel with it, as its terms ask: `seven-swordsmen-info.txt`. Converted from the distributed TTF to WOFF2
  with fontTools, glyphs unchanged. It has no × · … — – < > [ ] _ ~; those fall back to the next font in its stack.
- Lexend by The Lexend Project (https://www.lexend.com), variable weight 100–900, SIL Open Font License 1.1
  (`lexend-OFL.txt`): paragraphs and everything that is not a title (`sans`, `mono`, canvas text under 17px).
  From google/fonts (ofl/lexend), converted to WOFF2 with fontTools, glyphs unchanged. It has no arrows (→ ← ↑ ↓);
  those come from the system's own font.
