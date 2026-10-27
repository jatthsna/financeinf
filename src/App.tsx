import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import PublicTransparencyPage from '@/pages/PublicTransparencyPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import ContributionTypesPage from '@/pages/ContributionTypesPage';
import BillingPage from '@/pages/BillingPage';
import PaymentsPage from '@/pages/PaymentsPage';
import MyBillsPage from '@/pages/MyBillsPage';
import MyPaymentsPage from '@/pages/MyPaymentsPage';
import IncomePage from '@/pages/IncomePage';
import ExpensesPage from '@/pages/ExpensesPage';
import ActivitiesPage from '@/pages/ActivitiesPage';
import AccountsPage from '@/pages/AccountsPage';
import ReportsPage from '@/pages/ReportsPage';
import AcademicYearPage from '@/pages/AcademicYearPage';
import UsersPage from '@/pages/UsersPage';
import SettingsPage from '@/pages/SettingsPage';
import AuditLogPage from '@/pages/AuditLogPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Public Transparency Portal (Accessible without login) */}
      <Route path="/" element={<PublicTransparencyPage />} />
      <Route path="/transparansi" element={<PublicTransparencyPage />} />

      {/* Authenticated Application Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Student routes */}
        <Route
          path="tagihan-saya"
          element={
            <ProtectedRoute roles={['MAHASISWA']}>
              <MyBillsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pembayaran-saya"
          element={
            <ProtectedRoute roles={['MAHASISWA']}>
              <MyPaymentsPage />
            </ProtectedRoute>
          }
        />

        {/* Staff routes */}
        <Route
          path="jenis-iuran"
          element={
            <ProtectedRoute roles={['ADMIN', 'BENDAHARA']}>
              <ContributionTypesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="tagihan"
          element={
            <ProtectedRoute roles={['ADMIN', 'BENDAHARA']}>
              <BillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pembayaran"
          element={
            <ProtectedRoute roles={['ADMIN', 'BENDAHARA']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pendapatan"
          element={
            <ProtectedRoute roles={['ADMIN', 'BENDAHARA']}>
              <IncomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pengeluaran"
          element={
            <ProtectedRoute roles={['ADMIN', 'BENDAHARA']}>
              <ExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="kegiatan"
          element={
            <ProtectedRoute roles={['ADMIN', 'BENDAHARA']}>
              <ActivitiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="rekening"
          element={
            <ProtectedRoute roles={['ADMIN', 'BENDAHARA']}>
              <AccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="laporan"
          element={
            <ProtectedRoute roles={['ADMIN', 'BENDAHARA']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="tahun-akademik"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AcademicYearPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pengguna"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pengaturan"
          element={
            <ProtectedRoute roles={['ADMIN', 'BENDAHARA']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit-log"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
