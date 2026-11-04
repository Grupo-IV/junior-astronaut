#!/usr/bin/env python3
"""Offline science & data validation for the Junior Astronaut Mission Trainer.

Pipeline (PRD §16):  NASA / scientific sources -> Python -> validated parameters -> JSON -> TypeScript

This script does not run in the game. It:
  1. re-derives key simulation parameters from first principles / published values,
  2. checks that the JSON used by the TypeScript engine agrees with them,
  3. checks referential integrity of the JSON content (events, buildings, sources),
  4. checks that every science.json parameter matches the game data it documents, and whether
     the TypeScript engine actually reads that data or keeps it for documentation only,
  5. prints engineering break-even numbers used in docs/science.md.

Usage:  python3 tools/science/validate_parameters.py
Exit code 1 if any check fails. Standard library only.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
DATA = SRC / "data"

# --- Reference values -----------------------------------------------------------
M_H2O = 18.015  # g/mol
M_O2 = 31.998  # g/mol
BVAD = {"oxygenKg": 0.84, "waterKg": 3.5, "foodKg": 1.8}  # per crew member per day
CHANGE4_DOSE_USV_PER_DAY = 1369  # Zhang et al. 2020, Science Advances
# NASA-STD-3001 Rev C: 250 mSv effective dose (V1 4031, design-reference SPE) and 250 mGy-Eq BFO
# (Table 4.8-1, 30 days). The game's cumulative threshold reuses the number but is didactic.
STD3001_250_REFERENCE = 250
LIION_WH_PER_KG = (150, 260)  # plausible pack-level range
ISS_WATER_RECOVERY = (0.90, 0.98)

failures: list[str] = []


def check(ok: bool, label: str, detail: str = "") -> None:
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)


def close(a: float, b: float, rel: float = 0.02) -> bool:
    return abs(a - b) <= rel * max(abs(a), abs(b))


def load(name: str) -> dict:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


# Runtime TypeScript (types and tests excluded): used to tell engine-read fields from documentation-only ones.
RUNTIME_TS = {
    p.relative_to(SRC).as_posix(): p.read_text(encoding="utf-8")
    for p in SRC.rglob("*.ts*")
    if p.suffix in (".ts", ".tsx") and "types" not in p.parts and not p.name.endswith(".test.ts")
}


def check_binding(param: dict, label: str, value: float, reader: str | None, token: str) -> None:
    """Checks one game-data field against its science.json parameter.

    reader is the runtime file expected to read `token`; None means the field is kept only for
    documentation/compatibility, so no runtime file may read it."""
    if reader:
        used = token in RUNTIME_TS.get(reader, "")
        role = f"engine: {reader}"
    else:
        used = not any(token in text for text in RUNTIME_TS.values())
        role = "documentation only"
    check(close(value, param["gameValue"], 0.001) and used, f"{param['name']} = {label}", f"{value} vs gameValue {param['gameValue']} [{role}]")


def main() -> int:
    moon, bld, ev, sci = load("moon.json"), load("buildings.json"), load("events.json"), load("science.json")
    env, buildings, cargo, events = moon["environment"], bld["buildings"], bld["cargo"], ev["events"]

    print("1. Physical & physiological parameters")
    # 2 H2O -> 2 H2 + O2: 2 mol water (36.03 g) per mol O2 (32.00 g)
    ratio = 2 * M_H2O / M_O2
    game_ratio = buildings["oxygen_generator"]["waterPerKgOxygen"]
    check(close(ratio, game_ratio, 0.01), "Electrolysis water per kg O2", f"derived {ratio:.3f}, game {game_ratio}")
    for key, ref in BVAD.items():
        check(close(env["crewPerPersonPerDay"][key], ref), f"BVAD crew {key}", f"{env['crewPerPersonPerDay'][key]} vs {ref}")
    check(close(env["gcrDoseMsvPerDay"], CHANGE4_DOSE_USV_PER_DAY / 1000), "Lunar surface GCR dose (Chang'e-4)", f"{env['gcrDoseMsvPerDay']} mSv/day")
    check(env["doseLimitMsv"] == STD3001_250_REFERENCE, "Didactic mission dose threshold = NASA-STD-3001 250 value", f"{env['doseLimitMsv']} mSv (game estimate)")
    b = buildings["battery"]
    wh_per_kg = b["storageKwh"] * 1000 / b["massKg"]
    check(LIION_WH_PER_KG[0] <= wh_per_kg <= LIION_WH_PER_KG[1], "Battery specific energy", f"{wh_per_kg:.0f} Wh/kg")
    rr = buildings["water_recycler"]["waterRecoveryRate"]
    check(ISS_WATER_RECOVERY[0] <= rr <= ISS_WATER_RECOVERY[1], "Water recovery rate (ISS WRS)", f"{rr:.0%}")

    print("\n2. Content integrity")
    source_keys = set(sci["sources"])
    for item in list(buildings.values()) + list(cargo.values()):
        check(item["science"]["source"] in source_keys, f"Source exists for {item['id']}")
    for e in events.values():
        check(e["source"] in source_keys, f"Source exists for event {e['id']}")
        for o in e["options"]:
            req = o.get("requires", {})
            if "building" in req:
                check(req["building"] in buildings, f"{e['id']}/{o['id']} requires a known building")
    for p in sci["parameters"]:
        check(p["source"] in source_keys, f"Source exists for parameter '{p['name']}'")
    for m in moon["missions"]:
        for s in m["scheduledEvents"]:
            ok = s["eventId"] in events and (not s.get("variant") or s["variant"] in events[s["eventId"]].get("variants", {}))
            check(ok, f"{m['id']}: scheduled {s['eventId']}/{s.get('variant')} exists")
        for r in m["randomEventPool"]:
            check(r in events, f"{m['id']}: random event {r} exists")
        days = sorted(d for p in m["illumination"] for d in range(p["fromDay"], p["toDay"] + 1))
        check(days == list(range(1, m["durationDays"] + 1)), f"{m['id']}: illumination covers every day exactly once")
        mass = sum(
            (buildings.get(k) or cargo[k])["massKg"] * n for k, n in m["recommendedLoadout"].items()
        )
        check(mass <= m["launchMassBudgetKg"], f"{m['id']}: recommended loadout fits the lander", f"{mass} / {m['launchMassBudgetKg']} kg")

    print("\n3. Science parameters <-> game data")
    params = {p["name"]: p for p in sci["parameters"]}
    storm = events["solar_storm"]
    storm_opts = {o["id"]: o for o in storm["options"]}
    eva = next(o for o in events["power_failure"]["options"] if o["id"] == "eva_clean")

    def find(effects: list, **match) -> dict:
        return next(e for e in effects if all(e.get(k) == v for k, v in match.items()))

    def storm_total(variant: str) -> float:
        m = find(storm["variants"][variant]["onTrigger"], kind="storm_dose")
        return m["value"] * m["days"]

    crew, battery = env["crewPerPersonPerDay"], buildings["battery"]
    tick, engine_crew = "game/simulation/tick.ts", "game/resources/loadout.ts"
    # parameter name -> [(data field, value, runtime reader or None, token the reader uses)]
    bindings = {
        "Oxygen consumed per astronaut": [("moon.crewPerPersonPerDay.oxygenKg", crew["oxygenKg"], engine_crew, "crewPerPersonPerDay")],
        "Water used per astronaut": [("moon.crewPerPersonPerDay.waterKg", crew["waterKg"], engine_crew, "crewPerPersonPerDay")],
        "Food per astronaut (with packaging)": [("moon.crewPerPersonPerDay.foodKg", crew["foodKg"], engine_crew, "crewPerPersonPerDay")],
        "Water recovery rate": [("buildings.water_recycler.waterRecoveryRate", rr, tick, "waterRecoveryRate")],
        "Water needed per kg of O₂ (electrolysis)": [("buildings.oxygen_generator.waterPerKgOxygen", game_ratio, tick, "waterPerKgOxygen")],
        "Radiation dose on the lunar surface (GCR)": [("moon.gcrDoseMsvPerDay", env["gcrDoseMsvPerDay"], tick, "gcrDoseMsvPerDay")],
        "Habitat GCR factor": [("moon.habitatGcrFactor", env["habitatGcrFactor"], tick, "habitatGcrFactor")],
        "Mission radiation threshold (didactic)": [("moon.doseLimitMsv", env["doseLimitMsv"], "game/rules/failure.ts", "doseLimitMsv")],
        "Strong solar storm (NOAA S3) dose inside a thin habitat": [("events.solar_storm.moderate storm_dose × days", storm_total("moderate"), tick, "storm_dose")],
        "Severe solar storm (NOAA S4) dose inside a thin habitat": [("events.solar_storm.severe storm_dose × days", storm_total("severe"), tick, "storm_dose")],
        "Shelter storm-dose factor": [
            ("events.solar_storm.shelter dose_factor", find(storm_opts["shelter"]["effects"], kind="dose_factor")["value"], tick, "dose_factor"),
            ("buildings.radiation_shelter.stormDoseFactor", buildings["radiation_shelter"]["stormDoseFactor"], None, "stormDoseFactor"),
        ],
        "Water wall storm-dose factor": [("events.solar_storm.water_wall dose_factor", find(storm_opts["water_wall"]["effects"], kind="dose_factor")["value"], tick, "dose_factor")],
        "Spacewalk (EVA) dose": [
            ("events.power_failure.eva_clean addDose", find(eva["effects"], type="addDose")["msv"], "game/events/effects.ts", "addDose"),
            ("moon.evaDoseMsv", env["evaDoseMsv"], None, "evaDoseMsv"),
        ],
        "Li-ion battery specific energy": [("buildings.battery storageKwh / massKg", battery["storageKwh"] * 1000 / battery["massKg"], "game/buildings/buildings.ts", "storageKwh")],
        "Typical crew size": [(f"moon.missions[{m['id']}].crew", m["crew"], "game/missions/createMission.ts", ".crew") for m in moon["missions"]],
    }
    for name, fields in bindings.items():
        if name not in params:
            check(False, f"science.json documents '{name}'")
            continue
        for label, value, reader, token in fields:
            check_binding(params[name], label, value, reader, token)
    for name in params.keys() - bindings.keys():
        check(False, f"Parameter '{name}' is bound to game data")

    print("\n4. Engineering break-even (for docs/science.md)")
    crew = 4
    water_tank = cargo["water_crate"]
    kg_launched_per_kg_water = water_tank["massKg"] / water_tank["contentKg"]
    saved_per_day = crew * env["crewPerPersonPerDay"]["waterKg"] * rr * kg_launched_per_kg_water
    recycler_mass = buildings["water_recycler"]["massKg"]
    print(f"  Water recycler ({recycler_mass} kg) saves {saved_per_day:.1f} kg of launched water tanks per day")
    print(f"  -> it becomes lighter than carrying water after {recycler_mass / saved_per_day:.0f} days (crew of {crew})")
    o2_tank = cargo["oxygen_tank"]
    o2_launch_per_day = crew * env["crewPerPersonPerDay"]["oxygenKg"] * o2_tank["massKg"] / o2_tank["contentKg"]
    print(f"  Oxygen from tanks costs {o2_launch_per_day:.1f} kg of launch mass per day")
    print(f"  -> the oxygen generator ({buildings['oxygen_generator']['massKg']} kg) pays off after "
          f"{buildings['oxygen_generator']['massKg'] / o2_launch_per_day:.0f} days (ignoring the water it consumes)")

    print(f"\n{'All checks passed.' if not failures else f'{len(failures)} check(s) FAILED.'}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
