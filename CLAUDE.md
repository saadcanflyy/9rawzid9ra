## Design system (9rawZid9ra redesign) — mandatory for every UI change

Source of truth: the "9rawZid9ra" Design System artifact on claude.ai. Local copy: `src/design-system/`.

- `src/design-system/tokens.css` — every colour, shadow, spacing, radius and font variable, dark (default) + light themes. Imported once in `src/index.js`.
- `src/design-system/qz.css` — component styles, all classes prefixed `qz-`. Imported once in `src/index.js` after tokens.css.
- `src/design-system/ui.js` — React components: Wordmark, Button, Input, SearchBar, Chip, Tabs, Badge, DocType, Card, ModuleCard, DocumentRow, SchoolCard, StatStrip, Avatar, Navbar, Breadcrumb, EmptyState, Modal, Toast, Banner, Dropzone, PostCard, Messenger, Paywall, Skeleton, Icon.
- `src/design-system/DESIGN.md` — the brand book: principles, voice, colour/type/spacing rules, page blueprints and each component's guidelines. Read it before redesigning a page.
- `src/design-system/theme.js` — `useTheme()` / theme toggle (dark | light | system), stored in localStorage key `qz-theme`, applied as `<html data-theme>`.

Rules:
1. Never hardcode a colour, font, font size, radius, shadow or spacing value in a page. Use `var(--token)` or a `qz-`/`t-` class. Hex codes, `rgba(79,142,247,…)`, `'Outfit'`, `'DM Mono'` literals in `src/pages` or `src/components` are bugs.
2. Never redeclare `:root` variables inside a page's `const css` string. Page-level CSS may only do layout (grid, flex, widths, gaps with `var(--space-*)`).
3. Build pages from `ui.js` components first. If a pattern is missing, add it to `ui.js` + `qz.css` (prefix `qz-`), never as a one-off in a page.
4. One primary Button per view (the Navbar "Partager" button is the only exception).
5. Forbidden: gradient text (`background-clip:text`), gradient buttons, radial "blob" glows, animated grid backgrounds, `translateY` hover lifts, glow box-shadows, emoji in UI copy, font sizes below 12px, entrance animations on page load.
6. Every interactive element keeps the focus ring (`outline: 2px solid var(--focus); outline-offset: 2px`). Inputs are 16px text. Touch targets ≥ 40px on mobile.
7. Copy: French, "tu", sentence case, uppercase only in mono eyebrow tags; thin space in thousands (9 955); prices "39 MAD / mois"; years "2024/25"; semesters "S1–S12". Darija only in marketing moments, Latin script.
8. Doc types always render with `<DocType type={doc.doc_type} />` — never a custom coloured label.
9. Presentation only: redesign work must not change Supabase queries, RLS assumptions, auth flow (`useAuth()` only; `onAuthStateChange` stays in AuthContext.js and App.js), rate limits, character limits, sanitisation (`stripHtml`) or routing.
10. Test every changed page at 375px and 1280px, in dark and light.
