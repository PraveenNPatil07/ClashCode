import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  BattleDetail, Problem, ProblemTestCase,
  Submission, SubmissionTestResult, SupportedLanguage, User
} from '@clashcode/shared';

import { fetchBattle, fetchBattleDebrief, runBattle, startAiSparring, startBattle, submitBattle } from '../api/client';
import { AiDebriefModal } from '../components/AiDebriefModal';
import { tierColor, tierLabel } from '../lib/tier';
import { ToastContainer, useToast } from '../components/Toast';

// ─── Constants ───────────────────────────────────────────────────────────────
const SOCKET_URL       = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';
const SESSION_KEY      = 'clashcode_session';
const SPARRING_WAIT_MS = 20_000;
const HEARTBEAT_MS     = 12_000; // emit heartbeat every 12 s (server threshold: 15 s → online)

const TEMPLATES: Record<SupportedLanguage, string> = {
  python:
`import json
payload = json.loads(input())

# Write your solution here.
print(payload)`,
  javascript:
`const fs = require('fs');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));

// Write your solution here.
console.log(JSON.stringify(input));`,
  java:
`import java.io.*;
import org.json.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String line = br.readLine();
    // Write your solution here.
    System.out.println(line);
  }
}`,
  cpp:
`#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  string input;
  getline(cin, input);
  // Write your solution here.
  cout << input;
  return 0;
}`,
};

const MONACO_LANG: Record<SupportedLanguage, string> = {
  python: 'python', javascript: 'javascript', java: 'java', cpp: 'cpp',
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Session  = { user: User };
type Presence = 'online' | 'away' | 'offline';

interface ActivityEntry {
  id: string;
  icon: string;
  text: string;
  ts: number;
  variant: 'info' | 'success' | 'warning' | 'danger';
}

// ─── Session helpers ─────────────────────────────────────────────────────────
function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

function saveSession(s: Session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function battleIdFromPath() {
  return window.location.pathname.split('/').filter(Boolean)[1] ?? '';
}

// ─── UI helpers ──────────────────────────────────────────────────────────────
function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

// tierColor and tierLabel imported from ../lib/tier

function diffBadge(d?: string) {
  if (d === 'easy')   return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  if (d === 'medium') return 'border-amber-500/30   bg-amber-500/10   text-amber-400';
  if (d === 'hard')   return 'border-rose-500/30    bg-rose-500/10    text-rose-400';
  return 'border-slate-500/30 bg-slate-500/10 text-slate-400';
}

let _actId = 0;
function mkActivity(icon: string, text: string, variant: ActivityEntry['variant']): ActivityEntry {
  return { id: `act-${++_actId}`, icon, text, ts: Date.now(), variant };
}

function fireConfetti() {
  const shoot = (ratio: number, opts: confetti.Options) =>
    confetti({ origin: { y: 0.7 }, zIndex: 9999, particleCount: Math.floor(200 * ratio), ...opts });
  shoot(0.25, { spread: 26, startVelocity: 55 });
  shoot(0.2,  { spread: 60 });
  shoot(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  shoot(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  shoot(0.1,  { spread: 120, startVelocity: 45 });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated online-presence dot */
function PresenceDot({ status }: { status: Presence }) {
  const colors = { online: 'bg-emerald-400', away: 'bg-yellow-400', offline: 'bg-slate-600' };
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {status === 'online' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status]}`} />
    </span>
  );
}

/** Typing indicator — 3 bouncing dots */
function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
    </span>
  );
}

/** Player card for the VS header */
function PlayerCard({
  name, collegeName, points, rankTier, isAI, presence, isYou,
}: {
  name: string; collegeName?: string; points: number;
  rankTier?: string; isAI?: boolean; presence: Presence; isYou: boolean;
}) {
  const statusText = { online: 'Online', away: 'Away', offline: 'Offline' };

  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${isYou ? 'justify-start' : 'justify-end'}`}>
      {/* Avatar */}
      {!isYou && (
        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-black
          ${isAI ? 'bg-gradient-to-br from-purple-500 to-blue-600'
                 : 'bg-gradient-to-br from-rose-500 to-orange-600'}`}>
          {isAI ? '🤖' : name[0]?.toUpperCase()}
        </div>
      )}

      <div className={isYou ? 'text-left' : 'text-right'}>
        <div className={`flex items-center gap-2 ${isYou ? '' : 'justify-end'}`}>
          {!isYou && <PresenceDot status={presence} />}
          <span className="font-bold text-white text-sm leading-tight">{name}</span>
          {isYou && <PresenceDot status={presence} />}
        </div>
        <div className={`flex items-center gap-2 mt-0.5 text-xs text-slate-400 ${isYou ? '' : 'justify-end'}`}>
          {collegeName && <span className="truncate max-w-[120px]">{collegeName}</span>}
          {collegeName && <span className="text-slate-600">·</span>}
          <span className={tierColor(rankTier)}>{tierLabel(rankTier)}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300 font-medium">{points} pts</span>
        </div>
        <p className={`text-[10px] mt-0.5 ${
          presence === 'online' ? 'text-emerald-400' :
          presence === 'away'   ? 'text-yellow-400' : 'text-slate-600'
        }`}>
          {statusText[presence]}
        </p>
      </div>

      {/* Avatar */}
      {isYou && (
        <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-black bg-gradient-to-br from-sky-500 to-blue-600">
          {name[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

/** Verdict badge */
function VerdictBadge({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    correct:   'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    incorrect: 'border-rose-500/40    bg-rose-500/15    text-rose-300',
    error:     'border-orange-500/40  bg-orange-500/15  text-orange-300',
    pending:   'border-sky-500/40     bg-sky-500/15     text-sky-300 animate-pulse',
  };
  const icons: Record<string, string> = {
    correct: '✓', incorrect: '✗', error: '⚠', pending: '…',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[verdict] ?? styles.pending}`}>
      {icons[verdict] ?? '?'} {verdict}
    </span>
  );
}

/** Activity log entry */
function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const colors: Record<string, string> = {
    info:    'border-sky-500/20    bg-sky-500/5    text-sky-300',
    success: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
    warning: 'border-amber-500/20  bg-amber-500/5  text-amber-300',
    danger:  'border-rose-500/20   bg-rose-500/5   text-rose-300',
  };
  return (
    <div className={`animate-slide-right flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${colors[entry.variant]}`}>
      <span className="text-base leading-none">{entry.icon}</span>
      <span className="flex-1">{entry.text}</span>
      <span className="text-slate-600 shrink-0">{new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </div>
  );
}

/** Problem description left panel */
function ProblemPanel({ problem, instructions }: {
  problem: Problem | undefined;
  instructions: { stdin: string; stdout: string } | null;
}) {
  if (!problem) {
    return (
      <div className="p-6 space-y-4">
        {[40, 60, 80, 50, 70].map((w, i) => (
          <div key={i} className={`h-4 animate-pulse rounded-md bg-white/5`} style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  const samples = (problem.test_cases ?? []).slice(0, 2);

  return (
    <div className="p-5 space-y-5 animate-slide-up">
      {/* Title + difficulty */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold leading-snug text-white">{problem.title}</h2>
        <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${diffBadge(problem.difficulty)}`}>
          {problem.difficulty}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded border border-sky-500/20 bg-sky-500/8 px-2 py-0.5 text-[11px] text-sky-400 capitalize">
          {problem.category}
        </span>
        <span className="rounded border border-purple-500/20 bg-purple-500/8 px-2 py-0.5 text-[11px] text-purple-400">
          {problem.source === 'ai_generated' ? '✨ AI' : '📚 Bank'}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm leading-7 text-slate-300 whitespace-pre-wrap">{problem.description}</p>

      {/* Examples */}
      {samples.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Examples</p>
          {samples.map((tc, i) => (
            <div key={i} className="rounded-lg border border-white/6 bg-[#0a0f1a] p-3 text-xs space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Example {i + 1}</p>
              <div><span className="text-slate-500">Input: </span><code className="text-emerald-300">{JSON.stringify(tc.input)}</code></div>
              <div><span className="text-slate-500">Output: </span><code className="text-sky-300">{JSON.stringify(tc.expected_output)}</code></div>
            </div>
          ))}
        </div>
      )}

      {/* I/O contract */}
      {instructions && (
        <div className="rounded-lg border border-white/6 bg-[#0a0f1a] p-3 text-xs space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">I/O Contract</p>
          <div><span className="text-slate-500">stdin: </span><span className="text-slate-300">{instructions.stdin}</span></div>
          <div><span className="text-slate-500">stdout: </span><span className="text-slate-300">{instructions.stdout}</span></div>
        </div>
      )}

      {/* Win condition */}
      <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3 text-xs text-amber-200/80 leading-5">
        <span className="font-semibold text-amber-400">⚡ Win condition: </span>
        First fully verified-correct submission wins. Speed + accuracy = victory.
      </div>
    </div>
  );
}

/** Individual submission card */
function SubmissionCard({ submission, isOwn, isAiSparring }: {
  submission: Submission; isOwn: boolean; isAiSparring: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const testResults: SubmissionTestResult[] = Array.isArray(submission.test_results) ? submission.test_results : [];
  const hasDetails = testResults.length > 0 || !!submission.stderr || !!submission.ai_review;

  const cardStyle =
    submission.verdict === 'correct'   ? 'border-emerald-500/20 bg-emerald-500/5 animate-slide-right' :
    submission.verdict === 'error'     ? 'border-orange-500/20  bg-orange-500/5  animate-shake' :
    submission.verdict === 'incorrect' ? 'border-rose-500/20    bg-rose-500/5    animate-slide-right' :
                                         'border-sky-500/20     bg-sky-500/5';

  return (
    <div className={`rounded-xl border text-xs transition-all ${cardStyle}`}>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-slate-200 shrink-0">
            {isOwn ? '🧑‍💻 You' : isAiSparring ? '🤖 AI' : '⚔️ Opponent'}
          </span>
          <span className="text-slate-600">·</span>
          <span className="uppercase tracking-wide text-slate-500">{submission.language}</span>
          {submission.execution_time && (
            <><span className="text-slate-600">·</span><span className="text-slate-500">{submission.execution_time}s</span></>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VerdictBadge verdict={submission.verdict} />
          {hasDetails && (
            <button type="button" onClick={() => setExpanded(v => !v)}
              className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-slate-500 hover:text-white transition-colors">
              {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>
      <p className="px-3 pb-2 text-[10px] text-slate-600">{new Date(submission.submitted_at).toLocaleTimeString()}</p>

      {expanded && hasDetails && (
        <div className="border-t border-white/6 p-3 space-y-3">
          {testResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Test Results</p>
              {testResults.map((tr, i) => (
                <div key={i} className={`rounded-lg border p-2.5 space-y-1 ${tr.passed ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-rose-500/15 bg-rose-500/5'}`}>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Test {i + 1}</span>
                    <span className={tr.passed ? 'text-emerald-400' : 'text-rose-400'}>{tr.passed ? '✓ Pass' : '✗ Fail'}</span>
                  </div>
                  {!tr.passed && (
                    <>
                      {tr.stdout !== null && <div><span className="text-slate-500">Got: </span><code className="text-rose-300">{tr.stdout || '(empty)'}</code></div>}
                      {tr.stderr && <div><span className="text-slate-500">Error: </span><code className="text-orange-300 break-all">{tr.stderr}</code></div>}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {testResults.length === 0 && submission.stderr && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Error Output</p>
              <pre className="overflow-x-auto rounded bg-black/30 p-2 text-orange-200 whitespace-pre-wrap break-all">
                {submission.stderr}
              </pre>
            </div>
          )}
          {submission.ai_review && (
            <div className="rounded-lg border border-sky-500/15 bg-sky-500/5 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500 mb-1">✨ AI Review</p>
              <p className="leading-5 text-sky-100/80">{submission.ai_review}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main BattlePage ─────────────────────────────────────────────────────────
export function BattlePage() {
  const battleId = battleIdFromPath();
  const session  = readSession();
  const toast    = useToast();

  const [battle,       setBattle]       = useState<BattleDetail | null>(null);
  const [durationMs,   setDurationMs]   = useState(15 * 60 * 1000);
  const [instructions, setInstructions] = useState<{ stdin: string; stdout: string } | null>(null);
  const [language,     setLanguage]     = useState<SupportedLanguage>('python');
  const [code,         setCode]         = useState(TEMPLATES.python);
  const [pending,      setPending]      = useState(false);
  const [running,      setRunning]      = useState(false);
  const [sparPending,  setSparPending]  = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(durationMs);
  const [waitingMs,    setWaitingMs]    = useState(0);
  const [runResults,   setRunResults]   = useState<{ tc: ProblemTestCase; tr: SubmissionTestResult | undefined }[] | null>(null);
  const [victoryShown, setVictoryShown] = useState(false);
  const [presence,     setPresence]     = useState<Record<string, Presence>>({});
  const [activity,     setActivity]     = useState<ActivityEntry[]>([]);

  // AI Debrief state
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const [debriefData,      setDebriefData]      = useState<string | null>(null);
  const [debriefLoading,   setDebriefLoading]   = useState(false);

  const socketRef     = useRef<Socket | null>(null);
  const isAiSparRef   = useRef(false);
  const currentUserId = session?.user.id ?? '';

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentPlayer = useMemo(() => {
    if (!battle || !currentUserId) return null;
    return battle.player_a.id === currentUserId ? battle.player_a
         : battle.player_b?.id === currentUserId ? battle.player_b : null;
  }, [battle, currentUserId]);

  const opponent = useMemo(() => {
    if (!battle || !currentUserId) return null;
    if (battle.player_a.id === currentUserId) return battle.player_b;
    return battle.player_b?.id === currentUserId ? battle.player_a : null;
  }, [battle, currentUserId]);

  const ownSubmissions      = useMemo(() => battle?.submissions.filter(s => s.user_id === currentUserId) ?? [], [battle, currentUserId]);
  const opponentSubmissions = useMemo(() => battle?.submissions.filter(s => s.user_id !== currentUserId) ?? [], [battle, currentUserId]);

  const myPresence        = presence[currentUserId] ?? 'offline';
  const opponentPresence  = opponent ? (presence[opponent.id] ?? 'offline') : 'offline';
  const opponentIsOnline  = opponentPresence === 'online'; // server marks online when heartbeat < 15 s
  // Renamed from opponentTyping → opponentIsOnline (Bug 2: it was always true when opponent online)

  const sparEligible = Boolean(
    battle && battle.status === 'waiting' && !battle.player_b &&
    waitingMs >= SPARRING_WAIT_MS && battle.player_a.id === currentUserId
  );

  // Time pressure percentage (0-100)
  const timeElapsedPct = battle?.started_at
    ? Math.min(100, ((durationMs - timeRemaining) / durationMs) * 100)
    : 0;
  const inDangerZone = timeRemaining < 60_000 && battle?.status === 'active';

  // ── Activity feed helper ───────────────────────────────────────────────────
  const addActivity = useCallback((entry: ActivityEntry) => {
    setActivity(prev => [entry, ...prev].slice(0, 30)); // keep last 30
  }, []);
  // Stable ref so socket useEffect never has addActivity as a re-connect trigger
  const addActivityRef = useRef(addActivity);
  useEffect(() => { addActivityRef.current = addActivity; }, [addActivity]);

  // ── Language template reset (with confirmation guard) ─────────────────────
  const prevLanguageRef = useRef<SupportedLanguage>(language);
  useEffect(() => {
    const prev = prevLanguageRef.current;
    prevLanguageRef.current = language;
    if (language === prev) return; // no change
    const isModified = code.trim() !== TEMPLATES[prev].trim();
    if (isModified) {
      const confirmed = window.confirm(
        `⚠ Switching to ${language.toUpperCase()} will replace your current code with a blank template.\n\nAre you sure? Your ${prev} code will be lost.`
      );
      if (!confirmed) {
        // Revert the language selector back — but we need to avoid re-triggering
        prevLanguageRef.current = prev;
        setLanguage(prev);
        return;
      }
    }
    setCode(TEMPLATES[language]);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load battle ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!battleId) { toast.error('Battle ID missing from URL.'); return; }
    async function load() {
      try {
        const res = await fetchBattle(battleId);
        setBattle(res.battle);
        setDurationMs(res.durationMs ?? 15 * 60 * 1000);
        setInstructions(res.instructions ?? null);
        isAiSparRef.current = res.battle.is_ai_sparring;
        addActivity(mkActivity('🏟️', `Battle loaded: ${res.battle.problem.title}`, 'info'));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load battle.');
      }
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId]);

  // ── Socket + heartbeat ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!battleId || !currentUserId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    const refresh = async () => {
      try {
        const res = await fetchBattle(battleId);
        setBattle(res.battle);
        setDurationMs(res.durationMs ?? 15 * 60 * 1000);
        isAiSparRef.current = res.battle.is_ai_sparring;
      } catch { /* non-fatal */ }
    };

    socket.emit('battle:join', { battleId });

    // ── Heartbeat: announce our presence every HEARTBEAT_MS ────────────────
    const heartbeat = () => socket.emit('user:heartbeat', { battleId, userId: currentUserId });
    heartbeat(); // immediate on connect
    const hbInterval = window.setInterval(heartbeat, HEARTBEAT_MS);

    // ── Presence updates ────────────────────────────────────────────────────
    socket.on('user:presence', ({ presence: snap }: { battleId: string; presence: Record<string, Presence> }) => {
      setPresence(snap);
    });

    // ── Battle events ────────────────────────────────────────────────────────
    socket.on('battle:started', (ev: { aiSparring?: boolean; botDelayMs?: number }) => {
      const msg = ev.aiSparring
        ? `⚔️ Sparring vs AI started! Bot thinking ~${Math.round((ev.botDelayMs ?? 0) / 1000)}s`
        : '⚔️ Battle started! Clock is live.';
      toast.info(msg);
      addActivityRef.current(mkActivity('🚀', msg, 'info'));
      void refresh();
    });

    socket.on('battle:submission_status', (ev: { userId: string }) => {
      if (ev.userId !== currentUserId) {
        const who = isAiSparRef.current ? 'AI' : 'Opponent';
        const msg = `${who} submitted code — judging…`;
        toast.info(msg);
        addActivityRef.current(mkActivity('⚡', msg, 'warning'));
      }
    });

    socket.on('battle:submission_result', () => { void refresh(); });

    socket.on('battle:completed', (ev: { result?: string; winnerId?: string | null }) => {
      const isWinner = ev.winnerId === currentUserId;
      const isDraw   = ev.result === 'draw' || ev.winnerId === null;
      const msg = isDraw  ? '🤝 Draw — neither solved it in time.'
                : isWinner ? '🏆 VICTORY — You crushed it!'
                           : '💀 Defeat — they got there first. Rematch?';
      if (isDraw)   toast.info(msg);
      else if (isWinner) toast.success(msg);
      else               toast.error(msg);
      addActivityRef.current(mkActivity(isDraw ? '🤝' : isWinner ? '🏆' : '💀', msg, isDraw ? 'warning' : isWinner ? 'success' : 'danger'));
      void refresh();
    });

    return () => {
      window.clearInterval(hbInterval);
      socket.emit('battle:leave', { battleId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [battleId, currentUserId]); // addActivity excluded — stable via addActivityRef

  // ── Timer ──────────────────────────────────────────────────────────────────
  const timeUpFiredRef = useRef(false);
  useEffect(() => {
    timeUpFiredRef.current = false; // reset on each battle/status change
    if (!battle?.started_at || battle.status !== 'active') {
      setTimeRemaining(durationMs);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - new Date(battle.started_at as string).getTime();
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0 && !timeUpFiredRef.current) {
        timeUpFiredRef.current = true;
        addActivity(mkActivity('⏰', 'Time is up!', 'danger'));
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [battle?.started_at, battle?.status, durationMs, addActivity]);

  // ── Waiting timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!battle || battle.status !== 'waiting' || battle.player_b) { setWaitingMs(0); return; }
    const tick = () => setWaitingMs(Date.now() - new Date(battle.created_at).getTime());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [battle]);

  // ── Opponent submissions activity ──────────────────────────────────────────
  const prevOpponentSubCount = useRef(0);
  useEffect(() => {
    if (opponentSubmissions.length > prevOpponentSubCount.current) {
      const latest = opponentSubmissions[opponentSubmissions.length - 1];
      if (latest) {
        const icon = latest.verdict === 'correct' ? '💀' : latest.verdict === 'incorrect' ? '😅' : '⚠️';
        const who  = isAiSparRef.current ? 'AI' : 'Opponent';
        addActivity(mkActivity(icon, `${who} got: ${latest.verdict.toUpperCase()}`, latest.verdict === 'correct' ? 'danger' : 'warning'));
      }
    }
    prevOpponentSubCount.current = opponentSubmissions.length;
  }, [opponentSubmissions, addActivity]);

  // ── Own submissions activity ───────────────────────────────────────────────
  const prevOwnSubCount = useRef(0);
  useEffect(() => {
    if (ownSubmissions.length > prevOwnSubCount.current) {
      const latest = ownSubmissions[ownSubmissions.length - 1];
      if (latest) {
        const icon = latest.verdict === 'correct' ? '🏆' : latest.verdict === 'incorrect' ? '🔄' : '🔥';
        addActivity(mkActivity(icon, `Your submission: ${latest.verdict.toUpperCase()}`, latest.verdict === 'correct' ? 'success' : 'info'));
      }
    }
    prevOwnSubCount.current = ownSubmissions.length;
  }, [ownSubmissions, addActivity]);

  // ── Victory confetti ───────────────────────────────────────────────────────
  useEffect(() => {
    if (battle?.status === 'completed' && battle.winner_id === currentUserId && !victoryShown) {
      setVictoryShown(true);
      fireConfetti();
      addActivity(mkActivity('🏆', 'YOU WIN! Incredible performance!', 'success'));
    }
  }, [battle?.status, battle?.winner_id, currentUserId, victoryShown, addActivity]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleStartBattle() {
    if (!battleId) return;
    try {
      await startBattle(battleId);
      toast.success('Battle started!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start battle');
    }
  }

  async function handleRun() {
    if (!battle?.problem.test_cases?.length) { toast.warning('No test cases to run against.'); return; }
    if (!currentUserId) { toast.error('Sign in first.'); return; }
    // Mutex: prevent concurrent run + submit (Bug 19)
    if (pending) { toast.warning('Submission in progress — wait before running.'); return; }
    try {
      setRunning(true);
      setRunResults(null);
      addActivity(mkActivity('▶', 'Running against sample test cases…', 'info'));
      const samples = battle.problem.test_cases.slice(0, 2);
      // Bug 1 Fix: use dry-run endpoint — no submission saved, no win triggered
      const res = await runBattle(battleId, { userId: currentUserId, code, language });
      const trs: SubmissionTestResult[] = Array.isArray(res.testResults) ? res.testResults : [];
      setRunResults(samples.map((tc, i) => ({ tc, tr: trs[i] })));
      const passed = trs.filter(t => t.passed).length;
      const sampleNote = '(sample tests only — submit to run all hidden cases)';
      if (passed === samples.length) {
        toast.success(`✅ ${passed}/${samples.length} samples passed ${sampleNote}`);
        addActivity(mkActivity('✅', `${passed}/${samples.length} samples passed`, 'success'));
      } else {
        toast.warning(`⚠ ${passed}/${samples.length} samples passed ${sampleNote}`);
        addActivity(mkActivity('⚠', `${passed}/${samples.length} samples passed`, 'warning'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Run failed.');
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!battleId || !currentUserId) { toast.error('Sign in first.'); return; }
    // Mutex: prevent concurrent run + submit (Bug 19)
    if (running) { toast.warning('Code is still running — wait before submitting.'); return; }
    try {
      setPending(true);
      setRunResults(null);
      addActivity(mkActivity('📤', 'Submitting to judge…', 'info'));
      const res = await submitBattle(battleId, { userId: currentUserId, code, language });
      setBattle(res.battle);

      if (res.winnerDeclared) {
        toast.success('🏆 VICTORY! First correct submission!');
        if (session && res.battle) {
          const up = res.battle.player_a?.id === currentUserId ? res.battle.player_a : res.battle.player_b;
          if (up) saveSession({ user: { ...session.user, points: up.points } });
        }
      } else {
        const v = res.submission?.verdict ?? 'unknown';
        if (v === 'correct')   toast.success('✓ Correct — but someone already won.');
        else if (v === 'incorrect') toast.warning('✗ Wrong answer — check test diffs below.');
        else if (v === 'error')     toast.error('⚠ Runtime error — see details.');
        else toast.info('Submission recorded.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setPending(false);
    }
  }

  async function handleStartSparring() {
    if (!battleId || !currentUserId) return;
    try {
      setSparPending(true);
      const res = await startAiSparring(battleId, currentUserId);
      setBattle(res.battle);
      isAiSparRef.current = true;
      toast.info(`🤖 Sparring vs AI! Bot thinking ~${Math.round(res.botDelayMs / 1000)}s`);
      addActivity(mkActivity('🤖', 'AI sparring mode activated', 'info'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sparring start failed');
    } finally { setRunning(false); }
  }

  async function handleDebrief() {
    if (!battleId || !currentUserId) return;
    setShowDebriefModal(true);
    if (debriefData) return; // already loaded

    try {
      setDebriefLoading(true);
      const res = await fetchBattleDebrief(battleId, currentUserId);
      setDebriefData(res.debrief);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch debrief.');
      setShowDebriefModal(false);
    } finally {
      setDebriefLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const won  = battle?.status === 'completed' && battle.winner_id === currentUserId;
  const lost = battle?.status === 'completed' && battle.winner_id !== null && battle.winner_id !== currentUserId;
  const draw = battle?.status === 'completed' && battle.result === 'draw';

  // ── Motivational status ────────────────────────────────────────────────────
  function getMotivation() {
    if (battle?.status !== 'active') return null;
    const myCorrect  = ownSubmissions.some(s => s.verdict === 'correct');
    const oppCorrect = opponentSubmissions.some(s => s.verdict === 'correct');
    if (myCorrect && !oppCorrect) return { text: "🏆 You're WINNING!", cls: 'text-emerald-400' };
    if (!myCorrect && oppCorrect) return { text: '⚡ Catch up — opponent solved it!', cls: 'text-rose-400' };
    if (inDangerZone) return { text: '⏰ FINAL SECONDS — GO!', cls: 'text-red-400 animate-countdown' };
    if (ownSubmissions.length === 0 && opponentSubmissions.length === 0)
      return { text: '🎯 First submission wins — code fast!', cls: 'text-amber-400' };
    return { text: '⚔ Neck and neck — stay sharp!', cls: 'text-sky-400' };
  }

  const motivation = getMotivation();

  // ── No session guard ───────────────────────────────────────────────────────
  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060a10] px-6 text-white">
        <div className="rounded-2xl border border-white/8 bg-white/4 p-10 text-center max-w-sm">
          <div className="mb-4 text-5xl">🔒</div>
          <p className="text-xl font-bold">Sign in to battle</p>
          <p className="mt-2 text-sm text-slate-400">You need an account to enter the arena.</p>
          <button type="button" onClick={() => { window.location.href = '/'; }}
            className="mt-6 rounded-full bg-white px-6 py-3 font-bold text-slate-950 hover:bg-slate-100 transition-colors">
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--color-bg-deep)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* ══ Navbar ══════════════════════════════════════════════════════════ */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b px-4" style={{ borderColor: 'var(--color-border)', background: 'rgba(22,27,34,0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { window.location.href = '/'; }}
            className="flex items-center gap-2 font-black tracking-tight text-white hover:text-sky-300 transition-colors">
            <span className="text-xl">⚔</span>
            <span style={{ fontFamily: 'var(--font-hud)' }} className="text-sm">CLASHCODE</span>
          </button>
          <span className="text-slate-700">/</span>
          <span className="hidden sm:block text-xs text-slate-500 truncate max-w-[180px]">{battle?.problem.title ?? 'Loading…'}</span>
          {battle?.is_ai_sparring && (
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">🤖 AI SPARRING</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Countdown HUD */}
          <div className={`font-hud rounded-lg border px-3 py-1 text-sm font-bold tabular-nums ${
            inDangerZone ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-countdown glow-red' : 'border-white/10 bg-white/5 text-white'
          }`} style={{ fontFamily: 'var(--font-hud)', letterSpacing: '0.05em' }}>
            {formatCountdown(timeRemaining)}
          </div>
          {/* Player chip */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold">
              {(session.user.name ?? 'U')[0]?.toUpperCase()}
            </div>
            <span className="hidden sm:block text-xs text-slate-300">{session.user.name}</span>
          </div>
          {battle?.war_id && (
            <button type="button" onClick={() => { window.location.href = `/war/${battle.war_id}`; }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition-colors">
              War Room
            </button>
          )}
        </div>
      </header>

      {/* ══ VS Header (fighting-game confrontation bar) ══════════════════════ */}
      <div className="vs-header flex-shrink-0 min-h-[76px] py-1">
        {/* Left: You */}
        <PlayerCard
          name={currentPlayer?.name ?? session.user.name}
          points={currentPlayer?.points ?? session.user.points}
          rankTier={(session.user as unknown as Record<string,string>).rank_tier}
          presence={myPresence}
          isYou={true}
        />

        {/* Center: VS + battle state */}
        <div className="flex flex-col items-center justify-center px-4 min-w-[90px]">
          {battle?.status === 'active' ? (
            <>
              <span className="animate-vs-glow text-base font-black tracking-widest" style={{ fontFamily: 'var(--font-hud)', color: 'var(--color-vs)' }}>VS</span>
              {motivation && <p className="text-[9px] font-semibold truncate max-w-[100px] text-center mt-0.5" style={{ color: motivation.cls.includes('emerald') ? '#4ade80' : motivation.cls.includes('rose') ? '#f87171' : motivation.cls.includes('red') ? '#ef4444' : '#38bdf8' }}>{motivation.text}</p>}
            </>
          ) : battle?.status === 'completed' ? (
            <span className="text-xs font-bold" style={{ color: won ? '#4ade80' : lost ? '#f87171' : '#fbbf24' }}>
              {won ? '🏆 WIN' : lost ? '💀 LOSS' : '🤝 DRAW'}
            </span>
          ) : (
            battle?.player_a_id === currentUserId && battle?.player_b ? (
              <button
                type="button"
                onClick={() => void handleStartBattle()}
                disabled={opponentPresence !== 'online'}
                className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap transition-all"
              >
                {opponentPresence === 'online' ? 'Start Battle ⚔️' : 'Wait for join…'}
              </button>
            ) : (
              <span className="text-[10px] text-slate-500 uppercase tracking-widest whitespace-nowrap">Waiting</span>
            )
          )}
        </div>

        {/* Right: Opponent */}
        {battle?.player_b || battle?.is_ai_sparring ? (
          <PlayerCard
            name={battle.is_ai_sparring ? 'ClashCode AI' : (opponent?.name ?? 'Opponent')}
            points={opponent?.points ?? 0}
            rankTier={undefined}
            isAI={battle.is_ai_sparring}
            presence={battle.is_ai_sparring ? 'online' : opponentPresence}
            isYou={false}
          />
        ) : (
          <div className="flex items-center justify-end px-5">
            <div className="text-right">
              <p className="text-xs text-slate-500">Waiting for challenger…</p>
              {sparEligible && (
                <button type="button" onClick={() => void handleStartSparring()} disabled={sparPending}
                  className="mt-1 rounded-lg bg-purple-500 px-3 py-1 text-[10px] font-bold text-white hover:bg-purple-400 disabled:opacity-50 transition-colors">
                  {sparPending ? 'Starting…' : '🤖 Spar vs AI'}
                </button>
              )}
              {!sparEligible && (
                <p className="text-[10px] text-slate-600">
                  AI in {Math.max(0, Math.ceil((SPARRING_WAIT_MS - waitingMs) / 1000))}s
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ Time pressure bar — shrinks as time runs out (Bug 4 fix) ════════ */}
      <div className="h-0.5 flex-shrink-0 bg-white/5 relative overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${inDangerZone ? 'bg-red-500 animate-danger' : 'bg-sky-500'}`}
          style={{ width: `${(timeRemaining / durationMs) * 100}%` }}
        />
      </div>

      {/* ══ Outcome banner ════════════════════════════════════════════════ */}
      {battle?.status === 'completed' && (
        <div className={`flex-shrink-0 py-2 text-center text-xs font-bold uppercase tracking-widest ${
          won  ? 'bg-emerald-500/10 text-emerald-300 border-b border-emerald-500/20 animate-victory' :
          draw ? 'bg-amber-500/10   text-amber-300   border-b border-amber-500/20' :
                 'bg-rose-500/10    text-rose-300    border-b border-rose-500/20'
        }`}>
          {won  ? '🏆 VICTORY — You were first. Legend.' :
           draw ? '🤝 DRAW — Neither solved it in time.' :
                  '💀 DEFEAT — They got there first. Rematch?'}
        </div>
      )}

      {/* ══ 3-Panel layout ══════════════════════════════════════════════════ */}
      <div className="battle-grid flex-1">

        {/* LEFT: Problem */}
        <div className="battle-pane border-r" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }}>
          <ProblemPanel problem={battle?.problem} instructions={instructions} />
        </div>

        {/* CENTER: Code editor */}
        <div className="battle-pane flex flex-col" style={{ background: 'var(--color-bg-surface)' }}>
          {/* Toolbar */}
          <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-panel)' }}>
            <div className="flex items-center gap-2">
              <label htmlFor="lang-select" className="text-[11px] text-slate-500 uppercase tracking-wider">Lang</label>
              <select id="lang-select" value={language} onChange={e => setLanguage(e.target.value as SupportedLanguage)}
                className="rounded-lg border px-2.5 py-1 text-xs text-white outline-none focus:border-sky-500/50 cursor-pointer"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-deep)' }}>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button id="run-code-btn" type="button" onClick={() => void handleRun()}
                disabled={running || pending || battle?.status !== 'active'}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                {running ? '⟳ Running…' : '▶ Run'}
              </button>
              <button id="submit-code-btn" type="button" onClick={() => void handleSubmit()}
                disabled={pending || running || battle?.status !== 'active'}
                className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 hover:glow-green">
                {pending ? '⟳ Judging…' : 'Submit ⚡'}
              </button>
            </div>
          </div>

          {/* Monaco */}
          <div className="monaco-editor-host">
            <Editor
              height="100%"
              language={MONACO_LANG[language]}
              value={code}
              onChange={val => setCode(val ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'gutter',
                padding: { top: 12, bottom: 12 },
                tabSize: 2,
                wordWrap: 'on',
                automaticLayout: true,
                cursorBlinking: 'phase',
                smoothScrolling: true,
                contextmenu: false,
              }}
            />
          </div>

          {/* Run results */}
          {runResults && (
            <div className="flex-shrink-0 border-t max-h-48 overflow-y-auto p-3 space-y-2 animate-slide-up" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-panel)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sample Results</p>
              {runResults.map(({ tc, tr }, i) => (
                <div key={i} className={`rounded-lg border p-2.5 text-xs ${tr?.passed ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-rose-500/15 bg-rose-500/5'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Case {i + 1}</span>
                    <span className={tr?.passed ? 'text-emerald-400' : 'text-rose-400'}>{tr?.passed ? '✓ Pass' : '✗ Fail'}</span>
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    <div><span className="text-slate-500">Input: </span><code className="text-slate-300">{JSON.stringify(tc.input)}</code></div>
                    <div><span className="text-slate-500">Expected: </span><code className="text-emerald-300">{JSON.stringify(tc.expected_output)}</code></div>
                    {!tr?.passed && <div><span className="text-slate-500">Got: </span><code className={tr?.stderr ? 'text-orange-300' : 'text-rose-300'}>{tr?.stdout ?? tr?.stderr ?? '(no output)'}</code></div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status bar */}
          <div className="flex-shrink-0 flex items-center justify-between border-t px-4 py-2 text-[11px] text-slate-500" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-panel)' }}>
            <div className="flex items-center gap-3">
              <span>
                {battle?.status === 'waiting' ? '⏳ Waiting for battle to start'
                 : battle?.status === 'completed' ? '🏁 Battle ended'
                 : `⚡ ${formatCountdown(timeRemaining)} remaining`}
              </span>
              {battle?.status === 'completed' && (
                <button
                  onClick={handleDebrief}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors font-bold uppercase tracking-widest text-[9px]"
                >
                  <span aria-hidden="true">🤖</span> Get AI Debrief
                </button>
              )}
            </div>
            {opponentIsOnline && battle?.status === 'active' && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span>🟢 {battle.is_ai_sparring ? 'AI' : 'Opponent'} online</span>
              </span>
            )}
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="battle-pane space-y-0" style={{ background: 'var(--color-bg-deep)', borderLeft: `1px solid var(--color-border)` }}>
          {/* Activity feed */}
          <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">⚡ Live Activity</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {activity.length === 0 ? (
                <p className="text-[11px] text-slate-700 py-2 text-center">Battle not started yet…</p>
              ) : (
                activity.slice(0, 8).map(e => <ActivityItem key={e.id} entry={e} />)
              )}
            </div>
          </div>

          {/* Submissions: Yours */}
          <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Your Submissions</p>
              <span className="rounded-full border border-white/8 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{ownSubmissions.length}</span>
            </div>
            {ownSubmissions.length === 0 ? (
              <p className="text-[11px] text-slate-700 py-2 text-center">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {[...ownSubmissions].reverse().map(s => (
                  <SubmissionCard key={s.id} submission={s} isOwn={true} isAiSparring={battle?.is_ai_sparring ?? false} />
                ))}
              </div>
            )}
          </div>

          {/* Submissions: Opponent */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {battle?.is_ai_sparring ? '🤖 AI Activity' : '⚔ Opponent'}
              </p>
              <span className="rounded-full border border-white/8 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{opponentSubmissions.length}</span>
            </div>
            {opponentSubmissions.length === 0 ? (
              <p className="text-[11px] text-slate-700 py-2 text-center">
                {battle?.is_ai_sparring ? 'AI is still thinking…' : 'Opponent hasn\'t submitted yet.'}
              </p>
            ) : (
              <div className="space-y-2">
                {[...opponentSubmissions].reverse().map(s => (
                  <SubmissionCard key={s.id} submission={s} isOwn={false} isAiSparring={battle?.is_ai_sparring ?? false} />
                ))}
              </div>
            )}
          </div>
        </div>
        </div>

      {showDebriefModal && (
        <AiDebriefModal
          debrief={debriefData}
          loading={debriefLoading}
          onClose={() => setShowDebriefModal(false)}
        />
      )}
    </div>
  );
}
