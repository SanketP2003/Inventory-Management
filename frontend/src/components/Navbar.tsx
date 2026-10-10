'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSocket } from '../context/SocketContext';
import {
  LayoutDashboard,
  Boxes,
  RefreshCw,
  Bell,
  Activity,
  Radio,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { status, unreadCount } = useSocket();

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Boxes },
    { name: 'Automated Reorders', href: '/reorders', icon: RefreshCw },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-zinc-950 text-zinc-200 border border-zinc-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>LIVE SOCKET</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-zinc-950 text-zinc-400 border border-zinc-800">
            <Activity className="w-3 h-3 animate-spin text-zinc-400" />
            <span>CONNECTING...</span>
          </div>
        );
      case 'disconnected':
      default:
        return (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-zinc-950 text-zinc-500 border border-zinc-800">
            <Radio className="w-3 h-3 text-zinc-500" />
            <span>OFFLINE</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-lg bg-white text-black flex items-center justify-center font-black shadow-sm group-hover:bg-zinc-200 transition-colors">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">
                NexusInventory
              </span>
              <span className="block text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                AUTO-REORDER SYSTEM
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-850">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === '/'
                  ? pathname === '/' || pathname === '/dashboard'
                  : pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide uppercase transition-all duration-150 relative ${
                    isActive
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.name}</span>
                  {link.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-black text-white'
                          : 'bg-white text-black'
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Status Indicator & Mobile Notification Bell */}
          <div className="flex items-center gap-3">
            {getStatusBadge()}

            {/* Mobile notification bell link */}
            <Link
              href="/notifications"
              className="relative md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-zinc-800"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <div className="flex md:hidden border-t border-zinc-800 py-2 gap-1 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === '/'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap uppercase tracking-wider ${
                  isActive
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.name}</span>
                {link.badge !== undefined && (
                  <span className="px-1 py-0.1 bg-white text-black text-[10px] font-bold rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
