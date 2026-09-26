import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { MelodyCopyPage } from './pages/MelodyCopyPage'
import { PitchMonitorPage } from './pages/PitchMonitorPage'
import { PitchTargetPage } from './pages/PitchTargetPage'
import { VoiceFlightPage } from './pages/VoiceFlightPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'monitor', element: <PitchMonitorPage /> },
      { path: 'target', element: <PitchTargetPage /> },
      { path: 'flight', element: <VoiceFlightPage /> },
      { path: 'melody', element: <MelodyCopyPage /> },
      { path: '*', element: <HomePage /> },
    ],
  },
])
