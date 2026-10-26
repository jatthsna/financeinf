import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import logoImg from '@/assets/logo.jpg';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  // Mode: request link vs set new password
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // Request link state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Set new password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Error handling
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detect recovery mode from URL hash, search params, or Supabase Auth event
  useEffect(() => {
    // 1. Check URL hash / query
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      setIsUpdateMode(true);
    }

    // 2. Listen to Supabase Auth state change
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsUpdateMode(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Handler for sending recovery email
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        setErrorMessage(error.message);
      } else {
        setRequestSent(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim instruksi pemulihan.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for updating password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi minimal harus terdiri dari 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setUpdateSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-sm border border-stone-200/80">
            <img
              src={logoImg}
              alt="Logo UNUGHA Cilacap - Prodi Informatika"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#191B19]">KAS INFORMATIKA</h1>
            <p className="text-xs text-stone-600 font-medium">Pemulihan Akses Akun</p>
          </div>
        </div>

        <Card className="border-stone-200/80 shadow-md bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-[#191B19]">
              {isUpdateMode ? 'Buat Kata Sandi Baru' : 'Atur Ulang Kata Sandi'}
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              {isUpdateMode
                ? 'Masukkan kata sandi baru untuk akun Anda.'
                : 'Masukkan alamat email terdaftar untuk menerima tautan pemulihan kata sandi.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* If in Update Mode (clicked email link) */}
            {isUpdateMode ? (
              updateSuccess ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-emerald-900">Kata Sandi Berhasil Diperbarui</h4>
                  <p className="text-xs text-emerald-700">
                    Kata sandi baru Anda telah aktif. Silakan masuk kembali menggunakan kredensial baru.
                  </p>
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full bg-[#174C3C] hover:bg-[#12382c] text-white text-xs font-semibold mt-2"
                  >
                    Masuk Sekarang
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-xs font-semibold text-stone-700">
                      Kata Sandi Baru
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

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold text-stone-700">
                      Konfirmasi Kata Sandi Baru
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
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#174C3C] hover:bg-[#12382c] text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    {loading ? 'Menyimpan Sandi Baru...' : 'Simpan Kata Sandi Baru'}
                  </Button>
                </form>
              )
            ) : (
              /* If in Request Mode (enter email) */
              requestSent ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-emerald-900">Email Pemulihan Dikirim</h4>
                  <p className="text-xs text-emerald-700">
                    Silakan periksa kotak masuk atau spam pada email <strong className="text-emerald-900">{email}</strong> untuk mengatur kata sandi baru Anda.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-stone-700">Email Terdaftar</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="nama@mhs.kampus.ac.id"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#174C3C] hover:bg-[#12382c] text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    {loading ? 'Mengirim Tautan...' : 'Kirim Tautan Pemulihan'}
                  </Button>
                </form>
              )
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-stone-100 pt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-medium text-stone-600 hover:text-[#174C3C]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Halaman Masuk
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
