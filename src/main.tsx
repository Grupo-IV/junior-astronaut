import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { audioEngine } from './audio/engine'

// Browsers only start audio after a user gesture; the first click or key press unlocks it.
audioEngine.installUnlock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
