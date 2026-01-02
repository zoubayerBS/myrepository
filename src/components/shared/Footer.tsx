import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl py-6">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs font-medium text-muted-foreground">
                    © {new Date().getFullYear()} VacationEase. Tous droits réservés.
                </p>
                <div className="text-xs font-medium text-muted-foreground/60 flex items-center gap-1">
                    Développé par <span className="text-primary font-bold">Zoubaier</span>
                </div>
            </div>
        </footer>
    );
}
