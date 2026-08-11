import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from '@/store/cart-store';

interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  fullName: string;
  role: string;
  loyaltyPoints: number;
  loyaltyTier: string;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      logout: () => {
        // 1. Xóa thông tin xác thực
        set({ user: null, accessToken: null, refreshToken: null });
        // 2. Xóa giỏ hàng local để user tiếp theo không thấy giỏ hàng cũ
        useCartStore.getState().clearLocalCart();
      },
    }),
    {
      name: 'fb-shop-auth',
    }
  )
);
