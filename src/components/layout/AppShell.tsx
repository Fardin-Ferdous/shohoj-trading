import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertOctagon,
  Bell,
  Calculator,
  ClipboardCheck,
  Compass,
  FileCheck2,
  FileText,
  Home,
  LayoutDashboard,
  Link2,
  Menu,
  MessageSquare,
  Scale,
  Search,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { TEXTS } from '../../texts';
import { cn } from '../../utils/formatters';
import { UserAvatar } from '../ui/Avatar';
import { CookieBanner } from '../ui/CookieBanner';
import { PrototypeBanner } from '../ui/RiskBanner';
import { DemoTools } from './DemoTools';
import { ToastStack } from '../ui/Toast';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    currentUser,
    currentRole,
    currentAdminLevel,
    unreadNotificationsCount,
    logout,
  } = useApp();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleSidebarItems = (): NavItem[] => {
    if (currentRole === 'new_trader') {
      return [
        { to: '/dashboard', label: TEXTS.nav.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
        { to: '/traders', label: TEXTS.nav.traders, icon: <Search className="w-4 h-4" /> },
        { to: '/requests', label: TEXTS.nav.requests, icon: <Compass className="w-4 h-4" /> },
        { to: '/connections', label: TEXTS.nav.connections, icon: <MessageSquare className="w-4 h-4" /> },
        { to: '/settlements', label: 'Settlements', icon: <Wallet className="w-4 h-4" /> },
        { to: '/disputes', label: TEXTS.nav.disputes, icon: <Scale className="w-4 h-4" /> },
        { to: '/notifications', label: TEXTS.nav.notifications, icon: <Bell className="w-4 h-4" /> },
        { to: '/kyc', label: TEXTS.nav.kyc, icon: <FileCheck2 className="w-4 h-4" /> },
        { to: '/profile', label: TEXTS.nav.profile, icon: <Users className="w-4 h-4" /> },
        { to: '/security', label: TEXTS.nav.security, icon: <Shield className="w-4 h-4" /> },
        { to: '/calculator', label: TEXTS.nav.calculator, icon: <Calculator className="w-4 h-4" /> },
      ];
    }

    if (currentRole === 'pro_trader') {
      return [
        { to: '/dashboard', label: TEXTS.nav.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
        { to: '/requests', label: 'Incoming Requests', icon: <Compass className="w-4 h-4" /> },
        { to: '/connections', label: TEXTS.nav.connections, icon: <MessageSquare className="w-4 h-4" /> },
        { to: '/settlements', label: 'Settlements', icon: <Wallet className="w-4 h-4" /> },
        { to: '/disputes', label: TEXTS.nav.disputes, icon: <Scale className="w-4 h-4" /> },
        { to: '/notifications', label: TEXTS.nav.notifications, icon: <Bell className="w-4 h-4" /> },
        { to: '/kyc', label: TEXTS.nav.kyc, icon: <FileCheck2 className="w-4 h-4" /> },
        { to: '/profile-editor', label: TEXTS.nav.proProfile, icon: <Users className="w-4 h-4" /> },
        { to: '/security', label: TEXTS.nav.security, icon: <Shield className="w-4 h-4" /> },
        { to: '/calculator', label: TEXTS.nav.calculator, icon: <Calculator className="w-4 h-4" /> },
      ];
    }

    if (currentRole === 'admin') {
      const base: NavItem[] = [
        { to: '/admin', label: TEXTS.nav.adminHome, icon: <LayoutDashboard className="w-4 h-4" /> },
      ];
      if (currentAdminLevel === 'super_admin') {
        return [
          ...base,
          { to: '/admin/users', label: TEXTS.nav.adminUsers, icon: <Users className="w-4 h-4" /> },
          { to: '/admin/verify', label: TEXTS.nav.adminVerify, icon: <FileCheck2 className="w-4 h-4" /> },
          { to: '/admin/connections', label: 'Connections', icon: <Link2 className="w-4 h-4" /> },
          { to: '/admin/disputes', label: 'Disputes & Reports', icon: <Scale className="w-4 h-4" /> },
          { to: '/admin/settings', label: TEXTS.nav.adminSettings, icon: <Settings className="w-4 h-4" /> },
          { to: '/admin/finance', label: TEXTS.nav.adminFinance, icon: <Wallet className="w-4 h-4" /> },
          { to: '/admin/fraud', label: 'Fraud Signals', icon: <AlertOctagon className="w-4 h-4" /> },
          { to: '/admin/audit', label: 'Audit Log', icon: <FileText className="w-4 h-4" /> },
          { to: '/admin/launch', label: TEXTS.nav.adminLaunch, icon: <ClipboardCheck className="w-4 h-4" /> },
        ];
      }
      if (currentAdminLevel === 'verifier') {
        return [
          ...base,
          { to: '/admin/verify', label: TEXTS.nav.adminVerify, icon: <FileCheck2 className="w-4 h-4" /> },
          { to: '/admin/users', label: TEXTS.nav.adminUsers, icon: <Users className="w-4 h-4" /> },
          { to: '/admin/fraud', label: 'Fraud Signals', icon: <AlertOctagon className="w-4 h-4" /> },
        ];
      }
      if (currentAdminLevel === 'support') {
        return [
          ...base,
          { to: '/admin/disputes', label: 'Disputes & Reports', icon: <Scale className="w-4 h-4" /> },
          { to: '/admin/connections', label: 'Connections', icon: <Link2 className="w-4 h-4" /> },
          { to: '/admin/users', label: TEXTS.nav.adminUsers, icon: <Users className="w-4 h-4" /> },
          { to: '/admin/fraud', label: 'Fraud Signals', icon: <AlertOctagon className="w-4 h-4" /> },
        ];
      }
      if (currentAdminLevel === 'finance') {
        return [
          ...base,
          { to: '/admin/finance', label: TEXTS.nav.adminFinance, icon: <Wallet className="w-4 h-4" /> },
          { to: '/admin/audit', label: 'Audit Log', icon: <FileText className="w-4 h-4" /> },
        ];
      }
    }

    return [];
  };

  const sidebarItems = getRoleSidebarItems();
  const isSignedIn = currentRole !== 'visitor' && currentUser !== null;

  const mobileBottomItems: NavItem[] = isSignedIn
    ? sidebarItems.slice(0, 4)
    : [
        { to: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
        { to: '/traders', label: 'Traders', icon: <Search className="w-4 h-4" /> },
        { to: '/calculator', label: 'Calculator', icon: <Calculator className="w-4 h-4" /> },
        { to: '/login', label: TEXTS.nav.login, icon: <Shield className="w-4 h-4" /> },
      ];

  return (
    <div className="ambient-canvas min-h-screen flex flex-col">
      <PrototypeBanner />

      {/* Slim 3-zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-white/8 bg-white/80 dark:bg-[#060a08]/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect
                x="2"
                y="2"
                width="20"
                height="20"
                rx="6"
                className="fill-emerald-500/15 stroke-emerald-500 dark:stroke-emerald-400"
                strokeWidth="1.75"
              />
              <path
                d="M7 14.5L10.5 11L13.5 13.5L17 9"
                className="stroke-emerald-600 dark:stroke-emerald-400"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{TEXTS.brandName}</span>
          </Link>

          {/* Zone 2: Clean single-line nav links */}
          <nav
            aria-label="Main navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <Link
              to="/how-it-works"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {TEXTS.nav.howItWorks}
            </Link>
            <Link
              to="/traders"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {TEXTS.nav.traders}
            </Link>
            <Link
              to="/calculator"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {TEXTS.nav.calculator}
            </Link>
            <Link
              to="/faq"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {TEXTS.nav.faq}
            </Link>
          </nav>

          {/* Zone 3: Auth actions (Log in link + green Sign up pill, or Signed-in action) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isSignedIn && (
              <Link
                to="/notifications"
                aria-label={`Notifications (${unreadNotificationsCount} unread)`}
                className="relative inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </Link>
            )}

            {isSignedIn ? (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to={currentRole === 'admin' ? '/admin' : '/dashboard'}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white whitespace-nowrap shrink-0"
                >
                  <UserAvatar src={currentUser.avatarUrl} name={currentUser.fullName} size="xs" />
                  <span>{currentUser.fullName.split(' ')[0]}</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="min-h-[40px] px-4 py-1.5 rounded-full text-sm font-medium border border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-4">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white whitespace-nowrap shrink-0"
                >
                  {TEXTS.nav.login}
                </Link>
                <Link
                  to="/signup"
                  className="min-h-[40px] inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0"
                >
                  {TEXTS.nav.signup}
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#08100d] px-4 py-4 space-y-2">
            <Link
              to="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-xl text-base font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {TEXTS.nav.howItWorks}
            </Link>
            <Link
              to="/traders"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-xl text-base font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {TEXTS.nav.traders}
            </Link>
            <Link
              to="/calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-xl text-base font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {TEXTS.nav.calculator}
            </Link>
            <Link
              to="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-xl text-base font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {TEXTS.nav.faq}
            </Link>
            {isSignedIn && sidebarItems.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1">
                <p className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                  {currentRole === 'admin'
                    ? `Admin · ${currentAdminLevel?.replace('_', ' ')}`
                    : currentRole.replace('_', ' ')}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {sidebarItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-slate-200 bg-white/5 hover:bg-white/10"
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-3">
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full min-h-[44px] rounded-full border border-slate-300 dark:border-white/15 font-medium text-sm cursor-pointer"
                >
                  Log out ({currentUser.fullName})
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-white/15 text-sm font-medium"
                  >
                    {TEXTS.nav.login}
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-full bg-emerald-500 text-slate-950 dark:bg-emerald-400 text-sm font-semibold"
                  >
                    {TEXTS.nav.signup}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main layout: optional role sidebar on large screens */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
        {isSignedIn && sidebarItems.length > 0 && (
          <aside
            aria-label="Role menu"
            className="hidden lg:block w-60 shrink-0 py-8"
          >
            <div className="glass-panel rounded-2xl p-3 space-y-1 sticky top-24">
              <div className="px-3 py-2 mb-1 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-2.5">
                <UserAvatar src={currentUser.avatarUrl} name={currentUser.fullName} size="xs" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {currentUser.fullName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                    {currentRole === 'admin'
                      ? `Admin · ${currentAdminLevel?.replace('_', ' ')}`
                      : currentRole.replace('_', ' ')}
                  </p>
                </div>
              </div>
              {sidebarItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      active
                        ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300'
                        : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/6'
                    )}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </aside>
        )}

        <main className="flex-1 min-w-0 py-8 pb-24 md:pb-12">{children}</main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-white/8 bg-white/50 dark:bg-[#050806]/80 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="font-display text-base font-bold text-slate-950 dark:text-white">
              {TEXTS.brandName}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
              {TEXTS.footer.tagline}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              {TEXTS.footer.exploreHeading}
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/how-it-works" className="hover:text-slate-950 dark:hover:text-white">
                  {TEXTS.footer.links.howItWorks}
                </Link>
              </li>
              <li>
                <Link to="/traders" className="hover:text-slate-950 dark:hover:text-white">
                  {TEXTS.nav.traders}
                </Link>
              </li>
              <li>
                <Link to="/calculator" className="hover:text-slate-950 dark:hover:text-white">
                  {TEXTS.nav.calculator}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-slate-950 dark:hover:text-white">
                  {TEXTS.footer.links.faq}
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-slate-950 dark:hover:text-white">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-slate-950 dark:hover:text-white">
                  {TEXTS.footer.links.contact}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              {TEXTS.footer.legalHeading}
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/legal/terms" className="hover:text-slate-950 dark:hover:text-white">
                  {TEXTS.footer.links.terms}
                </Link>
              </li>
              <li>
                <Link to="/legal/risk" className="hover:text-slate-950 dark:hover:text-white">
                  {TEXTS.footer.links.risk}
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="hover:text-slate-950 dark:hover:text-white">
                  {TEXTS.footer.links.privacy}
                </Link>
              </li>
              <li>
                <Link to="/legal/advertising" className="hover:text-slate-950 dark:hover:text-white">
                  {TEXTS.footer.links.advertising}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-slate-200/70 dark:border-white/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{TEXTS.prototypeBanner}</span>
          <span>{TEXTS.riskWarningShort}</span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (kept compact <= 15% viewport height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-white/10 bg-white/92 dark:bg-[#08100d]/92 backdrop-blur-xl px-2 py-1 flex items-center justify-around"
      >
        {mobileBottomItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'min-h-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium rounded-xl px-1',
                active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              {item.icon}
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <CookieBanner />
      <DemoTools />
      <ToastStack />
    </div>
  );
}
