'use client';
import { useState } from 'react';
import styles from './ShareProblemModal.module.css';
import { shareToSquad } from '@/lib/api';
import { VALID_TAGS } from '@/lib/tags';

interface Props {
  squadId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PLATFORMS = ['LEETCODE', 'GFG', 'CODEFORCES', 'OTHER'] as const;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

export default function ShareProblemModal({ squadId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    url: '', title: '', difficulty: 'MEDIUM', tags: [] as string[], note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag: string) =>
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : f.tags.length < 5 ? [...f.tags, tag] : f.tags,
    }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.url || !form.title) { setError('URL and title are required'); return; }
    setLoading(true); setError('');
    try {
      await shareToSquad(squadId, {
        url: form.url, title: form.title,
        difficulty: form.difficulty, tags: form.tags, note: form.note || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? msg);
    } finally { setLoading(false); }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalGlow} />

        <div className={styles.header}>
          <div>
            <div className="label-sm">Squad Feed</div>
            <h2 className={styles.title}>Share Mission</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className="label-sm">Problem URL *</label>
            <input
              className="input-field"
              type="url"
              placeholder="https://leetcode.com/problems/two-sum/"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              required
            />
          </div>

          <div className={styles.field}>
            <label className="label-sm">Title *</label>
            <input
              className="input-field"
              type="text"
              placeholder="Two Sum"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className="label-sm">Difficulty</label>
              <div className={styles.segmented}>
                {DIFFICULTIES.map(d => (
                  <button
                    key={d} type="button"
                    className={`${styles.segBtn} ${form.difficulty === d ? styles[`seg${d}`] : ''}`}
                    onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className="label-sm">Tags (max 5)</label>
            <div className={styles.tags}>
              {VALID_TAGS.map(tag => (
                <button
                  key={tag} type="button"
                  className={`${styles.tagBtn} ${form.tags.includes(tag) ? styles.tagActive : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className="label-sm">Note (optional)</label>
            <input
              className="input-field"
              type="text"
              placeholder='"sneaky edge case, think carefully"'
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sharing...' : (
                <><span className="material-symbols-rounded" style={{ fontSize: 16 }}>add_circle</span>Share to Squad</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
