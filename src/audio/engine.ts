/**
 * @file
 * @brief Procedural sound engine built on the Web Audio API.
 *
 * Every sound is synthesised in code at runtime: the project ships no audio
 * files, so there are no third-party assets or licences to track.
 *
 * Browsers only allow audio after a user gesture, so the context is created
 * (or resumed) on the first click or key press.
 */
import type { Cue } from './cues'
import { isMuted, subscribeMuted } from './settings'

/** Overall loudness. Kept low on purpose: sound is feedback, not the main channel. */
const MASTER_VOLUME = 0.45
const HUM_VOLUME = 0.05
const CLICK_VOLUME = 0.32
const LOOKAHEAD_S = 0.15
const SCHEDULER_MS = 50

type Wave = OscillatorType

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfx: AudioNode | null = null
  private noise: AudioBuffer | null = null
  private unlockInstalled = false

  private hum: { gain: GainNode; filter: BiquadFilterNode; sources: AudioScheduledSourceNode[] } | null = null
  private humStopTimer: number | null = null

  private clickRate = 0
  private clickTimer: number | null = null
  private nextClickAt = 0

  /** Installs the one-time gesture listeners that unlock audio. Safe to call repeatedly. */
  installUnlock() {
    if (this.unlockInstalled || typeof window === 'undefined') return
    this.unlockInstalled = true
    const unlock = () => {
      const ctx = this.context()
      if (ctx && ctx.state === 'suspended') void ctx.resume()
    }
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      this.ctx = new Ctor()
    } catch {
      return null
    }
    const ctx = this.ctx

    // master → limiter → speakers. The compressor keeps overlapping cues from clipping.
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -12
    limiter.ratio.value = 8
    limiter.connect(ctx.destination)
    this.master = ctx.createGain()
    this.master.gain.value = isMuted() ? 0 : MASTER_VOLUME
    this.master.connect(limiter)

    // Alarms go through a gentle low-pass: habitat speakers are small and the tones should never be shrill.
    const soften = ctx.createBiquadFilter()
    soften.type = 'lowpass'
    soften.frequency.value = 4200
    soften.connect(this.master)
    this.sfx = soften

    const length = ctx.sampleRate * 2
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1

    subscribeMuted(() => this.applyMute())
    return ctx
  }

  private running(): AudioContext | null {
    const ctx = this.context()
    return ctx && ctx.state === 'running' ? ctx : null
  }

  private applyMute() {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    this.master.gain.cancelScheduledValues(ctx.currentTime)
    this.master.gain.setTargetAtTime(isMuted() ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05)
  }

  // ---------------------------------------------------------------- one-shot cues

  play(cue: Cue) {
    if (isMuted()) return
    const ctx = this.running()
    if (!ctx) return
    const t = ctx.currentTime + 0.03
    switch (cue) {
      case 'caution':
        // Two-tone chime, twice: "attention, a system needs you".
        for (let i = 0; i < 2; i++) {
          this.tone('triangle', 988, 988, t + i * 0.75, 0.22, 0.2)
          this.tone('triangle', 740, 740, t + i * 0.75 + 0.25, 0.32, 0.2)
        }
        break
      case 'warning':
        // Three rising whoops: a threat to the crew, act now.
        for (let i = 0; i < 3; i++) {
          this.tone('square', 440, 1100, t + i * 0.55, 0.42, 0.06)
          this.tone('sine', 440, 1100, t + i * 0.55, 0.42, 0.14)
        }
        break
      case 'storm':
        this.stormAlert(t)
        break
      case 'success':
        ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone('sine', f, f, t + i * 0.13, 0.55, 0.13))
        break
      case 'failure':
        ;[392, 311.13, 233.08].forEach((f, i) => this.tone('triangle', f, f * 0.98, t + i * 0.45, 0.6, 0.16))
        break
    }
  }

  /**
   * Solar particle alert. Deliberately unlike the alarms: a falling sweep, a
   * burst of radio static (the proton flux also blinds radios and detectors)
   * and the triple chirp of a personal dosimeter crossing its alarm threshold.
   */
  private stormAlert(t: number) {
    const ctx = this.ctx!
    this.tone('sawtooth', 520, 140, t, 1.4, 0.06)
    this.tone('sine', 260, 70, t, 1.4, 0.12)

    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 2600
    band.Q.value = 0.8
    const crackle = ctx.createGain()
    crackle.gain.setValueAtTime(0, t)
    for (let s = 0; s < 1.4; s += 0.03) crackle.gain.setValueAtTime(Math.random() < 0.45 ? 0.05 + Math.random() * 0.12 : 0, t + s)
    crackle.gain.setValueAtTime(0, t + 1.4)
    src.connect(band).connect(crackle).connect(this.sfx!)
    src.start(t, Math.random())
    src.stop(t + 1.45)

    for (let i = 0; i < 3; i++) this.tone('sine', 1320, 1320, t + 1.55 + i * 0.16, 0.09, 0.12)
  }

  private tone(type: Wave, from: number, to: number, start: number, duration: number, peak: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(from, start)
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration)
    const env = ctx.createGain()
    const attack = Math.min(0.015, duration / 4)
    const release = Math.min(0.06, duration / 3)
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(peak, start + attack)
    env.gain.setValueAtTime(peak, start + duration - release)
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(env).connect(this.sfx!)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }

  // ---------------------------------------------------------------- radiation dosimeter

  /** Average Geiger clicks per second; 0 stops the counter. */
  setRadiation(clicksPerSecond: number) {
    this.clickRate = Math.max(0, clicksPerSecond)
    if (this.clickRate > 0 && this.clickTimer === null && typeof window !== 'undefined') {
      this.clickTimer = window.setInterval(() => this.scheduleClicks(), SCHEDULER_MS)
    } else if (this.clickRate === 0 && this.clickTimer !== null) {
      window.clearInterval(this.clickTimer)
      this.clickTimer = null
    }
  }

  /** Radioactive decay and particle hits are random in time: intervals follow an exponential (Poisson) distribution. */
  private nextInterval() {
    return -Math.log(1 - Math.random()) / this.clickRate
  }

  private scheduleClicks() {
    const ctx = this.running()
    if (!ctx || isMuted() || this.clickRate <= 0) return
    const now = ctx.currentTime
    if (this.nextClickAt < now) this.nextClickAt = now + this.nextInterval()
    while (this.nextClickAt < now + LOOKAHEAD_S) {
      this.click(this.nextClickAt)
      this.nextClickAt += this.nextInterval()
    }
  }

  private click(t: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1800
    const env = ctx.createGain()
    const peak = CLICK_VOLUME * (0.6 + Math.random() * 0.4)
    env.gain.setValueAtTime(peak, t)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.012)
    src.connect(hp).connect(env).connect(this.master!)
    src.start(t, Math.random() * 1.9)
    src.stop(t + 0.015)
  }

  // ---------------------------------------------------------------- habitat ambience

  /** Life-support fan noise, 0..1. Changes glide slowly, like fans spinning up or down. */
  setHum(level: number) {
    const ctx = this.context()
    if (!ctx) return
    if (level > 0 && !this.hum) this.startHum(ctx)
    if (!this.hum) return
    if (this.humStopTimer !== null) {
      window.clearTimeout(this.humStopTimer)
      this.humStopTimer = null
    }
    const now = ctx.currentTime
    this.hum.gain.gain.setTargetAtTime(level * HUM_VOLUME, now, level === 0 ? 0.8 : 1.2)
    this.hum.filter.frequency.setTargetAtTime(90 + 260 * level, now, 1.2)
  }

  private startHum(ctx: AudioContext) {
    const gain = ctx.createGain()
    gain.gain.value = 0
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 350
    filter.connect(gain).connect(this.master!)

    const air = ctx.createBufferSource()
    air.buffer = this.noise
    air.loop = true
    air.connect(filter)

    // Blade-pass tone of the cabin fans, very faint.
    const blade = ctx.createOscillator()
    blade.frequency.value = 118
    const bladeGain = ctx.createGain()
    bladeGain.gain.value = 0.25
    blade.connect(bladeGain).connect(filter)

    air.start()
    blade.start()
    this.hum = { gain, filter, sources: [air, blade] }
  }

  /** Fades out every continuous sound (leaving the outpost screen). */
  stopAmbient() {
    this.setRadiation(0)
    if (!this.hum || !this.ctx) return
    this.setHum(0)
    const hum = this.hum
    this.humStopTimer = window.setTimeout(() => {
      hum.sources.forEach((s) => s.stop())
      hum.gain.disconnect()
      if (this.hum === hum) this.hum = null
      this.humStopTimer = null
    }, 4000)
  }
}

export const audioEngine = new AudioEngine()
