import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAcademicYear } from '@/hooks/useAcademicYear';
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
import { PlusCircle, Search, FileText, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

interface ObligationItem {
  id: string;
  student_id: string;
  academic_year_id: string;
  contribution_type_id: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes: string | null;
  created_at: string;
  student?: {
    full_name: string;
    nim: string | null;
    email: string;
  };
  contribution_type?: {
    name: string;
    category: string;
  };
}

interface StudentMember {
  student_id: string;
  profiles: {
    id: string;
    full_name: string;
    nim: string | null;
    email: string;
  };
}

export default function BillingPage() {
  const queryClient = useQueryClient();
  const { activeYear } = useAcademicYear();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Generation Modal States
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedContributionId, setSelectedContributionId] = useState<string>('');
  const [billingPeriodName, setBillingPeriodName] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [exclusionReason, setExclusionReason] = useState<string>('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Fetch Obligations
  const { data: obligations, isLoading: obligationsLoading } = useQuery({
    queryKey: ['student_obligations', activeYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('student_obligations')
        .select(`
          id,
          student_id,
          academic_year_id,
          contribution_type_id,
          amount,
          paid_amount,
          remaining_amount,
          due_date,
          status,
          notes,
          created_at,
          student:profiles!student_id(full_name, nim, email),
          contribution_type:contribution_types!contribution_type_id(name, category)
        `)
        .order('created_at', { ascending: false });

      if (activeYear?.id) {
        query = query.eq('academic_year_id', activeYear.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ObligationItem[];
    },
    enabled: !!activeYear?.id,
  });

  // Fetch Contribution Types
  const { data: contributionTypes } = useQuery({
    queryKey: ['contribution_types_active', activeYear?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribution_types')
        .select('id, name, amount, category, frequency')
        .eq('academic_year_id', activeYear?.id || '')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeYear?.id,
  });

  // Fetch Active Memberships for generation
  const { data: members } = useQuery({
    queryKey: ['student_memberships_active', activeYear?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_memberships')
        .select(`
          student_id,
          profiles:student_id(id, full_name, nim, email)
        `)
        .eq('academic_year_id', activeYear?.id || '')
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as unknown as StudentMember[];
    },
    enabled: !!activeYear?.id && isGenerateOpen,
  });

  // Selected contribution details
  const selectedContribution = contributionTypes?.find(
    (c) => c.id === selectedContributionId
  );

  const handleOpenGenerate = () => {
    setSelectedContributionId(contributionTypes?.[0]?.id || '');
    const defaultAmt = contributionTypes?.[0]?.amount || 10000;
    setCustomAmount(defaultAmt);
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
    setDueDate(nextMonth.toISOString().split('T')[0]);
    setBillingPeriodName(`Periode ${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`);
    setExcludedStudentIds([]);
    setExclusionReason('');
    setGenerateError(null);
    setIsPreviewMode(false);
    setIsGenerateOpen(true);
  };

  const eligibleMembers = (members || []).filter(
    (m) => !excludedStudentIds.includes(m.student_id)
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!activeYear?.id) throw new Error('Tahun akademik belum dipilih');
      if (!selectedContributionId) throw new Error('Pilih jenis iuran');
      if (!dueDate) throw new Error('Tentukan tanggal jatuh tempo');
      if (eligibleMembers.length === 0) throw new Error('Tidak ada mahasiswa yang ditagih');

      // 1. Create a contribution period first
      const { data: periodData, error: periodError } = await supabase
        .from('contribution_periods')
        .insert([
          {
            contribution_type_id: selectedContributionId,
            academic_year_id: activeYear.id,
            name: billingPeriodName || 'Tagihan Periode',
            due_date: dueDate,
          },
        ])
        .select()
        .single();

      if (periodError) throw periodError;

      // 2. Generate student obligations in bulk
      const newObligations = eligibleMembers.map((m) => ({
        student_id: m.student_id,
        contribution_type_id: selectedContributionId,
        contribution_period_id: periodData.id,
        academic_year_id: activeYear.id,
        amount: customAmount,
        original_amount: customAmount,
        paid_amount: 0,
        remaining_amount: customAmount,
        due_date: dueDate,
        deadline: dueDate,
        status: 'UNPAID',
        notes: `Penagihan massal ${billingPeriodName}`,
      }));

      const { error: batchError } = await supabase
        .from('student_obligations')
        .insert(newObligations);

      if (batchError) throw batchError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_obligations'] });
      setIsGenerateOpen(false);
    },
    onError: (err: any) => {
      setGenerateError(err.message || 'Gagal menerbitkan kewajiban tagihan.');
    },
  });

  const filteredObligations = (obligations || []).filter((item) => {
    const studentName = item.student?.full_name?.toLowerCase() || '';
    const studentNim = item.student?.nim?.toLowerCase() || '';
    const typeName = item.contribution_type?.name?.toLowerCase() || '';
    const matchesSearch =
      studentName.includes(search.toLowerCase()) ||
      studentNim.includes(search.toLowerCase()) ||
      typeName.includes(search.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesType = filterType === 'ALL' || item.contribution_type_id === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">Lunas</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Sebagian</Badge>;
      case 'OVERDUE':
        return <Badge variant="outline" className="border-red-400 bg-red-100 text-red-900 font-semibold">Jatuh Tempo</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="border-stone-200 bg-stone-100 text-stone-600">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">Belum Lunas</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tagihan & Kewajiban Mahasiswa"
        description="Kelola penerbitan penagihan massal, tenggat waktu, dan status pelunasan mahasiswa."
      >
        <Button onClick={handleOpenGenerate} className="bg-[#174C3C] text-white hover:bg-[#12382c]">
          <PlusCircle className="mr-2 h-4 w-4" /> Terbitkan Tagihan Massal
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <Card className="border-stone-200/80 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Cari mahasiswa / NIM / jenis iuran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-stone-500 shrink-0">Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="UNPAID">Belum Lunas</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Sebagian</SelectItem>
                  <SelectItem value="PAID">Lunas</SelectItem>
                  <SelectItem value="OVERDUE">Jatuh Tempo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-stone-500 shrink-0">Iuran:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Iuran</SelectItem>
                  {(contributionTypes || []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Obligations Table */}
      {obligationsLoading ? (
        <Card className="border-stone-200/80 bg-white p-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : filteredObligations.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-stone-400" />}
          title="Tidak ada data tagihan kewajiban"
          description="Gunakan tombol 'Terbitkan Tagihan Massal' untuk membuat kewajiban iuran mahasiswa untuk periode aktif."
        />
      ) : (
        <Card className="border-stone-200/80 bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-[#191B19]">Mahasiswa</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Jenis Iuran</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Jatuh Tempo</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-right">Tagihan</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-right">Terbayar</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-right">Sisa Kewajiban</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObligations.map((item) => (
                <TableRow key={item.id} className="hover:bg-stone-50/60 transition-colors">
                  <TableCell>
                    <div>
                      <p className="font-semibold text-sm text-[#191B19]">
                        {item.student?.full_name || 'Mahasiswa'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {item.student?.nim ? `NIM: ${item.student.nim}` : item.student?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-stone-800">
                      {item.contribution_type?.name || 'Iuran'}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {item.notes || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-stone-600">
                    {item.due_date ? formatDate(item.due_date) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm text-stone-700">
                    {formatCurrency(item.amount)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm text-emerald-700">
                    {formatCurrency(item.paid_amount)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm text-[#191B19]">
                    {formatCurrency(item.remaining_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(item.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Generate Obligations Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">
              Penerbitan Tagihan Massal
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Menghasilkan kewajiban tagihan serentak kepada mahasiswa terdaftar pada tahun akademik {activeYear?.display_name}.
            </DialogDescription>
          </DialogHeader>

          {generateError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
              {generateError}
            </div>
          )}

          {!isPreviewMode ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Pilih Jenis Iuran *</Label>
                <Select
                  value={selectedContributionId}
                  onValueChange={(val) => {
                    setSelectedContributionId(val);
                    const sel = contributionTypes?.find((c) => c.id === val);
                    if (sel) setCustomAmount(sel.amount);
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih jenis iuran..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(contributionTypes || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({formatCurrency(c.amount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-stone-700">Nama Periode / Keterangan *</Label>
                  <Input
                    value={billingPeriodName}
                    onChange={(e) => setBillingPeriodName(e.target.value)}
                    placeholder="Contoh: Tagihan Kas Bulan Mei 2026"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-stone-700">Batas Waktu Pelunasan (Jatuh Tempo) *</Label>
                  <Input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Nominal Penagihan per Mahasiswa (IDR) *</Label>
                <RupiahInput
                  value={customAmount}
                  onChange={setCustomAmount}
                  placeholder="0"
                />
              </div>

              {/* Exclusion section */}
              <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#191B19]">Pengecualian Mahasiswa (Opsional)</span>
                  <span className="text-[11px] text-stone-500">
                    {eligibleMembers.length} dari {members?.length || 0} mahasiswa akan ditagih
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Keluarkan mahasiswa yang sedang cuti atau dibebaskan dari iuran dengan mencentang namanya.
                </p>

                <div className="max-h-36 overflow-y-auto space-y-1.5 border border-stone-200 rounded p-2 bg-white text-xs">
                  {(members || []).map((m) => {
                    const isExcluded = excludedStudentIds.includes(m.student_id);
                    return (
                      <label
                        key={m.student_id}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-stone-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isExcluded}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExcludedStudentIds([...excludedStudentIds, m.student_id]);
                              } else {
                                setExcludedStudentIds(
                                  excludedStudentIds.filter((id) => id !== m.student_id)
                                );
                              }
                            }}
                            className="rounded border-stone-300 text-[#174C3C]"
                          />
                          <span>
                            {m.profiles?.full_name} {m.profiles?.nim ? `(${m.profiles.nim})` : ''}
                          </span>
                        </div>
                        {isExcluded && (
                          <span className="text-[10px] text-red-600 font-semibold">Dikecualikan</span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {excludedStudentIds.length > 0 && (
                  <Input
                    placeholder="Alasan pengecualian (contoh: Dispensasi cuti akademik)..."
                    value={exclusionReason}
                    onChange={(e) => setExclusionReason(e.target.value)}
                    className="text-xs mt-2"
                  />
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsGenerateOpen(false)} className="text-xs">
                  Batal
                </Button>
                <Button
                  onClick={() => setIsPreviewMode(true)}
                  disabled={!selectedContributionId || eligibleMembers.length === 0}
                  className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
                >
                  Tinjau Ringkasan & Konfirmasi
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* PREVIEW MODE */
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <span>Konfirmasi Pra-Penerbitan Tagihan</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-emerald-800 pt-1">
                  <div>
                    <span className="text-emerald-700">Jenis Iuran:</span>{' '}
                    <strong>{selectedContribution?.name}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700">Jatuh Tempo:</span>{' '}
                    <strong>{formatDate(dueDate)}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700">Target Mahasiswa:</span>{' '}
                    <strong>{eligibleMembers.length} Mahasiswa</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700">Nominal Satuan:</span>{' '}
                    <strong>{formatCurrency(customAmount)}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200 text-sm font-bold text-emerald-950 flex justify-between">
                  <span>Total Potensi Penerimaan Kas:</span>
                  <span>{formatCurrency(eligibleMembers.length * customAmount)}</span>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  Sistem menjamin data historis: setiap kewajiban dicatat permanen dan tidak akan menduplikasi tagihan pada periode kalender yang sama.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewMode(false)}
                  className="text-xs"
                >
                  Kembali Edit
                </Button>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
                >
                  {generateMutation.isPending ? 'Menerbitkan...' : 'Terbitkan Sekarang'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
