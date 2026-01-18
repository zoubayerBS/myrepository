'use client';
import { Logo } from './Logo';
import { UserNav } from './UserNav';
import { NotificationBell } from './NotificationBell';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass shadow-sm transition-all duration-300">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <Logo />
        <div className="flex flex-1 items-center justify-end space-x-6">
          <nav className="flex items-center">
            {/* Notification Bell */}
            <NotificationBell />

            <div className="ml-4 pl-4 border-l border-white/10">
              <UserNav />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}