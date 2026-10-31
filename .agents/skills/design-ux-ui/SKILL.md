---
name: design-ux-ui
description: Comprehensive UX/UI design system and product psychology framework for enterprise web applications. Covers design tokens, 8pt spacing grid, 60-30-10 color theory, typography hierarchy, Atomic Design, micro-interactions, dark/light modes, and accessible form UX.
origin: Senior Product Designer & Design Systems Engineering
---

# Enterprise UX/UI Design System & Product Psychology Protocol

A comprehensive design engineering protocol for AI agents to craft interfaces that are aesthetically stunning, psychologically intuitive, and production-grade.

---

## When to Activate

Activate this skill whenever:
- Establishing a new visual design language, design tokens, or component library.
- Designing booking funnels, patient portals, clinical dashboards, or data-dense tables.
- Applying product psychology to reduce cognitive load and conversion drop-offs.
- Configuring Tailwind CSS tokens (colors, typography, shadows, border radius, spacing).
- Designing micro-interactions, loading states (skeletons), or optimistic UI mutations.
- Implementing dark and light theme systems with semantic color tokens.

---

## 1. The Laws of UX & Product Psychology

Every pixel and layout choice must be grounded in psychological principles, not arbitrary aesthetic whims:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE LAWS OF PRODUCT UX                         │
├────────────────────┬───────────────────────────────────────────────────┤
│ Fitts's Law        │ Clickable targets must be large and near user     │
│                    │ thumbs/cursor (Min 48px target size).             │
├────────────────────┼───────────────────────────────────────────────────┤
│ Hick's Law         │ Time to make a decision increases with choices.   │
│                    │ Maximize simplicity: Hide secondary options.      │
├────────────────────┼───────────────────────────────────────────────────┤
│ Miller's Law       │ Working memory holds 7 ± 2 chunks of information. │
│                    │ Chunk phone numbers (098-xxx-xxxx), group inputs. │
├────────────────────┼───────────────────────────────────────────────────┤
│ Peak-End Rule      │ Users judge an experience by its peak and end.    │
│                    │ Make confirmation/success screens unforgettable.  │
├────────────────────┼───────────────────────────────────────────────────┤
│ Doherty Threshold  │ Productivity spikes when response time is < 400ms.│
│                    │ Use optimistic UI updates and instant feedback.   │
└────────────────────┴───────────────────────────────────────────────────┘
```

---

## 2. The 8-Point Spatial Grid System

All margins, paddings, line heights, and layout dimensions must be multiples of **8px** (with `4px` reserved for micro-spacing like badge padding and icon gaps):

| Token | Dimension | Common Use Case |
| :--- | :--- | :--- |
| `space-1` | `4px` | Gaps between icons and text, inline tags, badge padding |
| `space-2` | `8px` | Space between related form inputs, list item padding |
| `space-3` | `12px` | Spacing between small buttons, compact card padding |
| `space-4` | `16px` | Standard component padding, card body margin, base gutter |
| `space-6` | `24px` | Section margins, space between form groups |
| `space-8` | `32px` | Card container padding, modal margins |
| `space-12`| `48px` | Touch target height minimum, navigation bar height |
| `space-16`| `64px` | Landing page hero spacing, section separators |

---

## 3. The 60-30-10 Color Harmonization Rule

Avoid cluttered, chaotic multi-color interfaces. Enforce strict color budgeting:
- **60% Dominant Canvas (Neutral Base):** Backgrounds, surface cards, structural borders.
  - Light Mode: Crisp White `#FFFFFF`, Light Gray `#F8FAFC`, Border `#E2E8F0`.
  - Dark Mode: Deep Navy/Slate `#0F172A`, Surface `#1E293B`, Border `#334155`.
- **30% Structural Secondary (Content Hierarchy):** Navigation bars, typography, input borders, inactive tabs.
  - Primary Headlines: `#0F172A` (Slate 900)
  - Subtext / Meta: `#475569` (Slate 600)
- **10% Accent Call-to-Action (Focal Points):** Reserved **exclusively** for high-priority user actions:
  - Primary CTA Button (`#1D4ED8` Blue 700 or `#059669` Emerald 600).
  - Selected states, active booking slots, status badges.
  - Critical Alerts: Crimson Red `#DC2626` (used sparingly so emergency alerts command total attention).

---

## 4. Typography Scale & Fluid Hierarchy

Never use arbitrary font sizes. Enforce a harmonic typographic scale with strict tracking (letter-spacing) and line-height:

```css
/* Typography Scale Tokens */
--text-xs:   0.75rem;   /* 12px - Badges, timestamps */
--text-sm:   0.875rem;  /* 14px - Table data, helper text */
--text-base: 1.0rem;    /* 16px - Standard web body */
--text-lg:   1.125rem;  /* 18px - Elderly body, form inputs, buttons */
--text-xl:   1.25rem;   /* 20px - Card titles, modal headers */
--text-2xl:  1.5rem;    /* 24px - Section headlines */
--text-3xl:  1.875rem;  /* 30px - Page titles */
--text-4xl:  2.25rem;   /* 36px - Hero banners, large metrics */
```

---

## 5. Component Architecture (Atomic Design)

```
Tokens (Colors, Spacing, Typography)
  ▼
Atoms (Button, Input, Badge, Icon, Avatar)
  ▼
Molecules (FormField = Label + Input + ErrorText; SearchBar = Input + Button)
  ▼
Organisms (Navbar, DoctorBookingCard, RealtimeQueueTable, E-TicketReceipt)
  ▼
Templates (BookingWizardLayout, DashboardLayout)
  ▼
Pages (DoctorSelectionPage, SlotBookingPage, PaymentConfirmationPage)
```

---

## 6. Micro-Interactions & Perceived Performance

### 6.1. Shimmer Skeleton vs Circular Spinner
Never use a centered spinning wheel for page loads (which induces anxiety and makes users feel waiting time is 2x longer). Use **Shimmer Skeleton Loaders** that mimic the layout geometry:

```tsx
// components/DoctorCardSkeleton.tsx
export function DoctorCardSkeleton() {
  return (
    <div className="flex gap-4 p-4 border rounded-2xl animate-pulse bg-white">
      <div className="w-20 h-20 bg-slate-200 rounded-full" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-8 bg-slate-200 rounded w-1/3 mt-2" />
      </div>
    </div>
  );
}
```

### 6.2. Tactile Button Feedback
Buttons must provide immediate physical and visual feedback on click:
```css
.btn-primary {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.25);
}
.btn-primary:active {
  transform: translateY(1px) scale(0.98);
}
```

---

## 7. Form UX & Non-Punitive Error Prevention

1. **Inline Validation on Blur (Not on Keystroke):** Do not shout errors at users while they are still typing their phone number. Validate when the input loses focus (`onBlur`).
2. **Helpful Error Copy (Non-punitive):**
   - ❌ *Bad:* "Invalid input! Format error."
   - ✅ *Good:* "Vui lòng nhập số điện thoại gồm 10 chữ số (Ví dụ: 0912 345 678)."
3. **Format Masks & Visual Chunking:** Auto-format credit cards (`4242 •••• •••• 4242`) and citizen IDs (`0010 8900 xxxx`).
4. **Smart Defaults & Auto-focus:** Automatically focus the first input field on page load, and preserve filled data in `sessionStorage` in case of accidental refresh.
