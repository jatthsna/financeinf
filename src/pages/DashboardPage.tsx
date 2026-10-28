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
  BookOpen,
  MessageCircle,
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ── Admin Dashboard ───────────────────────────────────────────────
function AdminDashboard() {
  const { activeYear } = useAcademicYear();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats', activeYear?.id],
    queryFn: async () => {
      const yearId = activeYear?.id;
      if (!yearId) return null;

      const [paymentsRes, incomeRes, expenseRes, pendingObligationsRes, pendingQrisRes] = await Promise.all([
        supabase
          .from('payments')
          .select('amount')
          .eq('academic_year_id', yearId)
          .eq('status', 'APPROVED'),
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

      const studentFeeIncome = (paymentsRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      );
      const otherIncome = (incomeRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      );
      const totalIncome = studentFeeIncome + otherIncome;
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
        .select('id, amount, payment_method, status, reference_number, created_at, student:profiles!student_id(full_name, nim)')
        .eq('academic_year_id', yearId)
        .order('created_at', { ascending: false })
        .limit(10);

      return (data ?? []).map((p: any) => ({
        ...p,
        receipt_number: p.reference_number,
        payer: p.student,
      }));
    },
    enabled: !!activeYear?.id,
  });

  const { data: topArrears } = useQuery({
    queryKey: ['admin-top-arrears', activeYear?.id],
    queryFn: async () => {
      const yearId = activeYear?.id;
      if (!yearId) return [];
      const { data } = await supabase
        .from('student_obligations')
        .select(`
          id,
          paid_amount,
          remaining_amount,
          deadline,
          status,
          student:profiles!student_id(full_name, nim, phone),
          period:contribution_periods!contribution_period_id(
            amount,
            period_label,
            contribution_type:contribution_types!contribution_type_id(name)
          )
        `)
        .eq('academic_year_id', yearId)
        .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'])
        .order('remaining_amount', { ascending: false })
        .limit(5);

      return (data || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.period?.amount || row.remaining_amount || 0),
        remaining_amount: Number(row.remaining_amount || 0),
        due_date: row.deadline,
        status: row.status,
        student: row.student,
        contribution_type: row.period?.contribution_type || { name: row.period?.period_label || 'Iuran Kas' },
      }));
    },
    enabled: !!activeYear?.id,
  });

  const { data: monthlyChartData } = useQuery({
    queryKey: ['admin-monthly-flow', activeYear?.id],
    queryFn: async () => {
      const yearId = activeYear?.id;
      if (!yearId) return [];

      const [paymentsRes, expensesRes] = await Promise.all([
        supabase
          .from('payments')
          .select('amount, created_at, payment_date')
          .eq('academic_year_id', yearId)
          .eq('status', 'APPROVED'),
        supabase
          .from('expenses')
          .select('amount, created_at')
          .eq('academic_year_id', yearId)
          .in('status', ['APPROVED', 'POSTED']),
      ]);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const now = new Date();
      const result: { month: string; Pemasukan: number; Pengeluaran: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const label = monthNames[m];

        const inc = (paymentsRes.data || [])
          .filter((p: any) => {
            const pd = new Date(p.payment_date || p.created_at);
            return pd.getFullYear() === y && pd.getMonth() === m;
          })
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

        const exp = (expensesRes.data || [])
          .filter((e: any) => {
            const ed = new Date(e.created_at);
            return ed.getFullYear() === y && ed.getMonth() === m;
          })
          .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

        result.push({
          month: label,
          Pemasukan: inc,
          Pengeluaran: exp,
        });
      }

      return result;
    },
    enabled: !!activeYear?.id,
  });

  const handleSendWaReminder = (item: any) => {
    const studentName = item.student?.full_name || 'Mahasiswa';
    const typeName = item.contribution_type?.name || 'Iuran Kas';
    const amountStr = formatCurrency(Number(item.remaining_amount));
    const dueDateStr = item.due_date ? formatDate(item.due_date, 'short') : 'segera';
    const rawPhone = item.student?.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const phone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    const message = encodeURIComponent(
      `*PENGINGAT RESMI KAS INFORMATIKA UNUGHA*\n\n` +
      `Halo Sdr/i *${studentName}*,\n` +
      `Bendahara Kas Prodi Informatika menginfokan bahwa kewajiban iuran *${typeName}* sebesar *${amountStr}* (Jatuh tempo: ${dueDateStr}) belum tercatat lunas.\n\n` +
      `Pembayaran dapat disetorkan secara tunai ke Bendahara atau melalui QRIS resmi di portal prodi:\n` +
      `👉 https://kasinformatika.jat.web.id/\n\n` +
      `_Terima kasih atas partisipasinya demi kelancaran kegiatan mahasiswa._`
    );

    const waUrl = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const totalBilled = (stats?.totalIncome ?? 0) + (stats?.totalTunggakan ?? 0);
  const collectionRate = totalBilled > 0 ? Math.round(((stats?.totalIncome ?? 0) / totalBilled) * 100) : 0;

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Dashboard Administrator"
          description={`Ringkasan eksekutif dan analitik keuangan Prodi Informatika (TA ${activeYear?.year_code || '2026/2027'})`}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" asChild className="border-stone-200">
            <Link to="/buku-kas">
              <BookOpen className="w-4 h-4 mr-1.5 text-[#174C3C]" /> Buku Kas
            </Link>
          </Button>
          <Button size="sm" asChild className="bg-[#174C3C] hover:bg-[#123d30] text-white">
            <Link to="/tagihan">
              <Plus className="w-4 h-4 mr-1.5" /> Terbitkan Tagihan
            </Link>
          </Button>
        </div>
      </div>

      {/* Executive Financial Health & Collection Progress Banner */}
      <Card className="border-stone-200/80 bg-gradient-to-r from-emerald-900 to-[#174C3C] text-white shadow-md overflow-hidden relative">
        <div className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> Status Keuangan: Terkelola & Transparan
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Sistem Kas Program Studi Informatika
            </h2>
            <p className="text-xs md:text-sm text-emerald-100/90 leading-relaxed">
              Total potensi penerimaan kas tahun akademik ini tercatat sebesar{' '}
              <span className="font-bold text-white underline underline-offset-4">{formatCurrency(totalBilled)}</span>. 
              Pantau realisasi pembayaran dan tunggakan secara presisi.
            </p>
          </div>

          <div className="w-full md:w-72 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-100">Capaian Realisasi Iuran</span>
              <span className="text-white text-sm font-black">{collectionRate}%</span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-2.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-200/80 pt-1 border-t border-white/10">
              <span>Masuk: {formatCurrency(stats?.totalIncome ?? 0)}</span>
              <span>Tunggakan: {formatCurrency(stats?.totalTunggakan ?? 0)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pemasukan Kas"
          value={formatCurrency(stats?.totalIncome ?? 0)}
          icon={<TrendingUp className="h-5 w-5 text-emerald-700" />}
          className="border-l-4 border-l-[#174C3C] shadow-xs"
        />
        <StatCard
          title="Total Pengeluaran"
          value={formatCurrency(stats?.totalExpense ?? 0)}
          icon={<TrendingDown className="h-5 w-5 text-red-600" />}
          className="border-l-4 border-l-red-500 shadow-xs"
        />
        <StatCard
          title="Saldo Kas Bersih Riil"
          value={formatCurrency(stats?.balance ?? 0)}
          icon={<Wallet className="h-5 w-5 text-[#174C3C]" />}
          className="border-l-4 border-l-emerald-600 shadow-xs"
        />
        <StatCard
          title="Total Kewajiban Tertunda"
          value={formatCurrency(stats?.totalTunggakan ?? 0)}
          subtitle={`${stats?.pendingQrisCount ?? 0} QRIS menanti verifikasi`}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          className="border-l-4 border-l-amber-500 shadow-xs"
        />
      </div>

      {/* Interactive Charts & Financial Flow */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Cash Flow Chart */}
        <Card className="lg:col-span-2 border-stone-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-[#191B19]">
                Arus Kas Bulanan (Tren Pemasukan vs Beban)
              </CardTitle>
              <p className="text-xs text-stone-500 mt-0.5">Analisis perbandingan kas masuk dan keluar 6 bulan terakhir</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0ed" />
                  <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val: any) => `Rp${Number(val) / 1000}k`} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e2dd', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Pemasukan" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPemasukan)" />
                  <Area type="monotone" dataKey="Pengeluaran" stroke="#dc2626" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPengeluaran)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Operations & Shortcuts */}
        <Card className="border-stone-200/80 bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#191B19]">
              Menu Operasional Utama
            </CardTitle>
            <p className="text-xs text-stone-500">Akses cepat tugas bendahara & administrator</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Button variant="outline" className="w-full justify-start border-stone-200 hover:bg-emerald-50/60 hover:border-emerald-200 text-xs" asChild>
              <Link to="/pembayaran">
                <CreditCard className="mr-2.5 h-4 w-4 text-[#174C3C]" /> Verifikasi Pembayaran & QRIS
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start border-stone-200 hover:bg-emerald-50/60 hover:border-emerald-200 text-xs" asChild>
              <Link to="/tagihan">
                <FileText className="mr-2.5 h-4 w-4 text-[#174C3C]" /> Terbitkan Tagihan Massal
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start border-stone-200 hover:bg-emerald-50/60 hover:border-emerald-200 text-xs" asChild>
              <Link to="/buku-kas">
                <BookOpen className="mr-2.5 h-4 w-4 text-[#174C3C]" /> Buka Buku Kas & Mutasi
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start border-stone-200 hover:bg-emerald-50/60 hover:border-emerald-200 text-xs" asChild>
              <Link to="/pengeluaran">
                <Plus className="mr-2.5 h-4 w-4 text-[#174C3C]" /> Catat Beban Pengeluaran
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start border-stone-200 hover:bg-emerald-50/60 hover:border-emerald-200 text-xs" asChild>
              <Link to="/laporan">
                <TrendingUp className="mr-2.5 h-4 w-4 text-[#174C3C]" /> Laporan Pertanggungjawaban (PDF)
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Top Arrears (with WhatsApp Action) + Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Pending Arrears with WhatsApp Reminder */}
        <Card className="border-stone-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-[#191B19]">
                Tunggakan Terbesar Mahasiswa
              </CardTitle>
              <p className="text-xs text-stone-500 mt-0.5">Kirim pengingat resmi langsung ke kontak WhatsApp mahasiswa</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tagihan">
                Semua Tagihan <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!topArrears?.length ? (
              <EmptyState
                icon={<CheckCircle2 className="h-9 w-9 text-emerald-600" />}
                title="Semua kewajiban tertib"
                description="Tidak ada tunggakan mahasiswa yang belum diselesaikan pada periode aktif ini."
              />
            ) : (
              <div className="space-y-3">
                {topArrears.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-stone-200/80 p-3 bg-stone-50/40 gap-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#191B19]">
                          {item.student?.full_name || 'Mahasiswa'}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          {item.student?.nim || '-'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {item.contribution_type?.name} · Jatuh Tempo: {item.due_date ? formatDate(item.due_date, 'short') : '-'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-0 border-stone-200/60">
                      <span className="text-xs font-bold font-mono text-red-600">
                        {formatCurrency(Number(item.remaining_amount))}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleSendWaReminder(item)}
                        className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        title="Kirim pengingat format resmi via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" /> Ingatkan WA
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-stone-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-[#191B19]">
                Transaksi Masuk Terbaru
              </CardTitle>
              <p className="text-xs text-stone-500 mt-0.5">Riwayat setoran kas dan QRIS terakhir</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pembayaran">
                Lihat Semua <ArrowRight className="ml-1 h-3.5 w-3.5" />
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
                icon={<FileText className="h-9 w-9 text-stone-400" />}
                title="Belum ada transaksi"
                description="Catatan pembayaran kas dan QRIS terbaru akan otomatis tersinkronisasi di sini."
              />
            ) : (
              <div className="space-y-2.5">
                {recentTransactions.slice(0, 5).map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-stone-200/80 p-3 bg-stone-50/40"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#191B19]">
                        {tx.payer?.full_name ?? tx.profiles?.full_name ?? 'Mahasiswa'}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {formatDate(tx.created_at, 'with-time')} · {tx.payment_method} · {tx.receipt_number || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#191B19] font-mono">
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
        .select('id, amount, payment_date, reference_number, created_at, student:profiles!student_id(full_name, nim)')
        .eq('academic_year_id', yearId)
        .eq('payment_method', 'QRIS')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(5);

      return (data ?? []).map((p: any) => ({
        ...p,
        receipt_number: p.reference_number,
        payer: p.student,
      }));
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
                      {p.payer?.full_name ?? p.profiles?.full_name ?? 'Mahasiswa'} {p.payer?.nim ?? p.profiles?.nim ? `(${p.payer?.nim ?? p.profiles?.nim})` : ''}
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
          .select('paid_amount, remaining_amount')
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
          .eq('student_id', userId)
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
        .select(`
          id,
          paid_amount,
          remaining_amount,
          deadline,
          status,
          period:contribution_periods!contribution_period_id(
            amount,
            period_label,
            contribution_type:contribution_types!contribution_type_id(name)
          )
        `)
        .eq('student_id', userId)
        .eq('academic_year_id', yearId)
        .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'])
        .order('deadline', { ascending: true })
        .limit(5);

      return (data ?? []).map((row: any) => ({
        id: row.id,
        amount: Number(row.period?.amount || row.remaining_amount || 0),
        paid_amount: Number(row.paid_amount || 0),
        remaining_amount: Number(row.remaining_amount || 0),
        due_date: row.deadline,
        status: row.status,
        contribution_types: row.period?.contribution_type || { name: row.period?.period_label || 'Iuran Kas' },
      }));
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
        .select('id, amount, payment_method, status, reference_number, created_at')
        .eq('student_id', userId)
        .eq('academic_year_id', yearId)
        .order('created_at', { ascending: false })
        .limit(5);

      return (data ?? []).map((p: any) => ({
        ...p,
        receipt_number: p.reference_number,
      }));
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
