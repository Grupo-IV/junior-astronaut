/**
 * @file
 * @brief Shared domain types for simulation, React and Three.js.
 */

/** Stored consumables. Units: kg for mass, kWh for energy. */
export type StockId = 'water' | 'oxygen' | 'food' | 'energy'

export type Stocks = Record<StockId, number>

export type BuildingId =
  | 'solar_array'
  | 'battery'
  | 'water_recycler'
  | 'greenhouse'
  | 'oxygen_generator'
  | 'radiation_shelter'

export type CargoId = 'water_crate' | 'oxygen_tank' | 'food_crate' | 'spare_parts'

export type LoadoutItemId = BuildingId | CargoId

export type Loadout = Record<LoadoutItemId, number>

export interface ScienceNote {
  text: string
  source: string
}

export interface BuildingDef {
  id: BuildingId
  name: string
  icon: string
  massKg: number
  maxCount: number
  powerDemandKwhPerDay: number
  shedPriority: number
  powerOutputKwhPerDay?: number
  storageKwh?: number
  waterRecoveryRate?: number
  oxygenOutputKgPerDay?: number
  waterPerKgOxygen?: number
  oxygenSetpointDays?: number
  growthDays?: number
  foodOutputKgPerDay?: number
  oxygenBonusKgPerDay?: number
  waterUseKgPerDay?: number
  stormDoseFactor?: number
  summary: string
  benefit: string
  tradeoff: string
  science: ScienceNote
}

export interface CargoDef {
  id: CargoId
  name: string
  icon: string
  massKg: number
  maxCount: number
  stock?: Exclude<StockId, 'energy'>
  contentKg?: number
  summary: string
  science: ScienceNote
}

export interface IlluminationPeriod {
  fromDay: number
  toDay: number
  factor: number
  label: string
}

export interface ScheduledEvent {
  day: number
  eventId: string
  variant?: string
}

export interface MissionDef {
  id: string
  name: string
  location: string
  difficulty: 'Cadet' | 'Commander'
  crew: number
  durationDays: number
  launchMassBudgetKg: number
  initialStocks: Omit<Stocks, 'energy'>
  storageCapacity: Omit<Stocks, 'energy'>
  illumination: IlluminationPeriod[]
  scheduledEvents: ScheduledEvent[]
  randomEventChancePerDay: number
  randomEventPool: string[]
  firstRandomEventDay: number
  minDaysBetweenEvents: number
  recommendedLoadout: Partial<Loadout>
  briefing: {
    tagline: string
    story: string
    objectives: string[]
    hazards: string[]
    tip: string
  }
}

export interface EnvironmentDef {
  name: string
  gcrDoseMsvPerDay: number
  habitatGcrFactor: number
  evaDoseMsv: number
  doseLimitMsv: number
  doseWarningMsv: number
  crewPerPersonPerDay: { oxygenKg: number; waterKg: number; foodKg: number }
  habitat: {
    powerDemandKwhPerDay: number
    internalBatteryKwh: number
  }
  foodGraceDays: number
  powerCrisisGraceDays: number
}

export type ModifierKind =
  | 'storm_dose' // mSv/day reaching the crew inside the habitat
  | 'dose_factor' // multiplies storm dose (shielding)
  | 'solar_output' // multiplies solar array output
  | 'building_output' // multiplies a building's production (target)
  | 'building_offline' // target building does not run
  | 'extra_power' // extra kWh/day demand
  | 'water_loss' // fraction of stored water lost per day

export type BuildingTarget = BuildingId | 'random-active' | 'random-life-support' | 'event-target'

export type Effect =
  | { type: 'addStock'; stock: StockId; amount: number }
  | { type: 'scaleStock'; stock: StockId; factor: number }
  | { type: 'addDose'; msv: number }
  | { type: 'modifier'; kind: ModifierKind; value: number; days: number; target?: BuildingId; label: string }
  | { type: 'failBuilding'; target: BuildingTarget }
  | { type: 'repairBuilding'; target: BuildingTarget }
  | { type: 'disableBuilding'; target: BuildingId }
  | { type: 'resetGrowth' }
  | { type: 'useSpare'; amount: number }
  | { type: 'chance'; probability: number; effects: Effect[]; otherwise?: Effect[]; note: string; otherwiseNote?: string }

export interface OptionRequirement {
  building?: BuildingId
  spareParts?: number
  minStock?: { stock: StockId; amount: number }
}

export type RiskTag = 'oxygen' | 'water' | 'food' | 'power' | 'radiation'

export interface DecisionOption {
  id: string
  label: string
  icon: string
  benefit: string
  cost: string
  requires?: OptionRequirement
  effects: Effect[]
  risks: RiskTag[]
  lesson: string
}

export interface EventTriggerConditions {
  building?: BuildingId
  anyBuilding?: BuildingId[]
  productiveGreenhouse?: boolean
}

export interface EventVariant {
  label: string
  onTrigger: Effect[]
}

export interface EventDef {
  id: string
  title: string
  icon: string
  what: string
  why: string
  principle: string
  source: string
  conditions?: EventTriggerConditions
  onTrigger: Effect[]
  variants?: Record<string, EventVariant>
  options: DecisionOption[]
}

export type BuildingStatus = 'ok' | 'failed'

export interface BuildingInstance {
  uid: string
  defId: BuildingId
  enabled: boolean
  status: BuildingStatus
  powered: boolean
  growth: number
}

export interface Modifier {
  id: string
  kind: ModifierKind
  value: number
  remainingDays: number
  target?: BuildingId
  label: string
  source: string
}

export type LogKind = 'info' | 'success' | 'warning' | 'danger' | 'science'

export interface LogEntry {
  day: number
  kind: LogKind
  text: string
}

export interface PendingEvent {
  eventId: string
  variant?: string
  day: number
  targetUid?: string
}

export interface DecisionRecord {
  day: number
  eventId: string
  eventTitle: string
  optionId: string
  optionLabel: string
  risks: RiskTag[]
  notes: string[]
}

export interface DaySnapshot {
  day: number
  water: number
  oxygen: number
  food: number
  energy: number
  dose: number
  generationKwh: number
  demandKwh: number
  illumination: number
}

export interface DayReport {
  day: number
  illumination: number
  generationKwh: number
  demandKwh: number
  servedKwh: number
  shed: BuildingId[]
  habitatUnpowered: boolean
  flows: Record<Exclude<StockId, 'energy'>, { produced: number; consumed: number }>
  doseMsv: number
  unshieldedDoseMsv: number
}

export interface MissionStats {
  doseBackground: number
  doseStorm: number
  doseEva: number
  doseBlocked: number
  daysWithShedding: number
  energyWastedKwh: number
  producedOxygen: number
  producedFood: number
  recycledWater: number
}

export type FailureCause = 'oxygen' | 'water' | 'food' | 'power' | 'radiation'

export type MissionStatus = 'running' | 'awaiting-decision' | 'success' | 'failure'

export interface MissionState {
  missionId: string
  seed: number
  rng: number
  day: number
  status: MissionStatus
  loadout: Loadout
  stocks: Stocks
  crewDoseMsv: number
  buildings: BuildingInstance[]
  spareParts: number
  modifiers: Modifier[]
  pendingEvent: PendingEvent | null
  decisions: DecisionRecord[]
  log: LogEntry[]
  history: DaySnapshot[]
  lastReport: DayReport | null
  counters: { foodEmptyDays: number; powerCrisisDays: number; lastEventDay: number; lastRepairDay: number }
  stats: MissionStats
  failure: { cause: FailureCause; day: number } | null
  nextUid: number
}

/** Everything the engine needs that comes from JSON. */
export interface GameContent {
  environment: EnvironmentDef
  missions: MissionDef[]
  buildings: Record<BuildingId, BuildingDef>
  cargo: Record<CargoId, CargoDef>
  events: Record<string, EventDef>
  science: ScienceData
}

export interface ScienceSource {
  title: string
  org: string
  url: string
}

export interface Lesson {
  title: string
  what: string
  why: string
  principle: string
  alternatives: string[]
}

export interface ScienceParameter {
  name: string
  value: number
  unit: string
  gameValue: number
  source: string
  note: string
}

export interface ScienceData {
  sources: Record<string, ScienceSource>
  parameters: ScienceParameter[]
  lessons: Record<FailureCause, Lesson>
  successLesson: Lesson
}
