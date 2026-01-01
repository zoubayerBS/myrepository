'use client';

import { VacationsClient } from '@/components/dashboard/VacationsClient';
import { TotalCalculator } from '@/components/dashboard/TotalCalculator';
import { UserStats } from '@/components/dashboard/UserStats';
import type { AppUser } from '@/types';
import { motion } from 'framer-motion';


export default function DashboardPage() {

    return (
        <div className="relative min-h-screen bg-dashboard-gradient">
            {/* Background Blobs for depth */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full" />
                <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="container mx-auto p-4 md:p-8 max-w-full overflow-x-hidden relative z-10"
            >
                <UserStats userId="" />

                <div className="grid gap-8 lg:grid-cols-3 mt-8">
                    <div className="lg:col-span-2 order-2 lg:order-1">
                        <VacationsClient
                            initialVacations={[]}
                            isAdminView={false}
                        />
                    </div>
                    <div className="lg:col-span-1 order-1 lg:order-2">
                        <div className="sticky top-24">
                            <TotalCalculator userId="" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}