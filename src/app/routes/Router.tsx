// Screen routing. Navigation is app state only — it never touches mission rules.
import { useApp } from '../state/AppContext'
import { MainMenu } from '../../components/menu/MainMenu'
import { MissionSelect } from '../../components/menu/MissionSelect'
import { MissionBriefing } from '../../components/mission/MissionBriefing'
import { MissionSetup } from '../../components/mission/MissionSetup'
import { OutpostScreen } from '../../components/hud/OutpostScreen'
import { MissionResult } from '../../components/results/MissionResult'

export function Router() {
  const { state } = useApp()
  switch (state.screen) {
    case 'menu':
      return <MainMenu />
    case 'select':
      return <MissionSelect />
    case 'briefing':
      return <MissionBriefing />
    case 'setup':
      return <MissionSetup />
    case 'outpost':
      return state.mission ? <OutpostScreen mission={state.mission} /> : <MissionSetup />
    case 'result':
      return state.mission ? <MissionResult mission={state.mission} /> : <MainMenu />
  }
}
