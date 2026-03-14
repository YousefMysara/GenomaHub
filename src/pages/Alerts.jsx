import { useState, useEffect } from 'react'
import {
  AlertTriangle, Clock, DollarSign, Package,
  TrendingDown, Thermometer, ArrowDown
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const CHART_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#f59e0b', '#a855f7']

export default function Alerts() {
  const [alerts, setAlerts] = useState({ lowStock: [], expiring: [] })
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('lowstock')

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/alerts').then(r => r.json()),
      fetch('/api/inventory').then(r => r.json())
    ]).then(([alertData, invData]) => {
      setAlerts(alertData)
      setInventory(invData)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1>Alerts & Analytics</h1>
          <p>Loading alert data...</p>
        </div>
      </div>
    )
  }

  // Stock valuation by category
  const valuationMap = {}
  inventory.forEach(item => {
    const cat = item.category || 'Other'
    if (!valuationMap[cat]) valuationMap[cat] = { category: cat, value: 0, count: 0 }
    valuationMap[cat].value += item.quantity * (item.base_price || 0)
    valuationMap[cat].count += 1
  })
  const valuationData = Object.values(valuationMap).sort((a, b) => b.value - a.value)
  const totalValuation = valuationData.reduce((s, v) => s + v.value, 0)

  const getDaysUntilExpiry = (date) => {
    if (!date) return null
    return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
  }

  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`
    return `$${val.toFixed(0)}`
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Alerts & Analytics</h1>
        <p>Monitor stock levels, expiry dates, and inventory valuation</p>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon red"><AlertTriangle size={22} /></div>
          <div className="stat-info">
            <h3>{alerts.lowStock.length}</h3>
            <p>Low Stock Items</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Clock size={22} /></div>
          <div className="stat-info">
            <h3>{alerts.expiring.length}</h3>
            <p>Expiring (90 days)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><DollarSign size={22} /></div>
          <div className="stat-info">
            <h3>{formatCurrency(totalValuation)}</h3>
            <p>Total Stock Value</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Package size={22} /></div>
          <div className="stat-info">
            <h3>{inventory.length}</h3>
            <p>Total SKUs</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="filters-row" style={{ marginBottom: 'var(--space-lg)' }}>
        <button className={`filter-chip ${tab === 'lowstock' ? 'active' : ''}`} onClick={() => setTab('lowstock')}>
          🔴 Low Stock ({alerts.lowStock.length})
        </button>
        <button className={`filter-chip ${tab === 'expiry' ? 'active' : ''}`} onClick={() => setTab('expiry')}>
          🟡 Expiring Kits ({alerts.expiring.length})
        </button>
        <button className={`filter-chip ${tab === 'valuation' ? 'active' : ''}`} onClick={() => setTab('valuation')}>
          📊 Stock Valuation
        </button>
      </div>

      {/* Low Stock Tab */}
      {tab === 'lowstock' && (
        <div className="table-container animate-fade-in">
          {alerts.lowStock.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <h3>All items are well-stocked</h3>
              <p>No items have dropped below their reorder level</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Current Qty</th>
                  <th>Reorder Level</th>
                  <th>Deficit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.lowStock.map(item => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-accent)' }}>{item.item_code}</td>
                    <td><span className={`badge ${item.item_type === 'Equipment' ? 'badge-equipment' : 'badge-kit'}`}>{item.item_type}</span></td>
                    <td style={{ fontWeight: 700, color: item.quantity === 0 ? 'var(--status-danger)' : 'var(--status-warning)' }}>{item.quantity}</td>
                    <td>{item.reorder_level}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--status-danger)' }}>
                        <ArrowDown size={14} /> {Math.max(0, item.reorder_level - item.quantity)}
                      </span>
                    </td>
                    <td>
                      {item.quantity === 0 ? (
                        <span className="badge badge-danger">OUT OF STOCK</span>
                      ) : (
                        <span className="badge badge-warning">LOW STOCK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Expiry Tab */}
      {tab === 'expiry' && (
        <div className="table-container animate-fade-in">
          {alerts.expiring.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} />
              <h3>No kits expiring soon</h3>
              <p>No inventory items will expire within the next 90 days</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Code</th>
                  <th>Lot #</th>
                  <th>Qty</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {alerts.expiring.map(item => {
                  const days = getDaysUntilExpiry(item.expiry_date)
                  return (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-accent)' }}>{item.item_code}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{item.lot_number || '—'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.expiry_date}</td>
                      <td style={{ fontWeight: 700, color: days <= 0 ? 'var(--status-danger)' : days <= 30 ? 'var(--status-danger)' : days <= 60 ? 'var(--status-warning)' : 'var(--status-info)' }}>
                        {days <= 0 ? 'EXPIRED' : `${days} days`}
                      </td>
                      <td>
                        <span className={`badge ${days <= 0 ? 'badge-danger' : days <= 30 ? 'badge-danger' : days <= 60 ? 'badge-warning' : 'badge-info'}`}>
                          {days <= 0 ? 'EXPIRED' : days <= 30 ? 'CRITICAL' : days <= 60 ? 'WARNING' : 'WATCH'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Valuation Tab */}
      {tab === 'valuation' && (
        <div className="animate-fade-in">
          <div className="grid-2">
            {/* Chart */}
            <div className="card">
              <h3 className="section-title"><TrendingDown size={18} /> Value by Category</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={valuationData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      tickFormatter={v => formatCurrency(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1a2332',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        color: '#f9fafb',
                        fontSize: 13
                      }}
                      formatter={(val) => [`$${val.toLocaleString()}`, 'Value']}
                    />
                    <Bar dataKey="value" name="Stock Value" radius={[0, 6, 6, 0]}>
                      {valuationData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="card">
              <h3 className="section-title"><DollarSign size={18} /> Category Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {valuationData.map((cat, i) => {
                  const pct = totalValuation > 0 ? (cat.value / totalValuation * 100) : 0
                  return (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{cat.category}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: CHART_COLORS[i % CHART_COLORS.length] }}>
                          {formatCurrency(cat.value)}
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[(i + 1) % CHART_COLORS.length]})`,
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.8s ease-out'
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{cat.count} items</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })}

                <div style={{
                  marginTop: 'var(--space-sm)',
                  padding: 'var(--space-md)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Inventory Value</span>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-400)' }}>
                    {formatCurrency(totalValuation)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
