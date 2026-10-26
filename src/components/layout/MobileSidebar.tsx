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
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import logoImg from '@/assets/logo.jpg';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

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
      { label: 'Beranda', icon: Home, href: '/dashboard', roles: 'all' },
      { label: 'Tagihan Saya', icon: Receipt, href: '/tagihan-saya', roles: ['MAHASISWA'] },
      { label: 'Pembayaran Saya', icon: CreditCard, href: '/pembayaran-saya', roles: ['MAHASISWA'] },
    ],
  },
  {
    title: 'Keuangan',
    roles: ['ADMIN', 'BENDAHARA'],
    items: [
      { label: 'Jenis Iuran', icon: Layers, href: '/jenis-iuran', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Tagihan Mahasiswa', icon: FileText, href: '/tagihan', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Pembayaran', icon: Wallet, href: '/pembayaran', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Pendapatan Lain', icon: TrendingUp, href: '/pendapatan', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Pengeluaran', icon: TrendingDown, href: '/pengeluaran', roles: ['ADMIN', 'BENDAHARA'] },
    ],
  },
  {
    title: 'Manajemen',
    roles: ['ADMIN', 'BENDAHARA'],
    items: [
      { label: 'Kegiatan & Anggaran', icon: Calendar, href: '/kegiatan', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Rekening & Kas', icon: Building, href: '/rekening', roles: ['ADMIN', 'BENDAHARA'] },
      { label: 'Laporan Keuangan', icon: BarChart, href: '/laporan', roles: ['ADMIN', 'BENDAHARA'] },
    ],
  },
  {
    title: 'Pengaturan Sistem',
    roles: ['ADMIN'],
    items: [
      { label: 'Tahun Akademik', icon: GraduationCap, href: '/tahun-akademik', roles: ['ADMIN'] },
      { label: 'Pengguna & Akses', icon: Users, href: '/pengguna', roles: ['ADMIN'] },
      { label: 'Pengaturan & QRIS', icon: Settings, href: '/pengaturan', roles: ['ADMIN'] },
      { label: 'Audit Trail', icon: Shield, href: '/audit-log', roles: ['ADMIN'] },
    ],
  },
];

function hasAccess(allowedRoles: UserRole[] | 'all', userRole: UserRole | undefined): boolean {
  if (allowedRoles === 'all') return true;
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex w-4/5 max-w-xs flex-1 flex-col bg-[#191B19] text-stone-100 shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1 border border-stone-700">
              <img src={logoImg} alt="Logo UNUGHA" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">KAS INFORMATIKA</h1>
              <p className="text-[10px] text-emerald-400 font-medium">UNUGHA Cilacap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile preview */}
        <div className="p-4 border-b border-stone-800/80 bg-stone-900/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#174C3C] flex items-center justify-center text-sm font-bold text-white shrink-0 border border-stone-700">
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
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Pengguna'}</p>
            <div className="mt-0.5 flex items-center justify-between text-[11px] text-stone-400">
              <span className="truncate max-w-[120px]">{profile?.email}</span>
              <span className="rounded bg-[#174C3C] px-1.5 py-0.5 text-[9px] text-emerald-200 uppercase font-semibold">
                {profile?.role || 'MAHASISWA'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navSections
            .filter((sec) => hasAccess(sec.roles, profile?.role))
            .map((section, idx) => {
              const visibleItems = section.items.filter((item) =>
                hasAccess(item.roles, profile?.role)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-1">
                  {section.title && (
                    <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      {section.title}
                    </div>
                  )}
                  {visibleItems.map((item) => {
                    const isActive =
                      location.pathname === item.href ||
                      (item.href !== '/' && item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#174C3C] text-white font-semibold'
                            : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-stone-800">
          <button
            onClick={() => {
              onClose();
              signOut();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
