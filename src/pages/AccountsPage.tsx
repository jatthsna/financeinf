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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Building, Plus, Wallet, ArrowRightLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

interface CashAccount {
  id: string;
  account_name: string;
  account_type: 'CASH' | 'BANK' | 'QRIS';
  account_number: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { activeYear } = useAcademicYear();
  const { user, isStaff } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'CASH' as const,
    account_number: '',
    opening_balance: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch configured accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['cash_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_accounts')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as CashAccount[];
    },
  });

  // Fetch system-wide totals for reconciliation
  const { data: reconciliation } = useQuery({
    queryKey: ['system_reconciliation', activeYear?.id],
    queryFn: async () => {
      if (!activeYear?.id) return null;

      const [cashPaymentsRes, incomeRes, expenseRes] = await Promise.all([
        supabase
          .from('payments')
          .select('amount')
          .eq('academic_year_id', activeYear.id)
          .eq('status', 'APPROVED'),
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
      ]);

      const studentFeeReceived = (cashPaymentsRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      const otherIncome = (incomeRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      const totalExpenses = (expenseRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );

      const netCashBalance = studentFeeReceived + otherIncome - totalExpenses;

      return {
        studentFeeReceived,
        otherIncome,
        totalExpenses,
        netCashBalance,
      };
    },
    enabled: !!activeYear?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (!payload.account_name.trim()) throw new Error('Nama rekening atau dompet wajib diisi');

      const { error } = await supabase.from('cash_accounts').insert([
        {
          account_name: payload.account_name.trim(),
          account_type: payload.account_type,
          account_number: payload.account_number.trim() || null,
          opening_balance: payload.opening_balance,
          current_balance: payload.opening_balance,
          is_active: true,
          created_by: user?.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash_accounts'] });
      setIsDialogOpen(false);
      setFormData({
        account_name: '',
        account_type: 'CASH',
        account_number: '',
        opening_balance: 0,
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal menyimpan rekening/kas');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekening Kas & Rekonsiliasi"
        description="Kelola akun kas tunai fisik, rekening perbankan prodi, dan pembuktian rekonsiliasi saldo buku."
      >
        {isStaff && (
          <Button
            onClick={() => {
              setFormError(null);
              setIsDialogOpen(true);
            }}
            className="bg-[#174C3C] text-white hover:bg-[#12382c]"
          >
            <Plus className="mr-2 h-4 w-4" /> Tambah Akun Rekening/Kas
          </Button>
        )}
      </PageHeader>

      {/* Reconciliation Summary Card */}
      <Card className="border-stone-200/80 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#174C3C]" />
            <CardTitle className="text-base font-bold text-[#191B19]">
              Ringkasan Rekonsiliasi Kas ({activeYear?.display_name})
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-stone-500">
            Kalkulasi mutasi bersih dari transaksi yang sah terverifikasi tanpa klaim mengambang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4 rounded-xl bg-stone-50 p-4 border border-stone-200 text-xs">
            <div>
              <span className="text-stone-500 block uppercase font-semibold text-[10px]">
                Iuran Mahasiswa Masuk
              </span>
              <p className="text-base font-bold text-emerald-800 mt-1">
                +{formatCurrency(reconciliation?.studentFeeReceived || 0)}
              </p>
            </div>
            <div>
              <span className="text-stone-500 block uppercase font-semibold text-[10px]">
                Pendapatan Sah Lainnya
              </span>
              <p className="text-base font-bold text-emerald-800 mt-1">
                +{formatCurrency(reconciliation?.otherIncome || 0)}
              </p>
            </div>
            <div>
              <span className="text-stone-500 block uppercase font-semibold text-[10px]">
                Pengeluaran Terverifikasi
              </span>
              <p className="text-base font-bold text-red-600 mt-1">
                -{formatCurrency(reconciliation?.totalExpenses || 0)}
              </p>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-stone-200 pt-3 sm:pt-0 sm:pl-4">
              <span className="text-stone-700 block uppercase font-bold text-[10px]">
                Saldo Kas Bersih Riil
              </span>
              <p className="text-lg font-bold text-[#174C3C] mt-1">
                {formatCurrency(reconciliation?.netCashBalance || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List of configured internal accounts */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[#191B19]">Akun Kas & Bank Internal</h3>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : !accounts?.length ? (
          <EmptyState
            icon={<Building className="h-10 w-10 text-stone-400" />}
            title="Belum ada akun rekening dikonfigurasi"
            description="Tambahkan 'Kas Tunai Bendahara' atau 'Rekening Bank Prodi' untuk pencatatan posisi dana."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {accounts.map((acc) => (
              <Card key={acc.id} className="border-stone-200/80 bg-white shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      {acc.account_type === 'CASH'
                        ? 'Brankas Tunai'
                        : acc.account_type === 'BANK'
                        ? 'Rekening Bank'
                        : 'Merchant QRIS'}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                      Aktif
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-[#191B19] mt-1">
                    {acc.account_name}
                  </CardTitle>
                  {acc.account_number && (
                    <p className="text-xs font-mono text-stone-500">No: {acc.account_number}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                    <span className="text-[11px] text-stone-500">Saldo Awal Buku:</span>
                    <p className="text-sm font-semibold text-stone-800">
                      {formatCurrency(acc.opening_balance)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Account Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">Tambah Akun Kas / Bank</DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Pengaturan wadah penyimpanan keuangan prodi (Brankas atau Bank).
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Nama Akun / Wadah *</Label>
              <Input
                placeholder="Contoh: Kas Tunai Bendahara Utama / BNI Prodi Informatika"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Tipe Akun *</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(val: any) => setFormData({ ...formData, account_type: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Kas Tunai Fisik</SelectItem>
                    <SelectItem value="BANK">Rekening Bank</SelectItem>
                    <SelectItem value="QRIS">Rekening Penampung QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Saldo Awal (IDR)</Label>
                <RupiahInput
                  value={formData.opening_balance}
                  onChange={(val) => setFormData({ ...formData, opening_balance: val })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Nomor Rekening (Opsional)</Label>
              <Input
                placeholder="Contoh: 0987654321 (Khusus Bank)"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
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
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Akun Kas'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
