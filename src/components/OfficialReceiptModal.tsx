import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Copy, Check, ShieldCheck, Download } from 'lucide-react';
import { formatCurrency, formatDate, terbilang } from '@/lib/utils';

export interface OfficialReceiptData {
  receipt_number: string;
  student_name: string;
  student_nim?: string | null;
  amount: number;
  payment_method: 'CASH' | 'QRIS' | string;
  payment_date: string;
  verified_by_name?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  purpose?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: OfficialReceiptData | null;
}

export function OfficialReceiptModal({ open, onOpenChange, data }: Props) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `*BUKTI PEMBAYARAN KAS INFORMATIKA*
----------------------------------------
No. Kwitansi: ${data.receipt_number}
Tanggal: ${formatDate(data.payment_date, 'with-time')}
Nama Mahasiswa: ${data.student_name}
NIM: ${data.student_nim || '-'}
Untuk: ${data.purpose || 'Iuran Kas / Kegiatan Mahasiswa'}
Nominal: ${formatCurrency(data.amount)}
Terbilang: ${terbilang(data.amount)}
Metode: ${data.payment_method === 'CASH' ? 'Kas Tunai Fisik' : 'QRIS Resmi'}
Status: LUNAS & TERVERIFIKASI
Diverifikasi oleh: ${data.verified_by_name || 'Bendahara Kas Informatika'}
----------------------------------------
_Simpan tanda bukti ini sebagai bukti pelunasan sah._`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white p-4 sm:p-6 print:p-0 print:border-none print:shadow-none print:max-w-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="text-base sm:text-lg font-bold text-[#191B19] flex items-center justify-between">
            <span>Kwitansi Pembayaran Resmi</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="text-xs h-8 text-stone-700"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Salin Teks WA
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs h-8"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" /> Cetak / Unduh PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* PRINTABLE RECEIPT CONTAINER */}
        <div id="official-receipt-print" className="bg-white border-2 border-stone-800 rounded-lg p-6 sm:p-8 relative overflow-hidden text-stone-900 font-sans shadow-xs mt-2 print:border-none print:p-4 print:mt-0">
          
          {/* Watermark "LUNAS" */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.04] select-none">
            <span className="text-8xl sm:text-9xl font-black uppercase tracking-widest text-[#174C3C] -rotate-12 border-8 border-dashed border-[#174C3C] p-8 rounded-3xl">
              LUNAS
            </span>
          </div>

          {/* KOP SURAT */}
          <div className="border-b-2 border-stone-900 pb-4 text-center space-y-1 relative">
            <p className="text-[10px] sm:text-xs tracking-wider uppercase font-semibold text-stone-600">
              UNIVERSITAS NAHDLATUL ULAMA AL GHAZALI (UNUGHA) CILACAP
            </p>
            <h2 className="text-base sm:text-xl font-black tracking-wide text-stone-900 uppercase">
              HIMPUNAN MAHASISWA PROGRAM STUDI INFORMATIKA
            </h2>
            <p className="text-[10px] sm:text-[11px] text-stone-500">
              Jl. O inspection No. 09, Kesugihan, Cilacap, Jawa Tengah | Sistem Pengelolaan Kas Terpadu
            </p>
            <div className="pt-2">
              <span className="inline-block bg-stone-900 text-white font-mono text-[11px] font-bold px-3 py-0.5 rounded tracking-widest uppercase">
                TANDA BUKTI PEMBAYARAN KAS
              </span>
            </div>
          </div>

          {/* NOMOR & TANGGAL */}
          <div className="flex flex-col sm:flex-row justify-between text-xs py-3 border-b border-stone-300 gap-1">
            <div>
              <span className="text-stone-500">No. Kuitansi : </span>
              <strong className="font-mono text-sm tracking-wide text-[#174C3C]">{data.receipt_number}</strong>
            </div>
            <div>
              <span className="text-stone-500">Tanggal : </span>
              <strong className="font-medium">{formatDate(data.payment_date, 'long')}</strong>
            </div>
          </div>

          {/* ISI TRANSAKSI */}
          <div className="py-4 space-y-3 text-xs sm:text-sm">
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 sm:col-span-3 text-stone-600 font-medium">Telah Diterima Dari</span>
              <span className="col-span-1 text-center font-bold">:</span>
              <div className="col-span-7 sm:col-span-8">
                <p className="font-bold text-stone-900 text-sm sm:text-base uppercase">{data.student_name}</p>
                {data.student_nim && (
                  <p className="text-xs text-stone-500 font-mono">NIM: {data.student_nim}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-baseline">
              <span className="col-span-4 sm:col-span-3 text-stone-600 font-medium">Uang Sejumlah</span>
              <span className="col-span-1 text-center font-bold">:</span>
              <div className="col-span-7 sm:col-span-8 bg-stone-100 p-2 sm:p-2.5 rounded border border-stone-200">
                <p className="font-bold italic text-stone-800 text-xs sm:text-sm">
                  "{terbilang(data.amount)}"
                </p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 sm:col-span-3 text-stone-600 font-medium">Untuk Pembayaran</span>
              <span className="col-span-1 text-center font-bold">:</span>
              <div className="col-span-7 sm:col-span-8 text-stone-800 font-medium">
                {data.purpose || 'Setoran Iuran Kas Program Studi Informatika'}
                {data.notes && (
                  <p className="text-xs text-stone-500 italic mt-0.5">Catatan: {data.notes}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 sm:col-span-3 text-stone-600 font-medium">Metode Setoran</span>
              <span className="col-span-1 text-center font-bold">:</span>
              <div className="col-span-7 sm:col-span-8 font-semibold text-stone-800 flex items-center gap-2">
                <span>{data.payment_method === 'CASH' ? 'Setoran Tunai (Cash)' : 'QRIS / Transfer Bank'}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="h-3 w-3 mr-1" /> SAH & LUNAS
                </span>
              </div>
            </div>
          </div>

          {/* JUMLAH BESAR & TANDA TANGAN */}
          <div className="pt-4 border-t-2 border-stone-800 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <span className="text-[11px] font-bold uppercase text-stone-500 block mb-1">
                Total Pembayaran:
              </span>
              <div className="inline-block bg-[#174C3C] text-white px-4 py-2 rounded-lg text-lg sm:text-xl font-black font-mono shadow-inner">
                {formatCurrency(data.amount)}
              </div>
            </div>

            <div className="text-center sm:text-right space-y-1 sm:pl-8">
              <p className="text-xs text-stone-600">
                Cilacap, {formatDate(data.verified_at || data.payment_date, 'long')}
              </p>
              <p className="text-xs font-semibold text-stone-700">Diverifikasi & Disahkan,</p>
              
              {/* Tanda tangan / stempel */}
              <div className="h-16 flex items-center justify-center sm:justify-end">
                <div className="border border-emerald-600 rounded-md px-3 py-1 bg-emerald-50/70 text-emerald-800 text-[10px] font-bold uppercase tracking-wider text-center transform -rotate-2">
                  <span className="block font-black text-xs text-emerald-900">TERVERIFIKASI SISTEM</span>
                  <span>KAS INFORMATIKA UNUGHA</span>
                </div>
              </div>

              <p className="text-xs font-bold text-stone-900 underline uppercase">
                {data.verified_by_name || 'Bendahara Program Studi'}
              </p>
              <p className="text-[10px] text-stone-500">Program Studi Informatika UNUGHA</p>
            </div>
          </div>

          {/* FOOTER NOTICE */}
          <div className="mt-6 pt-2 border-t border-dotted border-stone-300 text-center text-[10px] text-stone-400">
            Kwitansi ini dibuat secara otomatis oleh Sistem Informasi Keuangan Kas Informatika (https://kasinformatika.jat.web.id) dan merupakan dokumen elektronik yang sah.
          </div>
        </div>

        {/* Global Print Stylesheet injected into DOM */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #official-receipt-print, #official-receipt-print * {
                visibility: visible !important;
              }
              #official-receipt-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border: 2px solid #000 !important;
                box-shadow: none !important;
                margin: 0 !important;
                padding: 24px !important;
              }
            }
          `
        }} />
      </DialogContent>
    </Dialog>
  );
}
