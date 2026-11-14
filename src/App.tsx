import { useEffect } from 'react'
import { AppProvider } from './app/state/AppContext'
import { Router } from './app/routes/Router'
import { useI18n } from './i18n/useI18n'

function DocumentTitle() {
  const { t } = useI18n()
  useEffect(() => {
    document.title = t('app.title')
  }, [t])
  return null
}

export default function App() {
  return (
    <AppProvider>
      <DocumentTitle />
      <Router />
    </AppProvider>
  )
}
