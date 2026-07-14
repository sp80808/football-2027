# Football 2027

**Fast, stylised arcade football with short matches, expressive controls, and long-term mastery.**

Football 2027 is an open-source 3D football game focused on the part that matters most: making every touch, tackle, pass, shot, deflection, and last-second goal feel satisfying.

The target is not a licence-heavy simulation or a menu-heavy management game. The core product is a replayable **3–6 minute match loop** that is easy to understand, difficult to master, and enjoyable immediately with keyboard or controller.

## Product pillars

1. **Instant fun** — kick off quickly, minimal setup, readable rules.
2. **Arcade clarity** — exaggerated motion, strong feedback, bold silhouettes, satisfying impacts.
3. **Mechanical depth** — analog movement, possession pressure, aim, timing, risk/reward actions and team shape.
4. **Short-session replayability** — rematches, modifiers, challenges, unlocks and score chasing.
5. **Deterministic foundations** — reliable simulation suitable for replays, testing and future multiplayer.

## Current prototype

- Fixed-timestep simulation at 120 Hz, separate from rendering.
- Player acceleration, turning and sprinting.
- Independent ball gravity, bounce, friction and velocity.
- Soft-possession system rather than permanently attaching the ball to a player.
- Keyboard and gamepad support.
- Diagnostic HUD.
- Vitest and Playwright test commands.
- Experimental Colyseus server groundwork.

## The first shippable game loop

The first public milestone is deliberately narrow:

> Pick a side, play a fast small-sided match, score through skillful movement and timing, receive a clear result and reward, then restart or rematch in seconds.

### Included

- Small-sided pitch and readable teams.
- Responsive pass, shoot, tackle and sprint actions.
- Strong ball, goal, tackle and near-miss feedback.
- Match clock, score, restart flow and rematch.
- Three difficulty presets with transparent behaviour.
- One polished visual identity.
- Local play against AI; local versus where practical.
- Lightweight post-match progression and challenges.

### Deferred until the loop is fun

- Career mode.
- Create-a-club depth.
- Transfer markets.
- Large training academies.
- Live-service systems.
- Extensive narrative content.
- Ranked online multiplayer.
- Large stadium and cosmetic catalogues.

These are not cancelled. They are gated behind proof that the core match is enjoyable.

## Development

### Requirements

- Node.js 22 recommended.
- npm.

```bash
npm install
npm run dev
```

The development server runs on `http://localhost:3000`.

### Quality checks

```bash
npm run lint       # TypeScript type-check
npm run test       # Vitest
npm run test:e2e   # Playwright
npm run build      # Production Vite build
npm run preview    # Verify production build locally
```

Vite transpiles TypeScript but does not perform full type-checking during its transform step, so `npm run lint` should be run before a pull request.

## Architecture

See [`docs/CURRENT_ARCHITECTURE.md`](docs/CURRENT_ARCHITECTURE.md) for the current simulation and rendering boundaries.

The project uses React, TypeScript, React Three Fiber, Three.js, Zustand, Vitest and Playwright. Simulation changes should remain deterministic and should not be coupled directly to render frame rate.

## Contributing

Contributions are welcome from programmers, technical artists, game designers, sound designers, testers and documentation writers.

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). Good first contributions include:

- controller feel and input tests,
- ball/goal/tackle feedback,
- accessibility and remapping,
- deterministic simulation tests,
- simple AI behaviours,
- performance profiling,
- documentation and setup fixes,
- stylised low-poly assets with clear licensing.

Please avoid implementing major career or management systems before discussing them in an issue. The current priority is one excellent match loop, not maximum feature count.

## Roadmap

### Milestone A — Fun in 60 seconds

A new player can launch, understand the controls, complete a match and choose rematch without reading external documentation.

### Milestone B — Ten-match depth

The game remains interesting across ten consecutive matches through opponent behaviours, player expression, challenge variation and progression.

### Milestone C — Public arcade alpha

Stable browser build, contributor documentation, issue labels, test coverage for core rules, feedback capture and a public playtest.

## Licence and assets

Code contributions must be compatible with the repository licence. Do not add proprietary football branding, club marks, player likenesses, unlicensed audio, or assets without a clear redistribution licence.
