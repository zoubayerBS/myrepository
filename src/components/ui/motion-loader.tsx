'use client';

import { motion } from 'framer-motion';
import { Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
    className?: string;
}

export function PulseLoader({ className }: LoaderProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
            <div className="relative">
                {/* Pulsing circles background */}
                <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Logo Icon */}
                <div className="relative z-10 bg-white dark:bg-zinc-950 p-4 rounded-full shadow-xl border border-zinc-100 dark:border-zinc-800">
                    <Stethoscope className="h-8 w-8 text-primary" />
                </div>
            </div>
            <motion.p
                className="text-sm font-bold tracking-widest uppercase text-muted-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
                Chargement...
            </motion.p>
        </div>
    );
}

export function SpinnerLoader({ className }: LoaderProps) {
    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            <motion.span
                className="block border-2 border-primary/30 border-t-primary rounded-full w-full h-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
}
