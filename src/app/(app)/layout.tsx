'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/shared/Header';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Don't do anything while loading

    if (!user) {
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
        router.push('/login');
      }
      return;
    }

    // User is logged in
    const currentPath = window.location.pathname;
    const isAdmin = userData?.role === 'admin';

    if (isAdmin) {
      if (!currentPath.startsWith('/admin')) {
        router.push('/admin');
      }
    } else { // Not an admin
      if (currentPath.startsWith('/admin')) {
        router.push('/dashboard'); // Non-admins can't access admin
      } else if (currentPath === '/' || currentPath.startsWith('/login') || currentPath.startsWith('/signup')) {
        router.push('/dashboard');
      }
    }
  }, [user, userData, loading, router]);



  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}
