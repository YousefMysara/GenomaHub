# GENOMA Developer Guide

Welcome to the **GENOMA** developer handbook! This guide contains quick-start instructions, coding standards, design practices, and guidelines for extending the codebase.

Before diving in, review the comprehensive specifications inside the `docs/` folder:
- **System Architecture & Styling**: [ARCHITECTURE.md](file:///c:/Users/youse/Downloads/Softwares/GenomaHub/docs/ARCHITECTURE.md)
- **Database Tables & Security Policies**: [DATABASE_SCHEMA.md](file:///c:/Users/youse/Downloads/Softwares/GenomaHub/docs/DATABASE_SCHEMA.md)
- **Application Pages & Operations Flows**: [MODULES_AND_FLOWS.md](file:///c:/Users/youse/Downloads/Softwares/GenomaHub/docs/MODULES_AND_FLOWS.md)

---

## ⚡ Quick-Start (Running Locally)

To spin up your local development workspace, follow these steps:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Verify that your local `.env` file contains valid Supabase configurations:
   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
   ```

3. **Launch Local Server**:
   ```bash
   npm run dev
   ```
   The application will run locally and is typically accessible at [http://localhost:5173](http://localhost:5173).

---

## 🎨 Design & Aesthetic Guidelines

GENOMA is designed to impress with high-fidelity visuals. Adhere to these principles for any UI enhancements:

### 1. Color Harmony
- Always reference defined custom CSS properties inside [index.css](file:///c:/Users/youse/Downloads/Softwares/GenomaHub/src/index.css). Do not hardcode HEX or RGB values.
- **Brand Crimson**: Use `var(--primary-700)` (`#b91c1c`) or `var(--primary-600)` (`#dc2626`) for accents, price highlights, and focus borders.
- **Background Tones**: Rely on clean surface cards (`var(--bg-card)`) with hover states that shift to subtle grey overlays (`var(--bg-card-hover)`).

### 2. Glassmorphic Effects & Animations
- **Glassmorphism**: For modern containers and floating models, utilize `var(--bg-glass)` coupled with standard blurring properties:
  ```css
  background: var(--bg-glass);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  ```
- **Micro-Animations**: Animate view updates using predefined transition speeds (`var(--transition-base)`) and entry effects. Include classes like `animate-fade-in` in page wrapper divisions.

### 3. Circular Dynamic Branding Logos
- In tables (e.g., Catalog or Inventory) or header cards, display brand logos inside clean, bordered circular thumbnails to keep listings clean and consistent:
  ```jsx
  <img 
    src={brandLogoUrl || fallbackUrl} 
    className="brand-thumbnail-circle" 
    alt="Logo"
  />
  ```

---

## 💻 Coding Standards & Conventions

Keep interactions smooth and database tables normalized by following these guidelines:

### 1. Currency Display (EGP)
- GENOMA's primary currency is **EGP (Egyptian Pound)**.
- Format all prices using Javascript locale functions:
  ```javascript
  `EGP ${parseFloat(price).toLocaleString()}`
  ```

### 2. The Global Toast Context
- Every route is passed down a standard `addToast` prop from `App.jsx`.
- Trigger interactive overlays instantly to notify users of actions:
  - **Success**: `addToast('Record updated successfully', 'success')`
  - **Errors**: `addToast('Operation failed: ' + error.message, 'error')`
  - **Warning**: `addToast('This item is low in stock', 'warning')`

### 3. Transactional Safety & Cascading
- Always verify transactional processes (e.g., deducting stock or finalizing invoices). 
- Perform modifications to critical ledgers (like `inventory` quantities) inside a single transaction or iterate safely, verifying state results before committing updates.

---

## 🚀 Guidelines for Safely Extending GENOMA

### 1. Adding a Database Column
1. Add the column to `supabase_schema.sql` under the correct table for local schema reference.
2. In the Supabase dashboard, execute an SQL migration to add the column.
3. Update the corresponding form state and markup in the associated page component.

### 2. Adding a New Page Module
1. Create a page file (e.g., `src/pages/Analytics.jsx`).
2. Add the route path and component definition inside [App.jsx](file:///c:/Users/youse/Downloads/Softwares/GenomaHub/src/App.jsx).
3. Import the required routing icon and add the path to `navItems` in [Sidebar.jsx](file:///c:/Users/youse/Downloads/Softwares/GenomaHub/src/components/Sidebar.jsx).

### 3. Handling Global App Settings & Multipliers
- When managing global configurations that must be universally available without auth/session friction, utilize the `public.settings` table.
- Row Level Security (RLS) should be disabled on tables like `settings` (`ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;`) so that client-side components using Supabase anon keys can perform instant, unauthenticated writes/reads safely.

---

## 🔍 Pre-Deployment & Commit Checklist

Before pushing changes or proposing modifications, verify the following:
- [ ] No hardcoded database strings or credential keys are checked in.
- [ ] UI changes have been validated on both collapsed and expanded sidebar views.
- [ ] Price tags use the explicit **EGP** currency formatting.
- [ ] Stock allocations and invoice finalization procedures have been checked to ensure they do not produce negative inventory levels.
- [ ] RLS policies have been updated if any new tables were created (or disabled for global, unauthenticated system settings tables).
- [ ] Edited and deleted draft invoice states have been manually validated to guarantee proper cleanup of associated relational records in `invoice_items`.
- [ ] Instruments (Devices) show up correctly in invoice lookups even if they do not have stock tracked, by letting users select specific serialized items log.
