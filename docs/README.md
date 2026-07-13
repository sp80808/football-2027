# Football Engine 2027 - Documentation Index

## Overview
This documentation covers the Football Engine 2027 project - a real-time football simulation with realistic physics, tactical AI, FIFA rules compliance, and real-world data integration.

## Table of Contents

### Architecture & Design
1. [Current Architecture](CURRENT_ARCHITECTURE.md) - System overview and file responsibilities
2. [Development Roadmap](DEVELOPMENT_ROADMAP.md) - 30-week phased development plan
3. [Rendering Architecture](RENDERING_ARCHITECTURE.md) - Graphics pipeline and shaders
3. [Performance Budget](PERFORMANCE_BUDGET.md) - Simulation and rendering targets
4. [WASM Architecture](WASM_ARCHITECTURE.md) - WebAssembly simulation core

### Core Systems
5. [Physics Engine](docs/PHYSICS_ENGINE.md) - Ball physics, player locomotion, collisions
6. [Tactical AI](docs/TACTICAL_AI.md) - Role-based AI, team coordination, decision making
7. [FIFA Rules Engine](docs/FIFA_RULES.md) - Offside, fouls, set pieces, VAR
8. [Match Management](docs/MATCH_MANAGEMENT.md) - Game flow, phases, celebrations

### Data & Content
9. [Data Pipeline](docs/DATA_PIPELINE.md) - Real-world data ingestion and processing
10. [English Football Data](docs/ENGLISH_FOOTBALL_DATA.md) - League structure, player attributes, competitions
11. [Career Mode](docs/CAREER_MODE.md) - Transfers, scouting, training, board objectives

### Rendering & Graphics
12. [Advanced Rendering](docs/ADVANCED_RENDERING.md) - Dynamic grass, stadium, crowd, effects
13. [Player Rendering](docs/PLAYER_RENDERING.md) - Skeletal animation, cloth, materials
13. [Post-Processing](docs/POST_PROCESSING.md) - Bloom, DOF, motion blur, color grading

### Development
14. [Testing Strategy](docs/TESTING.md) - Unit, integration, regression, visual
15. [Performance Optimization](docs/PERFORMANCE.md) - Object pooling, spatial hashing, WASM
16. [WASM Migration](docs/WASM_MIGRATION.md) - Rust port, SharedArrayBuffer, Web Workers

### Reference
17. [API Reference](docs/API_REFERENCE.md) - TypeScript interfaces and classes
17. [SimulationConfig](docs/SIMULATION_CONFIG.md) - All tunable constants
18. [FIFA Compliance Matrix](docs/FIFA_COMPLIANCE.md) - Law-by-law implementation status
19. [Glossary](docs/GLOSSARY.md) - Technical terms and abbreviations

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Type check
npm run lint

# Build for production
npm run build
```

---

## Key Concepts

### Fixed-Timestep Simulation
- **120 Hz** fixed timestep for deterministic physics
- Accumulator pattern with spiral-of-death protection
- State interpolation for smooth rendering at any frame rate

### Entity-Component Architecture
- `GameEngine` - Central simulation coordinator
- `Ball`, `Player`, `Keeper`, `Opponent` - Entity classes
- `TacticalAI` - Role-based AI controllers
- `Referee` / `OffsideDetector` - Rules enforcement

### Deterministic Replay
- Seeded RNG for reproducible simulations
- Ring buffer stores last 5 seconds of state
- Frame-perfect replay with scrubbing

### Data-Driven Design
- All constants in `SimulationConfig`
- Real-world data mapped to game attributes
- Position-specific attribute templates

---

## File Structure

```
src/
├── engine/
│   ├── physics/           # Ball, collision, player physics
│   ├── ai/                # TacticalAI, role controllers
│   ├── rules/             # Offside, fouls, referee, VAR
│   ├── career/            # Career mode systems
│   ├── Ball.ts            # Enhanced ball physics
│   ├── Player.ts          # Player entity with AI
│   ├── Opponent.ts        # AI opponent
│   ├── Keeper.ts          # Goalkeeper AI
│   ├── Referee.ts         # Central rule authority
│   ├── MatchManager.ts    # Game flow management
│   ├── SimulationConfig.ts # All constants
│   └── ...
├── rendering/
│   ├── shaders/           # Grass, skin, cloth shaders
│   ├── postprocessing/    # Bloom, DOF, motion blur
│   ├── AdvancedRendering.ts
│   └── RendererFactory.ts
├── scene/
│   ├── stadium/           # Modular stands, roof
│   ├── crowd/             # Impostor crowd system
│   ├── createPitch.ts     # Pitch generation
│   ├── createCharacters.ts # Procedural models
│   └── effects.ts         # Trails, celebrations
├── components/
│   ├── PlayerView.tsx     # Skeletal animation
│   ├── BallView.tsx       # Spin visualization
│   ├── Pitch.tsx          # Shader-based pitch
│   └── ...
├── screens/
│   ├── CareerScreen.tsx
│   ├── TransferScreen.tsx
│   └── ...
├── store/
│   └── gameStore.ts       # Zustand state management
├── data/
│   ├── FootballDataPipeline.ts
│   └── ...
└── tests/
    ├── physics.test.ts
    ├── simulation.test.ts
    └── advanced.test.ts
```

---

## Development Workflow

### Adding New Physics Feature
1. Modify `Ball.ts` or `Player.ts`
2. Add constants to `SimulationConfig.ts`
2. Add unit tests in `tests/physics.test.ts`
3. Update `docs/PHYSICS_ENGINE.md`

### Adding New AI Behavior
1. Create role controller in `src/engine/ai/`
2. Register in `TacticalAI.ts` factory
3. Add to `ROLE_ATTRIBUTE_TEMPLATES`
4. Add integration tests
5. Update `docs/TACTICAL_AI.md`

### Adding FIFA Rule
1. Create detector in `src/engine/rules/`
2. Register in `Referee.ts`
2. Add to `MatchManager.ts` flow
3. Update `docs/FIFA_COMPLIANCE.md`

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD)
4. Implement feature
5. Run tests: `npm run test`
6. Type check: `npm run lint`
7. Submit PR

---

## License

Apache-2.0 - See [LICENSE](../LICENSE) for details.

---

## Acknowledgments

- FIFA Laws of the Game
- StatsBomb / FBref for data schemas
- Three.js community for rendering techniques
- Game AI research papers for tactical models