import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Printer, FileSpreadsheet, BarChart, FileText, ArrowRight } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const { activeYear } = useAcademicYear();

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'INCOME' | 'EXPENSE' | 'ARREARS'>('SUMMARY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch full financial report dataset
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['financial_report_data', activeYear?.id, startDate, endDate],
    queryFn: async () => {
      if (!activeYear?.id) return null;

      // 1. Payments (student fees)
      let payQuery = supabase
        .from('payments')
        .select(`
          id,
          receipt_number,
          amount,
          payment_method,
          payment_date,
          status,
          payer:profiles!payer_id(full_name, nim)
        `)
        .eq('academic_year_id', activeYear.id)
        .eq('status', 'APPROVED');

      if (startDate) payQuery = payQuery.gte('payment_date', startDate);
      if (endDate) payQuery = payQuery.lte('payment_date', endDate);

      // 2. Other Incomes
      let incQuery = supabase
        .from('income_records')
        .select(`
          id,
          reference_number,
          amount,
          income_category,
          source_payer,
          description,
          status,
          created_at
        `)
        .eq('academic_year_id', activeYear.id)
        .in('status', ['APPROVED', 'POSTED']);

      // 3. Expenses
      let expQuery = supabase
        .from('expenses')
        .select(`
          id,
          reference_number,
          amount,
          expense_category,
          vendor_recipient,
          description,
          status,
          created_at
        `)
        .eq('academic_year_id', activeYear.id)
        .in('status', ['APPROVED', 'POSTED']);

      // 4. Unpaid obligations (Arrears)
      const arrQuery = supabase
        .from('student_obligations')
        .select(`
          id,
          amount,
          paid_amount,
          remaining_amount,
          due_date,
          status,
          student:profiles!student_id(full_name, nim),
          contribution_type:contribution_types!contribution_type_id(name)
        `)
        .eq('academic_year_id', activeYear.id)
        .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']);

      const [payRes, incRes, expRes, arrRes] = await Promise.all([
        payQuery,
        incQuery,
        expQuery,
        arrQuery,
      ]);

      const payments = (payRes.data || []) as any[];
      const incomes = (incRes.data || []) as any[];
      const expenses = (expRes.data || []) as any[];
      const arrears = (arrRes.data || []) as any[];

      const totalStudentFees = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalOtherIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
      const totalIncome = totalStudentFees + totalOtherIncome;
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const netCashBalance = totalIncome - totalExpenses;
      const totalArrears = arrears.reduce((sum, a) => sum + Number(a.remaining_amount || 0), 0);

      return {
        payments,
        incomes,
        expenses,
        arrears,
        totalStudentFees,
        totalOtherIncome,
        totalIncome,
        totalExpenses,
        netCashBalance,
        totalArrears,
      };
    },
    enabled: !!activeYear?.id,
  });

  // Export CSV Handler with Formula Injection Prevention
  const exportCSV = () => {
    if (!reportData) return;

    let rows: string[][] = [];
    let filename = `Laporan_Keuangan_${activeYear?.year_code || '2026'}.csv`;

    // Safe escaping for CSV (prepend single quote if starting with formula triggers =,+,-,@)
    const sanitize = (val: any) => {
      let str = String(val ?? '');
      if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    if (activeTab === 'INCOME') {
      rows.push(['No. Bukti / Ref', 'Tanggal', 'Sumber / Pembayar', 'Kategori', 'Nominal']);
      reportData.payments.forEach((p) => {
        rows.push([
          sanitize(p.receipt_number),
          sanitize(p.payment_date),
          sanitize(p.payer?.full_name),
          sanitize(`Iuran Kas (${p.payment_method})`),
          sanitize(p.amount),
        ]);
      });
      reportData.incomes.forEach((i) => {
        rows.push([
          sanitize(i.reference_number),
          sanitize(i.created_at.split('T')[0]),
          sanitize(i.source_payer),
          sanitize(i.income_category),
          sanitize(i.amount),
        ]);
      });
      filename = `Laporan_Penerimaan_${activeYear?.year_code}.csv`;
    } else if (activeTab === 'EXPENSE') {
      rows.push(['No. Ref', 'Tanggal', 'Penerima / Vendor', 'Kategori', 'Uraian', 'Nominal']);
      reportData.expenses.forEach((e) => {
        rows.push([
          sanitize(e.reference_number),
          sanitize(e.created_at.split('T')[0]),
          sanitize(e.vendor_recipient || '-'),
          sanitize(e.expense_category),
          sanitize(e.description),
          sanitize(e.amount),
        ]);
      });
      filename = `Laporan_Pengeluaran_${activeYear?.year_code}.csv`;
    } else if (activeTab === 'ARREARS') {
      rows.push(['NIM', 'Nama Mahasiswa', 'Jenis Iuran', 'Jatuh Tempo', 'Sisa Tunggakan']);
      reportData.arrears.forEach((a) => {
        rows.push([
          sanitize(a.student?.nim || '-'),
          sanitize(a.student?.full_name),
          sanitize(a.contribution_type?.name),
          sanitize(a.due_date || '-'),
          sanitize(a.remaining_amount),
        ]);
      });
      filename = `Laporan_Tunggakan_${activeYear?.year_code}.csv`;
    } else {
      // Summary
      rows.push(['Indikator Keuangan', 'Nilai (IDR)']);
      rows.push(['Total Penerimaan Iuran Mahasiswa', sanitize(reportData.totalStudentFees)]);
      rows.push(['Total Pendapatan Lain / Donasi', sanitize(reportData.totalOtherIncome)]);
      rows.push(['Total Seluruh Pemasukan Kas', sanitize(reportData.totalIncome)]);
      rows.push(['Total Pengeluaran Kas', sanitize(reportData.totalExpenses)]);
      rows.push(['Saldo Kas Bersih Riil', sanitize(reportData.netCashBalance)]);
      rows.push(['Total Tunggakan Belum Dibayar', sanitize(reportData.totalArrears)]);
      filename = `Ringkasan_Keuangan_${activeYear?.year_code}.csv`;
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF Handler with formal title, metadata, tables and signatures
  const exportPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header & Letterhead
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(23, 76, 60); // #174C3C Forest Green
    doc.text('UNIVERSITAS NAHDLATUL ULAMA AL GHAZALI CILACAP', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('PROGRAM STUDI INFORMATIKA', 105, 21, { align: 'center' });

    doc.setFontSize(15);
    doc.setTextColor(25, 27, 25);
    doc.text('LAPORAN PERTANGGUNGJAWABAN KAS', 105, 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Tahun Akademik: ${activeYear?.display_name || '2026/2027'} | Dicetak: ${formatDate(new Date(), 'with-time')}`, 105, 33, { align: 'center' });

    doc.setDrawColor(23, 76, 60);
    doc.setLineWidth(0.6);
    doc.line(14, 37, 196, 37);

    let currentY = 44;

    // Financial Recap Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(25, 27, 25);
    doc.text('1. REKAPITULASI POSISI KEUANGAN KAS', 14, currentY);

    const summaryTableData = [
      ['Total Iuran Kas Mahasiswa', formatCurrency(reportData.totalStudentFees)],
      ['Total Pendapatan Lain / Donasi', formatCurrency(reportData.totalOtherIncome)],
      ['Total Pemasukan Kas', formatCurrency(reportData.totalIncome)],
      ['Total Pengeluaran Kas', formatCurrency(reportData.totalExpenses)],
      ['Saldo Kas Bersih Riil', formatCurrency(reportData.netCashBalance)],
      ['Total Kewajiban Tertunggak Mahasiswa', formatCurrency(reportData.totalArrears)],
    ];

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Komponen', 'Nominal (IDR)']],
      body: summaryTableData,
      theme: 'grid',
      headStyles: { fillColor: [23, 76, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // Top transactions section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('2. DAFTAR PENERIMAAN TERAKHIR', 14, currentY);

    const paymentRows = reportData.payments.slice(0, 8).map((p: any) => [
      p.receipt_number || '-',
      formatDate(p.payment_date),
      p.payer?.full_name || 'Mahasiswa',
      p.payment_method,
      formatCurrency(p.amount),
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['No. Kuitansi', 'Tanggal', 'Mahasiswa', 'Metode', 'Jumlah']],
      body: paymentRows.length > 0 ? paymentRows : [['-', '-', 'Belum ada data', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      columnStyles: { 4: { halign: 'right' } },
    });

    // Formal Signature Block at the bottom
    const pageHeight = doc.internal.pageSize.height;
    const signY = pageHeight - 45;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);

    // Left signature: Bendahara
    doc.text('Mengetahui / Memeriksa,', 30, signY);
    doc.text('Bendahara Prodi Informatika', 30, signY + 5);
    doc.line(30, signY + 25, 75, signY + 25);
    doc.text('( ........................................ )', 30, signY + 29);

    // Right signature: Ketua Prodi / Pembina
    doc.text('Menyetujui,', 140, signY);
    doc.text('Ketua Program Studi Informatika', 140, signY + 5);
    doc.line(140, signY + 25, 185, signY + 25);
    doc.text('( ........................................ )', 140, signY + 29);

    doc.save(`Laporan_Keuangan_KAS_INFORMATIKA_${activeYear?.year_code || '2026'}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Keuangan & Akuntabilitas"
        description="Analisis laporan arus kas, penerimaan iuran, pengeluaran belanja, dan ekspor dokumen resmi PDF/CSV."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="text-xs h-9 border-stone-200 text-stone-800 hover:bg-stone-50"
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-700" /> Ekspor CSV
          </Button>
          <Button
            onClick={exportPDF}
            className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs h-9"
          >
            <Download className="mr-1.5 h-4 w-4" /> Unduh Laporan PDF
          </Button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="bg-stone-100 p-1">
          <TabsTrigger value="SUMMARY" className="text-xs">Ringkasan Eksekutif</TabsTrigger>
          <TabsTrigger value="INCOME" className="text-xs">Buku Penerimaan</TabsTrigger>
          <TabsTrigger value="EXPENSE" className="text-xs">Buku Pengeluaran</TabsTrigger>
          <TabsTrigger value="ARREARS" className="text-xs">Daftar Tunggakan</TabsTrigger>
        </TabsList>

        {/* Tab 1: SUMMARY */}
        <TabsContent value="SUMMARY" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-stone-200/80 bg-white">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Total Seluruh Pemasukan
                </p>
                <p className="text-2xl font-bold text-emerald-800 mt-1">
                  {formatCurrency(reportData?.totalIncome || 0)}
                </p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Iuran: {formatCurrency(reportData?.totalStudentFees || 0)} · Lainnya: {formatCurrency(reportData?.totalOtherIncome || 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-stone-200/80 bg-white">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Total Beban Pengeluaran
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(reportData?.totalExpenses || 0)}
                </p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Beban operasional & kegiatan terealisasi
                </p>
              </CardContent>
            </Card>

            <Card className="border-stone-200/80 bg-white">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Saldo Kas Bersih Tersedia
                </p>
                <p className="text-2xl font-bold text-[#174C3C] mt-1">
                  {formatCurrency(reportData?.netCashBalance || 0)}
                </p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Kas fisik + saldo bank riil
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-stone-200/80 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#191B19]">
                Rincian Arus Kas ({activeYear?.display_name})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-stone-50">
                  <TableRow>
                    <TableHead className="font-semibold text-[#191B19]">Pos Keuangan</TableHead>
                    <TableHead className="font-semibold text-[#191B19] text-right">Jumlah (IDR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">1. Penerimaan Iuran Mahasiswa Terverifikasi</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-800">
                      +{formatCurrency(reportData?.totalStudentFees || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">2. Penerimaan Donasi, Sponsor, & Non-Iuran</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-800">
                      +{formatCurrency(reportData?.totalOtherIncome || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-stone-50/50">
                    <TableCell className="font-bold">Total Arus Masuk (Inflow)</TableCell>
                    <TableCell className="text-right font-bold text-[#174C3C]">
                      {formatCurrency(reportData?.totalIncome || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">3. Realisasi Pengeluaran & Beban Kegiatan</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      -{formatCurrency(reportData?.totalExpenses || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-50/60 font-bold">
                    <TableCell className="text-[#174C3C]">Posisi Saldo Kas Akhir</TableCell>
                    <TableCell className="text-right text-[#174C3C] text-base">
                      {formatCurrency(reportData?.netCashBalance || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: INCOME */}
        <TabsContent value="INCOME" className="space-y-4 mt-4">
          <Card className="border-stone-200/80 bg-white overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-stone-50">
                <TableRow>
                  <TableHead className="font-semibold text-[#191B19]">No. Ref / Kuitansi</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">Tanggal</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">Sumber / Pembayar</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">Kategori</TableHead>
                  <TableHead className="font-semibold text-[#191B19] text-right">Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.receipt_number || '-'}</TableCell>
                    <TableCell className="text-xs">{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="font-semibold text-xs text-stone-900">{p.payer?.full_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">Iuran ({p.payment_method})</Badge></TableCell>
                    <TableCell className="text-right font-bold text-xs text-emerald-800">+{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))}
                {reportData?.incomes.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.reference_number}</TableCell>
                    <TableCell className="text-xs">{formatDate(i.created_at)}</TableCell>
                    <TableCell className="font-semibold text-xs text-stone-900">{i.source_payer}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{i.income_category}</Badge></TableCell>
                    <TableCell className="text-right font-bold text-xs text-emerald-800">+{formatCurrency(i.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 3: EXPENSE */}
        <TabsContent value="EXPENSE" className="space-y-4 mt-4">
          <Card className="border-stone-200/80 bg-white overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-stone-50">
                <TableRow>
                  <TableHead className="font-semibold text-[#191B19]">No. Ref</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">Tanggal</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">Penerima / Vendor</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">Kategori</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">Deskripsi</TableHead>
                  <TableHead className="font-semibold text-[#191B19] text-right">Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.expenses.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.reference_number}</TableCell>
                    <TableCell className="text-xs">{formatDate(e.created_at)}</TableCell>
                    <TableCell className="font-semibold text-xs text-stone-900">{e.vendor_recipient || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{e.expense_category}</Badge></TableCell>
                    <TableCell className="text-xs text-stone-600 max-w-xs truncate">{e.description}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-red-600">-{formatCurrency(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 4: ARREARS */}
        <TabsContent value="ARREARS" className="space-y-4 mt-4">
          <Card className="border-stone-200/80 bg-white overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-stone-50">
                <TableRow>
                  <TableHead className="font-semibold text-[#191B19]">Mahasiswa</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">NIM</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">Jenis Iuran</TableHead>
                  <TableHead className="font-semibold text-[#191B19]">Jatuh Tempo</TableHead>
                  <TableHead className="font-semibold text-[#191B19] text-right">Sisa Tunggakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.arrears.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-semibold text-xs text-stone-900">{a.student?.full_name}</TableCell>
                    <TableCell className="text-xs text-stone-600 font-mono">{a.student?.nim || '-'}</TableCell>
                    <TableCell className="text-xs">{a.contribution_type?.name}</TableCell>
                    <TableCell className="text-xs text-stone-600">{a.due_date ? formatDate(a.due_date) : '-'}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-red-600">{formatCurrency(a.remaining_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
