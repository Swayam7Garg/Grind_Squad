'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { getSquadLeaderboard, getSquad } from '@/lib/api';
import type { Squad, LeaderboardEntry } from '@/lib/types';

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const params = useParams();
  const squadId = params.squadId as string;

  const [squad, setSquad] = useState<Squad | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<'alltime' | 'weekly'>('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getSquad(squadId), getSquadLeaderboard(squadId, period)])
      .then(([squadRes, lbRes]) => {
        setSquad(squadRes.data?.data);
        setEntries(lbRes.data?.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [squadId, period]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href={`/squad/${squadId}`} className={styles.backBtn}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          </Link>
          <div>
            <div className="label-sm">Squad Leaderboard</div>
            <h1 className={styles.title}>{squad?.name ?? '...'}</h1>
          </div>
        </div>
        <div className={styles.periods}>
          {(['weekly', 'alltime'] as const).map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'weekly' ? '7 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingRows}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 6 }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-symbols-rounded" style={{ fontSize: 40, opacity: 0.3 }}>leaderboard</span>
          <p>No data yet. Start solving!</p>
        </div>
      ) : (
        <div className={styles.content}>
          {/* ── Top 3 podium ── */}
          <div className={styles.podium}>
            {top3.map((e, i) => (
              <div key={e.userId} className={`${styles.podiumCard} ${i === 0 ? styles.podiumFirst : ''}`}>
                <div className={styles.podiumMedal}>{RANK_MEDALS[i]}</div>
                <div className={styles.podiumAvatar}>
                  {e.username.slice(0, 2).toUpperCase()}
                  {i === 0 && <div className={styles.podiumGlow} />}
                </div>
                <div className={styles.podiumName}>{e.username}</div>
                <div className={styles.podiumPts}>{e.points.toLocaleString()}</div>
                <div className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>pts</div>
                {e.streak > 0 && (
                  <div className={styles.podiumStreak}>
                    <span className="material-symbols-rounded" style={{ fontSize: 12 }}>local_fire_department</span>
                    {e.streak}d
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Rest of leaderboard ── */}
          {rest.length > 0 && (
            <div className={styles.rankList}>
              {rest.map(e => (
                <div key={e.userId} className={styles.rankRow}>
                  <span className={styles.rankNum}>#{e.rank}</span>
                  <div className={styles.rankAvatar}>{e.username.slice(0, 2).toUpperCase()}</div>
                  <span className={styles.rankName}>{e.username}</span>
                  {e.streak > 0 && (
                    <span className={styles.rankStreak}>
                      <span className="material-symbols-rounded" style={{ fontSize: 13 }}>local_fire_department</span>
                      {e.streak}d
                    </span>
                  )}
                  <span className={styles.rankPts}>{e.points.toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>pts</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
