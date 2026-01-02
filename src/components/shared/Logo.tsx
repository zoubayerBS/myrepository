'use client';

import { Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group transition-all duration-300" prefetch={false}>
      <motion.div
        className="bg-primary/10 p-1.5 rounded-xl shadow-sm border border-primary/20"
        whileHover={{ scale: 1.1, rotate: 10 }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Stethoscope className="h-6 w-6 text-primary" />
      </motion.div>
      <span className="font-sans text-xl font-black tracking-tight text-gradient">
        VacationEase
      </span>
    </Link>
  );
}
