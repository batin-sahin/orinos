---
name: Orinos
description: A working field manual for delegated software work.
colors:
  international-orange: "#f04b1f"
  burnt-orange: "#b3360d"
  enamel-stock: "#e7ebe4"
  enamel-surface: "#eef1ea"
  enamel-deep: "#dfe4dc"
  graphite-ink: "#171a18"
  graphite-secondary: "#4a524b"
  graphite-tertiary: "#5c645c"
  rule: "#c3cbc0"
  pine-verified: "#1f6a46"
  brick-failed: "#a52f1c"
  code-field: "#1b1e1b"
  carbon-field: "#171a18"
  carbon-surface: "#1e221f"
  carbon-ink: "#edf0e7"
  carbon-muted: "#98a193"
  carbon-pine: "#6bd49e"
  carbon-brick: "#ff8673"
  on-accent: "#fff"
  mask-ink: "#000"
  terminal-hot: "#ff7a50"
  rail-key-rule: "rgba(255, 255, 255, 0.28)"
  terminal-hover: "rgba(255, 255, 255, 0.06)"
  modal-scrim: "rgba(0, 0, 0, 0.62)"
  approval-scrim: "rgba(0, 0, 0, 0.72)"
  toast-shadow: "rgba(0, 0, 0, 0.22)"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "clamp(2.875rem, 5.2vw, 4rem)"
    fontWeight: 600
    lineHeight: 0.89
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "27px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.64
    letterSpacing: "normal"
  label:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.12em"
  mono:
    fontFamily: "Spline Sans Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "10.5px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  square: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  grid: "88px"
components:
  button-primary:
    backgroundColor: "{colors.international-orange}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.square}"
    typography: "{typography.label}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.burnt-orange}"
    textColor: "#ffffff"
    rounded: "{rounded.square}"
    height: "32px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.square}"
    typography: "{typography.label}"
    padding: "0 12px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.enamel-deep}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.square}"
    height: "32px"
  input-text:
    backgroundColor: "#f4f6f0"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.square}"
    typography: "{typography.body}"
    padding: "0 9px"
    height: "34px"
  nav-rail:
    backgroundColor: "{colors.international-orange}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.square}"
    typography: "{typography.body}"
    width: "288px"
  chip-status:
    backgroundColor: "{colors.enamel-surface}"
    textColor: "{colors.graphite-secondary}"
    rounded: "{rounded.square}"
    typography: "{typography.mono}"
    padding: "1px 4px"
    height: "17px"
  modal-surface:
    backgroundColor: "{colors.enamel-surface}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.square}"
    width: "1040px"
  execution-step:
    backgroundColor: "{colors.enamel-stock}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.square}"
    typography: "{typography.mono}"
    width: "21px"
    height: "21px"
  composer:
    backgroundColor: "{colors.enamel-surface}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.square}"
    width: "928px"
  code-block:
    backgroundColor: "{colors.code-field}"
    textColor: "#e9ede4"
    rounded: "{rounded.square}"
    typography: "{typography.mono}"
---

# Design System: Orinos

## Overview

**Creative North Star: "The Overprint Field Manual"**

Orinos looks like a working document produced by someone who expects to be held to it. The screen is enamel stock, not glass: a cool pale green-grey field with graphite ink, one International Orange rail, and a fine halftone grain that sits on the paper rather than in front of it. The world is printed, measured, and annotated. It is not a console, a cockpit, or a chat product dressed in developer clothing.

The interface is dense because the work is dense. Small machine data sits in Spline Sans Mono beside condensed procedure labels and Barlow prose. One-pixel rules do the structural work; thick borders are reserved for the orange rail, the composer's 2px top edge, and the approval flag. Every screen answers three questions in order: what is running, what was touched, and what needs a decision. The execution spine is the signature move: assistant work accumulates in one continuous vertical trace, with numbered steps and duration ticks that remain after the run finishes.

The tone is flat, factual, and unhurried. Motion is brief and mechanical: a lattice loader, a status pulse, a measured track, a single spark on send. Nothing floats without a reason, nothing glows, and nothing tries to make the agent feel magical. The product earns trust by showing a legible record, not by performing intelligence.

**Key Characteristics:**
- International Orange as a full navigation field, never a gradient or a decorative wash.
- Cool enamel stock, graphite ink, pine for verified, brick for failed.
- Barlow, Barlow Condensed, and Spline Sans Mono; no display system font.
- Square geometry, 1px rules, 2px orange work edges, static grain.
- Continuous execution spine with numbered steps and measured durations.
- Dense operator layout with a 980px reading measure and a 288px rail.

## Colors

The palette is a print-shop system: one saturated ink, one cool stock, and three semantic signal colors.

### Primary
- **International Orange** (#f04b1f): The sidebar field, the composer's 2px top rule, the send key, the approval flag, and selected-step accents. It owns the rail as a full surface, not an accent stripe.
- **Burnt Orange** (#b3360d): Links, hovered primary buttons, focus rings, active step borders, and orange text on pale stock. It is the legible ink version of the rail.

### Secondary
- **Pine Verified** (#1f6a46): Successful tool states, the ready dot, configured keys, and the local-only guarantee. In Carbon it lifts to #6bd49e.
- **Brick Failed** (#a52f1c): Errors, denied or failed tools, missing keys, and destructive actions. In Carbon it lifts to #ff8673.

### Neutral
- **Enamel Stock** (#e7ebe4): The main app field and the paper behind the reading measure.
- **Enamel Surface** (#eef1ea): Modals, composer stock, and assistant content surfaces.
- **Enamel Deep** (#dfe4dc): Sidebar-adjacent panels, list backgrounds, and hover fills.
- **Graphite Ink** (#171a18): Primary text, the wordmark, borders on raised surfaces, and the dark code field.
- **Graphite Secondary** (#4a524b): Body copy, metadata, and secondary controls.
- **Graphite Tertiary** (#5c645c): Micro-labels, placeholder text, and de-emphasized machine data.
- **Rule** (#c3cbc0): Hairline dividers and table borders. **Rule Strong** (#a6b0a3) carries interactive borders and the execution spine.
- **Code Field** (#1b1e1b): Fenced code and tool output, always with #e9ede4 text.
- **Carbon Field** (#171a18), **Carbon Surface** (#1e221f), **Carbon Ink** (#edf0e7), **Carbon Muted** (#98a193): The dark theme's equivalent stock and ink.

### Utility
- **On Accent** (#fff): Hover labels on burnt-orange primary actions.
- **Mask Ink** (#000): The opaque stop in grid and splash mask stencils. It is never visible paint.
- **Terminal Hot** (#ff7a50): Terminal hover border and fill on Carbon.
- **Rail Key Rule** (rgba(255, 255, 255, 0.28)): Keyboard-key borders on the orange rail.
- **Terminal Hover** (rgba(255, 255, 255, 0.06)): Icon-button fill inside the terminal drawer.
- **Modal Scrim** / **Approval Scrim** (rgba(0, 0, 0, 0.62) / 0.72): Carbon's two overlay depths.
- **Toast Shadow** (rgba(0, 0, 0, 0.22)): The toast's lift over the document.

### Named Rules
**The Field Rule.** Orange is either a full surface or a rule of 1–2px. It never becomes a glow, gradient, translucent glass, or decorative side tab.

**The Signal Rule.** Pine and brick describe outcomes; they never decorate a neutral element. Status must also carry a shape, label, or mark so color is not the only channel.

## Typography

**Display Font:** Barlow Condensed (with Barlow, sans-serif)
**Body Font:** Barlow (with ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** Spline Sans Mono (with SFMono-Regular, Consolas, monospace)

**Character:** A condensed grotesque for procedure and display, a quiet humanist grotesque for reading, and a mono face for anything the machine produced. The pairing reads like a technical manual set by someone who cares about the difference between a label and a sentence.

### Hierarchy
- **Display** (600, clamp 46–64px, 0.89): The empty-state headline and splash wordmark. Uppercase, tightly leaded, left-aligned to the working grid.
- **Headline** (600, 27px, 1): Modal titles, settings headers, and approval questions. Uppercase with slight positive tracking.
- **Title** (600, 17–22px, 1.1): Skill detail titles, protocol rows, and provider names. Sentence case in body contexts.
- **Body** (400, 14.5px, 1.64): Assistant prose, settings copy, and descriptions. The reading measure stops at 74ch inside a 980px column.
- **Label** (600, 9–11px, 0.08–0.14em, uppercase): Section titles, field labels, buttons, and status words. Condensed so density does not become shouting.
- **Mono** (400–500, 8–11.5px, 1.55): Paths, model IDs, token counts, durations, commands, and code. Tabular numerals for all measurements.
- **Microtype Ramp** (`--text-*` tokens, 7–56px): The instrument scale in half-step and single-step increments: 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 14.5, 15, 17, 18, 21, 22, 23, 26, 27, 28, 30, 40, 42, 56px. Every literal size in the stylesheet resolves through this ramp; 42/56px are the compact empty-state display only.

**The Microtype Rule.** Dense instrumentation is intentional, but the reading body never falls below 14.5px and prose stays inside the 74ch measure. Half-step sizes are for mono data, labels, and dense controls; they are not a license to shrink assistant or settings copy.

### Named Rules
**The Instrument Rule.** Mono is for data the machine produced or the operator will type. It is never the voice of a marketing line or a decorative "technical" texture.

**The Two-Voice Rule.** A surface gets one condensed display voice and one reading voice. Do not set body copy in condensed type or labels in Barlow at display weight.

## Layout

The desktop shell is a two-column instrument: a fixed 288px orange navigation rail and a fluid main field. The rail carries the 30px mark, the wordmark, a 42px new-chat key, search, a grouped session log, and a status footer. The main field begins with a 56px chat header, then a scrolling transcript on a 980px measure, then a docked composer. The transcript gutter is 104px on wide screens (84px at 1180, 66px at 980) so author labels have a stable column.

The empty state and splash both expose an 88px vertical grid as an armature. It is a working grid, masked at the edges, not a full-page pattern. Sections use 22px vertical padding, 16px internal groups, and 8px micro-gaps. The composer is the densest region: an input register line, a 50px minimum textarea, and a control bar that keeps model, attachments, workspace, auto-approve, and send in one reachable row.

Responsive behavior is desktop-first. At 1180px the rail narrows to 264px and the workspace leaves the header subtitle. At 980px the rail becomes 248px, message gutters tighten, and header action labels collapse to icons. The shipped window has a 980px minimum; below that, the layout can stack the composer and hide non-essential metadata, but the pointer-first layout is not the target.

## Elevation & Depth

The system is flat by default. Depth comes from tonal layering: stock, surface, deep surface, and the dark code field. Hairline rules establish structure without lifting anything off the page. Shadows appear only on things that genuinely float above the work: modals, the command palette, the model popover, the terminal drawer, the toast, and the fatal card. They are soft, offset, and graphite-tinted, never colored halos and never hard offset blocks.

### Shadow Vocabulary
- **Overlay lift** (`0 28px 70px rgba(0, 0, 0, 0.3)`): Settings, skills, and approval dialogs on paper.
- **Popover lift** (`0 18px 44px rgba(23, 26, 24, 0.16)`): Command palette and model picker.
- **Composer seat** (`0 12px 28px rgba(23, 26, 24, 0.07)`): The docked prompt console, just enough to separate it from the transcript.
- **Drawer edge** (`0 -18px 50px rgba(0, 0, 0, 0.28)`): The terminal drawer rising from the bottom.
- **Carbon overlay** (`0 24px 60px rgba(0, 0, 0, 0.45)`): The dark theme's deeper ambient lift.

### Named Rules
**The Flat-By-Default Rule.** If a surface is part of the page, it has no shadow. A shadow means the surface can be dismissed or is physically above the document.

**The No-Glow Rule.** Focus and status use solid color, rules, and shape. There are no zero-offset colored halos or blurred neon edges.

## Shapes

Everything is square. Buttons, inputs, chips, modals, code blocks, avatars, switches, and status marks use a 0px radius. The mark is angular; the only circular forms are icon glyphs and the browser's native scrollbar thumb. Borders are 1px at rest and 2px when a work edge needs emphasis (composer top, terminal top, approval flag). The visual vocabulary is the registration mark, the rule, the tick, and the numbered square.

The app icon carries the same language: an International Orange squircle field with the graphite open-frame mark and a solid center square. The frame is deliberately open at the top-right, matching the in-app wordmark.

## Components

### Buttons
- **Shape:** Square (0px radius), 32px standard height, 27px small.
- **Primary:** International Orange field, graphite ink label, condensed uppercase, 12px horizontal padding. Hover shifts to burnt orange with white text. Disabled primary returns to a neutral deep surface with tertiary ink rather than a faded orange.
- **Secondary:** Transparent field, 1px rule-strong border, graphite label. Hover fills enamel deep.
- **Destructive:** Transparent with a brick border and brick label; hover fills brick with stock text.
- **Focus:** 2px burnt-orange outline with 2px offset, or graphite on the orange rail.

### Chips
- **Style:** 17px-high square chips with 1px rule borders, mono 7.5–8.5px uppercase labels, and no radius. Variants carry semantic border color: orange for built-in, pine for user, rule for project.
- **State:** Chips are labels, not toggles; selected state belongs to the parent row or button.

### Cards / Containers
- **Corner Style:** Square (0px).
- **Background:** Raised dialogs use enamel surface; nested panels use enamel deep; code uses the dark field.
- **Shadow Strategy:** See Elevation. In-page containers are flat.
- **Border:** 1px rule, or 1px graphite ink for a modal that must command attention.
- **Internal Padding:** 12–22px depending on density; modal headers use 18px 22px.

### Inputs / Fields
- **Style:** 34px-high square field on #f4f6f0, 1px rule-strong border, 12.5px Barlow text, 9px horizontal padding.
- **Focus:** Border shifts to burnt orange with a 2px orange-soft ring. The ring is a state cue, not decoration.
- **Error / Disabled:** Errors use brick text and border; disabled controls keep their geometry and drop to tertiary ink. Placeholders use graphite tertiary at full opacity.

### Navigation
- **Rail:** 288px International Orange field with a 1px dark rule on the right. Brand block at 58px, new-chat key at 42px, grouped session rows with a current-position square, and a footer status line.
- **Header:** 56px enamel field, 1px rule bottom, chat title and mono metadata on the left, command palette and icon actions on the right. At 980px labels collapse to icons.
- **Active State:** Session rows get a dark 1px border and a darker field; the current session also carries a 7px square marker.

### Execution Spine
The signature component. Assistant messages in one turn group into a single run. A 1px graphite spine runs down the left of the run, and each tool call is a 21px numbered square on that spine. The step body carries a condensed tool name, a mono summary, a measured duration tick, and an OK/FAILED/RUNNING label with a status mark. The spine persists after the run ends; it is the durable record, not a transient thinking animation.

### Composer
A 1px rule-strong console with a 2px International Orange top edge, an "INPUT / READY" register line, a flexible textarea, and a control bar. The model chip, attachment, workspace, and auto-approve chip are all square. Send is the only filled orange control in the main field; it turns graphite when stopping.

### Code and Tool Output
Fenced code and tool output use the dark code field (#1b1e1b), 1px code rule, 10.5–11.5px Spline Sans Mono, and a pinned "Copy" control. Tool output keeps its own scroll container rather than stretching the transcript.

## Do's and Don'ts

### Do:
- **Do** give the orange rail a full field and keep it free of gradients, glass, and glow.
- **Do** use 1px rules for structure and 2px orange only for the composer, terminal, and approval work edges.
- **Do** keep measurements, paths, model IDs, and commands in Spline Sans Mono with tabular numerals.
- **Do** preserve the continuous execution spine and numbered step order after a run finishes.
- **Do** pair semantic color with a label, mark, or shape so status survives grayscale and color-vision differences.
- **Do** keep the 980px reading measure, 74ch prose limit, and 980px minimum desktop window in mind when adding screens.
- **Do** respect `prefers-reduced-motion`: remove spatial movement, keep static state cues, and never let motion carry meaning alone.

### Don't:
- **Don't** use purple, cyan, neon gradients, glowing orbs, glass panels, or generic centered AI heroes.
- **Don't** introduce rounded cards, pills, or soft-shadowed floating rectangles as page structure.
- **Don't** use gradient text or color as the only indication of success, failure, or selection.
- **Don't** set body copy in condensed type or use mono as a decorative "technical" texture.
- **Don't** add a colored `border-left` or `border-right` above 1px to cards, list items, or alerts.
- **Don't** use hard offset block shadows; the system is printed, not neobrutalist.
- **Don't** use section numbers as decoration. Numbers belong only where the sequence is real, as in the execution spine or numbered protocol rows.
- **Don't** hide the execution trace behind a "show details" control once a run has finished.
