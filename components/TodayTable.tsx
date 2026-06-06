'use client';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';

interface Pick {
  away_team: string; home_team: string; tipoff_time: string;
  line: number | null; direction: string; edge_count: number;
  edges_fired: string[]; sizing: number; model_call: string | null;
}

function DirectionChip({ d }: { d: string }) {
  const cls = d === 'over' ? 'chip chip-over' : d === 'under' ? 'chip chip-under' : 'chip chip-skip';
  return <span className={cls}>{d.toUpperCase()}</span>;
}

export default function TodayTable({ picks }: { picks: Pick[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div style={{ background: 'var(--md-surface-container-low)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 90px 80px 90px 64px 72px',
        padding: '12px 20px',
        borderBottom: '1px solid var(--md-outline-variant)',
        color: 'var(--md-on-surface-variant)',
        fontSize: '.6875rem', fontWeight: 500, letterSpacing: '.045em', textTransform: 'uppercase',
      }}>
        <span>Matchup</span>
        <span>Tipoff</span>
        <span>Total</span>
        <span>Call</span>
        <span style={{ textAlign: 'right' }}>Edges</span>
        <span style={{ textAlign: 'right' }}>Size</span>
      </div>

      {picks.map((p, i) => (
        <div key={i}>
          {/* Row */}
          <div
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 90px 80px 90px 64px 72px',
              padding: '16px 20px', cursor: 'pointer', alignItems: 'center',
              borderBottom: expanded === i ? 'none' : '1px solid var(--md-outline-variant)',
              transition: 'background .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--md-primary) 5%, transparent)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: '.9375rem', color: 'var(--md-on-surface)' }}>
                {p.away_team}
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--md-on-surface-variant)', marginTop: 2 }}>
                @ {p.home_team}
              </div>
            </div>
            <span style={{ fontSize: '.875rem', color: 'var(--md-on-surface-variant)' }}>
              {format(new Date(p.tipoff_time), 'h:mm a')}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--md-on-surface)' }}>
              {p.line ?? '--'}
            </span>
            <span><DirectionChip d={p.direction} /></span>
            <span style={{ textAlign: 'right', fontSize: '.875rem', color: 'var(--md-on-surface)' }}>
              {p.edge_count > 0 ? p.edge_count : '--'}
            </span>
            <span style={{ textAlign: 'right', fontSize: '.875rem', fontWeight: 500,
              color: p.sizing > 0 ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }}>
              {p.sizing > 0 ? `${p.sizing}%` : '--'}
            </span>
          </div>

          {/* Expanded detail */}
          {expanded === i && (
            <div style={{
              padding: '12px 20px 16px',
              background: 'var(--md-surface-container-lowest)',
              borderBottom: '1px solid var(--md-outline-variant)',
            }}>
              {(p.edges_fired ?? []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {(p.edges_fired ?? []).map(e => (
                    <span key={e} className="edge-pill">{e}</span>
                  ))}
                </div>
              )}
              {p.model_call && (
                <p style={{ fontSize: '.8125rem', color: 'var(--md-on-surface-variant)', lineHeight: 1.5 }}>
                  {p.model_call}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
