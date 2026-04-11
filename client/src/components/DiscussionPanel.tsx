'use client';

import { useState, useEffect } from 'react';
import styles from './DiscussionPanel.module.css';
import { listDiscussions, createDiscussion, addReaction } from '@/lib/api';
import { Discussion } from '@/lib/types';

interface DiscussionPanelProps {
  squadId: string;
  problemId: string;
}

export default function DiscussionPanel({ squadId, problemId }: DiscussionPanelProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, [problemId]);

  const fetchDiscussions = async () => {
    try {
      const res = await listDiscussions(problemId, squadId);
      setDiscussions(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await createDiscussion({ content, problemId, squadId, isSpoiler });
      setContent('');
      setIsSpoiler(false);
      fetchDiscussions();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (discussionId: string, emoji: string) => {
    try {
      await addReaction(discussionId, emoji);
      fetchDiscussions(); // Refresh state to sync toggles
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-gray-500 text-sm mt-4">Loading intel...</div>;

  return (
    <div className={styles.panel}>
      <div className={styles.discussionHeader}>
        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>forum</span>
        Tactical Discussions
      </div>

      <div className={styles.list}>
        {discussions.length === 0 ? (
          <div className="text-gray-500 text-sm italic">No intel shared on this problem yet. Be the first to drop hints.</div>
        ) : (
          discussions.map(d => (
            <div key={d.id} className={styles.comment}>
              <div className={styles.avatar}>
                {d.user?.avatarUrl ? <img src={d.user.avatarUrl} alt="avatar" style={{width:'100%', height:'100%', borderRadius:'6px'}}/> : d.user.username.slice(0,2).toUpperCase()}
              </div>
              <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                  <span className={styles.author}>{d.user.username}</span>
                  <span className={styles.time}>{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
                <div className={`${styles.content} ${d.isSpoiler ? styles.spoiler : ''}`}>
                  {d.isSpoiler ? '⚠️ Hover to reveal spoiler:\n' + d.content : d.content}
                </div>
                <div className={styles.interactions}>
                  <button onClick={() => handleReaction(d.id, '🔥')} className={styles.reactionBtn}>
                    🔥 {d.reactions?.filter(r => r.emoji === '🔥').length || 0}
                  </button>
                  <button onClick={() => handleReaction(d.id, '💡')} className={styles.reactionBtn}>
                    💡 {d.reactions?.filter(r => r.emoji === '💡').length || 0}
                  </button>
                  <button onClick={() => handleReaction(d.id, '👀')} className={styles.reactionBtn}>
                    👀 {d.reactions?.filter(r => r.emoji === '👀').length || 0}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.compose}>
        <textarea
          className={styles.textarea}
          placeholder="Share your approach, time complexity, or hints..."
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <div className={styles.composeActions}>
          <label className={styles.spoilerToggle}>
            <input 
              type="checkbox" 
              checked={isSpoiler}
              onChange={e => setIsSpoiler(e.target.checked)} 
            />
            Contains Spoiler / Full Code
          </label>
          <button 
            className={styles.submitBtn} 
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
          >
            {submitting ? 'Transmitting...' : 'Post Intel'}
          </button>
        </div>
      </div>
    </div>
  );
}
