import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QrCode, Upload, Save, CheckCircle2, ShieldCheck, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [orgName, setOrgName] = useState('Program Studi Informatika');
  const [defaultAmount, setDefaultAmount] = useState(10000);
  const [defaultFrequency, setDefaultFrequency] = useState('MONTHLY');
  const [qrisImagePreview, setQrisImagePreview] = useState<string>('');
  const [qrisFile, setQrisFile] = useState<File | null>(null);
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
          const val = JSON.parse(s.value);
          if (s.key === 'organization_name') setOrgName(val);
          if (s.key === 'default_contribution_amount') setDefaultAmount(Number(val));
          if (s.key === 'default_billing_frequency') setDefaultFrequency(val);
          if (s.key === 'qris_image_path') setQrisImagePreview(val);
        } catch (e) {
          if (s.key === 'organization_name') setOrgName(s.value);
        }
      });
    }
  }, [settings]);

  // Handle QRIS File selection
  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrisFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrisImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      setSaveError(null);
      setSaveSuccess(false);

      let finalQrisUrl = qrisImagePreview;

      // Upload QRIS file to storage if a new file is chosen
      if (qrisFile) {
        try {
          const fileExt = qrisFile.name.split('.').pop();
          const fileName = `official_qris_${Date.now()}.${fileExt}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('branding')
            .upload(fileName, qrisFile, { upsert: true });

          if (!uploadErr && uploadData?.path) {
            const { data: publicUrlData } = supabase.storage
              .from('branding')
              .getPublicUrl(uploadData.path);
            finalQrisUrl = publicUrlData?.publicUrl || uploadData.path;
          }
        } catch (e) {
          console.warn('Storage bucket fallback to base64 preview');
        }
      }

      // Upsert app_settings entries
      const updates = [
        { key: 'organization_name', value: JSON.stringify(orgName), description: 'Nama organisasi' },
        { key: 'default_contribution_amount', value: String(defaultAmount), description: 'Jumlah iuran default' },
        { key: 'default_billing_frequency', value: JSON.stringify(defaultFrequency), description: 'Frekuensi penagihan default' },
        { key: 'qris_image_path', value: JSON.stringify(finalQrisUrl), description: 'Gambar QRIS resmi' },
        { key: 'timezone', value: JSON.stringify('Asia/Jakarta'), description: 'Zona waktu' },
        { key: 'currency', value: JSON.stringify('IDR'), description: 'Mata uang' },
      ];

      for (const item of updates) {
        await supabase
          .from('app_settings')
          .upsert(item, { onConflict: 'key' });
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
        description="Konfigurasi parameter operasional prodi, besaran tagihan default, dan berkas gambar QRIS resmi."
      />

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>Pengaturan dan gambar QRIS resmi berhasil diperbarui dan diterapkan ke seluruh sistem.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
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
              <Label className="text-xs font-semibold text-stone-700">Besaran Iuran Standar (IDR)</Label>
              <Input
                type="number"
                min="1000"
                step="1000"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(Number(e.target.value))}
                className="text-sm"
              />
              <p className="text-[11px] text-stone-500">Default sistem: Rp 10.000 per periode.</p>
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
                Berkas QRIS Statis Resmi
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-stone-500">
              Unggah file gambar QRIS resmi terbitan bank/rekening penampung prodi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 text-xs">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-stone-300 bg-stone-50/50">
              {qrisImagePreview ? (
                <div className="space-y-2 text-center">
                  <img
                    src={qrisImagePreview}
                    alt="Preview QRIS"
                    className="max-h-48 max-w-full rounded-lg shadow-xs border border-stone-200 object-contain mx-auto"
                  />
                  <p className="text-[11px] text-emerald-800 font-semibold">
                    Gambar QRIS aktif siap dipindai mahasiswa
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center text-stone-400">
                  <QrCode className="h-12 w-12 mx-auto mb-2 text-stone-300" />
                  <p className="text-xs">Belum ada gambar QRIS diunggah</p>
                </div>
              )}

              <div className="mt-3">
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
                  className="text-xs border-stone-200"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Pilih File Gambar QRIS
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              Catatan: Pastikan gambar memiliki kontras tinggi dan QR code dapat dipindai dengan sempurna oleh kamera smartphone.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => saveSettingsMutation.mutate()}
          disabled={saveSettingsMutation.isPending}
          className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-semibold h-10 px-6"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveSettingsMutation.isPending ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan'}
        </Button>
      </div>
    </div>
  );
}
