import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, Mail, User, GraduationCap, Phone, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import logoImg from '@/assets/logo.jpg';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal harus 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (!nim.trim()) {
      setErrorMessage('Nomor Induk Mahasiswa (NIM) wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email.trim(), password, {
        full_name: fullName.trim(),
        nim: nim.trim(),
      });

      if (error) {
        setErrorMessage(
          error.message.includes('already registered')
            ? 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.'
            : error.message
        );
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mendaftar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4] px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
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
            <p className="text-xs text-stone-600 font-medium">
              Pendaftaran Akun Mahasiswa Baru
            </p>
          </div>
        </div>

        <Card className="border-stone-200/80 shadow-md bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-[#191B19]">Daftar Akun Mahasiswa</CardTitle>
            <CardDescription className="text-xs text-stone-500">
              Lengkapi data diri dan email Anda untuk mengakses rincian tagihan kas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-700 mx-auto" />
                <h4 className="text-base font-bold text-emerald-900">Pendaftaran Berhasil!</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Akun mahasiswa Anda dengan email <strong>{email}</strong> telah terdaftar. Silakan masuk untuk mengakses portal kas Anda.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-semibold mt-2"
                >
                  Lanjut ke Halaman Masuk
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-xs font-semibold text-stone-700">Nama Lengkap *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      id="fullName"
                      required
                      placeholder="Contoh: Muhammad Farhan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nim" className="text-xs font-semibold text-stone-700">NIM (Nomor Induk Mahasiswa) *</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      id="nim"
                      required
                      placeholder="Contoh: 220101004"
                      value={nim}
                      onChange={(e) => setNim(e.target.value)}
                      className="pl-9 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-semibold text-stone-700">Alamat Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs font-semibold text-stone-700">Nomor WhatsApp / HP (Opsional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Contoh: 08123456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-xs font-semibold text-stone-700">Kata Sandi *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                      <Input
                        id="password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold text-stone-700">Konfirmasi Sandi *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#174C3C] hover:bg-[#12382c] text-white font-medium py-2 rounded-lg transition-colors mt-2"
                >
                  {loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col border-t border-stone-100 pt-3 text-center text-xs text-stone-600 gap-2">
            <p>
              Sudah memiliki akun terdaftar?{' '}
              <Link to="/login" className="font-semibold text-[#174C3C] hover:underline">
                Masuk di sini
              </Link>
            </p>
            <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400">
              <ShieldCheck className="h-3.5 w-3.5 text-[#174C3C]" />
              <span>Pendaftaran publik otomatis mendapatkan peran hak akses Mahasiswa</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
