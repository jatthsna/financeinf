import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  LogIn,
  LayoutDashboard,
  Printer,
  Sparkles,
  PieChart,
  BarChart3,
  Receipt,
  Download,
} from 'lucide-react';
import logoImg from '@/assets/logo.jpg';

interface PublicOverviewData {
  academic_year_id?: string;
  academic_year_name?: string;
  total_income: number;
  student_payments: number;
  other_income: number;
  total_expenses: number;
  cash_balance: number;
  total_obligations: number;
  total_obligations_paid: number;
  compliance_rate: number;
  student_count: number;
  recent_expenses: Array<{
    id: string;
    reference_number: string;
    transaction_date: string;
    expense_category: string;
    description: string;
    amount: number;
    vendor_recipient: string | null;
    created_at: string;
  }>;
  recent_income: Array<{
    id: string;
    reference_number: string;
    date: string;
    income_category: string;
    description: string;
    amount: number;
    source_payer: string | null;
    created_at: string;
  }>;
  expense_categories: Array<{
    category: string;
    count: number;
    total_amount: number;
  }>;
  activities: Array<{
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string | null;
    status: string;
    total_budget: number;
  }>;
}

export default function PublicTransparencyPage() {
  const { user, profile } = useAuth();
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expenses'>('all');

  // 1. Fetch available Academic Years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['public-academic-years'],
    queryFn: async () => {
      const { data } = await supabase
        .from('academic_years')
        .select('id, year_code, display_name, status')
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

  // Default to active year if not selected
  const activeYearObj = useMemo(() => {
    if (selectedYearId) {
      return academicYears.find((y) => y.id === selectedYearId) || academicYears[0];
    }
    return academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0];
  }, [academicYears, selectedYearId]);

  const targetYearId = activeYearObj?.id;

  // 2. Fetch Public Overview via secure RPC or fallback direct calculations
  const { data: overview, isLoading } = useQuery<PublicOverviewData>({
    queryKey: ['public-financial-overview', targetYearId],
    queryFn: async () => {
      try {
        // Try calling the optimized public RPC function first
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_public_financial_overview',
          { p_academic_year_id: targetYearId || null }
        );

        if (!rpcError && rpcData) {
          return rpcData as PublicOverviewData;
        }
      } catch {
        // Fallback to direct aggregation if RPC is pending migration
      }

      // Safe fallback calculation
      const [incomeRes, expenseRes, studentPaymentsRes, obligationsRes, activitiesRes] =
        await Promise.all([
          supabase
            .from('income_records')
            .select('id, reference_number, date, income_category, description, amount, source_payer, created_at')
            .eq(targetYearId ? 'academic_year_id' : 'id', targetYearId || '')
            .in('status', ['APPROVED', 'POSTED']),
          supabase
            .from('expenses')
            .select('id, reference_number, transaction_date, expense_category, description, amount, vendor_recipient, created_at')
            .eq(targetYearId ? 'academic_year_id' : 'id', targetYearId || '')
            .in('status', ['APPROVED', 'POSTED']),
          supabase
            .from('payments')
            .select('amount')
            .eq(targetYearId ? 'academic_year_id' : 'id', targetYearId || '')
            .eq('status', 'APPROVED'),
          supabase
            .from('student_obligations')
            .select('amount, paid_amount')
            .eq(targetYearId ? 'academic_year_id' : 'id', targetYearId || ''),
          supabase
            .from('activities')
            .select('id, name, description, start_date, end_date, status, total_budget')
            .eq(targetYearId ? 'academic_year_id' : 'id', targetYearId || '')
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

      const otherIncome = (incomeRes.data ?? []).reduce(
        (acc, r) => acc + Number(r.amount || 0),
        0
      );
      const studentPayments = (studentPaymentsRes.data ?? []).reduce(
        (acc, r) => acc + Number(r.amount || 0),
        0
      );
      const totalIncome = otherIncome + studentPayments;
      const totalExpenses = (expenseRes.data ?? []).reduce(
        (acc, r) => acc + Number(r.amount || 0),
        0
      );
      const cashBalance = totalIncome - totalExpenses;

      const totalObligations = (obligationsRes.data ?? []).reduce(
        (acc, r) => acc + Number(r.amount || 0),
        0
      );
      const totalObligationsPaid = (obligationsRes.data ?? []).reduce(
        (acc, r) => acc + Number(r.paid_amount || 0),
        0
      );
      const complianceRate =
        totalObligations > 0
          ? Math.round((totalObligationsPaid / totalObligations) * 1000) / 10
          : 100;

      // Group expense categories
      const categoryMap = new Map<string, { count: number; total_amount: number }>();
      (expenseRes.data ?? []).forEach((e) => {
        const cat = e.expense_category || 'OPERASIONAL';
        const cur = categoryMap.get(cat) || { count: 0, total_amount: 0 };
        categoryMap.set(cat, {
          count: cur.count + 1,
          total_amount: cur.total_amount + Number(e.amount || 0),
        });
      });

      const expenseCategories = Array.from(categoryMap.entries()).map(([cat, val]) => ({
        category: cat,
        count: val.count,
        total_amount: val.total_amount,
      }));

      return {
        academic_year_id: targetYearId,
        academic_year_name: activeYearObj?.display_name || 'Tahun Akademik Berjalan',
        total_income: totalIncome,
        student_payments: studentPayments,
        other_income: otherIncome,
        total_expenses: totalExpenses,
        cash_balance: cashBalance,
        total_obligations: totalObligations,
        total_obligations_paid: totalObligationsPaid,
        compliance_rate: complianceRate,
        student_count: 26,
        recent_expenses: (expenseRes.data || []) as any,
        recent_income: (incomeRes.data || []) as any,
        expense_categories: expenseCategories,
        activities: (activitiesRes.data || []) as any,
      };
    },
    enabled: true,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F7F7F4] text-[#191B19] font-sans selection:bg-[#DDE8DF]">
      {/* ── Top Header Navigation ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80 px-4 lg:px-8 py-3 transition-all print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white p-1 border border-stone-200/80 shadow-xs flex items-center justify-center shrink-0">
              <img
                src={logoImg}
                alt="Logo UNUGHA Cilacap"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-[#174C3C]">
                  KAS INFORMATIKA
                </span>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                >
                  Portal Publik
                </Badge>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">
                Program Studi Informatika · Universitas Nahdlatul Ulama Al Ghazali Cilacap
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="hidden md:inline-flex border-stone-200 hover:bg-stone-50 text-xs text-stone-700"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Cetak Rekap
            </Button>

            {user ? (
              <Button
                asChild
                size="sm"
                className="bg-[#174C3C] hover:bg-[#12382c] text-white text-xs font-semibold shadow-xs"
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                  Dashboard Saya ({profile?.role || 'User'})
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold border-stone-300 text-stone-800 hover:bg-stone-100"
                >
                  <Link to="/register">Daftar</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-[#174C3C] hover:bg-[#12382c] text-white text-xs font-semibold shadow-xs"
                >
                  <Link to="/login">
                    <LogIn className="h-3.5 w-3.5 mr-1.5" />
                    Masuk Akun
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Official Printable Header (Visible Only on Print) ─────────────── */}
      <div className="hidden print:block p-8 border-b-2 border-stone-800 text-center mb-6">
        <h2 className="text-xl font-bold uppercase tracking-wide">
          UNIVERSITAS NAHDLATUL ULAMA AL GHAZALI (UNUGHA) CILACAP
        </h2>
        <h3 className="text-lg font-semibold uppercase text-stone-800">
          PROGRAM STUDI INFORMATIKA - BADAN PENGELOLA KAS
        </h3>
        <p className="text-xs text-stone-600 mt-1">
          Laporan Rekapitulasi Transparansi & Akuntabilitas Keuangan Kas Mahasiswa
        </p>
        <p className="text-[11px] text-stone-500 mt-0.5">
          Tahun Akademik: {overview?.academic_year_name || '2026/2027'} · Dicetak Tanggal:{' '}
          {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
        </p>
      </div>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#174C3C] via-[#12382c] to-[#0d271f] text-white p-6 sm:p-8 lg:p-10 shadow-lg">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              Sistem Keuangan Terbuka & Akuntabel
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              Transparansi Keuangan Program Studi Informatika
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
              Memastikan seluruh penerimaan iuran kas mahasiswa, kontribusi kegiatan, dan alokasi
              belanja operasional tercatat secara real-time, dapat dipantau bersama, dan diaudit
              dengan integritas tinggi.
            </p>
          </div>

          {/* Academic Year Selector Bar */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-300" />
              <span className="text-emerald-100 font-medium">Tahun Akademik:</span>
              <select
                value={selectedYearId || activeYearObj?.id || ''}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-400 cursor-pointer"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id} className="text-stone-900 bg-white">
                    {ay.display_name} {ay.status === 'ACTIVE' ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-emerald-200/80">
              Sinkronisasi data langsung dengan Supabase PostgreSQL
            </div>
          </div>

          {/* Subtle background glow effect */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* ── 4 Primary Financial KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Kas Resmi */}
          <Card className="border-stone-200/80 bg-white shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Saldo Kas Tersedia
              </span>
              <div className="h-9 w-9 rounded-lg bg-emerald-100 text-[#174C3C] flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-[#174C3C]">
                {isLoading ? '...' : formatCurrency(overview?.cash_balance ?? 0)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Net kas fisik dan rekening terverifikasi
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Total Pemasukan Terverifikasi */}
          <Card className="border-stone-200/80 bg-white shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Penerimaan Kas
              </span>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-stone-900">
                {isLoading ? '...' : formatCurrency(overview?.total_income ?? 0)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Iuran Mahasiswa + Donasi & Sumber Lain
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Total Pengeluaran Sah */}
          <Card className="border-stone-200/80 bg-white shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Realisasi Belanja Kas
              </span>
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                <TrendingDown className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-stone-900">
                {isLoading ? '...' : formatCurrency(overview?.total_expenses ?? 0)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Pengeluaran kegiatan & operasional sah
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Kepatuhan Iuran */}
          <Card className="border-stone-200/80 bg-white shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Tingkat Kepatuhan Iuran
              </span>
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-blue-900">
                {isLoading ? '...' : `${overview?.compliance_rate ?? 100}%`}
              </div>
              <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-[#174C3C] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, overview?.compliance_rate ?? 0)}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1.5">
                Kewajiban terbayar dari {overview?.student_count ?? 26} mahasiswa
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Interactive Financial Charts Section ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visualizer: Cash Flow Comparison */}
          <Card className="lg:col-span-2 border-stone-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-[#191B19] flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#174C3C]" />
                    Perbandingan Arus Kas Tahun Berjalan
                  </CardTitle>
                  <CardDescription className="text-xs text-stone-500 mt-0.5">
                    Rasio total penerimaan kas berbanding total belanja yang diserap
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-[#174C3C]" />
                    <span className="text-stone-600 font-medium">Pemasukan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-amber-600" />
                    <span className="text-stone-600 font-medium">Pengeluaran</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Visual Horizontal Ratio Bars */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-stone-700">Total Pemasukan Kas</span>
                    <span className="text-[#174C3C]">
                      {formatCurrency(overview?.total_income ?? 0)}
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-lg h-5 overflow-hidden flex">
                    <div
                      className="bg-[#174C3C] h-full transition-all duration-500 flex items-center justify-end px-2 text-[10px] text-white font-bold"
                      style={{
                        width: `${
                          overview && overview.total_income + overview.total_expenses > 0
                            ? Math.max(
                                10,
                                Math.min(
                                  100,
                                  (overview.total_income /
                                    (overview.total_income + overview.total_expenses)) *
                                    100
                                )
                              )
                            : 50
                        }%`,
                      }}
                    >
                      Pemasukan
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-stone-700">Total Pengeluaran Kas</span>
                    <span className="text-amber-700">
                      {formatCurrency(overview?.total_expenses ?? 0)}
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-lg h-5 overflow-hidden flex">
                    <div
                      className="bg-amber-600 h-full transition-all duration-500 flex items-center justify-end px-2 text-[10px] text-white font-bold"
                      style={{
                        width: `${
                          overview && overview.total_income + overview.total_expenses > 0
                            ? Math.max(
                                10,
                                Math.min(
                                  100,
                                  (overview.total_expenses /
                                    (overview.total_income + overview.total_expenses)) *
                                    100
                                )
                              )
                            : 50
                        }%`,
                      }}
                    >
                      Pengeluaran
                    </div>
                  </div>
                </div>
              </div>

              {/* Composition Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-stone-100 text-xs">
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80">
                  <span className="text-stone-500 block text-[10px] font-medium">Iuran Mahasiswa</span>
                  <span className="font-bold text-stone-900 block mt-0.5">
                    {formatCurrency(overview?.student_payments ?? 0)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80">
                  <span className="text-stone-500 block text-[10px] font-medium">Dana Sponsor & Lain</span>
                  <span className="font-bold text-stone-900 block mt-0.5">
                    {formatCurrency(overview?.other_income ?? 0)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 col-span-2 sm:col-span-1">
                  <span className="text-stone-500 block text-[10px] font-medium">Rasio Serapan Belanja</span>
                  <span className="font-bold text-stone-900 block mt-0.5">
                    {overview && overview.total_income > 0
                      ? `${Math.round((overview.total_expenses / overview.total_income) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense Categories Breakdown */}
          <Card className="border-stone-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#191B19] flex items-center gap-2">
                <PieChart className="h-4 w-4 text-[#174C3C]" />
                Kategori Belanja
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Alokasi penggunaan kas berdasarkan peruntukan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview?.expense_categories && overview.expense_categories.length > 0 ? (
                <div className="space-y-3">
                  {overview.expense_categories.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-stone-700 capitalize">
                          {item.category.toLowerCase().replace('_', ' ')}
                        </span>
                        <span className="font-semibold text-stone-900">
                          {formatCurrency(item.total_amount)}
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#174C3C] h-1.5 rounded-full"
                          style={{
                            width: `${
                              overview.total_expenses > 0
                                ? Math.min(100, (item.total_amount / overview.total_expenses) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-stone-400 space-y-2">
                  <Receipt className="h-8 w-8 mx-auto stroke-1" />
                  <p className="text-xs">Belum ada pos pengeluaran yang dibukukan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Activities & Program Anggaran ─────────────────────────────────── */}
        <Card className="border-stone-200/80 bg-white shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#191B19] flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#174C3C]" />
                Program Kerja & Anggaran Kegiatan
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Pagu dana kas yang dialokasikan untuk kegiatan mahasiswa
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-stone-50 border-stone-200">
              {overview?.activities?.length ?? 0} Kegiatan
            </Badge>
          </CardHeader>
          <CardContent>
            {overview?.activities && overview.activities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {overview.activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-stone-50 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-stone-900 leading-snug">{act.name}</h4>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold uppercase px-1.5 py-0"
                      >
                        {act.status}
                      </Badge>
                    </div>
                    {act.description && (
                      <p className="text-[11px] text-stone-500 line-clamp-2">{act.description}</p>
                    )}
                    <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between text-xs">
                      <span className="text-stone-500 text-[11px]">Pagu Anggaran:</span>
                      <span className="font-bold text-[#174C3C]">
                        {formatCurrency(act.total_budget || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-stone-400 space-y-1.5">
                <Layers className="h-8 w-8 mx-auto stroke-1" />
                <p className="text-xs">Belum ada agenda kegiatan yang disahkan pada tahun akademik ini.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Public Ledger: Recent Verified Transactions ──────────────────── */}
        <Card className="border-stone-200/80 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-[#191B19] flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#174C3C]" />
                  Buku Kas Terbuka (Catatan Transaksi Terverifikasi)
                </CardTitle>
                <CardDescription className="text-xs text-stone-500">
                  Riwayat transaksi kas yang telah diaudit dan dinyatakan sah
                </CardDescription>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('income')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'income'
                      ? 'bg-white text-[#174C3C] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Penerimaan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('expenses')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'expenses'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Pengeluaran
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-semibold bg-stone-50/50">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">No. Referensi</th>
                    <th className="py-2.5 px-3">Deskripsi / Peruntukan</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {/* Incomes */}
                  {(activeTab === 'all' || activeTab === 'income') &&
                    overview?.recent_income?.map((inc) => (
                      <tr key={`inc-${inc.id}`} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-stone-600 whitespace-nowrap">
                          {formatDate(inc.date || inc.created_at)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                          {inc.reference_number}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-900">
                          {inc.description}
                          {inc.source_payer && (
                            <span className="block text-[11px] text-stone-500">
                              Sumber: {inc.source_payer}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                            Penerimaan
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                          +{formatCurrency(Number(inc.amount))}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Sah / Terverifikasi
                          </span>
                        </td>
                      </tr>
                    ))}

                  {/* Expenses */}
                  {(activeTab === 'all' || activeTab === 'expenses') &&
                    overview?.recent_expenses?.map((exp) => (
                      <tr key={`exp-${exp.id}`} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-stone-600 whitespace-nowrap">
                          {formatDate(exp.transaction_date || exp.created_at)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                          {exp.reference_number}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-900">
                          {exp.description}
                          {exp.vendor_recipient && (
                            <span className="block text-[11px] text-stone-500">
                              Penerima: {exp.vendor_recipient}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 capitalize">
                            {exp.expense_category?.toLowerCase().replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-700 whitespace-nowrap">
                          -{formatCurrency(Number(exp.amount))}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-800">
                            Disetujui
                          </span>
                        </td>
                      </tr>
                    ))}

                  {/* Empty State */}
                  {(!overview?.recent_income?.length && !overview?.recent_expenses?.length) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        Belum ada riwayat transaksi yang tercatat untuk periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Student / Staff Call To Action ─────────────────────────────────── */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs print:hidden">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-lg font-bold text-[#191B19]">
              Anda Mahasiswa atau Pengurus Kas Informatika?
            </h3>
            <p className="text-xs text-stone-600 max-w-xl">
              Masuk ke akun Anda untuk mengecek riwayat tagihan iuran, melakukan konfirmasi transfer
              QRIS, mengunduh bukti kuitansi digital, atau mencatat pembukuan kas.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <Button asChild className="bg-[#174C3C] hover:bg-[#12382c] text-white font-semibold">
                <Link to="/dashboard">
                  Buka Dashboard Saya <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="bg-[#174C3C] hover:bg-[#12382c] text-white font-semibold">
                <Link to="/login">
                  Masuk ke Portal Mahasiswa <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-12 border-t border-stone-200 bg-white py-6 px-4 text-center text-xs text-stone-500 print:hidden">
        <p className="font-medium text-stone-700">
          KAS INFORMATIKA · Sistem Manajemen Keuangan Program Studi Informatika
        </p>
        <p className="text-[11px] mt-1 text-stone-400">
          Universitas Nahdlatul Ulama Al Ghazali Cilacap · Dikembangkan secara profesional & transparan
        </p>
      </footer>
    </div>
  );
}
