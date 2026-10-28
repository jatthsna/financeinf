import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCw, Download, FileQuestion, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  title?: string;
  fileName?: string;
}

export function EvidenceViewerModal({
  open,
  onOpenChange,
  imageUrl,
  title = 'Bukti Pembayaran / Transfer',
  fileName = 'bukti-transfer.jpg',
}: Props) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-stone-900 border-stone-800 text-white p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-stone-800">
          <DialogTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>{title}</span>
            {fileName && (
              <span className="text-xs font-normal text-stone-400 font-mono truncate max-w-[200px]">
                ({fileName})
              </span>
            )}
          </DialogTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="text-stone-300 hover:text-white hover:bg-stone-800 h-8 w-8 p-0"
              title="Perbesar"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="text-stone-300 hover:text-white hover:bg-stone-800 h-8 w-8 p-0"
              title="Perkecil"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotate}
              className="text-stone-300 hover:text-white hover:bg-stone-800 h-8 w-8 p-0"
              title="Putar 90 Derajat"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-stone-300 hover:text-white hover:bg-stone-800 h-8 w-8 p-0"
              title="Unduh File Bukti"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Viewport */}
        <div className="relative w-full h-[60vh] max-h-[550px] bg-stone-950/80 rounded-lg flex items-center justify-center overflow-auto p-4 select-none">
          {imageError || !imageUrl ? (
            <div className="text-center p-6 text-stone-400 space-y-2">
              <FileQuestion className="h-12 w-12 mx-auto text-stone-500" />
              <p className="text-sm font-medium">Gambar Bukti Tidak Dapat Ditampilkan</p>
              <p className="text-xs text-stone-500">
                File mungkin berupa dokumen non-gambar atau tautan tidak valid.
              </p>
              {imageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="text-xs text-stone-200 border-stone-700 hover:bg-stone-800 mt-2"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Unduh Dokumen
                </Button>
              )}
            </div>
          ) : (
            <div
              className="transition-transform duration-200 ease-out flex items-center justify-center"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={imageUrl}
                alt="Bukti Transfer"
                className="max-h-[50vh] max-w-full object-contain rounded shadow-lg border border-stone-800"
                onError={() => setImageError(true)}
              />
            </div>
          )}
        </div>

        {/* Bottom controls / reset */}
        <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800">
          <span>Skala: {Math.round(scale * 100)}% | Rotasi: {rotation}°</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-stone-400 hover:text-white h-7"
          >
            Reset Tampilan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
