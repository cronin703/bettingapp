'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface P { date: string; avg_clv: number | null; }

export default function CLVChart({ data }: { data: P[] }) {
  if (!data.length) return (
    <div style={{ height: 192, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--md-on-surface-variant)', fontSize: '.875rem' }}>
      No CLV data yet
    </div>
  );

  const d = data.map(x => ({ date: format(new Date(x.date), 'MMM d'), clv: x.avg_clv }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={d} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--md-outline) 40%, transparent)" />
        <XAxis dataKey="date" tick={{ fill: 'var(--md-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--md-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--md-surface-container-high)', border: '1px solid var(--md-outline-variant)', borderRadius: 12 }}
          labelStyle={{ color: 'var(--md-on-surface-variant)', fontSize: 11 }}
          itemStyle={{ color: 'var(--md-on-surface)', fontWeight: 600 }}
        />
        <ReferenceLine y={0} stroke="var(--md-outline)" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="clv" stroke="var(--md-primary)" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
