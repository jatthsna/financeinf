import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BookOpen,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Search,
  Filter,
  Wallet,
  Building,
  QrCode,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface LedgerEntry {
  id: string;
  date: string;
  refNumber: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  account: string;
  amountIn: number;
  amountOut: number;
  runningBalance?: number;
}

export default function CashBookPage() {
  const { activeYear } = useAcademicYear();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterDateRange, setFilterDateRange] = useState<'ALL' | 'THIS_MONTH' | '30_DAYS'>('ALL');

  // Fetch accounts balances
  const { data: accounts } = useQuery({
    queryKey: ['cash-accounts-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_accounts')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all transactions to form consolidated ledger
  const { data: rawLedger, isLoading } = useQuery({
    queryKey: ['cash-book-ledger', activeYear?.id],
    queryFn: async () => {
      const yearId = activeYear?.id;
      if (!yearId) return [];

      const [paymentsRes, incomesRes, expensesRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount, payment_method, payment_date, receipt_number, created_at, payer:profiles!payer_id(full_name, nim)')
          .eq('academic_year_id', yearId)
          .eq('status', 'APPROVED'),
        supabase
          .from('income_records')
          .select('id, amount, income_category, source_payer, description, created_at, reference_number')
          .eq('academic_year_id', yearId)
          .in('status', ['APPROVED', 'POSTED']),
        supabase
          .from('expenses')
          .select('id, amount, expense_category, vendor_recipient, description, created_at, reference_number')
          .eq('academic_year_id', yearId)
          .in('status', ['APPROVED', 'POSTED']),
      ]);

      const entries: LedgerEntry[] = [];

      // Add payments
      (paymentsRes.data || []).forEach((p: any) => {
        const payerName = p.payer?.full_name ? `${p.payer.full_name} (${p.payer.nim || '-'})` : 'Mahasiswa';
        entries.push({
          id: p.id,
          date: p.payment_date || p.created_at,
          refNumber: p.receipt_number || 'KWT-KAS',
          type: 'INCOME',
          category: 'Iuran Mahasiswa',
          description: `Pembayaran kas oleh ${payerName}`,
          account: p.payment_method === 'QRIS' ? 'QRIS Digital' : 'Kas Tunai Bendahara',
          amountIn: Number(p.amount),
          amountOut: 0,
        });
      });

      // Add other incomes
      (incomesRes.data || []).forEach((inc: any) => {
        entries.push({
          id: inc.id,
          date: inc.created_at,
          refNumber: inc.reference_number || 'INC-REC',
          type: 'INCOME',
          category: inc.income_category || 'Pendapatan Lain',
          description: inc.description || `Penerimaan dari ${inc.source_payer || 'Pihak Ketiga'}`,
          account: 'Kas Prodi',
          amountIn: Number(inc.amount),
          amountOut: 0,
        });
      });

      // Add expenses
      (expensesRes.data || []).forEach((exp: any) => {
        entries.push({
          id: exp.id,
          date: exp.created_at,
          refNumber: exp.reference_number || 'EXP-BBN',
          type: 'EXPENSE',
          category: exp.expense_category || 'Pengeluaran',
          description: exp.description || `Pengeluaran kepada ${exp.vendor_recipient || 'Penerima'}`,
          account: 'Kas Pengeluaran',
          amountIn: 0,
          amountOut: Number(exp.amount),
        });
      });

      // Sort chronologically ascending to calculate running balance
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let currentBal = 0;
      entries.forEach((e) => {
        currentBal += e.amountIn - e.amountOut;
        e.runningBalance = currentBal;
      });

      // Return descending for display
      return entries.reverse();
    },
    enabled: !!activeYear?.id,
  });

  // Calculate totals
  const totalIn = useMemo(() => (rawLedger || []).reduce((acc, cur) => acc + cur.amountIn, 0), [rawLedger]);
  const totalOut = useMemo(() => (rawLedger || []).reduce((acc, cur) => acc + cur.amountOut, 0), [rawLedger]);
  const currentNetBalance = totalIn - totalOut;

  // Filtered ledger
  const filteredLedger = useMemo(() => {
    let list = rawLedger || [];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.refNumber.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'ALL') {
      list = list.filter((e) => e.type === filterType);
    }

    if (filterDateRange === 'THIS_MONTH') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      list = list.filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
    } else if (filterDateRange === '30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      list = list.filter((e) => new Date(e.date) >= thirtyDaysAgo);
    }

    return list;
  }, [rawLedger, search, filterType, filterDateRange]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredLedger.length) return;

    const rows = [
      ['No', 'Tanggal', 'Nomor Bukti', 'Tipe', 'Kategori', 'Keterangan', 'Akun', 'Masuk (Rp)', 'Keluar (Rp)', 'Saldo Berjalan (Rp)'],
      ...filteredLedger.map((e, idx) => [
        idx + 1,
        formatDate(e.date, 'short'),
        e.refNumber,
        e.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
        e.category,
        `"${e.description.replace(/"/g, '""')}"`,
        e.account,
        e.amountIn,
        e.amountOut,
        e.runningBalance ?? 0,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Buku_Kas_Informatika_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Buku Kas & Mutasi Keuangan"
          description={`Buku besar jurnal umum kas masuk dan keluar Prodi Informatika (TA ${activeYear?.year_code || '2026/2027'})`}
        />
        <Button onClick={handleExportCSV} variant="outline" className="border-stone-300 self-start sm:self-auto">
          <Download className="w-4 h-4 mr-2 text-[#174C3C]" /> Export Excel / CSV
        </Button>
      </div>

      {/* Account Balances Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[#174C3C] shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 uppercase">Total Kas Masuk (Debit)</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-2">{formatCurrency(totalIn)}</div>
            <p className="text-[11px] text-stone-400 mt-0.5">Seluruh iuran & donasi disetujui</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 uppercase">Total Kas Keluar (Kredit)</span>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-red-600 mt-2">{formatCurrency(totalOut)}</div>
            <p className="text-[11px] text-stone-400 mt-0.5">Beban operasional & kegiatan</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-xs sm:col-span-2">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase">Saldo Kas Bersih Riil (Net Balance)</span>
              <div className="text-2xl font-black text-[#174C3C] mt-1">{formatCurrency(currentNetBalance)}</div>
              <p className="text-xs text-stone-500">Saldo likuid siap digunakan untuk kegiatan prodi</p>
            </div>
            <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
              <Wallet className="w-4 h-4 text-emerald-700 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-stone-800">Status Likuiditas</p>
                <p className="text-[11px] text-emerald-700 font-medium">{currentNetBalance >= 0 ? 'Surplus / Sehat' : 'Defisit'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-stone-200/80 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Cari transaksi, nomor kwitansi, atau keterangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
              <SelectTrigger className="w-36 text-xs">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Aliran</SelectItem>
                <SelectItem value="INCOME">Pemasukan (Masuk)</SelectItem>
                <SelectItem value="EXPENSE">Pengeluaran (Keluar)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDateRange} onValueChange={(val: any) => setFilterDateRange(val)}>
              <SelectTrigger className="w-36 text-xs">
                <SelectValue placeholder="Semua Tanggal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Waktu</SelectItem>
                <SelectItem value="THIS_MONTH">Bulan Ini</SelectItem>
                <SelectItem value="30_DAYS">30 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card className="border-stone-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h3 className="text-sm font-semibold text-[#191B19]">Jurnal Mutasi Kas Kronologis</h3>
            <p className="text-xs text-stone-500">Menampilkan {filteredLedger.length} mutasi yang tercatat</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
            Realtime Sync
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-stone-500">Memuat mutasi buku kas...</div>
        ) : filteredLedger.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-10 h-10 text-stone-300" />}
            title="Belum ada catatan mutasi kas"
            description="Semua transaksi pembayaran iuran yang disetujui atau pengeluaran yang dicatat akan otomatis muncul di buku kas ini."
          />
        ) : (
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-[#191B19]">Waktu & Ref</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Kategori & Keterangan</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Akun</TableHead>
                <TableHead className="font-semibold text-right text-emerald-800">Masuk (Debit)</TableHead>
                <TableHead className="font-semibold text-right text-red-700">Keluar (Kredit)</TableHead>
                <TableHead className="font-semibold text-right text-[#191B19]">Saldo Berjalan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLedger.map((e) => (
                <TableRow key={e.id} className="hover:bg-stone-50/70 transition-colors">
                  <TableCell className="align-top py-3">
                    <span className="block text-xs font-semibold text-stone-800">{formatDate(e.date, 'short')}</span>
                    <span className="text-[11px] font-mono text-stone-400">{e.refNumber}</span>
                  </TableCell>
                  <TableCell className="align-top py-3 max-w-xs">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge
                        variant="outline"
                        className={
                          e.type === 'INCOME'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]'
                            : 'border-red-200 bg-red-50 text-red-700 text-[10px]'
                        }
                      >
                        {e.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-700 leading-snug">{e.description}</p>
                  </TableCell>
                  <TableCell className="align-top py-3 text-xs text-stone-600">
                    <span className="inline-flex items-center gap-1">
                      {e.account.includes('QRIS') ? (
                        <QrCode className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                      )}
                      {e.account}
                    </span>
                  </TableCell>
                  <TableCell className="align-top py-3 text-right font-mono text-xs font-semibold text-emerald-700">
                    {e.amountIn > 0 ? `+${formatCurrency(e.amountIn)}` : '-'}
                  </TableCell>
                  <TableCell className="align-top py-3 text-right font-mono text-xs font-semibold text-red-600">
                    {e.amountOut > 0 ? `-${formatCurrency(e.amountOut)}` : '-'}
                  </TableCell>
                  <TableCell className="align-top py-3 text-right font-mono text-xs font-bold text-stone-900">
                    {formatCurrency(e.runningBalance ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
