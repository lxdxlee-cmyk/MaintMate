
import type {Metadata} from 'next';
import './globals.css';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'MaintainMate',
  description: 'Local-first maintenance technical journal and equipment tracker.',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="font-body antialiased min-h-screen pb-20">
        <main className="max-w-lg mx-auto px-4 py-6">
          {children}
        </main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
