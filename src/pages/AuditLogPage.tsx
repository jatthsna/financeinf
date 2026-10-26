import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Search, FileText } from 'lucide-react';

interface AuditLogItem {
  id: string;
  actor_id: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'REVERSE' | 'LOGIN' | 'LOGOUT' | 'ROLE_CHANGE' | 'SETTINGS_CHANGE';
  table_name: string;
  record_id: string | null;
  description: string | null;
  created_at: string;
  actor?: {
    full_name: string;
    email: string;
  };
}

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit_logs_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          actor_id,
          action,
          table_name,
          record_id,
          description,
          created_at,
          actor:profiles!actor_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as unknown as AuditLogItem[];
    },
  });

  const filteredLogs = (logs || []).filter((l) => {
    const actorName = l.actor?.full_name?.toLowerCase() || '';
    const desc = l.description?.toLowerCase() || '';
    const tableName = l.table_name?.toLowerCase() || '';
    const matchesSearch =
      actorName.includes(search.toLowerCase()) ||
      desc.includes(search.toLowerCase()) ||
      tableName.includes(search.toLowerCase());

    const matchesAction = filterAction === 'ALL' || l.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'APPROVE':
        return <Badge className="bg-emerald-700 text-white text-[10px]">SETUJUI</Badge>;
      case 'REJECT':
        return <Badge className="bg-red-700 text-white text-[10px]">TOLAK</Badge>;
      case 'CREATE':
        return <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 text-[10px]">BUAT</Badge>;
      case 'UPDATE':
        return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px]">UBAH</Badge>;
      case 'ROLE_CHANGE':
        return <Badge className="bg-purple-700 text-white text-[10px]">PERAN</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jejak Audit & Keamanan Finansial"
        description="Rekam jejak aktivitas operasional keuangan, verifikasi pembayaran, dan perubahan konfigurasi sistem."
      />

      {/* Filter and Search Bar */}
      <Card className="border-stone-200/80 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Cari operator / deskripsi aksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Label className="text-xs text-stone-500 shrink-0">Jenis Aksi:</Label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Aksi</SelectItem>
                <SelectItem value="APPROVE">Persetujuan (Approve)</SelectItem>
                <SelectItem value="REJECT">Penolakan (Reject)</SelectItem>
                <SelectItem value="CREATE">Pembuatan (Create)</SelectItem>
                <SelectItem value="UPDATE">Perubahan (Update)</SelectItem>
                <SelectItem value="ROLE_CHANGE">Ubah Peran (Role)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      {isLoading ? (
        <Card className="border-stone-200/80 bg-white p-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-10 w-10 text-stone-400" />}
          title="Belum ada riwayat audit log"
          description="Aktivitas keuangan dan perubahan data sensitif akan secara otomatis diaudit di sini."
        />
      ) : (
        <Card className="border-stone-200/80 bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-[#191B19]">Waktu (WIB)</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Operator / Akun</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Aksi</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Tabel Data</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Uraian Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((l) => (
                <TableRow key={l.id} className="hover:bg-stone-50/60 transition-colors">
                  <TableCell className="text-xs text-stone-600 whitespace-nowrap">
                    {formatDate(l.created_at, 'with-time')}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-xs text-[#191B19]">
                      {l.actor?.full_name || 'Sistem Otomatis'}
                    </p>
                    <p className="text-[10px] text-stone-400">{l.actor?.email || '-'}</p>
                  </TableCell>
                  <TableCell>{getActionBadge(l.action)}</TableCell>
                  <TableCell className="font-mono text-xs text-stone-600">{l.table_name}</TableCell>
                  <TableCell className="text-xs text-stone-700 max-w-sm">
                    {l.description || 'Pencatatan transaksi keuangan'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
