'use client';
import { useState } from 'react';
import { triggerMorning, triggerPregame, triggerSettle, triggerBackfill } from './actions';

function JobButton({ label, desc, action, variant = 'filled' }: {
  label: string; desc: string; variant?: 'filled' | 'tonal';
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

  const label_ = status === 'running' ? 'Running…' : status === 'done' ? 'Done' : 'Run';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <p className="type-title-sm" style={{ marginBottom: 2 }}>{label}</p>
          <p className="type-body-sm" style={{ color: 'var(--md-on-surface-variant)' }}>{desc}</p>
        </div>
        <button
          onClick={run}
          disabled={status === 'running'}
          className={variant === 'tonal' ? 'btn-tonal' : 'btn-filled'}
          style={{ flexShrink: 0 }}
        >
          {label_}
        </button>
      </div>
      {result && (
        <pre className="code-pre" style={{
          color: status === 'error' ? 'var(--md-loss)' : 'var(--md-win)',
          maxHeight: 192, overflow: 'auto',
        }}>
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
      const data = await triggerBackfill(date);
      setResult(JSON.stringify(data, null, 2));
      setStatus('done');
    } catch (e) { setResult(String(e)); setStatus('error'); }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <p className="type-title-sm" style={{ marginBottom: 2 }}>Backfill Past Date</p>
          <p className="type-body-sm" style={{ color: 'var(--md-on-surface-variant)' }}>Run model + record final scores for any historical date</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="md-input"
          />
          <button
            onClick={run}
            disabled={!date || status === 'running'}
            className="btn-tonal"
          >
            {status === 'running' ? 'Running…' : status === 'done' ? 'Done' : 'Run'}
          </button>
        </div>
      </div>
      {result && (
        <pre className="code-pre" style={{
          color: status === 'error' ? 'var(--md-loss)' : 'var(--md-win)',
          maxHeight: 192, overflow: 'auto',
        }}>
          {result}
        </pre>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 640 }}>
      <div>
        <h1 className="type-headline-md" style={{ marginBottom: 6 }}>Admin</h1>
        <p className="type-body-md" style={{ color: 'var(--md-on-surface-variant)' }}>
          Manually trigger model runs. The cron does this automatically at 9 AM and 5 PM ET.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <JobButton
          label="Run Morning Model"
          desc="Fetch today's schedule, lines, injuries → generate picks"
          action={triggerMorning}
        />
        <JobButton
          label="Run Pregame Update"
          desc="Re-run model with updated lines + auto-backfill last 7 days"
          variant="tonal"
          action={triggerPregame}
        />
        <JobButton
          label="Settle Today's Results"
          desc="Fetch final scores for today's games and record win/loss"
          variant="tonal"
          action={triggerSettle}
        />
        <BackfillPanel />
      </div>
    </div>
  );
}
