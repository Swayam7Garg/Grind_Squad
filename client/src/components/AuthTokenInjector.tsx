'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { setAuthToken, syncUser } from '@/lib/api';

export function AuthTokenInjector() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const synced = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !user) {
      setAuthToken(null);
      synced.current = false;
      return;
    }

    async function initAuth() {
      try {
        const token = await getToken();
        setAuthToken(token);

        // Sync user to DB on first load (creates if not exists)
        if (!synced.current) {
          synced.current = true;
          await syncUser({
            clerkId: user!.id,
            email: user!.primaryEmailAddress?.emailAddress ?? '',
            username: user!.username ?? user!.firstName ?? user!.id.slice(0, 8),
            avatarUrl: user!.imageUrl ?? undefined,
          });
        }
      } catch {
        // Sync failure is non-fatal — user may already exist
      }
    }

    initAuth();

    // Refresh token every 50s to prevent expiry
    const interval = setInterval(async () => {
      const token = await getToken();
      setAuthToken(token);
    }, 50_000);

    return () => clearInterval(interval);
  }, [isSignedIn, user, getToken]);

  return null;
}
