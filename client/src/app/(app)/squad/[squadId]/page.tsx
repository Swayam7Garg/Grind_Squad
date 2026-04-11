'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { getSquadProblems, getSquad, markSolved, setAuthToken, deleteSquad, getMe } from '@/lib/api';
import type { Squad, ProblemFeedItem, User } from '@/lib/types';
import ShareMissionModal from './ShareMissionModal';
import ManageMembersModal from './ManageMembersModal';
import DuelModal from '@/components/DuelModal';
import { fireToast } from '@/components/Toast';
import toast from 'react-hot-toast';
import { Code, TerminalSquare, AlertTriangle, Trash2, Swords } from 'lucide-react';

export default function SquadFeedPage() {
  const params = useParams();
  const router = useRouter();
  const squadId = params.squadId as string;
  const { getToken } = useAuth();

  const [squad, setSquad] = useState<Squad | null>(null);
  const [problems, setProblems] = useState<ProblemFeedItem[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [duelProblem, setDuelProblem] = useState<{ id: string, title: string } | null>(null);
  const [activeTab, setActiveTab] = useState('FEED');
  const [solving, setSolving] = useState<string | null>(null);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (token) setAuthToken(token);

      const [squadRes, problemsRes, meRes] = await Promise.all([
        getSquad(squadId),
        getSquadProblems(squadId, {}),
        getMe(),
      ]);
      setSquad(squadRes.data?.data);
      setProblems(problemsRes.data?.data ?? []);
      setMe(meRes.data?.data);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  }, [squadId, getToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const myRole = squad?.members?.find(m => m.userId === me?.id)?.role;
  const isOwner = myRole === 'OWNER';
  const isAdmin = myRole === 'ADMIN' || isOwner;

  async function handleDeleteSquad() {
    if (!window.confirm(`ARE YOU SURE? THIS WILL PERMANENTLY DECOMMISSION SQUAD [${squad?.name}]. THIS ACTION IS IRREVERSIBLE.`)) return;
    try {
      await deleteSquad(squadId);
      toast.success('Squad decommissioned.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete squad.');
    }
  }

  async function handleSolve(problem: ProblemFeedItem) {
    if (problem.isSolvedByMe || solving === problem.id) return;
    setSolving(problem.id);
    try {
      const res = await markSolved(squadId, problem.id, { timeTaken: Math.floor(Math.random() * 200) + 120 });
      const result = res.data?.data;
      fireToast({
        pointsEarned: result?.pointsEarned ?? 20,
        newStreak: result?.newStreak ?? 1,
        problem: problem.title,
        isFirstSolve: false,
      });
      await loadData();
    } catch {}
    setSolving(null);
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'HARD': return 'var(--tertiary)';
      case 'MEDIUM': return 'var(--secondary)';
      case 'EASY': return 'var(--neon)';
      default: return 'var(--on-surface)';
    }
  };

  const getDiffBgColor = (diff: string) => {
    switch (diff) {
      case 'HARD': return 'rgba(255,114,87,0.1)';
      case 'MEDIUM': return 'rgba(254,183,0,0.1)';
      case 'EASY': return 'rgba(0,255,156,0.1)';
      default: return 'var(--surface-container-high)';
    }
  };

  // derived intel stats
  const activeGrinders = Array.from(new Set(problems.flatMap(p => p.solvedBy))).slice(0, 5);
  const openBounties = problems.filter(p => !p.isSolvedByMe).slice(0, 4);

  return (
    <div className={styles.page}>
      
      {/* ── HEADER OVERHAUL ── */}
      <header style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
         <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-lg)', background: 'var(--surface-container)', border: '1px solid var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontFamily: 'var(--font-headline)', color: 'var(--neon)', boxShadow: 'var(--neon-glow)' }}>
               {squad?.name.slice(0, 2).toUpperCase() || 'GS'}
            </div>
            <div>
               <h1 style={{ fontSize: '2.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, lineHeight: 1 }}>{squad?.name || 'SQUAD HQ'}</h1>
               <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: '0.5rem', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <div style={{ width: 6, height: 6, background: 'var(--neon)', borderRadius: '50%' }} /> UNIT STRENGTH: {squad?._count?.members || 1} / {squad?.memberLimit || 20}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <div style={{ width: 6, height: 6, background: 'var(--secondary)', borderRadius: '50%' }} /> PROBLEMS SHARED: {squad?._count?.problems || 0}
                  </span>
               </div>
            </div>
         </div>
         
         <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {isOwner && (
              <button className="btn-secondary" style={{ padding: '0.6rem', color: 'var(--tertiary)', borderColor: 'rgba(255,114,87,0.3)' }} onClick={handleDeleteSquad} title="DECOMMISSION SQUAD">
                <Trash2 size={18} />
              </button>
            )}
            <button className="btn-secondary" style={{ padding: '0.6rem 1rem' }} onClick={() => {
                if (squad?.inviteCode) { navigator.clipboard.writeText(squad.inviteCode); toast.success('Invite Copied!'); }
            }}>
              COPY INVITE
            </button>
            <button className="btn-primary" style={{ padding: '0.6rem 1.5rem', letterSpacing: '0.05em' }} onClick={() => setShareOpen(true)}>
               INITIATE TRANSMISSION
            </button>
         </div>
      </header>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', borderBottom: '1px solid var(--outline-variant)', marginBottom: 'var(--space-6)' }}>
         {['FEED', 'ACTIVE STANDING', 'UNIT ROSTER', 'INTEL'].map(tab => (
           <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent', border: 'none', color: activeTab === tab ? 'var(--neon)' : 'var(--on-surface-variant)',
                fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', paddingBottom: '0.5rem',
                borderBottom: activeTab === tab ? '2px solid var(--neon)' : '2px solid transparent', cursor: 'pointer', transition: 'var(--transition)'
              }}
           >
             {tab}
           </button>
         ))}
      </div>

      {activeTab === 'FEED' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-8)' }}>
        
        {/* ── LEFT PANE: SQUAD FEED ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
           {loading ? <div className="skeleton" style={{ height: 120, width: '100%', borderRadius: 8 }} /> : problems.length === 0 ? (
             <div style={{ padding: 'var(--space-8)', textAlign: 'center', background: 'var(--surface-container)', border: '1px dashed var(--outline-variant)', borderRadius: 'var(--radius-lg)', color: 'var(--on-surface-variant)' }}>
                No active missions.
             </div>
           ) : problems.map(p => (
             <div key={p.id} style={{
                background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', position: 'relative', overflow: 'hidden'
             }}>
                {p.isSolvedByMe && (
                   <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: 'var(--neon)' }} />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                   <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span className="tagPill" style={{ color: getDifficultyColor(p.difficulty), borderColor: getDifficultyColor(p.difficulty), background: getDiffBgColor(p.difficulty) }}>
                         <div style={{ width: 6, height: 6, borderRadius: '50%', background: getDifficultyColor(p.difficulty) }} />
                         {p.difficulty}
                      </span>
                      {p.tags.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
                   </div>
                   <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--on-surface-variant)' }}>
                      {new Date(p.squadProblem.sharedAt).toLocaleDateString()}
                   </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div>
                     <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.25rem', fontFamily: 'var(--font-headline)', fontWeight: 700, color: 'var(--on-surface)', textDecoration: 'none' }}>{p.title}</a>
                     {p.squadProblem.note && (
                       <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem', marginTop: '0.2rem', fontStyle: 'italic' }}>
                          " {p.squadProblem.note} "
                       </div>
                     )}
                   </div>
                   
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setDuelProblem({ id: p.id, title: p.title })}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
                    >
                      CHALLENGE
                    </button>
                    {!p.isSolvedByMe ? (
                        <button 
                          onClick={() => handleSolve(p)} 
                          disabled={solving === p.id}
                          className="btn-primary" 
                          style={{ padding: '0.4rem 1rem', fontSize: '0.7rem' }}
                        >
                           {solving === p.id ? 'VERIFYING...' : 'SOLVE CHALLENGE'}
                        </button>
                     ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--neon)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                           <span className="material-symbols-rounded" style={{ fontSize: 16 }}>task_alt</span>
                           MISSION ACCOMPLISHED
                        </div>
                     )}
                   </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--outline-variant)', paddingTop: '0.5rem' }}>
                   <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                      TRANSMITTED BY <span style={{ color: 'var(--on-surface)', fontWeight: 600 }}>{p.squadProblem.sharedBy.username}</span>
                   </div>
                   {p.solvedBy.length > 0 && (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                        <div style={{ display: 'flex', marginLeft: '0.5rem' }}>
                           {p.solvedBy.slice(0, 3).map((u, i) => (
                              <div key={u.id} style={{ width: 18, height: 18, background: 'var(--surface-bright)', border: '1px solid var(--outline-variant)', borderRadius: '50%', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', marginLeft: i > 0 ? -6 : 0, zIndex: 10 - i }}>
                                 {u.username.slice(0, 2).toUpperCase()}
                              </div>
                           ))}
                        </div>
                        {p.solvedBy.length} SOLVED
                     </div>
                   )}
                </div>
             </div>
           ))}
        </div>

        {/* ── RIGHT PANE: INCIDENT REPORT ── */}
        <div>
           {/* Active Grinders */}
           <div style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>ACTIVE GRINDERS (24H)</h3>
              {activeGrinders.length === 0 ? (
                 <div style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>No active signals.</div>
              ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {activeGrinders.map((g, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                         <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--on-surface)' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon)', boxShadow: '0 0 4px var(--neon)' }} />
                            {g.username}
                         </span>
                         <span style={{ color: 'var(--neon)', fontFamily: 'monospace' }}>ACTIVE</span>
                      </div>
                    ))}
                 </div>
              )}
           </div>

           {/* Open Bounties */}
           <div style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--tertiary)', borderBottom: '1px solid rgba(255,114,87,0.3)', paddingBottom: '0.5rem', marginBottom: '0.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                 <AlertTriangle size={14} /> OPEN BOUNTIES
              </h3>
              {openBounties.length === 0 ? (
                 <div style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>All targets eliminated.</div>
              ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {openBounties.map((p, idx) => (
                      <div key={idx} style={{ padding: '0.4rem', background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-sm)' }}>
                         <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.2rem' }}>{p.title}</div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: getDifficultyColor(p.difficulty), fontFamily: 'monospace' }}>{p.difficulty} TARGET</span>
                            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.6rem', color: 'var(--neon)', textDecoration: 'none' }}>ENGAGE &gt;</a>
                         </div>
                      </div>
                    ))}
                 </div>
              )}
           </div>
           
           {/* 1v1 Arena shortcut */}
           <Link href={`/squad/${squadId}/duels`} style={{ 
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem', 
              background: 'linear-gradient(135deg, rgba(254,183,0,0.1) 0%, rgba(254,183,0,0.02) 100%)',
              border: '1px solid rgba(254,183,0,0.3)', borderRadius: 'var(--radius-lg)',
              textDecoration: 'none', transition: 'var(--transition)', marginTop: 'var(--space-5)'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--secondary)'; e.currentTarget.style.background = 'rgba(254,183,0,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(254,183,0,0.3)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(254,183,0,0.1) 0%, rgba(254,183,0,0.02) 100%)'; }}
           >
              <Swords size={20} color="var(--secondary)" />
              <div>
                 <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--secondary)', letterSpacing: '0.05em' }}>ENTER 1v1 ARENA</div>
                 <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>Settle scores in code combat</div>
              </div>
           </Link>
        </div>
      </div>
      )}

      {activeTab === 'UNIT ROSTER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {isAdmin && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
               <button 
                className="btn-primary" 
                style={{ background: 'var(--secondary)', color: 'var(--on-secondary)', padding: '0.6rem 1.25rem' }}
                onClick={() => setManageMembersOpen(true)}
               >
                 <Trash2 size={16} style={{ marginRight: '0.5rem', display: 'none' }} />
                 MANAGE SQUAD ROSTER
               </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
             {squad?.members?.map(m => (
               <div key={m.id} style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '1px solid var(--outline-variant)' }}>
                    {m.user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--on-surface)' }}>{m.user.username}</div>
                    <div style={{ fontSize: '0.65rem', color: m.role === 'OWNER' ? 'var(--tertiary)' : 'var(--on-surface-variant)', fontWeight: 700, textTransform: 'uppercase' }}>{m.role}</div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab !== 'FEED' && activeTab !== 'UNIT ROSTER' && (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--on-surface-variant)', background: 'var(--surface-container)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--outline-variant)' }}>
           Module [{activeTab}] currently offline. Deploying in next major update.
        </div>
      )}

      {shareOpen && (
        <ShareMissionModal
          squadId={squadId}
          onClose={() => setShareOpen(false)}
          onSuccess={loadData}
        />
      )}

      {duelProblem && (
        <DuelModal
          squadId={squadId}
          problemId={duelProblem.id}
          problemTitle={duelProblem.title}
          onClose={() => setDuelProblem(null)}
        />
      )}

      {manageMembersOpen && (
        <ManageMembersModal
          squadId={squadId}
          members={squad?.members || []}
          onClose={() => setManageMembersOpen(false)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
