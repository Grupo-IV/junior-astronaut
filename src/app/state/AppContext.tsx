import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import { appReducer, initialAppState, type AppAction, type AppState } from './appState'

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction> } | null>(null)

/** `initialState` is for tests and previews; the app starts from the main menu. */
export function AppProvider({ children, initialState }: { children: ReactNode; initialState?: AppState }) {
  const [state, dispatch] = useReducer(appReducer, initialState, (s) => s ?? initialAppState())
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
