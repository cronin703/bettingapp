'use client';
import { useState } from 'react';
import { runMorning, runPregame, runSettle, runBackfill } from './actions';

function JobButton({ label, desc, action, color = 'blue' }: {
  label: string; desc: string; color?: string;
  action: () => Promise<unknown>;
}) {
  const [status, setStatus] = useState<'idle'|'running'|'done'|'error'>('idle');
  const [result, setResult] = useState('');

  async function run() {
    setStatus('running'); setResult('');
    try {
      const data = await action();
      setResult(JSON.stringify(data, null, 2));
      setStatus('done');
    } catch (e) { setResult(String(e)); setStatus('error'); }
  }

  const colors: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-500',
    purple: 'bg-purple-600 hover:bg-purple-500',
    green: 'bg-green-700 hover:bg-green-600',
  };

  return (
    <div className="border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-sm text-gray-400">{desc}</div>
        </div>
        <button onClick={run} disabled={status === 'running'}
          className={`shrink-0 px-4 py-2 rounded ${colors[color]} disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium transition-colors`}>
          {status === 'running' ? 'Running…' : status === 'done' ? '✓ Done' : 'Run'}
        </button>
      </div>
      {result && (
        <pre className={`text-xs rounded p-3 overflow-auto max-h-48 ${status === 'error' ? 'bg-red-950 text-red-300' : 'bg-gray-900 text-green-300'}`}>
          {result}
        </pre>
      )}
    </div>
  );
}

function BackfillPanel() {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'idle'|'running'|'done'|'error'>('idle');
  const [result, setResult] = useState('');

  async function run() {
    if (!date) return;
    setStatus('running'); setResult('');
    try {
      const data = await runBackfill(date);
      setResult(JSON.stringify(data, null, 2));
      setStatus('done');
    } catch (e) { setResult(String(e)); setStatus('error'); }
  }

  return (
    <div className="border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold">Backfill Past Date</div>
          <div className="text-sm text-gray-400">Run model + record final scores for any historical date</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm" />
          <button onClick={run} disabled={!date || status === 'running'}
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium transition-colors">
            {status === 'running' ? 'Running…' : status === 'done' ? '✓ Done' : 'Run'}
          </button>
        </div>
      </div>
      {result && (
        <pre className={`text-xs rounded p-3 overflow-auto max-h-48 ${status === 'error' ? 'bg-red-950 text-red-300' : 'bg-gray-900 text-green-300'}`}>
          {result}
        </pre>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-sm text-gray-400">Manually trigger model runs. The cron does this automatically at 9 AM and 5 PM ET.</p>
      <JobButton label="Run Morning Model (Today)" color="blue"
        desc="Fetch today's schedule, lines, injuries → generate picks"
        action={runMorning} />
      <JobButton label="Run Pregame Model (Today)" color="green"
        desc="Re-run model with updated lines closer to tipoff"
        action={runPregame} />
      <JobButton label="Settle Today's Results" color="green"
        desc="Fetch final scores for today's games and record win/loss"
        action={runSettle} />
      <BackfillPanel />
    </div>
  );
}
