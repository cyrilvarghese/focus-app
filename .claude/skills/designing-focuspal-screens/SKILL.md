---
name: designing-focuspal-screens
description: Use when designing, building, restyling or reviewing any Focuspal screen, component, illustration or animation, including the studio/focus screen, the "Who's here" sheet, the pals (bunny, cat, dog, koala), colours, fonts, or motion.
---

# Designing Focuspal screens

## Overview

Focuspal exists to **lower anxiety**, so its look is **Linen & Sage**: light, mostly neutral, with **one** quiet sage accent. The screen is warm linen with a very soft glow, text is warm charcoal, and the pottery studio is a small isometric diorama on a pale disc. The pals are drawn with soft charcoal outlines. **The core feeling is a shared space: calm, together, never busy. When in doubt, use less colour.**

The sources of truth are `design/prototypes/studio-screen-clean.html` and `design/prototypes/focuspal-screens-clean.html` (open them in a browser). The tokens are in `tokens.css` next to this file. The hifi, warm and calm files are kept only for history.

**Every screen has one headline and one main action, with as little else as possible.** Use spacing instead of boxes, sentence-case labels, one kind of control for choices (chips), and a quiet text button for anything secondary.

## Quick reference

| Element | Rule |
|---|---|
| Background | `--bg` linen with the soft glow (`.screen-bg`) and a 5% grain. Never pure white, never dark. |
| Text | `--text` charcoal primary, `--text-2` secondary, `--muted` meta. Never pure black. |
| Accent | `--accent` sage **only**: progress, subtitles, tags, primary pill buttons (text `--on-accent`). No second accent. |
| Status | `--live` sage dot = focusing, `--sleep` grey = dozing, `--danger` = Leave as text only (never a red fill). Always pair a dot with a word. |
| Colour budget | Neutrals + sage. Scene fills stay near-neutral (linen, oat, stone), and pals' clothes are pale sage. |
| Display type | Fraunces with `SOFT 100, WONK 1`: the timer, sheet titles, subtitles. |
| UI type | Inter 400–700. Labels are sentence case, 13.5px, 500 weight, `--text-2`. No uppercase tracking. |
| Radius | Cards and sheets 20–28px, pill buttons 999px, icon buttons are 44px circles on `rgba(61,57,52,.07)`. |
| Tap targets | 44px or more. Nothing depends on hover. |

## Studio screen anatomy (top to bottom)

1. **Top row:** the pod name ("The afternoon pod", 14px `--text-2`) and one borderless invite icon button. Nothing else.
2. **Timer as the title:** 84px Fraunces weight 400 in `--text`, tabular numbers. One sage line under it: "Round 1 of 2 · until your break" / "Break · back in a moment" / "Round 2 of 2 · until the end". **The timer never changes colour.**
3. **The diorama:** an isometric room corner with a window and its light, one short shelf with two finished pieces, a corner plant and one square table on a pale disc. Four pals sit on the two back edges. **Each pal has an open notebook** (their own task), and **one shared pot on a wheel sits in the middle of the table.**
4. **Caption:** one line, **bold lead** plus a gentle clause (see Voice).
5. **"Who's here":** a 96px bar with stacked faces and one line ("4 focusing" / "3 focusing · Maya dozing"). The whole bar is one tap target. Open, it shows plain rows (face, name with a small "you"/"host", task, status dot and word), then **Copy invite link** and **Leave**. It closes with the scrim or Esc. Tapping a pal opens it and highlights their row.

## The shared pot

- It's a **lathe shape**: one side profile of (height, radius) points, mirrored, with an elliptical rim (ry = 0.45·rx in the isometric view).
- **Progress `t` (0 to 1) blends lump → cylinder → vase** (keyframe profiles `LUMP`, `MID`, `VASE`). The rim opens once t > 0.25.
- `t` only grows during focus, at a rate proportional to present pals / 4. It pauses on breaks and never shrinks.
- Throwing rings slide around it (`.rings`) and the wheel's dashed ring turns. Both pause on breaks.
- The summary and shelf pots use the same profile idea, drawn front-on with a dipped glaze.

## Scene and motion rules

- **Isometric grid:** `P(x,y,z) = [OX+(x-y)·26, OY+(x+y)·13 − z·26]`. Every object is drawn from grid coordinates, never positioned by hand.
- **Pals share one rig** (torso, head, two arms). Each species is a skin on that rig, so every pal gets every animation. Hands rest on their notebook.
- **Motion is subtle and CSS-only**, with no JS per frame. Stagger each pal with negative delays.

| Loop | Size | Period |
|---|---|---|
| Head nod | ±1.5° | 7s |
| Breathing | 0.6px | 5s |
| Arms shaping | ±1.2° | 2.4s alternate |
| Pot throwing rings / wheel | 8px slide | 2.2s linear |
| Focus spark | visible ~12% of cycle | 11s |
| Plant sway | ±2.5° | 6s |
| Sunbeam / lights | opacity .55–1 | 5–16s |

- **States:** *focusing* uses all the loops. *Dozing* turns the pal a **solid** washed-out grey (`grayscale(1) contrast(.55) brightness(1.12)`, never opacity), the head droops, z's float, and hands and wheel stop. *Break* pauses the arms and wheels. Nothing already built is ever undone.
- **Time shows up in the room:** the window's light patch drifts across the floor as the session progresses.
- `prefers-reduced-motion` turns off every loop. The z's stay visible so the state still reads.

## Voice

Calm, warm, short. Name people, never shame them. Say "pod", "pals", "shaping", "break". No exclamation marks and no streak guilt.

| State | Caption |
|---|---|
| All focusing | "**Everyone's focusing.** The pot is taking shape." |
| Someone away (progress really does slow) | "**Maya has nodded off.** The clay slows down." / "**Leo & Maya have nodded off.** The clay slows down." |
| Break | "**Break.** The wheel rests, and tea is steeping." |
| Done | "**Session complete.** Lovely work, pod." |

## Common mistakes

| Mistake | Fix |
|---|---|
| Timer changes colour in the break state | Keep `.timer` `--text`. Only the subtitle wording changes. |
| Dozing pal made see-through with opacity | Use the grayscale filter. The pal must stay solid. |
| `--muted` text in the edge vignette (`--bg-lo`) | Keep text over `--bg` or `--card`, or use `--text-2`. |
| Adding a colour for emphasis (gold, bright green, red badges) | Use weight, size or the sage accent. Every extra hue adds noise. |
| Saturated fills in the scene (bright mint, deep brown, black jackets) | Use the pale scene palette in `tokens.css`. |
| Emoji or AI-generated frames for pals | Draw from the shared rig. AI images drift between frames. |
| Bigger or faster motion to "add life" | Add an ambient element instead (dust, light, steam) at the table's amplitude. |
| Stock or third-party images committed | The repo is public. Keep licensed references local. |
| Adding boxes, uppercase labels or a second button "for clarity" | Remove something instead. Use spacing, one headline and one action. |
