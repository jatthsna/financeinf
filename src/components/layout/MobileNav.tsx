// ========================================
// KAS INFORMATIKA - Mobile Navigation
// ========================================

import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Receipt,
  CreditCard,
  FileText,
  Wallet,
  BarChart,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MobileNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

function getMobileNavItems(
  isAdmin: boolean,
  isBendahara: boolean,
  isMahasiswa: boolean
): MobileNavItem[] {
  if (isMahasiswa) {
    return [
      { label: 'Beranda', icon: Home, href: '/' },
      { label: 'Tagihan', icon: Receipt, href: '/tagihan-saya' },
      { label: 'Bayar', icon: CreditCard, href: '/pembayaran-saya' },
    ];
  }

  if (isBendahara) {
    return [
      { label: 'Beranda', icon: Home, href: '/' },
      { label: 'Tagihan', icon: FileText, href: '/tagihan' },
      { label: 'Bayar', icon: Wallet, href: '/pembayaran' },
      { label: 'Laporan', icon: BarChart, href: '/laporan' },
    ];
  }

  if (isAdmin) {
    return [
      { label: 'Beranda', icon: Home, href: '/' },
      { label: 'Tagihan', icon: FileText, href: '/tagihan' },
      { label: 'Bayar', icon: Wallet, href: '/pembayaran' },
      { label: 'Laporan', icon: BarChart, href: '/laporan' },
      { label: 'Pengguna', icon: Users, href: '/pengguna' },
    ];
  }

  // Fallback
  return [{ label: 'Beranda', icon: Home, href: '/' }];
}

export function MobileNav() {
  const location = useLocation();
  const { isAdmin, isBendahara, isMahasiswa } = useAuth();

  const items = getMobileNavItems(isAdmin, isBendahara, isMahasiswa);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[var(--color-border)] safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive =
            item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
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
  );
}
