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
  Users, Bell, ChevronLeft, ChevronRight, Dna
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/catalog', icon: Package, label: 'Catalog' },
  { path: '/inventory', icon: Warehouse, label: 'Inventory' },
  { path: '/quotations', icon: FileText, label: 'Quotations' },
  { path: '/clients', icon: Users, label: 'Clients' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Dna size={24} />
          </div>
          {!collapsed && <span className="logo-text">GenomaHub</span>}
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
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
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
          transition: width var(--transition-base);
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
          gap: var(--space-sm);
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #b91c1c, #991b1b);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(185, 28, 28, 0.2);
        }

        .logo-text {
          font-size: 1.2rem;
          font-weight: 800;
          color: #1b1b1b;
          letter-spacing: -0.02em;
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--space-md) var(--space-sm);
          display: flex;
          flex-direction: column;
          gap: 2px;
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

        @media (max-width: 640px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  )
}
