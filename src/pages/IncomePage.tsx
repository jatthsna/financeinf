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
import { Plus, Search, TrendingUp, CheckCircle2, FileText, Trash2 } from 'lucide-react';

interface IncomeItem {
  id: string;
  reference_number: string;
  academic_year_id: string;
  amount: number;
  category: string;
  source: string | null;
  description: string;
  date?: string;
  status: string;
  recorded_by?: string;
  created_at: string;
  recorder?: {
    full_name: string;
  };
}

export default function IncomePage() {
  const queryClient = useQueryClient();
  const { activeYear } = useAcademicYear();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    source_payer: '',
    income_category: 'DONASI',
    amount: 100000,
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch legitimate other income records
  const { data: incomeList, isLoading } = useQuery({
    queryKey: ['income_records', activeYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('income_records')
        .select(`
          id,
          reference_number,
          academic_year_id,
          amount,
          category,
          source,
          description,
          status,
          date,
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
      return (data || []) as unknown as IncomeItem[];
    },
    enabled: !!activeYear?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (!activeYear?.id) throw new Error('Tahun akademik belum dipilih');
      if (!payload.source_payer.trim()) throw new Error('Sumber / Pihak pembayar wajib diisi');
      if (payload.amount <= 0) throw new Error('Nominal pendapatan harus lebih dari Rp 0');
      if (!payload.description.trim()) throw new Error('Deskripsi pendapatan wajib diisi');

      const refNo = `INC-${Date.now().toString().slice(-6)}`;

      const { error } = await supabase.from('income_records').insert([
        {
          reference_number: refNo,
          date: new Date().toISOString().split('T')[0],
          academic_year_id: activeYear.id,
          amount: payload.amount,
          category: payload.income_category,
          source: payload.source_payer.trim(),
          description: payload.description.trim(),
          status: 'POSTED',
          recorded_by: user?.id,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income_records'] });
      setIsDialogOpen(false);
      setFormData({
        source_payer: '',
        income_category: 'DONASI',
        amount: 100000,
        description: '',
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal menyimpan catatan pendapatan');
    },
  });

  const [incomeToDelete, setIncomeToDelete] = useState<IncomeItem | null>(null);

  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('income_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income_records'] });
      queryClient.invalidateQueries({ queryKey: ['cash-book-ledger'] });
      setIncomeToDelete(null);
    },
    onError: (err: any) => {
      alert(`Gagal menghapus pendapatan: ${err.message}`);
    },
  });

  const filteredIncome = (incomeList || []).filter((item) => {
    const src = item.source || '';
    const desc = item.description || '';
    const ref = item.reference_number || '';
    const matchesSearch =
      src.toLowerCase().includes(search.toLowerCase()) ||
      desc.toLowerCase().includes(search.toLowerCase()) ||
      ref.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'ALL' || item.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const totalVerifiedIncome = (incomeList || [])
    .filter((i) => i.status === 'POSTED' || i.status === 'APPROVED')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendapatan Non-Iuran"
        description="Kelola pencatatan donasi alumni, sponsorship kegiatan, dan pendapatan sah di luar iuran mahasiswa."
      >
        <Button
          onClick={() => {
            setFormError(null);
            setIsDialogOpen(true);
          }}
          className="bg-[#174C3C] text-white hover:bg-[#12382c]"
        >
          <Plus className="mr-2 h-4 w-4" /> Catat Pendapatan Baru
        </Button>
      </PageHeader>

      {/* Summary card */}
      <Card className="border-stone-200/80 bg-white">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Total Pendapatan Terverifikasi ({activeYear?.display_name})
            </p>
            <p className="text-2xl font-bold text-[#174C3C] mt-1">
              {formatCurrency(totalVerifiedIncome)}
            </p>
          </div>
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            <TrendingUp className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="border-stone-200/80 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Cari sumber donatur / uraian..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Label className="text-xs text-stone-500 shrink-0">Kategori:</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori</SelectItem>
                <SelectItem value="DONASI">Donasi Alumni / Dosen</SelectItem>
                <SelectItem value="SPONSOR">Sponsorship</SelectItem>
                <SelectItem value="PENDAPATAN_KEGIATAN">Hasil Acara / Seminar</SelectItem>
                <SelectItem value="LAINNYA">Lain-lain</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Income Table */}
      {isLoading ? (
        <Card className="border-stone-200/80 bg-white p-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : filteredIncome.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-stone-400" />}
          title="Belum ada catatan pendapatan non-iuran"
          description="Catat dana masuk dari donasi pihak luar, sponsor, atau penjualan merchandise kegiatan di sini."
        />
      ) : (
        <Card className="border-stone-200/80 bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-[#191B19]">No. Referensi</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Sumber / Donatur</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Kategori</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Deskripsi</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-right">Nominal</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-center">Status</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-center w-16">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncome.map((item) => (
                <TableRow key={item.id} className="hover:bg-stone-50/60 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-[#174C3C]">
                    {item.reference_number}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm text-[#191B19]">{item.source || 'Umum'}</p>
                    <p className="text-[11px] text-stone-500">{formatDate(item.date || item.created_at)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-stone-600 max-w-xs truncate">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm text-[#174C3C]">
                    +{formatCurrency(item.amount)}
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
                      onClick={() => setIncomeToDelete(item)}
                      className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50"
                      title="Hapus Pendapatan"
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
      <Dialog open={!!incomeToDelete} onOpenChange={(open) => !open && setIncomeToDelete(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Hapus Catatan Pendapatan
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-600 pt-2">
              Apakah Anda yakin ingin menghapus catatan pendapatan #{incomeToDelete?.reference_number} ({incomeToDelete?.source}) sebesar{' '}
              <strong>+{formatCurrency(incomeToDelete?.amount || 0)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIncomeToDelete(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteIncomeMutation.isPending}
              onClick={() => incomeToDelete && deleteIncomeMutation.mutate(incomeToDelete.id)}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteIncomeMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Income Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">Catat Pendapatan Baru</DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Penerimaan dana resmi institusi di luar iuran wajib mahasiswa.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Sumber / Pihak Pemberi Dana *</Label>
              <Input
                placeholder="Contoh: Ikatan Alumni Informatika / PT Sponsor"
                value={formData.source_payer}
                onChange={(e) => setFormData({ ...formData, source_payer: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Kategori *</Label>
                <Select
                  value={formData.income_category}
                  onValueChange={(val: any) => setFormData({ ...formData, income_category: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DONASI">Donasi</SelectItem>
                    <SelectItem value="SPONSOR">Sponsor</SelectItem>
                    <SelectItem value="PENDAPATAN_KEGIATAN">Pendapatan Acara</SelectItem>
                    <SelectItem value="LAINNYA">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Nominal (IDR) *</Label>
                <RupiahInput
                  value={formData.amount}
                  onChange={(val) => setFormData({ ...formData, amount: val })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Deskripsi / Peruntukan *</Label>
              <Input
                placeholder="Penjelasan sumber dan tujuan penggunaan dana..."
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
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pendapatan'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
