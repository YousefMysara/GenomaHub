/**
 * Main Application Layout & Routing
 * 
 * Defines the master layout including the collapsible Sidebar and the main content area.
 * Handles the central routing for all major pages (Dashboard, Catalog, Inventory, etc.)
 * Provides a global Toast notification system passed down to children routes.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Catalog from './pages/Catalog'
import Inventory from './pages/Inventory'
import ProductDetails from './pages/ProductDetails'
import Quotations from './pages/Quotations'
import Clients from './pages/Clients'
import Alerts from './pages/Alerts'
import ToastContainer from './components/Toast'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Routes>
          <Route path="/" element={<Dashboard addToast={addToast} />} />
          <Route path="/catalog" element={<Catalog addToast={addToast} />} />
          <Route path="/catalog/:id" element={<ProductDetails addToast={addToast} />} />
          <Route path="/inventory" element={<Inventory addToast={addToast} />} />
          <Route path="/quotations" element={<Quotations addToast={addToast} />} />
          <Route path="/clients" element={<Clients addToast={addToast} />} />
          <Route path="/alerts" element={<Alerts addToast={addToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
