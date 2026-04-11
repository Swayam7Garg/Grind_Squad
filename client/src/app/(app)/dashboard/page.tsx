'use client';
import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import styles from './page.module.css';
import { getMe, getMySquads, syncUser, setAuthToken, getActivities } from '@/lib/api';
import type { User, Squad } from '@/lib/types';

const DIFF_COLORS: Record<string, string> = {
  EASY: 'var(--neon)',
  MEDIUM: 'var(--secondary)',
  HARD: 'var(--tertiary)',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [me, setMe] = useState<User | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;

    syncUser({
      clerkId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
      username: clerkUser.username ?? clerkUser.firstName ?? 'anonymous',
      avatarUrl: clerkUser.imageUrl,
    }).catch(() => {});

    getToken().then(token => {
      if (token) setAuthToken(token);
      return Promise.all([getMe(), getMySquads(), getActivities()]);
    })
      .then(([meRes, squadsRes, actRes]) => {
        setMe(meRes.data?.data);
        setSquads(squadsRes.data?.data ?? []);
        setActivities(actRes.data?.data ?? []);
      })
      .catch((err) => { console.error('Dashboard load error:', err); })
      .finally(() => setLoading(false));
  }, [isLoaded, clerkUser]);

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.main} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.loadingGlow} />
        <p className="label-sm">Booting tactical terminal...</p>
      </div>
    </div>
  );

  const level = Math.floor((me?.totalPoints ?? 0) / 100) + 1;

  return (
    <div className={styles.page}>
      {/* ── Sidebar: My Squads ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className="label-sm" style={{ marginBottom: '0.4rem' }}>MY SQUADS</div>
        </div>

        <div className={styles.squadList}>
          {squads.length === 0 ? (
            <div className={styles.emptySquads}>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem' }}>No squads yet.</p>
            </div>
          ) : squads.map(sq => (
            <Link key={sq.id} href={`/squad/${sq.id}`} className={styles.squadItem}>
              <div className={styles.squadAvatar}>{sq.name.slice(0, 2).toUpperCase()}</div>
              <div className={styles.squadInfo}>
                <div className={styles.squadName}>{sq.name}</div>
                <div className={styles.squadMeta}>
                  {sq._count?.members ?? 1}/{sq.memberLimit ?? 20} members · {sq._count?.problems ?? 0} problems
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className={styles.sidebarUpgrade}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.3rem' }}>⚡ Go Pro</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>Unlock advanced analytics & AI insights</div>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className={styles.main}>

        {/* STAT STRIP */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className="label-sm">Current Streak</div>
            <div className={styles.statValue} style={{ color: 'var(--tertiary)' }}>
              {me?.streak ?? 0}
              <span className={styles.statUnit}>day{me?.streak !== 1 ? 's' : ''} 🔥</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className="label-sm">Total Points</div>
            <div className={styles.statValue} style={{ color: 'var(--neon)' }}>
              {(me?.totalPoints ?? 0).toLocaleString()}
              <span className={styles.statUnit}>XP ⚡</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className="label-sm">Problems Solved</div>
            <div className={styles.statValue}>
              {me?._count?.solves ?? 0}
              <span className={styles.statUnit}>solved</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className="label-sm">Rank / Level</div>
            <div className={styles.statValue} style={{ color: 'var(--secondary)' }}>
              Lv {level}
              <span className={styles.statUnit}>tactical</span>
            </div>
          </div>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>

          {/* LEFT: ACTIVE SQUADS */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 3, height: 16, background: 'var(--neon)', borderRadius: 2 }} />
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIVE SQUADS</h2>
              </div>
              <Link href="/squads" className="label-sm" style={{ color: 'var(--neon)' }}>view all →</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {squads.length === 0 ? (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem', color: 'var(--on-surface-variant)', border: '1px dashed var(--outline-variant)', borderRadius: 'var(--radius-lg)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 32, opacity: 0.4, display: 'block', marginBottom: '0.5rem' }}>groups</span>
                  No active squads. <Link href="/squads/new" style={{ color: 'var(--neon)' }}>Create one →</Link>
                </div>
              ) : squads.map((sq, idx) => {
                const accentColors = ['var(--neon)', 'var(--secondary)', 'var(--tertiary)', 'var(--primary-dim)'];
                const accent = accentColors[idx % accentColors.length];
                const strength = Math.min(100, Math.round(((sq._count?.members ?? 1) / (sq.memberLimit ?? 20)) * 100));

                return (
                  <Link key={sq.id} href={`/squad/${sq.id}`} style={{
                    display: 'block',
                    background: 'var(--surface-container-high)',
                    border: '1px solid var(--outline-variant)',
                    borderLeft: `3px solid ${accent}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem',
                    transition: 'var(--transition)',
                    textDecoration: 'none',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-bright)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-container-high)')}
                  >
                    <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--on-surface)' }}>{sq.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>{sq.description || 'Tactical Unit'}</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
                      <span>Unit Strength</span>
                      <span style={{ color: accent }}>{sq._count?.members ?? 1}/{sq.memberLimit ?? 20}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--surface-variant)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${strength}%`, background: accent, borderRadius: 2, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ marginTop: '0.65rem', fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontFamily: 'monospace' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 3, color: accent }}>terminal</span>
                      {sq._count?.problems ?? 0} missions shared
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Action tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <Link href="/squads/new" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                padding: '1rem', borderRadius: 'var(--radius-lg)',
                border: '1px dashed rgba(0,255,156,0.25)',
                color: 'var(--on-surface-variant)', fontSize: '0.78rem', fontWeight: 600,
                transition: 'var(--transition)', textDecoration: 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--neon)'; e.currentTarget.style.color = 'var(--neon)'; e.currentTarget.style.background = 'rgba(0,255,156,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,255,156,0.25)'; e.currentTarget.style.color = 'var(--on-surface-variant)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 28 }}>add_circle</span>
                Create Squad
              </Link>
              <Link href="/squads/join" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                padding: '1rem', borderRadius: 'var(--radius-lg)',
                border: '1px dashed rgba(254,183,0,0.25)',
                color: 'var(--on-surface-variant)', fontSize: '0.78rem', fontWeight: 600,
                transition: 'var(--transition)', textDecoration: 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--secondary)'; e.currentTarget.style.color = 'var(--secondary)'; e.currentTarget.style.background = 'rgba(254,183,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(254,183,0,0.25)'; e.currentTarget.style.color = 'var(--on-surface-variant)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 28 }}>hub</span>
                Join Squad
              </Link>
            </div>
          </div>

          {/* RIGHT: COMMAND LOG */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 3, height: 16, background: 'var(--tertiary)', borderRadius: 2 }} />
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.05em' }}>COMMAND LOG</h2>
              </div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon)', boxShadow: '0 0 6px var(--neon)', animation: 'pulse 2s infinite' }} />
            </div>

            <div className={styles.commandLog}>
              {activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--on-surface-variant)', fontSize: '0.82rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: '0.5rem' }}>terminal</span>
                  No recent transmissions.
                </div>
              ) : activities.map((act: any) => (
                <div key={act.id} className={styles.logEntry}>
                  <span className={styles.logIcon}>{act.icon}</span>
                  <div className={styles.logBody}>
                    <div className={styles.logMsg}>{act.msg}</div>
                    <div className={styles.logTime}>{timeAgo(act.time)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tactical Status */}
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-md)', borderLeft: '2px solid rgba(0,255,156,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>
                <span>Tactical Status</span>
                <span style={{ color: 'var(--neon)' }}>● NOMINAL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                <span>Global Grinders:</span><span style={{ color: 'var(--on-surface)' }}>12,842</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--on-surface-variant)' }}>
                <span>Your Level:</span><span style={{ color: 'var(--secondary)' }}>Lv {level}</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
