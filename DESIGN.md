---
version: alpha
name: My Real X — Forest
description: Light, card-based personal collector. One forest-green signature colour, serif headlines, physical cards.
colors:
  ground: "#EEF0EC"
  card: "#FFFFFF"
  sunk: "#F4F5F2"
  ink: "#17201A"
  muted: "#56625A"
  faint: "#646F68"
  forest: "#1E5B3A"
  forest-deep: "#143F28"
  forest-soft: "#E1ECE4"
  on-forest: "#FFFFFF"
  night: "#151B17"
  danger: "#B42318"
typography:
  display:
    fontFamily: Newsreader
    fontSize: 2.75rem
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: -0.03em
  display-s:
    fontFamily: Newsreader
    fontSize: 1.7rem
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.02em
  card-title:
    fontFamily: Newsreader
    fontSize: 1.45rem
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.015em
  quote:
    fontFamily: Newsreader
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: system-ui
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: system-ui
    fontSize: 0.9375rem
    fontWeight: 650
    lineHeight: 1.2
  meta:
    fontFamily: system-ui
    fontSize: 0.84rem
    fontWeight: 400
    lineHeight: 1.4
rounded:
  chip: 999px
  button: 14px
  choice: 22px
  card: 24px
  sheet: 30px
  moment: 32px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 20px
  xl: 32px
  gutter: 16px
components:
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: 20px
  card-forest:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-forest}"
    rounded: "{rounded.card}"
    padding: 20px
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-forest}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: 11px 16px
  button-soft:
    backgroundColor: "{colors.forest-soft}"
    textColor: "{colors.forest-deep}"
    rounded: "{rounded.button}"
    padding: 11px 16px
  button-on-forest:
    backgroundColor: "{colors.on-forest}"
    textColor: "{colors.forest-deep}"
    rounded: "{rounded.button}"
    padding: 11px 16px
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted}"
    rounded: "{rounded.chip}"
    padding: 8px 14px
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.chip}"
  choice-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.display-s}"
    rounded: "{rounded.choice}"
    padding: 16px
  choice-card-dark:
    backgroundColor: "{colors.night}"
    textColor: "#FFFFFF"
    rounded: "{rounded.choice}"
  tab-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.faint}"
    rounded: 26px
    height: 68px
---

## Overview

A quiet, light room full of physical cards — and one deep forest green that shows up when something matters. It should feel like a private collection, not a feed: calm lists, expressive moments. Inspired by the *vibe* of mymind (bold colour fields, serif type, cards with photos, physical motion), but with its own colour, words and mark.

## Colors

- **Ground (#EEF0EC):** a light green-gray, cooler than paper. Never pure white, never cream.
- **Card (#FFFFFF):** every unit of content sits on white.
- **Forest (#1E5B3A):** the signature. Used for the main action, the "make" card, and **full-field moments** (capture sheet, saved moment). White text on forest passes AA (8:1).
- **Forest-soft (#E1ECE4):** quiet tint for secondary actions and takeaways.
- **Night (#151B17):** the second contrast — one dark card beside a white one at special moments.
- Everything else is ink and two grays. No other hues except danger red for delete.

## Typography

- **Serif (Newsreader)** for anything you read as *content*: page titles, card titles, post text, quotes, prompts, choice cards. Tight tracking at large sizes.
- **Sans (system)** for anything you *operate*: buttons, chips, labels, counts, metadata.
- Five sizes, far apart. Body measure under 65ch. Tabular numbers for timers and counts.

## Layout

- Phone first, 16px gutter, content max 760px.
- **One card = one thing.** Never a card inside a card.
- Collection (the home page), Create and People: a **two-column masonry** where each card is as tall as its content, for browsing a big collection like a wall of paper.
- Navigation: a floating bottom tab bar (Collection, People, **+**, Create, Settings) with the forest **+** in the middle.

## Elevation & Depth

Depth comes from soft, offset shadows — never borders. Cards: `0 12px 32px -14px rgba(18,40,26,.25)`. Floating things (tab bar, choice cards): deeper. No 1px outlines, no glows, no glass except the top bar.

## Shapes

Large radii only: 24px cards, 14px buttons, fully round chips and avatars. Choice cards on special moments are **tilted** (−3° and +2.5°) like paper dropped on a table; everything in lists stays straight.

## Components

- **Content cards are typed by content:** photo card (image on top, serif title), quote card (post text in serif with a forest quote mark), plain link card, idea card, person card (round photo, serif name).
- **Capture sheet:** forest full-field, serif question, one white input box, two tilted choice cards. After saving: optional chips and toggles — never a form.
- **Detail sheets:** edit in place. Titles and notes are text you tap into, not boxed fields.
- **Chips** for filters and tags; **segmented control** for status.

## Motion

- Press: scale 0.96–0.98 in 140ms ease-out on everything tappable.
- Sheets slide up in 480ms `cubic-bezier(.22,1,.36,1)`.
- Choice cards drop in with a spring `cubic-bezier(.34,1.56,.64,1)` and straighten when pressed.
- No fade-up on every block, no looping motion. Respect reduced motion (all off).

## Do's and Don'ts

- **Do** keep one input per capture; infer type from what was pasted.
- **Do** let photos and words be the decoration.
- **Do** write warm, short copy ("What did you find today?", "Saved.").
- **Don't** use emoji or unicode glyphs as icons — one stroke icon family, 1.8px.
- **Don't** add eyebrow labels, gradients, borders on cards, or a second accent colour.
- **Don't** tilt cards in lists; tilt is reserved for moments.
- **Don't** add dark mode — light only, by choice.
