'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { setAuthToken, syncUser, createSquad } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from './page.module.css';

export default function CreateSquadPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Squad name is required');

    setLoading(true);
    try {
      // Always get a fresh token and ensure user is synced before any API call
      const token = await getToken();
      if (!token) {
        toast.error('Not authenticated. Please refresh and try again.');
        return;
      }
      setAuthToken(token);

      // Ensure user exists in our DB (safe upsert — no-op if already synced)
      if (user) {
        await syncUser({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? '',
          username: user.username ?? user.firstName ?? user.id.slice(0, 8),
          avatarUrl: user.imageUrl ?? undefined,
        }).catch(() => {}); // non-fatal
      }

      const res = await createSquad({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
      });
      const newSquad = res.data?.data;
      toast.success(`Squad "${name}" created successfully!`);
      if (newSquad?.id) {
        router.push(`/squad/${newSquad.id}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;
      if (status === 401) {
        toast.error('Session expired. Please refresh the page and try again.');
      } else if (status === 409) {
        toast.error(msg || 'A squad with this name already exists.');
      } else if (status >= 500) {
        toast.error('Server error. Make sure the backend is running.');
      } else {
        toast.error(msg || 'Failed to create squad. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        {/* Left decoration */}
        <div className={styles.decoration}>
          <div className={styles.decorGrid} />
          <div className={styles.decorGlow} />
          <div className={styles.decorContent}>
            <div className={styles.decorBadge}>NEW NETWORK</div>
            <h2 className={styles.decorTitle}>Build your<br />tactical crew</h2>
            <p className={styles.decorText}>Create a private squad or open arena. Share problems, race each other, and track who&apos;s slacking.</p>
            <div className={styles.decorStats}>
              <div className={styles.decorStat}>
                <span className={styles.decorStatNum}>∞</span>
                <span className={styles.decorStatLabel}>Problems</span>
              </div>
              <div className={styles.decorStat}>
                <span className={styles.decorStatNum}>Live</span>
                <span className={styles.decorStatLabel}>Leaderboard</span>
              </div>
              <div className={styles.decorStat}>
                <span className={styles.decorStatNum}>1v1</span>
                <span className={styles.decorStatLabel}>Duels</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className={styles.formSide}>
          <Link href="/dashboard" className={styles.backLink}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
            Back to Terminal
          </Link>

          <div className={styles.formCard}>
            <div className={styles.topAccent} />
            <div className={styles.formHeader}>
              <span className={styles.formIcon}>⚡</span>
              <h1 className={styles.formTitle}>Establish Squad</h1>
              <p className={styles.formSubtitle}>Set up your tactical network in seconds.</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Squad Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  placeholder="e.g. AlgoBeasts, LeetCoders"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  maxLength={40}
                  autoFocus
                  suppressHydrationWarning
                />
                <span className={styles.charCount}>{name.length}/40</span>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Description <span className={styles.optional}>(optional)</span>
                </label>
                <textarea
                  className={styles.textarea}
                  placeholder="What's your squad's mission? Describe your focus area..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  maxLength={200}
                  rows={3}
                />
                <span className={styles.charCount}>{description.length}/200</span>
              </div>

              <label className={`${styles.toggle} ${isPublic ? styles.toggleOn : ''}`}>
                <div className={styles.toggleLeft}>
                  <span className={styles.toggleIcon}>{isPublic ? '🌐' : '🔒'}</span>
                  <div>
                    <div className={styles.toggleTitle}>{isPublic ? 'Public Arena' : 'Private Network'}</div>
                    <div className={styles.toggleDesc}>
                      {isPublic
                        ? 'Anyone can discover and join this squad.'
                        : 'Only engineers with your invite code can enter.'}
                    </div>
                  </div>
                </div>
                <div className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    disabled={loading}
                  />
                  <span className={styles.slider} />
                </div>
              </label>

              <button
                type="submit"
                className={`btn-primary ${styles.submitBtn}`}
                disabled={loading || !name.trim()}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    Initializing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded" style={{ fontSize: 16 }}>rocket_launch</span>
                    Create Squad
                  </>
                )}
              </button>

              <p className={styles.hint}>
                After creating, you&apos;ll get an <strong>8-character invite code</strong> to share with teammates.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
