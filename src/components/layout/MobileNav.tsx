// ========================================
// KAS INFORMATIKA - Mobile Navigation
// ========================================

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Receipt,
  CreditCard,
  FileText,
  Wallet,
  BarChart,
  Users,
  User,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserProfileModal } from '@/components/profile/UserProfileModal';

interface NavItemConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  isAccount?: boolean;
}

function getMobileNavItems(
  isAdmin: boolean,
  isBendahara: boolean,
  isMahasiswa: boolean
): NavItemConfig[] {
  if (isMahasiswa) {
    return [
      { label: 'Dashboard', icon: Home, href: '/dashboard' },
      { label: 'Tagihan', icon: Receipt, href: '/tagihan-saya' },
      { label: 'Bayar', icon: CreditCard, href: '/pembayaran-saya' },
      { label: 'Akun', icon: User, isAccount: true },
    ];
  }

  if (isBendahara) {
    return [
      { label: 'Dashboard', icon: Home, href: '/dashboard' },
      { label: 'Tagihan', icon: FileText, href: '/tagihan' },
      { label: 'Bayar', icon: Wallet, href: '/pembayaran' },
      { label: 'Laporan', icon: BarChart, href: '/laporan' },
      { label: 'Akun', icon: User, isAccount: true },
    ];
  }

  if (isAdmin) {
    return [
      { label: 'Dashboard', icon: Home, href: '/dashboard' },
      { label: 'Tagihan', icon: FileText, href: '/tagihan' },
      { label: 'Bayar', icon: Wallet, href: '/pembayaran' },
      { label: 'Pengguna', icon: Users, href: '/pengguna' },
      { label: 'Akun', icon: User, isAccount: true },
    ];
  }

  // Fallback
  return [
    { label: 'Dashboard', icon: Home, href: '/dashboard' },
    { label: 'Akun', icon: User, isAccount: true },
  ];
}

export function MobileNav() {
  const location = useLocation();
  const { isAdmin, isBendahara, isMahasiswa } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const items = getMobileNavItems(isAdmin, isBendahara, isMahasiswa);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--color-border)] safe-area-bottom shadow-lg">
        <div className="flex items-center justify-around h-16 px-1">
          {items.map((item) => {
            const Icon = item.icon;

            if (item.isAccount) {
              return (
                <button
                  key="account-tab"
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors duration-150 text-gray-400 hover:text-gray-700"
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            const isActive =
              item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href || '');

            return (
              <Link
                key={item.href}
                to={item.href || '#'}
                className={`
                  flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5
                  transition-colors duration-150
                  ${
                    isActive
                      ? 'text-[#174C3C]'
                      : 'text-gray-400 hover:text-gray-600'
                  }
                `}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#174C3C]" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile Modal when tapping Akun */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
