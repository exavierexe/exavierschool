'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { User, Moon, Sun, Stars, BookOpen, Sparkles, Home, Book } from 'lucide-react';

interface MainNavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
  guestsOnly?: boolean;
}

export function MainNav() {
  const pathname = usePathname();
  
  const navItems: MainNavItem[] = [
    {
      title: "Home",
      href: "/",
      icon: <Home className="w-5 h-5 mr-2" />,
    },
    {
      title: "Astrology",
      href: "/astrology",
      icon: <Stars className="w-5 h-5 mr-2" />,
    },
    {
      title: "Birth Chart",
      href: "/birthchart",
      icon: <Moon className="w-5 h-5 mr-2" />,
    },
    {
      title: "Divination",
      href: "/divination",
      icon: <Sparkles className="w-5 h-5 mr-2" />,
    },
    {
      title: "Magick",
      href: "/magick",
      icon: <Sun className="w-5 h-5 mr-2" />,
    },
    {
      title: "Alchemy",
      href: "/alchemy",
      icon: <BookOpen className="w-5 h-5 mr-2" />,
    },
    {
      title: "Library",
      href: "/library",
      icon: <Book className="w-5 h-5 mr-2" />,
    },
  ];
  
  return (
    <nav className="flex items-center justify-center">
      <ul className="flex items-center space-x-1">
        {navItems.map((item) => {
          // Hide items that require auth if not signed in
          if (item.requiresAuth) {
            return (
              <SignedIn key={item.href}>
                <li>
                  <NavItem item={item} pathname={pathname} />
                </li>
              </SignedIn>
            );
          }
          
          // Hide items that are for guests only if signed in
          if (item.guestsOnly) {
            return (
              <SignedOut key={item.href}>
                <li>
                  <NavItem item={item} pathname={pathname} />
                </li>
              </SignedOut>
            );
          }
          
          // Regular items
          return (
            <li key={item.href}>
              <NavItem item={item} pathname={pathname} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavItem({ item, pathname }: { item: MainNavItem; pathname: string }) {
  // Check if this item matches the current path
  const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href));
  
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center px-2 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
        isActive
          ? "bg-purple-700/30 text-purple-300 hover:bg-purple-700/40"
          : "text-gray-300 hover:bg-gray-800 hover:text-white"
      )}
    >
      {item.icon}
      <span className="hidden sm:inline">{item.title}</span>
    </Link>
  );
}