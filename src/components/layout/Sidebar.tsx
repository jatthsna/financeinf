// ========================================
// KAS INFORMATIKA - Sidebar Component
// ========================================

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Receipt,
  CreditCard,
  Layers,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building,
  BarChart,
  GraduationCap,
  Users,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import logoImg from '@/assets/logo.jpg';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: UserRole[] | 'all';
}

interface NavSection {
  title: string | null;
  roles: UserRole[] | 'all';
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: null,
    roles: 'all',
    items: [
      { label: 'Dashboard', icon: Home, href: '/dashboard', roles: 'all' },
      { label: 'Portal Publik', icon: Globe, href: '/transparansi', roles: 'all' },
      { label: 'Tagihan Saya', icon: Receipt, href: '/tagihan-saya', roles: ['MAHASISWA'] },
      { label: 'Pembayaran Saya', icon: CreditCard, href: '/pembayaran-saya', roles: ['MAHASISWA'] },
    ],
  },
  {
    title: 'Keuangan',
    roles: ['ADMIN', 'BENDAHARA'],
    items: [
      { label: 'Jenis Iuran', icon: Layers, href: '/jenis-iuran', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Tagihan', icon: FileText, href: '/tagihan', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Pembayaran', icon: Wallet, href: '/pembayaran', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Pendapatan', icon: TrendingUp, href: '/pendapatan', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Pengeluaran', icon: TrendingDown, href: '/pengeluaran', roles: ['ADMIN', 'BENDAHARA'] },
    ],
  },
  {
    title: 'Manajemen',
    roles: ['ADMIN', 'BENDAHARA'],
    items: [
      { label: 'Kegiatan', icon: Calendar, href: '/kegiatan', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Rekening', icon: Building, href: '/rekening', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Laporan', icon: BarChart, href: '/laporan', roles: ['ADMIN', 'BENDAHARA'] },
    ],
  },
  {
    title: 'Sistem',
    roles: ['ADMIN', 'BENDAHARA'],
    items: [
      { label: 'Tahun Akademik', icon: GraduationCap, href: '/tahun-akademik', roles: ['ADMIN'] },
      { label: 'Pengguna', icon: Users, href: '/pengguna', roles: ['ADMIN'] },
      { label: 'Pengaturan & QRIS', icon: Settings, href: '/pengaturan', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Audit Log', icon: Shield, href: '/audit-log', roles: ['ADMIN'] },
    ],
  },
];

function hasAccess(allowedRoles: UserRole[] | 'all', userRole: UserRole | undefined): boolean {
  if (allowedRoles === 'all') return true;
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

const roleBadgeColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-500/20 text-red-300',
  BENDAHARA: 'bg-amber-500/20 text-amber-300',
  MAHASISWA: 'bg-emerald-500/20 text-emerald-300',
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  BENDAHARA: 'Bendahara',
  MAHASISWA: 'Mahasiswa',
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const userRole = profile?.role;
  const sidebarWidth = collapsed ? 'w-16' : 'w-[280px]';

  return (
    <aside
      className={`hidden md:flex flex-col ${sidebarWidth} bg-[#191B19] text-white min-h-screen transition-all duration-300 ease-in-out relative`}
    >
      {/* Logo / Branding */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-white/20">
              <img src={logoImg} alt="Logo UNUGHA" className="w-full h-full object-contain" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-xs font-bold text-white whitespace-nowrap tracking-wide">KAS INFORMATIKA</h1>
              <p className="text-[10px] text-emerald-400 font-medium whitespace-nowrap">UNUGHA Cilacap</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center mx-auto border border-white/20">
            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-[#191B19] border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors z-10"
        title={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-white/70" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-white/70" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navSections.map((section) => {
          if (!hasAccess(section.roles, userRole)) return null;

          const visibleItems = section.items.filter((item) =>
            hasAccess(item.roles, userRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title ?? 'main'} className="mb-2">
              {/* Section header */}
              {section.title && !collapsed && (
                <div className="px-3 py-2 mt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {section.title}
                  </span>
                </div>
              )}
              {section.title && collapsed && (
                <div className="flex justify-center py-2 mt-2">
                  <div className="w-6 h-px bg-white/20" />
                </div>
              )}

              {/* Nav items */}
              {visibleItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.href);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${
                        isActive
                          ? 'bg-[#174C3C] text-white shadow-sm'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-300' : ''}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="border-t border-white/10 p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#174C3C] flex items-center justify-center text-sm font-semibold shrink-0 border border-white/20">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (profile?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() ?? '?')
              )}
            </div>

            {/* Name & Role */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name ?? 'User'}
              </p>
              {userRole && (
                <span
                  className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleBadgeColors[userRole]}`}
                >
                  {roleLabels[userRole]}
                </span>
              )}
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={signOut}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#174C3C] flex items-center justify-center text-sm font-semibold border border-white/20">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (profile?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() ?? '?')
              )}
            </div>
            <button
              type="button"
              onClick={signOut}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
