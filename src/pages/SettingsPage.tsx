import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RupiahInput } from '@/components/ui/rupiah-input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QrCode, Upload, Save, CheckCircle2, Building2, Trash2, Link as LinkIcon, RefreshCw } from 'lucide-react';

// Helper to compress image on client canvas to reduce size (< 100KB) while keeping QR codes crisp
async function compressImageToDataUrl(file: File, maxWidth = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const [orgName, setOrgName] = useState('Program Studi Informatika');
  const [defaultAmount, setDefaultAmount] = useState<number>(10000);
  const [defaultFrequency, setDefaultFrequency] = useState('MONTHLY');
  const [qrisImagePreview, setQrisImagePreview] = useState<string>('');
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [qrisDirectUrl, setQrisDirectUrl] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch current app settings
  const { data: settings } = useQuery({
    queryKey: ['app_settings_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      settings.forEach((s) => {
        try {
          const val = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          if (s.key === 'organization_name') setOrgName(val);
          if (s.key === 'default_contribution_amount') setDefaultAmount(Number(val) || 10000);
          if (s.key === 'default_billing_frequency') setDefaultFrequency(val);
          if (s.key === 'qris_image_path') {
            setQrisImagePreview(val || '');
            if (val && !val.startsWith('data:')) {
              setQrisDirectUrl(val);
            }
          }
        } catch {
          if (s.key === 'organization_name') setOrgName(s.value);
        }
      });
    }
  }, [settings]);

  // Handle QRIS File selection with automatic client-side compression
  const handleQrisFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        setQrisFile(file);
        const compressedDataUrl = await compressImageToDataUrl(file);
        setQrisImagePreview(compressedDataUrl);
      } catch (err) {
        console.error('Gagal mengompres gambar:', err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleApplyDirectUrl = () => {
    if (qrisDirectUrl.trim()) {
      setQrisImagePreview(qrisDirectUrl.trim());
      setQrisFile(null);
    }
  };

  const handleClearQris = () => {
    setQrisImagePreview('');
    setQrisDirectUrl('');
    setQrisFile(null);
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      setSaveError(null);
      setSaveSuccess(false);

      let finalQrisUrl = qrisImagePreview;

      // 1. If user selected a new file, attempt upload to Supabase Storage 'branding' bucket
      if (qrisFile && qrisImagePreview.startsWith('data:')) {
        try {
          const fileName = `official_qris_${Date.now()}.jpg`;
          const res = await fetch(qrisImagePreview);
          const blob = await res.blob();

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('branding')
            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

          if (!uploadErr && uploadData?.path) {
            const { data: publicUrlData } = supabase.storage
              .from('branding')
              .getPublicUrl(uploadData.path);
            if (publicUrlData?.publicUrl) {
              finalQrisUrl = publicUrlData.publicUrl;
            }
          } else {
            console.warn('Storage upload fallback to compressed base64 URI:', uploadErr?.message);
            // Storage fallback: use the lightweight compressed base64 URI
            finalQrisUrl = qrisImagePreview;
          }
        } catch (e) {
          console.warn('Storage bucket fallback to base64 preview');
          finalQrisUrl = qrisImagePreview;
        }
      }

      // 2. Upsert app_settings entries with strict error checking
      const updates = [
        { key: 'organization_name', value: JSON.stringify(orgName), description: 'Nama organisasi' },
        { key: 'default_contribution_amount', value: String(defaultAmount || 10000), description: 'Jumlah iuran default' },
        { key: 'default_billing_frequency', value: JSON.stringify(defaultFrequency), description: 'Frekuensi penagihan default' },
        { key: 'qris_image_path', value: JSON.stringify(finalQrisUrl), description: 'Gambar QRIS resmi' },
        { key: 'timezone', value: JSON.stringify('Asia/Jakarta'), description: 'Zona waktu' },
        { key: 'currency', value: JSON.stringify('IDR'), description: 'Mata uang' },
      ];

      for (const item of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(item, { onConflict: 'key' });

        if (error) {
          throw new Error(`Gagal menyimpan pengaturan (${item.key}): ${error.message}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_settings_all'] });
      queryClient.invalidateQueries({ queryKey: ['official_qris_image'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err: any) => {
      setSaveError(err.message || 'Gagal menyimpan pengaturan aplikasi');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem & QRIS Resmi"
        description="Konfigurasi parameter operasional prodi, besaran tagihan standar, dan gambar QRIS resmi penampung kas."
      />

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>Pengaturan dan gambar QRIS resmi berhasil diperbarui dan diterapkan ke seluruh sistem.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 shadow-xs">
          {saveError}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings Card */}
        <Card className="border-stone-200/80 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#174C3C]" />
              <CardTitle className="text-base font-bold text-[#191B19]">
                Identitas & Standar Tagihan
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-stone-500">
              Pengaturan default untuk penerbitan iuran berkala mahasiswa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Nama Organisasi / Prodi</Label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Besaran Iuran Standar Default</Label>
              <RupiahInput
                value={defaultAmount}
                onChange={setDefaultAmount}
                placeholder="10.000"
              />
              <p className="text-[11px] text-stone-500">Nilai rujukan awal saat membuat periode tagihan baru.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Frekuensi Penagihan Default</Label>
              <Select value={defaultFrequency} onValueChange={setDefaultFrequency}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Bulanan (Monthly)</SelectItem>
                  <SelectItem value="WEEKLY">Mingguan (Weekly)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-stone-50 p-3 border border-stone-100 text-[11px] text-stone-600 space-y-1">
              <p>Mata Uang Baku: <strong>Indonesian Rupiah (IDR)</strong></p>
              <p>Zona Waktu Operasional: <strong>Asia/Jakarta (WIB)</strong></p>
            </div>
          </CardContent>
        </Card>

        {/* Official QRIS Image Card */}
        <Card className="border-stone-200/80 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#174C3C]" />
              <CardTitle className="text-base font-bold text-[#191B19]">
                Gambar QRIS Resmi Kas
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-stone-500">
              Unggah file gambar QRIS resmi terbitan bank/rekening penampung kas prodi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 text-xs">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-stone-300 bg-stone-50/50 min-h-[180px]">
              {isCompressing ? (
                <div className="py-8 text-center text-stone-500 flex flex-col items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#174C3C]" />
                  <span className="text-xs">Mengoptimalkan gambar QRIS...</span>
                </div>
              ) : qrisImagePreview ? (
                <div className="space-y-2 text-center w-full">
                  <div className="relative inline-block max-w-full">
                    <img
                      src={qrisImagePreview}
                      alt="Preview QRIS"
                      className="max-h-52 max-w-full rounded-lg shadow-sm border border-stone-200 object-contain mx-auto bg-white p-2"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      QRIS Aktif Siap Dipindai
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearQris}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] h-7 px-2"
                      title="Hapus gambar QRIS"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-stone-400">
                  <QrCode className="h-12 w-12 mx-auto mb-2 text-stone-300" />
                  <p className="text-xs">Belum ada gambar QRIS diunggah</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Mendukung format JPG, PNG, atau WebP</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <input
                  type="file"
                  id="qrisUpload"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleQrisFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('qrisUpload')?.click()}
                  className="text-xs border-stone-200 bg-white hover:bg-stone-50"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Pilih Berkas Gambar
                </Button>
              </div>
            </div>

            {/* Direct URL input option */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-[11px] font-semibold text-stone-600">
                Atau Tempel URL Gambar QRIS Langsung:
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://.../qris.png"
                  value={qrisDirectUrl}
                  onChange={(e) => setQrisDirectUrl(e.target.value)}
                  className="text-xs h-8"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyDirectUrl}
                  className="text-xs h-8 shrink-0"
                >
                  <LinkIcon className="h-3 w-3 mr-1" /> Terapkan
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              Catatan: Gambar QRIS ini akan otomatis tampil saat mahasiswa memilih opsi bayar via QRIS di halaman tagihan mereka.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => saveSettingsMutation.mutate()}
          disabled={saveSettingsMutation.isPending || isCompressing}
          className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-semibold h-10 px-6 shadow-sm"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveSettingsMutation.isPending ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan'}
        </Button>
      </div>
    </div>
  );
}
