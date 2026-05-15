"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ClipboardList, Zap, BookOpen, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'STATUS', href: '/', icon: Shield },
  { label: 'GEAR', href: '/assets', icon: Package },
  { label: 'SL-3', href: '/templates', icon: BookOpen },
  { label: 'AI DIAG', href: '/analyze', icon: Zap },
  { label: 'ERO', href: '/logs', icon: ClipboardList },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-blur pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all border-b-4",
                isActive ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-primary/70"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-0.5", isActive && "stroke-[2.5px]")} />
              <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}