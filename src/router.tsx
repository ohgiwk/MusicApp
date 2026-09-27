import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { GAMES, MONITOR } from './games/meta'
import { GAME_PAGES } from './pages/gamePages'
import { HomePage } from './pages/HomePage'
import { MyPage } from './pages/MyPage'
import { RankingPage } from './pages/RankingPage'

const gameRoutes = [...GAMES, MONITOR].map((g) => {
  const Page = GAME_PAGES[g.id]
  return { path: g.to.slice(1), element: <Page /> }
})

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: <HomePage /> },
        ...gameRoutes,
        { path: 'ranking', element: <RankingPage /> },
        { path: 'mypage', element: <MyPage /> },
        { path: '*', element: <HomePage /> },
      ],
    },
  ],
  {
    // vite.config.ts の base と揃える (末尾の / は除く)
    basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
  },
)
