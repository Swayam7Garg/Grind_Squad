'use client';

import { useState, useEffect } from 'react';
import styles from './DuelModal.module.css';
import { createDuel, getSquadMembers, getMe } from '@/lib/api';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface DuelModalProps {
  squadId: string;
  problemId: string;
  problemTitle: string;
  onClose: () => void;
}

export default function DuelModal({ squadId, problemId, problemTitle, onClose }: DuelModalProps) {
  const router = useRouter();
  const [members, setMembers] = useState<User[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [opponentId, setOpponentId] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getSquadMembers(squadId), getMe()])
      .then(([mRes, meRes]) => {
        const currentUser = meRes.data?.data;
        setMe(currentUser);
        // Exclude current user from opponent list
        const otherMembers = mRes.map((m: any) => m.user).filter((u: User) => u.id !== currentUser?.id);
        setMembers(otherMembers);
        if (otherMembers.length > 0) {
          setOpponentId(otherMembers[0].id);
        }
      })
      .catch(err => console.error("Failed to load members for duel", err));
  }, [squadId]);

  const handleSubmit = async () => {
    if (!opponentId) return;
    setLoading(true);
    try {
      await createDuel({ opponentId, problemId, squadId, timeLimit });
      router.push(`/squad/${squadId}/duels`);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to send duel challenge.');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Initiate Duel</h2>
            <p className="text-sm text-gray-400 mt-1">{problemTitle}</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.label}>Select Opponent</label>
            <select 
              className={styles.select} 
              value={opponentId} 
              onChange={e => setOpponentId(e.target.value)}
            >
              {members.length === 0 ? (
                <option value="">No opponents available</option>
              ) : (
                members.map(m => (
                  <option key={m.id} value={m.id}>{m.username}</option>
                ))
              )}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Time Limit (Minutes)</label>
            <input 
              type="number" 
              className={styles.input} 
              value={timeLimit} 
              onChange={e => setTimeLimit(Number(e.target.value))}
              min="5" max="300"
            />
          </div>

          <button 
            className={styles.submitBtn} 
            onClick={handleSubmit}
            disabled={loading || !opponentId}
          >
            {loading ? 'Sending Ravens...' : 'Throw Gauntlet'}
          </button>
        </div>
      </div>
    </div>
  );
}
