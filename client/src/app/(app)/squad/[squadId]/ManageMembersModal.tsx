'use client';
import { useState, useEffect } from 'react';
import { searchUsers, addMember, removeMember } from '@/lib/api';
import type { SquadMember, User } from '@/lib/types';
import toast from 'react-hot-toast';
import { Search, UserPlus, UserMinus, X, Shield } from 'lucide-react';

interface ManageMembersModalProps {
  squadId: string;
  members: SquadMember[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function ManageMembersModal({ squadId, members, onClose, onUpdate }: ManageMembersModalProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await searchUsers(query);
        // filter out who is already a member
        const currentIds = new Set(members.map(m => m.userId));
        const filtered = (res.data?.data as User[]).filter(u => !currentIds.has(u.id));
        setSearchResults(filtered);
      } catch (err) {
        console.error(err);
      }
      setSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, members]);

  async function handleAdd(user: User) {
    try {
      await addMember(squadId, user.id);
      toast.success(`Recruited ${user.username} to the squad.`);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add member.');
    }
  }

  async function handleRemove(member: SquadMember) {
    if (!window.confirm(`Are you sure you want to remove ${member.user.username} from the squad?`)) return;
    try {
      await removeMember(squadId, member.userId);
      toast.success(`Member ${member.user.username} has been discharged.`);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member.');
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{ maxWidth: 600, width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>ROSTER MANAGEMENT</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recruit or discharge squad units</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ marginBottom: 'var(--space-6)' }}>
           <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} size={18} />
              <input 
                type="text" 
                placeholder="SEARCH OPERATIVES BY USERNAME..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', color: 'var(--on-surface)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem'
                }}
              />
           </div>

           {query.length >= 2 && (
             <div style={{ marginTop: 'var(--space-3)', maxHeight: 200, overflowY: 'auto', background: 'var(--surface-container-highest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)' }}>
                {searching ? (
                   <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>SCANNING DATABASE...</div>
                ) : searchResults.length === 0 ? (
                   <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>NO MATCHES FOUND</div>
                ) : searchResults.map(u => (
                   <div key={u.id} style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                         <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-bright)', border: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                            {u.username.slice(0, 2).toUpperCase()}
                         </div>
                         <span style={{ fontWeight: 600, color: 'var(--on-surface)', fontSize: '0.9rem' }}>{u.username}</span>
                      </div>
                      <button onClick={() => handleAdd(u)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         <UserPlus size={14} /> RECRUIT
                      </button>
                   </div>
                ))}
             </div>
           )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
           <h3 style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: 'var(--space-3)', textTransform: 'uppercase' }}>CURRENT SQUAD ROSTER ({members.length})</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {members.map(m => (
                 <div key={m.id} style={{ padding: '0.75rem', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                       <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '1px solid var(--outline-variant)', fontSize: '0.75rem' }}>
                          {m.user.username.slice(0, 2).toUpperCase()}
                       </div>
                       <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                             <span style={{ fontWeight: 600, color: 'var(--on-surface)', fontSize: '0.9rem' }}>{m.user.username}</span>
                             {m.role === 'OWNER' && <Shield size={12} color="var(--tertiary)" />}
                             {m.role === 'ADMIN' && <Shield size={12} color="var(--secondary)" />}
                          </div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{m.role}</div>
                       </div>
                    </div>
                    {m.role !== 'OWNER' && (
                       <button onClick={() => handleRemove(m)} style={{ background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: '0.4rem' }} title="DISCHARGE FROM SQUAD">
                          <UserMinus size={18} />
                       </button>
                    )}
                 </div>
              ))}
           </div>
        </div>

        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '0.6rem 1.5rem' }}>
             CLOSE OPERATIONS
          </button>
        </div>
      </div>
    </div>
  );
}
