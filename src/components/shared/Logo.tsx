import { Stethoscope, WalletCards } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group transition-all duration-300" prefetch={false}>
      <div className="bg-primary/10 p-1.5 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-sm border border-primary/20">
        <WalletCards className="h-6 w-6 text-primary" />
      </div>
      <span className="font-sans text-xl font-black tracking-tight text-gradient">
        VacationEase
      </span>
    </Link>
  );
}
