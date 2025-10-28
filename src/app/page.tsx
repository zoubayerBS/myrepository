'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (userData?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, userData, loading, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Chargement en cours...</p>
    </div>
  );
}
