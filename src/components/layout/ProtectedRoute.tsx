import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
          <p className="text-sm font-medium text-stone-600">Memuat sesi KAS INFORMATIKA...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and profile exists, verify permission
  if (roles && roles.length > 0) {
    const userRole = profile?.role;
    if (!userRole || !roles.includes(userRole)) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--color-background)] px-4">
          <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-lg font-bold text-red-700">Akses Dibatasi</h2>
            <p className="mt-2 text-sm text-stone-600">
              Anda tidak memiliki izin otorisasi untuk mengakses halaman ini. Peran Anda saat ini:{' '}
              <span className="font-semibold">{userRole || 'Tidak Diketahui'}</span>.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <a
                href="/"
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[#12382c] transition-colors"
              >
                Kembali ke Beranda
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
