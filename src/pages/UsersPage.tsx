import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { UserPlus, Search, Users, Shield, CheckCircle2, XCircle, UserCheck } from 'lucide-react';

interface ProfileItem {
  id: string;
  full_name: string;
  nim: string | null;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'BENDAHARA' | 'MAHASISWA';
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { activeYear } = useAcademicYear();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Register / Add User Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    nim: '',
    email: '',
    role: 'MAHASISWA' as const,
    autoEnrollActiveYear: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all profiles
  const { data: users, isLoading } = useQuery({
    queryKey: ['profiles_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProfileItem[];
    },
  });

  // Fetch memberships for active year to show membership badge
  const { data: memberships } = useQuery({
    queryKey: ['memberships_active_year', activeYear?.id],
    queryFn: async () => {
      if (!activeYear?.id) return [];
      const { data, error } = await supabase
        .from('student_memberships')
        .select('student_id')
        .eq('academic_year_id', activeYear.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []).map((m) => m.student_id);
    },
    enabled: !!activeYear?.id,
  });

  // Change Role Mutation (ADMIN only)
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'ADMIN' | 'BENDAHARA' | 'MAHASISWA' }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles_all'] });
    },
  });

  // Toggle User Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, is_active }: { userId: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !is_active })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles_all'] });
    },
  });

  // Toggle Active Year Membership
  const toggleMembershipMutation = useMutation({
    mutationFn: async ({ userId, isEnrolled }: { userId: string; isEnrolled: boolean }) => {
      if (!activeYear?.id) throw new Error('Tahun akademik belum dipilih');

      if (isEnrolled) {
        // Remove membership
        const { error } = await supabase
          .from('student_memberships')
          .delete()
          .eq('student_id', userId)
          .eq('academic_year_id', activeYear.id);
        if (error) throw error;
      } else {
        // Enroll
        const { error } = await supabase
          .from('student_memberships')
          .insert([
            {
              student_id: userId,
              academic_year_id: activeYear.id,
              is_active: true,
            },
          ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships_active_year'] });
    },
  });

  // Add User profile (or invite)
  const addUserMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (!payload.full_name.trim()) throw new Error('Nama lengkap wajib diisi');
      if (!payload.email.trim()) throw new Error('Email pengguna wajib diisi');

      let newUserId: string | null = null;

      // 1. Attempt admin creation RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_create_user_account', {
        p_email: payload.email.trim().toLowerCase(),
        p_password: payload.nim.trim() || '123456',
        p_full_name: payload.full_name.trim(),
        p_nim: payload.nim.trim() || null,
        p_role: payload.role,
      });

      if (!rpcErr && (rpcData as any)?.user_id) {
        newUserId = (rpcData as any).user_id;
      } else {
        // Fallback: standard signUp
        const defaultPassword = payload.nim.trim() || '123456';
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: payload.email.trim().toLowerCase(),
          password: defaultPassword,
          options: {
            data: {
              full_name: payload.full_name.trim(),
              nim: payload.nim.trim() || null,
              role: payload.role,
            },
          },
        });

        if (authErr) {
          throw new Error(rpcErr?.message || authErr.message);
        }
        newUserId = authData.user?.id || null;
      }

      // Auto-enroll in active year if selected
      if (newUserId && payload.autoEnrollActiveYear && activeYear?.id) {
        await supabase.from('student_memberships').insert([
          {
            student_id: newUserId,
            academic_year_id: activeYear.id,
            is_active: true,
          },
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles_all'] });
      queryClient.invalidateQueries({ queryKey: ['memberships_active_year'] });
      setIsAddUserOpen(false);
      setFormData({
        full_name: '',
        nim: '',
        email: '',
        role: 'MAHASISWA',
        autoEnrollActiveYear: true,
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal menambahkan profil pengguna baru');
    },
  });

  const enrolledSet = new Set(memberships || []);

  const filteredUsers = (users || []).filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.nim && u.nim.toLowerCase().includes(search.toLowerCase())) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge className="bg-red-800 text-white text-[10px]">ADMIN</Badge>;
      case 'BENDAHARA':
        return <Badge className="bg-amber-600 text-white text-[10px]">BENDAHARA</Badge>;
      default:
        return <Badge variant="outline" className="border-stone-300 text-stone-700 text-[10px]">MAHASISWA</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna & Keanggotaan Mahasiswa"
        description="Kelola akun mahasiswa, penugasan bendahara, hak otorisasi role, dan status pendaftaran tahun ajaran."
      >
        <Button
          onClick={() => {
            setFormError(null);
            setIsAddUserOpen(true);
          }}
          className="bg-[#174C3C] text-white hover:bg-[#12382c]"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Daftarkan Mahasiswa / Staf
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <Card className="border-stone-200/80 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Cari nama / NIM / email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Label className="text-xs text-stone-500 shrink-0">Filter Peran:</Label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Peran</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="BENDAHARA">Bendahara</SelectItem>
                <SelectItem value="MAHASISWA">Mahasiswa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <Card className="border-stone-200/80 bg-white p-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10 text-stone-400" />}
          title="Tidak ada pengguna ditemukan"
          description="Tambahkan data mahasiswa kelas atau staf pengelola keuangan prodi."
        />
      ) : (
        <Card className="border-stone-200/80 bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-[#191B19]">Nama Pengguna</TableHead>
                <TableHead className="font-semibold text-[#191B19]">NIM / Kontak</TableHead>
                <TableHead className="font-semibold text-[#191B19]">Peran Otorisasi</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-center">Tahun {activeYear?.year_code}</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-center">Status Akun</TableHead>
                <TableHead className="font-semibold text-[#191B19] text-right">Kelola Akses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const isEnrolled = enrolledSet.has(u.id);

                return (
                  <TableRow key={u.id} className="hover:bg-stone-50/60 transition-colors">
                    <TableCell>
                      <p className="font-semibold text-sm text-[#191B19]">{u.full_name}</p>
                      <p className="text-xs text-stone-500">{u.email}</p>
                    </TableCell>
                    <TableCell className="text-xs text-stone-700">
                      <p className="font-mono font-medium">{u.nim || '-'}</p>
                      <p className="text-[11px] text-stone-500">{u.phone || '-'}</p>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(u.role)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMembershipMutation.mutate({ userId: u.id, isEnrolled })}
                        disabled={toggleMembershipMutation.isPending}
                        className="text-xs h-7"
                      >
                        {isEnrolled ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]">
                            <UserCheck className="mr-1 h-3 w-3 text-emerald-600" /> Terdaftar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-stone-200 bg-stone-100 text-stone-500 text-[10px]">
                            Belum Terdaftar
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      {u.is_active ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800 text-[10px]">
                          Dinonaktifkan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Don't let users deactivate their own current admin account */}
                      {u.id !== currentUser?.id && (
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={u.role}
                            onValueChange={(newRole: any) =>
                              changeRoleMutation.mutate({ userId: u.id, newRole })
                            }
                          >
                            <SelectTrigger className="w-28 text-[11px] h-7">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MAHASISWA">Mahasiswa</SelectItem>
                              <SelectItem value="BENDAHARA">Bendahara</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleActiveMutation.mutate({ userId: u.id, is_active: u.is_active })
                            }
                            className="text-xs h-7 text-stone-500 hover:text-stone-900"
                          >
                            {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191B19]">Daftarkan Mahasiswa / Staf</DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Registrasi profil mahasiswa resmi untuk keperluan penagihan dan pencatatan kas.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Nama Lengkap *</Label>
              <Input
                placeholder="Contoh: Muhammad Farhan"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">NIM (Mahasiswa)</Label>
                <Input
                  placeholder="Contoh: 220101004"
                  value={formData.nim}
                  onChange={(e) => setFormData({ ...formData, nim: e.target.value })}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Peran Akun *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val: any) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAHASISWA">Mahasiswa</SelectItem>
                    <SelectItem value="BENDAHARA">Bendahara</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Alamat Email *</Label>
              <Input
                type="email"
                placeholder="nama@mhs.kampus.ac.id"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="autoEnroll"
                checked={formData.autoEnrollActiveYear}
                onChange={(e) => setFormData({ ...formData, autoEnrollActiveYear: e.target.checked })}
                className="rounded border-stone-300 text-[#174C3C]"
              />
              <Label htmlFor="autoEnroll" className="text-xs text-stone-700 cursor-pointer">
                Otomatis daftarkan ke tahun akademik aktif ({activeYear?.display_name})
              </Label>
            </div>

            <DialogFooter className="pt-3">
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button
                onClick={() => addUserMutation.mutate(formData)}
                disabled={addUserMutation.isPending}
                className="bg-[#174C3C] text-white hover:bg-[#12382c] text-xs font-medium"
              >
                {addUserMutation.isPending ? 'Mendaftarkan...' : 'Simpan Pengguna'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
