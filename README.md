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
| Two-tone chime, played twice (*caution*) | An equipment failure, leak, dusty arrays or crop failure | Event dialog |
| Three rising whoops (*warning*) | The habitat has no power, or crew dose passes the warning level | `EMERGENCY` power tag, red entry in the mission log |
| Falling sweep, static and three dosimeter chirps | A solar storm is detected | Event dialog and the ☢ storm badge |
| Geiger-counter clicks | While a storm is active. The click rate follows the dose that gets through your shielding, so clicks slow down when the crew is sheltered | Storm badge shows the mSv/day reaching the crew |
| Fan hum | Habitat life support is running. It quietens when systems are switched off for lack of power and stops when the habitat loses power | Power panel and Systems panel |
| Short rising or falling melody | Mission complete or mission failed | End-of-mission panel |

The alarm classes follow the idea behind the International Space Station's Caution & Warning system, where a *warning* means a threat to the crew that needs action now and a *caution* means a system that needs attention soon. Each update plays at most one sound (the most important one), and alarms don't loop.

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
