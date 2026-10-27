import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, UserCheck, ShieldCheck, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react';
import logoImg from '@/assets/logo.jpg';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      let loginEmail = identifier.trim();

      // If user typed NIM (e.g. without '@'), resolve email via RPC or default pattern
      if (!loginEmail.includes('@')) {
        try {
          const { data: foundEmail, error: rpcErr } = await supabase.rpc('get_email_by_nim', {
            lookup_nim: loginEmail,
          });
          if (!rpcErr && foundEmail) {
            loginEmail = foundEmail;
          } else {
            loginEmail = `${loginEmail}@mhs.unugha.ac.id`;
          }
        } catch {
          loginEmail = `${loginEmail}@mhs.unugha.ac.id`;
        }
      }

      const { error } = await signIn(loginEmail, password);
      if (error) {
        setErrorMessage(
          error.message === 'Invalid login credentials'
            ? 'NIM/Email atau kata sandi tidak sesuai. Silakan periksa kembali.'
            : error.message
        );
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header with Official Logo */}
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
              Sistem Manajemen Keuangan Program Studi Informatika
            </p>
          </div>
        </div>

        <Card className="border-stone-200/80 shadow-md bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-[#191B19]">Masuk ke Akun</CardTitle>
            <CardDescription className="text-xs text-stone-500">
              Gunakan NIM atau email terdaftar dan kata sandi Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Guidance banner for students */}
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-emerald-950">Aktivasi Mahasiswa Baru</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Gunakan <span className="font-bold underline">NIM</span> sebagai Akun dan <span className="font-bold underline">NIM</span> sebagai Kata Sandi untuk login perdana.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="identifier" className="text-xs font-semibold text-stone-700">NIM atau Email Pengguna</Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    id="identifier"
                    type="text"
                    required
                    placeholder="Contoh: 265211001 atau nama@unugha.ac.id"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-stone-700">Kata Sandi</Label>
                  <Link
                    to="/reset-password"
                    className="text-xs font-medium text-[#174C3C] hover:underline"
                  >
                    Lupa sandi?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan kata sandi (NIM untuk akun baru)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                className="w-full bg-[#174C3C] hover:bg-[#12382c] text-white font-medium py-2 rounded-lg transition-colors"
              >
                {loading ? 'Memproses Masuk...' : 'Masuk Aplikasi'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col border-t border-stone-100 pt-4 text-center text-xs text-stone-600 gap-2.5">
            <p>
              Belum terdaftar dalam data angkatan?{' '}
              <Link to="/register" className="font-semibold text-[#174C3C] hover:underline">
                Daftar Mandiri di Sini
              </Link>
            </p>
            <div className="flex items-center justify-center gap-1.5 text-stone-500 text-[11px]">
              <ShieldCheck className="h-4 w-4 text-[#174C3C]" />
              <span>Sistem Dilindungi Row Level Security (RLS)</span>
            </div>
          </CardFooter>
        </Card>

        {/* Security & System Note */}
        <div className="rounded-lg bg-stone-100 p-3 text-[11px] text-stone-600 leading-relaxed border border-stone-200">
          <p className="font-semibold text-stone-800">Petunjuk Akses:</p>
          <p>
            Akun mahasiswa, bendahara, dan administrator diatur langsung melalui otoritas resmi pengelola keuangan program studi demi keamanan integritas kas.
          </p>
        </div>
      </div>
    </div>
  );
}
