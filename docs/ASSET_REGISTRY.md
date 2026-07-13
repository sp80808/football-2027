# Asset Registry

Tracks all external assets used or planned for football-2027.
Include this file in every attribution review. Update when assets are added or removed.

---

## Status Key
- ✅ Integrated
- 🔜 Planned / infrastructure ready
- ⏸ Deferred
- ❌ Rejected

---

## Characters & Animations

| Asset | Source | Licence | Format | Status | Attribution Required |
|-------|--------|---------|--------|--------|---------------------|
| Universal Animation Library | quaternius.com | CC0 | GLB | 🔜 | No |
| KayKit Character Animations | kaylousberg.itch.io | CC0 | GLB | 🔜 | No |
| Kenney Animated Characters | kenney.nl | CC0 | GLB | 🔜 (fallback) | No |
| glTF Rigged Figure (BrainStem) | github.com/KhronosGroup/glTF-Sample-Assets | CC-BY 4.0 | GLB | ⏸ test only | YES — "Khronos glTF Sample Assets, CC-BY 4.0" |

## Planned Asset Placement

```
public/
  assets/
    characters/
      player.glb          ← Quaternius / KayKit skinned mesh + animations
      keeper.glb          ← Same mesh, different kit colour (re-colour via material)
    animations/           ← Separate clip GLBs if retargeting from a different rig
      idle.glb
      jog.glb
      sprint.glb
      kick.glb
      dive_left.glb
      dive_right.glb
    pitch/
      grass_diffuse.png   ← Procedural or Kenney grass texture
```

## Animation Clip Name Map

See `src/engine/AnimationState.ts` → `PLAYER_CLIP_NAMES` and `KEEPER_CLIP_NAMES`.
Update these maps when actual clip names are known from the GLB inspection.

```bash
# Inspect clip names in a GLB:
npx gltfjsx public/assets/characters/player.glb --output /dev/null --types
```

---

## Environment & Pitch

| Asset | Source | Licence | Status |
|-------|--------|---------|--------|
| Pitch shader | Custom (Pitch.tsx) | Proprietary | ✅ |
| Skybox | Three.js Sky procedural | MIT | ✅ |

---

## UI

| Asset | Source | Licence | Status |
|-------|--------|---------|--------|
| Lucide icons | lucide.dev | ISC | ✅ |

---

## Libraries (see OPEN_SOURCE_AUDIT.md for full detail)

| Library | Licence | Status |
|---------|---------|--------|
| Three.js | MIT | ✅ |
| Yuka | MIT | ✅ |
| leva | MIT | ✅ |
| React / react-dom | MIT | ✅ |
| @react-three/fiber | MIT | Present, deferred |
| @react-three/drei | MIT | Present, deferred |
| Vite | MIT | ✅ |
| Vitest | MIT | ✅ |

---

## Procurement Checklist (before adding any new asset)

1. Confirm licence (CC0 or MIT preferred; CC-BY acceptable with attribution).
2. Add row to this table.
3. If attribution required, add to `public/ATTRIBUTIONS.txt`.
4. Run `@gltf-transform/cli` prune + compress pipeline.
5. Verify final file size against budget (≤500 KB per character GLB).
6. Add loading fallback path in consuming component.
