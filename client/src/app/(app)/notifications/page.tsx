'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { getNotifications, markNotificationsRead } from '@/lib/api';
import { Notification } from '@/lib/types';
import Link from 'next/link';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (!unreadIds.length) return;
    try {
      await markNotificationsRead(unreadIds);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'DUEL_INVITE': return <div className={`${styles.iconWrap} ${styles.iconDuel}`}>⚔️</div>;
      case 'DUEL_RESULT': return <div className={`${styles.iconWrap} ${styles.iconDuel}`}>🏆</div>;
      case 'PROBLEM_SHARED': return <div className={`${styles.iconWrap} ${styles.iconProblem}`}>🔥</div>;
      default: return <div className={`${styles.iconWrap} ${styles.iconSystem}`}>🔔</div>;
    }
  };

  const renderContent = (n: Notification) => {
    const p = n.payload as any;
    switch (n.type) {
      case 'DUEL_INVITE':
        return (
          <>
            <p className={styles.message}>
              <span className={styles.highlight}>{p.challengerUsername}</span> challenged you to a duel on <span className={styles.highlight}>{p.problemTitle}</span>.
            </p>
            <div className={styles.actions}>
              <Link href={`/dashboard`} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>View in Dashboard</Link>
            </div>
          </>
        );
      case 'DUEL_RESULT':
        return (
          <p className={styles.message}>
            You <span className={styles.highlight}>{p.result === 'WIN' ? 'won' : 'lost'}</span> the duel! 
            {p.points > 0 && ` Earned +${p.points} pts.`}
          </p>
        );
      case 'PROBLEM_SHARED':
        return (
          <>
            <p className={styles.message}>
              <span className={styles.highlight}>{p.authorUsername}</span> started a discussion or shared a problem.
            </p>
            {p.problemId && (
              <div className={styles.actions}>
                <Link href={`/explore`} className={styles.actionBtn}>View Problem</Link>
              </div>
            )}
          </>
        );
      default:
        return <p className={styles.message}>New notification received.</p>;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading radar...</div>;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Comm <span className={styles.titleGlow}>Radar</span></h1>
        <button 
          onClick={handleMarkAllRead} 
          className={styles.markReadBtn}
          disabled={unreadCount === 0}
        >
          <span className="material-symbols-rounded">done_all</span>
          Mark {unreadCount > 0 ? unreadCount : 'all'} as read
        </button>
      </div>

      <div className={styles.list}>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📡</div>
            <p>Radar is clear. No incoming signals.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`${styles.notification} ${!n.isRead ? styles.unread : ''}`}>
              {renderIcon(n.type)}
              <div className={styles.content}>
                <span className={styles.time}>{new Date(n.createdAt).toLocaleString()}</span>
                {renderContent(n)}
              </div>
              {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-green)', marginTop: 8 }} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
