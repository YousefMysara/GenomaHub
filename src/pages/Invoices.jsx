/**
 * Invoices Module
 * 
 * Manages sales invoices that link to inventory batches.
 * When an invoice is finalized, the selected batches are marked as "Sold"
 * and their quantities are deducted from the available inventory.
 * 
 * Features:
 * - Invoice list with status badges (Draft / Finalized)
 * - Create Invoice modal with client selection, searchable product picker, and batch selection
 * - Finalize flow that deducts inventory and stamps sold_to_client metadata
 */
import { useState, useEffect, Fragment } from 'react'
import { FileText, Plus, Search, CheckCircle, Trash2, Package } from 'lucide-react'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

export default function Invoices({ addToast }) {
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)

  // Create Invoice State
  const [clients, setClients] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [form, setForm] = useState({ client_id: '', notes: '' })
  const [lineItems, setLineItems] = useState([])
  
  // Product search for adding line items
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, client:client_id(name)')
      .order('created_at', { ascending: false })
    if (!error) setInvoices(data || [])
  }

  const fetchFormData = async () => {
    const { data: cl } = await supabase.from('clients').select('id, name').order('name')
    if (cl) setClients(cl)

    // Fetch products that have available inventory
    const { data: prods } = await supabase
      .from('products')
      .select('*, brands(name)')
      .eq('track_stock', true)
      .order('name')
    
    if (prods) {
      // Also fetch available batches for each
      const { data: batches } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'Available')
      
      const enriched = prods.map(p => ({
        ...p,
        brand_name: p.brands?.name,
        available_batches: (batches || []).filter(b => b.product_id === p.id)
      }))
      setAllProducts(enriched)
    }
  }

  useEffect(() => { fetchInvoices() }, [])

  const openCreate = () => {
    setForm({ client_id: '', notes: '' })
    setLineItems([])
    setProductSearch('')
    setShowProductDropdown(false)
    fetchFormData()
    setShowModal(true)
  }

  const addLineItem = (product, batch) => {
    // Prevent duplicate batch
    if (lineItems.find(l => l.batch_id === batch.id)) {
      return addToast('This batch is already in the invoice', 'error')
    }
    setLineItems([...lineItems, {
      product_id: product.id,
      product_name: product.name,
      item_code: product.item_code,
      item_type: product.item_type,
      batch_id: batch.id,
      lot_or_serial: product.item_type === 'Instrument' ? `SN: ${batch.serial_number || 'N/A'}` : `LOT: ${batch.lot_number || 'N/A'}`,
      max_qty: batch.quantity,
      quantity: product.item_type === 'Instrument' ? 1 : batch.quantity,
      unit_price: product.base_price || 0
    }])
    setProductSearch('')
    setShowProductDropdown(false)
  }

  const removeLineItem = (idx) => {
    setLineItems(lineItems.filter((_, i) => i !== idx))
  }

  const updateLineQty = (idx, qty) => {
    const updated = [...lineItems]
    updated[idx].quantity = Math.min(parseInt(qty) || 0, updated[idx].max_qty)
    setLineItems(updated)
  }

  const updateLinePrice = (idx, price) => {
    const updated = [...lineItems]
    updated[idx].unit_price = parseFloat(price) || 0
    setLineItems(updated)
  }

  const totalAmount = lineItems.reduce((sum, l) => sum + (l.quantity * l.unit_price), 0)

  const handleCreateInvoice = async () => {
    if (!form.client_id) return addToast('Please select a client', 'error')
    if (lineItems.length === 0) return addToast('Add at least one item', 'error')

    // 1. Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`

    // 2. Create invoice
    const { data: inv, error: invErr } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      client_id: form.client_id,
      notes: form.notes || null,
      total_amount: totalAmount,
      status: 'Draft'
    }).select().single()

    if (invErr) {
      console.error(invErr)
      return addToast('Failed to create invoice', 'error')
    }

    // 3. Create line items
    const items = lineItems.map(l => ({
      invoice_id: inv.id,
      inventory_id: l.batch_id,
      product_id: l.product_id,
      quantity: l.quantity,
      unit_price: l.unit_price
    }))

    const { error: itemErr } = await supabase.from('invoice_items').insert(items)
    if (itemErr) {
      console.error(itemErr)
      return addToast('Failed to add line items', 'error')
    }

    addToast(`Invoice ${invoiceNumber} created as Draft`)
    setShowModal(false)
    fetchInvoices()
  }

  const finalizeInvoice = async (invoice) => {
    if (invoice.status === 'Finalized') return

    // 1. Fetch line items for this invoice
    const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id)
    if (!items || items.length === 0) return addToast('No items on this invoice', 'error')

    // 2. Deduct each batch
    for (const item of items) {
      const { data: batch } = await supabase.from('inventory').select('*').eq('id', item.inventory_id).single()
      if (!batch) continue

      const newQty = batch.quantity - item.quantity
      if (newQty <= 0) {
        // Fully sold — mark as Sold
        await supabase.from('inventory').update({
          quantity: 0,
          status: 'Sold',
          sold_to_client: invoice.client_id,
          sold_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', batch.id)
      } else {
        // Partially sold — just reduce quantity
        await supabase.from('inventory').update({
          quantity: newQty,
          updated_at: new Date().toISOString()
        }).eq('id', batch.id)
      }
    }

    // 3. Mark invoice as finalized
    await supabase.from('invoices').update({ status: 'Finalized' }).eq('id', invoice.id)
    addToast(`Invoice ${invoice.invoice_number} finalized. Stock deducted.`)
    fetchInvoices()
  }

  // Filtering
  let filtered = invoices
  if (statusFilter !== 'All') filtered = filtered.filter(i => i.status === statusFilter)
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(i =>
      i.invoice_number?.toLowerCase().includes(s) ||
      i.client?.name?.toLowerCase().includes(s)
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Invoices</h1>
          <p>Create sales invoices and automatically deduct inventory on finalization</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> New Invoice
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="table-search">
          <Search size={16} />
          <input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters-row">
          {['All', 'Draft', 'Finalized'].map(s => (
            <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>No invoices found.</td></tr>
            ) : filtered.map(inv => (
              <tr key={inv.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-accent)' }}>{inv.invoice_number}</td>
                <td style={{ fontWeight: 500 }}>{inv.client?.name || '—'}</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>${inv.total_amount?.toLocaleString()}</td>
                <td>
                  <span className={`badge ${inv.status === 'Finalized' ? 'badge-success' : 'badge-warning'}`}>{inv.status}</span>
                </td>
                <td>
                  {inv.status === 'Draft' && (
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => finalizeInvoice(inv)}>
                      <CheckCircle size={13} /> Finalize
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Invoice">
        <div className="modal-body">
          
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Client</label>
              <select className="form-input" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">-- Select Client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <input className="form-input" placeholder="PO number, reference, etc." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          {/* Add Line Items */}
          <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
            <label style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', display: 'block' }}>Line Items</label>
            
            {/* Product Search */}
            <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
              <input
                className="form-input"
                placeholder="Search product to add..."
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true) }}
                onFocus={() => setShowProductDropdown(true)}
              />
              {showProductDropdown && productSearch.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, maxHeight: 250, overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4 }}>
                  {allProducts
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.item_code.toLowerCase().includes(productSearch.toLowerCase()))
                    .map(p => (
                      <div key={p.id}>
                        <div style={{ padding: '6px 12px', background: 'var(--bg-secondary)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                          {p.name} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>({p.item_code})</span>
                        </div>
                        {p.available_batches.length === 0 ? (
                          <div style={{ padding: '6px 12px 10px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>No available batches</div>
                        ) : p.available_batches.map(batch => (
                          <div
                            key={batch.id}
                            className="row-hover"
                            style={{ padding: '6px 12px 6px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderBottom: '1px solid var(--border-primary)' }}
                            onClick={() => addLineItem(p, batch)}
                          >
                            <span style={{ fontFamily: 'var(--font-mono)' }}>
                              {p.item_type === 'Instrument' ? `SN: ${batch.serial_number || 'N/A'}` : `LOT: ${batch.lot_number || 'N/A'}`}
                              <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>Qty: {batch.quantity}</span>
                            </span>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>+ Add</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  {allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.item_code.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: 'var(--space-md)', color: 'var(--text-tertiary)', textAlign: 'center', fontSize: '0.85rem' }}>No matching products</div>
                  )}
                </div>
              )}
            </div>

            {/* Line Item List */}
            {lineItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                <Package size={24} style={{ marginBottom: 8, opacity: 0.4 }} /><br/>
                Search and click batches above to add line items
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {lineItems.map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{line.product_name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{line.lot_or_serial}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        max={line.max_qty}
                        value={line.quantity}
                        disabled={line.item_type === 'Instrument'}
                        onChange={e => updateLineQty(idx, e.target.value)}
                        style={{ width: 50, padding: '2px 4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', textAlign: 'center', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>$</label>
                      <input
                        type="number"
                        value={line.unit_price}
                        onChange={e => updateLinePrice(idx, e.target.value)}
                        style={{ width: 70, padding: '2px 4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', textAlign: 'center', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ fontWeight: 700, minWidth: 70, textAlign: 'right', color: 'var(--primary-700)' }}>
                      ${(line.quantity * line.unit_price).toLocaleString()}
                    </div>
                    <button className="btn-icon" onClick={() => removeLineItem(idx)} style={{ color: 'var(--status-danger)', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-md)', padding: '10px 10px 0', borderTop: '1px solid var(--border-primary)', marginTop: 'var(--space-xs)' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Total:</span>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-700)' }}>${totalAmount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateInvoice} disabled={lineItems.length === 0}>Create Draft Invoice</button>
        </div>
      </Modal>
    </div>
  )
}
