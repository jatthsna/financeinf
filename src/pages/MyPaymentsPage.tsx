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
import { CreditCard, Printer, CheckCircle, Clock, XCircle, AlertCircle, Eye } from 'lucide-react';
import { OfficialReceiptModal, type OfficialReceiptData } from '@/components/OfficialReceiptModal';
import { EvidenceViewerModal } from '@/components/EvidenceViewerModal';

interface MyPaymentItem {
  id: string;
  reference_number: string;
  amount: number;
  payment_method: 'CASH' | 'QRIS';
  payment_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer?: {
    full_name: string;
  };
  allocations?: Array<{
    amount: number;
    obligation?: {
      period?: {
        period_label: string;
        contribution_type?: {
          name: string;
        };
      };
    };
  }>;
  evidence?: Array<{
    id: string;
    file_path: string;
    file_name: string;
  }>;
}

export default function MyPaymentsPage() {
  const { activeYear } = useAcademicYear();
  const { user, profile } = useAuth();

  const [receiptData, setReceiptData] = useState<OfficialReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxFileName, setLightboxFileName] = useState<string>('bukti-transfer.jpg');

  const { data: myPayments, isLoading } = useQuery({
    queryKey: ['my_payments_history', user?.id, activeYear?.id],
    queryFn: async () => {
      if (!user?.id || !activeYear?.id) return [];
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          reference_number,
          amount,
          payment_method,
          payment_date,
          status,
          notes,
          rejection_reason,
          created_at,
          reviewed_at,
          reviewer:profiles!reviewed_by(full_name),
          allocations:payment_allocations(
            amount,
            obligation:student_obligations(
              period:contribution_periods!contribution_period_id(
                period_label,
                contribution_type:contribution_types!contribution_type_id(name)
              )
            )
          ),
          evidence:payment_evidence(
            id,
            file_path,
            file_name
          )
        `)
        .eq('student_id', user.id)
        .eq('academic_year_id', activeYear.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching student payments:', error);
        return [];
      }
      return (data || []) as unknown as MyPaymentItem[];
    },
    enabled: !!user?.id && !!activeYear?.id,
  });

  const handleOpenReceipt = (p: MyPaymentItem) => {
    const purposeName = p.allocations?.[0]?.obligation?.period?.contribution_type?.name 
      || p.allocations?.[0]?.obligation?.period?.period_label
      || 'Iuran Kas Mahasiswa';

    setReceiptData({
      receipt_number: p.reference_number || `KWT-${p.id.slice(0, 8)}`,
      student_name: profile?.full_name || 'Mahasiswa Informatika',
      student_nim: profile?.nim || '-',
      amount: p.amount,
      payment_method: p.payment_method,
      payment_date: p.payment_date || p.created_at,
      verified_by_name: p.reviewer?.full_name || 'Bendahara Kas Informatika',
      verified_at: p.reviewed_at || p.created_at,
      notes: p.notes,
      purpose: purposeName,
    });
    setIsReceiptOpen(true);
  };

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
            <Card key={p.id} className="border-stone-200/80 bg-white shadow-xs hover:border-stone-300 transition-all">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#174C3C]">
                      {p.reference_number || 'KLAIM-QRIS'}
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

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0">
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

                  <div className="flex items-center gap-1.5">
                    {p.evidence && p.evidence.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLightboxUrl(p.evidence![0].file_path);
                          setLightboxFileName(p.evidence![0].file_name || 'bukti-transfer.jpg');
                        }}
                        className="text-xs h-9 text-stone-600 hover:text-stone-900 border border-stone-200"
                        title="Lihat Bukti yang Anda Unggah"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5 text-stone-500" /> Bukti
                      </Button>
                    )}

                    {p.status === 'APPROVED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReceipt(p)}
                        className="text-xs h-9 border-stone-200 text-stone-800 hover:bg-stone-50 font-medium"
                      >
                        <Printer className="mr-1.5 h-3.5 w-3.5" /> Kuitansi
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox Evidence Modal */}
      <EvidenceViewerModal
        open={!!lightboxUrl}
        onOpenChange={(open) => !open && setLightboxUrl(null)}
        imageUrl={lightboxUrl}
        fileName={lightboxFileName}
        title="Bukti Transfer yang Anda Kirim"
      />

      {/* Official Receipt Modal */}
      <OfficialReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        data={receiptData}
      />
    </div>
  );
}
