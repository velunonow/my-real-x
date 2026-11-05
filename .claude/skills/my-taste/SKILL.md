---
name: my-taste
description: My personal design taste for any UI I build — light, card-based, few inputs, serif headlines, one signature colour used boldly at special moments, physical motion. Use whenever designing, redesigning, styling or reviewing a web or app interface for me, or when creating a DESIGN.md. Not for backend-only work.
---

# My taste

I'm not a professional designer. I know what I like when I see it. These rules describe it so you don't have to guess. A project's own `DESIGN.md` (exact colours, fonts, sizes) and `PRODUCT.md` (who it's for, what it does) override the defaults here. These principles still apply.

## The vibe in one line

A quiet, light room full of physical cards, and **one bold colour** that shows up when something matters. Think of the feel of mymind, not its exact look.

## 1. Fewer inputs (my #1 rule)

- **One box for everything.** Capture gets one input. Work out the type from what was pasted (link, text, profile), and show what you understood in a short hint.
- **Choice cards instead of forms.** When there are options, show 2–4 big tappable cards, not dropdowns and fields.
- **Progressive disclosure.** Ask only what's needed to save. Tags, notes and status come *after* saving, as optional chips and toggles.
- **Edit in place.** A title is text you tap into, not a labelled box. No separate "Edit" screen.
- Never a modal with more than two fields. If you need more, the design is wrong.

## 2. Card-style units

- **One card = one thing** (a post, a person, an idea), with its own actions. Never a card inside a card.
- **Cards are typed by their content.** A photo card shows its photo, a quote card shows the words large in serif, a person card shows a round photo. Don't force everything into one template.
- Lists of many things: a **two-column masonry** of mixed cards on phones. Focus views: one column, one thing at a time.
- Depth comes from **soft offset shadows**, not borders. Large radii (cards ~24px, buttons ~14px, chips fully round).

## 3. Colour

- **Light mode only.** Background is a soft off-white with a slight tint, never pure white and never yellow-cream. Cards are white.
- **One signature colour**, chosen per project (this project: forest green). Use it for the main action, and as a **full colour field** at special moments: capture, success, "done for today".
- A near-black is allowed as a second contrast (one dark card beside a white one).
- Everything else is ink and grays. No gradients, no second accent, no glows.
- Text contrast ≥ 4.5:1, including small gray labels. Check it.

## 4. Type

- **Serif for content, sans for controls.** Serif for page titles, card titles, quotes, prompts and choice cards. A clean system sans for buttons, chips, labels and numbers.
- Big serif headlines with tight letter-spacing (about −0.03em). Five sizes, far apart.
- Tabular numbers for counts and timers.

## 5. Motion: physical, not decorative

- Everything tappable presses down slightly (scale ~0.97, ~140ms).
- Sheets slide up from the bottom with a smooth ease-out.
- At special moments, cards **drop in tilted** (−3° / +2.5°) with a spring and straighten when pressed. Lists never tilt.
- No fade-up on every block, nothing that loops. Respect reduced motion.

## 6. Words

- Warm, short, human: "What did you find today?", "Saved.", "That's enough reading for today."
- Buttons say what they do ("Make from this", not "Submit").
- Empty states teach the next step in one sentence.

## 7. Never (the "looks AI-made" list)

Emoji or unicode symbols as icons (use one stroke-icon family) · purple or blue gradients · gradient text · borders around every card · tiny uppercase "eyebrow" labels above headings · numbered section markers (01, 02) · glassy blurred panels everywhere · three identical feature cards with icons · "Get started" / "Learn more" / "unlock" / "seamless" copy · dropdowns where chips would do · icons that look like another app's logo.

## How to work

1. Read `PRODUCT.md` and `DESIGN.md` if they exist. If `DESIGN.md` is missing, ask me **at most 4 visual questions** (signature colour, special moments, serif or not, photos). Offer a recommendation for each, then write `DESIGN.md` in the Google DESIGN.md format: YAML tokens followed by prose sections in order (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts).
2. Build from the tokens. Put the CSS variables in one place and keep them in sync with `DESIGN.md`.
3. **Look at it.** Take phone-width screenshots (390px) of every main screen and of each special moment. Check against the checklist below, fix everything in one pass, then look once more.
4. When I'm unsure what I want, **show, don't ask**: build 2–3 small live variants side by side, or a tap-to-choose quiz, instead of asking me to describe a style.

## Checklist before showing me

- [ ] Every capture flow needs one input; everything else is optional and comes after saving.
- [ ] One card = one thing; no nested cards; card types match their content.
- [ ] One signature colour, used for the main action and the special moments only.
- [ ] Serif for content, sans for controls; contrast ≥ 4.5:1.
- [ ] Press feedback on everything tappable; tilt only at special moments; reduced motion respected.
- [ ] Nothing from the "Never" list.
- [ ] Phone width works: 16px gutter, no sideways scroll, the bottom bar doesn't cover actions.
