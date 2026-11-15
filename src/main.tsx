import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import type { AppState } from './app/state/appState'
import { audioEngine } from './audio/engine'

// Browsers only start audio after a user gesture; the first click or key press unlocks it.
audioEngine.installUnlock()

async function start() {
  let initialState: AppState | undefined
  // Development only: `?preview=outpost` opens a prepared screen (stripped from production builds).
  if (import.meta.env.DEV && location.search.includes('preview=')) {
    initialState = (await import('./app/devPreview')).previewState(location.search)
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App initialState={initialState} />
    </StrictMode>,
  )
}

void start()
