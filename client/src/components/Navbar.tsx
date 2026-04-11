'use client';
import styles from './Navbar.module.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { getNotifications } from '@/lib/api';
import { dark } from '@clerk/themes';

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getNotifications()
      .then(r => setUnread(r.data?.data?.filter((n: { isRead: boolean }) => !n.isRead).length ?? 0))
      .catch(() => {});
  }, []);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/explore',   label: 'Explore',   icon: 'explore'   },
    { href: '/leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
  ];

  return (
    <nav className={styles.nav}>
      <Link href="/dashboard" className={styles.logo}>
        <span className={styles.logoIcon}>⚡</span>
        <span className={styles.logoText}>GrindSquad</span>
        <span className={styles.logoSub}>Tactical Terminal</span>
      </Link>

      <div className={styles.links}>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.link} ${pathname.startsWith(item.href) ? styles.active : ''}`}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className={styles.right}>
        <Link href="/notifications" className={styles.notifBtn}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>notifications</span>
          {unread > 0 && <span className={styles.badge}>{unread}</span>}
        </Link>
        <UserButton
          appearance={{
            baseTheme: dark,
            elements: {
              avatarBox: { width: '32px', height: '32px', borderRadius: '4px' },
              popoverContent: { background: '#0e0e0f', border: '1px solid rgba(72,72,73,0.5)', borderRadius: '12px' },
            },
          }}
        />
      </div>
    </nav>
  );
}
