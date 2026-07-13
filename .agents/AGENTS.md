# Football 2027 Project Customization Rules

These rules are specific to the Football 2027 codebase. AI Coding Agents must follow these guidelines strictly during all development, planning, and debugging tasks.

---

## 1. Package Management & Tooling
* **Package Manager**: Always use `pnpm` for installing dependencies, running scripts, and managing the monorepo workspace. Do not use `npm` or `yarn`.
* **Testing Command**: Run tests using `pnpm test` (running Vitest).
* **Linting Command**: Run `pnpm lint` (`tsc --noEmit`) to verify typescript types.

---

## 2. Architecture & Engine Constraints
* **Deterministic Simulation**: All gameplay logic inside `src/engine/` must be 100% deterministic.
  * Use the custom `SeededRandom` class (`this.random.next()`) for any chance-based logic. Never use `Math.random()`.
* **Zero Allocation Physics**: The tick loop executes 120 times per second. To prevent garbage collection stutter:
  * Do not instantiate new `Vec2`, `Vec3`, array literals, or objects inside `tick()`, `update()`, or helper functions.
  * Use pre-allocated member variables or reset scratch vectors using `.set()`, `.copy()`, `.add()`, `.mul()`.
* **Codebase Decoupling**:
  * Never import Three.js classes or WebGL components into `src/engine/`. The simulation core must be able to run in standard Node.js environments or Web Workers without DOM access.
  * Use the custom `Math.ts` abstractions (`Vec2`, `Vec3`) for physics.

---

## 3. Coordinate Systems
When mapping positions between the simulation engine and the visual layer (Three.js), enforce the following axis mapping:
* Physics $X$ = Three.js $X$
* Physics $Y$ = Three.js $-Z$
* Physics $Z$ = Three.js $Y$

*Pitch Dimensions Reference:*
* Width: $68\text{m}$ (x goes from $-34$ to $+34$)
* Length: $105\text{m}$ (y goes from $-52.5$ to $+52.5$)
* Goal: Width $7.32\text{m}$ (x goes from $-3.66$ to $+3.66$), Height $2.44\text{m}$

---

## 4. Workflows & Verification
1. After making any gameplay engine modification, verify correctness by writing a unit test in the `tests/` directory and running `pnpm test`.
2. Ensure that code changes build successfully via `pnpm build` before marking tasks as completed.
3. Check code type-safety by running `pnpm lint` after any refactor.

---

## 5. Learned (project-specific)

* **Active rendering:** `src/debug/RenderingPanel.tsx` — not `src/legacy/r3f/`.
* **Router:** `App.tsx` — Splash → Main Menu → Quick Match / Career → Gameplay.
* **Career:** Zod + `localStorage` in `src/career/careerStore.ts`.
* **Docs:** [docs/README.md](../docs/README.md), [ARCHITECTURE.md](../docs/ARCHITECTURE.md), [CONTROLS.md](../docs/CONTROLS.md).
