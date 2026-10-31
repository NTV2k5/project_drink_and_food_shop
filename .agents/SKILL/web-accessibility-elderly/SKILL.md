---
name: web-accessibility-elderly
description: Web accessibility (a11y) standards and UX guidelines tailored for elderly users (50-75+ years) and cardiac patients. Enforces WCAG 2.2 AA/AAA, 48px+ touch targets (Fitts's Law), high-contrast palettes, font scalability, cognitive load reduction, and panic-free interfaces.
origin: Healthcare Inclusive Design & Digital Accessibility
---

# Web Accessibility for Elderly & Cardiac Patients (WCAG 2.2 Protocol)

A specialized accessibility standard for AI agents building web interfaces for elderly users, patients experiencing chest pain or fatigue, and their caregivers.

---

## When to Activate

Activate this skill whenever:
- Designing or implementing frontend UI components for senior citizens or medical patients.
- Structuring booking wizards, appointment forms, or triage questionnaires.
- Auditing UI for accessibility compliance (WCAG 2.2 Level AA / AAA).
- Configuring typography, color palettes, spacing, and tactile touch interactions in CSS / Tailwind.
- Implementing keyboard navigation, screen reader ARIA labels, and focus rings.

---

## 1. The Physiological Reality of Elderly & Cardiac Patients

Elderly cardiac patients experience compounded physical and cognitive constraints:
1. **Presbyopia & Reduced Contrast Sensitivity:** Inability to read small fonts (< 16px) or distinguish subtle gray-on-white text.
2. **Hand Tremors & Reduced Motor Control:** Small touch buttons cause accidental mis-clicks or double-taps.
3. **Cognitive Overload & Anxiety:** Complex menus with too many choices cause stress, which can physiologically spike blood pressure and heart rate in cardiac patients.
4. **Panic State during Acute Symptoms:** If experiencing angina (chest pain), the patient needs immediate, unambiguous guidance, not decorative animations or popups.

---

## 2. Visual & Typography Standards

### 2.1. Font Hierarchy & Line Spacing
- **Base Body Font:** Minimum `18px` (`1.125rem`), never use 12px or 14px for body copy.
- **Line Height:** Minimum `1.6` for comfortable reading.
- **Font Zoom Widget:** Always provide an accessible font-size switcher stored in `localStorage`:
  ```tsx
  // components/FontSizeSwitcher.tsx
  export function FontSizeSwitcher() {
    const setZoom = (level: 'normal' | 'large' | 'xlarge') => {
      document.documentElement.dataset.fontZoom = level;
      localStorage.setItem('font-zoom', level);
    };

    return (
      <div className="flex items-center gap-2 border p-1 rounded-lg bg-white" role="group" aria-label="Điều chỉnh cỡ chữ">
        <button onClick={() => setZoom('normal')} className="px-3 py-1 font-medium text-base hover:bg-slate-100" aria-label="Cỡ chữ tiêu chuẩn">A</button>
        <button onClick={() => setZoom('large')} className="px-3 py-1 font-bold text-lg hover:bg-slate-100" aria-label="Cỡ chữ to">A+</button>
        <button onClick={() => setZoom('xlarge')} className="px-3 py-1 font-extrabold text-xl hover:bg-slate-100" aria-label="Cỡ chữ rất to">A++</button>
      </div>
    );
  }
  ```

### 2.2. Strict High-Contrast Color System (AAA Standard)
- Minimum contrast ratio of **4.5:1** for regular text, and **7:1** for high-priority clinical text (AAA).
- **Cấm Tuyệt Đối (Anti-patterns):**
  - Chữ xám nhạt `#94A3B8` trên nền trắng `#FFFFFF` (độ tương phản chỉ 2.3:1 ➔ vi phạm nặng).
  - Nền đỏ chữ xanh lá (người mù màu không phân biệt được).
- **Bảng Màu Chuẩn (Medical High-Contrast Palette):**
  - Text chính: `#0F172A` (Slate 900) trên nền trắng `#FFFFFF` (Tương phản 15.8:1 - Đạt AAA).
  - Nút hành động chính (Primary CTA): Nền Xanh Tim Mạch `#1D4ED8` (Blue 700) với chữ Trắng (Tương phản 8.2:1).
  - Cảnh báo khẩn cấp (Emergency Alert): Nền Đỏ đậm `#B91C1C` (Red 700) với chữ Trắng (Tương phản 7.4:1).

---

## 3. Touch Targets & Fitts's Law (Chống Bấm Nhầm)

### 3.1. Minimum Touch Size (48px x 48px)
Every clickable item (buttons, calendar dates, radio options, checkboxes) must have a physical touch target of at least **48x48 CSS pixels**, with at least **12px margin** between adjacent interactive targets.

```html
<!-- PASS: Button accessible cho người già -->
<button 
  type="button" 
  class="min-h-[52px] min-w-[120px] px-6 py-3 rounded-xl bg-blue-700 text-white text-lg font-bold shadow-md hover:bg-blue-800 active:scale-98 focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all"
  aria-label="Xác nhận khung giờ khám 9 giờ sáng"
>
  09:00 Sáng
</button>

<!-- FAIL: Button quá nhỏ, người già dễ trượt -->
<button class="h-7 px-2 text-xs bg-blue-500">9:00</button>
```

### 3.2. Form Inputs & Large Hit Areas
- Input fields must have `height: 54px` minimum with font-size `18px` to prevent iOS Safari auto-zooming.
- Radio buttons for selecting options must turn the **entire card into a clickable target**, not just the small circle:

```tsx
<label className="flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer hover:bg-blue-50/50 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 min-h-[64px]">
  <input type="radio" name="symptom" value="chest_pain" className="w-6 h-6 text-blue-600 focus:ring-blue-500" />
  <span className="text-lg font-semibold text-slate-900">Đau tức ngực trái đè nghẹt</span>
</label>
```

---

## 4. Cognitive Load Reduction & Zero-Frustration Flow

### 4.1. "One Idea Per Step" Wizard
- Never present a giant 20-field form on a single screen to elderly patients.
- Break booking into 4 discrete, bite-sized steps:
  - **Bước 1:** Bác sĩ / Chuyên khoa khám.
  - **Bước 2:** Chọn Ngày & Giờ (Lưới trực quan).
  - **Bước 3:** Họ tên & Số điện thoại (Chỉ 2 ô bắt buộc).
  - **Bước 4:** Quét mã VietQR chuyển khoản.

### 4.2. No Timeout Eviction Without Warning
- If using a 10-minute lock for appointment slots, do **not** abruptly boot the user back to the homepage without warning.
- At `T - 2 phút`, display a high-contrast modal with audio chime: *"Bạn còn 2 phút để hoàn tất. Bạn có muốn thêm 5 phút không?"* with a huge **[GIA HẠN THÊM GIỜ]** button.

---

## 5. Screen Reader (ARIA) & Keyboard Navigation

### 5.1. Visible Focus Rings
Never use `outline: none` without a high-visibility replacement focus ring. For seniors navigating via keyboard (`Tab` key):
```css
:focus-visible {
  outline: 3px solid #2563EB !important;
  outline-offset: 3px !important;
}
```

### 5.2. Semantic Landmarks
Every page must have:
- A `<main id="main-content">` landmark.
- A "Skip to content" link at the very top for keyboard and screen reader users:
  ```html
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:p-4 focus:bg-yellow-300 focus:text-black focus:font-bold focus:rounded-lg">
    Bỏ qua điều hướng, chuyển tới nội dung chính
  </a>
  ```
