import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

export function useAdmin() {
  const { user } = useAuth();

  const adminQuery = useQuery({
    queryKey: ['admin', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        return null;
      }

      return data as AdminUser | null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isAdmin: !!adminQuery.data,
    isSuperAdmin: adminQuery.data?.role === 'super_admin',
    adminData: adminQuery.data,
    isLoading: adminQuery.isLoading,
  };
}
