import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 max-w-md shadow-xs space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-[#174C3C] font-bold text-2xl">
          404
        </div>
        <h2 className="text-xl font-bold text-[#191B19]">Halaman Tidak Ditemukan</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          Tautan yang Anda tuju tidak tersedia atau telah dipindahkan dalam sistem KAS INFORMATIKA.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs">
            <Link to="/dashboard">
              <Home className="mr-1.5 h-4 w-4" /> Kembali ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
