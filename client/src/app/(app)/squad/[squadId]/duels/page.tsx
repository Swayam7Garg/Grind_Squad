'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { getSquadDuels, acceptDuel, completeDuel, cancelDuel, getMe, setAuthToken } from '@/lib/api';
import { Duel, User } from '@/lib/types';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function SquadDuelsPage() {
  const params = useParams();
  const squadId = params.squadId as string;
  const [duels, setDuels] = useState<Duel[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { getToken } = useAuth();

  useEffect(() => {
    fetchData();
  }, [squadId]);

  const fetchData = async () => {
    try {
      const token = await getToken();
      if (token) setAuthToken(token);

      const [duelsRes, meRes] = await Promise.all([
        getSquadDuels(squadId),
        getMe()
      ]);
      setDuels(duelsRes.data?.data || []);
      setMe(meRes.data?.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'accept' | 'complete' | 'cancel', duelId: string) => {
    try {
      if (action === 'accept') await acceptDuel(duelId);
      if (action === 'complete') await completeDuel(duelId);
      if (action === 'cancel') await cancelDuel(duelId);
      fetchData(); // refresh list
    } catch (err) {
      console.error(err);
      alert('Action failed. See console.');
    }
  };

  if (loading) return <div className="text-center p-8 text-gray-500">Loading arena...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>1v1 <span className={styles.titleGlow}>Arena</span></h1>
      </div>

      <div className={styles.grid}>
        {duels.length === 0 ? (
          <div className={styles.emptyState}>No duels have been fought here yet. Challenge someone from the feed!</div>
        ) : (
          duels.map(d => {
            const isChallenger = me?.id === d.challengerId;
            const isOpponent = me?.id === d.opponentId;
            const amParticipant = isChallenger || isOpponent;
            
            return (
              <div key={d.id} className={`${styles.duelCard} ${d.status === 'ACTIVE' ? styles.active : ''}`}>
                <div className={styles.duelHeader}>
                  <div className={styles.problemTitle}>{d.problem.title}</div>
                  <div className={`${styles.badge} ${
                    d.status === 'PENDING' ? styles.badgePending : 
                    d.status === 'ACTIVE' ? styles.badgeActive : 
                    d.status === 'COMPLETED' ? styles.badgeCompleted : styles.badgeCancelled
                  }`}>
                    {d.status}
                  </div>
                </div>

                <div className={styles.duelBody}>
                  <div className={styles.versus}>VS</div>
                  <div className={`${styles.player} ${d.winnerId === d.challenger.id ? styles.winner : (d.status === 'COMPLETED' ? styles.loser : '')}`}>
                    <div className={styles.avatar}>
                      {d.challenger.avatarUrl ? <img src={d.challenger.avatarUrl} alt="avatar" /> : '👤'}
                    </div>
                    <span className={styles.username}>{d.challenger.username}</span>
                  </div>
                  
                  <div className={`${styles.player} ${d.winnerId === d.opponent.id ? styles.winner : (d.status === 'COMPLETED' ? styles.loser : '')}`}>
                    <div className={styles.avatar}>
                      {d.opponent.avatarUrl ? <img src={d.opponent.avatarUrl} alt="avatar" /> : '👤'}
                    </div>
                    <span className={styles.username}>{d.opponent.username}</span>
                  </div>
                </div>

                <div className={styles.duelFooter}>
                  <div className={styles.timeInfo}>
                    <span className="material-symbols-rounded" style={{ fontSize: 16 }}>timer</span>
                    {d.timeLimit}m constraint
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {d.status === 'PENDING' && isOpponent && (
                      <button onClick={() => handleAction('accept', d.id)} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>Accept</button>
                    )}
                    {d.status === 'PENDING' && isChallenger && (
                      <button onClick={() => handleAction('cancel', d.id)} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>Cancel</button>
                    )}
                    {d.status === 'ACTIVE' && amParticipant && (
                      <button onClick={() => handleAction('complete', d.id)} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>Mark Solved</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
