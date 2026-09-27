import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { DistancePage } from './pages/ear/DistancePage'
import { HighLowPage } from './pages/ear/HighLowPage'
import { MemoryPage } from './pages/ear/MemoryPage'
import { HomePage } from './pages/HomePage'
import { MelodyCopyPage } from './pages/MelodyCopyPage'
import { PitchMonitorPage } from './pages/PitchMonitorPage'
import { PitchTargetPage } from './pages/PitchTargetPage'
import { MyPage } from './pages/MyPage'
import { RankingPage } from './pages/RankingPage'
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
      { path: 'ear/highlow', element: <HighLowPage /> },
      { path: 'ear/distance', element: <DistancePage /> },
      { path: 'ear/memory', element: <MemoryPage /> },
      { path: 'ranking', element: <RankingPage /> },
      { path: 'mypage', element: <MyPage /> },
      { path: '*', element: <HomePage /> },
    ],
  },
], {
  // vite.config.ts の base と揃える (末尾の / は除く)
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})
