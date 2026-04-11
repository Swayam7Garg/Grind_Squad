'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import styles from './page.module.css';
import { getMe, setAuthToken } from '@/lib/api';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { User, UserSolve, Problem } from '@/lib/types';
import { Code, TerminalSquare } from 'lucide-react';

type Transmission = UserSolve & { problem: Problem };

export default function ProfilePage() {
  const { getToken } = useAuth();
  const [me, setMe] = useState<User | null>(null);
  const [heatmap, setHeatmap] = useState<{ date: string, count: number }[]>([]);
  const [radar, setRadar] = useState<{ subject: string, fullMark: number }[]>([]);
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then(token => {
      if (token) setAuthToken(token);
      return getMe();
    })
    .then(r => {
      setMe(r.data?.data);
      setHeatmap(r.data?.heatmapData ?? []);
      setRadar(r.data?.radarData ?? []);
      setTransmissions(r.data?.recentTransmissions ?? []);
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8 text-gray-500">Booting Analytics HUD...</div>;

  // Custom Heatmap Builder
  const days = Array.from({ length: 180 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (179 - i));
    const k = d.toISOString().split('T')[0];
    const data = heatmap.find(h => h.date === k);
    return { date: k, count: data ? data.count : 0 };
  });

  const getHeatLevel = (c: number) => {
    if (c === 0) return '';
    if (c < 3) return styles.heatLvl1;
    if (c < 5) return styles.heatLvl2;
    if (c < 8) return styles.heatLvl3;
    return styles.heatLvl4;
  };

  return (
    <div className={styles.page}>
      
      {/* ── HEADER ── */}
      <div className={styles.headerBlock}>
        <div className={styles.avatarWrapper}>
          <img src={me?.avatarUrl || ''} className={styles.avatar} alt="avatar" />
          <div className={styles.rankBadge}>RANK #{me?.totalPoints ? Math.max(1, 15000 - me.totalPoints) : '?'}</div>
        </div>
        
        <div className={styles.userInfo}>
          <h1 className={styles.username}>{me?.username}</h1>
          <div className={styles.titleRow}>
            <span className={styles.titleText}>Tactical Specialist</span>
          </div>
          <div className={styles.bioquote}>
            "{me?.bio || "Grinding for FAANG. DP enthusiast. Optimal or bust."}"
          </div>
          <div className={styles.badges}>
            <span className={styles.statBadge}>LEVEL {Math.floor((me?.totalPoints || 0) / 100) + 1}</span>
            <span className={`${styles.statBadge} ${styles.elite}`}>ELITE CONTRIBUTOR</span>
          </div>
        </div>

        <div className={styles.statMatrix}>
          <div className={styles.statBox}>
            <span className="label-sm">Global Score</span>
            <span className={`${styles.statValue} ${styles.neon}`}>{(me?.totalPoints || 0).toLocaleString()}</span>
          </div>
          <div className={styles.statBox}>
            <span className="label-sm">Solved</span>
            <span className={styles.statValue}>{me?._count?.solves || 0}</span>
          </div>
          <div className={styles.statBox}>
            <span className="label-sm">Active Streak</span>
            <span className={`${styles.statValue} ${styles.orange}`}>{me?.streak || 0}d</span>
          </div>
          <div className={styles.statBox}>
            <span className="label-sm">Max Streak</span>
            <span className={styles.statValue}>{me?.maxStreak || 0}d</span>
          </div>
        </div>
      </div>

      {/* ── GRIDS ── */}
      <div className={styles.tacticalGrid}>
        
        {/* Heatmap */}
        <div className={styles.heatmapContainer}>
          <div className={styles.sectionHeader}>
            <span>CONTRIBUTION HEATMAP</span>
            <span style={{ color: 'var(--on-surface-variant)'}}>6 MONTH WINDOW</span>
          </div>
          <div className={styles.heatmapGrid}>
             {days.map((d, i) => (
                <div key={i} title={`${d.date}: ${d.count} solves`} className={`${styles.heatCell} ${getHeatLevel(d.count)}`} />
             ))}
          </div>
          <div className={styles.monthsLabel}>
            <span>JUN</span>
            <span>JUL</span>
            <span>AUG</span>
            <span>SEP</span>
            <span>OCT</span>
            <span>NOV</span>
          </div>
        </div>

        {/* Radar Chart */}
        <div className={styles.radarContainer}>
          <div className={styles.sectionHeader}>
            <span>TECHNICAL RADAR</span>
          </div>
          <div style={{ flex: 1, width: '100%', minHeight: 220 }}>
            {radar.length === 0 ? (
               <div style={{color: 'var(--on-surface-variant)', fontSize: '0.8rem', textAlign: 'center', marginTop: '4rem'}}>Scanning masteries...</div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radar}>
                    <PolarGrid stroke="rgba(72, 72, 73, 0.4)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--on-surface-variant)', fontSize: 9, letterSpacing: '0.05em' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar dataKey="fullMark" stroke="var(--neon)" strokeWidth={2} fill="rgba(0, 255, 156, 0.1)" fillOpacity={0.8} />
                  </RadarChart>
                </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className={styles.bottomGrid}>
        {/* Transmissions Layer */}
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{width: 4, height: 16, background: 'var(--neon)'}} />
              <h3 style={{ fontSize: '1rem', letterSpacing: '0.05em' }}>TRANSMISSION LOG</h3>
           </div>
           
           <div className={styles.transmissionList}>
              {transmissions.length === 0 ? (
                <div className="text-gray-500 text-sm">No recent activity detected.</div>
              ) : (
                transmissions.map(t => (
                  <div key={t.id} className={styles.transmissionItem}>
                    <div className={styles.transLeft}>
                      <div className={`${styles.transIcon} ${t.problem.difficulty === 'EASY' ? styles.code : ''}`}>
                         {t.problem.difficulty === 'EASY' ? <Code size={18}/> : <TerminalSquare size={18}/>}
                      </div>
                      <div>
                        <div className={styles.transTitle}>{t.problem.title}</div>
                        <div className={styles.transMeta}>
                          SOLVED {Math.max(1, Math.floor((Date.now() - new Date(t.solvedAt).getTime()) / 3600000))} HOURS AGO 
                          {t.timeTaken ? ` • RUNTIME: ${t.timeTaken}MS` : ''}
                        </div>
                      </div>
                    </div>
                    <div className={`${styles.transDiff} ${styles[t.problem.difficulty]}`}>
                      {t.problem.difficulty}
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>

        {/* Tactical Gear */}
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{width: 4, height: 16, background: 'var(--secondary)'}} />
              <h3 style={{ fontSize: '1rem', letterSpacing: '0.05em' }}>TACTICAL GEAR</h3>
           </div>

           <div className={styles.gearGrid}>
              <div className={`${styles.gearBox} ${styles.active}`}>
                <svg className={styles.gearIcon} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span className={styles.gearLabel}>DP KING</span>
              </div>
              <div className={styles.gearBox}>
                 <svg className={styles.gearIcon} viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                 <span className={styles.gearLabel}>GRAPH GOD</span>
              </div>
              <div className={`${styles.gearBox} ${styles.active}`}>
                 <svg className={styles.gearIcon} viewBox="0 0 24 24"><path d="M13.13 2.13l3.54 3.54c.39.39.39 1.02 0 1.41l-2.12 2.12c-.39.39-1.02.39-1.41 0l-1.41-1.41-5.66 5.66c-.39.39-.39 1.02 0 1.41l1.41 1.41c.39.39 1.02.39 1.41 0l2.12-2.12c.39-.39 1.02-.39 1.41 0l3.54 3.54c.39.39.39 1.02 0 1.41L12 21.87c-.39.39-1.02.39-1.41 0l-5.66-5.66c-.78-.78-1.17-1.8-1.17-2.83V5.83c0-1.1.9-2 2-2h7.54c1.03 0 2.05.39 2.83 1.17v-2zm-1.41 4.24l1.41 1.41-2.12 2.12-1.41-1.41 2.12-2.12z"/></svg>
                 <span className={styles.gearLabel}>TOP 1%</span>
              </div>
           </div>

           <div style={{ marginTop: '1.5rem', background: 'rgba(0,255,156,0.03)', border: '1px solid rgba(0,255,156,0.15)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 600, color: 'var(--neon)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                 <span>NEXT RANK PROGRESSION</span>
                 <span>8,400 / 10,000 XP</span>
              </div>
              <div className="progress-segments">
                 {Array.from({length: 10}).map((_, i) => <div key={i} className={`progress-segment ${i < 6 ? 'filled' : ''}`} style={{height: 8}}></div>)}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
