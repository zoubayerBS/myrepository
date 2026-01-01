import { Logo } from '@/components/shared/Logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.03)_0%,transparent_70%)]" />
      </div>

      <div className="absolute top-8 left-8 z-10">
        <Logo />
      </div>

      <main className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {children}
      </main>
    </div>
  );
}
