/**
 * Sidebar Navigation Component
 * 
 * Fixed navigation menu that acts as the primary layout controller.
 * Features:
 * - Collapsible state (icon-only mode) controlled by parent App
 * - Active route highlighting with brand colors
 * - Icons for all major application modules
 */
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Warehouse, FileText,
  Users, Bell, ChevronLeft, ChevronRight, Dna, Receipt, Target, Settings as SettingsIcon
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/catalog', icon: Package, label: 'Catalog' },
  { path: '/inventory', icon: Warehouse, label: 'Inventory' },
  { path: '/quotations', icon: FileText, label: 'Quotations' },
  { path: '/invoices', icon: Receipt, label: 'Invoices' },
  { path: '/sales-pipeline', icon: Target, label: 'Sales Pipeline' },
  { path: '/organizations', icon: Users, label: 'Organizations' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings' },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation()

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img
            className="logo-full"
            src="https://ewrkclcpbhysgnvmnkrt.supabase.co/storage/v1/object/public/site-media/GENOMA_Logo_Wide.png"
            alt="GENOMA"
          />
          <img
            className="logo-icon-only"
            src="https://ewrkclcpbhysgnvmnkrt.supabase.co/storage/v1/object/public/site-media/GENOMA_Icon.png"
            alt="GENOMA"
          />
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={item.label}
              onClick={() => onMobileClose && onMobileClose()}
            >
              <Icon size={20} className="nav-item-icon" />
              <span className="nav-item-text">{item.label}</span>
              {isActive && <div className="nav-indicator" />}
            </NavLink>
          )
        })}
      </nav>

      <button className="sidebar-toggle" onClick={onToggle}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <style>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: #ffffff;
          border-right: 1px solid var(--border-primary);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width var(--transition-base), transform var(--transition-base);
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
        }

        .sidebar-collapsed {
          width: var(--sidebar-collapsed);
        }

        .sidebar-header {
          padding: var(--space-lg);
          border-bottom: 1px solid var(--border-primary);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          min-height: 40px;
        }

        .logo-full {
          display: block;
          width: 100%;
          height: auto;
          max-height: 40px;
          object-fit: contain;
        }

        .logo-icon-only {
          display: none;
          width: 32px;
          height: auto;
          max-height: 40px;
          object-fit: contain;
        }

        .sidebar-collapsed .logo-full {
          display: none;
        }

        .sidebar-collapsed .logo-icon-only {
          display: block;
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--space-md) var(--space-sm);
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: 11px var(--space-md);
          border-radius: var(--radius-md);
          color: var(--text-tertiary);
          font-weight: 500;
          font-size: 0.88rem;
          transition: all var(--transition-fast);
          position: relative;
          text-decoration: none;
        }

        .nav-item:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .nav-item.active {
          color: #b91c1c;
          background: rgba(185, 28, 28, 0.06);
        }

        .nav-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: linear-gradient(180deg, #b91c1c, #dc2626);
          border-radius: 0 var(--radius-full) var(--radius-full) 0;
        }

        .sidebar-collapsed .nav-item {
          justify-content: center;
          padding: 11px;
        }

        .sidebar-collapsed .nav-item-text {
          display: none;
        }

        .sidebar-collapsed .nav-indicator {
          left: 0;
        }

        .sidebar-toggle {
          margin: var(--space-md);
          padding: var(--space-sm);
          border-radius: var(--radius-md);
          background: var(--bg-tertiary);
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
          border: 1px solid var(--border-primary);
        }

        .sidebar-toggle:hover {
          color: var(--text-primary);
          border-color: var(--border-secondary);
        }

        /* Responsive Styles */
        
        /* 1. Medium Tablets (768px - 1024px) - Auto-collapsed mode */
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar {
            width: var(--sidebar-collapsed) !important;
          }
          .logo-full {
            display: none !important;
          }
          .logo-icon-only {
            display: block !important;
          }
          .sidebar .nav-item {
            justify-content: center !important;
            padding: 11px !important;
          }
          .sidebar .nav-item-text {
            display: none !important;
          }
          .sidebar .nav-indicator {
            left: 0 !important;
          }
        }

        /* 2. Small Mobile & Tablets (up to 768px) - Drawer Overlay mode */
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            z-index: 150;
            top: 0;
            bottom: 0;
            width: var(--sidebar-width) !important;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
          }
          .sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .sidebar-toggle {
            display: none !important;
          }
          .logo-full {
            display: block !important;
          }
          .logo-icon-only {
            display: none !important;
          }
          .sidebar .nav-item {
            justify-content: flex-start !important;
            padding: 11px var(--space-md) !important;
          }
          .sidebar .nav-item-text {
            display: inline !important;
          }
          .sidebar .nav-indicator {
            left: 0 !important;
          }
        }
      `}</style>
    </aside>
  )
}
