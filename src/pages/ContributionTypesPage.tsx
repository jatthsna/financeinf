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
import { Plus, Search, Layers, Edit2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

interface ContributionTypeItem {
  id: string;
  name: string;
  description: string | null;
  category: 'RUTIN' | 'KEGIATAN' | 'SEMINAR' | 'WORKSHOP' | 'KEPANITIAAN' | 'LAINNYA';
  frequency: 'WEEKLY' | 'MONTHLY' | 'ONE_TIME' | 'ACTIVITY_BASED';
  amount: number;
  is_mandatory: boolean;
  academic_year_id: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  related_activity_id?: string | null;
  activity?: {
    name: string;
  };
}

export default function ContributionTypesPage() {
  const queryClient = useQueryClient();
  const { activeYear } = useAcademicYear();
  const { user, isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContributionTypeItem | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: 'RUTIN' | 'KEGIATAN' | 'SEMINAR' | 'WORKSHOP' | 'KEPANITIAAN' | 'LAINNYA';
    frequency: 'WEEKLY' | 'MONTHLY' | 'ONE_TIME' | 'ACTIVITY_BASED';
    amount: number;
    is_mandatory: boolean;
    start_date: string;
    end_date: string;
    related_activity_id: string | null;
  }>({
    name: '',
    description: '',
    category: 'RUTIN',
    frequency: 'MONTHLY',
    amount: 10000,
    is_mandatory: true,
    start_date: '',
    end_date: '',
    related_activity_id: null,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch activities for linking
  const { data: activitiesList } = useQuery({
    queryKey: ['activities_dropdown_contributions', activeYear?.id],
    queryFn: async () => {
      if (!activeYear?.id) return [];
      const { data, error } = await supabase
        .from('activities')
        .select('id, name, status')
        .eq('academic_year_id', activeYear.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeYear?.id,
  });

  const { data: contributionTypes, isLoading } = useQuery({
    queryKey: ['contribution_types', activeYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('contribution_types')
        .select(`
          *,
          activity:activities!related_activity_id(name)
        `)
        .order('created_at', { ascending: false });

      if (activeYear?.id) {
        query = query.eq('academic_year_id', activeYear.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ContributionTypeItem[];
    },
    enabled: !!activeYear?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (!activeYear?.id) throw new Error('Tahun akademik aktif belum dipilih.');

      const record = {
        name: payload.name.trim(),
        description: payload.description ? payload.description.trim() : null,
        category: payload.category,
        frequency: payload.frequency,
        amount: Number(payload.amount),
        is_mandatory: payload.is_mandatory,
        academic_year_id: activeYear.id,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        related_activity_id: payload.related_activity_id || null,
        created_by: user?.id,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('contribution_types')
          .update(record)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contribution_types')
          .insert([record]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contribution_types'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal menyimpan jenis iuran');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('contribution_types')
        .update({ is_active: !is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contribution_types'] });
    },
  });

  const [typeToDelete, setTypeToDelete] = useState<ContributionTypeItem | null>(null);

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if there are periods/obligations referencing this
      const { data: periods } = await supabase
        .from('contribution_periods')
        .select('id')
        .eq('contribution_type_id', id);

      if (periods && periods.length > 0) {
        for (const p of periods) {
          await supabase.from('student_obligations').delete().eq('contribution_period_id', p.id);
        }
        await supabase.from('contribution_periods').delete().eq('contribution_type_id', id);
      }

      const { error } = await supabase.from('contribution_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contribution_types'] });
      setTypeToDelete(null);
    },
    onError: (err: any) => {
      alert(`Gagal menghapus jenis iuran: ${err.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'RUTIN',
      frequency: 'MONTHLY',
      amount: 10000,
      is_mandatory: true,
      start_date: '',
      end_date: '',
      related_activity_id: null,
    });
    setEditingItem(null);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: ContributionTypeItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      frequency: item.frequency,
      amount: item.amount,
      is_mandatory: item.is_mandatory,
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      related_activity_id: item.related_activity_id || null,
    });
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama jenis iuran harus diisi.');
      return;
    }
    if (formData.amount <= 0) {
      setFormError('Nominal iuran harus lebih besar dari Rp 0.');
      return;
    }
    saveMutation.mutate(formData);
  };

  const filteredItems = (contributionTypes || []).filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengelolaan Jenis Iuran"
        description="Kelola skema penagihan rutin kas kelas, kegiatan, workshop, dan kepanitiaan."
      >
        {isAdmin && (
          <Button onClick={handleOpenCreate} className="bg-[#174C3C] hover:bg-[#12382c] text-white">
            <Plus className="mr-2 h-4 w-4" /> Tambah Jenis Iuran
          </Button>
        )}
      </PageHeader>

      {/* Filter and Search Bar */}
      <Card className="border-stone-200/80 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Cari jenis iuran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Label className="text-xs text-stone-500 shrink-0">Kategori:</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40 text-xs">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori</SelectItem>
                <SelectItem value="RUTIN">Rutin</SelectItem>
                <SelectItem value="KEGIATAN">Kegiatan</SelectItem>
                <SelectItem value="SEMINAR">Seminar</SelectItem>
                <SelectItem value="WORKSHOP">Workshop</SelectItem>
                <SelectItem value="KEPANITIAAN">Kepanitiaan</SelectItem>
                <SelectItem value="LAINNYA">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid of Contribution Types */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-10 w-10 text-stone-400" />}
          title="Belum ada jenis iuran"
          description="Tambahkan jenis iuran seperti Kas Rutin Bulanan atau Dana Kegiatan untuk tahun akademik aktif."
          action={
            isAdmin ? (
              <Button onClick={handleOpenCreate} className="bg-[#174C3C] text-white hover:bg-[#12382c]">
                <Plus className="mr-2 h-4 w-4" /> Buat Jenis Iuran Baru
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`border-stone-200/80 transition-shadow hover:shadow-sm ${
                !item.is_active ? 'opacity-60 bg-stone-50' : 'bg-white'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-[#191B19]">{item.name}</CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-stone-100 text-stone-700">
                        {item.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-[#174C3C] border-emerald-200">
                        {item.frequency === 'MONTHLY'
                          ? 'Bulanan'
                          : item.frequency === 'WEEKLY'
                          ? 'Mingguan'
                          : item.frequency === 'ONE_TIME'
                          ? 'Satu Kali'
                          : 'Per Kegiatan'}
                      </Badge>
                      {item.is_mandatory ? (
                        <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                          Wajib
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-stone-100 text-stone-600">
                          Sukarela
                        </Badge>
                      )}
                      {item.activity?.name && (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          Kegiatan: {item.activity.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      item.is_active
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-stone-200 text-stone-600 border-stone-300'
                    }`}
                  >
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                {item.description && (
                  <CardDescription className="text-xs text-stone-500 line-clamp-2 mt-1">
                    {item.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="rounded-lg bg-stone-50 p-3 border border-stone-100">
                  <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
                    Besaran Nominal
                  </span>
                  <p className="text-xl font-bold text-[#191B19] mt-0.5">
                    {formatCurrency(item.amount)}
                  </p>
                </div>

                <div className="text-xs text-stone-500 space-y-1">
                  {item.start_date && (
                    <p>Periode: {formatDate(item.start_date)} {item.end_date ? `s/d ${formatDate(item.end_date)}` : ''}</p>
                  )}
                  <p className="text-[11px] text-stone-400">Dibuat: {formatDate(item.created_at)}</p>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleStatusMutation.mutate({ id: item.id, is_active: item.is_active })
                      }
                      className="text-xs h-8"
                    >
                      {item.is_active ? (
                        <>
                          <XCircle className="mr-1 h-3.5 w-3.5 text-stone-500" /> Nonaktifkan
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Aktifkan
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      className="text-xs h-8 text-[#174C3C] hover:bg-emerald-50"
                    >
                      <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTypeToDelete(item)}
                      className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50"
                      title="Hapus Jenis Iuran"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Hapus Jenis Iuran
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-600 pt-2">
              Apakah Anda yakin ingin menghapus jenis iuran <strong>{typeToDelete?.name}</strong>? Tagihan yang terkait dengan jenis iuran ini juga akan dibersihkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTypeToDelete(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteTypeMutation.isPending}
              onClick={() => typeToDelete && deleteTypeMutation.mutate(typeToDelete.id)}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteTypeMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">
              {editingItem ? 'Edit Jenis Iuran' : 'Tambah Jenis Iuran Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Konfigurasi rincian iuran untuk tahun akademik aktif ({activeYear?.display_name || 'Aktif'}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Nama Iuran *</Label>
              <Input
                required
                placeholder="Contoh: Kas Rutin Mahasiswa Bulan April"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUTIN">Rutin</SelectItem>
                    <SelectItem value="KEGIATAN">Kegiatan</SelectItem>
                    <SelectItem value="SEMINAR">Seminar</SelectItem>
                    <SelectItem value="WORKSHOP">Workshop</SelectItem>
                    <SelectItem value="KEPANITIAAN">Kepanitiaan</SelectItem>
                    <SelectItem value="LAINNYA">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Frekuensi Penagihan</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(val: any) => setFormData({ ...formData, frequency: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Bulanan</SelectItem>
                    <SelectItem value="WEEKLY">Mingguan</SelectItem>
                    <SelectItem value="ONE_TIME">Satu Kali</SelectItem>
                    <SelectItem value="ACTIVITY_BASED">Berdasarkan Kegiatan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Nominal (IDR) *</Label>
                <RupiahInput
                  value={formData.amount}
                  onChange={(val) => setFormData({ ...formData, amount: val })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Sifat Penagihan</Label>
                <Select
                  value={formData.is_mandatory ? 'yes' : 'no'}
                  onValueChange={(val) => setFormData({ ...formData, is_mandatory: val === 'yes' })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Wajib Seluruh Anggota</SelectItem>
                    <SelectItem value="no">Sukarela / Khusus Partisipan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Tanggal Mulai Berlaku</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Batas Akhir (Opsional)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Deskripsi / Catatan Tambahan</Label>
              <Input
                placeholder="Penjelasan tujuan penggunaan iuran..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                <span>Tautkan ke Program Kegiatan (Opsional)</span>
                <span className="text-[10px] text-stone-400 font-normal">Sinkronisasi pemasukan otomatis</span>
              </Label>
              <Select
                value={formData.related_activity_id || 'NONE'}
                onValueChange={(val) => setFormData({ ...formData, related_activity_id: val === 'NONE' ? null : val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Pilih kegiatan terkait (jika ada)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">-- Tidak Terikat Kegiatan Tertentu --</SelectItem>
                  {(activitiesList || []).map((act: any) => (
                    <SelectItem key={act.id} value={act.id}>
                      {act.name} {act.status === 'ACTIVE' ? '(Aktif)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 border-t border-stone-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
              >
                {saveMutation.isPending ? 'Menyimpan...' : editingItem ? 'Perbarui Jenis Iuran' : 'Simpan Jenis Iuran'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
