# Junior Astronaut Mission Trainer

> **An interactive mission-engineering laboratory disguised as a game.**
> NASA International Space Apps Challenge 2026 · Challenge: *Build a Junior Astronaut Mission Trainer* · Team **Grupo IV**

Students command a small outpost at the lunar south pole. They pack a lander with a limited mass budget, keep a crew of four alive through terrain shadows and solar storms, make decisions with real trade-offs, and get an explanation of *why* their mission succeeded or failed.

## The problem

Space STEM content tends to fall into one of two traps. Either it oversimplifies the engineering trade-offs that decide whether a real mission lives or dies, or it presents them at a level too complex to hold a young learner's attention.

## Our solution

A browser game where **the simulation is the game**. Every number has a physical meaning and, where one exists, a NASA source:

| You manage | Grounded in |
|---|---|
| Oxygen: 0.84 kg per astronaut per day | NASA Life Support BVAD |
| Water: 3.5 kg per astronaut per day, 93% recycled | NASA BVAD, ISS Water Recovery System |
| Electrolysis: 1.125 kg water → 1 kg O₂ | stoichiometry of 2 H₂O → 2 H₂ + O₂ |
| Radiation: 1.37 mSv/day on the surface; 250 mSv limit | Chang'e-4 LND measurements, NASA-STD-3001 |
| Solar storms (NOAA S3/S4) and regolith/water shielding | NOAA SWPC scales, lunar radiation research |
| Batteries: 240 Wh/kg | NASA space power roadmap |
| Polar illumination and terrain shadows | Artemis south-pole landing regions |

Full list with sources: [`docs/science.md`](docs/science.md) and [`src/data/science.json`](src/data/science.json).

## Gameplay

```text
MAIN MENU → MISSION SELECT → BRIEFING → PACK THE LANDER → MOON OUTPOST
   → DAILY OPERATIONS → EVENT → DECISION → CONSEQUENCE → MISSION RESULT → ANALYSIS → RETRY
```

1. **Plan and build.** Choose solar arrays, batteries, a water recycler, an oxygen generator, a greenhouse, a radiation shelter, supply tanks and spare parts. You have a lander mass budget and limited storage space. A live forecast runs the real simulation to show what your loadout can do.
2. **Operate.** Advance day by day in the 3D outpost. Watch power, water, oxygen, food and radiation dose. Switch systems on and off, and repair broken ones.
3. **Decide.** Solar storms, dust on the arrays, leaks, equipment failures and crop disease interrupt the mission. Every option has a benefit and a cost, and there is no always-correct answer.
4. **Learn.** Every event explains *What? Why? Engineering principle*. Every decision shows its *Consequence*. The mission report names the decisions that contributed to the outcome, shows charts of the whole mission, and suggests alternatives.

Two missions:

- **First Light at Shackleton** (Cadet, 12 days): one solar storm and one shadow period.
- **Artemis Base Camp** (Commander, 28 days): storage can't hold four weeks of supplies, so you must close the loop. It has two storms, the second severe, and a very dark shadow period.

## Architecture

```text
NASA / scientific sources → Python (offline validation) → JSON → TypeScript simulation engine
                                                                     │
                                                         ┌───────────┴───────────┐
                                                      React UI                Three.js
```

- `src/game/` is the simulation engine, pure TypeScript with no React or Three.js. It is deterministic (seeded) and fully testable.
- `src/data/` holds missions, buildings, events and science parameters as JSON.
- `src/components/` contains the React screens, HUD, decision panels and mission analysis.
- `src/three/` contains the Three.js scene, which draws a `SceneModel` derived from the simulation state.
- `tools/science/` holds the offline Python validation of parameters and data integrity.

Details: [`docs/architecture.md`](docs/architecture.md).

## Technologies

React 19 · TypeScript · Vite · Tailwind CSS 4 · Three.js · Vitest · Python 3 (offline tooling). No backend: everything runs in the browser.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine unit tests + balancing
npm run balance    # Monte-Carlo balancing report (300 runs per strategy)
npm run build      # production build in dist/
python3 tools/science/validate_parameters.py   # science & data checks
```

## Documentation

- [`docs/PRD.md`](docs/PRD.md): product requirements
- [`docs/architecture.md`](docs/architecture.md): architecture and responsibility boundaries
- [`docs/game-design.md`](docs/game-design.md): mechanics, events, balancing
- [`docs/science.md`](docs/science.md): scientific parameters and sources
- [`docs/development.md`](docs/development.md): workflow, Git, Definition of Done
- [`docs/backlog.md`](docs/backlog.md): product backlog and epics

## Team: Grupo IV

| Member | GitHub | Role |
|---|---|---|
| Emanuel Carneiro dos Santos | [@sw-_-wanted](https://github.com/sw-_-wanted) | Team Owner |
| José Simão Tala | [@ixmjst](https://github.com/ixmjst) | Team Member |
| Líria Djenaba Vilança Bá | [@liriali4](https://github.com/liriali4) | Team Member |
| Carlos Tchípia | [@carlos_tchipia](https://github.com/carlos_tchipia) | Team Member |
| Lietson dos Santos | [@liets0n](https://github.com/liets0n) | Team Member |

## Demo

Public deployment (Vercel): *to be published*.

> *"Now I understand why keeping a space mission alive is an engineering problem."* This is the product's north star.
