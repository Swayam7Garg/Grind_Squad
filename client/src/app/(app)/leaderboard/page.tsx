'use client';
import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { getGlobalLeaderboard } from '@/lib/api';

interface GlobalEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  totalPoints: number;
  streak: number;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function GlobalLeaderboardPage() {
  const [entries, setEntries] = useState<GlobalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGlobalLeaderboard()
      .then(r => setEntries(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className="label-sm">Global Rankings</div>
          <h1 className={styles.title}>⚡ Global Leaderboard</h1>
        </div>
        <p className={styles.subtitle}>Top engineers ranked by total points. Weekly resets keep it competitive.</p>
      </header>

      {loading ? (
        <div className={styles.skeletons}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 6 }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-symbols-rounded" style={{ fontSize: 48, opacity: 0.2 }}>leaderboard</span>
          <p>No data yet. Start solving problems to appear here!</p>
        </div>
      ) : (
        <div className={styles.content}>
          {/* Podium */}
          <div className={styles.podium}>
            {top3.map((e, i) => (
              <div key={e.userId} className={`${styles.podiumCard} ${i === 0 ? styles.podiumFirst : ''}`}>
                <div className={styles.podiumMedal}>{RANK_MEDALS[i]}</div>
                <div className={styles.podiumAvatar}>
                  {e.username.slice(0, 2).toUpperCase()}
                  {i === 0 && <div className={styles.podiumGlow} />}
                </div>
                <div className={styles.podiumName}>{e.username}</div>
                <div className={styles.podiumPts}>{e.totalPoints.toLocaleString()}</div>
                <div className="label-sm">pts</div>
                {e.streak > 0 && (
                  <div className={styles.podiumStreak}>
                    <span className="material-symbols-rounded" style={{ fontSize: 11 }}>local_fire_department</span>
                    {e.streak}d
                  </div>
                )}
              </div>
            ))}
          </div>

          {rest.length > 0 && (
            <div className={styles.rankList}>
              {rest.map(e => (
                <div key={e.userId} className={styles.rankRow}>
                  <span className={styles.rankNum}>#{e.rank}</span>
                  <div className={styles.rankAvatar}>{e.username.slice(0, 2).toUpperCase()}</div>
                  <span className={styles.rankName}>{e.username}</span>
                  <div style={{ flex: 1 }} />
                  {e.streak > 0 && (
                    <span className={styles.rankStreak}>
                      <span className="material-symbols-rounded" style={{ fontSize: 12 }}>local_fire_department</span>
                      {e.streak}d
                    </span>
                  )}
                  <span className={styles.rankPts}>
                    {e.totalPoints.toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>pts</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
