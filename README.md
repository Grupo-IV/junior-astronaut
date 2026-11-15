# Junior Astronaut Mission Trainer

This project was developed by **Grupo 4** for the *Build a Junior Astronaut Mission Trainer* challenge at the *NASA International Space Apps Challenge 2026*.


## Summary

Junior Astronaut Mission Trainer is a browser game where you take command of a small lunar or Martian outpost. You pack a lander with a limited mass budget, then keep a crew of four alive through dark shadow periods, solar storms, leaks and equipment failures.

Each choice has a trade-off: more batteries mean fewer supplies, and more shielding means less room for greenhouses. The numbers behind the game are grounded in scientific data and sources, such as how much oxygen and water an astronaut uses each day or how much radiation reaches the lunar surface. When the mission ends, you see *why* it succeeded or failed, and what you could try differently next time.

You won't find these engineering trade-offs in a chart or a report here. You play through them.

For the full project presentation (problem, solution, gameplay, scientific sources, architecture and team), see [docs/space-apps-project.md](docs/space-apps-project.md).

## Get Started

You need [Node.js](https://nodejs.org/) 20 or newer.

1. Clone the repository:

   ```bash
   git clone https://github.com/Grupo-IV/junior-astronaut.git
   cd junior-astronaut
   ```

2. Install the dependencies and start the game:

   ```bash
   npm install
   npm run dev
   ```

3. Open <http://localhost:5173> in your browser and start your first mission.

To run the tests, use `npm test`.

## Sound

The game uses quiet sound cues to back up what is already on screen. Sound is optional: every cue has a visual equivalent, so you can play the whole mission muted. Use the **🔊 Sound on / 🔇 Sound off** button in the main menu or in the outpost header. The game remembers your choice in this browser.

Sound does not travel through the vacuum on the Moon, so you only hear what the crew would hear inside the habitat:

| Sound | When it plays | What you see on screen |
| --- | --- | --- |
| Fast high-low siren (*emergency*) | Cabin air leak | Red alarm lights and red visor edge in first person; event dialog |
| Two-tone chime, played twice (*caution*) | An equipment failure, water leak, dusty arrays or crop failure | Event dialog |
| Three rising whoops (*warning*) | The habitat has no power, or crew dose passes the warning level | `EMERGENCY` power tag, red entry in the mission log |
| Falling sweep, static and three dosimeter chirps | A solar storm is detected | Event dialog and the ☢ storm badge |
| Geiger-counter clicks | While a storm is active. The click rate follows the dose that gets through your shielding, so clicks slow down when the crew is sheltered | Storm badge shows the mSv/day reaching the crew |
| Fan hum | Habitat life support is running. It quietens when systems are switched off for lack of power and stops when the habitat loses power | Power panel and Systems panel |
| Hiss of escaping air | While a cabin leak is open to the cabin (loud) or still seeping (faint) | Mist drawn into the breach, frost on the seal, pressure trace on the life-support console, `Air leak` line in the mission log |
| Short rising or falling melody | Mission complete or mission failed | End-of-mission panel |
| Clicks, ratchet, hatch motor and latch, short chimes | First person: using a console, choosing and confirming an option, repairing, closing a hatch, the outcome of a decision, the last 5 seconds of a countdown | The console lights up, the selected option gets a glowing frame, the hands do the work, the hatch closes, the outcome card, the countdown bar |

The alarm classes follow the idea behind the International Space Station's Caution & Warning system, where an *emergency* (fire, depressurisation, toxic air) means drop everything, a *warning* means a threat to the crew that needs action now and a *caution* means a system that needs attention soon. Each update plays at most one sound (the most important one), and alarms don't loop.

### Assets and licences

The game has no audio files. All sounds are generated in the browser by [`src/audio/engine.ts`](src/audio/engine.ts) with the standard [Web Audio API](https://developer.mozilla.org/docs/Web/API/Web_Audio_API), using oscillators, filtered noise and gain envelopes. They are original work by Grupo 4 and use the same licence as the rest of the code (see [LICENSE](LICENSE)). There are no third-party sound assets to credit.

If you add recorded audio later, put it in `public/audio/` and list every file here with its author, source URL and licence. Use only public-domain or CC0/CC BY sounds; NASA audio is generally not copyrighted, but check NASA's media usage guidelines before you use it.

## Languages

The game is available in **Portuguese (pt-PT)** and **English**. It picks the browser language the first time it opens. You can switch with the **PT / EN** buttons on the main menu, the mission screens and the outpost header, and the game remembers your choice. Switching language changes only the words: the simulation, its numbers and its rules stay the same.

Where texts live:

| Text | File |
| --- | --- |
| Interface (buttons, labels, tooltips, errors, tutorial) and engine messages (mission log, decision notes, analysis) | [`src/i18n/messages/en.ts`](src/i18n/messages/en.ts) and [`pt.ts`](src/i18n/messages/pt.ts) |
| Game content (missions, structures, events, lessons, glossary) | English in [`src/data/*.json`](src/data), Portuguese in [`src/i18n/content/pt.json`](src/i18n/content/pt.json) |

To add or change a text:

1. Add the key to `en.ts`, then the same key to `pt.ts`. TypeScript refuses a dictionary with a missing or extra key.
2. In a component, use `const { t } = useI18n()` and `t('my.key', { value })`. Use `{placeholders}` and keep word order inside the translation, never by joining strings in code. For plurals, add `my.key_one` and `my.key_other` and pass `count`.
3. The simulation engine never builds sentences. It returns `Message` objects (`{ key, args }`) that the interface translates.

Content texts are addressed by path, for example `events.solar_storm.options.shelter.label`. When you add a text field to a JSON file, `npm test` lists the paths that `pt.json` is missing.

`npm test` also checks that every key exists in both languages with the same placeholders, that no component contains hard-coded visible text, that every screen renders in Portuguese without leftover keys, and that the same mission gives the same result in both languages.

## Ranks

Before choosing a mission you pick a rank. The ranks follow the roles in a real crew, and each one gives you different operating margins. The physics stays the same at every rank: crew consumption, radiation and power work exactly the same way.

| Rank | Lander cargo | Surprises | Mission control | Time for urgent decisions (first person) |
| --- | --- | --- | --- | --- |
| Cadet | 115% | fewer | full forecast and planning tips | 150% |
| Mission Specialist | 100% (the mission as designed) | normal | full forecast and planning tips | 120% |
| Flight Engineer | 95% | more | forecast result only | 100% |
| Commander | 90% | many | no forecast, no tips | 80% |

A mission keeps the rank it was launched with. The rules are in [`src/game/ranks.ts`](src/game/ranks.ts).

## First-person view

The **First person** button in the outpost header puts you inside the habitat module, as the astronaut. The **Management view** button takes you back. The game remembers your choice; the tutorial always runs in the management view.

Inside, the windows look out on the same outpost, so you see the structures, the Sun and the storms. Five stations line the module: **life support** (oxygen generator, water recycler, the hatch to the life-support bay and the spare-kit rack), **plant lab** (greenhouse), **command and airlock** (mission console, way to the radiation shelter), **power** (arrays and batteries, with a window onto the arrays) and **storage** (oxygen bottles, water bags and food packs: what is on the shelves is what you have stored).

- **Look around**: drag with the mouse or a finger. **Walk**: W A S D or the arrow keys, or the stick at the bottom left on touch screens. **Go to a station**: the arrows at the sides of the view, or Q / E. **Use a console**: tap it, the hand button at the bottom, or F.
- A console has the same actions as the Systems panel (switch on or off, repair with a spare kit or by improvising). Your hand presses the control and the order reaches the mission when it does; a repair with a kit takes one from the rack.
- The helmet display keeps only the essentials: mission day, days of oxygen, water and food left, and the battery; the radiation dose appears when it matters (a storm, or a high dose). Anything that needs attention shows as an alert at the top. The mission log shows as subtitles and opens in full with **Log**.
- You walk as a body, not a floating camera: walls, hatches, racks and bunks stop you and you slide along them. Doors let you through when they are open: the doorway of the life-support bay closes when its hatch is sealed, and the airlock at the command station leads to the radiation shelter.

### Emergencies and decisions

When an event happens in first person, it is staged: the alarm sounds and the cabin lights change, your hands react, the camera goes to the problem, and a cinematic decision appears with the event, the facts that matter (oxygen left, spare kits, battery…) and two to four options (A–D or 1–4 and Enter, or tap twice). When the situation cannot wait (oxygen leak, water leak, solar storm) a countdown runs; it pauses while the page is hidden. If time runs out, the delay has a cost and the event's fallback runs, as the base's automatic systems would. Your hands then carry out the order, the engine applies it at that moment, and an outcome card shows what really changed in the stores and in the habitat.

Every option is the event's real option from [`src/data/events.json`](src/data/events.json); first person changes how a decision is shown, never what it does. In the management view the same events open the usual event dialog, without a countdown.

The fully staged scenario is the **oxygen leak** (`oxygen_leak`): a cracked hull seal in the life-support bay.

| Option | What happens in the mission |
| --- | --- |
| Repair the leak right now | −1 kg O₂. With a spare kit (used): 90% fixed, otherwise a slow leak (−5%/day, 2 days). Without: 45% fixed, otherwise the leak gets worse (−10%/day, 3 days). |
| Seal off the life-support bay | The hatch closes. 15% of stored oxygen stays in the bay, and the oxygen generator delivers 50% for 3 days. With empty batteries the hatch is closed by hand and holds 60% of the time. |
| Move the crew to the shelter module | Needs a working shelter. −6 kg O₂ to refill the habitat, +10 kWh/day and greenhouse at 50% for a day. The leak is fixed. |
| Run the leak diagnostics first | −2 kg O₂, then a second decision (**Leak located**) where a repair is certain with a kit, 75% without. |

Code: [`src/immersive/`](src/immersive) (shared vocabulary and staging rules, no 3D), [`src/three/firstPerson/`](src/three/firstPerson) (habitat interior, hands, camera), [`src/components/immersive/`](src/components/immersive) (helmet display, consoles, decision and outcome). During development, `/?preview=outpost&event=oxygen_leak&day=7&view=fp&tour=0` opens a mission whose next day brings the leak.

### Radiation shelter

The shelter is a pressurised room buried under a mound of regolith bags, with a vestibule and a hermetic hatch, a radiation sign, a status light (blue: ready · amber: storm outside · green: crew inside and protected) and a dosimeter mast whose light blinks with the dose rate. In first person you can go in through the airlock (command station): inside are bunks for four, supplies, a maintenance panel that shows the bags of lunar soil that do the shielding, and a monitor with the storm dose outside and the dose behind the walls.

During a solar storm you can move the crew into the shelter at any time, not only in the storm decision: from the alert at the top, from the shelter in the Systems panel, from the command station or inside the shelter. The protection comes from the shelter's data in [`src/data/buildings.json`](src/data/buildings.json): `stormDoseFactor` (0.1: 90% of the storm dose is blocked) and `occupiedPowerKwhPerDay` (10 kWh/day of life support while the crew is inside, the same as the storm decision). The crew stays protected until the storm ends or you take them out, and the greenhouse is left untended meanwhile. The rules are in [`src/game/simulation/shelter.ts`](src/game/simulation/shelter.ts).

### Collisions

Bodies are circles on the floor plan (the game has no falling or tumbling, so no physics library is needed): obstacles are circles and boxes, rooms are walls with doorways, and a door is a wall piece that is switched on while it is closed. Every move goes in small steps that are pushed back to the nearest free spot, so a body slides along walls and round corners, cannot tunnel through a thin wall at any speed, and stops at the last free spot rather than squeezing into a gap narrower than itself. The crewmate outside follows routes from an A* navigation grid over the outpost's floor plan and goes in through the real doors: to the shelter hatch during a storm, to the habitat airlock when the habitat loses power. Code: [`src/three/physics/`](src/three/physics).

## Interface

The management view shows what you need to act on, and puts the rest one tap away:

- each supply is one line with how many days it lasts; its LOW / CRITICAL tag appears only when there is a problem, and the kilograms, daily balance, kWh and the science are under **Details**;
- the radiation dose comes forward during storms or once it is high;
- alerts appear in the header only when something needs attention (a storm with a button to take shelter, supplies running out, a power cut, a broken machine, a leak, a shadow coming tomorrow while the batteries are not full), most urgent first.

## The science, and where the game simplifies it

The briefing and the mission report have a **The science in this game** button. It lists every important number with what kind of value it is, its unit, a real range when there is one, and its source:

| Kind | Meaning | Examples |
| --- | --- | --- |
| Law of nature | Follows from physics or chemistry | 1.125 kg of water per kg of oxygen (electrolysis) |
| Measured in space | Measured by a spacecraft or on the ISS | Cosmic-ray dose on the lunar surface, 1.37 mSv/day (Chang'e-4); water recovery 93–94% on the ISS before 2023, 98% demonstrated in 2023 with the Brine Processor Assembly |
| Engineering reference | A value engineers plan with; real values vary | 0.84 kg of oxygen per astronaut per day (NASA BVAD); battery energy per kg |
| Game choice or estimate | Chosen or estimated to make the scenario playable | Storm doses inside the habitat, the shelter's 90%, solar array output, greenhouse growing time, the light and shadow calendars |

The values and their notes are in [`src/data/science.json`](src/data/science.json); `python3 tools/science/validate_parameters.py` checks that every parameter says its kind and that every real-world value cites a source.

Simplifications that remain on purpose:

- **Radiation is one number in mSv.** Real protection uses several quantities (effective dose in mSv for long-term risk, organ doses in mGy-Eq for short-term effects). The 250 mSv mission limit is a game rule inspired by NASA's 30-day limit for blood-forming organs (250 mGy-Eq), not a medical threshold; NASA also caps each astronaut's career effective dose at 600 mSv.
- **Storm doses are scenario estimates.** The NOAA S-scale (S3 strong, S4 severe) counts ≥10 MeV protons near Earth; it does not set the dose inside a habitat, which depends on the storm's energy spectrum and the walls.
- **Light and shadow are simplified scenarios.** Near the lunar south pole, sunlight depends on the terrain around each spot; real calendars are computed from LOLA terrain maps (NASA PGDA, Mazarico et al. 2011). The missions do not use a real place's calendar.
- Crew needs are fixed per day, spacewalks do not use extra suit oxygen, and crops are ready after a week instead of about a month.

## Learning from your decisions

- The mission report tells each decision as a short story: what the option promised, what changed right away, what the following days showed (for example the dose received during a storm, or the lowest days of oxygen left), and the other options you could try.
- **Replay with the same start** relaunches the mission with the same seed and rank. Change your cargo, or one decision, and the report compares the two tries side by side. With the same cargo and the same decisions the mission plays out exactly the same; after a different choice later events can change too, because the dice are rolled in a different order.

## Science goal: spacewalks

Each mission has a science bonus: collect samples on spacewalks (EVA), from the management view or the command station in first person. A spacewalk uses the rules the game already has for going outside: the EVA dose from the environment data (0.5 mSv, a game estimate), and the greenhouse at half care for a day. There are no spacewalks during a solar storm or without habitat power, and at most one a day. The report explains what each sample teaches.

## No time pressure

Urgent decisions in first person have a countdown. **No time pressure** (main menu, or the button next to the countdown) turns it off: the decision waits for you. The management view never uses a countdown. Every sound has a visual twin (alerts, lights, subtitles of the mission log).

## Moving in lunar gravity

Everyone walks with the same physics ([`src/three/physics/locomotion.ts`](src/three/physics/locomotion.ts)), under the Moon's measured gravity of 1.62 m/s²:

- each step is a ballistic hop: leaving the ground at v m/s, a body flies for 2v/g and rises v²/2g (about 15 cm at a lope), which gives the long, floaty Apollo gait;
- boots grip with friction μ·g, six times weaker than on Earth, so speeding up, braking and turning take room: the crewmate outside starts braking v²/2a before stopping and turns as fast as its grip allows, and nobody can steer in mid-hop;
- regolith kicked up at each landing flies on clean parabolas and drops straight back (no air, no dust cloud);
- indoors the same gait is gentler (short, low steps), and the eye height follows each step's hop.

The friction coefficient and take-off speeds are game estimates; the gravity is measured.

## Seeing what the game is doing

Between two scenes a status card shows the steps, the one in progress and how far it has got:

- **Preparing the lunar base**: the 3D engine, then the textures of the ground, the sky and the Earth, the hardware, and the assembly (each step really runs in turn);
- **Entering the habitat / Back to the management view / Going to the shelter**: the steps of the camera's way in or out;
- **Simulating day N**: after each day, the engine's results step by step (power made and used, oxygen, water and food balance, radiation dose, events). The next event appears once the day has been shown;
- **Spacewalk**: suiting up, the walk to the sample site, collecting, the walk back. Progress comes from the crewmate's real walk, and a flag marks each site.

## Visuals

The game ships no image files. Everything is drawn in code:

- The Moon, the regolith, the Earth, the Milky Way and the hardware textures are generated in the browser, with a fixed seed so the scene looks the same every time ([`src/three/textures/`](src/three/textures)).
- The lunar sky is black down to a sharp horizon: no blue sky, no haze. Stars are small round points in brightness classes (each fainter class about three times more numerous), crowded towards the Milky Way, which is a dim, desaturated band along the galactic plane with a brighter, warmer centre split by dust lanes and a few faint nebulae. With sunlit ground in view the faint stars and the Milky Way fade (as they would to the eye or a camera); in a shadow period they come back. The Sun and the Earth keep a small, restrained glow.
- The 3D outpost has polar lighting with long shadows, crater fields and boulders, horizon massifs, a crew lander, a rover with tyre tracks, hoses between modules, and an astronaut who walks with a low-gravity lope.
- The first-person habitat interior and the astronaut's gloved hands are built from simple shapes and animated in code: each gesture (press, point, grab, repair, turn a hatch wheel, react to an alarm, check the wrist computer) follows its target in the 3D scene.
- Icons, rank insignia, the mission emblem, the mascot and the mission artwork are original SVGs ([`src/components/ui/Icon.tsx`](src/components/ui/Icon.tsx) and [`src/components/art/`](src/components/art)). No emoji are used.

During development you can open a screen directly with `?preview=` (only in `npm run dev`): `/?preview=outpost&tour=0`, `/?preview=event`, `/?preview=result` or `/?preview=setup&rank=commander`.
