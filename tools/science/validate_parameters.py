#!/usr/bin/env python3
"""Offline science & data validation for the Junior Astronaut Mission Trainer.

Pipeline (PRD §16):  NASA / scientific sources -> Python -> validated parameters -> JSON -> TypeScript

This script does not run in the game. It:
  1. re-derives key simulation parameters from first principles / published values,
  2. checks that the JSON used by the TypeScript engine agrees with them,
  3. checks referential integrity of the JSON content (events, buildings, sources),
  4. prints engineering break-even numbers used in docs/science.md.

Usage:  python3 tools/science/validate_parameters.py
Exit code 1 if any check fails. Standard library only.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "src" / "data"

# --- Reference values -----------------------------------------------------------
M_H2O = 18.015  # g/mol
M_O2 = 31.998  # g/mol
BVAD = {"oxygenKg": 0.84, "waterKg": 3.5, "foodKg": 1.8}  # per crew member per day
CHANGE4_DOSE_USV_PER_DAY = 1369  # Zhang et al. 2020, Science Advances
STD3001_30DAY_BFO_LIMIT = 250  # mGy-Eq
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
    check(env["doseLimitMsv"] == STD3001_30DAY_BFO_LIMIT, "Short-term dose limit (NASA-STD-3001)", f"{env['doseLimitMsv']} mSv")
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

    print("\n3. Engineering break-even (for docs/science.md)")
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
