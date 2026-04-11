'use client';
import { useState } from 'react';
import styles from './page.module.css';
import { shareToSquad } from '@/lib/api';

type Props = {
  squadId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ShareMissionModal({ squadId, onClose, onSuccess }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagInput.trim().toUpperCase();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !title) {
        setError('URL and Title are required to initialize transmission.');
        return;
    }
    setLoading(true);
    setError('');
    try {
      await shareToSquad(squadId, { url, title, difficulty, tags, note });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to dispatch mission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{width: 4, height: 16, background: 'var(--neon)'}} />
              <h2 style={{ fontSize: '1.2rem', letterSpacing: '0.05em', margin: 0 }}>SHARE MISSION</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.formGroup}>
            <label className="label-sm">TRANSMISSION URL</label>
            <input 
              type="url" 
              className="input-field" 
              placeholder="https://leetcode.com/problems/..." 
              value={url} 
              onChange={e => setUrl(e.target.value)} 
              autoFocus 
            />
          </div>

          <div className={styles.formGroup}>
            <label className="label-sm">MISSION PROTOCOL (TITLE)</label>
            <input 
               type="text" 
               className="input-field" 
               placeholder="Two Sum" 
               value={title} 
               onChange={e => setTitle(e.target.value)} 
            />
          </div>

          <div className={styles.formGroup}>
            <label className="label-sm">THREAT LEVEL</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
               {['EASY', 'MEDIUM', 'HARD'].map(diff => (
                 <button 
                   key={diff}
                   type="button"
                   onClick={() => setDifficulty(diff)}
                   className={`${styles.diffSelectBtn} ${difficulty === diff ? styles['diffActive' + diff] : ''}`}
                 >
                   {diff}
                 </button>
               ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className="label-sm">TACTICAL TAGS (PRESS ENTER TO ADD)</label>
            <input 
               type="text" 
               className="input-field" 
               placeholder="e.g. DP, GRAPHS" 
               value={tagInput} 
               onChange={e => setTagInput(e.target.value)}
               onKeyDown={handleAddTag} 
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
               {tags.map(t => (
                 <span key={t} className={styles.tagPill}>
                   {t}
                   <button type="button" onClick={() => handleRemoveTag(t)}>&times;</button>
                 </span>
               ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className="label-sm">COMMANDER'S BRIEF (OPTIONAL)</label>
            <textarea 
               className="input-field" 
               rows={2} 
               placeholder="Focus on O(1) space complexity." 
               value={note} 
               onChange={e => setNote(e.target.value)} 
            />
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
             <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'TRANSMITTING...' : 'DISPATCH MISSION'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
