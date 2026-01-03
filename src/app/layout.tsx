import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google'
import Clarity from '@/components/analytics/Clarity';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'VacationEase',
  description: 'Gérez vos vacations hospitalières simplement.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VacationEase',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-512.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
        <SpeedInsights />
        <Clarity />
      </body>
    </html>
  );
}