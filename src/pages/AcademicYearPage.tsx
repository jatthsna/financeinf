import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, GraduationCap, CheckCircle2, Lock, Archive, Clock } from 'lucide-react';

interface AcademicYearItem {
  id: string;
  year_code: string;
  display_name: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'ARCHIVED';
  created_at: string;
}

export default function AcademicYearPage() {
  const queryClient = useQueryClient();
  const { activeYear, setActiveYear, refetch: refetchActiveYear } = useAcademicYear();
  const { user } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    year_code: '2026/2027',
    display_name: 'Tahun Akademik 2026/2027',
    start_date: '2026-09-01',
    end_date: '2027-08-31',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all academic years
  const { data: years, isLoading } = useQuery({
    queryKey: ['academic_years_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as AcademicYearItem[];
    },
  });

  // Create academic year
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (!payload.year_code.trim()) throw new Error('Kode tahun akademik wajib diisi');
      if (!payload.display_name.trim()) throw new Error('Nama tampilan tahun akademik wajib diisi');
      if (payload.start_date >= payload.end_date) {
        throw new Error('Tanggal berakhir harus setelah tanggal mulai.');
      }

      const { error } = await supabase.from('academic_years').insert([
        {
          year_code: payload.year_code.trim(),
          display_name: payload.display_name.trim(),
          start_date: payload.start_date,
          end_date: payload.end_date,
          status: 'INACTIVE',
          created_by: user?.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_years_all'] });
      setIsDialogOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal menambahkan tahun akademik.');
    },
  });

  // Activate academic year
  const activateMutation = useMutation({
    mutationFn: async (yearId: string) => {
      // 1. Deactivate existing active years
      await supabase
        .from('academic_years')
        .update({ status: 'INACTIVE' })
        .eq('status', 'ACTIVE');

      // 2. Set chosen year as ACTIVE
      const { error } = await supabase
        .from('academic_years')
        .update({ status: 'ACTIVE' })
        .eq('id', yearId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_years_all'] });
      refetchActiveYear();
    },
  });

  // Close academic year
  const closeMutation = useMutation({
    mutationFn: async (yearId: string) => {
      const { error } = await supabase
        .from('academic_years')
        .update({ status: 'CLOSED' })
        .eq('id', yearId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_years_all'] });
      refetchActiveYear();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Tahun Akademik"
        description="Kelola siklus tahun ajaran buku kas prodi. Data keuangan historis tersimpan abadi dan tidak terhapus."
      >
        <Button
          onClick={() => {
            setFormError(null);
            setIsDialogOpen(true);
          }}
          className="bg-[#174C3C] text-white hover:bg-[#12382c]"
        >
          <Plus className="mr-2 h-4 w-4" /> Buka Tahun Ajaran Baru
        </Button>
      </PageHeader>

      {/* Grid of years */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : !years?.length ? (
        <EmptyState
          icon={<GraduationCap className="h-10 w-10 text-stone-400" />}
          title="Belum ada tahun akademik"
          description="Inisialisasi tahun akademik pertama untuk memulai operasional kas keuangan mahasiswa."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((y) => {
            const isActive = y.status === 'ACTIVE' || activeYear?.id === y.id;

            return (
              <Card
                key={y.id}
                className={`border-stone-200/80 bg-white shadow-xs transition-shadow ${
                  isActive ? 'ring-2 ring-[#174C3C] border-transparent' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#174C3C]">{y.year_code}</span>
                      <CardTitle className="text-base font-bold text-[#191B19] mt-0.5">
                        {y.display_name}
                      </CardTitle>
                    </div>
                    {isActive ? (
                      <Badge className="bg-[#174C3C] text-white text-[10px]">
                        Tahun Aktif
                      </Badge>
                    ) : y.status === 'CLOSED' ? (
                      <Badge variant="outline" className="bg-stone-100 text-stone-600 text-[10px]">
                        Ditutup
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-stone-50 text-stone-500 text-[10px]">
                        Tidak Aktif
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="rounded-lg bg-stone-50 p-2.5 border border-stone-100 text-xs text-stone-600 space-y-1">
                    <p>Periode: <strong>{formatDate(y.start_date)}</strong> s/d <strong>{formatDate(y.end_date)}</strong></p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    {!isActive && y.status !== 'CLOSED' && (
                      <Button
                        size="sm"
                        onClick={() => activateMutation.mutate(y.id)}
                        disabled={activateMutation.isPending}
                        className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs h-8"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Jadikan Aktif
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => closeMutation.mutate(y.id)}
                        disabled={closeMutation.isPending}
                        className="text-xs h-8 text-stone-600 border-stone-200 hover:bg-stone-50"
                      >
                        <Lock className="mr-1.5 h-3.5 w-3.5" /> Tutup Buku Kas
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Academic Year Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">Buka Tahun Akademik Baru</DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Menyiapkan tahun ajaran baru tanpa mengubah atau menimpa catatan historis sebelumnya.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Kode Tahun Ajaran *</Label>
              <Input
                placeholder="Contoh: 2026/2027 atau 2027/2028"
                value={formData.year_code}
                onChange={(e) => setFormData({ ...formData, year_code: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Nama Tampilan *</Label>
              <Input
                placeholder="Contoh: Tahun Ajaran 2026/2027 Ganjil/Genap"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Tanggal Mulai *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Tanggal Selesai *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={createMutation.isPending}
                className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan Tahun Akademik'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
