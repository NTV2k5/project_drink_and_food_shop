import { create } from 'zustand';
import { API_URL } from '@/lib/utils';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  basePrice: number;
  quantity: number;
  selectedOptions: { groupId: string; optionId: string; optionName: string; extraPrice: number }[];
  note?: string;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  totalItems: number;
  subtotal: number;

  // --- Đồng bộ với MongoDB (user đã đăng nhập) ---
  fetchCart: (token: string) => Promise<void>;
  syncAddItem: (item: Omit<CartItem, 'id'> & { id?: string }, token?: string | null) => Promise<void>;
  syncUpdateItem: (id: string, quantity: number, token?: string | null) => Promise<void>;
  syncRemoveItem: (id: string, token?: string | null) => Promise<void>;
  syncClearCart: (token?: string | null) => Promise<void>;

  // --- Chỉ xóa state local (dùng khi logout) ---
  clearLocalCart: () => void;

  // --- Legacy / Guest (chưa đăng nhập) ---
  addItem: (item: CartItem) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const calculateTotalItems = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

const calculateSubtotal = (items: CartItem[]) =>
  items.reduce((sum, item) => {
    const optionsPrice = item.selectedOptions.reduce((s, opt) => s + opt.extraPrice, 0);
    return sum + (item.basePrice + optionsPrice) * item.quantity;
  }, 0);

/**
 * Chuyển đổi item từ API sang CartItem có đầy đủ thông tin để hiển thị.
 * API trả về selectedOptions chỉ có {groupId, optionId} — cần lookup optionName
 * và extraPrice từ product.optionGroups được populate sẵn.
 */
function mapApiItemToCartItem(apiItem: any): CartItem {
  const product = apiItem.product;
  const basePrice =
    typeof product.basePrice === 'string' ? parseFloat(product.basePrice) : product.basePrice;

  const selectedOptions = (apiItem.selectedOptions || []).map((opt: any) => {
    let optionName = opt.optionId;
    let extraPrice = 0;

    if (product.optionGroups) {
      for (const group of product.optionGroups) {
        if (group.id === opt.groupId) {
          const option = group.options?.find((o: any) => o.id === opt.optionId);
          if (option) {
            optionName = option.name;
            extraPrice =
              typeof option.extraPrice === 'string'
                ? parseFloat(option.extraPrice)
                : option.extraPrice || 0;
          }
          break;
        }
      }
    }

    return { groupId: opt.groupId, optionId: opt.optionId, optionName, extraPrice };
  });

  return {
    id: apiItem.id,
    productId: product.id,
    productName: product.name,
    productImage: product.image || null,
    basePrice,
    quantity: apiItem.quantity,
    selectedOptions,
    note: apiItem.note || undefined,
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  isLoading: false,
  totalItems: 0,
  subtotal: 0,

  // Tải giỏ hàng từ MongoDB theo token của user đang đăng nhập
  fetchCart: async (token) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const items: CartItem[] = (data || []).map(mapApiItemToCartItem);
      set({
        items,
        totalItems: calculateTotalItems(items),
        subtotal: calculateSubtotal(items),
      });
    } catch {
      // Giữ nguyên state hiện tại nếu có lỗi mạng
    } finally {
      set({ isLoading: false });
    }
  },

  // Thêm sản phẩm: nếu có token → gọi API (MongoDB), không thì lưu local (guest)
  syncAddItem: async (item, token) => {
    if (!token) {
      get().addItem({ ...item, id: item.id || `${item.productId}-${Date.now()}` });
      return;
    }
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions.map(({ groupId, optionId }) => ({
            groupId,
            optionId,
          })),
          note: item.note,
        }),
      });
      if (!res.ok) return;
      // Reload toàn bộ giỏ hàng từ server để đảm bảo đồng bộ chính xác
      await get().fetchCart(token);
    } catch {
      // Fail silently
    } finally {
      set({ isLoading: false });
    }
  },

  // Cập nhật số lượng: optimistic update UI trước, sau đó gửi lên server
  syncUpdateItem: async (id, quantity, token) => {
    if (!token) {
      get().updateItem(id, { quantity });
      return;
    }
    const items = get().items.map((item) =>
      item.id === id ? { ...item, quantity } : item
    );
    set({ items, totalItems: calculateTotalItems(items), subtotal: calculateSubtotal(items) });
    try {
      await fetch(`${API_URL}/cart/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });
    } catch {
      // Optimistic update đã apply, không rollback để tránh UX xấu
    }
  },

  // Xóa 1 item: optimistic update, sau đó gọi API
  syncRemoveItem: async (id, token) => {
    if (!token) {
      get().removeItem(id);
      return;
    }
    const items = get().items.filter((item) => item.id !== id);
    set({ items, totalItems: calculateTotalItems(items), subtotal: calculateSubtotal(items) });
    try {
      await fetch(`${API_URL}/cart/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Optimistic update đã apply
    }
  },

  // Xóa toàn bộ giỏ hàng: xóa local trước, rồi gọi API
  syncClearCart: async (token) => {
    set({ items: [], totalItems: 0, subtotal: 0 });
    if (!token) return;
    try {
      await fetch(`${API_URL}/cart`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Local đã clear rồi
    }
  },

  // Chỉ xóa state local (dùng khi đăng xuất)
  clearLocalCart: () => {
    set({ items: [], totalItems: 0, subtotal: 0 });
  },

  // ── Legacy methods (dùng cho guest hoặc các nơi chưa cần đồng bộ) ──

  addItem: (newItem) =>
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) =>
          item.productId === newItem.productId &&
          JSON.stringify(item.selectedOptions) === JSON.stringify(newItem.selectedOptions)
      );
      let updatedItems;
      if (existingIndex > -1) {
        updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + newItem.quantity,
        };
      } else {
        updatedItems = [...state.items, newItem];
      }
      return {
        items: updatedItems,
        totalItems: calculateTotalItems(updatedItems),
        subtotal: calculateSubtotal(updatedItems),
      };
    }),

  updateItem: (id, updates) =>
    set((state) => {
      const updatedItems = state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      return {
        items: updatedItems,
        totalItems: calculateTotalItems(updatedItems),
        subtotal: calculateSubtotal(updatedItems),
      };
    }),

  removeItem: (id) =>
    set((state) => {
      const updatedItems = state.items.filter((item) => item.id !== id);
      return {
        items: updatedItems,
        totalItems: calculateTotalItems(updatedItems),
        subtotal: calculateSubtotal(updatedItems),
      };
    }),

  clearCart: () => set({ items: [], totalItems: 0, subtotal: 0 }),
}));
