'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative group hover:bg-white/10 transition-all duration-300"
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 opacity-70 group-hover:opacity-100" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 opacity-70 group-hover:opacity-100" />
                    <span className="sr-only">Changer le thème</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="glass border-white/20 shadow-2xl p-1 mt-2"
            >
                <DropdownMenuItem
                    onClick={() => setTheme('light')}
                    className={`cursor-pointer rounded-lg transition-all duration-200 ${theme === 'light' ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                >
                    <Sun className="mr-2 h-4 w-4" />
                    <span className="text-sm font-medium">Clair</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className={`cursor-pointer rounded-lg transition-all duration-200 ${theme === 'dark' ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                >
                    <Moon className="mr-2 h-4 w-4" />
                    <span className="text-sm font-medium">Sombre</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('system')}
                    className={`cursor-pointer rounded-lg transition-all duration-200 ${theme === 'system' ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                >
                    <div className="mr-2 h-4 w-4 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-gradient-to-br from-amber-400 to-purple-600" />
                    </div>
                    <span className="text-sm font-medium">Système</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
