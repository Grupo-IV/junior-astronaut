/**
 * @file
 * @brief Mute / unmute control for all game audio.
 */
import { setMuted, useMuted } from '../../audio/settings'
import { Button } from './ui'

export function SoundToggle({ className = '' }: { className?: string }) {
  const muted = useMuted()
  return (
    <Button
      variant="ghost"
      className={className}
      aria-label={muted ? 'Sound is off, click to turn it on' : 'Sound is on, click to mute'}
      title={muted ? 'Sound is off. Every alert is also shown on screen.' : 'Sound is on. Click to mute.'}
      onClick={() => setMuted(!muted)}
    >
      <span aria-hidden>{muted ? '🔇' : '🔊'}</span>
      {muted ? 'Sound off' : 'Sound on'}
    </Button>
  )
}
