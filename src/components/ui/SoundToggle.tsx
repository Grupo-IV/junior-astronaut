/**
 * @file
 * @brief Mute / unmute control for all game audio.
 */
import { setMuted, useMuted } from '../../audio/settings'
import { useI18n } from '../../i18n/useI18n'
import { Button } from './ui'

export function SoundToggle({ className = '' }: { className?: string }) {
  const muted = useMuted()
  const { t } = useI18n()
  return (
    <Button
      variant="ghost"
      className={className}
      aria-label={muted ? t('sound.offAria') : t('sound.onAria')}
      title={muted ? t('sound.offTitle') : t('sound.onTitle')}
      onClick={() => setMuted(!muted)}
    >
      <span aria-hidden>{muted ? '🔇' : '🔊'}</span>
      {muted ? t('sound.off') : t('sound.on')}
    </Button>
  )
}
