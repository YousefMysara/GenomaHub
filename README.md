# GenomaHub

GenomaHub is a comprehensive, full-stack Quotation & Inventory Management System tailored for medical and laboratory equipment suppliers. It manages the distinct lifecycles of both capital equipment (like analyzers) and consumable kits (like reagents), tracking stock levels, handling client CRM, and generating branded PDF quotations.

## Features

- **Dashboard**: High-level KPI monitoring, stock value aggregations, category distributions, and quick alerts.
- **Product Catalog**: Manage the master list of all equipment and consumables. Supports variable data based on item type (e.g., storage conditions for kits, serials for equipment).
- **Inventory Management**: Real-time stock tracking with color-coded reorder thresholds, lot/serial number logging, and expiry date warnings.
- **Quotations**: A complete quote builder supporting multiple line items, subtotaling, proportional discounts, and branded client-side **PDF Generation**.
- **Clients**: A mini-CRM tracking medical facilities, their contact info, and quotation histories.
- **Alerts & Analytics**: Dedicated views for low stock items, expiring kits (30/60/90-day color coding), and total stock valuation.

## Technology Stack

- **Frontend**: React (Vite), React Router DOM
- **Design System**: Custom CSS variables providing a modern, white/light theme with Crimson Red (`#B91C1C`) brand accents and glassmorphic elements. All styling is self-contained without external CSS frameworks like Tailwind.
- **Backend API**: Express.js
- **Database**: SQLite (via `better-sqlite3`), running locally with zero configuration via the `genomahub.db` file.
- **PDF Generation**: `jspdf` and `jspdf-autotable`
- **Charting**: `recharts` for visual data representation.
- **Icons**: `lucide-react`

## Project Architecture

The project acts as a single full-stack monorepo during development:
- `src/` - Contains all React frontend code (Components, Pages, App.jsx, CSS).
- `server/` - Contains the Express backend API and SQLite database configuration:
  - `server/db.js` - SQLite schema initialization (Tables: `products`, `inventory`, `clients`, `quotations`, `quote_line_items`).
  - `server/index.js` - Express main entry point.
  - `server/routes/` - Dedicated API routers for each entity type.
  - `server/seed.js` - Database initialization script with realistic mock data.
- `vite.config.js` - Configures Vite to proxy `/api` requests to the Express backend running on port 3001.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Setup

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Seed the database:**
   This will initialize `server/genomahub.db` and populate it with sample products, clients, and inventory data.
   \`\`\`bash
   npm run seed
   \`\`\`

3. **Start the development servers:**
   This command uses `concurrently` to run both the Vite frontend server and Express backend server simultaneously.
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open `http://localhost:5173` in your browser.
