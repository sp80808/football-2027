# Controls

FC 26–style scheme: `ControllerFrame` → `PlayerIntent` via `PlayerIntentParser`.

Sources: `src/engine/Intent.ts`, `src/input/controlBindings.ts`, `src/engine/InputSystem.ts`.

## Movement

| Action | Keyboard | Xbox | PlayStation | Touch |
|--------|----------|------|-------------|-------|
| Move | W A S D / arrows | L Stick | L Stick | Virtual stick |
| Sprint | Shift | RT | R2 | — |
| Shield | Ctrl | LT | L2 | — |

## Passing

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Short pass | F, Space | A / × |
| Through ball | R | Y / △ |
| Lob / cross | E + pass | X / □ + pass |
| Driven pass | Shift + pass hold | RB + pass |
| Driven through | Shift + R + pass | LB + RB + Y |

## Shooting

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Normal shot | G, Enter (hold) | B / ○ |
| Finesse | Q + shoot | RB + B |
| Chip | Alt + shoot | LB + B |
| Low driven | Tap shoot within 0.35 s | B + B |
| Power | Full charge, no modifier | Full charge B |

## Dribbling & skills

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Knock-on | Sprint + direction | RT + stick |
| Skill / feint | C | RS flick (C simplified) |

Touch profiles: `cushion`, `push`, `shield`, `knock_on`.

## Defending

| Action | Keyboard |
|--------|----------|
| Standing tackle | T |
| Slide tackle | X, or Shift+T |

## Goalkeeper

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Keeper rush | **V** | **L3** (button 10) |

## Other

| Action | Keyboard |
|--------|----------|
| Switch player | Tab |

Touch: `TouchControls.tsx` merges via `InputSystem.applyTouchOverrides()`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for input flow.
