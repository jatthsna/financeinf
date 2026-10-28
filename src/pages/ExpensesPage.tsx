import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RupiahInput } from '@/components/ui/rupiah-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, TrendingDown, AlertCircle, FileText, CheckCircle2, Trash2 } from 'lucide-react';

interface ExpenseItem {
  id: string;
  reference_number: string;
  academic_year_id: string;
  amount: number;
  category: string;
  description: string;
  vendor: string | null;
  account_id: string | null;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
  transaction_date?: string;
  recorded_by: string;
  created_at: string;
  recorder?: {
    full_name: string;
  };
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { activeYear } = useAcademicYear();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    expense_category: 'OPERASIONAL',
    amount: 50000,
    vendor_recipient: '',
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch verified cash balance to warn if over-spending
  const { data: balanceData } = useQuery({
    queryKey: ['available_cash_balance', activeYear?.id],
    queryFn: async () => {
      if (!activeYear?.id) return 0;
      const [incomeRes, expenseRes, cashPaymentsRes] = await Promise.all([
        supabase
          .from('income_records')
          .select('amount')
          .eq('academic_year_id', activeYear.id)
          .in('status', ['APPROVED', 'POSTED']),
        supabase
          .from('expenses')
          .select('amount')
          .eq('academic_year_id', activeYear.id)
          .in('status', ['APPROVED', 'POSTED']),
        supabase
          .from('payments')
          .select('amount')
          .eq('academic_year_id', activeYear.id)
          .eq('status', 'APPROVED'),
      ]);

      const inc = (incomeRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const fee = (cashPaymentsRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const exp = (expenseRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      return inc + fee - exp;
    },
    enabled: !!activeYear?.id,
  });

  // Fetch expenses list
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses_list', activeYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(`
          id,
          reference_number,
          academic_year_id,
          amount,
          category,
          description,
          vendor,
          account_id,
          status,
          transaction_date,
          recorded_by,
          created_at,
          recorder:profiles!recorded_by(full_name)
        `)
        .order('created_at', { ascending: false });

      if (activeYear?.id) {
        query = query.eq('academic_year_id', activeYear.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ExpenseItem[];
    },
    enabled: !!activeYear?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (!activeYear?.id) throw new Error('Tahun akademik belum dipilih');
      if (payload.amount <= 0) throw new Error('Nominal pengeluaran harus lebih besar dari 0');
      if (!payload.description.trim()) throw new Error('Deskripsi keperluan pengeluaran wajib diisi');

      const currentBalance = balanceData || 0;
      if (payload.amount > currentBalance) {
        // Warning rule: allow if authorized, but confirm
        console.warn('Expense amount exceeds current verified cash balance');
      }

      const refNo = `EXP-${Date.now().toString().slice(-6)}`;

      const { error } = await supabase.from('expenses').insert([
        {
          reference_number: refNo,
          transaction_date: new Date().toISOString().split('T')[0],
          academic_year_id: activeYear.id,
          amount: payload.amount,
          category: payload.expense_category,
          vendor: payload.vendor_recipient.trim() || null,
          description: payload.description.trim(),
          status: 'POSTED',
          recorded_by: user?.id,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses_list'] });
      queryClient.invalidateQueries({ queryKey: ['available_cash_balance'] });
      setIsDialogOpen(false);
      setFormData({
        expense_category: 'OPERASIONAL',
        amount: 50000,
        vendor_recipient: '',
        description: '',
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal mencatat pengeluaran kas.');
    },
  });

  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses_list'] });
      queryClient.invalidateQueries({ queryKey: ['available_cash_balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-book-ledger'] });
      setExpenseToDelete(null);
    },
    onError: (err: any) => {
      alert(`Gagal menghapus pengeluaran: ${err.message}`);
    },
  });

  const filteredExpenses = (expenses || []).filter((item) => {
    const v = item.vendor || '';
    const d = item.description || '';
    const r = item.reference_number || '';
    const matchesSearch =
      v.toLowerCase().includes(search.toLowerCase()) ||
      d.toLowerCase().includes(search.toLowerCase()) ||
      r.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'ALL' || item.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const totalSpent = (expenses || [])
    .filter((e) => e.status === 'POSTED' || e.status === 'APPROVED')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengeluaran & Belanja Kas"
        description="Kelola beban operasional prodi, konsumsi rapat, perlengkapan dan pembelanjaan kegiatan mahasiswa."
      >
        <Button
          onClick={() => {
            setFormError(null);
            setIsDialogOpen(true);
          }}
          className="bg-[#174C3C] text-white hover:bg-[#12382c]"
        >
          <Plus className="mr-2 h-4 w-4" /> Catat Pengeluaran Baru
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-stone-200/80 bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Beban Terealisasi ({activeYear?.display_name})
              </p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-50 text-red-600 border border-red-100">
              <TrendingDown className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Saldo Kas Tersedia Saat Ini
              </p>
              <p className="text-2xl font-bold text-[#174C3C] mt-1">
                {formatCurrency(balanceData || 0)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-stone-200/80 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Cari penerima dana / deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Label className="text-xs text-stone-500 shrink-0">Kategori Beban:</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori</SelectItem>
                <SelectItem value="OPERASIONAL">Operasional</SelectItem>
                <SelectItem value="KEGIATAN">Kegiatan</SelectItem>
                <SelectItem value="PERLENGKAPAN">Perlengkapan</SelectItem>
                <SelectItem value="KONSUMSI">Konsumsi</SelectItem>
                <SelectItem value="TRANSPORTASI">Transportasi</SelectItem>
                <SelectItem value="DOKUMENTASI">Dokumentasi</SelectItem>
                <SelectItem value="SEWA">Sewa Tempat/Alat</SelectItem>
                <SelectItem value="LAINNYA">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      {isLoading ? (
        <Card className="border-stone-200/80 bg-white p-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-stone-400" />}
          title="Belum ada transaksi pengeluaran kas"
          description="Catatan belanja perlengkapan, konsumsi, dan biaya operasional akan tampil di sini."
        />
      ) : (
        <Card className="border-stone-200/80 bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-[#191B19]">No. Ref</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Vendor / Penerima</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Kategori</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Deskripsi</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-right">Nominal</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-center">Status</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-center w-16">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((item) => (
                <TableRow key={item.id} className="hover:bg-stone-50/60 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-stone-700">
                    {item.reference_number}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm text-[#191B19]">
                      {item.vendor || 'Pihak Ketiga'}
                    </p>
                    <p className="text-[11px] text-stone-500">{formatDate(item.transaction_date || item.created_at)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-stone-600 max-w-xs truncate">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm text-red-600">
                    -{formatCurrency(item.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]">
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setExpenseToDelete(item)}
                      className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50"
                      title="Hapus Pengeluaran"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Hapus Catatan Pengeluaran
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-600 pt-2">
              Apakah Anda yakin ingin menghapus catatan pengeluaran #{expenseToDelete?.reference_number} ({expenseToDelete?.vendor || 'Pihak Ketiga'}) sebesar{' '}
              <strong>-{formatCurrency(expenseToDelete?.amount || 0)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpenseToDelete(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteExpenseMutation.isPending}
              onClick={() => expenseToDelete && deleteExpenseMutation.mutate(expenseToDelete.id)}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteExpenseMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Expense Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">Catat Pengeluaran Kas</DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Dokumentasikan pengeluaran resmi kas untuk kebutuhan prodi atau kepanitiaan.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          {formData.amount > (balanceData || 0) && (
            <div className="p-3 text-xs rounded-lg bg-amber-50 text-amber-900 border border-amber-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
              <span>
                Peringatan: Nominal pengeluaran melebihi saldo kas tersedia ({formatCurrency(balanceData || 0)}). Pastikan otoritas pengeluaran telah diizinkan.
              </span>
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Kategori Beban *</Label>
                <Select
                  value={formData.expense_category}
                  onValueChange={(val: any) => setFormData({ ...formData, expense_category: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERASIONAL">Operasional</SelectItem>
                    <SelectItem value="KEGIATAN">Kegiatan</SelectItem>
                    <SelectItem value="PERLENGKAPAN">Perlengkapan</SelectItem>
                    <SelectItem value="KONSUMSI">Konsumsi</SelectItem>
                    <SelectItem value="TRANSPORTASI">Transportasi</SelectItem>
                    <SelectItem value="DOKUMENTASI">Dokumentasi</SelectItem>
                    <SelectItem value="SEWA">Sewa Tempat/Alat</SelectItem>
                    <SelectItem value="LAINNYA">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Nominal Belanja (IDR) *</Label>
                <RupiahInput
                  value={formData.amount}
                  onChange={(val) => setFormData({ ...formData, amount: val })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Vendor / Penerima Pembayaran</Label>
              <Input
                placeholder="Contoh: Toko ATK Kampus / Katering Barokah"
                value={formData.vendor_recipient}
                onChange={(e) => setFormData({ ...formData, vendor_recipient: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Deskripsi / Perincian Nota *</Label>
              <Input
                placeholder="Rincian barang/jasa yang dibeli dan keperluannya..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
                className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengeluaran Kas'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
