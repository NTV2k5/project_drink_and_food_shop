/**
 * =============================================================================
 * TANG 1: UNIT TESTS - Business Logic (Order Pricing)
 * Kiem tra logic tinh toan gia don hang, diem tich luy, coupon
 * =============================================================================
 */

// Pure business logic functions extracted for testing
// Kiem tra cac cong thuc tinh toan doc lap

describe('[TANG 1] Order Business Logic - Unit Tests', () => {

  // ─── Tinh toan diem tich luy (1 diem = 1000 VND) ──────────────────────────
  describe('Loyalty Points Calculation', () => {
    const calculatePointsDiscount = (pointsUsed) => pointsUsed * 1000;
    const calculatePointsEarned = (totalAmount) => Math.floor(totalAmount / 10000);

    it('TC-U-018: 100 diem = giam 100,000 VND', () => {
      expect(calculatePointsDiscount(100)).toBe(100000);
    });

    it('TC-U-019: Don hang 150,000 VND tich duoc 15 diem', () => {
      expect(calculatePointsEarned(150000)).toBe(15);
    });

    it('TC-U-020: Don hang 9,999 VND khong tich diem (< 10,000 min)', () => {
      expect(calculatePointsEarned(9999)).toBe(0);
    });

    it('TC-U-021: 0 diem su dung = 0 VND giam gia', () => {
      expect(calculatePointsDiscount(0)).toBe(0);
    });
  });

  // ─── Tinh toan tong don hang ───────────────────────────────────────────────
  describe('Order Total Calculation', () => {
    const calculateOrderTotal = (subtotal, shippingFee, discountAmount, pointsDiscount) => {
      return Math.max(0, subtotal + shippingFee - discountAmount - pointsDiscount);
    };

    it('TC-U-022: Tinh tong don hang khong giam gia', () => {
      expect(calculateOrderTotal(100000, 15000, 0, 0)).toBe(115000);
    });

    it('TC-U-023: Tinh tong don hang co coupon giam gia', () => {
      expect(calculateOrderTotal(100000, 15000, 20000, 0)).toBe(95000);
    });

    it('TC-U-024: Tinh tong don hang co ca coupon va diem', () => {
      expect(calculateOrderTotal(100000, 15000, 20000, 50000)).toBe(45000);
    });

    it('TC-U-025: Tong khong the am (min = 0)', () => {
      expect(calculateOrderTotal(10000, 0, 100000, 0)).toBe(0);
    });
  });

  // ─── Kiem tra coupon percentage discount ──────────────────────────────────
  describe('Coupon Discount Calculation', () => {
    const applyCouponDiscount = (coupon, subtotal) => {
      if (!coupon || !coupon.isActive) return 0;
      if (subtotal < coupon.minOrderAmount) return 0;

      if (coupon.discountType === 'PERCENTAGE') {
        const discount = subtotal * (coupon.discountValue / 100);
        return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
      }
      if (coupon.discountType === 'FIXED') {
        return Math.min(coupon.discountValue, subtotal);
      }
      return 0;
    };

    it('TC-U-026: Coupon phan tram 10% tren don 100k = giam 10k', () => {
      const coupon = { isActive: true, discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 50000, maxDiscount: null };
      expect(applyCouponDiscount(coupon, 100000)).toBe(10000);
    });

    it('TC-U-027: Coupon phan tram co cap toi da: max 50k', () => {
      const coupon = { isActive: true, discountType: 'PERCENTAGE', discountValue: 20, minOrderAmount: 0, maxDiscount: 50000 };
      expect(applyCouponDiscount(coupon, 500000)).toBe(50000);
    });

    it('TC-U-028: Coupon co dinh 30k giam dung 30k', () => {
      const coupon = { isActive: true, discountType: 'FIXED', discountValue: 30000, minOrderAmount: 0 };
      expect(applyCouponDiscount(coupon, 100000)).toBe(30000);
    });

    it('TC-U-029: Khong ap dung khi don hang chua dat muc toi thieu', () => {
      const coupon = { isActive: true, discountType: 'FIXED', discountValue: 20000, minOrderAmount: 100000 };
      expect(applyCouponDiscount(coupon, 50000)).toBe(0);
    });

    it('TC-U-030: Khong ap dung khi coupon khong active', () => {
      const coupon = { isActive: false, discountType: 'FIXED', discountValue: 20000, minOrderAmount: 0 };
      expect(applyCouponDiscount(coupon, 100000)).toBe(0);
    });

    it('TC-U-031: null coupon tra ve 0', () => {
      expect(applyCouponDiscount(null, 100000)).toBe(0);
    });
  });

  // ─── Kiem tra Order status transitions ────────────────────────────────────
  describe('Order Status State Machine', () => {
    const VALID_TRANSITIONS = {
      PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY'],
      READY: ['DELIVERING'],
      DELIVERING: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: []
    };

    const canTransition = (from, to) => {
      return VALID_TRANSITIONS[from]?.includes(to) ?? false;
    };

    it('TC-U-032: PENDING_PAYMENT -> CONFIRMED la hop le', () => {
      expect(canTransition('PENDING_PAYMENT', 'CONFIRMED')).toBe(true);
    });

    it('TC-U-033: PENDING_PAYMENT -> CANCELLED la hop le', () => {
      expect(canTransition('PENDING_PAYMENT', 'CANCELLED')).toBe(true);
    });

    it('TC-U-034: DELIVERED -> CANCELLED la KHONG hop le', () => {
      expect(canTransition('DELIVERED', 'CANCELLED')).toBe(false);
    });

    it('TC-U-035: CONFIRMED -> DELIVERING la KHONG hop le (phai qua PREPARING)', () => {
      expect(canTransition('CONFIRMED', 'DELIVERING')).toBe(false);
    });

    it('TC-U-036: CANCELLED -> CONFIRMED la KHONG hop le', () => {
      expect(canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
    });
  });

  // ─── Kiem tra VietQR URL generation ──────────────────────────────────────
  describe('VietQR/SePay URL Generation', () => {
    const generateQrUrl = (bankCode, accountNo, amount, orderNumber, accountName) => {
      return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${orderNumber}&accountName=${encodeURIComponent(accountName)}`;
    };

    it('TC-U-037: QR URL phai chua bank code dung', () => {
      const url = generateQrUrl('970422', '0123456789', 150000, 'FB-001', 'FB SHOP');
      expect(url).toContain('970422');
    });

    it('TC-U-038: QR URL phai chua so tien chinh xac', () => {
      const url = generateQrUrl('970422', '0123456789', 99000, 'FB-002', 'FB SHOP');
      expect(url).toContain('amount=99000');
    });

    it('TC-U-039: QR URL encode ten tai khoan co dau cach', () => {
      const url = generateQrUrl('970422', '0123456789', 50000, 'FB-003', 'FB SHOP');
      expect(url).toContain(encodeURIComponent('FB SHOP'));
    });
  });
});
