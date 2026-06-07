import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'WNBA Model',
  description: 'WNBA totals betting model — Expert Bettor Framework v5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* MD3 Top App Bar */}
        <header style={{
          background: 'var(--md-surface-container)',
          borderBottom: '1px solid var(--md-outline-variant)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{
            maxWidth: 1100, margin: '0 auto',
            padding: '0 24px', height: 64,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {/* Wordmark */}
            <div style={{ marginRight: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="var(--md-primary-container)"/>
                <text x="5" y="20" fontSize="16" fontWeight="700" fill="var(--md-on-primary-container)">W</text>
              </svg>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--md-on-surface)', letterSpacing: '-.01em' }}>
                WNBA Model
              </span>
            </div>

            <nav style={{ display: 'flex', flex: 1, height: '100%', gap: 0, marginLeft: 8 }}>
              {[
                { href: '/',        label: 'Today' },
                { href: '/results', label: 'Results' },
                { href: '/clv',     label: 'CLV' },
                { href: '/model',   label: 'Model' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="nav-link" style={{
                  fontSize: '.875rem', fontWeight: 500, letterSpacing: '.006em',
                  padding: '0 14px', height: '100%',
                  display: 'flex', alignItems: 'center',
                  textDecoration: 'none',
                  borderBottom: '3px solid transparent',
                }}>
                  {label}
                </Link>
              ))}
            </nav>

            <Link href="/admin" style={{
              background: 'var(--md-surface-container-highest)',
              color: 'var(--md-on-surface-variant)',
              borderRadius: '100px', padding: '6px 16px',
              fontSize: '.75rem', fontWeight: 500, letterSpacing: '.031em',
              textDecoration: 'none', transition: 'background .15s',
            }}>
              Admin
            </Link>
          </div>
        </header>

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
