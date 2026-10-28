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
  Maximize2,
  ExternalLink,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { OfficialReceiptModal, type OfficialReceiptData } from '@/components/OfficialReceiptModal';
import { EvidenceViewerModal } from '@/components/EvidenceViewerModal';

interface PaymentItem {
  id: string;
  reference_number: string;
  student_id: string;
  academic_year_id: string;
  amount: number;
  payment_method: 'CASH' | 'QRIS';
  payment_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';
  notes: string | null;
  qris_reference: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  student?: {
    id: string;
    full_name: string;
    nim: string | null;
    email: string;
  };
  reviewer?: {
    id: string;
    full_name: string;
  };
  allocations?: Array<{
    id: string;
    amount: number;
    obligation?: {
      id: string;
      paid_amount: number;
      remaining_amount: number;
      period?: {
        id: string;
        amount: number;
        period_label: string;
        contribution_type?: {
          id: string;
          name: string;
          category: string;
        };
      };
    };
  }>;
  evidence?: Array<{
    id: string;
    file_path: string;
    file_name: string;
    file_type?: string;
    file_size?: number;
  }>;
}

interface StudentObligationOption {
  id: string;
  student_id: string;
  paid_amount: number;
  remaining_amount: number;
  deadline: string | null;
  student?: {
    id: string;
    full_name: string;
    nim: string | null;
  };
  period?: {
    amount: number;
    period_label: string;
    contribution_type?: {
      name: string;
    };
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

  // Lightbox Evidence Modal
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxFileName, setLightboxFileName] = useState<string>('bukti-transfer.jpg');

  // Official Kwitansi Modal
  const [receiptData, setReceiptData] = useState<OfficialReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Fetch payments list with corrected schema mapping
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments_list', activeYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          id,
          reference_number,
          student_id,
          academic_year_id,
          amount,
          payment_method,
          payment_date,
          status,
          notes,
          qris_reference,
          rejection_reason,
          reviewed_by,
          reviewed_at,
          created_at,
          student:profiles!student_id(id, full_name, nim, email),
          reviewer:profiles!reviewed_by(id, full_name),
          allocations:payment_allocations(
            id,
            amount,
            obligation:student_obligations(
              id,
              paid_amount,
              remaining_amount,
              period:contribution_periods!contribution_period_id(
                id,
                amount,
                period_label,
                contribution_type:contribution_types!contribution_type_id(
                  id,
                  name,
                  category
                )
              )
            )
          ),
          evidence:payment_evidence(
            id,
            file_path,
            file_name,
            file_type,
            file_size
          )
        `)
        .order('created_at', { ascending: false });

      if (activeYear?.id) {
        query = query.eq('academic_year_id', activeYear.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }
      return (data || []) as unknown as PaymentItem[];
    },
    enabled: !!activeYear?.id,
  });

  // Fetch ALL students from profiles to ensure student list is NEVER empty
  const { data: allStudents } = useQuery({
    queryKey: ['all_registered_students_cash'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, nim, email')
        .eq('role', 'MAHASISWA')
        .order('full_name', { ascending: true });
      if (error) {
        console.error('Error fetching all students:', error);
        return [];
      }
      return data || [];
    },
    enabled: isCashModalOpen,
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
          paid_amount,
          remaining_amount,
          deadline,
          student:profiles!student_id(id, full_name, nim),
          period:contribution_periods!contribution_period_id(
            amount,
            period_label,
            contribution_type:contribution_types!contribution_type_id(name)
          )
        `)
        .eq('academic_year_id', activeYear?.id || '')
        .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']);

      if (error) {
        console.error('Error fetching students with bills:', error);
        return [];
      }
      return (data || []) as unknown as StudentObligationOption[];
    },
    enabled: !!activeYear?.id && isCashModalOpen,
  });

  // Merged student options: all student profiles + any profile from obligations
  const studentOptions = (() => {
    const map = new Map<string, { id: string; full_name: string; nim: string | null }>();
    (allStudents || []).forEach((s) => map.set(s.id, { id: s.id, full_name: s.full_name, nim: s.nim }));
    (studentsWithBills || []).forEach((o) => {
      if (o.student) map.set(o.student.id, o.student);
    });
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  })();

  // Filter bills belonging to selected student
  const studentBills = (studentsWithBills || []).filter(
    (b) => b.student_id === selectedStudentId && Number(b.remaining_amount) > 0
  );

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

  const handleAutoAllocate = () => {
    let remaining = cashAmount;
    const newAlloc: Record<string, number> = {};
    for (const b of studentBills) {
      if (remaining <= 0) break;
      const billRem = Number(b.remaining_amount);
      const alloc = Math.min(billRem, remaining);
      newAlloc[b.id] = alloc;
      remaining -= alloc;
    }
    setBillAllocations(newAlloc);
  };

  // Record Cash Payment Mutation
  const recordCashMutation = useMutation({
    mutationFn: async () => {
      if (!activeYear?.id) throw new Error('Tahun akademik belum dipilih');
      if (!selectedStudentId) throw new Error('Pilih mahasiswa pembayar');
      if (cashAmount <= 0) throw new Error('Nominal pembayaran harus lebih besar dari 0');

      // If student has pending bills and user made allocations, check matching total
      if (studentBills.length > 0 && totalAllocated > 0 && totalAllocated !== cashAmount) {
        throw new Error(
          `Total alokasi tagihan (${formatCurrency(totalAllocated)}) harus tepat sama dengan uang disetor (${formatCurrency(cashAmount)}). Klik "Alokasi Otomatis" atau sesuaikan nominal alokasi.`
        );
      }

      const receiptNumber = `KAS-CASH-${Date.now().toString().slice(-6)}`;

      // 1. Insert Payment Record
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            reference_number: receiptNumber,
            student_id: selectedStudentId,
            academic_year_id: activeYear.id,
            amount: cashAmount,
            payment_method: 'CASH',
            payment_date: paymentDate,
            status: 'APPROVED',
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
            notes: cashNotes || (totalAllocated > 0 ? 'Penerimaan kas tunai di tempat' : 'Penerimaan kas tunai langsung (tanpa tagihan tertunda)'),
          },
        ])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Insert Allocations & update obligations if allocated
      for (const [obligationId, allocAmount] of Object.entries(billAllocations)) {
        if (allocAmount > 0) {
          const { error: allocErr } = await supabase
            .from('payment_allocations')
            .insert([
              {
                payment_id: paymentRecord.id,
                obligation_id: obligationId,
                amount: allocAmount,
              },
            ]);
          if (allocErr) throw allocErr;

          // Fetch current obligation to safely calculate remaining
          const { data: currentOb } = await supabase
            .from('student_obligations')
            .select(`
              id,
              paid_amount,
              remaining_amount,
              period:contribution_periods!contribution_period_id(amount)
            `)
            .eq('id', obligationId)
            .single();

          if (currentOb) {
            const totalPeriodAmount = Number((currentOb as any).period?.amount || 0);
            const newPaid = Number(currentOb.paid_amount || 0) + allocAmount;
            const newRemaining = Math.max(0, totalPeriodAmount - newPaid);
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
      queryClient.invalidateQueries({ queryKey: ['students_with_unpaid_bills'] });
      queryClient.invalidateQueries({ queryKey: ['cash-book-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setIsCashModalOpen(false);
    },
    onError: (err: any) => {
      setRecordError(err.message || 'Gagal mencatat pembayaran kas.');
    },
  });

  const [paymentToDelete, setPaymentToDelete] = useState<PaymentItem | null>(null);

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. Delete allocations
      await supabase.from('payment_allocations').delete().eq('payment_id', id);
      // 2. Delete evidence
      await supabase.from('payment_evidence').delete().eq('payment_id', id);
      // 3. Delete payment
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments_list'] });
      queryClient.invalidateQueries({ queryKey: ['cash-book-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setPaymentToDelete(null);
    },
    onError: (err: any) => {
      alert(`Gagal menghapus catatan pembayaran: ${err.message}`);
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
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (pErr) throw pErr;

      // 2. Apply allocations to update obligations
      if (payment.allocations && payment.allocations.length > 0) {
        for (const alloc of payment.allocations) {
          if (alloc.obligation?.id) {
            const ob = alloc.obligation;
            const totalPeriodAmount = Number(ob.period?.amount || (ob.paid_amount + ob.remaining_amount) || 0);
            const newPaid = Number(ob.paid_amount || 0) + Number(alloc.amount);
            const newRemaining = Math.max(0, totalPeriodAmount - newPaid);
            const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';

            const { error: obErr } = await supabase
              .from('student_obligations')
              .update({
                paid_amount: newPaid,
                remaining_amount: newRemaining,
                status: newStatus,
              })
              .eq('id', ob.id);
            if (obErr) throw obErr;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments_list'] });
      queryClient.invalidateQueries({ queryKey: ['cash-book-entries'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
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
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
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

  const handleOpenReceipt = (payment: PaymentItem) => {
    const purposeName = payment.allocations?.[0]?.obligation?.period?.contribution_type?.name 
      || payment.allocations?.[0]?.obligation?.period?.period_label
      || 'Iuran Kas Mahasiswa';

    setReceiptData({
      receipt_number: payment.reference_number || `KWT-${payment.id.slice(0, 8)}`,
      student_name: payment.student?.full_name || 'Mahasiswa Informatika',
      student_nim: payment.student?.nim || '-',
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date || payment.created_at,
      verified_by_name: payment.reviewer?.full_name || 'Bendahara Kas Informatika',
      verified_at: payment.reviewed_at || payment.created_at,
      notes: payment.notes,
      purpose: purposeName,
    });
    setIsReceiptOpen(true);
  };

  const filteredPayments = (payments || []).filter((p) => {
    const studentName = p.student?.full_name?.toLowerCase() || '';
    const studentNim = p.student?.nim?.toLowerCase() || '';
    const refNo = p.reference_number?.toLowerCase() || '';
    const matchesSearch =
      studentName.includes(search.toLowerCase()) ||
      studentNim.includes(search.toLowerCase()) ||
      refNo.includes(search.toLowerCase());

    const matchesMethod = filterMethod === 'ALL' || p.payment_method === filterMethod;
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  // Calculate quick stats
  const totalApproved = (payments || [])
    .filter((p) => p.status === 'APPROVED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingQrisCount = (payments || []).filter(
    (p) => p.status === 'PENDING' && p.payment_method === 'QRIS'
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran & Setoran Kas"
        description="Pusat kelola dan verifikasi setoran kas tunai fisik serta pengesahan mutasi QRIS mahasiswa."
      >
        <Button
          onClick={handleOpenCashModal}
          className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-semibold shadow-xs"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Catat Kas Tunai Fisik
        </Button>
      </PageHeader>

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-stone-200/80 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Kas Diterima (Disetujui)
              </p>
              <p className="text-xl sm:text-2xl font-bold text-[#174C3C] mt-1">
                {formatCurrency(totalApproved)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-emerald-50 border border-emerald-100 text-[#174C3C]">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Menunggu Verifikasi QRIS
              </p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">
                {pendingQrisCount} Klaim
              </p>
            </div>
            <div className="p-3 rounded-full bg-amber-50 border border-amber-100 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Transaksi Dicatat
              </p>
              <p className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
                {(payments || []).length} Transaksi
              </p>
            </div>
            <div className="p-3 rounded-full bg-stone-100 border border-stone-200 text-stone-700">
              <FileCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-stone-200/80 bg-white shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Cari nama mahasiswa, NIM, atau nomor referensi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="Metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Metode</SelectItem>
                  <SelectItem value="CASH">Kas Tunai</SelectItem>
                  <SelectItem value="QRIS">QRIS</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px] text-xs">
                  <SelectValue placeholder="Status" />
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
        <Card className="border-stone-200/80 bg-white">
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-10 w-10 text-stone-400" />}
          title="Tidak ada data pembayaran"
          description={
            search || filterMethod !== 'ALL' || filterStatus !== 'ALL'
              ? 'Tidak ada transaksi pembayaran yang cocok dengan filter pencarian Anda.'
              : 'Belum ada transaksi pembayaran yang dicatat pada tahun akademik aktif.'
          }
        />
      ) : (
        <Card className="border-stone-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[780px]">
              <TableHeader className="bg-stone-50">
                <TableRow>
                  <TableHead className="font-semibold text-[#191B19]">No. Ref / Kuitansi</TableHead>
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
                        {p.reference_number || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm text-[#191B19]">
                        {p.student?.full_name || 'Mahasiswa'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {p.student?.nim ? `NIM: ${p.student.nim}` : p.student?.email}
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
                        {p.evidence && p.evidence.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLightboxUrl(p.evidence![0].file_path);
                              setLightboxFileName(p.evidence![0].file_name || 'bukti-transfer.jpg');
                            }}
                            className="h-8 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                            title="Lihat Bukti Foto"
                          >
                            <Eye className="h-3.5 w-3.5 text-stone-500" />
                          </Button>
                        )}
                        {p.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setReviewPayment(p);
                              setRejectionReason('');
                              setReviewError(null);
                            }}
                            className="h-8 bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
                          >
                            Tinjau Klaim
                          </Button>
                        )}
                        {p.status === 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReceipt(p)}
                            className="h-8 text-xs border-stone-200 text-stone-700 hover:bg-stone-50 font-medium"
                          >
                            <Printer className="mr-1 h-3.5 w-3.5 text-stone-500" /> Kwitansi
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPaymentToDelete(p)}
                          className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50"
                          title="Hapus Pembayaran"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Delete Payment Confirmation Dialog */}
      <Dialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Hapus Catatan Pembayaran
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-600 pt-2">
              Apakah Anda yakin ingin membatalkan/menghapus pembayaran #{paymentToDelete?.reference_number} oleh{' '}
              <strong>{paymentToDelete?.student?.full_name}</strong> sebesar{' '}
              <strong>{formatCurrency(paymentToDelete?.amount || 0)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaymentToDelete(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deletePaymentMutation.isPending}
              onClick={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete.id)}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {deletePaymentMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Recording Modal */}
      <Dialog open={isCashModalOpen} onOpenChange={setIsCashModalOpen}>
        <DialogContent className="max-w-xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">
              Catat Penerimaan Kas Tunai Fisik
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Formulir pencatatan setoran uang kas langsung dari mahasiswa oleh bendahara berwenang.
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
                  <SelectValue placeholder="Pilih mahasiswa pembayar..." />
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
                <RupiahInput
                  value={cashAmount}
                  onChange={setCashAmount}
                  placeholder="0"
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
                  <Label className="text-xs font-bold text-stone-800">
                    Alokasikan Dana ke Tagihan Mahasiswa:
                  </Label>
                  <div className="flex items-center gap-2">
                    {studentBills.length > 0 && cashAmount > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAutoAllocate}
                        className="h-6 text-[10px] px-2 text-[#174C3C] border-[#174C3C]/30 hover:bg-[#174C3C]/10 flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" /> Alokasi Otomatis
                      </Button>
                    )}
                    <span
                      className={`text-xs font-mono font-bold ${
                        totalAllocated === cashAmount ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      Alokasi: {formatCurrency(totalAllocated)} / {formatCurrency(cashAmount)}
                    </span>
                  </div>
                </div>

                {studentBills.length === 0 ? (
                  <p className="text-xs text-emerald-800 bg-emerald-50/80 p-2.5 rounded border border-emerald-200">
                    Mahasiswa ini tidak memiliki tunggakan tagihan aktif. Pembayaran kas fisik tetap dapat dicatat langsung sebagai pemasukan kas sah mahasiswa.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {studentBills.map((b) => {
                      const typeName = b.period?.contribution_type?.name || b.period?.period_label || 'Iuran';
                      const rem = Number(b.remaining_amount);
                      return (
                        <div
                          key={b.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white border border-stone-200 text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-semibold text-stone-900">{typeName}</p>
                            <p className="text-[11px] text-stone-500">
                              Sisa Tunggakan: <span className="font-bold text-red-600">{formatCurrency(rem)}</span>
                            </p>
                          </div>
                          <div className="w-36">
                            <RupiahInput
                              max={rem}
                              value={billAllocations[b.id] || 0}
                              onChange={(val) => handleAllocationChange(b.id, val)}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      );
                    })}
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
                disabled={
                  recordCashMutation.isPending ||
                  cashAmount <= 0 ||
                  !selectedStudentId ||
                  (studentBills.length > 0 && totalAllocated > 0 && totalAllocated !== cashAmount)
                }
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
          <DialogContent className="max-w-xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[#191B19]">
                Verifikasi Pengajuan QRIS Mahasiswa
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Cocokkan nominal klaim dan mutasi rekening sebelum menyetujui setoran kas.
              </DialogDescription>
            </DialogHeader>

            {reviewError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
                {reviewError}
              </div>
            )}

            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-lg bg-stone-50 p-3 border border-stone-200 space-y-1.5">
                <p><strong>Nama Mahasiswa:</strong> {reviewPayment.student?.full_name}</p>
                <p><strong>NIM:</strong> {reviewPayment.student?.nim || '-'}</p>
                <p><strong>Nominal Diklaim:</strong> <span className="font-bold text-sm text-[#174C3C]">{formatCurrency(reviewPayment.amount)}</span></p>
                <p><strong>Tanggal Pengajuan:</strong> {formatDate(reviewPayment.created_at, 'with-time')}</p>
                <p><strong>Referensi Transaksi:</strong> {reviewPayment.reference_number || '-'}</p>
                {reviewPayment.notes && <p><strong>Keterangan Mahasiswa:</strong> {reviewPayment.notes}</p>}
              </div>

              {/* Supporting Evidence preview - INLINE VIEWER */}
              {reviewPayment.evidence && reviewPayment.evidence.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-stone-700">Bukti Transfer Fisik / Screenshot:</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLightboxUrl(reviewPayment.evidence![0].file_path);
                        setLightboxFileName(reviewPayment.evidence![0].file_name || 'bukti-transfer.jpg');
                      }}
                      className="text-xs text-[#174C3C] font-semibold h-7 px-2 hover:bg-stone-100 flex items-center gap-1"
                    >
                      <Maximize2 className="h-3 w-3" /> Perbesar Layar Penuh
                    </Button>
                  </div>

                  <div
                    onClick={() => {
                      setLightboxUrl(reviewPayment.evidence![0].file_path);
                      setLightboxFileName(reviewPayment.evidence![0].file_name || 'bukti-transfer.jpg');
                    }}
                    className="cursor-pointer group relative rounded-lg border border-stone-200 bg-stone-900 p-2 text-center overflow-hidden hover:border-[#174C3C] transition-all"
                  >
                    <img
                      src={reviewPayment.evidence[0].file_path}
                      alt="Bukti Transfer"
                      className="max-h-64 w-auto mx-auto rounded object-contain group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5">
                      <Maximize2 className="h-4 w-4" /> Klik untuk Zoom & Rotasi
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-400 text-center font-mono">
                    {reviewPayment.evidence[0].file_name || 'Bukti_Transfer.jpg'}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-dashed border-stone-300 text-center text-stone-500 bg-stone-50">
                  <p className="text-xs">Tidak ada file bukti transfer terlampir.</p>
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

              <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => rejectQrisMutation.mutate(reviewPayment)}
                  disabled={rejectQrisMutation.isPending || !rejectionReason.trim()}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  {rejectQrisMutation.isPending ? 'Menolak...' : 'Tolak Klaim'}
                </Button>

                <Button
                  onClick={() => approveQrisMutation.mutate(reviewPayment)}
                  disabled={approveQrisMutation.isPending}
                  className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium w-full sm:w-auto"
                >
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  {approveQrisMutation.isPending ? 'Menyetujui...' : 'Setujui & Sahkan Pembayaran'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Lightbox Evidence Modal */}
      <EvidenceViewerModal
        open={!!lightboxUrl}
        onOpenChange={(open) => !open && setLightboxUrl(null)}
        imageUrl={lightboxUrl}
        fileName={lightboxFileName}
      />

      {/* Official Kwitansi Modal */}
      <OfficialReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        data={receiptData}
      />
    </div>
  );
}
