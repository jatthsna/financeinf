import { useAuth } from '@/hooks/useAuth';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Plus,
  FileText,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Admin Dashboard ───────────────────────────────────────────────
function AdminDashboard() {
  const { activeYear } = useAcademicYear();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats', activeYear?.id],
    queryFn: async () => {
      const yearId = activeYear?.id;
      if (!yearId) return null;

      const [incomeRes, expenseRes, pendingObligationsRes, pendingQrisRes] = await Promise.all([
        supabase
          .from('income_records')
          .select('amount')
          .eq('academic_year_id', yearId)
          .in('status', ['APPROVED', 'POSTED']),
        supabase
          .from('expenses')
          .select('amount')
          .eq('academic_year_id', yearId)
          .in('status', ['APPROVED', 'POSTED']),
        supabase
          .from('student_obligations')
          .select('remaining_amount')
          .eq('academic_year_id', yearId)
          .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']),
        supabase
          .from('payments')
          .select('id')
          .eq('academic_year_id', yearId)
          .eq('payment_method', 'QRIS')
          .eq('status', 'PENDING'),
      ]);

      const totalIncome = (incomeRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      const totalExpense = (expenseRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      const totalTunggakan = (pendingObligationsRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.remaining_amount || 0),
        0
      );

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        totalTunggakan,
        pendingQrisCount: pendingQrisRes.data?.length ?? 0,
      };
    },
    enabled: !!activeYear?.id,
  });

  const { data: recentTransactions, isLoading: txLoading } = useQuery({
    queryKey: ['admin-recent-tx', activeYear?.id],
    queryFn: async () => {
      const yearId = activeYear?.id;
      if (!yearId) return [];

      const { data } = await supabase
        .from('payments')
        .select('id, amount, payment_method, status, receipt_number, created_at, profiles:payer_id(full_name)')
        .eq('academic_year_id', yearId)
        .order('created_at', { ascending: false })
        .limit(10);

      return data ?? [];
    },
    enabled: !!activeYear?.id,
  });

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Administrator"
        description="Ringkasan eksekutif keuangan Program Studi Informatika"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pemasukan"
          value={formatCurrency(stats?.totalIncome ?? 0)}
          icon={<TrendingUp className="h-5 w-5 text-emerald-700" />}
          className="border-l-4 border-l-[#174C3C]"
        />
        <StatCard
          title="Total Pengeluaran"
          value={formatCurrency(stats?.totalExpense ?? 0)}
          icon={<TrendingDown className="h-5 w-5 text-red-600" />}
          className="border-l-4 border-l-red-500"
        />
        <StatCard
          title="Saldo Kas Bersih"
          value={formatCurrency(stats?.balance ?? 0)}
          icon={<Wallet className="h-5 w-5 text-[#174C3C]" />}
          className="border-l-4 border-l-emerald-600"
        />
        <StatCard
          title="Total Kewajiban Tertunda"
          value={formatCurrency(stats?.totalTunggakan ?? 0)}
          subtitle={`${stats?.pendingQrisCount ?? 0} QRIS menanti verifikasi`}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          className="border-l-4 border-l-amber-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-[#191B19]">
              Transaksi Kas & Pembayaran Terbaru
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pembayaran">
                Lihat Semua <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recentTransactions?.length ? (
              <EmptyState
                icon={<FileText className="h-10 w-10 text-stone-400" />}
                title="Belum ada transaksi"
                description="Catatan pembayaran kas dan QRIS terbaru akan otomatis tersinkronisasi di sini."
              />
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-stone-200/80 p-3 bg-stone-50/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#191B19]">
                        {tx.profiles?.full_name ?? 'Mahasiswa'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {formatDate(tx.created_at, 'with-time')} · Metode: {tx.payment_method} · No: {tx.receipt_number || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#191B19]">
                        {formatCurrency(Number(tx.amount))}
                      </span>
                      <PaymentStatusBadge status={tx.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#191B19]">
              Aksi Operasional Cepat
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="justify-start border-stone-200 hover:bg-stone-50" asChild>
              <Link to="/pembayaran">
                <CreditCard className="mr-2 h-4 w-4 text-[#174C3C]" /> Verifikasi & Catat Kas
              </Link>
            </Button>
            <Button variant="outline" className="justify-start border-stone-200 hover:bg-stone-50" asChild>
              <Link to="/tagihan">
                <FileText className="mr-2 h-4 w-4 text-[#174C3C]" /> Buat Kewajiban / Tagihan
              </Link>
            </Button>
            <Button variant="outline" className="justify-start border-stone-200 hover:bg-stone-50" asChild>
              <Link to="/pengeluaran">
                <Plus className="mr-2 h-4 w-4 text-[#174C3C]" /> Catat Beban Pengeluaran
              </Link>
            </Button>
            <Button variant="outline" className="justify-start border-stone-200 hover:bg-stone-50" asChild>
              <Link to="/pengguna">
                <Users className="mr-2 h-4 w-4 text-[#174C3C]" /> Kelola Data Mahasiswa & Staf
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Treasurer Dashboard ───────────────────────────────────────────
function TreasurerDashboard() {
  const { activeYear } = useAcademicYear();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['treasurer-dashboard-stats', activeYear?.id],
    queryFn: async () => {
      const yearId = activeYear?.id;
      if (!yearId) return null;

      const [cashPaymentsRes, qrisPendingRes, unpaidRes] = await Promise.all([
        supabase
          .from('payments')
          .select('amount')
          .eq('academic_year_id', yearId)
          .eq('payment_method', 'CASH')
          .eq('status', 'APPROVED'),
        supabase
          .from('payments')
          .select('id, amount')
          .eq('academic_year_id', yearId)
          .eq('payment_method', 'QRIS')
          .eq('status', 'PENDING'),
        supabase
          .from('student_obligations')
          .select('remaining_amount')
          .eq('academic_year_id', yearId)
          .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']),
      ]);

      const totalCashReceived = (cashPaymentsRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      const pendingQrisAmount = (qrisPendingRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      const totalUnpaid = (unpaidRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.remaining_amount || 0),
        0
      );

      return {
        totalCashReceived,
        pendingQrisCount: qrisPendingRes.data?.length ?? 0,
        pendingQrisAmount,
        totalUnpaid,
      };
    },
    enabled: !!activeYear?.id,
  });

  const { data: pendingQrisList } = useQuery({
    queryKey: ['treasurer-pending-qris', activeYear?.id],
    queryFn: async () => {
      const yearId = activeYear?.id;
      if (!yearId) return [];

      const { data } = await supabase
        .from('payments')
        .select('id, amount, payment_date, receipt_number, created_at, profiles:payer_id(full_name, nim)')
        .eq('academic_year_id', yearId)
        .eq('payment_method', 'QRIS')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(5);

      return data ?? [];
    },
    enabled: !!activeYear?.id,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Bendahara"
        description="Pengelolaan penerimaan kas fisik, antrian QRIS, dan tagihan mahasiswa"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Kas Fisik Diterima"
          value={formatCurrency(stats?.totalCashReceived ?? 0)}
          icon={<Wallet className="h-5 w-5 text-emerald-700" />}
          className="border-l-4 border-l-[#174C3C]"
        />
        <StatCard
          title="Klaim QRIS Menunggu"
          value={String(stats?.pendingQrisCount ?? 0)}
          subtitle={formatCurrency(stats?.pendingQrisAmount ?? 0)}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          className="border-l-4 border-l-amber-500"
        />
        <StatCard
          title="Kewajiban Belum Dibayar"
          value={formatCurrency(stats?.totalUnpaid ?? 0)}
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
          className="border-l-4 border-l-red-500"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-[#191B19]">
            Klaim QRIS Mahasiswa Menunggu Verifikasi
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/pembayaran">
              Buka Meja Verifikasi <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!pendingQrisList?.length ? (
            <EmptyState
              icon={<CheckCircle2 className="h-10 w-10 text-emerald-600" />}
              title="Semua klaim QRIS terverifikasi"
              description="Tidak ada klaim QRIS mahasiswa yang sedang menunggu persetujuan."
            />
          ) : (
            <div className="space-y-3">
              {pendingQrisList.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200/80 bg-amber-50/40 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#191B19]">
                      {p.profiles?.full_name ?? 'Mahasiswa'} {p.profiles?.nim ? `(${p.profiles.nim})` : ''}
                    </p>
                    <p className="text-xs text-stone-500">
                      Diajukan: {formatDate(p.created_at, 'with-time')} · Ref: {p.receipt_number || '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#191B19]">
                      {formatCurrency(Number(p.amount))}
                    </span>
                    <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-800">
                      Menunggu
                    </Badge>
                    <Button size="sm" className="bg-[#174C3C] text-white hover:bg-[#12382c]" asChild>
                      <Link to="/pembayaran">Tinjau</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Student Dashboard ─────────────────────────────────────────────
function StudentDashboard() {
  const { user } = useAuth();
  const { activeYear } = useAcademicYear();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['student-dashboard-stats', user?.id, activeYear?.id],
    queryFn: async () => {
      const userId = user?.id;
      const yearId = activeYear?.id;
      if (!userId || !yearId) return null;

      const [unpaidRes, overdueRes, approvedRes] = await Promise.all([
        supabase
          .from('student_obligations')
          .select('amount, paid_amount, remaining_amount')
          .eq('student_id', userId)
          .eq('academic_year_id', yearId)
          .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']),
        supabase
          .from('student_obligations')
          .select('id')
          .eq('student_id', userId)
          .eq('academic_year_id', yearId)
          .eq('status', 'OVERDUE'),
        supabase
          .from('payments')
          .select('amount')
          .eq('payer_id', userId)
          .eq('academic_year_id', yearId)
          .eq('status', 'APPROVED'),
      ]);

      const totalTunggakan = (unpaidRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.remaining_amount || 0),
        0
      );
      const totalApproved = (approvedRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );

      return {
        totalTunggakan,
        overdueBills: overdueRes.data?.length ?? 0,
        totalApproved,
      };
    },
    enabled: !!user?.id && !!activeYear?.id,
  });

  const { data: upcomingBills, isLoading: billsLoading } = useQuery({
    queryKey: ['student-upcoming-bills', user?.id, activeYear?.id],
    queryFn: async () => {
      const userId = user?.id;
      const yearId = activeYear?.id;
      if (!userId || !yearId) return [];

      const { data } = await supabase
        .from('student_obligations')
        .select('id, amount, paid_amount, remaining_amount, due_date, status, contribution_types(name)')
        .eq('student_id', userId)
        .eq('academic_year_id', yearId)
        .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'])
        .order('due_date', { ascending: true })
        .limit(5);

      return data ?? [];
    },
    enabled: !!user?.id && !!activeYear?.id,
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['student-recent-payments', user?.id, activeYear?.id],
    queryFn: async () => {
      const userId = user?.id;
      const yearId = activeYear?.id;
      if (!userId || !yearId) return [];

      const { data } = await supabase
        .from('payments')
        .select('id, amount, payment_method, status, receipt_number, created_at')
        .eq('payer_id', userId)
        .eq('academic_year_id', yearId)
        .order('created_at', { ascending: false })
        .limit(5);

      return data ?? [];
    },
    enabled: !!user?.id && !!activeYear?.id,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Mahasiswa"
        description="Portal pribadi informasi tagihan, pembayaran kas, dan riwayat setoran Anda"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Kewajiban Tertunggak"
          value={formatCurrency(stats?.totalTunggakan ?? 0)}
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
          className="border-l-4 border-l-red-500"
        />
        <StatCard
          title="Tagihan Jatuh Tempo"
          value={String(stats?.overdueBills ?? 0)}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          className="border-l-4 border-l-amber-500"
        />
        <StatCard
          title="Total Terverifikasi Lunas"
          value={formatCurrency(stats?.totalApproved ?? 0)}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />}
          className="border-l-4 border-l-[#174C3C]"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Bills */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-[#191B19]">
              Tagihan Kewajiban Anda
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tagihan-saya">
                Bayar Sekarang <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {billsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !upcomingBills?.length ? (
              <EmptyState
                icon={<CheckCircle2 className="h-10 w-10 text-emerald-600" />}
                title="Semua kewajiban telah lunas"
                description="Terima kasih telah membayar iuran kas tepat waktu."
              />
            ) : (
              <div className="space-y-3">
                {upcomingBills.map((bill: any) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border border-stone-200/80 p-3 bg-stone-50/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#191B19]">
                        {bill.contribution_types?.name ?? 'Kewajiban Iuran'}
                      </p>
                      <p className="text-xs text-stone-500">
                        Jatuh tempo: {bill.due_date ? formatDate(bill.due_date) : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#191B19]">
                        {formatCurrency(Number(bill.remaining_amount || bill.amount))}
                      </p>
                      <ObligationStatusBadge status={bill.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-[#191B19]">
              Riwayat Pengajuan & Pembayaran
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pembayaran-saya">
                Lihat Semua <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recentPayments?.length ? (
              <EmptyState
                icon={<CreditCard className="h-10 w-10 text-stone-400" />}
                title="Belum ada catatan pembayaran"
                description="Setelah Anda menyetor kas tunai atau mengunggah bukti QRIS, riwayat akan tertera di sini."
              />
            ) : (
              <div className="space-y-3">
                {recentPayments.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-stone-200/80 p-3 bg-stone-50/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#191B19]">Metode: {p.payment_method}</p>
                      <p className="text-xs text-stone-500">
                        {formatDate(p.created_at, 'with-time')} · Ref: {p.receipt_number || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#191B19]">
                        {formatCurrency(Number(p.amount))}
                      </span>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────
function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Menunggu', className: 'border-amber-300 bg-amber-50 text-amber-800' },
    APPROVED: { label: 'Disetujui', className: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
    REJECTED: { label: 'Ditolak', className: 'border-red-300 bg-red-50 text-red-800' },
    CANCELLED: { label: 'Dibatalkan', className: 'border-stone-300 bg-stone-100 text-stone-600' },
    REVERSED: { label: 'Dibatalkan/Pembalikan', className: 'border-stone-300 bg-stone-100 text-stone-600' },
  };
  const info = map[status] ?? { label: status, className: 'border-stone-200 bg-stone-100 text-stone-700' };
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
}

function ObligationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    UNPAID: { label: 'Belum Lunas', className: 'border-red-300 bg-red-50 text-red-700' },
    PARTIALLY_PAID: { label: 'Sebagian', className: 'border-amber-300 bg-amber-50 text-amber-800' },
    PAID: { label: 'Lunas', className: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
    OVERDUE: { label: 'Jatuh Tempo', className: 'border-red-400 bg-red-100 text-red-900 font-semibold' },
    CANCELLED: { label: 'Dibatalkan', className: 'border-stone-300 bg-stone-100 text-stone-600' },
  };
  const info = map[status] ?? { label: status, className: 'border-stone-200 bg-stone-100 text-stone-700' };
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile } = useAuth();
  const role = profile?.role;

  if (role === 'ADMIN') return <AdminDashboard />;
  if (role === 'BENDAHARA') return <TreasurerDashboard />;
  return <StudentDashboard />;
}
