import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, User, Mail, GraduationCap, Phone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, profile, updateProfile } = useAuth();

  const [phone, setPhone] = useState(profile?.phone || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran foto profil maksimal 5MB.');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let avatarUrl = profile?.avatar_url || null;

      // Upload file to Supabase storage if a new image was chosen
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          // If public bucket direct url:
          console.warn('Storage upload error, using preview data:', uploadError.message);
          avatarUrl = avatarPreview;
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = publicUrlData?.publicUrl || filePath;
        }
      }

      const { error } = await updateProfile({
        full_name: fullName.trim() || profile?.full_name,
        phone: phone.trim() || null,
        avatar_url: avatarUrl,
      });

      if (error) throw error;

      setSuccessMsg('Foto profil dan data diri berhasil diperbarui!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan profil pengguna.');
    } finally {
      setSaving(false);
    }
  };

  const userInitials = (profile?.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#191B19]">Profil Pribadi</DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            Kelola foto profil dan informasi kontak Anda.
          </DialogDescription>
        </DialogHeader>

        {successMsg && (
          <div className="p-3 text-xs rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
          {/* Avatar Upload Area */}
          <div className="flex flex-col items-center justify-center gap-2 pb-2">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-[#174C3C] shadow-sm bg-stone-100 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={profile?.full_name || 'Avatar'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-[#174C3C]">{userInitials}</span>
                )}
              </div>

              {/* Camera Icon Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#174C3C] text-white shadow-md hover:bg-[#12382c] transition-colors"
                title="Unggah foto profil baru"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-[11px] text-stone-500">
              Klik ikon kamera untuk mengganti foto (Maks 5MB)
            </p>
          </div>

          <div className="rounded-lg bg-stone-50 p-3 border border-stone-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 text-[11px]">Peran Otorisasi:</span>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  profile?.role === 'ADMIN'
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : profile?.role === 'BENDAHARA'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                }`}
              >
                {profile?.role || 'MAHASISWA'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-500 text-[11px]">Email Terdaftar:</span>
              <span className="font-mono text-stone-800">{profile?.email}</span>
            </div>

            {profile?.nim && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">NIM Mahasiswa:</span>
                <span className="font-mono font-semibold text-stone-800">{profile.nim}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="profFullName" className="text-xs font-semibold text-stone-700">Nama Lengkap</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                id="profFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="profPhone" className="text-xs font-semibold text-stone-700">Nomor WhatsApp / HP</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                id="profPhone"
                type="tel"
                placeholder="Contoh: 08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-stone-100">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs">
              Tutup
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
