// ========================================
// KAS INFORMATIKA - Header Component
// ========================================

import { useLocation } from 'react-router-dom';
import { Bell, Menu, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { useState, useRef, useEffect } from 'react';
import { UserProfileModal } from '@/components/profile/UserProfileModal';

// Map routes to page titles
const routeTitles: Record<string, string> = {
  '/': 'Beranda',
  '/tagihan-saya': 'Tagihan Saya',
  '/pembayaran-saya': 'Pembayaran Saya',
  '/jenis-iuran': 'Jenis Iuran',
  '/iuran': 'Jenis Iuran',
  '/tagihan': 'Tagihan',
  '/pembayaran': 'Pembayaran',
  '/pendapatan': 'Pendapatan',
  '/pengeluaran': 'Pengeluaran',
  '/kegiatan': 'Kegiatan',
  '/rekening': 'Rekening',
  '/buku-kas': 'Buku Kas & Mutasi',
  '/laporan': 'Laporan',
  '/tahun-akademik': 'Tahun Akademik',
  '/pengguna': 'Pengguna',
  '/pengaturan': 'Pengaturan',
  '/audit-log': 'Audit Log',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (routeTitles[pathname]) return routeTitles[pathname];

  // Try prefix match for nested routes
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
  const { profile } = useAuth();
  const { academicYears, activeYear, setActiveYear, loading: yearLoading } = useAcademicYear();

  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(location.pathname);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setYearDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-[var(--color-border)] bg-white flex items-center justify-between px-4 md:px-6 shrink-0">
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

        <h1 className="text-lg font-semibold text-[var(--color-foreground)]">{pageTitle}</h1>
      </div>

      {/* Right side: Year selector, Notifications, Avatar */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Academic Year Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
            disabled={yearLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-hover)] transition-colors text-sm"
          >
            <span className="hidden sm:inline text-gray-500">TA:</span>
            <span className="font-medium text-[var(--color-foreground)] max-w-[140px] truncate">
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
                    w-full text-left px-3 py-2 text-sm transition-colors
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
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          title="Notifikasi"
        >
          <Bell className="w-5 h-5" />
          {/* Placeholder notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* Desktop avatar + name (Clickable to edit profile) */}
        <button
          type="button"
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-2 pl-2 border-l border-[var(--color-border)] hover:opacity-80 transition-opacity text-left cursor-pointer"
          title="Buka profil & unggah foto"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#174C3C] flex items-center justify-center text-xs font-semibold text-white shrink-0 border border-stone-200">
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
          <div className="hidden md:block">
            <span className="block text-xs font-semibold text-[var(--color-foreground)] max-w-[130px] truncate leading-tight">
              {profile?.full_name ?? 'Profil Saya'}
            </span>
            <span className="block text-[10px] text-stone-400 leading-tight">
              {profile?.role ?? 'MAHASISWA'}
            </span>
          </div>
        </button>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
}
