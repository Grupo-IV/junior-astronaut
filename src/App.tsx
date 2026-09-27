import { AppProvider } from './app/state/AppContext'
import { Router } from './app/routes/Router'

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  )
}
