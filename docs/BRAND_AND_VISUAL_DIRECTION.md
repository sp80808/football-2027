# F2027 Brand & Visual Direction

## Positioning

**Football 2027** is a browser-first football simulation and career game built around expressive control, deterministic match logic and visible player progression. The identity should feel like a modern broadcast package fused with a serious football development tool — not a generic esports logo and not a clone of any licensed football title.

## Brand promise

**Build your football story.**

The game should make every match action feel connected to a longer career: the pass, tackle, save or training decision should visibly move a player, squad or club forward.

## Core identity

- **Primary name:** Football 2027
- **Compact name:** F2027
- **Mark:** F27 angular monogram with pitch geometry
- **Tone:** focused, ambitious, technical, energetic
- **Avoid:** imitation club crests, licensed league styling, gold-heavy “ultimate team” cues, neon cyberpunk overload

## Palette

| Token | Value | Use |
|---|---:|---|
| Carbon 950 | `#05080D` | Canvas and splash background |
| Carbon 900 | `#0A111B` | Large panels |
| Panel 800 | `#121C28` | Cards and elevated controls |
| Line 700 | `#243246` | Borders and separators |
| Text Primary | `#F5F8FC` | Headlines and critical values |
| Text Secondary | `#91A2B7` | Labels and supporting copy |
| Electric Blue | `#2F7BFF` | Primary actions, selection and focus |
| Pitch Green | `#22D49B` | XP, success and positive progression |
| Warning | `#FFC857` | charge, stamina pressure and cautions |
| Danger | `#FF5D6C` | errors, cards, destructive actions |

Use gradients only for branded moments, progression rewards and loading states. Core controls remain solid-colour for clarity.

## Typography

Use a condensed or tightly tracked display face for major game moments and a neutral grotesk for interface text. The codebase can begin with system-safe fallbacks and later ship self-hosted fonts.

- Display: `Arial Narrow`, `Inter Tight`, sans-serif
- UI: `Inter`, system-ui, sans-serif
- Data: `JetBrains Mono`, `SFMono-Regular`, monospace

## Logo usage

- Minimum digital mark size: 24 px
- Keep clear space equal to one quarter of the mark width
- Use the mark alone for favicon, HUD watermark, save slots and app icon
- Use the full wordmark for splash, main menu and store imagery
- Do not add outer glows to small UI instances
- Do not recolour the mark using team colours

## Motion language

- Navigation: 120–220 ms, direct and restrained
- Match events: 180–320 ms, directional and readable
- Rewards/level-ups: 420–650 ms, allowed to overshoot once
- Always support reduced motion

## Asset source of truth

Editable SVG files in `assets/brand/` are canonical. PNG files are exports for platforms that cannot consume SVG. Canva and other design tools should import from the canonical SVG/PNG set rather than recreating the mark manually.
