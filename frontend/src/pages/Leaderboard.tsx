import { useEffect, useState } from 'react';
import { createWar, fetchCollegeLeaderboard, fetchCurrentSeason, fetchStudentLeaderboard } from '../api/client';
import { readSession } from '../lib/session';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CollegeCrest, getCollegeBrand, getCollegeSurfaceStyle } from '../components/CollegeBrand';
import type { CollegeLeaderboardEntry, CurrentSeasonResponse, StudentLeaderboardEntry } from '../types/api';

type BoardMode = 'colleges' | 'students';

const TIER_COLOR: Record<string, string> = {
  bronze: '#cd7f32', silver: '#94a3b8', gold: '#fbbf24', platinum: '#7dd3fc', diamond: '#c084fc',
};

function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLOR[tier.toLowerCase()] ?? '#64748b';
  return (
    <span className="rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
      style={{ color, borderColor: color + '40', background: color + '14' }}>
      {tier}
    </span>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl text-glow-amber">1st</span>;
  if (rank === 2) return <span className="text-xl opacity-80">2nd</span>;
  if (rank === 3) return <span className="text-xl opacity-75">3rd</span>;
  return <span className="text-base font-black tabular-nums" style={{ color: rank <= 10 ? '#94a3b8' : '#475569' }}>#{rank}</span>;
}

function PointsBar({ value, max, delay = 0 }: { value: number; max: number; delay?: number }) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden mt-1">
      <div className="h-full rounded-full rank-bar-fill" style={{ width: pct + '%', animationDelay: delay + 'ms' }} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-white/5 px-6 py-4 last:border-b-0">
      <div className="h-6 w-8 rounded shimmer" /><div className="flex-1 space-y-2"><div className="h-4 w-48 rounded shimmer" /><div className="h-2.5 w-32 rounded shimmer" /></div><div className="h-5 w-16 rounded shimmer" />
    </div>
  );
}

export function LeaderboardPage() {
  const [mode, setMode] = useState<BoardMode>('colleges');
  const [colleges, setColleges] = useState<CollegeLeaderboardEntry[]>([]);
  const [students, setStudents] = useState<StudentLeaderboardEntry[]>([]);
  const [season, setSeason] = useState<CurrentSeasonResponse['season'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [session] = useState(() => readSession());
  const [declaring, setDeclaring] = useState<string | null>(null);

  async function handleDeclareWar(targetCollegeId: string) {
    if (!session) return;
    try {
      setDeclaring(targetCollegeId);
      const res = await createWar({ collegeAId: session.user.college_id, collegeBId: targetCollegeId });
      window.location.href = `/war/${res.war.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to declare war.');
      setDeclaring(null);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const [cr, sr, sn] = await Promise.all([fetchCollegeLeaderboard(), fetchStudentLeaderboard(), fetchCurrentSeason().catch(() => null)]);
        setColleges(cr.leaderboard);
        setStudents(sr.leaderboard);
        setSeason(sn?.season ?? null);
        setError(null);
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load leaderboard.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const maxPtsC = colleges[0]?.total_points ?? 1;
  const maxPtsS = students[0]?.points ?? 1;

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-bg-deep)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-1/3 left-1/3 h-[700px] w-[700px] rounded-full opacity-[0.07] blur-[130px]" style={{ background: 'radial-gradient(circle, #4f46e5, transparent)' }} />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-6 animate-slide-up">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400 mb-2">Season Standings</p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl text-white">Leader<span className="gradient-text">board</span></h1>
            <p className="mt-3 max-w-xl text-base text-slate-400 leading-relaxed">Track which college dominates the war economy and which student carries the sharpest form.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => (window.location.href = '/')} className="btn-ghost text-sm">Back home</button>
            <div className="flex rounded-xl border border-white/8 bg-white/[0.03] p-1 gap-1">
              {(['colleges', 'students'] as BoardMode[]).map(m => (
                <button key={m} type="button" onClick={() => setMode(m)} className={'rounded-lg px-5 py-2 text-sm font-bold transition-all ' + (mode === m ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white')}>
                  {m === 'colleges' ? 'Colleges' : 'Students'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {season && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-4 glass animate-fade-in">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400 mb-1">Active Season</p>
            <p className="text-sm font-semibold text-white">
              {`Current Season — ends ${new Date(season.end_date).toLocaleDateString()}`}
            </p>
          </div>
        )}
        {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/8 px-5 py-4 text-rose-300 text-sm">{error}</div>}

        <div className="rounded-2xl glass overflow-hidden animate-float-up" style={{ animationDelay: '100ms' }}>
          <div className={'grid ' + (mode === 'colleges' ? 'grid-cols-[72px_1fr_160px_110px_110px]' : 'grid-cols-[72px_1fr_1fr_120px_110px]') + ' gap-4 border-b px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600'} style={{ borderColor: 'var(--color-border)' }}>
            <span>Rank</span><span>{mode === 'colleges' ? 'College' : 'Student'}</span>
            {mode === 'colleges' ? <span>Points</span> : <span>College</span>}
            <span>{mode === 'colleges' ? 'Wars Won' : 'Tier'}</span>
            <span>{mode === 'colleges' ? 'Battles Won' : 'Points'}</span>
          </div>

          {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

          {!loading && mode === 'colleges' && colleges.map((entry, idx) => {
            const brand = getCollegeBrand(entry.name);
            const isTop = entry.rank <= 3;
            return (
              <div key={entry.id} className={'relative group grid grid-cols-[72px_1fr_160px_110px_110px] gap-4 border-b px-6 py-4 text-sm text-slate-300 last:border-b-0 transition-colors hover:bg-white/[0.02] animate-float-up' + (isTop ? ' rank-row-' + entry.rank : '')} style={{ borderColor: 'var(--color-border)', animationDelay: idx * 40 + 'ms', ...(isTop ? getCollegeSurfaceStyle(entry.name) : {}) }}>
                <div className="flex items-center group-hover:opacity-10 transition-opacity"><RankMedal rank={entry.rank} /></div>
                <div className="flex items-center gap-4 min-w-0 group-hover:opacity-10 transition-opacity">
                  <CollegeCrest collegeName={entry.name} size={isTop ? 52 : 44} />
                  <div className="min-w-0">
                    <p className={'font-bold text-white truncate ' + (isTop ? 'text-base' : 'text-sm')}>{entry.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] truncate" style={{ color: brand.palette.highlight }}>Lv {entry.base_level}</p>
                    <PointsBar value={entry.total_points} max={maxPtsC} delay={idx * 50 + 300} />
                  </div>
                </div>
                <div className="flex items-center group-hover:opacity-10 transition-opacity"><AnimatedNumber value={entry.total_points} className={'font-bold ' + (isTop ? 'text-base text-white' : '')} formatter={v => v.toLocaleString()} /></div>
                <div className="flex items-center group-hover:opacity-10 transition-opacity"><AnimatedNumber value={entry.wars_won} className="font-semibold" /></div>
                <div className="flex items-center group-hover:opacity-10 transition-opacity"><AnimatedNumber value={entry.battles_won} className="font-semibold" /></div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {session && session.user.college_id !== entry.id && (
                    <button onClick={() => handleDeclareWar(entry.id)} disabled={declaring === entry.id} className="rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 px-6 py-2 text-sm font-bold hover:bg-rose-500/30 hover:scale-105 transition-all shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                      {declaring === entry.id ? 'Starting...' : 'Declare War ⚔️'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!loading && mode === 'students' && students.map((entry, idx) => {
            const brand = getCollegeBrand(entry.college_name);
            const isTop = entry.rank <= 3;
            return (
              <div key={entry.id} className="grid grid-cols-[72px_1fr_1fr_120px_110px] gap-4 border-b px-6 py-4 text-sm text-slate-300 last:border-b-0 transition-colors hover:bg-white/[0.02] animate-float-up" style={{ borderColor: 'var(--color-border)', animationDelay: idx * 35 + 'ms' }}>
                <div className="flex items-center"><RankMedal rank={entry.rank} /></div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={'flex-shrink-0 rounded-full flex items-center justify-center font-black text-white ' + (isTop ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs')} style={{ background: 'linear-gradient(135deg,' + brand.palette.base + ',' + brand.palette.highlight + ')' }}>{entry.name[0]?.toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className={'font-bold text-white truncate ' + (isTop ? 'text-base' : 'text-sm')}>{entry.name}</p>
                    <PointsBar value={entry.points} max={maxPtsS} delay={idx * 50 + 300} />
                  </div>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <CollegeCrest collegeName={entry.college_name} size={36} />
                  <span className="text-xs text-slate-400 truncate">{entry.college_name}</span>
                </div>
                <div className="flex items-center"><TierBadge tier={entry.rank_tier} /></div>
                <div className="flex items-center"><AnimatedNumber value={entry.points} className={'font-bold ' + (isTop ? 'text-white' : '')} formatter={v => v.toLocaleString()} /></div>
              </div>
            );
          })}

          {!loading && ((mode === 'colleges' && colleges.length === 0) || (mode === 'students' && students.length === 0)) && (
            <div className="py-16 text-center text-slate-600">
              <p className="text-4xl mb-3" aria-hidden="true">🏆</p>
              <p className="font-semibold text-slate-400">No rankings available yet</p>
              <p className="text-sm mt-1">Check back after the first battles of the season.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}




