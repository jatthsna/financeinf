import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ShieldCheck, AlertCircle, Eye, EyeOff, User } from 'lucide-react';

export function AccountActivationModal() {
  const { user, profile, updateProfile } = useAuth();

  // Show modal if user is logged in and email is not yet linked or still using temporary email
  const needsActivation = Boolean(
    profile &&
      (profile.email_linked === false || profile.email.endsWith('@mhs.unugha.ac.id'))
  );

  const [open, setOpen] = useState(true);
  const [personalEmail, setPersonalEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!needsActivation) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailTrimmed = personalEmail.trim();

    if (!emailTrimmed || !emailTrimmed.includes('@') || emailTrimmed.endsWith('@mhs.unugha.ac.id')) {
      setErrorMessage('Silakan masukkan alamat email pribadi aktif yang valid (misal: @gmail.com).');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword === profile?.nim) {
      setErrorMessage('Kata sandi baru tidak boleh sama dengan NIM demi keamanan.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      // 1. Update Auth user credentials (email & password)
      const { error: authErr } = await supabase.auth.updateUser({
        email: emailTrimmed,
        password: newPassword,
      });

      if (authErr) {
        throw new Error(authErr.message);
      }

      // 2. Update profile record in database
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          email: emailTrimmed,
          email_linked: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (profileErr) {
        console.warn('Profile update warning:', profileErr.message);
      }

      // 3. Update auth context state
      await updateProfile({
        email: emailTrimmed,
        email_linked: true,
      });

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menautkan email dan kata sandi baru.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md bg-white border-stone-200"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-[#174C3C]">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold text-stone-900">
              Aktivasi Akun Mahasiswa
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-stone-500">
            Akun Anda terdaftar dengan NIM{' '}
            <strong className="text-stone-800">{profile?.nim || '-'}</strong>. Tautkan email
            pribadi dan perbarui kata sandi Anda demi keamanan.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-2 py-6">
            <ShieldCheck className="h-10 w-10 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-900">Akun Berhasil Diaktivasi!</h4>
            <p className="text-xs text-emerald-700">
              Email <strong>{personalEmail}</strong> telah ditautkan dan kata sandi baru Anda telah
              aktif.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Readonly info */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px]">Nama Mahasiswa</span>
                <span className="font-semibold text-stone-800 truncate block">
                  {profile?.full_name}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">NIM & Peran</span>
                <span className="font-semibold text-stone-800 truncate block">
                  {profile?.nim} ({profile?.role})
                </span>
              </div>
            </div>

            {/* Personal Email input */}
            <div className="space-y-1.5">
              <Label htmlFor="personalEmail" className="text-xs font-semibold text-stone-700">
                Email Pribadi Aktif <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  id="personalEmail"
                  type="email"
                  required
                  placeholder="contoh: nama.anda@gmail.com"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              <p className="text-[11px] text-stone-500">
                Digunakan untuk menerima kuitansi pembayaran dan pemulihan akun jika lupa sandi.
              </p>
            </div>

            {/* New Password input */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-semibold text-stone-700">
                Kata Sandi Baru <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password input */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-stone-700">
                Konfirmasi Kata Sandi Baru <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 focus:outline-none"
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#174C3C] hover:bg-[#12382c] text-white font-medium py-2 rounded-lg transition-colors mt-2"
            >
              {loading ? 'Menyimpan & Mengaktifkan...' : 'Simpan & Tautkan Akun'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
