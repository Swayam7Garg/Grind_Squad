'use client';
import { useEffect, useState, useCallback } from 'react';
import styles from './Toast.module.css';

export interface ToastData {
  id: string;
  pointsEarned: number;
  newStreak: number;
  problem: string;
  isFirstSolve: boolean;
}

interface ToastProps { toast: ToastData; onDismiss: (id: string) => void; }

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className={styles.toast}>
      <div className={styles.toastGlow} />
      <div className={styles.toastIcon}>
        {toast.isFirstSolve ? '🏆' : '⚡'}
      </div>
      <div className={styles.toastBody}>
        <div className={styles.toastTitle}>
          {toast.isFirstSolve ? 'FIRST SOLVE BONUS!' : 'PROBLEM SOLVED'}
        </div>
        <div className={styles.toastProblem}>{toast.problem}</div>
        <div className={styles.toastMeta}>
          <span className={styles.points}>+{toast.pointsEarned} pts</span>
          <span className={styles.streak}>
            <span className="material-symbols-rounded" style={{ fontSize: 13 }}>local_fire_department</span>
            {toast.newStreak} day streak
          </span>
        </div>
        {toast.newStreak >= 7 && (
          <div className={styles.multiplier}>
            {toast.newStreak >= 14 ? '2.0×' : toast.newStreak >= 7 ? '1.5×' : '1.2×'} streak multiplier active
          </div>
        )}
      </div>
      <button className={styles.dismiss} onClick={() => onDismiss(toast.id)}>
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span>
      </button>
    </div>
  );
}

// Toast container + hook
let _addToast: ((t: ToastData) => void) | null = null;
export function fireToast(t: Omit<ToastData, 'id'>) {
  _addToast?.({ ...t, id: Math.random().toString(36).slice(2) });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const add = useCallback((t: ToastData) => setToasts(prev => [...prev, t]), []);
  const remove = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  useEffect(() => { _addToast = add; return () => { _addToast = null; }; }, [add]);

  return (
    <div className={styles.container}>
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={remove} />)}
    </div>
  );
}
