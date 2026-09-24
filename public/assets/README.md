# Assets

Drop SVGs (and other static art) here. Anything in this folder is served from the site root
with the `public/` prefix removed, so `public/assets/potter.svg` is available at `/assets/potter.svg`:

```html
<img src="/assets/potter.svg" alt="A potter at her wheel">
```

```jsx
<img src="/assets/potter.svg" alt="A potter at her wheel" />
```

Files here are served as-is. Next does not process, optimise or fingerprint them.

## Naming

Short, descriptive, kebab-case, named for what the thing *is* rather than where it is used —
`potter-at-wheel.svg`, not `home-hero-2.svg`. A file named for its screen becomes a lie the
first time it is reused.

## Before you add a file

- **Check the licence.** This repo is public. Stock or third-party art needs a licence that
  permits redistribution, or it does not belong here. Unlicensed references stay in
  `design/references/local/`, which is for looking at, not for shipping.
- **Match the theme.** Linen & Sage: warm neutrals with one muted sage accent, flat fills,
  no outlines. See `.claude/skills/designing-focuspal-screens/SKILL.md` and the tokens beside it.
- **Keep it small.** Run SVGs through a minifier and strip editor cruft — Figma and Illustrator
  leave behind `<title>`, ids and metadata that nothing needs.
