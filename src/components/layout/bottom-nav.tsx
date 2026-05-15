
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ClipboardList, Zap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Assets', href: '/assets', icon: Package },
  { label: 'Templates', href: '/templates', icon: BookOpen },
  { label: 'Analyze', href: '/analyze', icon: Zap },
  { label: 'History', href: '/logs', icon: ClipboardList },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-blur border-t border-border/40 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
