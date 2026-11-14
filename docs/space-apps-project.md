# Junior Astronaut Mission Trainer

**A Mission Engineering Simulator for young students**

NASA International Space Apps Challenge 2026 · Challenge: *Build a Junior Astronaut Mission Trainer* · Team: **Grupo 4**

## Project Overview

Junior Astronaut Mission Trainer is a browser-based simulator in which students command a small outpost at the lunar south pole. They pack a lander under a fixed launch-mass budget, then keep a crew of four alive through terrain-shadow periods, solar storms, leaks and equipment failures. Every parameter that drives the simulation is traced to a published source, a derived calculation or an explicitly labelled game-design choice.

Target audience: young students (target age range: **[TO BE PROVIDED]**). The game is available in English and Portuguese (pt-PT).

## Problem

Space-mission engineering is a sequence of trade-offs: launch mass against supplies, batteries against shielding, recycling hardware against stored consumables. These trade-offs are usually taught through charts and reports, which show results but not the decisions that produce them. Students rarely experience *why* a mission design succeeds or fails, or how scientific data (crew consumption, radiation environment, solar illumination) constrains real engineering choices.

## Solution

A short, replayable simulation in which students make the engineering decisions themselves and see the consequences:

- **Engineering under constraints.** Every structure and supply crate has a mass; the lander has a fixed budget.
- **Data-grounded consequences.** Oxygen, water, food, power and radiation dose evolve day by day according to documented parameters (see [Scientific Data and References](#scientific-data-and-references)).
- **Learning from outcomes.** At the end of each mission, the game explains which decisions contributed to success or failure, shows charts of supplies and radiation dose, and suggests what to try differently.
- **Accessible by design.** Contextual glossary for scientific terms (mSv, kWh, regolith, electrolysis), a skippable guided tutorial, optional sound with a visual equivalent for every cue, and a bilingual interface.

## Mission Gameplay

### Missions

| Mission | Difficulty | Crew | Duration | Launch-mass budget | Scheduled hazards |
|---|---|---|---|---|---|
| First Light at Shackleton (Shackleton crater rim) | Cadet | 4 | 12 days | 3,600 kg | Solar storm (NOAA S3) on day 5; terrain shadow on days 8–10 |
| Artemis Base Camp (Shackleton–de Gerlache ridge) | Commander | 4 | 28 days | 6,000 kg | S3 storm on day 10; severe storm (NOAA S4) on day 22; two shadow periods |

Both missions also include random events (power loss from dust on solar arrays, water leaks, equipment failures, crop failures).

### Mission flow

1. **Mission selection and briefing.** The student chooses a mission and reads its story, objectives, hazards and a planning tip.
2. **Loadout (mission engineering).** The student packs the lander within the mass budget, choosing from:
   - structures: solar arrays, batteries, water recycler, oxygen generator (electrolysis), greenhouse and radiation shelter;
   - cargo: water tanks, oxygen tanks, food crates and spare-parts kits.

   Before launch, the game projects the loadout's performance (an event-free simulation run) so the student can check margins. A recommended loadout is available.
3. **Outpost operations.** The mission advances one day at a time, either step by step or with auto-play at selectable speeds. Each day the simulation computes solar power (scaled by the mission's illumination profile), battery storage, life-support consumption, recycling and production, and radiation dose. When power is short, systems are shut down by priority (load shedding). The student can switch structures on or off and repair failed equipment, using a spare-parts kit or improvising. A 3D view shows the outpost.
4. **Events and decisions.** When an event occurs, the student chooses from options with explicit benefits and costs. For a solar storm, for example: move the crew into the radiation shelter (if one was launched), build a water wall, put systems in safe mode, or continue normal operations.
5. **End of mission and analysis.** The mission fails if oxygen or water runs out, the habitat loses power for too long, food stays exhausted for too long, or the cumulative radiation estimate reaches the mission's threshold. The result screen shows stars and achievements, the decisions that contributed to the outcome, a breakdown of the radiation dose (background, storms, spacewalks, dose blocked), charts of supply reserves and dose over time, a scientific lesson and suggestions for the next attempt.

Random events use a seeded pseudo-random generator, so the same seed and the same decisions always give the same result. Monte Carlo balance tests check win rates across loadouts and play styles.

## Scientific Data and References

### How data is used

The simulator does **not** connect to NASA data services at runtime. Published values from NASA technical reports, NASA standards and peer-reviewed papers were reviewed, documented in `src/data/science.json` and translated into static game data (`src/data/moon.json`, `events.json`, `buildings.json`). An offline Python script (`tools/science/validate_parameters.py`) re-derives key values and checks that the game data matches the documented parameters.

Every value is classified as:

- **Published:** taken directly from a source.
- **Derived:** computed from published numbers, with the operation documented.
- **Game choice:** a modelling or gameplay decision, constrained by (but not equal to) published values.
- **Educational approximation:** an order-of-magnitude value chosen to teach a principle, not taken from a specific published result.

Each parameter, with its source and a short note, is listed in [`src/data/science.json`](../src/data/science.json).

### Life support and power

| Parameter | Game value | Basis | Classification |
|---|---|---|---|
| Oxygen per crew member | 0.84 kg/day | NASA BVAD REV2 (NASA/TP-2015-218570/REV2) | Published |
| Water per crew member | 3.5 kg/day | BVAD potable water 3.217 kg/day, plus minimal hygiene | Game choice close to published |
| Food per crew member | 1.8 kg/day | Earlier ISS value 1.83 kg/day (BVAD REV2 now gives 2.39 with packaging) | Game choice, older value |
| Water recovery | 93% | ISS Water Recovery System, 93–94% (98% with the Brine Processor Assembly) | Published |
| Water per kg of O₂ (electrolysis) | 1.125 kg/kg | Stoichiometry of 2 H₂O → 2 H₂ + O₂ | Derived |
| Battery specific energy | 240 Wh/kg | Space-rated Li-ion batteries store roughly 150–250 Wh/kg (cited to NASA Technology Roadmaps TA 3, 2015) | Game choice within a cited range |
| Crew size | 4 | Artemis Base Camp habitat "will support a crew up to four" | Published |

### Radiation

| Parameter | Game value | Basis | Classification |
|---|---|---|---|
| Galactic cosmic-ray (GCR) dose on the lunar surface | 1.37 mSv/day | Chang'e-4 LND measurement, 1369 µSv/day dose equivalent (Zhang et al. 2020) | Published |
| Habitat GCR factor | 0.7 | Habitat walls reduce cosmic-ray dose only modestly; the factor is not taken from a published result | Game choice |
| Solar storm (NOAA S3) | 120 mSv per event (60 mSv/day × 2 days) | Game estimate for an S3 storm inside a thin habitat. NOAA S-levels classify proton flux, not dose, so the scale does not provide this number | Educational approximation |
| Severe solar storm (NOAA S4) | 220 mSv per event (110 mSv/day × 2 days) | Game estimate for an S4 storm inside a thin habitat; no dedicated parameter entry or published source | Game choice |
| Radiation shelter | Factor 0.1 (about 90% of the storm dose blocked) | Order-of-magnitude reduction assumed for ~20–30 g/cm² of regolith or water against solar-proton spectra. The source linked in the game (Zhang et al. 2020) measures cosmic-ray dose, not solar-storm shielding | Educational approximation |
| Water wall | Factor 0.5 (about 50% blocked) | Gameplay value; no dedicated parameter entry or published source | Game choice |
| Spacewalk (EVA) dose | 0.5 mSv | Consistent with 1.37 mSv/day × 8/24 h ≈ 0.46 mSv | Game choice, consistent with a derived estimate |
| Mission radiation threshold | 250 mSv | NASA-STD-3001 Vol. 1 short-term (30-day) limit of 250 mGy-Eq to blood-forming organs. The game treats it as mSv for simplicity and applies it to a cumulative mission counter | Educational threshold |
| Warning level / "Radiation safe" achievement | 150 mSv / 100 mSv | No scientific source | Game choice |

**Important limitations.**

- The game's dose counter is an **educational estimate**. It adds a measured cosmic-ray dose equivalent to game estimates for storms and spacewalks, so it is not a computed effective dose. It is **not** a NASA operational model and does not predict the dose of any real mission.
- NOAA S-levels classify proton **flux**, not dose. The S3 and S4 values are illustrative scenarios for a thin habitat; real storms within one level can differ by an order of magnitude.
- Storms are compressed into 2 days at a constant rate. Real events rise and decay and can come in series.
- Shielding factors depend on the storm spectrum, geometry and material. A single factor per option is a simplification.
- The 250 mSv threshold is a game rule inspired by a NASA short-term limit expressed in a different unit (mGy-Eq). It is not NASA's mission-abort rule.

### References

| Key | Reference |
|---|---|
| `bvad` | Ewert, Chen & Powell. *Life Support Baseline Values and Assumptions Document*. NASA/TP-2015-218570/REV2, 2022. <https://ntrs.nasa.gov/citations/20210024855> |
| `std3001` | NASA OCHMO. *NASA-STD-3001, Volume 1: Crew Health* (space permissible exposure limits for radiation). Current revision (Rev C, 2023): <https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf> |
| `radiation` | Zhang, S., Wimmer-Schweingruber, R. F., et al. *First measurements of the radiation dose on the lunar surface*. Science Advances 6(39), eaaz1334, 2020. <https://doi.org/10.1126/sciadv.aaz1334> |
| `swpc` | NOAA Space Weather Prediction Center. *NOAA Space Weather Scales: Solar Radiation Storms (S1–S5)*. <https://www.swpc.noaa.gov/noaa-scales-explanation> |
| `eclss` | NASA. *Environmental Control and Life Support Systems (ECLSS)*. <https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/> |
| `eclssWater` | NASA. *NASA Achieves Water Recovery Milestone on International Space Station*, 2023. <https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/> |
| `powerRoadmap` | NASA. *NASA Technology Roadmaps TA 3: Space Power and Energy Storage*, 2015. The original NASA web page is no longer online. |
| `artemis` | NASA. *NASA's Plan for Sustained Lunar Exploration and Development*, 2020. <https://www.nasa.gov/wp-content/uploads/2020/08/a_sustained_lunar_presence_nspc_report4220final.pdf> |
| `dust` | Gaier, J. R. *The Effects of Lunar Dust on EVA Systems During the Apollo Missions*. NASA/TM-2005-213610, 2005. <https://ntrs.nasa.gov/citations/20050160460> |
| `plants` | NASA. *Growing Plants in Space* (context only). <https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/> |
| `southPole` | NASA. *NASA Identifies Candidate Regions for Landing Next Americans on Moon* (context only). <https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/> |

In the game, scientific notes on structures and events link to their source.

## Technology and Architecture

| Layer | Technology | Location |
|---|---|---|
| User interface | React 19, TypeScript, Tailwind CSS 4 | `src/components`, `src/app` |
| 3D outpost view | Three.js (loaded on demand) | `src/three` |
| Simulation engine | Pure TypeScript, deterministic and seeded, with no UI dependencies | `src/game` |
| Game and science data | JSON (missions, structures, events, sources, glossary) | `src/data` |
| Internationalisation | Custom dictionaries (English, pt-PT); the engine returns language-neutral messages | `src/i18n` |
| Sound | Procedurally generated with the Web Audio API (no audio files) | `src/audio` |
| Build and tests | Vite, Vitest (unit, i18n, tutorial and Monte Carlo balance tests) | `vite.config.ts`, `src/**/*.test.ts` |
| Science validation | Python 3 (standard library only), run offline | `tools/science/validate_parameters.py` |

```
Published sources ──► science.json (documented parameters) ◄── validate_parameters.py (offline check)
                            │
                            ▼
              moon.json · events.json · buildings.json
                            │
                            ▼
          Simulation engine (src/game): day tick, events, failure, scoring, analysis
                            │
                            ▼
          React UI (src/components) + Three.js scene (src/three) + Web Audio cues (src/audio)
```

The application runs entirely in the browser. There is no backend; only language and sound preferences and the tutorial status are stored locally in the browser.

## Team

**Team Name:** Grupo 4

**Team Contact:** quartetocoders@gmail.com

**NASA Space Apps Team Page:** [Grupo 4](https://www.spaceappschallenge.org/2026/find-a-team/grupo-4/)

**GitHub Organization:** [Grupo-IV](https://github.com/Grupo-IV)

### Team Members

| Member | Role | GitHub |
|---|---|---|
| Líria Djenaba Vilança Bá | Software Developer | [@Liriali4](https://github.com/Liriali4) |
| Emanuel Carneiro dos Santos | Backend Developer | [@sw-wanted](https://github.com/sw-wanted) |
| José Simão Tala | Project Manager | [@ixmjst](https://github.com/ixmjst) |
| Carlos Neves Mussagui Tchípia | Contracts and Partnerships | [@Carlos-Tchipia](https://github.com/Carlos-Tchipia) |

The team brings together software development, backend engineering, project coordination and partnership management to develop an educational mission engineering simulator.

## Demo and Repository

- **Repository:** <https://github.com/Grupo-IV/junior-astronaut>
- **Live demo:** [TO BE PROVIDED]
- **Space Apps project page:** [TO BE PROVIDED]
- **Run locally:** see [Get Started](../README.md#get-started) in the README.
- **Licence:** MIT ([LICENSE](../LICENSE))
