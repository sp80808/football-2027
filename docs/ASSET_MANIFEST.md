# F2027 Asset Manifest

| Asset | Canonical file | Export | Intended use |
|---|---|---|---|
| App mark | `assets/brand/f2027-mark.svg` | `f2027-app-icon-1024.png` | favicon, app icon, HUD watermark |
| Full wordmark | `assets/brand/f2027-wordmark.svg` | `f2027-wordmark-1600.png` | main menu, store/header art |
| Splash concept | `assets/brand/f2027-splash-1920x1080.svg` | matching PNG | boot screen and campaign still |
| UI direction board | `assets/brand/f2027-ui-direction-board.svg` | matching PNG | visual reference for implementation |
| Tokens | `assets/brand/tokens.json` | n/a | code, Figma/Canva reference |

## Rules

- SVG is the source of truth.
- Do not manually redraw the monogram in downstream tools.
- PNG exports use sRGB and transparent backgrounds only where required.
- Team identity assets live separately from the master game brand.
- Every third-party asset requires licence/source metadata before merge.
