/**
 * Inventory Management Page
 * 
 * Tracks real-time stock levels, locations, and specific product identifiers.
 * Features:
 * - Table view of stock levels with visual status badges (In Stock, Low Stock, Out of Stock)
 * - Filtering by item type and stock status
 * - Update stock modal to manually adjust quantities or update expiry/lot/serial data
 * - Expiry date calculation and color-coded warnings
 */
import { useState, useEffect } from 'react'
import { Warehouse, Search, Edit2, AlertTriangle, Thermometer, Hash, CheckCircle, XCircle } from 'lucide-react'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

export default function Inventory({ addToast }) {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    quantity: '', location: '', reorder_level: '', lot_number: '', serial_number: '', expiry_date: ''
  })

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*, products!inner(*, brands(name))')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    let result = data?.map(i => ({
      ...i.products,
      ...i, // inventory overrides product fields (ensures ID is inventory.id)
      brand_name: i.products.brands?.name
    })) || []

    // Client-side filtering
    if (typeFilter !== 'All') result = result.filter(r => r.item_type === typeFilter)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r => 
        r.name?.toLowerCase().includes(s) || 
        r.item_code?.toLowerCase().includes(s) ||
        r.serial_number?.toLowerCase().includes(s) ||
        r.lot_number?.toLowerCase().includes(s)
      )
    }
    if (stockFilter !== 'All') {
      result = result.filter(r => {
        if (stockFilter === 'ok') return r.quantity > r.reorder_level
        if (stockFilter === 'low') return r.quantity <= r.reorder_level && r.quantity > 0
        if (stockFilter === 'out') return r.quantity === 0
        return true
      })
    }
    
    setItems(result)
  }

  useEffect(() => { fetchInventory() }, [typeFilter, stockFilter, search])

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      quantity: item.quantity,
      location: item.location || '',
      reorder_level: item.reorder_level,
      lot_number: item.lot_number || '',
      serial_number: item.serial_number || '',
      expiry_date: item.expiry_date || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    const body = {
      ...form,
      quantity: parseInt(form.quantity) || 0,
      reorder_level: parseInt(form.reorder_level) || 5,
      updated_at: new Date().toISOString()
    }

    // Handle empty date string for Supabase inserting NULL
    if (!body.expiry_date) body.expiry_date = null

    const { error } = await supabase.from('inventory').update(body).eq('id', editing.id)
    
    if (!error) {
      addToast('Inventory updated successfully')
      setShowModal(false)
      fetchInventory()
    } else {
      console.error(error)
      addToast('Failed to update inventory', 'error')
    }
  }

  const getStockBadge = (qty, reorder) => {
    if (qty === 0) return <span className="badge badge-danger">Out of Stock</span>
    if (qty <= reorder) return <span className="badge badge-warning">Low Stock</span>
    return <span className="badge badge-success">In Stock</span>
  }

  const getDaysUntilExpiry = (date) => {
    if (!date) return null
    return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Inventory Management</h1>
        <p>Track stock levels, serial numbers, lots, and expiry dates</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="table-search">
          <Search size={16} />
          <input placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters-row">
          {['All', 'Equipment', 'Kit'].map(t => (
            <button key={t} className={`filter-chip ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
              {t === 'All' ? 'All Types' : t}
            </button>
          ))}
        </div>
        <div className="filters-row">
          {[{ key: 'All', label: 'All Stock' }, { key: 'ok', label: 'In Stock' }, { key: 'low', label: 'Low Stock' }, { key: 'out', label: 'Out of Stock' }].map(s => (
            <button key={s.key} className={`filter-chip ${stockFilter === s.key ? 'active' : ''}`} onClick={() => setStockFilter(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Code</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Location</th>
              <th>Serial / Lot</th>
              <th>Expiry</th>
              <th>Storage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>No inventory items found</td></tr>
            ) : items.map(item => {
              const days = getDaysUntilExpiry(item.expiry_date)
              return (
                <tr key={item.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-accent)' }}>{item.item_code}</td>
                  <td><span className={`badge ${item.item_type === 'Equipment' ? 'badge-equipment' : 'badge-kit'}`}>{item.item_type}</span></td>
                  <td style={{ fontWeight: 700, color: item.quantity <= item.reorder_level ? 'var(--status-danger)' : 'var(--text-primary)' }}>{item.quantity}</td>
                  <td>{getStockBadge(item.quantity, item.reorder_level)}</td>
                  <td style={{ fontSize: '0.82rem' }}>{item.location || '—'}</td>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    {item.item_type === 'Equipment' ? (
                      item.serial_number ? <span title="Serial Number">S/N: {item.serial_number}</span> : '—'
                    ) : (
                      item.lot_number ? <span title="Lot Number">Lot: {item.lot_number}</span> : '—'
                    )}
                  </td>
                  <td>
                    {item.expiry_date ? (
                      <span className={`badge ${days !== null && days <= 30 ? 'badge-danger' : days !== null && days <= 60 ? 'badge-warning' : 'badge-info'}`}>
                        {days !== null && days <= 0 ? 'EXPIRED' : item.expiry_date}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {item.storage_conditions ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--accent-400)' }}>
                        <Thermometer size={12} /> {item.storage_conditions}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button onClick={() => openEdit(item)} title="Update Stock"><Edit2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Update: ${editing?.name || ''}`}>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input className="form-input" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Reorder Level</label>
              <input className="form-input" type="number" value={form.reorder_level} onChange={e => setForm({ ...form, reorder_level: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Location</label>
            <input className="form-input" placeholder="Warehouse / Shelf / Freezer" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          </div>
          {editing?.item_type === 'Equipment' ? (
            <div className="form-group">
              <label>Serial Number</label>
              <input className="form-input" placeholder="SN-XXXX-XXXX-XXXX" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Lot / Batch Number</label>
                <input className="form-input" placeholder="LOT-XXXX-XXXXXXXX" value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input className="form-input" type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Update Inventory</button>
        </div>
      </Modal>
    </div>
  )
}
