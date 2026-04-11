'use client';
import { useEffect, useState, useCallback } from 'react';
import styles from './page.module.css';
import { listProblems, searchUsers, setAuthToken } from '@/lib/api';
import type { Problem } from '@/lib/types';
import { DIFFICULTY_COLORS, PLATFORM_LABELS } from '@/lib/tags';
import { useAuth } from '@clerk/nextjs';
import { Search, Users, Database } from 'lucide-react';

const DIFFICULTIES = ['', 'EASY', 'MEDIUM', 'HARD'];
const PLATFORMS = ['', 'LEETCODE', 'GFG', 'CODEFORCES'];

interface FoundUser { id: string; username: string; avatarUrl?: string; }

export default function ExplorePage() {
  const { getToken } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<'PROBLEMS' | 'USERS'>('PROBLEMS');

  // Problems state
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [difficulty, setDifficulty] = useState('');
  const [platform, setPlatform] = useState('');

  // Shared search
  const [search, setSearch] = useState('');

  // Users state
  const [users, setUsers] = useState<FoundUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ── Load problems ───────────────────────────────────────
  const loadProblems = useCallback(() => {
    if (activeTab !== 'PROBLEMS') return;
    setLoadingProblems(true);
    getToken()
      .then(token => {
        if (token) setAuthToken(token);
        return listProblems({ search: search || undefined, difficulty: difficulty || undefined, platform: platform || undefined });
      })
      .then(r => setProblems(r.data?.data ?? []))
      .catch(err => console.error('Failed to load problems:', err))
      .finally(() => setLoadingProblems(false));
  }, [activeTab, search, difficulty, platform, getToken]);

  useEffect(() => { loadProblems(); }, [loadProblems]);

  // ── Search users ────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'USERS') return;
    if (!search || search.length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const token = await getToken();
        if (token) setAuthToken(token);
        const res = await searchUsers(search);
        setUsers(res.data?.data ?? []);
      } catch (err) {
        console.error('Failed to search users:', err);
      }
      setLoadingUsers(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [activeTab, search, getToken]);

  // ── Tab switch reset ────────────────────────────────────
  function switchTab(tab: 'PROBLEMS' | 'USERS') {
    setActiveTab(tab);
    setSearch('');
    setUsers([]);
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className="label-sm">INTEL DATABASE</div>
          <h1 className={styles.title}>EXPLORE MISSIONS</h1>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginTop: '0.3rem' }}>
          Search the problem library or find operatives by username.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)', padding: '0 2rem', gap: '1.5rem' }}>
        {([
          { id: 'PROBLEMS', label: 'PROBLEMS', Icon: Database },
          { id: 'USERS', label: 'OPERATIVES', Icon: Users },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            style={{
              background: 'transparent', border: 'none',
              color: activeTab === id ? 'var(--neon)' : 'var(--on-surface-variant)',
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
              paddingBottom: '0.75rem', borderBottom: activeTab === id ? '2px solid var(--neon)' : '2px solid transparent',
              cursor: 'pointer', transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} color="var(--on-surface-variant)" />
          <input
            className={styles.search}
            placeholder={activeTab === 'PROBLEMS' ? 'Search problems...' : 'Search operatives by username...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {activeTab === 'PROBLEMS' && (
          <>
            <select className={styles.filter} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="">All Difficulties</option>
              {DIFFICULTIES.slice(1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className={styles.filter} value={platform} onChange={e => setPlatform(e.target.value)}>
              <option value="">All Platforms</option>
              {PLATFORMS.slice(1).map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Content: Problems */}
      {activeTab === 'PROBLEMS' && (
        <div className={styles.grid}>
          {loadingProblems
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 100, borderRadius: 6 }} />
              ))
            : problems.length === 0
            ? <div className={styles.empty}>No problems found. Share one from a squad!</div>
            : problems.map(p => (
                <div key={p.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={DIFFICULTY_COLORS[p.difficulty]}>{p.difficulty}</span>
                    <span className="tag">{PLATFORM_LABELS[p.platform]}</span>
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className={styles.cardTitle}>
                    {p.title}
                  </a>
                  <div className={styles.tags}>
                    {p.tags.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Content: Users */}
      {activeTab === 'USERS' && (
        <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {search.length < 2 ? (
            <div className={styles.empty} style={{ paddingTop: '3rem' }}>
              <Users size={40} style={{ opacity: 0.3, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
              <div>Type at least 2 characters to search operatives.</div>
            </div>
          ) : loadingUsers ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />
            ))
          ) : users.length === 0 ? (
            <div className={styles.empty}>No operatives found matching &quot;{search}&quot;</div>
          ) : (
            users.map(u => (
              <div
                key={u.id}
                style={{
                  background: 'var(--surface-container)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.9rem 1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'var(--transition)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--neon)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--surface-container-highest)',
                  border: '2px solid var(--outline-variant)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1rem', color: 'var(--neon)',
                  fontFamily: 'var(--font-headline)',
                }}>
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: '0.95rem' }}>
                    {u.username}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    OPERATIVE ID: {u.id.slice(0, 12)}...
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
