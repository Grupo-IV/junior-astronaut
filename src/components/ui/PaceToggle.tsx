/**
 * @file
 * @brief "No time pressure" switch: urgent decisions in first person wait without a countdown.
 */
import { setRelaxed, useRelaxed } from '../../app/settings/pace'
import { useI18n } from '../../i18n/useI18n'
import { Icon } from './Icon'
import { Button } from './ui'

export function PaceToggle({ className = '' }: { className?: string }) {
  const relaxed = useRelaxed()
  const { t } = useI18n()
  return (
    <Button variant="ghost" className={className} aria-pressed={relaxed} aria-label={t('pace.aria')} title={t('pace.about')} onClick={() => setRelaxed(!relaxed)}>
      <Icon name={relaxed ? 'pause' : 'play'} />
      <span>{relaxed ? t('pace.relaxedOn') : t('pace.relaxedOff')}</span>
    </Button>
  )
}
