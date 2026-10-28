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
import { Plus, Calendar, CheckCircle2, Lock, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface ActivityItem {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
  academic_year_id: string;
  created_at: string;
  budgets?: Array<{
    id: string;
    budgeted_amount: number;
    category: string;
  }>;
  expenses?: Array<{
    id: string;
    amount: number;
  }>;
  income?: Array<{
    id: string;
    amount: number;
  }>;
}

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const { activeYear } = useAcademicYear();
  const { user } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget_plan: 500000,
    start_date: '',
    end_date: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch activities with budgets, expenses, and incomes
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities_full_list', activeYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select(`
          id,
          name,
          description,
          start_date,
          end_date,
          status,
          academic_year_id,
          created_at,
          budgets:activity_budgets(id, budgeted_amount, category),
          expenses:expenses(id, amount),
          income:income_records(id, amount)
        `)
        .order('created_at', { ascending: false });

      if (activeYear?.id) {
        query = query.eq('academic_year_id', activeYear.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ActivityItem[];
    },
    enabled: !!activeYear?.id,
  });

  // Fetch linked contributions and obligations to connect student fee realization with activities
  const { data: linkedContributions } = useQuery({
    queryKey: ['activity_linked_contributions', activeYear?.id],
    queryFn: async () => {
      if (!activeYear?.id) return [];
      const { data, error } = await supabase
        .from('contribution_types')
        .select(`
          id,
          name,
          related_activity_id,
          periods:contribution_periods(
            id,
            amount,
            obligations:student_obligations(id, paid_amount, remaining_amount, status)
          )
        `)
        .eq('academic_year_id', activeYear.id);
      if (error) {
        console.error('Error fetching linked contributions:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!activeYear?.id,
  });

  const getActivityFinancials = (act: ActivityItem) => {
    // 1. Direct expenses linked to activity
    const actualExpenses = (act.expenses ?? []).reduce((s, r) => s + Number(r.amount), 0);

    // 2. Direct other incomes (sponsorships, donations)
    const directIncome = (act.income ?? []).reduce((s, r) => s + Number(r.amount), 0);

    // 3. Student fee contributions linked to this activity (by related_activity_id OR matching name/label)
    const matchedTypes = (linkedContributions || []).filter((ct: any) =>
      ct.related_activity_id === act.id ||
      ct.name.toLowerCase().includes(act.name.toLowerCase()) ||
      act.name.toLowerCase().includes(ct.name.toLowerCase())
    );

    let studentFeePaid = 0;
    let studentFeeUnpaid = 0;
    let totalTargetFee = 0;

    matchedTypes.forEach((ct: any) => {
      (ct.periods || []).forEach((period: any) => {
        const periodAmount = Number(period.amount || 0);
        (period.obligations || []).forEach((ob: any) => {
          const paid = Number(ob.paid_amount || 0);
          const remaining = Number(ob.remaining_amount || 0);
          studentFeePaid += paid;
          studentFeeUnpaid += remaining;
          totalTargetFee += (periodAmount > 0 ? periodAmount : paid + remaining);
        });
      });
    });

    const totalIncome = directIncome + studentFeePaid;
    const netBalance = totalIncome - actualExpenses;
    const plannedBudget = (act.budgets ?? []).reduce((s, r) => s + Number(r.budgeted_amount), 0);
    const budgetRemaining = plannedBudget - actualExpenses;
    const feeCollectionRate = totalTargetFee > 0 ? Math.round((studentFeePaid / totalTargetFee) * 100) : 0;

    return {
      plannedBudget,
      actualExpenses,
      directIncome,
      studentFeePaid,
      studentFeeUnpaid,
      totalTargetFee,
      totalIncome,
      netBalance,
      budgetRemaining,
      feeCollectionRate,
      matchedTypes,
    };
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (!activeYear?.id) throw new Error('Tahun akademik belum dipilih');
      if (!payload.name.trim()) throw new Error('Nama kegiatan wajib diisi');

      // 1. Insert activity
      const { data: actData, error: actError } = await supabase
        .from('activities')
        .insert([
          {
            name: payload.name.trim(),
            description: payload.description ? payload.description.trim() : null,
            start_date: payload.start_date || null,
            end_date: payload.end_date || null,
            status: 'ACTIVE',
            academic_year_id: activeYear.id,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (actError) throw actError;

      // 2. Insert planned budget if provided
      if (payload.budget_plan > 0) {
        const { error: bErr } = await supabase.from('activity_budgets').insert([
          {
            activity_id: actData.id,
            category: 'KEGIATAN',
            description: `Pagu anggaran awal ${payload.name.trim()}`,
            budgeted_amount: payload.budget_plan,
            notes: 'Pagu anggaran awal yang disetujui',
          },
        ]);
        if (bErr) throw bErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities_full_list'] });
      setIsDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        budget_plan: 500000,
        start_date: '',
        end_date: '',
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal menyimpan kegiatan baru.');
    },
  });

  // Close activity mutation
  const closeActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('activities')
        .update({ status: 'CLOSED' })
        .eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities_full_list'] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kegiatan & Anggaran Acara"
        description="Kelola kepanitiaan seminar, lomba, workshop, pagu rencana anggaran belanja, dan realisasi pembukuan kegiatan."
      >
        <Button
          onClick={() => {
            setFormError(null);
            setIsDialogOpen(true);
          }}
          className="bg-[#174C3C] text-white hover:bg-[#12382c]"
        >
          <Plus className="mr-2 h-4 w-4" /> Buat Kegiatan Baru
        </Button>
      </PageHeader>

      {/* Grid of activities */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : !activities?.length ? (
        <EmptyState
          icon={<Calendar className="h-10 w-10 text-stone-400" />}
          title="Belum ada kegiatan terdaftar"
          description="Tambahkan rencana kegiatan seperti Makrab Informatika, Kuliah Umum, atau Turnamen Esport prodi di sini."
          action={
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-[#174C3C] text-white hover:bg-[#12382c]"
            >
              <Plus className="mr-2 h-4 w-4" /> Rencanakan Kegiatan
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {activities.map((act) => {
            const f = getActivityFinancials(act);

            return (
              <Card
                key={act.id}
                className={`border-stone-200/80 bg-white transition-all hover:shadow-xs flex flex-col justify-between ${
                  act.status === 'CLOSED' ? 'opacity-75 bg-stone-50' : ''
                }`}
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-[#191B19]">{act.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          act.status === 'CLOSED'
                            ? 'bg-stone-200 text-stone-700'
                            : act.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {act.status === 'CLOSED' ? 'Selesai / Ditutup' : act.status}
                      </Badge>
                    </div>
                    {act.description && (
                      <CardDescription className="text-xs text-stone-500 line-clamp-2 mt-1">
                        {act.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Financial summary breakdown connecting Iuran & Expenses */}
                    <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-100 space-y-2 text-xs">
                      {f.totalTargetFee > 0 && (
                        <div className="pb-2 border-b border-stone-200/70 space-y-1.5">
                          <div className="flex justify-between items-center text-stone-600">
                            <span className="font-semibold text-[#174C3C]">Target Iuran Mahasiswa:</span>
                            <strong className="text-stone-900">{formatCurrency(f.totalTargetFee)}</strong>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(f.feeCollectionRate, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-stone-500">
                            <span>Terkumpul: {formatCurrency(f.studentFeePaid)} ({f.feeCollectionRate}%)</span>
                            <span className="text-red-600 font-medium">Tunggakan: {formatCurrency(f.studentFeeUnpaid)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-stone-600 pt-1">
                        <span>Pagu Anggaran (Rencana):</span>
                        <strong className="text-stone-900">{formatCurrency(f.plannedBudget)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-red-600">
                        <span className="flex items-center gap-1">
                          <ArrowDownRight className="h-3.5 w-3.5" /> Realisasi Belanja:
                        </span>
                        <strong className="font-bold">{formatCurrency(f.actualExpenses)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-[#174C3C]">
                        <span className="flex items-center gap-1">
                          <ArrowUpRight className="h-3.5 w-3.5" /> Total Kas Masuk Acara:
                        </span>
                        <strong className="font-bold">{formatCurrency(f.totalIncome)}</strong>
                      </div>
                      <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-stone-800 font-bold">
                        <span>Sisa Saldo Kas Acara:</span>
                        <span className={f.netBalance < 0 ? 'text-red-600 font-black' : 'text-emerald-700 font-black'}>
                          {formatCurrency(f.netBalance)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-500 space-y-0.5">
                      {act.start_date && (
                        <p>Jadwal: {formatDate(act.start_date)} {act.end_date ? `- ${formatDate(act.end_date)}` : ''}</p>
                      )}
                      <p>Dibuat: {formatDate(act.created_at)}</p>
                    </div>
                  </CardContent>
                </div>

                {/* Footer action */}
                <div className="p-4 pt-0 border-t border-stone-100 flex items-center justify-end gap-2 mt-3">
                  {act.status !== 'CLOSED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closeActivityMutation.mutate(act.id)}
                      disabled={closeActivityMutation.isPending}
                      className="text-xs h-8 text-stone-600 hover:text-stone-900 border-stone-200"
                    >
                      <Lock className="mr-1 h-3.5 w-3.5" /> Tutup & Kunci Acara
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Activity Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">Buat Rencana Kegiatan</DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Pendaftaran nama agenda dan alokasi pagu anggaran rencana belanja.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Nama Kegiatan *</Label>
              <Input
                placeholder="Contoh: Seminar Nasional AI & Cloud 2026"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Rencana Pagu Anggaran (IDR) *</Label>
              <RupiahInput
                value={formData.budget_plan}
                onChange={(val) => setFormData({ ...formData, budget_plan: val })}
                placeholder="0"
              />
              <p className="text-[10px] text-stone-400">Pagu rencana tidak dicatat sebagai uang masuk/keluar kas.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Deskripsi / Penanggung Jawab</Label>
              <Input
                placeholder="Ketua panitia dan ringkasan maksud kegiatan..."
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
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Kegiatan'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
