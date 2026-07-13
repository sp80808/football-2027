# Source and Licence Audit

## Overview
This document tracks inspirations, forks, and licenses used in the architecture of this engine.

### Reference Implementations
1. **`modelence/open-soccer`**
   - **Concepts Used:** Input charge-and-release, fixed 2D loop + pseudo-3D render mapping.
   - **Note:** Original source license unclear. No direct code was copy-pasted; architectures were rewritten from scratch to avoid license contamination.
2. **`Google Research Football` (GRF)**
   - **Concepts Used:** Observations, Action Space theory.
   - **Note:** GRF runs on C++ / Python. It is not bundled in this browser application. Policies derived from GRF may be loaded via JSON in the future.
3. **`GameplayFootball`**
   - **Concepts Used:** Physics-first approach to locomotion and ball handling.
   - **Note:** C++ engine, used purely as a conceptual study.

### Current Dependencies
- `react`, `react-dom` (MIT)
- `three`, `@react-three/fiber`, `@react-three/drei` (MIT)
- `vite`, `tailwindcss` (MIT)
- `vitest` (MIT)

All currently executing code has been written by the AI Studio agent and is free of third-party IP contamination.
