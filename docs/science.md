# Science Parameters and Sources

This document explains where the numbers in the Junior Astronaut Mission Trainer come from, why they were chosen and where they stop being science and start being gameplay. It is meant to let a reviewer defend (or challenge) every parameter without reading the code.

Traceability tags: **S3** (Sprint 3 science work) and **N2** (parameter traceability).

## A. Purpose

The game is a teaching tool, not a dosimetry or life-support design tool. Its parameters must be:

- **Grounded:** each value is tied to a primary source (NASA reports and standards, peer-reviewed papers).
- **Honest about simplification:** where the game departs from published values, the difference and the reason are recorded here.
- **Checked automatically:** `tools/science/validate_parameters.py` compares `src/data/science.json` with the data the TypeScript engine actually reads.

Pipeline:

```
NASA / scientific sources → Python validation → science.json (documented parameters)
                                              → moon.json, events.json, buildings.json (game data) → TypeScript engine
```

Every value in this document is labelled as one of:

| Label | Meaning |
|---|---|
| **Published** | Taken directly from a table or the text of a source. |
| **Published (read from figure)** | Read from a plot; the reading uncertainty is stated. |
| **Derived** | Computed by us from published numbers; the operation is shown. |
| **Game choice** | A modelling or gameplay decision, constrained by (but not equal to) published values. |

## B. Sources

| Key in `science.json` | Reference | Identifier / URL | Supports |
|---|---|---|---|
| `bvad` | Ewert, Chen & Powell. *Life Support Baseline Values and Assumptions Document*. NASA/TP-2015-218570/REV2, February 2022. | https://ntrs.nasa.gov/citations/20210024855 | O₂, water and food per crew member |
| `std3001` | NASA Office of the Chief Health & Medical Officer. *NASA-STD-3001, Volume 1, Revision C: Crew Health*. Approved 2023-09-15. §4.8 (V1 4030, V1 4031, Tables 4.8-1 to 4.8-4). | https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf | Radiation limits and SPE shielding guideline |
| `radiation` | Zhang, S., Wimmer-Schweingruber, R. F., et al. *First measurements of the radiation dose on the lunar surface*. Science Advances 6(39), eaaz1334, 2020. | https://doi.org/10.1126/sciadv.aaz1334 | GCR dose rate on the lunar surface; EVA dose (derived) |
| `matthia2024` | Matthiä, D. & Berger, T. *Radiation Exposure and Shielding Effects on the Lunar Surface*. Space Weather 22, e2024SW004095, 2024. Supplementary data: Zenodo, https://doi.org/10.5281/zenodo.13365755 | https://doi.org/10.1029/2024SW004095 | Habitat GCR factor, shelter and water-wall factors (Geant4, regolith, ICRP phantom) |
| `dobynde2024` | Dobynde, M. & Guo, J. *Guidelines for radiation-safe human activities on the Moon*. Nature Astronomy 8, 991–999, 2024. | https://doi.org/10.1038/s41550-024-02287-8 | S3 and S4 storm doses (effective dose behind Al) |
| `swpc` | NOAA Space Weather Prediction Center. *NOAA Space Weather Scales*. | https://www.spaceweather.gov/noaa-scales-explanation | Definition of S3/S4 as proton-flux categories (not doses) |
| `eclss` | NASA. *Environmental Control and Life Support Systems (ECLSS)*. | https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/ | Electrolysis; ECLSS context for failures |
| `eclssWater` | NASA. *NASA Achieves Water Recovery Milestone on International Space Station*, 20 June 2023. | https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/ | Water recovery 93–94% (98% with the Brine Processor Assembly) |
| `plants` | NASA. *Growing Plants in Space*. | https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/ | Greenhouse context (no numeric parameter) |
| `southPole` | NASA. *NASA Identifies Candidate Regions for Landing Next Americans on Moon*. | https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/ | South Pole setting (no numeric parameter) |
| `dust` | Gaier, J. R. *The Effects of Lunar Dust on EVA Systems During the Apollo Missions*. NASA/TM-2005-213610, 2005. | https://ntrs.nasa.gov/citations/20050160460 | Dust event |
| `powerRoadmap` | Mercer, C. R., et al. *Energy Storage Technology Development for Space Exploration*. NASA/TM-2011-216964, 2011. | https://ntrs.nasa.gov/citations/20110007105 | Battery specific energy (limited, see §I) |
| `artemis` | NASA. *NASA's Plan for Sustained Lunar Exploration and Development*, April 2020. | https://www.nasa.gov/wp-content/uploads/2020/08/a_sustained_lunar_presence_nspc_report4220final.pdf | Crew of four ("support a crew up to four") |

Additional references used in this document but not referenced by a game parameter:

- Shavers, M. R., et al. *Comparison of dose and risk estimates between ISS partner agencies for a 30-day lunar mission*. Zeitschrift für Medizinische Physik 34(1), 31–43, 2023. https://doi.org/10.1016/j.zemedi.2023.10.005. Open copy: https://pmc.ncbi.nlm.nih.gov/articles/PMC10919970/
- Matthiä, D., Meier, M. M. & Berger, T. *The Solar Particle Event on 10–13 September 2017: Spectral Reconstruction and Calculation of the Radiation Exposure in Aviation and Space*. Space Weather 16, 2018. https://doi.org/10.1029/2018SW001921
- NOAA SWPC. *Solar Proton Events Affecting the Earth Environment* (event list with peak ≥10 MeV flux). https://umbra.nascom.nasa.gov/SEP/
- Nealy, J. E., Wilson, J. W. & Townsend, L. W. *Solar-flare shielding with regolith at a lunar-base site*. NASA-TP-2869, 1988. https://ntrs.nasa.gov/citations/19890004839. Historical context only: Matthiä & Berger (2024, Table 2) find its doses 8–20× above modern transport results.
- Wilson, J. W., et al. *Transport Methods and Interactions for Space Radiations*. NASA RP-1257, 1991. https://spaceradiation.larc.nasa.gov/nasapapers/RP1257.pdf. Methodological background; no value is taken from it.

**Access notes.** The Dobynde & Guo values were read from the openly available preprint (Research Square rs-2364937, posted 4 January 2023); the published Nature Astronomy version is behind a paywall and was not compared figure-by-figure. The Matthiä & Berger values come from the open DLR copy and its Zenodo spreadsheets.

## C. Dosimetric quantities

Radiation numbers in mSv are **not** all the same quantity. The sources behind this game use five different ones:

| Quantity | Symbol / unit | What it is | Used by |
|---|---|---|---|
| Absorbed dose | *D*, Gy | Energy deposited per unit mass in a specific material (silicon, water, an organ). | CRaTER and LND detectors (silicon); Shavers et al. organ doses |
| Dose equivalent | *H = Q·D*, Sv | Absorbed dose weighted by a radiation quality factor Q(LET), at a point or in a thin detector. | Chang'e-4 LND: 1369 µSv/day in water |
| Organ dose equivalent | *H_T*, Sv | Dose equivalent averaged over an organ. | Shavers et al. (BFO, skin, eye, colon) |
| Gray-equivalent | *G = RBE·D*, Gy-Eq | Absorbed dose weighted by relative biological effectiveness (1.5 for protons > 2 MeV), for **deterministic** (acute) effects. | NASA-STD-3001 Table 4.8-1; Matthiä & Berger (skin, red bone marrow) |
| Effective dose | *E*, Sv | Organ doses weighted by tissue factors w_T, for **stochastic** risk (cancer). | NASA-STD-3001 V1 4030 and V1 4031; Dobynde & Guo; Shavers et al. |

**The game's counter is a "game radiation-dose estimate (mSv)".** The engine adds three contributions into one number each day:

```
dose/day = gcrDoseMsvPerDay × habitatGcrFactor  +  Σ storm_dose × Π dose_factor   (+ EVA doses)
```

- The GCR term starts from a **dose equivalent** measured by a thin detector (Chang'e-4).
- The storm terms are scenarios based on **effective dose** estimates (Dobynde & Guo), scaled by factors derived from **red-bone-marrow Gy-Eq** ratios (Matthiä & Berger).
- The EVA term is derived from the GCR dose equivalent.

Adding these together is a **didactic approximation that combines estimates from different sources and dosimetric quantities**. It is not a scientifically computed effective dose, and it should not be presented as one. It is useful because all terms are of the same order of magnitude and point in the right direction (shielding helps against storms, barely helps against cosmic rays, and dose accumulates).

## D. Shielding assumptions

**There is no public NASA specification for the wall areal density of a lightweight lunar habitat.** The closest references are:

| Reference | Value | What it represents |
|---|---|---|
| NASA-STD-3001 Rev C, Table 4.8-4 | 10 g/cm² water equivalent surrounding the crew member | Recommended **SPE shelter** on a celestial surface (reconfigurable), not habitat walls |
| Shavers et al. 2023 | 5 and 20 g/cm² Al | "Relatively thin and uniform shields" representing the vehicle; explicitly not a storm shelter |
| Dobynde & Guo 2024 | 10 g/cm² Al | "Close to the median shielding of the ISS modules" |

The game's "thin habitat" is therefore treated through **two exploratory sensitivity scenarios: 5 and 10 g/cm² aluminium equivalent**. These are research assumptions, not engineering specifications. Results computed in **regolith** (Matthiä & Berger) are kept separate from results in **aluminium**: regolith (mean Z ≈ 11) and aluminium (Z = 13) behave similarly per g/cm² for solar protons, but secondary-particle production differs, and water (hydrogen-rich) is more effective per g/cm² than either. No source used here compares regolith and aluminium for the same event.

## E. Solar storms: S3 and S4

### E.1 What NOAA S-levels are (and are not)

NOAA S-levels classify the **peak flux of protons above 10 MeV at geostationary orbit**: S3 (Strong) ≥ 10³ pfu, about 10 per solar cycle; S4 (Severe) ≥ 10⁴ pfu, about 3 per cycle. They are **flux categories, not doses**. The dose behind shielding depends on the event's **fluence and spectral hardness** (how many protons have more than ~30–100 MeV), which the S-level does not capture.

| Event | Peak ≥10 MeV (pfu) | NOAA level | Ground-level enhancement | Lunar dose estimate available |
|---|---|---|---|---|
| 19 Oct 1989 (series 19/22/24 Oct) | 40 000 | S4 | yes | Matthiä & Berger 2024; Shavers et al. 2023 (NASA reference SPE) |
| 14 Jul 2000 | 24 000 | S4 | yes | Dobynde & Guo 2024 (figure) |
| 4 Nov 2001 | 31 700 | S4 | yes | Dobynde & Guo 2024 (figure) |
| 28 Oct 2003 | 29 500 | S4 | yes | Dobynde & Guo 2024 (figure) |
| 16–20 Jan 2005 | 5 040 / 1 860 | S3 | yes (very hard spectrum) | Dobynde & Guo 2024 (figure) |
| 10 Sep 2017 | 1 490 | S3 | yes | Matthiä et al. 2018 (free space, skin); CRaTER |
| 23 Jan 2012, 7 Mar 2012 | 6 310 / 6 530 | S3 | no | none found |
| 4 Aug 1972 | — (before the NOAA list) | not classified | — | Matthiä & Berger 2024 |

Peak fluxes: NOAA SWPC event list.

Two S3 events can differ greatly in dose. Behind 10 g/cm² Al, Dobynde & Guo show the dose falling by only ≈38% from 5 g/cm² for the hard January 2005 event (read from their figure; their text gives "only ≈30%"), against 56–59% for the three S4 events.

### E.2 Strong storm (NOAA S3): 40 mSv/day × 2 days = 80 mSv per event

| Item | Value |
|---|---|
| Game value | `storm_dose` = 40 mSv/day for 2 days (`events.json`, variant `moderate`), total **80 mSv** |
| Previous value | 60 mSv/day × 2 days = 120 mSv (source cited: NOAA scales, which give no dose) |
| Source quantity | Effective dose (Dobynde & Guo 2024) |
| Reference event | 16–20 January 2005 (S3, very hard-spectrum ground-level enhancement event) |
| Exposure | Whole event, integrated |
| Habitat shielding | ~5 g/cm² aluminium (sensitivity scenario) |
| Published value | ≈8 cSv = 80 mSv at 5 g/cm² Al; ≈5 cSv = 50 mSv at 10 g/cm² Al (Fig. 3, top panel, preprint; **read from figure, ±1 cSv**) |
| Classification | Didactic approximation based on one published event |

**Justification.** The previous 120 mSv was about 1.5× the highest S3 estimate found (and about 2.4× at 10 g/cm²), from a model that tends to give high values (Matthiä & Berger report Dobynde & Guo GCR results 40–50% above other models).

**What the split means.** The real January 2005 period lasted several days and held at least two proton increases: NOAA lists an event starting 16 January 02:10 UT (peak 5 040 pfu on 17 January) and a second increase peaking at 1 860 pfu on 20 January 08:10 UT. Dobynde & Guo use event-integrated spectra and themselves attribute each event's dose to a one-day exposure for scheduling. Their figure shows a single bar for January 2005, and it cannot be resolved from the plot whether that bar covers one or both ground-level enhancements (17 and 20 January).

The game **compresses this multi-day scenario into 2 days**. The 40 mSv/day figure is an **artificial distribution of the 80 mSv scenario dose over game time**, not a daily rate observed in this or any other event.

**Limitations.**

- It represents a **hard-spectrum S3 event behind ~5 g/cm²**. It does not represent all S3 events: softer S3 events without a ground-level enhancement (January and March 2012) have no published lunar dose estimate that we found, and are expected to deliver less behind the same shielding. It is not a universal scientific value for "an S3 storm".
- Cross-check, September 2017 (S3): the computed skin absorbed dose in free space was 419–1 070 mGy behind 1 g/cm² Al and only 3.5–3.7 mGy behind 30 g/cm² (Matthiä et al. 2018). The lunar surface sees about half of the free-space value. No organ or effective dose at 5–10 g/cm² is given for this event.

### E.3 Severe storm (NOAA S4): 110 mSv/day × 2 days = 220 mSv per event

| Item | Value |
|---|---|
| Game value | `storm_dose` = 110 mSv/day for 2 days (`events.json`, variant `severe`), total **220 mSv** (unchanged) |
| Source quantity | Effective dose |
| Reference events | 14 Jul 2000, 4 Nov 2001, 28 Oct 2003 (S4, ground-level enhancement events); October 1989 series (NASA design-reference SPE) |
| Habitat shielding | ~5 g/cm² aluminium (sensitivity scenario) |
| Classification | Game choice within a published range |

Published values:

| Source | Event | Quantity | 5 g/cm² | 10 g/cm² | 20 g/cm² |
|---|---|---|---|---|---|
| Dobynde & Guo 2024, Fig. 3 (read from figure, ±1 cSv) | Jul 2000 / Nov 2001 / Oct 2003 | E, Al | 264 / 264 / 188 mSv | 113 / 108 / 82 mSv | — |
| Shavers et al. 2023, Table 6 minus Table 5 (derived) | Oct 1989 reference SPE | E, Al | 154–312 mSv (JAXA, NASA, RSA) | — | 44–89 mSv |
| Matthiä & Berger 2024, Zenodo Fig. 3 data | Oct 1989 reference SPE (sum) | Red bone marrow, Gy-Eq, regolith | 182 mGy-Eq | 107 mGy-Eq | 54 mGy-Eq |
| Matthiä & Berger 2024, Zenodo Fig. 3 data | 19 Oct 1989 only (incl. ESP phase) | Red bone marrow, Gy-Eq, regolith | 106 mGy-Eq | 63 mGy-Eq | 32 mGy-Eq |

**Justification.** 220 mSv lies inside the effective-dose range of the large S4 events behind ~5 g/cm² aluminium.

**Limitations.**

- It is a **high-intensity S4 scenario**. Not every S4 event is a hard-spectrum ground-level enhancement event.
- For 10 g/cm² the published values are about half (82–113 mSv), so the game value is about 2× too high for that scenario.
- Real S4 events last several days (the October 1989 series spans about a week). The 2-day split is a simulation simplification.
- The Matthiä & Berger rows are Gy-Eq to red bone marrow in regolith: a different quantity and material, shown for context and not mixed into the 220 mSv choice.

### E.4 Storm duration: 2 days

Game choice. It is consistent with an isolated event (the September 2017 dose was integrated over about 2.25 days by Matthiä et al. 2018), but not with a multi-event series such as October 1989.

## F. Shielding factors

### F.1 Habitat GCR factor: published-derived 0.53, game 0.7

Derivation of 0.53:

1. Matthiä & Berger 2024, Figure 4 data. Zenodo file `figure3_and_figure4_data.xlsx`, sheet `ICRP_PHANTOM`, row `5g/cm^2 Regolith` / `SUM`, column `dH/dt/(mSv/d)`: **0.723451 mSv/day**. This is the whole-body averaged dose equivalent rate of the ICRP male phantom, solar-minimum GCR, behind 5 g/cm² regolith plus a 0.5 g/cm² suit. The authors use it as an estimate of effective dose equivalent.
2. Chang'e-4 LND dose equivalent rate (Zhang et al. 2020): **1.369 mSv/day**.
3. 0.723451 ÷ 1.369 = **0.528 ≈ 0.53**.

At 10 g/cm² the same operation gives 0.659 ÷ 1.369 = 0.48.

**The two numbers are not directly comparable, so 0.53 is a methodological approximation, not a physical shielding factor.**

| | Numerator: 0.723 mSv/day | Denominator: 1.369 mSv/day |
|---|---|---|
| Origin | Model (Geant4, Matthiä & Berger 2024) | Measurement (Chang'e-4 LND, Zhang et al. 2020) |
| Quantity | Whole-body averaged dose equivalent of an ICRP phantom | Dose equivalent in water inferred from a thin silicon detector (Si dose × 1.3, mean Q ≈ 4.3) |
| Particles | All primaries Z = 1–26 and all secondaries, including neutrons | Charged particles only |
| GCR conditions | Modelled solar-minimum (maximum intensity) spectrum | Measured, January–February 2019 (low solar modulation) |
| Shielding | 5 g/cm² regolith hemisphere + 0.5 g/cm² suit | Lander housing only |

Using the paper's own thin-tissue-slab value for charged particles behind no extra shielding (64.7 µSv/h = 1.553 mSv/day, Table 3), the ratio splits exactly into three factors:

```
0.528 = 0.864 (5 g/cm² regolith: 0.723 / 0.837)
      × 0.539 (body self-shielding vs thin slab: 0.837 / 1.553)
      × 1.134 (model vs measurement offset: 1.553 / 1.369)
```

Only the first factor is shielding. The second is the difference between a detector reading and a whole-body quantity. The third is a 13% disagreement between model and measurement, within the measurement's uncertainty (57.1 ± 10.6 µSv/h). A fully model-consistent ratio (0.723 / 1.553) would be 0.47.

**Game choice: 0.7.** This is a **conservative modelling choice of the game, not a published shielding factor**. In-habitat GCR becomes 1.37 × 0.7 = 0.96 mSv/day, about 35% above the modelled whole-body value at 5 g/cm² (0.72 mSv/day). It must not be described as "the walls block 30%":

- The GCR **absorbed** dose barely changes between 0 and 180 g/cm² (0.25–0.28 mGy/day).
- The whole-body dose equivalent falls only to 0.86× at 5 g/cm² and 0.79× at 10 g/cm², relative to suit-only.

### F.2 Shelter: factor 0.3 (≈70% reduction)

| Item | Value |
|---|---|
| Game value | `dose_factor` = 0.3 on the `shelter` option (`events.json`): **30% of the storm dose remains** |
| Previous value | 0.1 (90% blocked, cited to the Chang'e-4 GCR paper, which does not address solar storms) |
| Shielding hypothesis | The shelter adds **~15 g/cm² of regolith** to a ~5 g/cm² habitat |
| Classification | Derived from published data, under a stated hypothesis |

Derivation of 0.30, from Matthiä & Berger 2024 (Zenodo Fig. 3 data, red bone marrow, Gy-Eq). The sum of the four October 1989 spectra (the NASA design-reference SPE) gives 53.9 mGy-Eq at 20 g/cm² ÷ 181.9 mGy-Eq at 5 g/cm² = **0.296 ≈ 0.30**.

| Published or derived result | Remaining fraction (+15 g/cm²) |
|---|---|
| Oct 1989 reference SPE, regolith (Matthiä & Berger, derived) | 0.30 |
| Aug 1972 (soft spectrum), regolith (Matthiä & Berger, derived) | 0.16 |
| Oct 1989 reference SPE, 20 vs 5 g/cm² Al (Shavers et al., derived) | 0.26–0.37 |

**Comparability of 53.9 and 181.9.** Both numbers come from the same Matthiä & Berger simulation set (Zenodo `figure3_and_figure4_data.xlsx`, `Sheet1`, "Bone marrow" columns). They use the same:

- transport code (Geant4 11.0, QGSP_INCLXX_HP_EMZ);
- ICRP male voxel phantom and organ (red bone marrow, taken as BFO);
- quantity (Gy-Eq, RBE-weighted);
- input spectra (the four October 1989 spectra of Tylka et al. 2010: 19 Oct, 19 Oct ESP, 22 Oct, 24 Oct);
- geometry (hemispherical regolith shell, inner radius 2 m, density 3 g/cm³, above a phantom in a 0.5 g/cm² suit standing on a regolith block).

The only difference is the shell thickness: 5 g/cm² (1.66 cm) versus 20 g/cm² (6.66 cm). The ratio is therefore a like-for-like shielding comparison. Statistical uncertainty: 181.9 ± 1.2 and 53.9 ± 0.6 mGy-Eq, ratio 0.296 ± 0.004.

Methodological notes:

- The spreadsheet has no "sum" column. The October 1989 reference total is our sum of the four event columns, which is valid because event doses add.
- Both cases include the 0.5 g/cm² suit, so the real totals are 5.5 and 20.5 g/cm².
- The ratio is for red-bone-marrow Gy-Eq, but the game applies it to storm values based on effective dose. Shavers et al. give a similar effective-dose ratio (0.26–0.37 for 20 vs 5 g/cm² Al), but an effective-dose ratio for this regolith geometry was not computed.
- The geometry is a hemisphere over a person standing on the ground, not a habitat module. The regolith baseline (5 g/cm²) also differs in material from the aluminium baseline used for the storm doses (§D).

0.3 uses the hardest (design-reference) spectrum, so it is on the conservative side for softer events. The value 0.1 would need roughly 30 g/cm² or more of added shielding for the reference spectrum. That is an extrapolation: none of these sources computes solar-storm doses beyond 20 g/cm².

**Limitations.**

- 0.3 is **not a property of every lunar shelter**. It depends on thickness, material, geometry and the event spectrum.
- NASA-STD-3001 Table 4.8-4 recommends 10 g/cm² water equivalent around the crew on a surface. Water is more effective per g/cm² than regolith, so that guideline and our 15 g/cm² regolith hypothesis are comparable but not identical.
- `buildings.json` `radiation_shelter.stormDoseFactor` (0.3) is **not read by the engine**. It is kept in sync for documentation and type compatibility, and the validator checks it.

### F.3 Water wall: published-derived 0.42–0.59, game 0.5

Derived from Matthiä & Berger 2024 (red bone marrow, regolith): adding 5 g/cm² (10 vs 5 g/cm²) leaves **0.59** of the dose for the October 1989 reference SPE (107.4 ÷ 181.9) and **0.42** for August 1972 (37.2 ÷ 87.6). Dobynde & Guo give 0.41–0.62 for 10 vs 5 g/cm² Al. The game's 0.5 lies in this range.

**Geometric limitation.** The option requires **100 kg** of stored water. Spread to an areal density of 5–10 g/cm² (50–100 kg/m²), 100 kg covers only **1–2 m²**, not a habitat wall or a sleeping area for four people. The real effectiveness depends on geometry, coverage and where the crew is. This is a **gameplay simplification**. The 100 kg threshold was intentionally kept unchanged in this issue.

## G. The 250 mSv mission threshold

**What the engine does.** `failure.ts` ends the mission when the cumulative game radiation-dose estimate (GCR + storms + EVAs since day 1) reaches `moon.json` `doseLimitMsv` = 250. A warning appears at 150 (`doseWarningMsv`).

**What NASA-STD-3001 Rev C actually says.** Three separate requirements:

| Requirement | Value | Quantity | Nature |
|---|---|---|---|
| V1 4030 | 600 mSv | Effective dose | Career limit for all spaceflight radiation |
| V1 4031 | 250 mSv | Effective dose | **Design requirement**: the program shall protect crew from the design-reference SPE (sum of the October 1989 events) to less than 250 mSv |
| Table 4.8-1 | 250 mGy-Eq | Gray-equivalent to blood-forming organs | 30-day limit for non-cancer (deterministic) effects |

**How to describe the game's threshold.** It is a **didactic threshold**. It reuses the number 250, which appears in both V1 4031 and Table 4.8-1, but it **reproduces neither**:

- V1 4031 constrains how a vehicle is designed against one reference event; it is not an operational counter.
- Table 4.8-1 is per organ, in Gy-Eq, over a 30-day window.
- NASA does not apply a single cumulative mission-abort threshold of 250.

The game's missions (12 and 28 days) fit inside a 30-day window, which is the only reason the time scale is comparable. Player-facing texts say "this mission's limit … based on NASA's short-term radiation values", not "NASA's limit".

**Didactic thresholds without a scientific source:**

- 150 mSv warning (`doseWarningMsv`).
- 100 mSv "radiation safe" achievement (`SAFE_DOSE_MSV` in `scoring.ts`, and the meter mark in `ResourcePanel.tsx`).

## H. Other parameters

| Parameter | Game value | Published value | Status |
|---|---|---|---|
| GCR dose rate | 1.37 mSv/day | 1369 µSv/day (Zhang et al. 2020): dose equivalent in water from a thin silicon detector, charged particles only, January–February 2019, solar minimum | Published. Using a thin-detector value overstates the whole-body dose (see F.1). |
| EVA dose | 0.5 mSv | Derived: 1.37 mSv/day × 8/24 h = 0.46 mSv | Approximation; ignores suit shielding and solar activity. `moon.json` `evaDoseMsv` is not read by the engine; the event effect is. |
| O₂ per crew member | 0.84 kg/day | 0.84 kg/day (BVAD REV2, Table 3-23, activity profile); nominal summary value 0.895 | Published, with caveat |
| Water per crew member | 3.5 kg/day | Potable water content 3.217 kg/CM-d (BVAD REV2) | Game choice close to published; includes minimal hygiene |
| Food per crew member | 1.8 kg/day | 1.83 kg/CM-d (earlier ISS value); BVAD REV2 now gives 2.39 kg/CM-d with packaging | Game choice based on an older value |
| Water recovery | 0.93 | 93–94% before the Brine Processor Assembly; 98% after (NASA, 2023) | Published |
| Electrolysis water per kg O₂ | 1.125 kg/kg | Stoichiometry 2 H₂O → 2 H₂ + O₂: 36.03/32.00 = 1.126 | Derived |
| Battery specific energy | 240 Wh/kg | 2011 battery-level goals 150 (HE) and 220 (UHE) Wh/kg (NASA/TM-2011-216964) | Game value ~9% above the 2011 goal; limited validation (see §I) |
| Crew size | 4 | Artemis Base Camp habitat "will support a crew up to four" | Published |

## I. Model limitations

1. **One mixed dose counter.** The game radiation-dose estimate adds quantities that are not strictly additive (§C).
2. **Thin-habitat shielding is assumed, not specified.** The 5 and 10 g/cm² Al scenarios are sensitivity assumptions (§D).
3. **NOAA level → dose is a scenario, not a mapping.** One representative event per level; real events vary by an order of magnitude or more within a level (§E.1).
4. **Storms are 2 days with a constant rate.** Real events have a rising and decaying profile and may come in series.
5. **No solar-cycle modulation of GCR.** 1.37 mSv/day is a solar-minimum (high-GCR) value; at solar maximum the GCR dose is lower.
6. **Shielding factors are spectrum-dependent.** A single factor per option is used for every storm; the factors are derived from red-bone-marrow ratios and applied to an effective-dose-based storm value.
7. **Water-wall geometry is idealised** (§F.3).
8. **Figure-read values.** Dobynde & Guo storm doses were read from a plot of the preprint (±1 cSv).
9. **`powerRoadmap` is a substitute source.** The originally cited *NASA Technology Roadmaps TA 3 (2015)* page is offline (HTTP 404) and no official copy was found. The NASA/TM-2011-216964 replacement is accessible and relevant, but it gives development goals (2011), not a 2015 roadmap value, and the game's 240 Wh/kg is above its 220 Wh/kg battery-level goal.
10. **Older and non-primary sources.** TP-2869 (1988) is cited as historical context only. The `plants` and `southPole` pages support narrative context, not numeric parameters.

## J. Traceability

Each row is checked by section 3 of `tools/science/validate_parameters.py`. The validator compares the documented `gameValue` with the game data, and also verifies whether the listed runtime file actually reads the field. A field marked *documentation only* must not be read by any runtime file.

| `science.json` parameter | Game data field | Read by | Tag |
|---|---|---|---|
| Radiation dose on the lunar surface (GCR) | `moon.json` `environment.gcrDoseMsvPerDay` | `game/simulation/tick.ts` | S3, N2 |
| Habitat GCR factor | `moon.json` `environment.habitatGcrFactor` | `game/simulation/tick.ts` | S3, N2 |
| Mission radiation threshold (didactic) | `moon.json` `environment.doseLimitMsv` | `game/rules/failure.ts` | S3, N2 |
| Strong solar storm (NOAA S3) | `events.json` `solar_storm.variants.moderate` `storm_dose` × `days` | `game/simulation/tick.ts` | S3, N2 |
| Severe solar storm (NOAA S4) | `events.json` `solar_storm.variants.severe` `storm_dose` × `days` | `game/simulation/tick.ts` | S3, N2 |
| Shelter storm-dose factor | `events.json` `solar_storm` option `shelter` `dose_factor` | `game/simulation/tick.ts` | S3, N2 |
| Shelter storm-dose factor | `buildings.json` `radiation_shelter.stormDoseFactor` | documentation only | N2 |
| Water wall storm-dose factor | `events.json` `solar_storm` option `water_wall` `dose_factor` | `game/simulation/tick.ts` | S3, N2 |
| Spacewalk (EVA) dose | `events.json` `power_failure` option `eva_clean` `addDose` | `game/events/effects.ts` | N2 |
| Spacewalk (EVA) dose | `moon.json` `environment.evaDoseMsv` | documentation only | N2 |
| Oxygen / water / food per astronaut | `moon.json` `environment.crewPerPersonPerDay` | `game/resources/loadout.ts` | N2 |
| Water recovery rate | `buildings.json` `water_recycler.waterRecoveryRate` | `game/simulation/tick.ts` | N2 |
| Water needed per kg of O₂ | `buildings.json` `oxygen_generator.waterPerKgOxygen` | `game/simulation/tick.ts` | N2 |
| Li-ion battery specific energy | `buildings.json` `battery.storageKwh` / `massKg` | `game/buildings/buildings.ts` | N2 |
| Typical crew size | `moon.json` `missions[].crew` | `game/missions/createMission.ts` | N2 |

S3 and S4 were previously only present in `events.json` (S4 had no documentation entry at all). Both now have their own `science.json` entry, and any change to the storm data that is not mirrored in `science.json` makes the validator fail.

### Gameplay consequences of the Sprint 3 revision

The S3 value (60 → 40 mSv/day) and shelter factor (0.1 → 0.3) changed. Mean over 300 seeds per scenario (`npm run balance`):

| Scenario | Dose before | Dose after | Win rate |
|---|---|---|---|
| Cadet, recommended loadout, careful | 24 mSv | 36 mSv | 100% |
| Cadet, recommended loadout, reckless | 132 mSv | 92 mSv | 97% |
| Commander, recommended loadout, careful | 61 mSv | 117 mSv | 99% |
| Commander, recommended loadout, reckless | 203 mSv | 221 mSv | 0% |
| Commander, no shelter (water wall), careful | 250 mSv | 230 mSv | 49% |

**Achievement impact.** With a realistic shelter, the Commander mission can no longer earn the "Radiation safe" achievement (dose below 100 mSv). Even with perfect shelter use, the minimum dose is about 26.9 (GCR) + 80 × 0.3 + 220 × 0.3 ≈ 117 mSv. This is physically coherent (a shelter reduces a storm, it does not erase it), but it changes the player experience. The achievement mechanics were deliberately left unchanged; rebalancing achievements is recommended as a separate issue.

## K. Engineering break-even

Printed by section 4 of the validator (crew of four):

- The water recycler (600 kg) saves 15.0 kg/day of launched water tanks, so it becomes lighter than carrying water after **40 days**.
- Oxygen from tanks costs 7.6 kg of launch mass per day, so the oxygen generator (500 kg) pays off after **66 days**, ignoring the water it consumes.
