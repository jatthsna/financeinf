import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { CreditCard, Printer, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface MyPaymentItem {
  id: string;
  receipt_number: string;
  amount: number;
  payment_method: 'CASH' | 'QRIS';
  payment_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  verified_at: string | null;
  verifier?: {
    full_name: string;
  };
}

export default function MyPaymentsPage() {
  const { activeYear } = useAcademicYear();
  const { user, profile } = useAuth();

  const [receiptPayment, setReceiptPayment] = useState<MyPaymentItem | null>(null);

  const { data: myPayments, isLoading } = useQuery({
    queryKey: ['my_payments_history', user?.id, activeYear?.id],
    queryFn: async () => {
      if (!user?.id || !activeYear?.id) return [];
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          receipt_number,
          amount,
          payment_method,
          payment_date,
          status,
          notes,
          rejection_reason,
          created_at,
          verified_at,
          verifier:profiles!verified_by(full_name)
        `)
        .eq('payer_id', user.id)
        .eq('academic_year_id', activeYear.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MyPaymentItem[];
    },
    enabled: !!user?.id && !!activeYear?.id,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Pembayaran Saya"
        description="Pantau status verifikasi setoran kas dan unduh tanda bukti kuitansi pembayaran sah."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !myPayments?.length ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10 text-stone-400" />}
          title="Belum ada riwayat pembayaran"
          description="Setelah Anda menyetor kas tunai atau mengunggah bukti QRIS, riwayat lengkap akan tampil di sini."
        />
      ) : (
        <div className="space-y-3">
          {myPayments.map((p) => (
            <Card key={p.id} className="border-stone-200/80 bg-white shadow-xs">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#174C3C]">
                      {p.receipt_number || 'KLAIM-QRIS'}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {p.payment_method === 'CASH' ? 'Kas Tunai' : 'QRIS Resmi'}
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-500">
                    Diajukan: {formatDate(p.created_at, 'with-time')}
                  </p>
                  {p.notes && <p className="text-xs text-stone-600">{p.notes}</p>}

                  {/* If Rejected, show reason clearly */}
                  {p.status === 'REJECTED' && p.rejection_reason && (
                    <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800 border border-red-200 flex items-start gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                      <div>
                        <strong className="font-semibold">Alasan Penolakan:</strong> {p.rejection_reason}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-stone-500 uppercase font-semibold">
                      Jumlah Disetor
                    </span>
                    <p className="text-lg font-bold text-[#191B19]">
                      {formatCurrency(p.amount)}
                    </p>
                    <div className="mt-0.5">
                      {p.status === 'APPROVED' ? (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]">
                          <CheckCircle className="mr-1 h-3 w-3 text-emerald-600" /> Terverifikasi Lunas
                        </Badge>
                      ) : p.status === 'PENDING' ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px]">
                          <Clock className="mr-1 h-3 w-3 text-amber-600" /> Menunggu Verifikasi
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800 text-[10px]">
                          <XCircle className="mr-1 h-3 w-3 text-red-600" /> Ditolak
                        </Badge>
                      )}
                    </div>
                  </div>

                  {p.status === 'APPROVED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReceiptPayment(p)}
                      className="text-xs h-9 border-stone-200 text-stone-800 hover:bg-stone-50"
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" /> Kuitansi
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Official Receipt Dialog */}
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
                  <span className="font-semibold">{profile?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">NIM:</span>
                  <span>{profile?.nim || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Metode:</span>
                  <span>{receiptPayment.payment_method === 'CASH' ? 'Kas Tunai' : 'QRIS Resmi'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Tanggal Bayar:</span>
                  <span>{formatDate(receiptPayment.payment_date || receiptPayment.created_at, 'with-time')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-100 text-sm font-bold text-[#191B19]">
                  <span>Total Diterima:</span>
                  <span className="text-[#174C3C]">{formatCurrency(receiptPayment.amount)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-between items-end text-[11px] text-stone-500">
                <div>
                  <p>Diverifikasi oleh:</p>
                  <p className="font-semibold text-stone-800 mt-4">
                    {receiptPayment.verifier?.full_name || 'Bendahara Prodi'}
                  </p>
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
                <Printer className="mr-1 h-3.5 w-3.5" /> Cetak / Simpan Kuitansi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
