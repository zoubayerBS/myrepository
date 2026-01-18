'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { PulseLoader } from '@/components/ui/motion-loader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'admin') {
                router.push('/dashboard');
            }
        }
    }, [user, loading, router]);

    // Show loader while checking auth status
    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <PulseLoader />
            </div>
        );
    }

    // Don't render anything if not authorized (will redirect)
    if (!user || user.role !== 'admin') {
        return null;
    }

    return <>{children}</>;
}
