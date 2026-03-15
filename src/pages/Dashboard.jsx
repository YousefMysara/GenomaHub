/**
 * Dashboard Overview Page
 * 
 * The main landing page displaying key performance indicators (KPIs) and aggregated statistics.
 * Features:
 * - KPI Cards (Total Products, Stock Value, Active Quotes, Alerts)
 * - Category Distribution Pie Chart
 * - Stock by Category Bar Chart
 * - Quick views of Low Stock and Expiring Kits alerts
 * - Recent quotations table
 */
import { useState, useEffect } from 'react'
import {
  Package, DollarSign, FileText, AlertTriangle,
  Users, Clock, TrendingUp, ArrowRight
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CHART_COLORS = ['#b91c1c', '#1f2937', '#ef4444', '#6b7280', '#991b1b']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { count: totalProducts } = await supabase.from('products').select('*', { count: 'exact', head: true })
        
        const { data: inventoryData } = await supabase.from('inventory').select('*, products!inner(*)')
        let stockValue = 0
        const stockByCategoryMap = {}

        const lowStockAll = []
        const expiringAll = []
        const ninetyDaysFromNow = new Date()
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90)

        inventoryData?.forEach(item => {
          const qty = item.quantity || 0
          const price = item.products?.base_price || 0
          const cat = item.products?.category || 'Other'
          const trackStock = item.products?.track_stock !== false
          
          stockValue += qty * price

          if (!stockByCategoryMap[cat]) stockByCategoryMap[cat] = { category: cat, total_qty: 0, item_count: 0 }
          stockByCategoryMap[cat].total_qty += qty
          stockByCategoryMap[cat].item_count += 1

          if (trackStock) {
            if (qty <= item.reorder_level) {
              lowStockAll.push({ ...item, name: item.products.name, item_code: item.products.item_code, item_type: item.products.item_type })
            }
            if (item.expiry_date && new Date(item.expiry_date) <= ninetyDaysFromNow) {
              expiringAll.push({ ...item, name: item.products.name, item_code: item.products.item_code })
            }
          }
        })

        const stockByCategory = Object.values(stockByCategoryMap).sort((a,b) => b.total_qty - a.total_qty)
        const lowStockItems = lowStockAll.sort((a,b) => a.quantity - b.quantity).slice(0, 5)
        const expiringItems = expiringAll.sort((a,b) => new Date(a.expiry_date) - new Date(b.expiry_date)).slice(0, 5)

        const { count: activeQuotes } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).in('status', ['Draft', 'Sent'])
        const { count: totalClients } = await supabase.from('clients').select('*', { count: 'exact', head: true })
        const { data: recentQuotesRaw } = await supabase.from('quotations').select('*, clients(name)').order('date_created', { ascending: false }).limit(5)
        const recentQuotes = recentQuotesRaw?.map(q => ({ ...q, client_name: q.clients?.name })) || []

        setData({
          stats: { totalProducts, stockValue, lowStockCount: lowStockAll.length, activeQuotes, expiringCount: expiringAll.length, totalClients },
          recentQuotes, stockByCategory, lowStockItems, expiringItems
        })
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Loading GenomaHub analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { stats, recentQuotes, stockByCategory, lowStockItems, expiringItems } = data

  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`
    return `$${val.toFixed(0)}`
  }

  const getStatusClass = (status) => {
    const map = { Draft: 'badge-draft', Sent: 'badge-info', Accepted: 'badge-success', Rejected: 'badge-danger' }
    return map[status] || 'badge-draft'
  }

  const getDaysUntilExpiry = (date) => {
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome to GenomaHub — your medical equipment command center</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/quotations')}>
            <FileText size={16} /> New Quotation
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/catalog')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green"><Package size={22} /></div>
          <div className="stat-info">
            <h3>{stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><DollarSign size={22} /></div>
          <div className="stat-info">
            <h3>{formatCurrency(stats.stockValue)}</h3>
            <p>Stock Value</p>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/quotations')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon blue"><FileText size={22} /></div>
          <div className="stat-info">
            <h3>{stats.activeQuotes}</h3>
            <p>Active Quotes</p>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon red"><AlertTriangle size={22} /></div>
          <div className="stat-info">
            <h3>{stats.lowStockCount}</h3>
            <p>Low Stock Items</p>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/clients')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green"><Users size={22} /></div>
          <div className="stat-info">
            <h3>{stats.totalClients}</h3>
            <p>Total Clients</p>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon yellow"><Clock size={22} /></div>
          <div className="stat-info">
            <h3>{stats.expiringCount}</h3>
            <p>Expiring Kits</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Stock by Category */}
        <div className="card">
          <h3 className="section-title"><TrendingUp size={18} /> Stock by Category</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockByCategory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="category"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    color: '#1b1b1b',
                    fontSize: 13,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
                  }}
                />
                <Bar dataKey="total_qty" name="Total Quantity" radius={[6, 6, 0, 0]}>
                  {stockByCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card">
          <h3 className="section-title"><Package size={18} /> Category Distribution</h3>
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="item_count"
                  nameKey="category"
                  stroke="none"
                >
                  {stockByCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    color: '#1b1b1b',
                    fontSize: 13,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            {stockByCategory.map((cat, i) => (
              <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {cat.category}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Row */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Low Stock */}
        <div className="alert-panel">
          <div className="alert-panel-header">
            <AlertTriangle size={16} style={{ color: 'var(--status-danger)' }} />
            Low Stock Alerts
          </div>
          {lowStockItems.length === 0 ? (
            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              All items are well-stocked ✓
            </div>
          ) : (
            lowStockItems.map(item => (
              <div className="alert-item" key={item.id}>
                <div className="alert-item-info">
                  <span className="name">{item.name}</span>
                  <span className="detail">{item.item_code} · {item.item_type}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${item.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                    {item.quantity} / {item.reorder_level}
                  </span>
                </div>
              </div>
            ))
          )}
          {lowStockItems.length > 0 && (
            <div style={{ padding: 'var(--space-sm) var(--space-lg)', borderTop: '1px solid var(--border-primary)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>
                View all alerts <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Expiring Kits */}
        <div className="alert-panel">
          <div className="alert-panel-header">
            <Clock size={16} style={{ color: 'var(--status-warning)' }} />
            Expiring Kits (90 days)
          </div>
          {expiringItems.length === 0 ? (
            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No kits expiring soon ✓
            </div>
          ) : (
            expiringItems.map(item => {
              const days = getDaysUntilExpiry(item.expiry_date)
              return (
                <div className="alert-item" key={item.id}>
                  <div className="alert-item-info">
                    <span className="name">{item.name}</span>
                    <span className="detail">{item.item_code} · Lot: {item.lot_number || 'N/A'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${days <= 30 ? 'badge-danger' : days <= 60 ? 'badge-warning' : 'badge-info'}`}>
                      {days <= 0 ? 'EXPIRED' : `${days} days`}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Recent Quotations */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}><FileText size={18} /> Recent Quotations</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/quotations')}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Client</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentQuotes.map(q => (
                <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/quotations')}>
                  <td style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{q.quote_number}</td>
                  <td style={{ color: 'var(--text-primary)' }}>{q.client_name || '—'}</td>
                  <td><span className={`badge ${getStatusClass(q.status)}`}>{q.status}</span></td>
                  <td style={{ fontWeight: 600 }}>${q.total?.toLocaleString()}</td>
                  <td>{new Date(q.date_created).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
