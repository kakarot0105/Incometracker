# Income Tracker DESIGN.md

## 1. Visual Theme & Atmosphere

Income Tracker should feel like a calm freelance finance cockpit: warm, trustworthy, and highly legible. The interface lives on an ivory background with soft green and amber light, pairing grounded finance cues with a more human and approachable tone than a cold institutional dashboard.

The closest inspirations are:
- Wise for warm light surfaces, optimistic green accents, and rounded confidence.
- Coinbase for financial clarity and trust.
- Linear for disciplined spacing, hierarchy, and restraint.

This is not a dark fintech product and not a consumer-marketing rainbow app. It should feel premium, organized, and quietly energetic.

## 2. Color Palette & Roles

### Primary
- Deep Pine: `#173229`
  Use for navigation shell, primary buttons, strong headings, chart bars.
- Soft Lime: `#a7ef8a`
  Use for active states, success accents, highlighted pills, and key emphasis.
- Warm Ivory: `#fcfaf6`
  Use for page background and spacious canvas.

### Secondary
- Mist White: `rgba(255,255,255,0.92)`
  Use for elevated cards and dialogs.
- Soft Sage: `#5a6d61`
  Use for secondary text and explanatory copy.
- Sand Glow: `rgba(239,193,119,0.18)`
  Use as a subtle ambient accent, never as a primary UI fill.

### Semantic
- Success: `#1d4427`
- Warning: `#8a4d36`
- Error: `#c35f47`
- Border: `rgba(46,70,56,0.11)`

## 3. Typography Rules

### Font Families
- Display: `Outfit`
- Body/UI: `Manrope`

### Hierarchy
- Hero/Page title:
  Outfit, 600, very tight tracking, line-height near `0.92`
- Section title:
  Outfit, 600, compact but readable
- Body:
  Manrope, 400-600, generous line-height
- Micro labels / eyebrow text:
  Manrope, 700, uppercase, high tracking

### Principles
- Headlines should feel clean and sculpted, not heavy or blocky.
- Numeric values should feel stable and dashboard-like; prefer tabular numerals.
- Avoid mixing too many text weights. Use contrast through scale and spacing first.

## 4. Components

### Buttons
- Primary buttons:
  Deep Pine background, ivory text, pill radius, subtle lift on hover.
- Secondary buttons:
  Soft Lime background with pine text.
- Outline buttons:
  White-glass surface, soft border, dark text.

### Cards
- Rounded, soft, lightly elevated.
- Use translucent white or ivory glass surfaces over the warm page background.
- Large dashboard cards can use richer contrast or dark pine gradients.

### Inputs and Selects
- Rounded 2xl corners.
- White-glass fill with soft border.
- Focus states should use a visible lime ring.

### Navigation
- Desktop sidebar should feel like a premium workspace rail.
- Use a dark pine shell with soft lime active pills.
- Mobile header should be translucent and compact.

### Charts
- Clean, minimal, and not overly colorful.
- Default chart fill should be Deep Pine.
- Grid lines should be faint and quiet.

## 5. Layout Principles

- Use wide breathing room and generous card padding.
- Favor floating panels rather than edge-to-edge boxes.
- The page should feel layered through contrast and blur, not through heavy shadows.
- Keep the maximum content width controlled so dashboards stay readable.

## 6. Elevation & Depth

- Page depth comes from warm gradients and soft radial light.
- Cards use subtle blur plus inset top highlights.
- Avoid harsh black shadows or overly glossy effects.

## 7. Do

- Keep the UI warm, structured, and finance-friendly.
- Use lime accents intentionally for activity, success, and emphasis.
- Let large numbers and titles breathe.
- Preserve clarity over ornament.

## 8. Do Not

- Do not introduce loud multicolor accents.
- Do not use flat gray enterprise styling.
- Do not make every surface pure white.
- Do not use sharp corners for primary surfaces or CTAs.
- Do not overload dashboards with competing highlight colors.

## 9. Prompt Guide

When generating new UI for Income Tracker:

- Use a warm ivory canvas with soft green and amber ambient light.
- Use deep pine for the strongest interactive and structural elements.
- Use pill buttons, rounded cards, and glass-like panels.
- Make headings feel editorial and compact with Outfit.
- Make body copy and controls feel calm and readable with Manrope.
- Treat the product like a polished tool for freelancers, not a bank homepage and not a startup landing page.
