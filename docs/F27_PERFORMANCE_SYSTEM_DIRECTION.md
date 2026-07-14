# F27 Performance System Direction

Status: approved visual-development reference, 14 July 2026.

## Purpose

Use the generated F27 concept board as a direction-setting artefact for the next UI and brand pass without treating generated imagery as shipping content.

## Keep

- `F27` as the compact shorthand alongside the full `Football 2027` title
- dark navy and near-black stadium-led surfaces
- fluorescent progress green for primary actions, progression and focus
- condensed sports-display typography paired with a legible UI sans
- left-rail career navigation and a focused content panel
- short football language: `Career`, `Kick Off`, `Training`, `Continue Career`
- gate-based roadmap presentation tied to playable outcomes

## Do not ship directly

- generated footballer or stadium imagery
- third-party-looking broadcast graphics
- unlicensed club, league or competition marks
- neon green on every control
- dense always-on HUD panels that obscure live play

## Relationship to the existing system

This direction refines rather than replaces the existing Forward Pitch work:

- `Football 2027` remains the full product name
- the current deterministic simulation and raw Three.js presentation architecture remain authoritative
- the vertical-slice issue remains the delivery gate
- approved visual elements must be recreated as owned vectors, CSS tokens and original components

## Immediate implementation sequence

1. Validate `F27` compact mark at 16, 32, 64 and 256 px.
2. Add a compatibility token set for the performance-green direction without deleting the existing cyan/green semantic split.
3. Prototype the splash and main-menu composition using owned assets only.
4. Apply the compact mark to the scorebug watermark and loading state.
5. Build the Basic club creator and career hub before expanding visual scope.
6. Verify keyboard, controller, pointer, reduced motion and 1366×768 layouts.

## Acceptance gate

The visual pass is successful only when it helps a new player move through:

`launch → create club → career hub → first fixture → post-match progression → career hub`

without adding friction, obscuring the pitch or destabilising build performance.
