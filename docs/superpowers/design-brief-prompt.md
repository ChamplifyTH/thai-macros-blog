# Design brief: thai-macros-blog visual identity

## Context

`thai-macros-blog` is a bilingual (Thai/English) recipe site — a sister
product to **AI Auang**, a Thai fitness LINE bot. Every recipe shows full
macros (calories/protein/carbs/fat). It should feel like it belongs to the
same family as AI Auang, not like an unrelated brand — but calmer, since a
recipe site is browsed and lingered on, not glanced at mid-workout.

## Reference: AI Auang's current visual identity

Pulled directly from the live product (`dashboard.html`):

```css
--bg-0: #05080f;      /* base background */
--bg-1: #080d18;
--bg-2: #0d1525;
--bg-3: #121b30;       /* card/section surface */
--line: rgba(255,255,255,0.08);
--fg: #e8ecf3;         /* primary text */
--fg-dim: #8a93a6;     /* secondary text */
--fg-faint: #4d566b;   /* tertiary/label text */
--green: #00ff88;      /* primary accent — high-saturation neon */
--amber: #f5a623;      /* secondary/semantic accent */
--mono: 'JetBrains Mono';        /* data/numbers */
--sans: 'IBM Plex Sans Thai';    /* body/UI text */
```

Character: near-black background, high-contrast neon-green accent, monospace
for anything numeric (macros, stats), built for a dashboard glanced at
quickly — energetic, slightly clinical, optimized for legibility at a glance
over a long browsing session.

## The ask: same family, dialed down

Keep the bones — dark ground, green-forward accent family, monospace for
numbers, the general "data-forward fitness product" feel — but soften it for
a context where someone is reading ingredient lists and steps, not scanning
a stat screen mid-workout:

- **Lower the accent's saturation/luminance.** `#00ff88` at full intensity
  reads as an alert or a UI state, not a brand color to sit with for minutes
  at a time. Shift toward a deeper, less electric green — still clearly
  related, less retina-searing next to food photography.
- **Reduce background/foreground contrast slightly.** The dashboard is
  built for quick glances; this site is built for lingering. A touch more
  gray in the near-black, a touch less pure white in the text, so long
  reading is comfortable.
- **Keep monospace for macros specifically** (this is the strongest visual
  through-line to AI Auang — numbers should still read as "data," not
  decoration) but let dish titles and body text breathe in a warmer,
  less-clinical typeface than the dashboard's all-business `IBM Plex Sans
  Thai` — the food itself should feel inviting even while the numbers stay
  precise.
- **Amber (`#f5a623`) can stay closer to full strength** as a secondary/
  semantic accent (e.g. calorie emphasis) — it's already warmer and less
  aggressive than the green, and ties to food (turmeric, chili) naturally.

## What this site specifically needs from the palette/type system

- Bilingual: every screen shows Thai and English simultaneously or via a
  toggle — whatever type choices are made must have real Thai-script
  support at every weight used, not just a Latin-only display face with a
  Thai fallback bolted on.
- Recipe cards: photo, title (TH + EN), and a tight macro strip (4 numbers)
  — the macro strip is the one element that should look most like it
  belongs on the AI Auang dashboard.
- Recipe detail page: a macro summary panel is the first thing under the
  title (numbers-first, matching AI Auang's own "real numbers first"
  coaching rule), then ingredients, then numbered steps.
- No long-form blog-post styling needed — every page is a structured
  recipe, not an essay layout.

## Deliverable

A revised token system (color, type, spacing) and a mockup of the browse/
filter page and the recipe detail page, applying it — same structure already
validated (see the existing mockup this brief supersedes), new palette/type
only.
