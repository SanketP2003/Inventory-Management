'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSocket } from '../context/SocketContext';
import {
  LayoutDashboard,
  Boxes,
  RefreshCw,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Radio,
  Activity,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const { status, unreadCount } = useSocket();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load sidebar collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexus_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nexus_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

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

  const getStatusBadge = (compact = false) => {
    switch (status) {
      case 'connected':
        return (
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-zinc-100 text-black border border-zinc-300 ${
              compact ? 'justify-center px-1.5' : ''
            }`}
            title="Socket: Connected (Live)"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
            {!compact && <span>LIVE SOCKET</span>}
          </div>
        );
      case 'connecting':
        return (
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 ${
              compact ? 'justify-center px-1.5' : ''
            }`}
            title="Socket: Connecting"
          >
            <Activity className="w-3 h-3 animate-spin text-zinc-600 shrink-0" />
            {!compact && <span>CONNECTING...</span>}
          </div>
        );
      case 'disconnected':
      default:
        return (
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-zinc-50 text-zinc-500 border border-zinc-200 ${
              compact ? 'justify-center px-1.5' : ''
            }`}
            title="Socket: Offline"
          >
            <Radio className="w-3 h-3 text-zinc-400 shrink-0" />
            {!compact && <span>OFFLINE</span>}
          </div>
        );
    }
  };

  const getPageTitle = () => {
    if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/inventory')) return 'Inventory Directory';
    if (pathname.startsWith('/reorders')) return 'Automated Reorders';
    if (pathname.startsWith('/notifications')) return 'Live Stream';
    return 'Inventory System';
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col md:flex-row">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-zinc-200 flex flex-col transition-all duration-300 ease-in-out md:static ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Brand & Toggle Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-200 shrink-0">
          <Link
            href="/"
            className={`flex items-center gap-3 overflow-hidden transition-all ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <div className="h-9 w-9 rounded-lg bg-black text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Boxes className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="text-sm font-bold text-black tracking-tight block truncate">
                  NexusInventory
                </span>
                <span className="block text-[10px] text-zinc-500 font-mono tracking-widest uppercase truncate">
                  AUTO-REORDER SYSTEM
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-black hover:bg-zinc-100 md:hidden"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
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
                title={isCollapsed ? link.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors relative group ${
                  isActive
                    ? 'bg-black text-white font-bold shadow-sm'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-700 group-hover:text-black'}`} />
                {!isCollapsed && <span className="truncate">{link.name}</span>}

                {link.badge !== undefined && (
                  <span
                    className={`rounded-full text-[10px] font-bold shrink-0 ${
                      isCollapsed
                        ? 'absolute top-1.5 right-1.5 w-2 h-2 bg-black ring-2 ring-white'
                        : `ml-auto px-1.5 py-0.2 ${
                            isActive
                              ? 'bg-white text-black'
                              : 'bg-black text-white'
                          }`
                    }`}
                  >
                    {!isCollapsed && link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Bottom Footer: Collapse Toggle & Status */}
        <div className="p-3 border-t border-zinc-200 shrink-0 space-y-2">
          {/* Status Indicator */}
          <div className="overflow-hidden">
            {getStatusBadge(isCollapsed)}
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={`hidden md:flex items-center gap-2 w-full p-2 rounded-lg text-xs font-mono text-zinc-600 hover:text-black hover:bg-zinc-100 border border-zinc-200 transition-colors ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
            title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {!isCollapsed && <span className="uppercase text-[11px] tracking-wider">COLLAPSE MENU</span>}
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-black shrink-0" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-black shrink-0" />
            )}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-lg border border-zinc-200 text-zinc-700 hover:text-black hover:bg-zinc-100 md:hidden"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop quick collapse toggle on topbar */}
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-2 rounded-lg border border-zinc-200 text-zinc-700 hover:text-black hover:bg-zinc-100 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {/* Breadcrumb / Page Title */}
            <div>
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest block">
                NEXUS / OPERATIONS
              </span>
              <h2 className="text-sm font-bold text-black tracking-tight">
                {getPageTitle()}
              </h2>
            </div>
          </div>

          {/* Right Topbar actions */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>

            <div className="hidden sm:block">
              {getStatusBadge(false)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
