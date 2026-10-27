import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Plus,
  Search,
  Wallet,
  CheckCircle,
  XCircle,
  Eye,
  FileCheck,
  CreditCard,
  AlertCircle,
  Printer,
} from 'lucide-react';

interface PaymentItem {
  id: string;
  receipt_number: string;
  payer_id: string;
  academic_year_id: string;
  amount: number;
  payment_method: 'CASH' | 'QRIS';
  payment_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';
  notes: string | null;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  payer?: {
    full_name: string;
    nim: string | null;
    email: string;
  };
  verifier?: {
    full_name: string;
  };
  allocations?: Array<{
    id: string;
    amount: number;
    obligation?: {
      id: string;
      amount: number;
      remaining_amount: number;
      contribution_type?: {
        name: string;
      };
    };
  }>;
  evidence?: Array<{
    id: string;
    file_path: string;
    file_name: string;
  }>;
}

interface StudentObligationOption {
  id: string;
  student_id: string;
  amount: number;
  remaining_amount: number;
  contribution_types: {
    name: string;
  };
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { activeYear } = useAcademicYear();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Cash Recording Modal
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [cashNotes, setCashNotes] = useState('');
  const [billAllocations, setBillAllocations] = useState<Record<string, number>>({});
  const [recordError, setRecordError] = useState<string | null>(null);

  // Review QRIS Modal
  const [reviewPayment, setReviewPayment] = useState<PaymentItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Receipt Modal
  const [receiptPayment, setReceiptPayment] = useState<PaymentItem | null>(null);

  // Fetch payments list
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments_list', activeYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          id,
          receipt_number,
          payer_id,
          academic_year_id,
          amount,
          payment_method,
          payment_date,
          status,
          notes,
          rejection_reason,
          verified_by,
          verified_at,
          created_at,
          payer:profiles!payer_id(full_name, nim, email),
          verifier:profiles!verified_by(full_name),
          allocations:payment_allocations(
            id,
            amount,
            obligation:student_obligations(
              id,
              amount,
              remaining_amount,
              contribution_type:contribution_types(name)
            )
          ),
          evidence:payment_evidence(id, file_path, file_name)
        `)
        .order('created_at', { ascending: false });

      if (activeYear?.id) {
        query = query.eq('academic_year_id', activeYear.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as PaymentItem[];
    },
    enabled: !!activeYear?.id,
  });

  // Fetch students with unpaid obligations for the Cash Modal
  const { data: studentsWithBills } = useQuery({
    queryKey: ['students_with_unpaid_bills', activeYear?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_obligations')
        .select(`
          id,
          student_id,
          amount,
          remaining_amount,
          contribution_types!contribution_type_id(name),
          student:profiles!student_id(id, full_name, nim)
        `)
        .eq('academic_year_id', activeYear?.id || '')
        .in('status', ['UNPAID', 'PARTIALLY_PAID']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeYear?.id && isCashModalOpen,
  });

  // Extract unique students who have obligations
  const studentOptions = Array.from(
    new Map(
      (studentsWithBills || []).map((b: any) => [
        b.student?.id,
        { id: b.student?.id, full_name: b.student?.full_name, nim: b.student?.nim },
      ])
    ).values()
  );

  // Outstanding obligations of currently selected student in Cash Modal
  const currentStudentBills: StudentObligationOption[] = (studentsWithBills || [])
    .filter((b: any) => b.student_id === selectedStudentId)
    .map((b: any) => ({
      id: b.id,
      student_id: b.student_id,
      amount: b.amount,
      remaining_amount: b.remaining_amount,
      contribution_types: b.contribution_types,
    }));

  const handleOpenCashModal = () => {
    setSelectedStudentId('');
    setCashAmount(0);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setCashNotes('');
    setBillAllocations({});
    setRecordError(null);
    setIsCashModalOpen(true);
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setBillAllocations({});
  };

  const handleAllocationChange = (obligationId: string, val: number) => {
    setBillAllocations((prev) => ({
      ...prev,
      [obligationId]: Math.max(0, val),
    }));
  };

  const totalAllocated = Object.values(billAllocations).reduce((sum, v) => sum + (v || 0), 0);

  // Record Cash Payment Mutation
  const recordCashMutation = useMutation({
    mutationFn: async () => {
      if (!activeYear?.id) throw new Error('Tahun akademik belum dipilih');
      if (!selectedStudentId) throw new Error('Pilih mahasiswa pembayar');
      if (cashAmount <= 0) throw new Error('Nominal pembayaran harus lebih besar dari 0');
      if (totalAllocated !== cashAmount) {
        throw new Error(
          `Total alokasi tagihan (${formatCurrency(totalAllocated)}) harus tepat sama dengan jumlah uang disetor (${formatCurrency(cashAmount)})`
        );
      }

      const receiptNumber = `KAS-CASH-${Date.now().toString().slice(-6)}`;

      // 1. Insert Payment Record
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            receipt_number: receiptNumber,
            reference_number: receiptNumber,
            payer_id: selectedStudentId,
            student_id: selectedStudentId,
            academic_year_id: activeYear.id,
            amount: cashAmount,
            payment_method: 'CASH',
            payment_date: paymentDate,
            status: 'APPROVED',
            verified_by: user?.id,
            verified_at: new Date().toISOString(),
            notes: cashNotes || 'Penerimaan kas tunai di tempat',
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Insert Allocations & update obligations
      for (const [obligationId, allocAmount] of Object.entries(billAllocations)) {
        if (allocAmount > 0) {
          const { error: allocErr } = await supabase
            .from('payment_allocations')
            .insert([
              {
                payment_id: paymentRecord.id,
                student_obligation_id: obligationId,
                obligation_id: obligationId,
                amount: allocAmount,
              },
            ]);
          if (allocErr) throw allocErr;

          // Fetch current obligation to safely calculate remaining
          const { data: currentOb } = await supabase
            .from('student_obligations')
            .select('amount, paid_amount')
            .eq('id', obligationId)
            .single();

          if (currentOb) {
            const newPaid = Number(currentOb.paid_amount || 0) + allocAmount;
            const newRemaining = Math.max(0, Number(currentOb.amount) - newPaid);
            const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';

            await supabase
              .from('student_obligations')
              .update({
                paid_amount: newPaid,
                remaining_amount: newRemaining,
                status: newStatus,
              })
              .eq('id', obligationId);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments_list'] });
      queryClient.invalidateQueries({ queryKey: ['student_obligations'] });
      setIsCashModalOpen(false);
    },
    onError: (err: any) => {
      setRecordError(err.message || 'Gagal mencatat pembayaran kas.');
    },
  });

  // Approve QRIS Mutation
  const approveQrisMutation = useMutation({
    mutationFn: async (payment: PaymentItem) => {
      if (!user?.id) throw new Error('Pengguna tidak terautentikasi');

      // 1. Update payment status to APPROVED
      const { error: pErr } = await supabase
        .from('payments')
        .update({
          status: 'APPROVED',
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (pErr) throw pErr;

      // 2. Apply allocations to update obligations
      if (payment.allocations && payment.allocations.length > 0) {
        for (const alloc of payment.allocations) {
          if (alloc.obligation?.id) {
            const currentPaid = Number(alloc.obligation.amount) - Number(alloc.obligation.remaining_amount);
            const newPaid = currentPaid + Number(alloc.amount);
            const newRemaining = Math.max(0, Number(alloc.obligation.amount) - newPaid);
            const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';

            await supabase
              .from('student_obligations')
              .update({
                paid_amount: newPaid,
                remaining_amount: newRemaining,
                status: newStatus,
              })
              .eq('id', alloc.obligation.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments_list'] });
      queryClient.invalidateQueries({ queryKey: ['student_obligations'] });
      setReviewPayment(null);
    },
    onError: (err: any) => {
      setReviewError(err.message || 'Gagal memverifikasi klaim QRIS.');
    },
  });

  // Reject QRIS Mutation
  const rejectQrisMutation = useMutation({
    mutationFn: async (payment: PaymentItem) => {
      if (!user?.id) throw new Error('Pengguna tidak terautentikasi');
      if (!rejectionReason.trim()) throw new Error('Wajib memberikan alasan penolakan.');

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'REJECTED',
          rejection_reason: rejectionReason.trim(),
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments_list'] });
      setReviewPayment(null);
      setRejectionReason('');
    },
    onError: (err: any) => {
      setReviewError(err.message || 'Gagal menolak klaim QRIS.');
    },
  });

  const filteredPayments = (payments || []).filter((p) => {
    const studentName = p.payer?.full_name?.toLowerCase() || '';
    const studentNim = p.payer?.nim?.toLowerCase() || '';
    const receiptNo = p.receipt_number?.toLowerCase() || '';
    const matchesSearch =
      studentName.includes(search.toLowerCase()) ||
      studentNim.includes(search.toLowerCase()) ||
      receiptNo.includes(search.toLowerCase());

    const matchesMethod = filterMethod === 'ALL' || p.payment_method === filterMethod;
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran & Verifikasi Kas"
        description="Catat setoran kas tunai fisik, verifikasi bukti QRIS mahasiswa, dan kelola kuitansi resmi."
      >
        <Button onClick={handleOpenCashModal} className="bg-[#174C3C] text-white hover:bg-[#12382c]">
          <Plus className="mr-2 h-4 w-4" /> Catat Kas Tunai (CASH)
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <Card className="border-stone-200/80 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Cari mahasiswa / No. Kuitansi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-stone-500 shrink-0">Metode:</Label>
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger className="w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Metode</SelectItem>
                  <SelectItem value="CASH">Tunai (CASH)</SelectItem>
                  <SelectItem value="QRIS">QRIS Statis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-stone-500 shrink-0">Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="PENDING">Menunggu Verifikasi</SelectItem>
                  <SelectItem value="APPROVED">Disetujui / Sah</SelectItem>
                  <SelectItem value="REJECTED">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      {paymentsLoading ? (
        <Card className="border-stone-200/80 bg-white p-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-10 w-10 text-stone-400" />}
          title="Tidak ada catatan pembayaran"
          description="Catat setoran kas tunai mahasiswa atau tunggu pengajuan QRIS dari portal mahasiswa."
        />
      ) : (
        <Card className="border-stone-200/80 bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-[#191B19]">No. Kuitansi / Ref</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Mahasiswa</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Metode</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Tanggal Bayar</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-right">Nominal</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-center">Status</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((p) => (
                <TableRow key={p.id} className="hover:bg-stone-50/60 transition-colors">
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-[#174C3C]">
                      {p.receipt_number || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm text-[#191B19]">
                      {p.payer?.full_name || 'Mahasiswa'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {p.payer?.nim ? `NIM: ${p.payer.nim}` : p.payer?.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {p.payment_method === 'CASH' ? 'Kas Tunai' : 'QRIS'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-stone-600">
                    {formatDate(p.payment_date || p.created_at)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm text-[#191B19]">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.status === 'APPROVED' ? (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                        Disetujui
                      </Badge>
                    ) : p.status === 'PENDING' ? (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 font-semibold animate-pulse">
                        Menunggu Tinjauan
                      </Badge>
                    ) : p.status === 'REJECTED' ? (
                      <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                        Ditolak
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-stone-200 bg-stone-100 text-stone-600">
                        {p.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setReviewPayment(p);
                            setRejectionReason('');
                            setReviewError(null);
                          }}
                          className="h-8 bg-[#174C3C] text-white hover:bg-[#12382c] text-xs"
                        >
                          Tinjau Klaim
                        </Button>
                      )}
                      {p.status === 'APPROVED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReceiptPayment(p)}
                          className="h-8 text-xs border-stone-200 text-stone-700 hover:bg-stone-50"
                        >
                          <Printer className="mr-1 h-3.5 w-3.5" /> Kuitansi
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Cash Recording Modal */}
      <Dialog open={isCashModalOpen} onOpenChange={setIsCashModalOpen}>
        <DialogContent className="max-w-xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">
              Catat Penerimaan Kas Tunai Fisik
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Formulir pencatatan setoran uang kas langsung dari mahasiswa oleh staf/bendahara berwenang.
            </DialogDescription>
          </DialogHeader>

          {recordError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
              {recordError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Pilih Mahasiswa Pembayar *</Label>
              <Select value={selectedStudentId} onValueChange={handleStudentSelect}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Pilih mahasiswa yang memiliki tagihan..." />
                </SelectTrigger>
                <SelectContent>
                  {studentOptions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} {s.nim ? `(${s.nim})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Jumlah Uang Fisik Disetor (IDR) *</Label>
                <Input
                  type="number"
                  min="1000"
                  step="1000"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Tanggal Penerimaan Kas *</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Allocation section */}
            {selectedStudentId && (
              <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#191B19]">Alokasi Tagihan Kewajiban</span>
                  <span className="text-[11px] font-semibold text-stone-600">
                    Dialokasikan: {formatCurrency(totalAllocated)} / {formatCurrency(cashAmount)}
                  </span>
                </div>

                {currentStudentBills.length === 0 ? (
                  <p className="text-xs text-stone-500">Mahasiswa ini tidak memiliki tunggakan kewajiban saat ini.</p>
                ) : (
                  <div className="space-y-2">
                    {currentStudentBills.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-stone-200 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-stone-900">{bill.contribution_types?.name}</p>
                          <p className="text-[11px] text-stone-500">
                            Sisa tunggakan: {formatCurrency(bill.remaining_amount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max={bill.remaining_amount}
                            step="1000"
                            placeholder="Nominal"
                            value={billAllocations[bill.id] || ''}
                            onChange={(e) => handleAllocationChange(bill.id, Number(e.target.value))}
                            className="w-28 text-right text-xs h-8"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAllocationChange(bill.id, bill.remaining_amount)}
                            className="text-[10px] h-8 px-2 text-[#174C3C]"
                          >
                            Lunaskan
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Catatan Staf / Bukti Fisik</Label>
              <Input
                placeholder="Contoh: Diterima langsung oleh Bendahara di ruang prodi"
                value={cashNotes}
                onChange={(e) => setCashNotes(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button variant="outline" onClick={() => setIsCashModalOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button
                onClick={() => recordCashMutation.mutate()}
                disabled={recordCashMutation.isPending || cashAmount <= 0 || totalAllocated !== cashAmount}
                className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
              >
                {recordCashMutation.isPending ? 'Menyimpan Kas...' : 'Simpan Penerimaan Kas'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review QRIS Modal */}
      {reviewPayment && (
        <Dialog open={!!reviewPayment} onOpenChange={() => setReviewPayment(null)}>
          <DialogContent className="max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[#191B19]">
                Verifikasi Pengajuan QRIS Mahasiswa
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Cocokkan nominal klaim dan mutasi rekening sebelum menyetujui.
              </DialogDescription>
            </DialogHeader>

            {reviewError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
                {reviewError}
              </div>
            )}

            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg bg-stone-50 p-3 border border-stone-200 space-y-1.5">
                <p><strong>Nama Mahasiswa:</strong> {reviewPayment.payer?.full_name}</p>
                <p><strong>NIM:</strong> {reviewPayment.payer?.nim || '-'}</p>
                <p><strong>Nominal Diklaim:</strong> <span className="font-bold text-sm text-[#174C3C]">{formatCurrency(reviewPayment.amount)}</span></p>
                <p><strong>Tanggal Pengajuan:</strong> {formatDate(reviewPayment.created_at, 'with-time')}</p>
                <p><strong>Referensi Transaksi:</strong> {reviewPayment.receipt_number || '-'}</p>
                {reviewPayment.notes && <p><strong>Keterangan Mahasiswa:</strong> {reviewPayment.notes}</p>}
              </div>

              {/* Supporting Evidence preview */}
              {reviewPayment.evidence && reviewPayment.evidence.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-stone-700">Lampiran Bukti Bayar:</Label>
                  <div className="rounded-lg border border-stone-200 p-2 bg-stone-50 flex items-center justify-between">
                    <span className="truncate max-w-xs">{reviewPayment.evidence[0].file_name || 'Bukti_Transfer.jpg'}</span>
                    <a
                      href={reviewPayment.evidence[0].file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#174C3C] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> Buka Bukti
                    </a>
                  </div>
                </div>
              )}

              {/* Rejection input */}
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-semibold text-stone-700">Alasan Penolakan (Hanya jika ditolak):</Label>
                <Input
                  placeholder="Contoh: Mutasi belum masuk atau bukti transfer tidak terbaca..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-4 flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => rejectQrisMutation.mutate(reviewPayment)}
                  disabled={rejectQrisMutation.isPending || !rejectionReason.trim()}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  {rejectQrisMutation.isPending ? 'Menolak...' : 'Tolak Klaim'}
                </Button>

                <Button
                  onClick={() => approveQrisMutation.mutate(reviewPayment)}
                  disabled={approveQrisMutation.isPending}
                  className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
                >
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  {approveQrisMutation.isPending ? 'Menyetujui...' : 'Setujui & Sahkan Pembayaran'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Official Receipt Modal */}
      {receiptPayment && (
        <Dialog open={!!receiptPayment} onOpenChange={() => setReceiptPayment(null)}>
          <DialogContent className="max-w-md bg-white">
            <div className="p-4 border-2 border-dashed border-[#174C3C]/40 rounded-xl space-y-4">
              <div className="text-center pb-3 border-b border-stone-200">
                <span className="text-[10px] tracking-widest uppercase font-bold text-stone-400">
                  Tanda Bukti Pembayaran Sah
                </span>
                <h3 className="text-base font-bold text-[#191B19]">KAS INFORMATIKA</h3>
                <p className="text-[11px] text-stone-500">Program Studi Informatika</p>
              </div>

              <div className="space-y-2 text-xs text-stone-700">
                <div className="flex justify-between">
                  <span className="text-stone-500">No. Kuitansi:</span>
                  <span className="font-mono font-bold">{receiptPayment.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Nama Mahasiswa:</span>
                  <span className="font-semibold">{receiptPayment.payer?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">NIM:</span>
                  <span>{receiptPayment.payer?.nim || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Metode:</span>
                  <span>{receiptPayment.payment_method === 'CASH' ? 'Kas Tunai' : 'QRIS Resmi'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Tanggal:</span>
                  <span>{formatDate(receiptPayment.payment_date || receiptPayment.created_at, 'with-time')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-100 text-sm font-bold text-[#191B19]">
                  <span>Total Pelunasan:</span>
                  <span className="text-[#174C3C]">{formatCurrency(receiptPayment.amount)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-between items-end text-[11px] text-stone-500">
                <div>
                  <p>Diverifikasi oleh:</p>
                  <p className="font-semibold text-stone-800 mt-6">{receiptPayment.verifier?.full_name || 'Bendahara Prodi'}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                    LUNAS
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="w-full text-xs"
              >
                <Printer className="mr-1 h-3.5 w-3.5" /> Cetak Kuitansi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
