import { BattlePage } from './pages/Battle';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/Leaderboard';
import { NotFoundPage } from './pages/NotFound';
import { WarPage } from './pages/War';
import { CustomCursor } from './components/CustomCursor';

export default function App() {
  const path = window.location.pathname;

  if (path.startsWith('/battle/')) {
    document.title = 'Battle Arena - ClashCode';
  } else if (path.startsWith('/leaderboard')) {
    document.title = 'Leaderboard - ClashCode';
  } else if (path.startsWith('/war/')) {
    document.title = 'War Room - ClashCode';
  } else if (path === '/') {
    document.title = 'ClashCode - Code. Clash. Conquer.';
  } else {
    document.title = '404 - ClashCode';
  }

  return (
    <>
      <CustomCursor />
      {path.startsWith('/battle/') ? <BattlePage /> :
       path.startsWith('/leaderboard') ? <LeaderboardPage /> :
       path.startsWith('/war/') ? <WarPage /> :
       path === '/' ? <HomePage /> :
       <NotFoundPage />}
    </>
  );
}
