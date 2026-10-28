// ========================================
// KAS INFORMATIKA - Header Component
// ========================================

import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Settings,
  Receipt,
  CreditCard,
  BookOpen,
  Globe,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Map routes to page titles
const routeTitles: Record<string, string> = {
  '/': 'Beranda',
  '/dashboard': 'Dashboard',
  '/transparansi': 'Transparansi Kas',
  '/tagihan-saya': 'Tagihan Saya',
  '/pembayaran-saya': 'Pembayaran Saya',
  '/jenis-iuran': 'Jenis Iuran',
  '/iuran': 'Jenis Iuran',
  '/tagihan': 'Tagihan Mahasiswa',
  '/pembayaran': 'Pembayaran Kas',
  '/pendapatan': 'Pendapatan Lain',
  '/pengeluaran': 'Pengeluaran Kas',
  '/kegiatan': 'Kegiatan & Anggaran',
  '/rekening': 'Rekening Kas',
  '/buku-kas': 'Buku Kas & Mutasi',
  '/laporan': 'Laporan Keuangan',
  '/tahun-akademik': 'Tahun Akademik',
  '/pengguna': 'Pengguna & Akses',
  '/pengaturan': 'Pengaturan Sistem',
  '/audit-log': 'Audit Trail',
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  const match = Object.keys(routeTitles)
    .filter((route) => route !== '/')
    .find((route) => pathname.startsWith(route));
  return match ? routeTitles[match] : 'Halaman';
}

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin, isBendahara, isMahasiswa } = useAuth();
  const { academicYears, activeYear, setActiveYear, loading: yearLoading } = useAcademicYear();

  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(location.pathname);

  // Close year dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setYearDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const userInitials = (profile?.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleBadgeStyle =
    profile?.role === 'ADMIN'
      ? 'bg-red-100 text-red-800 border-red-200'
      : profile?.role === 'BENDAHARA'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

  return (
    <header className="h-16 border-b border-[var(--color-border)] bg-white flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
      {/* Left side: Menu toggle + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-semibold text-[var(--color-foreground)] truncate max-w-[180px] sm:max-w-none">
          {pageTitle}
        </h1>
      </div>

      {/* Right side: Year selector, Notifications, User Account Menu */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Academic Year Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
            disabled={yearLoading}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-hover)] transition-colors text-xs sm:text-sm shadow-2xs"
          >
            <span className="hidden sm:inline text-gray-500">TA:</span>
            <span className="font-medium text-[var(--color-foreground)] max-w-[110px] sm:max-w-[140px] truncate">
              {yearLoading ? '...' : activeYear?.display_name || activeYear?.name || activeYear?.year_code || '2026/2027'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {yearDropdownOpen && academicYears.length > 0 && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-[var(--color-border)] bg-white shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
              {academicYears.map((year) => (
                <button
                  key={year.id}
                  type="button"
                  onClick={() => {
                    setActiveYear(year);
                    setYearDropdownOpen(false);
                  }}
                  className={`
                    w-full text-left px-3 py-2 text-xs sm:text-sm transition-colors
                    ${
                      year.id === activeYear?.id
                        ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium'
                        : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground)]'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{year.display_name || year.name || year.year_code}</span>
                    {year.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                        Aktif
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <button
          type="button"
          onClick={() => navigate(isMahasiswa ? '/tagihan-saya' : '/pembayaran')}
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          title="Notifikasi Aktivitas"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* USER ACCOUNT DROPDOWN MENU */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 pl-2 border-l border-[var(--color-border)] hover:bg-stone-50 p-1.5 rounded-lg transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-[#174C3C]/20"
              title="Menu Akun Saya"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#174C3C] flex items-center justify-center text-xs font-bold text-white shrink-0 border border-stone-200 shadow-2xs">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <div className="hidden md:block text-left">
                <span className="block text-xs font-semibold text-stone-900 max-w-[130px] truncate leading-tight">
                  {profile?.full_name ?? 'Profil Saya'}
                </span>
                <span className="block text-[10px] text-stone-400 leading-tight">
                  {profile?.role ?? 'MAHASISWA'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 p-2 bg-white shadow-xl rounded-xl border border-stone-200 z-50">
            {/* User Profile Header Card */}
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 mb-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {profile?.full_name || 'Pengguna'}
                </p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${roleBadgeStyle}`}>
                  {profile?.role || 'MAHASISWA'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 truncate">{profile?.email || user?.email}</p>
              {profile?.nim && (
                <p className="text-[10px] font-mono text-stone-500">NIM: {profile.nim}</p>
              )}
            </div>

            <DropdownMenuSeparator />

            {/* Menu options */}
            <DropdownMenuItem
              onClick={() => setProfileModalOpen(true)}
              className="cursor-pointer text-xs py-2 px-2.5 rounded-md hover:bg-stone-100 flex items-center text-stone-700"
            >
              <User className="mr-2.5 h-4 w-4 text-stone-500" />
              <span>Profil & Edit Data Diri</span>
            </DropdownMenuItem>

            {isMahasiswa && (
              <>
                <DropdownMenuItem
                  onClick={() => navigate('/tagihan-saya')}
                  className="cursor-pointer text-xs py-2 px-2.5 rounded-md hover:bg-stone-100 flex items-center text-stone-700"
                >
                  <Receipt className="mr-2.5 h-4 w-4 text-stone-500" />
                  <span>Tagihan & Kewajiban Saya</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/pembayaran-saya')}
                  className="cursor-pointer text-xs py-2 px-2.5 rounded-md hover:bg-stone-100 flex items-center text-stone-700"
                >
                  <CreditCard className="mr-2.5 h-4 w-4 text-stone-500" />
                  <span>Riwayat Setoran Kas</span>
                </DropdownMenuItem>
              </>
            )}

            {(isAdmin || isBendahara) && (
              <>
                <DropdownMenuItem
                  onClick={() => navigate('/buku-kas')}
                  className="cursor-pointer text-xs py-2 px-2.5 rounded-md hover:bg-stone-100 flex items-center text-stone-700"
                >
                  <BookOpen className="mr-2.5 h-4 w-4 text-stone-500" />
                  <span>Buku Kas & Mutasi</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/pengaturan')}
                  className="cursor-pointer text-xs py-2 px-2.5 rounded-md hover:bg-stone-100 flex items-center text-stone-700"
                >
                  <Settings className="mr-2.5 h-4 w-4 text-stone-500" />
                  <span>Pengaturan Sistem & QRIS</span>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuItem
              onClick={() => navigate('/transparansi')}
              className="cursor-pointer text-xs py-2 px-2.5 rounded-md hover:bg-stone-100 flex items-center text-stone-700"
            >
              <Globe className="mr-2.5 h-4 w-4 text-stone-500" />
              <span>Portal Transparansi Publik</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Logout Item */}
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-xs py-2 px-2.5 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 font-semibold flex items-center"
            >
              <LogOut className="mr-2.5 h-4 w-4 text-red-600" />
              <span>Keluar dari Akun (Logout)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
}
