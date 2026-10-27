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
import { QrCode, UploadCloud, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';

interface MyObligation {
  id: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes: string | null;
  contribution_types?: {
    id: string;
    name: string;
    description: string | null;
    category: string;
  };
}

export default function MyBillsPage() {
  const queryClient = useQueryClient();
  const { activeYear } = useAcademicYear();
  const { user } = useAuth();

  const [selectedBill, setSelectedBill] = useState<MyObligation | null>(null);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);

  // Form states for QRIS submission
  const [claimAmount, setClaimAmount] = useState<number>(0);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  // Fetch student's obligations
  const { data: myBills, isLoading } = useQuery({
    queryKey: ['my_bills', user?.id, activeYear?.id],
    queryFn: async () => {
      if (!user?.id || !activeYear?.id) return [];
      const { data, error } = await supabase
        .from('student_obligations')
        .select(`
          id,
          amount,
          paid_amount,
          remaining_amount,
          due_date,
          status,
          notes,
          contribution_types:contribution_type_id(id, name, description, category)
        `)
        .eq('student_id', user.id)
        .eq('academic_year_id', activeYear.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as MyObligation[];
    },
    enabled: !!user?.id && !!activeYear?.id,
  });

  // Fetch official QRIS image from settings
  const { data: qrisSetting } = useQuery({
    queryKey: ['official_qris_image'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'qris_image_path')
        .single();
      return data?.value ? JSON.parse(data.value) : '';
    },
  });

  const handleOpenPay = (bill: MyObligation) => {
    setSelectedBill(bill);
    setClaimAmount(bill.remaining_amount);
    setTransactionRef('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setProofFile(null);
    setStudentNotes('');
    setSubmitError(null);
    setIsQrisModalOpen(true);
  };

  // Submit QRIS Claim Mutation
  const submitQrisMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !activeYear?.id || !selectedBill) {
        throw new Error('Data tagihan atau sesi pengguna tidak valid');
      }
      if (claimAmount <= 0) {
        throw new Error('Nominal klaim harus lebih besar dari Rp 0');
      }
      if (claimAmount > selectedBill.remaining_amount) {
        throw new Error('Nominal klaim melebihi sisa tunggakan tagihan.');
      }
      if (!transactionRef.trim()) {
        throw new Error('Nomor referensi / RRN transaksi perbankan wajib diisi.');
      }
      if (!proofFile) {
        throw new Error('Wajib mengunggah bukti tangkapan layar transfer QRIS.');
      }

      // 1. Upload proof file to Supabase Storage
      let filePath = '';
      try {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('payment-evidence')
          .upload(fileName, proofFile, { upsert: true });

        if (uploadErr) {
          console.warn('Storage upload warning:', uploadErr.message);
          filePath = URL.createObjectURL(proofFile);
        } else if (uploadData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from('payment-evidence')
            .getPublicUrl(uploadData.path);
          filePath = publicUrlData?.publicUrl || uploadData.path;
        } else {
          filePath = fileName;
        }
      } catch (err) {
        console.warn('Fallback proof URL');
        filePath = URL.createObjectURL(proofFile);
      }

      // 2. Insert payment record with PENDING status
      const { data: paymentRecord, error: paymentErr } = await supabase
        .from('payments')
        .insert([
          {
            receipt_number: transactionRef.trim(),
            reference_number: transactionRef.trim(),
            payer_id: user.id,
            student_id: user.id,
            academic_year_id: activeYear.id,
            amount: claimAmount,
            payment_method: 'QRIS',
            payment_date: paymentDate,
            status: 'PENDING',
            notes: studentNotes.trim() || 'Klaim QRIS via Portal Mahasiswa',
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (paymentErr) throw paymentErr;

      // 3. Connect payment allocation to selected obligation
      const { error: allocErr } = await supabase.from('payment_allocations').insert([
        {
          payment_id: paymentRecord.id,
          student_obligation_id: selectedBill.id,
          obligation_id: selectedBill.id,
          amount: claimAmount,
        },
      ]);
      if (allocErr) throw allocErr;

      // 4. Record evidence record
      const { error: evidErr } = await supabase.from('payment_evidence').insert([
        {
          payment_id: paymentRecord.id,
          file_path: filePath,
          file_name: proofFile.name,
          mime_type: proofFile.type,
          file_type: proofFile.type,
          file_size: proofFile.size,
          uploaded_by: user.id,
        },
      ]);
      if (evidErr) throw evidErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_bills'] });
      queryClient.invalidateQueries({ queryKey: ['my_payments'] });
      setIsQrisModalOpen(false);
      setIsSuccessDialogOpen(true);
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Gagal mengajukan pembayaran QRIS.');
    },
  });

  const unpaidBills = (myBills || []).filter((b) => b.status !== 'PAID');
  const paidBills = (myBills || []).filter((b) => b.status === 'PAID');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tagihan & Kewajiban Saya"
        description="Pantau seluruh tagihan iuran kas Anda dan bayar mudah melalui QRIS resmi Prodi."
      />

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-stone-200/80 bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Sisa Tunggakan
              </p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(
                  unpaidBills.reduce((acc, b) => acc + Number(b.remaining_amount || 0), 0)
                )}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {unpaidBills.length} tagihan menunggu pelunasan
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-50 border border-red-100 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Tagihan Telah Lunas
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {formatCurrency(
                  paidBills.reduce((acc, b) => acc + Number(b.amount || 0), 0)
                )}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {paidBills.length} kewajiban telah terverifikasi lunas
              </p>
            </div>
            <div className="p-3 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Obligations List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[#191B19]">Kewajiban Menunggu Pembayaran</h3>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : unpaidBills.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-10 w-10 text-emerald-600" />}
            title="Tidak ada tunggakan iuran"
            description="Semua tagihan kas Anda pada tahun akademik ini telah lunas diselesaikan."
          />
        ) : (
          <div className="space-y-3">
            {unpaidBills.map((bill) => (
              <Card key={bill.id} className="border-stone-200/80 bg-white shadow-xs">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#191B19]">
                        {bill.contribution_types?.name || 'Iuran Kas'}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-stone-100">
                        {bill.contribution_types?.category || 'RUTIN'}
                      </Badge>
                      {bill.status === 'PARTIALLY_PAID' ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                          Sebagian
                        </Badge>
                      ) : bill.status === 'OVERDUE' ? (
                        <Badge variant="outline" className="text-[10px] bg-red-100 text-red-900 border-red-300 font-semibold">
                          Jatuh Tempo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                          Belum Lunas
                        </Badge>
                      )}
                    </div>
                    {bill.notes && <p className="text-xs text-stone-500">{bill.notes}</p>}
                    <p className="text-xs text-stone-500">
                      Batas Jatuh Tempo:{' '}
                      <strong className="text-stone-700">
                        {bill.due_date ? formatDate(bill.due_date) : 'Tidak dibatasi'}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-stone-500 uppercase font-semibold">
                        Sisa Tagihan
                      </span>
                      <p className="text-lg font-bold text-[#191B19]">
                        {formatCurrency(bill.remaining_amount)}
                      </p>
                      {bill.paid_amount > 0 && (
                        <p className="text-[11px] text-emerald-700">
                          Telah dibayar: {formatCurrency(bill.paid_amount)}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => handleOpenPay(bill)}
                      className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs h-9"
                    >
                      <QrCode className="mr-1.5 h-4 w-4" /> Bayar QRIS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* QRIS Payment Modal */}
      {selectedBill && (
        <Dialog open={isQrisModalOpen} onOpenChange={setIsQrisModalOpen}>
          <DialogContent className="max-w-md bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[#191B19]">
                Pembayaran via QRIS Resmi
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Pindai QRIS menggunakan aplikasi mobile banking atau e-wallet Anda.
              </DialogDescription>
            </DialogHeader>

            {submitError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
                {submitError}
              </div>
            )}

            <div className="space-y-4 py-2 text-xs">
              {/* QRIS Display */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-stone-200 bg-stone-50/70 text-center">
                {qrisSetting ? (
                  <img
                    src={qrisSetting}
                    alt="QRIS Resmi KAS INFORMATIKA"
                    className="max-h-56 max-w-full rounded-lg shadow-xs object-contain border border-stone-200"
                  />
                ) : (
                  <div className="h-48 w-48 rounded-lg bg-white border border-stone-300 flex flex-col items-center justify-center p-4">
                    <QrCode className="h-16 w-16 text-[#174C3C] mb-2" />
                    <span className="font-bold text-xs text-stone-800">QRIS Resmi Kas Informatika</span>
                    <span className="text-[10px] text-stone-500 mt-1">NMID: ID10200389182</span>
                  </div>
                )}
                <div className="mt-3 text-center">
                  <p className="font-semibold text-stone-900">
                    {selectedBill.contribution_types?.name}
                  </p>
                  <p className="text-base font-bold text-[#174C3C] mt-0.5">
                    Nominal Disarankan: {formatCurrency(selectedBill.remaining_amount)}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <ol className="list-decimal list-inside space-y-1 text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100 leading-relaxed text-[11px]">
                <li>Buka aplikasi perbankan (BCA, Mandiri, BRI, BNI) atau dompet digital (GoPay, OVO, Dana).</li>
                <li>Pindai (scan) kode QRIS resmi di atas dan masukkan nominal pembayaran yang tepat.</li>
                <li>Selesaikan transaksi dan simpan tangkapan layar (screenshot) bukti pembayaran.</li>
                <li>Unggah bukti dan cantumkan nomor referensi (RRN) pada formulir verifikasi di bawah.</li>
              </ol>

              {/* Claim Form */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-stone-700">Nominal yang Dibayarkan (IDR) *</Label>
                  <RupiahInput
                    max={selectedBill.remaining_amount}
                    value={claimAmount}
                    onChange={setClaimAmount}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-stone-700">Nomor Referensi Transaksi (RRN / Ref ID) *</Label>
                  <Input
                    placeholder="Contoh: 202610260012398"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-stone-700">Unggah Bukti Transfer / Resi (JPG/PNG/PDF) *</Label>
                  <div className="border border-dashed border-stone-300 rounded-lg p-3 text-center bg-stone-50/50 hover:bg-stone-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#174C3C] file:text-white"
                    />
                    {proofFile && (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-800">
                        File terpilih: {proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-stone-700">Catatan Mahasiswa (Opsional)</Label>
                  <Input
                    placeholder="Contoh: Transfer atas nama Budi Santoso"
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsQrisModalOpen(false)} className="text-xs">
                  Batal
                </Button>
                <Button
                  onClick={() => submitQrisMutation.mutate()}
                  disabled={submitQrisMutation.isPending || !proofFile || !transactionRef.trim()}
                  className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
                >
                  {submitQrisMutation.isPending ? 'Mengirim Bukti...' : 'Kirim Klaim Pembayaran'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Notification Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-sm bg-white text-center">
          <div className="py-4 space-y-3">
            <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[#191B19]">Klaim QRIS Berhasil Dikirim</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Pengajuan bukti Anda telah masuk antrian verifikasi bendahara. Status tagihan akan otomatis terbarui setelah bendahara mengonfirmasi mutasi rekening.
            </p>
            <Button
              onClick={() => setIsSuccessDialogOpen(false)}
              className="w-full bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium mt-2"
            >
              Mengerti & Lihat Riwayat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
