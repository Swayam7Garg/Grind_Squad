import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import styles from './page.module.css';

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <main className={styles.main}>
      {/* ── Navbar ── */}
      <nav className={styles.nav}>
        <span className={styles.navLogo}>⚡ GrindSquad</span>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#leaderboard" className={styles.navLink}>Leaderboard</a>
        </div>
        <div className={styles.navRight}>
          {userId ? (
            <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <a href="/sign-in" className="btn-secondary">Sign In</a>
              <a href="/sign-up" className="btn-primary">⚡ Execute the Grind</a>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <span className={styles.heroBadge}>🔴 12,000+ engineers grinding</span>
          </div>
          <h1 className={styles.heroTitle}>
            DSA prep is better<br />
            <span className={styles.heroAccent}>with your squad</span>
          </h1>
          <p className={styles.heroSub}>
            Share problems, race your friends, track your weaknesses.<br />
            Stop grinding alone. Start grinding together.
          </p>
          <div className={styles.heroActions}>
            {userId ? (
              <Link href="/dashboard" className={`btn-primary ${styles.heroCta}`}>⚡ Enter Dashboard</Link>
            ) : (
              <a href="/sign-up" className={`btn-primary ${styles.heroCta}`}>⚡ Start Grinding Free</a>
            )}
            <a href="#features" className="btn-secondary">See how it works</a>
          </div>

          {/* Floating problem card */}
          <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
              <span className={styles.heroCardPlatform}>LeetCode #146</span>
              <span className="chip-hard">HARD</span>
            </div>
            <div className={styles.heroCardTitle}>LRU Cache</div>
            <div className={styles.heroCardMeta}>
              <span>3 solved in AlgoBeasts</span>
              <span className={styles.heroCardPoints}>+65 pts</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sample Leaderboard ── */}
      <section id="leaderboard" className={styles.section}>
        <div className={styles.sectionLabel}>LIVE LEADERBOARD</div>
        <h2 className={styles.sectionTitle}>Top Squad Members</h2>
        <div className={styles.leaderPreview}>
          {[
            { rank: 1, name: 'Antigravity', pts: 4850, streak: 21, badge: '🏆' },
            { rank: 2, name: 'ByteMaster',  pts: 3920, streak: 14, badge: '🥈' },
            { rank: 3, name: 'AlgoKing',    pts: 3100, streak: 9,  badge: '🥉' },
          ].map(u => (
            <div key={u.rank} className={styles.leaderRow}>
              <span className={styles.leaderBadge}>{u.badge}</span>
              <span className={styles.leaderName}>{u.name}</span>
              <div className={styles.leaderRight}>
                <span className={styles.leaderStreak}>🔥 {u.streak}d</span>
                <span className={styles.leaderPts}>{u.pts.toLocaleString()} pts</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionLabel}>ENGINEERED FOR MASTERY</div>
        <h2 className={styles.sectionTitle}>Everything you need to grind harder</h2>
        <div className={styles.features}>
          {[
            { icon: '🔗', title: 'Share any problem', desc: 'Import challenges from LeetCode, GFG, or Codeforces. Sync your progress with one click.' },
            { icon: '🔥', title: 'Live streaks', desc: "Don't break the chain. Watch your squad's live activity and compete for the longest streak." },
            { icon: '🎮', title: '1v1 Duels', desc: 'Instigate high-stakes races. Pick a problem, set a timer, see who finishes first.' },
            { icon: '📊', title: 'Weakness analytics', desc: "Know if you're weak in DP or Graphs before your interview. Our terminal analyzes your failures." },
          ].map(f => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.cta}>
        <div className={styles.ctaGlow} />
        <div className={styles.ctaLabel}>READY TO EXECUTE?</div>
        <h2 className={styles.ctaTitle}>Join 12,000+ engineers<br />grinding their way to top-tier roles.</h2>
        {userId ? (
          <Link href="/dashboard" className={`btn-primary ${styles.ctaBtn}`}>⚡ Go to Dashboard</Link>
        ) : (
          <a href="/sign-up" className={`btn-primary ${styles.ctaBtn}`}>⚡ Start for Free</a>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span>GrindSquad © 2024. Execute the Grind.</span>
        <div className={styles.footerLinks}>
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
          <a href="#">Support</a>
        </div>
      </footer>
    </main>
  );
}
