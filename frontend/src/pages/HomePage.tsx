import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { College, ProblemDifficulty, User } from '@clashcode/shared';

import {
  createBattle,
  createQuickBattle,
  fetchColleges,
  fetchDashboard,
  fetchHealth,
  saveGeneratedProblem,
  signIn,
  signUp,
} from '../api/client';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CollegeCard } from '../components/CollegeCard';
import { ParticleBg } from '../components/ParticleBg';
import { generateProblemWithPuter } from '../lib/puter';
import { clearSession, readSession, syncSessionUser } from '../lib/session';
import { tierColor, tierIcon } from '../lib/tier';
import type { DashboardResponse, SuggestedOpponent } from '../types/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

type Session = { user: User };

// ── Routing ──────────────────────────────────────────────────────────────────
function goToBattle(id: string) { window.location.href = `/battle/${id}`; }
function goToLeaderboard()      { window.location.href = '/leaderboard'; }
function goToWar(id: string)    { window.location.href = `/war/${id}`; }

// ── Tier helpers ──────────────────────────────────────────────────────────────
// Tier helpers imported from ../lib/tier


// ─────────────────────────────────────────────────────────────────────────────
// Small reusable atoms
// ─────────────────────────────────────────────────────────────────────────────

function OnlineDot({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';
  return (
    <span className={`relative inline-flex ${sz}`}>
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60`} />
      <span className={`relative inline-flex ${sz} rounded-full bg-emerald-400`} />
    </span>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const cls = {
    default: 'border-white/10 bg-white/5 text-slate-400',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    danger:  'border-rose-500/30 bg-rose-500/10 text-rose-400',
    info:    'border-sky-500/30 bg-sky-500/10 text-sky-400',
  }[variant];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${cls}`}>
      {children}
    </span>
  );
}

function StatCard({ value, label, icon, delay = 0 }: { value: number | string; label: string; icon: string; delay?: number }) {
  return (
    <div
      className="glass rounded-2xl p-5 animate-slide-up flex flex-col gap-2 group hover:border-white/10 transition-colors"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>
      </div>
      {typeof value === 'number'
        ? <AnimatedNumber value={value} className="text-3xl font-black text-white tabular-nums" />
        : <p className="text-3xl font-black text-white">{value}</p>
      }
    </div>
  );
}

function OpponentCard({ opponent, busy, onChallenge }: { opponent: SuggestedOpponent; busy: boolean; onChallenge: () => void }) {
  const tierStr = opponent.rank_tier ?? '';
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:translate-x-1">
      <div className="relative flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-black text-white shadow-lg">
          {opponent.name[0]?.toUpperCase()}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5"><OnlineDot /></span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm truncate">{opponent.name}</p>
        <p className="text-[11px] text-slate-500 truncate">{opponent.college_name}</p>
        <p className={`text-[11px] font-semibold ${tierColor(tierStr)}`}>
          {tierIcon(tierStr)} {tierStr ? tierStr.charAt(0).toUpperCase() + tierStr.slice(1) : 'Unranked'} · {opponent.points.toLocaleString()} pts
        </p>
      </div>
      <button
        type="button"
        id={`challenge-${opponent.id}`}
        onClick={onChallenge}
        disabled={busy}
        aria-label={`Challenge ${opponent.name} to a battle`}
        className="flex-shrink-0 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-200 transition-all hover:bg-rose-500/35 hover:text-white hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
      >
        {busy ? <span className="animate-spin inline-block" aria-hidden="true">⟳</span> : <><span aria-hidden="true">⚔</span> Fight</>}
      </button>
    </div>
  );
}

function BattleHistoryRow({
  battle, userId, onClick, onWarClick,
}: {
  battle: DashboardResponse['recentBattles'][0];
  userId: string;
  onClick: () => void;
  onWarClick?: () => void;
}) {
  const done = battle.status === 'completed';
  const draw = done && battle.result === 'draw';
  const won  = done && !draw && battle.winner_id === userId;

  const [resultLabel, resultCls] = !done
    ? ['LIVE 🔥', 'border-amber-500/30 bg-amber-500/10 text-amber-400']
    : draw ? ['DRAW', 'border-slate-500/30 bg-slate-500/10 text-slate-400']
    : won  ? ['WIN 🏆', 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400']
    :        ['LOSS',   'border-rose-500/30 bg-rose-500/10 text-rose-400'];

  const opp  = battle.opponent;
  const prob = battle.problem;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 cursor-pointer transition-all hover:border-white/10 hover:bg-white/[0.04]"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">vs {opp?.name ?? 'Unknown'}</p>
        <p className="text-[11px] text-slate-500 truncate">{prob?.title ?? '—'}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${resultCls}`}>
          {resultLabel}
        </span>
        {onWarClick && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onWarClick(); }}
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors font-semibold"
            title="Wars are asynchronous contests between colleges. Contribute to your college's score by winning battles!"
          >
            War →
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard (logged-in view)
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({
  session, dashboard, busyAction,
  onQuickBattle, onChallenge, onLogout, onGenerate,
  generatorForm, setGeneratorForm, generatorSummary,
}: {
  session: Session;
  dashboard: DashboardResponse;
  busyAction: string | null;
  onQuickBattle: () => void;
  onChallenge: (id: string) => void;
  onLogout: () => void;
  onGenerate: () => void;
  generatorForm: { difficulty: ProblemDifficulty; category: string };
  setGeneratorForm: React.Dispatch<React.SetStateAction<{ difficulty: ProblemDifficulty; category: string }>>;
  generatorSummary: { title: string; difficulty: ProblemDifficulty; category: string } | null;
}) {
  const user = dashboard.user;
  const activeBattle = dashboard.activeBattles[0] ?? null;
  // Bug 3 fix: count wins from ALL battles (active + recent), not just recent slice
  const allBattles = [...dashboard.activeBattles, ...dashboard.recentBattles];
  const wins = allBattles.filter(b => b.winner_id === user.id).length;
  const userTier = (user as unknown as Record<string, string>).rank_tier;

  return (
    <div className="min-h-screen dashboard-bg">
      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 glass-strong border-b" style={{ borderColor: 'var(--color-border)' }}>
        <a href="/" className="flex items-center gap-3 no-underline">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-sm font-black text-white">⚔</span>
          </div>
          <span className="font-hud text-sm font-black text-white tracking-widest">CLASHCODE</span>
          <Badge variant="success">Season Zero</Badge>
        </a>
        <div className="flex items-center gap-3">
          <button type="button" onClick={goToLeaderboard} className="btn-ghost text-xs py-2 px-3">
            🏆 Leaderboard
          </button>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-sm font-black text-white ring-2 ring-white/10">
                {user.name[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5"><OnlineDot /></span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
              <p className={`text-[10px] font-semibold ${tierColor(userTier)}`}>
                {tierIcon(userTier)} {user.points.toLocaleString()} pts
              </p>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="btn-ghost text-xs py-2 px-3 text-slate-500 hover:text-rose-400">
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 space-y-8">

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 stagger">
          <StatCard value={user.points} label="Your Points" icon="⚡" delay={0} />
          <StatCard value={dashboard.recentBattles.length} label="Battles" icon="⚔" delay={60} />
          <StatCard value={wins} label="Wins" icon="🏆" delay={120} />
          <StatCard value={dashboard.activeBattles.length} label="Active" icon="🔥" delay={180} />
        </div>

        {/* Active battle rejoin CTA removed — shown in Active Battles sidebar to avoid duplication (Issue 10 fix) */}


        {/* ── Main layout grid ── */}
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

          {/* Left column */}
          <div className="space-y-5">

            {/* Quick Battle CTA */}
            <section className="relative overflow-hidden rounded-2xl glass p-6 group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400 mb-1">⚡ Quick Match</p>
              <h2 className="text-xl font-black text-white mb-4">Jump into the arena</h2>
              <button
                id="quick-battle-btn"
                type="button"
                onClick={onQuickBattle}
                disabled={busyAction !== null}
                className="relative w-full rounded-xl overflow-hidden py-4 text-sm font-black text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed group/btn"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 animate-gradient" />
                <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%)' }} />
                <span className="relative flex items-center justify-center gap-2.5">
                  {busyAction === 'quickbattle'
                    ? <><span className="animate-spin text-lg">⟳</span> Finding opponent…</>
                    : <><span className="text-xl">⚔</span> Quick Battle — Start Now</>
                  }
                </span>
              </button>
              <p className="mt-2.5 text-[11px] text-center text-slate-600">AI-generated problem · 15 min timer · First correct solution wins</p>
            </section>

            {/* Battle Lobby */}
            {dashboard.suggestedOpponents.length > 0 ? (
              <section className="rounded-2xl glass p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400 mb-0.5">🏟 Battle Lobby</p>
                    <h2 className="text-lg font-black text-white">Challenge a rival</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <OnlineDot size="md" />
                    <span className="text-xs text-emerald-400 font-semibold">{dashboard.suggestedOpponents.length} online</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {dashboard.suggestedOpponents.map(opp => (
                    <OpponentCard
                      key={opp.id}
                      opponent={opp}
                      busy={busyAction === `challenge-${opp.id}`}
                      onChallenge={() => onChallenge(opp.id)}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="rounded-2xl glass p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400 mb-0.5">🏟 Battle Lobby</p>
                <h2 className="text-lg font-black text-white mb-3">Challenge a rival</h2>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center space-y-1">
                  <p className="text-2xl">😴</p>
                  <p className="text-sm font-semibold text-slate-400">No opponents online right now</p>
                  <p className="text-xs text-slate-600">Check back soon — or start a Quick Battle above!</p>
                </div>
              </section>
            )}

            {/* AI Practice Generator */}
            <section className="rounded-2xl glass p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-400 mb-1">✨ AI Practice</p>
              <h2 className="text-lg font-black text-white mb-4">Generate a custom problem</h2>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[130px] flex flex-col gap-1">
                  <label htmlFor="practice-difficulty" className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Difficulty</label>
                  <select
                    id="practice-difficulty"
                    value={generatorForm.difficulty}
                    onChange={e => setGeneratorForm(f => ({ ...f, difficulty: e.target.value as ProblemDifficulty }))}
                    className="rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                  >
                    <option value="easy">🟢 Easy</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="hard">🔴 Hard</option>
                  </select>
                </div>
                <div className="flex-[2] min-w-[160px] flex flex-col gap-1">
                  <label htmlFor="practice-topic" className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Topic</label>
                  <input
                    id="practice-topic"
                    type="text"
                    placeholder="arrays, trees, graphs…"
                    value={generatorForm.category}
                    onChange={e => setGeneratorForm(f => ({ ...f, category: e.target.value }))}
                    className="rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={onGenerate}
                    disabled={busyAction !== null || !generatorForm.category.trim()}
                    className="btn-primary text-sm py-2.5 px-5"
                  >
                    {busyAction === 'generate-practice' ? '⟳ Generating…' : '✨ Generate'}
                  </button>
                </div>
              </div>
              {generatorSummary && (
                <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs text-indigo-300 animate-fade-in">
                  ✓ Generated: <span className="font-bold">{generatorSummary.title}</span> · {generatorSummary.difficulty} · {generatorSummary.category}
                </div>
              )}
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Active battles list */}
            {dashboard.activeBattles.length > 0 && (
              <section className="rounded-2xl glass p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400 mb-3">🔥 Active Battles</p>
                <div className="space-y-2 stagger">
                  {dashboard.activeBattles.map(b => (
                    <BattleHistoryRow
                      key={b.id} battle={b} userId={user.id}
                      onClick={() => goToBattle(b.id)}
                      onWarClick={b.war_id ? () => goToWar(b.war_id!) : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Recent results */}
            <section className="rounded-2xl glass p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500 mb-3">📜 Recent Results</p>
              {dashboard.recentBattles.length === 0
                ? <p className="text-xs text-slate-600 py-6 text-center">No battles yet — start one above!</p>
                : (
                  <div className="space-y-2 stagger">
                    {dashboard.recentBattles.slice(0, 6).map(b => (
                      <BattleHistoryRow
                        key={b.id} battle={b} userId={user.id}
                        onClick={() => goToBattle(b.id)}
                        onWarClick={b.war_id ? () => goToWar(b.war_id!) : undefined}
                      />
                    ))}
                  </div>
                )}
            </section>

            {/* College power standings */}
            <section className="rounded-2xl glass p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">🏛 College Power</p>
                <button type="button" onClick={goToLeaderboard} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
                  Full rankings →
                </button>
              </div>
              <div className="space-y-3">
                {dashboard.leaderboard.slice(0, 4).map((c: College, i: number) => {
                  const maxPts = dashboard.leaderboard[0]?.total_points ?? 1;
                  const pct = Math.round((c.total_points / maxPts) * 100);
                  const medal = ['🥇', '🥈', '🥉', '4️⃣'][i] ?? `${i + 1}.`;
                  return (
                    <div key={c.id} className="space-y-1 animate-float-up" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm w-5">{medal}</span>
                          <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-400 tabular-nums ml-2 flex-shrink-0">
                          {c.total_points.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 rank-bar-fill"
                          style={{ width: `${pct}%`, animationDelay: `${i * 100 + 200}ms` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing page (logged-out view)
// ─────────────────────────────────────────────────────────────────────────────
function LandingPage({
  colleges, signupForm, setSignupForm, loginEmail, setLoginEmail,
  onSignup, onLogin, busyAction, error, health, socketReady,
}: {
  colleges: College[];
  signupForm: { name: string; email: string; collegeId: string };
  setSignupForm: React.Dispatch<React.SetStateAction<{ name: string; email: string; collegeId: string }>>;
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  onSignup: (e: React.FormEvent<HTMLFormElement>) => void;
  onLogin:  (e: React.FormEvent<HTMLFormElement>) => void;
  busyAction: string | null;
  error: string | null;
  health: 'connected' | 'disconnected' | 'loading';
  socketReady: boolean;
}) {
  const INPUT_CLS = 'w-full rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all';
  const SELECT_CLS = `${INPUT_CLS} cursor-pointer`;

  return (
    <div className="min-h-screen hero-bg overflow-x-hidden">
      {/* ── Hero section ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Particle mesh */}
        <ParticleBg count={55} />

        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full opacity-[0.12] blur-[120px]"
          style={{ background: 'radial-gradient(circle, #4f46e5, transparent)' }} />
        <div className="pointer-events-none absolute top-20 right-1/4 h-[400px] w-[400px] rounded-full opacity-[0.10] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full opacity-[0.08] blur-[80px]"
          style={{ background: 'radial-gradient(circle, #2563eb, transparent)' }} />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-12 xl:grid-cols-[1.15fr_0.85fr] items-center">

            {/* ── Hero text ── */}
            <div className="space-y-8">
              {/* Status row */}
              <div className="flex flex-wrap items-center gap-2 animate-fade-in">
                <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  health === 'connected'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${health === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {health === 'connected' ? 'Arena Online' : health === 'loading' ? 'Connecting…' : 'Arena Offline'}
                </span>
                {socketReady && (
                  <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Live
                  </span>
                )}
                {colleges.length > 0 && (
                  <span className="text-xs text-slate-600">{colleges.length} colleges competing</span>
                )}
              </div>

              {/* Main headline */}
              <div className="space-y-4 animate-slide-up">
                <p className="text-xs font-bold uppercase tracking-[0.4em] text-indigo-400">
                  ClashCode · Season Zero
                </p>
                <h1 className="font-display font-black leading-[1.0] text-white" style={{ fontSize: 'clamp(3rem, 2rem + 5vw, 6rem)' }}>
                  Code.{' '}
                  <span className="gradient-text">Clash.</span>{' '}
                  Conquer.
                </h1>
                <p className="max-w-md text-base leading-relaxed text-slate-400" style={{ fontSize: 'clamp(0.95rem, 0.85rem + 0.5vw, 1.15rem)' }}>
                  1v1 live coding battles — same problem, hidden judge, first correct solution wins.
                  Your victories fuel your college's rise to the top.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2.5 animate-float-up" style={{ animationDelay: '150ms' }}>
                {[
                  { icon: '⚡', label: '1v1 Live Battles' },
                  { icon: '🏛',  label: 'College Wars' },
                  { icon: '🤖', label: 'AI Judged' },
                  { icon: '🏆', label: 'Season Rankings' },
                  { icon: '✨', label: 'AI Problems' },
                ].map(f => (
                  <span key={f.label}
                    className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-white/14 hover:bg-white/[0.07]">
                    <span>{f.icon}</span>{f.label}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 animate-float-up" style={{ animationDelay: '200ms' }}>
                <button type="button" onClick={goToLeaderboard} className="btn-primary">
                  🏆 View Leaderboard
                </button>
                <button type="button"
                  onClick={() => document.getElementById('auth-panel')?.scrollIntoView({ behavior: 'smooth' })}
                  className="btn-ghost">
                  Enter the Arena →
                </button>
              </div>

              {/* College preview */}
              {colleges.length > 0 && (
                <div className="space-y-2 animate-fade-in" style={{ animationDelay: '300ms' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-700">Competing colleges</p>
                  <div className="flex flex-wrap gap-1.5">
                    {colleges.slice(0, 7).map(c => (
                      <span key={c.id}
                        className="rounded-lg border border-white/6 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-300 hover:border-white/10 transition-colors">
                        {c.name}
                      </span>
                    ))}
                    {colleges.length > 7 && (
                      <span className="text-[11px] text-slate-700 self-center ml-1">+{colleges.length - 7} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Auth panels ── */}
            <div id="auth-panel" className="space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/8 px-4 py-3 text-sm text-rose-300 animate-shake">
                  ⚠ {error}
                </div>
              )}

              {/* Sign up */}
              <form
                onSubmit={onSignup}
                className="glass-md rounded-2xl p-6 space-y-4 hover:border-white/10 transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">New Player</p>
                  <h2 className="text-lg font-black text-white">Create your account</h2>
                </div>
                <input required placeholder="Your name" value={signupForm.name}
                  onChange={e => setSignupForm(f => ({ ...f, name: e.target.value }))}
                  className={INPUT_CLS} />
                <input required type="email" placeholder="College email" value={signupForm.email}
                  onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))}
                  className={INPUT_CLS} />
                <select value={signupForm.collegeId}
                  onChange={e => setSignupForm(f => ({ ...f, collegeId: e.target.value }))}
                  className={SELECT_CLS}>
                  {colleges.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                </select>
                <button type="submit" disabled={busyAction !== null}
                  className="w-full rounded-xl py-3 text-sm font-black text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}>
                  {busyAction === 'signup' ? '⟳ Creating account…' : '⚔ Join the Arena'}
                </button>
              </form>

              {/* Sign in */}
              <form
                onSubmit={onLogin}
                className="glass rounded-2xl p-6 space-y-4 hover:border-white/10 transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-400">Returning Player</p>
                  <h2 className="text-lg font-black text-white">Sign in</h2>
                </div>
                <input required type="email" placeholder="College email" value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className={INPUT_CLS} />
                <button type="submit" disabled={busyAction !== null}
                  className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-3 text-sm font-bold text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {busyAction === 'login' ? '⟳ Signing in…' : 'Sign In →'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 hover:opacity-60 transition-opacity cursor-pointer animate-bounce"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Scroll</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-400">
            <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

              {/* ── How it works ── */}
              <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
                <div className="mb-10 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400 mb-1">How it Works</p>
                  <h2 className="text-2xl font-black text-white">Three steps to the top</h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-3">
                  {[
                    { step: '01', icon: '🏛', title: 'Pick your college', desc: 'Register with your college email. Your every win contributes to your college\'s total power ranking.' },
                    { step: '02', icon: '⚔', title: 'Battle 1v1', desc: 'Get matched with a rival from another college. Same AI-generated problem, hidden judge. First correct solution wins.' },
                    { step: '03', icon: '🏆', title: 'Earn points & climb', desc: 'Win battles to earn XP and tier up — Bronze → Silver → Gold → Platinum → Diamond. Wars between colleges decide the season champion.' },
                  ].map(item => (
                    <div key={item.step} className="glass rounded-2xl p-6 space-y-3 hover:border-white/10 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="font-hud text-xs text-indigo-400 opacity-60">{item.step}</span>
                        <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                      </div>
                      <h3 className="text-base font-black text-white">{item.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── College grid ── */}
      {colleges.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400 mb-1">🏛 The Colleges</p>
              <h2 className="text-2xl font-black text-white">Choose your side</h2>
            </div>
            <button type="button" onClick={goToLeaderboard}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Full standings →
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {colleges.map(c => <CollegeCard key={c.id} college={c} />)}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────
export function HomePage() {
  const [session,     setSession]     = useState<Session | null>(() => readSession());
  const [health,      setHealth]      = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [colleges,    setColleges]    = useState<College[]>([]);
  const [dashboard,   setDashboard]   = useState<DashboardResponse | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [busyAction,  setBusyAction]  = useState<string | null>(null);
  const [signupForm,  setSignupForm]  = useState({ name: '', email: '', collegeId: '' });
  const [loginEmail,  setLoginEmail]  = useState('');
  const [generatorForm, setGeneratorForm] = useState<{ difficulty: ProblemDifficulty; category: string }>({ difficulty: 'easy', category: 'arrays' });
  const [generatorSummary, setGeneratorSummary] = useState<{ title: string; difficulty: ProblemDifficulty; category: string } | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.on('socket:ready', () => setSocketReady(true));
    socket.on('disconnect',   () => setSocketReady(false));
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [h, c] = await Promise.all([fetchHealth(), fetchColleges()]);
        setHealth(h.database);
        setColleges(c.colleges);
        if (!signupForm.collegeId && c.colleges[0]) {
          setSignupForm(f => ({ ...f, collegeId: c.colleges[0]!.id }));
        }
      } catch (e) {
        setHealth('disconnected');
        setError(e instanceof Error ? e.message : 'Failed to connect.');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session) { setDashboard(null); return; }
    void (async () => {
      try {
        const res = await fetchDashboard(session!.user.id);
        setDashboard(res);
        setSession(syncSessionUser(res.user));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Bug 6 fix: guard against empty collegeId (colleges still loading)
    if (!signupForm.collegeId) {
      return;
    }
    try {
      setBusyAction('signup');
      const res = await signUp(signupForm);
      setSession(syncSessionUser(res.user));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally { setBusyAction(null); }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setBusyAction('login');
      const res = await signIn({ email: loginEmail });
      setSession(syncSessionUser(res.user));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally { setBusyAction(null); }
  }

  async function handleQuickBattle() {
    if (!session) return;
    try {
      setBusyAction('quickbattle');
      const res = await createQuickBattle({ userId: session.user.id });
      window.location.href = `/battle/${res.battle.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick battle failed.');
      setBusyAction(null);
    }
  }

  async function handleChallenge(opponentId: string) {
    if (!session) return;
    try {
      setBusyAction(`challenge-${opponentId}`);
      const res = await createQuickBattle({ userId: session.user.id, opponentId });
      window.location.href = `/battle/${res.battle.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Challenge failed.');
      setBusyAction(null);
    }
  }

  async function handleGenerate() {
    if (!session) return;
    try {
      setBusyAction('generate-practice');
      const generated = await generateProblemWithPuter(generatorForm.difficulty, generatorForm.category);
      const saved = await saveGeneratedProblem(generated);
      setGeneratorSummary({ title: saved.problem.title, difficulty: saved.problem.difficulty, category: saved.problem.category });
      const res = await createBattle({ playerAId: session.user.id, problemId: saved.problem.id });
      window.location.href = `/battle/${res.battle.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate failed.');
    } finally { setBusyAction(null); }
  }

  function handleLogout() { clearSession(); setSession(null); setDashboard(null); }

  if (session && dashboard) {
    return (
      <Dashboard
        session={session} dashboard={dashboard} busyAction={busyAction}
        onQuickBattle={() => void handleQuickBattle()}
        onChallenge={id => void handleChallenge(id)}
        onLogout={handleLogout}
        onGenerate={() => void handleGenerate()}
        generatorForm={generatorForm} setGeneratorForm={setGeneratorForm}
        generatorSummary={generatorSummary}
      />
    );
  }

  return (
    <LandingPage
      colleges={colleges} signupForm={signupForm} setSignupForm={setSignupForm}
      loginEmail={loginEmail} setLoginEmail={setLoginEmail}
      onSignup={handleSignup} onLogin={handleLogin}
      busyAction={busyAction} error={error}
      health={health} socketReady={socketReady}
    />
  );
}
