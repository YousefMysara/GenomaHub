/**
 * Inventory Management Page - v3 (Enhanced Batch Ledger)
 * 
 * Tracks real-time stock grouped by Master Products, supporting itemized batches.
 * Features:
 * - Full item type taxonomy filter chips.
 * - Toggle to show/hide Quarantined/Expired/Removed batches.
 * - Soft-delete (Remove) with a mandatory reason comment.
 * - Expandable Master Rows with batch child sub-tables.
 * - Smart 'Receive Stock' Modal with searchable product picker.
 * - Inline editable reorder levels.
 */
import { useState, useEffect, Fragment, useRef } from 'react'
import { Warehouse, Search, Plus, Edit2, AlertTriangle, ChevronDown, ChevronRight, CheckCircle, Clock, Trash2, Eye, EyeOff } from 'lucide-react'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

export default function Inventory({ addToast }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')
  const [brandFilter, setBrandFilter] = useState('All')
  const [showInactive, setShowInactive] = useState(false)

  const [expandedRows, setExpandedRows] = useState(new Set())
  const [showModal, setShowModal] = useState(false)

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [editingBatch, setEditingBatch] = useState(null)

  // Product searchable picker
  const [catalogItems, setCatalogItems] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Delete with reason
  const [deletingBatch, setDeletingBatch] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [form, setForm] = useState({
    product_id: '', quantity: 1, location: '', lot_number: '', serial_number: '', expiry_date: '', status: 'Available'
  })

  const fetchInventory = async () => {
    const { data: pData, error: pErr } = await supabase
      .from('products')
      .select('*, brands(name)')
      .order('name')
    if (pErr) return console.error(pErr)

    const { data: iData, error: iErr } = await supabase
      .from('inventory')
      .select('*')
      .order('expiry_date', { ascending: true })
    if (iErr) return console.error(iErr)

    let result = (pData || []).map(p => {
      const batches = (iData || []).filter(i => i.product_id === p.id)
      const total_qty = batches.filter(b => b.status === 'Available').reduce((sum, b) => sum + (b.quantity || 0), 0)
      return { ...p, brand_name: p.brands?.name, total_qty, batches }
    })

    setCatalogItems(result)

    if (typeFilter !== 'All') result = result.filter(r => r.item_type === typeFilter)
    if (brandFilter !== 'All') result = result.filter(r => (r.brand_name || 'Generic') === brandFilter)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r =>
        r.name?.toLowerCase().includes(s) ||
        r.item_code?.toLowerCase().includes(s) ||
        r.batches.some(b => b.serial_number?.toLowerCase().includes(s) || b.lot_number?.toLowerCase().includes(s))
      )
    }
    if (stockFilter !== 'All') {
      result = result.filter(r => {
        if (!r.track_stock) return stockFilter === 'ok' // Non-tracked items are technically never "low" or "out" of stock, assume OK.
        if (stockFilter === 'ok') return r.total_qty > r.reorder_level
        if (stockFilter === 'low') return r.total_qty <= r.reorder_level && r.total_qty > 0
        if (stockFilter === 'out') return r.total_qty === 0
        return true
      })
    }

    setProducts(result)
  }

  useEffect(() => { fetchInventory() }, [typeFilter, stockFilter, brandFilter, search])

  const handleDeleteBatch = async () => {
    if (!deletingBatch) return
    const { error } = await supabase.from('inventory').update({
      status: 'Removed',
      notes: deleteReason || 'No reason provided',
      updated_at: new Date().toISOString()
    }).eq('id', deletingBatch.id)
    if (!error) {
      addToast('Batch removed from active inventory')
      setShowDeleteModal(false)
      setDeletingBatch(null)
      setDeleteReason('')
      fetchInventory()
    } else {
      addToast('Failed to remove batch', 'error')
    }
  }

  const toggleRow = (id) => {
    const newSet = new Set(expandedRows)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setExpandedRows(newSet)
  }

  const openReceiveStock = () => {
    setSelectedProduct(null)
    setEditingBatch(null)
    setProductSearch('')
    setShowDropdown(false)
    setForm({ product_id: '', quantity: 1, location: '', lot_number: '', serial_number: '', expiry_date: '', status: 'Available' })
    setShowModal(true)
  }

  const openEditBatch = (p, batch) => {
    setSelectedProduct(p)
    setEditingBatch(batch)
    setForm({
      product_id: p.id,
      quantity: batch.quantity,
      location: batch.location || '',
      lot_number: batch.lot_number || '',
      serial_number: batch.serial_number || '',
      expiry_date: batch.expiry_date || '',
      status: batch.status || 'Available'
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.product_id) return addToast('Please select a product first', 'error')

    const body = {
      product_id: form.product_id,
      quantity: parseInt(form.quantity) || 0,
      location: form.location || null,
      status: form.status,
      updated_at: new Date().toISOString()
    }

    if (selectedProduct?.item_type === 'Instrument') {
      if (!form.serial_number?.trim()) return addToast('Serial Number is required', 'error')

      // Check unique SN globally
      let query = supabase.from('inventory').select('id').eq('serial_number', form.serial_number.trim())
      if (editingBatch) query = query.neq('id', editingBatch.id)
      const { data: existingSN } = await query
      if (existingSN && existingSN.length > 0) return addToast('Error: This Serial Number is already registered', 'error')

      body.serial_number = form.serial_number.trim()
    } else {
      if (!form.lot_number?.trim()) return addToast('Lot Number is required', 'error')

      // Check unique LOT per product
      let query = supabase.from('inventory').select('id').eq('product_id', form.product_id).eq('lot_number', form.lot_number.trim())
      if (editingBatch) query = query.neq('id', editingBatch.id)
      const { data: existingLot } = await query
      if (existingLot && existingLot.length > 0) return addToast('Error: This Lot Number already exists for this product. Please edit the existing batch instead.', 'error')

      body.lot_number = form.lot_number.trim()
      body.expiry_date = form.expiry_date || null
    }

    let error
    if (editingBatch) {
      const { error: e } = await supabase.from('inventory').update(body).eq('id', editingBatch.id)
      error = e
    } else {
      const { error: e } = await supabase.from('inventory').insert(body)
      error = e
    }

    if (!error) {
      addToast(`Batch ${editingBatch ? 'updated' : 'received'} successfully`)
      setShowModal(false)
      fetchInventory()
    } else {
      console.error(error)
      addToast('Failed to save to inventory', 'error')
    }
  }

  const getDaysUntilExpiry = (date) => {
    if (!date) return null
    return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
  }

  const TYPE_FILTERS = ['All', 'Instrument', 'Spare Parts', 'Kit', 'Chemical', 'Control', 'Labware', 'General', 'License', 'Maintenance']
  const STOCK_FILTERS = [{ key: 'All', label: 'All' }, { key: 'ok', label: '✓ Healthy' }, { key: 'low', label: '⚠ Low' }, { key: 'out', label: '✗ Out' }]
  // Derive unique brands from loaded catalog
  const AVAILABLE_BRANDS = ['All', ...Array.from(new Set(catalogItems.map(c => c.brand_name || 'Generic'))).sort()]

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Inventory Management</h1>
          <p>Track stock levels, shipments, lots, and serial numbers in real time</p>
        </div>
        <button className="btn btn-primary" onClick={openReceiveStock}>
          <Plus size={18} /> Receive Stock
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
        {/* Search */}
        <div className="table-search" style={{ flex: '1 1 250px', margin: 0 }}>
          <Search size={16} />
          <input placeholder="Search products, lot #, serial #..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>TYPE</span>
          <select className="form-input" style={{ width: 140, padding: '7px 10px', fontSize: '0.85rem' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {TYPE_FILTERS.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
          </select>
        </div>

        {/* Brand filter */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>BRAND</span>
          <select className="form-input" style={{ width: 140, padding: '7px 10px', fontSize: '0.85rem' }} value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            {AVAILABLE_BRANDS.map(b => <option key={b} value={b}>{b === 'All' ? 'All Brands' : b}</option>)}
          </select>
        </div>

        {/* Stock filter */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>STOCK</span>
          <select className="form-input" style={{ width: 120, padding: '7px 10px', fontSize: '0.85rem' }} value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
             {STOCK_FILTERS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border-secondary)', margin: '0 4px' }} />

        {/* Inactive toggle */}
        <button
          className={`btn-ghost ${showInactive ? 'active' : ''}`}
          onClick={() => setShowInactive(!showInactive)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: showInactive ? 'var(--status-warning)' : 'var(--text-secondary)' }}
        >
          {showInactive ? <Eye size={16} /> : <EyeOff size={16} />}
          {showInactive ? 'Hide Expired/Removed/Sold' : 'Show Expired/Removed/Sold'}
        </button>
      </div>

      {/* ── Bulk inventory table ── */}
      <div className="table-container">
        <table className="data-table" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Master Product</th>
              <th>Code / Vendor</th>
              <th>Type</th>
              <th title="Click to edit" style={{ textAlign: 'center' }}>Min. Qty</th>
              <th style={{ textAlign: 'center' }}>On Hand</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>No tracked products found. Enable "Track Stock" on a product in the Catalog.</td></tr>
            ) : products.map(p => {
              const expanded = expandedRows.has(p.id)
              const hasLowStock = p.total_qty <= p.reorder_level && p.total_qty > 0
              const isOut = p.total_qty === 0

              return (
                <Fragment key={p.id}>
                  {/* ── MASTER ROW ── */}
                  <tr className="row-hover" style={{ background: expanded ? 'var(--bg-secondary)' : 'transparent', borderBottom: expanded ? 'none' : '1px solid var(--border-primary)' }}>
                    <td>
                      <button className="btn-icon" onClick={() => toggleRow(p.id)} style={{ padding: 4 }}>
                        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-accent)' }}>{p.item_code}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.brand_name || 'Generic'}</div>
                    </td>
                    <td><span className={`badge ${p.item_type === 'Instrument' ? 'badge-equipment' : 'badge-kit'}`}>{p.item_type}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      {p.track_stock ? (
                        <input
                          type="number"
                          defaultValue={p.reorder_level}
                          title="Click to edit minimum quantity"
                          style={{ width: 52, background: 'transparent', border: '1px solid transparent', borderRadius: 'var(--radius-sm)', padding: '2px 6px', fontSize: '0.9rem', color: 'var(--text-tertiary)', textAlign: 'center', transition: 'all 0.2s', margin: '0 auto', display: 'block' }}
                          onFocus={e => { e.target.style.borderColor = 'var(--border-secondary)'; e.target.style.background = 'var(--bg-secondary)' }}
                          onBlur={async e => {
                            e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'
                            const val = parseInt(e.target.value) || 0
                            if (val !== p.reorder_level) {
                              await supabase.from('products').update({ reorder_level: val }).eq('id', p.id)
                              addToast('Reorder level updated')
                              fetchInventory()
                            }
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                        />
                      ) : <div style={{ color: 'var(--text-tertiary)' }}>—</div>}
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '1.1rem', textAlign: 'center', color: !p.track_stock ? 'var(--text-tertiary)' : isOut ? 'var(--status-danger)' : hasLowStock ? 'var(--status-warning)' : 'var(--text-primary)' }}>
                      {p.total_qty}
                    </td>
                    <td>
                      {!p.track_stock 
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600 }}>NOT TRACKED</span>
                        : isOut
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--status-danger)', fontSize: '0.8rem', fontWeight: 600 }}><AlertTriangle size={14} /> OUT</span>
                          : hasLowStock
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--status-warning)', fontSize: '0.8rem', fontWeight: 600 }}><AlertTriangle size={14} /> LOW</span>
                            : <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--status-success)', fontSize: '0.8rem', fontWeight: 600 }}><CheckCircle size={14} /> OK</span>}
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => {
                        setSelectedProduct(p)
                        setForm({ product_id: p.id, quantity: 1, location: '', lot_number: '', serial_number: '', expiry_date: '', status: 'Available' })
                        setShowModal(true)
                      }}>
                        Receive Batch
                      </button>
                    </td>
                  </tr>

                  {/* ── CHILD BATCH ROWS ── */}
                  {expanded && (
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                      <td></td>
                      <td colSpan="7" style={{ padding: '0 var(--space-md) var(--space-md)' }}>
                        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid var(--border-primary)' }}>
                          {(() => {
                            const activeBatches = showInactive
                              ? p.batches
                              : p.batches.filter(b => !['Quarantined', 'Expired', 'Removed', 'Sold'].includes(b.status))

                            if (p.batches.length === 0) return (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                No batches logged. Click "Receive Batch" to add shipments.
                              </div>
                            )

                            if (activeBatches.length === 0) return (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-sm)' }}>
                                All batches are defective / expired / removed / sold.
                                <button onClick={() => setShowInactive(true)} style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--primary-700)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Show them</button>
                              </div>
                            )

                            return (
                              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ color: 'var(--text-tertiary)', textAlign: 'left', borderBottom: '1px solid var(--border-secondary)' }}>
                                    <th style={{ paddingBottom: 8, fontWeight: 500 }}>Batch / Serial</th>
                                    <th style={{ paddingBottom: 8, fontWeight: 500 }}>Location</th>
                                    <th style={{ paddingBottom: 8, fontWeight: 500 }}>Qty</th>
                                    <th style={{ paddingBottom: 8, fontWeight: 500 }}>Status</th>
                                    <th style={{ paddingBottom: 8, fontWeight: 500 }}>Expiry</th>
                                    <th style={{ paddingBottom: 8, fontWeight: 500 }}>Notes</th>
                                    <th style={{ paddingBottom: 8, textAlign: 'right' }}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {activeBatches.map(batch => {
                                    const days = getDaysUntilExpiry(batch.expiry_date)
                                    const isExpiring = days !== null && days <= 30
                                    const isRemoved = batch.status === 'Removed'
                                    return (
                                      <tr key={batch.id} style={{ borderBottom: '1px solid var(--border-secondary)', opacity: isRemoved ? 0.55 : 1 }}>
                                        <td style={{ padding: '8px 0', fontFamily: 'var(--font-mono)', textDecoration: isRemoved ? 'line-through' : 'none' }}>
                                          {p.item_type === 'Instrument' ? `SN: ${batch.serial_number || 'N/A'}` : `LOT: ${batch.lot_number || 'N/A'}`}
                                        </td>
                                        <td style={{ padding: '8px 0' }}>{batch.location || '—'}</td>
                                        <td style={{ padding: '8px 0', fontWeight: 700, color: batch.status === 'Available' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{batch.quantity}</td>
                                        <td style={{ padding: '8px 0' }}>
                                          <span
                                            className={`badge ${batch.status === 'Available' ? 'badge-success' : batch.status === 'Removed' ? 'badge-warning' : 'badge-danger'}`}
                                            style={{ fontSize: '0.7rem' }}
                                          >{batch.status}</span>
                                        </td>
                                        <td style={{ padding: '8px 0' }}>
                                          {batch.expiry_date
                                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: isExpiring ? 'var(--status-danger)' : 'var(--text-secondary)', fontWeight: isExpiring ? 600 : 400 }}>
                                              {isExpiring && <Clock size={12} />} {batch.expiry_date}
                                            </span>
                                            : '—'}
                                        </td>
                                        <td style={{ padding: '8px 0', fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={batch.notes}>
                                          {batch.notes || '—'}
                                        </td>
                                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                            <button className="btn-icon" onClick={() => openEditBatch(p, batch)} style={{ padding: 4 }} title="Edit"><Edit2 size={14} /></button>
                                            {!['Removed', 'Sold'].includes(batch.status) && (
                                              <button
                                                className="btn-icon"
                                                onClick={() => { setDeletingBatch(batch); setDeleteReason(''); setShowDeleteModal(true) }}
                                                style={{ padding: 4, color: 'var(--status-danger)' }}
                                                title="Remove from inventory"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add / Edit Batch Modal ── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingBatch ? 'Edit Batch' : 'Receive Stock'}>
        <div className="modal-body">
          <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
            <label>Master Product</label>
            {(editingBatch || selectedProduct) ? (
              <input className="form-input" disabled value={selectedProduct?.name || ''} />
            ) : (
              <>
                <input
                  className="form-input"
                  placeholder="Type to search products..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                />
                {showDropdown && productSearch.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, maxHeight: 200, overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4 }}>
                    {catalogItems.filter(c => c.name.toLowerCase().includes(productSearch.toLowerCase()) || c.item_code.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? (
                      <div style={{ padding: 'var(--space-md)', color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center' }}>No products match "{productSearch}"</div>
                    ) : catalogItems.filter(c => c.name.toLowerCase().includes(productSearch.toLowerCase()) || c.item_code.toLowerCase().includes(productSearch.toLowerCase())).map(c => (
                      <div key={c.id} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', transition: 'background 0.15s' }} className="row-hover"
                        onClick={() => { setSelectedProduct(c); setForm({ ...form, product_id: c.id, quantity: c.item_type === 'Instrument' ? 1 : '' }); setProductSearch(c.name); setShowDropdown(false) }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{c.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{c.item_code} · {c.brand_name || 'Generic'}</div>
                        </div>
                        <span className={`badge ${c.item_type === 'Instrument' ? 'badge-equipment' : 'badge-kit'}`} style={{ fontSize: '0.65rem' }}>{c.item_type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {selectedProduct && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity Received</label>
                  <input className="form-input" type="number" min="0" disabled={selectedProduct.item_type === 'Instrument'} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                  {selectedProduct.item_type === 'Instrument' && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Instruments are logged 1 at a time (per serial).</div>}
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    className="form-input" 
                    value={form.status} 
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    disabled={editingBatch?.status === 'Sold'}
                  >
                    <option value="Available">Available</option>
                    <option value="Quarantined">Quarantined / Defective</option>
                    <option value="Expired">Expired</option>
                    {editingBatch?.status === 'In Use' && <option value="In Use">In Use (Legacy)</option>}
                    {editingBatch?.status === 'Sold' && <option value="Sold">Sold</option>}
                  </select>
                  {editingBatch?.status === 'Sold' && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Status is locked because this item was sold via an invoice.</div>}
                </div>
              </div>

              <div className="form-group">
                <label>Storage Location</label>
                <input className="form-input" placeholder="e.g. Fridge A, Shelf 3" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>

              {selectedProduct.item_type === 'Instrument' ? (
                <div className="form-group">
                  <label>Serial Number (Critical) *</label>
                  <input className="form-input" placeholder="Scan or type SN..." value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label>Lot / Batch Number *</label>
                    <input className="form-input" placeholder="LOT-XXXXX" value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input className="form-input" type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedProduct}>Save to Ledger</button>
        </div>
      </Modal>

      {/* ── Remove Batch Confirmation Modal ── */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Remove Batch from Inventory">
        <div className="modal-body">
          <div style={{ padding: 'var(--space-md)', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 'var(--space-md)' }}>
            <div style={{ fontWeight: 600, color: 'var(--status-danger)', marginBottom: 4 }}>⚠ Soft Remove</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              This batch will be marked as <strong>Removed</strong> and hidden from active inventory. It will still appear in the product's history on the Product Details page. This cannot be undone from the UI.
            </div>
          </div>
          {deletingBatch && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              {deletingBatch.lot_number ? `LOT: ${deletingBatch.lot_number}` : deletingBatch.serial_number ? `SN: ${deletingBatch.serial_number}` : `Batch ID: ${deletingBatch.id?.slice(0, 8)}`}
            </div>
          )}
          <div className="form-group">
            <label>Reason for removal <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(required)</span></label>
            <input
              className="form-input"
              placeholder="e.g. Failed QC, contaminated, wrong item received..."
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: 'var(--status-danger)', borderColor: 'var(--status-danger)' }} onClick={handleDeleteBatch} disabled={!deleteReason.trim()}>
            Confirm Remove
          </button>
        </div>
      </Modal>
    </div>
  )
}
