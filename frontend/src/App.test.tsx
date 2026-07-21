// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./pages/Battle', () => ({
  BattlePage: () => <div>Battle Route</div>
}));

vi.mock('./pages/HomePage', () => ({
  HomePage: () => <div>Home Route</div>
}));

vi.mock('./pages/Leaderboard', () => ({
  LeaderboardPage: () => <div>Leaderboard Route</div>
}));

vi.mock('./pages/War', () => ({
  WarPage: () => <div>War Route</div>
}));

vi.mock('./pages/NotFound', () => ({
  NotFoundPage: () => <div>Not Found Route</div>
}));

vi.mock('./components/CustomCursor', () => ({
  CustomCursor: () => <div data-testid="custom-cursor" />
}));

const { default: App } = await import('./App');

function setPathname(pathname: string) {
  window.history.replaceState({}, '', pathname);
}

describe('App routing', () => {
  beforeEach(() => {
    document.title = 'Initial';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the homepage and sets the home title', () => {
    setPathname('/');
    render(<App />);

    expect(screen.getByText('Home Route')).toBeInTheDocument();
    expect(document.title).toBe('ClashCode - Code. Clash. Conquer.');
  });

  it('renders the battle page and sets the battle title', () => {
    setPathname('/battle/abc123');
    render(<App />);

    expect(screen.getByText('Battle Route')).toBeInTheDocument();
    expect(document.title).toBe('Battle Arena - ClashCode');
  });

  it('renders the not found page for unknown routes', () => {
    setPathname('/missing');
    render(<App />);

    expect(screen.getByText('Not Found Route')).toBeInTheDocument();
    expect(document.title).toBe('404 - ClashCode');
  });
});
