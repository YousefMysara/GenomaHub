/**
 * Quotations Management Page
 * 
 * Handles the creation, tracking, and PDF generation of client quotations.
 * Features:
 * - Table view of all quotes with state management (Draft, Sent, Accepted, Rejected)
 * - Quote Builder: Select contact person, search/add products, dynamic line item calculation
 * - Subtotal, discount, and total pricing logic
 * - Auto-generation of branded PDF quotes using jsPDF
 */
import { useState, useEffect, useRef } from 'react'
import {
  FileText, Plus, Search, Eye, Trash2, Download,
  Send, CheckCircle, XCircle, ChevronDown
} from 'lucide-react'
import Modal from '../components/Modal'
import QuoteDetailsModal from '../components/QuoteDetailsModal'
import { supabase } from '../lib/supabase'
import { useLocation } from 'react-router-dom'
import { generateQuotePDF } from '../lib/generateQuotePDF'

const STATUS_OPTIONS = ['All', 'Draft', 'Sent', 'Accepted', 'Rejected']

export default function Quotations({ addToast }) {
  const [quotes, setQuotes] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showDetails, setShowDetails] = useState(null)
  const location = useLocation()

  useEffect(() => {
    if (location.state?.openQuote) {
      setShowDetails(location.state.openQuote)
      // Clear state so it doesn't re-open on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])
  
  // Contacts and Products
  const [contacts, setContacts] = useState([])
  const [products, setProducts] = useState([])

  // Builder state
  const [builderForm, setBuilderForm] = useState({
    contact_id: '', validity_days: 30, terms_conditions: 'Standard delivery and installation terms apply. Warranty as per manufacturer guidelines.',
    notes: '', discount_percent: 0
  })
  const [lineItems, setLineItems] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const fetchQuotes = async () => {
    let query = supabase.from('quotations').select('*, clients(name), contacts(first_name, last_name)')
    if (statusFilter !== 'All') query = query.eq('status', statusFilter)
    
    const { data, error } = await query
    if (error) {
      console.error("Fetch Quotes Error:", error)
      addToast("Error fetching quotes: " + error.message, "error")
    }
    
    let result = data?.map(q => ({ 
      ...q, 
      client_name: q.clients?.name,
      contact_name: q.contacts ? `${q.contacts.first_name} ${q.contacts.last_name}` : ''
    })) || []
    
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(q => q.quote_number.toLowerCase().includes(s) || q.client_name?.toLowerCase().includes(s) || q.contact_name?.toLowerCase().includes(s))
    }

    // Sort locally by whatever date column exists (created_at or date_created fallback)
    result.sort((a, b) => new Date(b.created_at || b.date_created || 0) - new Date(a.created_at || a.date_created || 0))

    setQuotes(result)
  }

  useEffect(() => { fetchQuotes() }, [statusFilter, search])
  
  useEffect(() => {
    // Fetch contacts with nested client info
    supabase.from('contacts').select('id, first_name, last_name, client_id, clients(name)').order('first_name').then(({data}) => setContacts(data || []))
    supabase.from('products').select('id, name, item_code, base_price, item_type').order('name').then(({data}) => setProducts(data || []))
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProductDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.item_code.toLowerCase().includes(productSearch.toLowerCase())
  )

  const addLineItem = (product) => {
    if (lineItems.find(li => li.product_id === product.id)) {
      setLineItems(lineItems.map(li =>
        li.product_id === product.id ? { ...li, quantity: li.quantity + 1 } : li
      ))
    } else {
      setLineItems([...lineItems, {
        product_id: product.id,
        product_name: product.name,
        item_code: product.item_code,
        quantity: 1,
        quoted_price: product.base_price,
        discount_percent: 0
      }])
    }
    setProductSearch('')
    setShowProductDropdown(false)
  }

  const updateLineItem = (index, field, value) => {
    setLineItems(lineItems.map((li, i) => i === index ? { ...li, [field]: value } : li))
  }

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const getLineTotal = (li) => {
    return li.quantity * li.quoted_price * (1 - (li.discount_percent || 0) / 100)
  }

  const subtotal = lineItems.reduce((sum, li) => sum + getLineTotal(li), 0)
  const discountAmount = subtotal * (builderForm.discount_percent || 0) / 100
  const total = subtotal - discountAmount

  const handleCreateQuote = async () => {
    if (!builderForm.contact_id) {
      addToast('Please select a contact person', 'warning')
      return
    }
    if (lineItems.length === 0) {
      addToast('Please add at least one product', 'warning')
      return
    }

    const selectedContact = contacts.find(c => c.id === builderForm.contact_id)
    if (!selectedContact) {
      addToast('Invalid contact selected', 'error')
      return
    }

    const quote_number = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    
    // UUID bug note: builderForm.contact_id is a valid UUID, so we directly assign it.
    // Derived client_id from selected contact.
    const quoteData = {
      quote_number,
      client_id: selectedContact.client_id, 
      contact_id: selectedContact.id,
      status: 'Draft',
      subtotal,
      discount_percent: builderForm.discount_percent || 0,
      total,
      validity_days: builderForm.validity_days,
      terms_conditions: builderForm.terms_conditions,
      notes: builderForm.notes
    }

    const { data: newQuote, error: quoteError } = await supabase.from('quotations').insert([quoteData]).select().single()
    
    if (quoteError) {
      console.error(quoteError)
      addToast('Failed to create quotation', 'error')
      return
    }

    const lineItemsData = lineItems.map(li => ({
      quote_id: newQuote.id,
      product_id: li.product_id,
      quantity: parseInt(li.quantity),
      quoted_price: parseFloat(li.quoted_price),
      discount_percent: parseFloat(li.discount_percent) || 0,
      line_total: getLineTotal(li)
    }))

    const { error: lineError } = await supabase.from('quote_line_items').insert(lineItemsData)

    if (!lineError) {
      addToast('Quotation created successfully!')
      setShowBuilder(false)
      setLineItems([])
      setBuilderForm({ contact_id: '', validity_days: 30, terms_conditions: 'Standard delivery and installation terms apply. Warranty as per manufacturer guidelines.', notes: '', discount_percent: 0 })
      fetchQuotes()
    } else {
      console.error(lineError)
      addToast('Failed to create line items', 'error')
    }
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('quotations').update({ status }).eq('id', id)
    if (!error) {
      addToast(`Status updated to ${status}`)
      fetchQuotes()
      if (showDetails?.id === id) viewDetails(id)
    }
  }

  const deleteQuote = async (id) => {
    if (!confirm('Delete this quotation?')) return
    const { error } = await supabase.from('quotations').delete().eq('id', id)
    if (!error) {
      addToast('Quotation deleted')
      fetchQuotes()
    }
  }

  const viewDetails = async (id) => {
    // Fetch quote, client, and specific contact
    const { data: quote } = await supabase.from('quotations').select('*, clients(name, address), contacts(first_name, last_name, email, phone)').eq('id', id).single()
    
    // Fallback for legacy quotes that don't have a contact_id
    let primaryContact = {}
    if (quote.contacts) {
      primaryContact = quote.contacts
    } else {
      const { data: contacts } = await supabase.from('contacts').select('*').eq('client_id', quote.client_id).order('is_primary', { ascending: false }).limit(1)
      primaryContact = contacts?.[0] || {}
    }

    // Fetch lines
    const { data: lines } = await supabase.from('quote_line_items').select('*, products(name, item_code, item_type)').eq('quote_id', id)
    
    if (quote) {
      const mappedQuote = {
        ...quote,
        client_name: quote.clients?.name,
        contact_person: primaryContact.first_name ? `${primaryContact.first_name} ${primaryContact.last_name}` : '',
        email: primaryContact.email,
        address: quote.clients?.address,
        lineItems: lines?.map(li => ({
          ...li,
          product_name: li.products?.name,
          item_code: li.products?.item_code,
          item_type: li.products?.item_type
        })) || []
      }
      setShowDetails(mappedQuote)
    }
  }

  const downloadPDF = async (quote) => {
    // Fetch full line items if not already loaded
    let data = quote
    if (!quote.lineItems) {
      const { data: q } = await supabase.from('quotations').select('*, clients(name, address), contacts(first_name, last_name, email, phone)').eq('id', quote.id).single()
      let primaryContact = q.contacts || {}
      if (!q.contacts) {
        const { data: ctcs } = await supabase.from('contacts').select('*').eq('client_id', q.client_id).order('is_primary', { ascending: false }).limit(1)
        primaryContact = ctcs?.[0] || {}
      }
      const { data: lines } = await supabase.from('quote_line_items').select('*, products(name, item_code, item_type)').eq('quote_id', quote.id)
      data = {
        ...q,
        client_name: q.clients?.name,
        contact_person: primaryContact.first_name ? `${primaryContact.first_name} ${primaryContact.last_name}` : '',
        email: primaryContact.email,
        address: q.clients?.address,
        lineItems: lines?.map(li => ({ ...li, product_name: li.products?.name, item_code: li.products?.item_code, item_type: li.products?.item_type })) || []
      }
    }
    try {
      await generateQuotePDF(data)
      addToast('PDF downloaded!')
    } catch (err) {
      console.error('PDF error:', err)
      addToast('Failed to generate PDF', 'error')
    }
  }

  const getStatusClass = (status) => {
    return { Draft: 'badge-draft', Sent: 'badge-info', Accepted: 'badge-success', Rejected: 'badge-danger' }[status] || 'badge-draft'
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Quotations</h1>
            <p>Create and manage client quotations</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowBuilder(true)}>
            <Plus size={16} /> New Quotation
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="table-search">
          <Search size={16} />
          <input placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters-row">
          {STATUS_OPTIONS.map(s => (
            <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Quotes Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Contact</th>
              <th>Organization</th>
              <th>Status</th>
              <th>Subtotal</th>
              <th>Discount</th>
              <th>Total</th>
              <th>Validity</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>No quotations found</td></tr>
            ) : quotes.map(q => (
              <tr key={q.id}>
                <td style={{ color: 'var(--primary-700)', fontWeight: 700 }}>{q.quote_number}</td>
                <td style={{ fontWeight: 500 }}>{q.contact_name || '—'}</td>
                <td style={{ color: 'var(--text-primary)' }}>{q.client_name || '—'}</td>
                <td><span className={`badge ${getStatusClass(q.status)}`}>{q.status}</span></td>
                <td>EGP {q.subtotal?.toLocaleString()}</td>
                <td>{q.discount_percent > 0 ? `${q.discount_percent}%` : '—'}</td>
                <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>EGP {q.total?.toLocaleString()}</td>
                <td>{q.validity_days} days</td>
                <td>{new Date(q.created_at || q.date_created).toLocaleDateString()}</td>
                <td>
                  <div className="actions-cell">
                    <button onClick={() => viewDetails(q.id)} title="View"><Eye size={15} /></button>
                    <button onClick={() => downloadPDF(q)} title="Download PDF"><Download size={15} /></button>
                    {q.status === 'Draft' && (
                      <button onClick={() => updateStatus(q.id, 'Sent')} title="Mark as Sent"><Send size={15} /></button>
                    )}
                    {q.status === 'Sent' && (
                      <>
                        <button onClick={() => updateStatus(q.id, 'Accepted')} title="Accept" style={{ color: 'var(--status-success)' }}><CheckCircle size={15} /></button>
                        <button onClick={() => updateStatus(q.id, 'Rejected')} title="Reject" style={{ color: 'var(--status-danger)' }}><XCircle size={15} /></button>
                      </>
                    )}
                    <button className="delete" onClick={() => deleteQuote(q.id)} title="Delete"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quote Builder Modal */}
      <Modal isOpen={showBuilder} onClose={() => setShowBuilder(false)} title="Build New Quotation" wide>
        <div className="modal-body">
          <div className="quote-builder">
            {/* Client & Settings */}
            <div className="form-row" style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1.5 }}>
                <label>Contact Person *</label>
                <select className="form-input" value={builderForm.contact_id} onChange={e => setBuilderForm({ ...builderForm, contact_id: e.target.value })}>
                  <option value="">Select contact...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.clients?.name})</option>)}
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  The quotation will automatically be mapped to their Organization.
                </div>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Validity (days)</label>
                <select className="form-input" value={builderForm.validity_days} onChange={e => setBuilderForm({ ...builderForm, validity_days: parseInt(e.target.value) })}>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Total Discount (%)</label>
                <input className="form-input" type="number" min="0" max="100" value={builderForm.discount_percent} onChange={e => setBuilderForm({ ...builderForm, discount_percent: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Product Search */}
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginTop: 'var(--space-md)' }}>Add Quotation Lines</label>
              <div className="product-search-dropdown" ref={dropdownRef}>
                <input
                  className="form-input"
                  placeholder="Search by product name or code..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true) }}
                  onFocus={() => setShowProductDropdown(true)}
                />
                {showProductDropdown && productSearch && (
                  <div className="product-search-results">
                    {filteredProducts.length === 0 ? (
                      <div style={{ padding: 12, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No products found</div>
                    ) : filteredProducts.slice(0, 8).map(p => (
                      <div key={p.id} className="product-search-item" onClick={() => addLineItem(p)}>
                        <div>
                          <span className="item-name">{p.name}</span>
                          <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.item_code}</span>
                        </div>
                        <span className="item-price">EGP {p.base_price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            {lineItems.length > 0 && (
              <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table className="line-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Product</th>
                      <th style={{ width: 70 }}>Qty</th>
                      <th style={{ width: 110 }}>Unit Price</th>
                      <th style={{ width: 80 }}>Disc. %</th>
                      <th style={{ width: 110 }}>Total</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                        <td>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem' }}>{li.product_name}</div>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{li.item_code}</div>
                        </td>
                        <td>
                          <input type="number" min="1" value={li.quantity}
                            onChange={e => updateLineItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                        </td>
                        <td>
                          <input type="number" min="0" step="0.01" value={li.quoted_price}
                            onChange={e => updateLineItem(i, 'quoted_price', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td>
                          <input type="number" min="0" max="100" value={li.discount_percent}
                            onChange={e => updateLineItem(i, 'discount_percent', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--primary-700)', textAlign: 'right', paddingRight: 14 }}>
                          EGP {getLineTotal(li).toLocaleString()}
                        </td>
                        <td>
                          <button className="btn-ghost btn-icon" onClick={() => removeLineItem(i)} style={{ color: 'var(--status-danger)' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="quote-summary">
                  <div className="summary-row">
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                    <span>EGP {subtotal.toLocaleString()}</span>
                  </div>
                  {builderForm.discount_percent > 0 && (
                    <div className="summary-row">
                      <span style={{ color: 'var(--status-danger)' }}>Discount ({builderForm.discount_percent}%)</span>
                      <span style={{ color: 'var(--status-danger)' }}>-EGP {discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>EGP {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Terms */}
            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
              <label>Terms & Conditions</label>
              <textarea className="form-input" rows="3" value={builderForm.terms_conditions}
                onChange={e => setBuilderForm({ ...builderForm, terms_conditions: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Notes (Internal)</label>
              <textarea className="form-input" rows="2" placeholder="Internal notes..." value={builderForm.notes}
                onChange={e => setBuilderForm({ ...builderForm, notes: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowBuilder(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateQuote} disabled={lineItems.length === 0 || !builderForm.contact_id}>
            <FileText size={16} /> Create Quotation
          </button>
        </div>
      </Modal>

      {/* Quote Details Modal */}
      <QuoteDetailsModal 
        showDetails={showDetails} 
        onClose={() => setShowDetails(null)} 
        onUpdateStatus={updateStatus} 
      />
    </div>
  )
}
