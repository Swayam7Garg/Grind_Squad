'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { setAuthToken, syncUser, joinSquad } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from './page.module.css';

const CODE_LENGTH = 8;

export default function JoinSquadPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const fullCode = code.join('');
  const isValid = fullCode.length === CODE_LENGTH && !/\s/.test(fullCode);

  const handleChange = (i: number, val: string) => {
    const char = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = [...code];
    next[i] = char;
    setCode(next);
    if (char && i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    const next = [...Array(CODE_LENGTH).fill('')];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setCode(next);
    inputs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return toast.error('Enter the full 8-character code');

    setLoading(true);
    try {
      // Always get a fresh token and ensure user is synced before any API call
      const token = await getToken();
      if (!token) {
        toast.error('Not authenticated. Please refresh and try again.');
        return;
      }
      setAuthToken(token);

      // Ensure user exists in our DB
      if (user) {
        await syncUser({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? '',
          username: user.username ?? user.firstName ?? user.id.slice(0, 8),
          avatarUrl: user.imageUrl ?? undefined,
        }).catch(() => {}); // non-fatal
      }

      const res = await joinSquad(fullCode);
      const squad = res.data?.data;
      toast.success(`Joined ${squad?.name ?? 'squad'}! Welcome to the network.`);
      if (squad?.id) {
        router.push(`/squad/${squad.id}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;
      if (status === 401) {
        toast.error('Session expired. Please refresh the page.');
      } else if (status === 404) {
        toast.error('Invalid invite code. Double-check with your squad commander.');
      } else if (status === 409) {
        toast.error('You are already a member of this squad!');
      } else {
        toast.error(msg || 'Failed to join squad. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.glow} />
        <div className={styles.topLine} />

        <div className={styles.iconWrap}>
          <span className={styles.icon}>🔑</span>
        </div>

        <h1 className={styles.title}>Enter Squad Code</h1>
        <p className={styles.subtitle}>
          Paste or type the 8-character invite code given to you by the squad owner.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.codeGrid} onPaste={handlePaste}>
            {code.map((ch, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                className={`${styles.codeBox} ${ch ? styles.codeBoxFilled : ''}`}
                type="text"
                inputMode="text"
                value={ch}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                maxLength={1}
                disabled={loading}
                autoFocus={i === 0}
                suppressHydrationWarning
              />
            ))}
          </div>

          {fullCode.length > 0 && fullCode.length < CODE_LENGTH && (
            <p className={styles.progress}>{fullCode.length}/{CODE_LENGTH} characters entered</p>
          )}

          <button
            type="submit"
            className={`btn-primary ${styles.submitBtn}`}
            disabled={loading || !isValid}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Authenticating...
              </>
            ) : (
              <>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>verified_user</span>
                Enter Squad Terminal
              </>
            )}
          </button>
        </form>

        <div className={styles.divider} />

        <p className={styles.help}>
          Don&apos;t have a code?{' '}
          <Link href="/squads/new" className={styles.helpLink}>Create your own squad</Link>
        </p>

        <Link href="/dashboard" className={styles.backLink}>
          <span className="material-symbols-rounded" style={{ fontSize: 15 }}>arrow_back</span>
          Back to Terminal
        </Link>
      </div>
    </div>
  );
}
