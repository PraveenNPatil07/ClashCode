import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

import { fetchWar } from '../api/client';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CollegeCrest, getCollegeBrand, getCollegeSurfaceStyle } from '../components/CollegeBrand';
import type { WarBattleView, WarResponse } from '../types/api';

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

function warIdFromPath() {
  return window.location.pathname.split('/').filter(Boolean)[1] ?? '';
}

function battleOutcomeLabel(battle: WarBattleView) {
  if (battle.status !== 'completed') {
    return battle.status;
  }

  if (battle.result === 'draw') {
    return 'draw';
  }

  const winner = battle.player_a?.id === battle.winner_id ? battle.player_a?.name : battle.player_b?.id === battle.winner_id ? battle.player_b?.name : 'Unknown';
  return `${winner} won`;
}

export function WarPage() {
  const warId = warIdFromPath();
  const [state, setState] = useState<WarResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!warId) {
        setError('War ID is missing from the URL.');
        return;
      }

      try {
        const response = await fetchWar(warId);
        setState(response);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load war.');
      }
    }

    void load();
  }, [warId]);

  useEffect(() => {
    if (!warId) {
      return;
    }

    const socket = io(socketUrl, { transports: ['websocket'] });

    const refresh = async () => {
      try {
        const response = await fetchWar(warId);
        setState(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to refresh war state.');
      }
    };

    socket.emit('war:join', { warId });
    socket.on('war:updated', (event: { type?: string }) => {
      setStatusMessage(event.type ? `War update: ${event.type.replaceAll('_', ' ')}` : 'War updated.');
      void refresh();
    });

    return () => {
      socket.emit('war:leave', { warId });
      socket.disconnect();
    };
  }, [warId]);

  const winnerText = useMemo(() => {
    if (!state) {
      return null;
    }

    if (state.war.status !== 'completed') {
      return 'War is still active.';
    }

    if (state.war.winner_college_id && state.colleges.winner) {
      return `${state.colleges.winner.name} won the war.`;
    }

    return 'War closed as a draw.';
  }, [state]);

  const collegeABrand = getCollegeBrand(state?.colleges.collegeA?.name ?? 'Apex Institute of Technology');
  const collegeBBrand = getCollegeBrand(state?.colleges.collegeB?.name ?? 'Northbridge Engineering College');
  const scoreA = state?.score.collegeAWins ?? 0;
  const scoreB = state?.score.collegeBWins ?? 0;
  const totalWins = scoreA + scoreB;
  const shareA = totalWins === 0 ? 50 : (scoreA / totalWins) * 100;
  const shareB = totalWins === 0 ? 50 : (scoreB / totalWins) * 100;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_25%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#020617_100%)] text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-black/25 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">College war</p>
              <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">{state?.colleges.collegeA?.name ?? 'Loading...'} vs {state?.colleges.collegeB?.name ?? 'Loading...'}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Every battle in this war rolls into the running score. As battles finish, this page updates live.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => (window.location.href = '/')} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white">Back home</button>
              <button type="button" onClick={() => (window.location.href = '/leaderboard')} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white">Leaderboard</button>
            </div>
          </div>
          {winnerText ? <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">{winnerText}</div> : null}
          {statusMessage ? <div className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-100">{statusMessage}</div> : null}
        </div>

        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">{error}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Running score</p>
            <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4">
              <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.28em] text-slate-300">
                <span>{state?.colleges.collegeA?.name ?? 'College A'}</span>
                <span>{state?.colleges.collegeB?.name ?? 'College B'}</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-full border border-white/10 bg-white/5">
                <div className="flex h-6 w-full transition-all duration-700 ease-out">
                  <div style={{ width: `${shareA}%`, background: collegeABrand.gradient }} className="relative min-w-[8%] transition-all duration-700 ease-out">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.14),transparent)]" />
                  </div>
                  <div style={{ width: `${shareB}%`, background: collegeBBrand.gradient }} className="relative min-w-[8%] transition-all duration-700 ease-out">
                    <div className="absolute inset-0 bg-[linear-gradient(270deg,rgba(255,255,255,0.14),transparent)]" />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                <span style={{ color: collegeABrand.palette.highlight }}>{shareA.toFixed(totalWins === 0 ? 0 : 1)}%</span>
                <span>{totalWins === 0 ? 'No wins recorded yet' : `${totalWins} battle wins decided`}</span>
                <span style={{ color: collegeBBrand.palette.highlight }}>{shareB.toFixed(totalWins === 0 ? 0 : 1)}%</span>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 p-5" style={getCollegeSurfaceStyle(state?.colleges.collegeA?.name ?? 'Apex Institute of Technology')}>
                <div className="flex items-start justify-between gap-4">
                  <CollegeCrest collegeName={state?.colleges.collegeA?.name ?? 'Apex Institute of Technology'} size={68} />
                  <p className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/75">College A</p>
                </div>
                <p className="mt-4 text-2xl font-black">{state?.colleges.collegeA?.name ?? 'Loading...'}</p>
                <AnimatedNumber value={scoreA} className="mt-4 text-5xl font-black" style={{ color: collegeABrand.palette.highlight }} />
              </div>
              <div className="rounded-[1.5rem] border border-white/10 p-5" style={getCollegeSurfaceStyle(state?.colleges.collegeB?.name ?? 'Northbridge Engineering College')}>
                <div className="flex items-start justify-between gap-4">
                  <CollegeCrest collegeName={state?.colleges.collegeB?.name ?? 'Northbridge Engineering College'} size={68} />
                  <p className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/75">College B</p>
                </div>
                <p className="mt-4 text-2xl font-black">{state?.colleges.collegeB?.name ?? 'Loading...'}</p>
                <AnimatedNumber value={scoreB} className="mt-4 text-5xl font-black" style={{ color: collegeBBrand.palette.highlight }} />
              </div>
            </div>
            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
              <p>Status: <span className="font-bold text-white">{state?.war.status ?? 'loading'}</span></p>
              <p className="mt-2">Window: {state ? `${new Date(state.war.start_time).toLocaleString()} to ${new Date(state.war.end_time).toLocaleString()}` : 'Loading...'}</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Battles</p>
                <h2 className="text-2xl font-bold">War battle ledger</h2>
              </div>
              <p className="text-sm text-slate-400">{state?.battles.length ?? 0} battles scheduled</p>
            </div>

            <div className="mt-5 space-y-4">
              {state?.battles.length ? state.battles.map((battle) => (
                <button key={battle.id} type="button" onClick={() => (window.location.href = `/battle/${battle.id}`)} className="block w-full rounded-[1.5rem] border border-white/10 bg-black/20 p-5 text-left transition-colors duration-300 hover:bg-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">{battle.problem?.title ?? 'Unknown problem'}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <CollegeCrest collegeName={state?.colleges.collegeA?.name ?? 'Apex Institute of Technology'} size={42} />
                          <span>{battle.player_a?.name ?? 'Unknown'}</span>
                        </div>
                        <span className="text-slate-500">vs</span>
                        <div className="flex items-center gap-2">
                          <CollegeCrest collegeName={state?.colleges.collegeB?.name ?? 'Northbridge Engineering College'} size={42} />
                          <span>{battle.player_b?.name ?? 'Unknown'}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">{battle.problem?.difficulty ?? 'n/a'} · {battle.problem?.category ?? 'n/a'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] ${battle.status === 'completed' ? battle.result === 'draw' ? 'bg-amber-400/10 text-amber-200' : 'bg-emerald-400/10 text-emerald-200' : 'bg-sky-400/10 text-sky-200'}`}>{battleOutcomeLabel(battle)}</span>
                  </div>
                </button>
              )) : <p className="text-slate-300">No battles have been scheduled for this war yet.</p>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
