import { useState, useEffect } from 'react'
import { Package, Plus, Search, Edit2, Trash2, ExternalLink, Filter } from 'lucide-react'
import Modal from '../components/Modal'

const CATEGORIES = ['All', 'Capital Equipment', 'Reagents', 'Consumables', 'Software']
const TYPES = ['All', 'Equipment', 'Kit']

export default function Catalog({ addToast }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [itemType, setItemType] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    item_code: '', name: '', category: 'Consumables', item_type: 'Kit',
    description: '', base_price: '', datasheet_url: '', storage_conditions: ''
  })

  const fetchProducts = () => {
    const params = new URLSearchParams()
    if (category !== 'All') params.set('category', category)
    if (itemType !== 'All') params.set('item_type', itemType)
    if (search) params.set('search', search)
    fetch(`/api/products?${params}`)
      .then(r => r.json())
      .then(setProducts)
  }

  useEffect(() => { fetchProducts() }, [category, itemType, search])

  const openAdd = () => {
    setEditing(null)
    setForm({ item_code: '', name: '', category: 'Consumables', item_type: 'Kit', description: '', base_price: '', datasheet_url: '', storage_conditions: '' })
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      item_code: p.item_code, name: p.name, category: p.category, item_type: p.item_type,
      description: p.description || '', base_price: p.base_price, datasheet_url: p.datasheet_url || '', storage_conditions: p.storage_conditions || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    const body = { ...form, base_price: parseFloat(form.base_price) || 0 }
    const url = editing ? `/api/products/${editing.id}` : '/api/products'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      addToast(editing ? 'Product updated successfully' : 'Product added successfully')
      setShowModal(false)
      fetchProducts()
    } else {
      addToast('Failed to save product', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product? This will also remove its inventory records.')) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      addToast('Product deleted')
      fetchProducts()
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Product Catalog</h1>
            <p>Manage your medical equipment and consumables catalog</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="table-search">
          <Search size={16} />
          <input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filters-row">
          {CATEGORIES.map(c => (
            <button key={c} className={`filter-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <div className="filters-row">
          {TYPES.map(t => (
            <button key={t} className={`filter-chip ${itemType === t ? 'active' : ''}`} onClick={() => setItemType(t)}>
              {t === 'All' ? 'All Types' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Price</th>
              <th>Storage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>No products found</td></tr>
            ) : products.map(p => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', fontWeight: 600, fontSize: '0.82rem' }}>{p.item_code}</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</td>
                <td>{p.category}</td>
                <td>
                  <span className={`badge ${p.item_type === 'Equipment' ? 'badge-equipment' : 'badge-kit'}`}>
                    {p.item_type}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>${p.base_price.toLocaleString()}</td>
                <td>{p.storage_conditions || '—'}</td>
                <td>
                  <div className="actions-cell">
                    <button onClick={() => openEdit(p)} title="Edit"><Edit2 size={15} /></button>
                    <button className="delete" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 size={15} /></button>
                    {p.datasheet_url && (
                      <a href={p.datasheet_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'Add Product'}>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Item Code *</label>
              <input className="form-input" placeholder="e.g. NGS-ILL-001" value={form.item_code} onChange={e => setForm({ ...form, item_code: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Base Price ($) *</label>
              <input className="form-input" type="number" placeholder="0.00" value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Product Name *</label>
            <input className="form-input" placeholder="Full product name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Item Type</label>
              <select className="form-input" value={form.item_type} onChange={e => setForm({ ...form, item_type: e.target.value })}>
                <option value="Equipment">Equipment</option>
                <option value="Kit">Kit</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-input" placeholder="Short description for quotation line items" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {form.item_type === 'Kit' && (
            <div className="form-group">
              <label>Storage Conditions</label>
              <select className="form-input" value={form.storage_conditions} onChange={e => setForm({ ...form, storage_conditions: e.target.value })}>
                <option value="">Not specified</option>
                <option value="Room Temperature">Room Temperature</option>
                <option value="2-8°C">2-8°C</option>
                <option value="-20°C">-20°C</option>
                <option value="-80°C">-80°C</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Datasheet URL</label>
            <input className="form-input" placeholder="https://..." value={form.datasheet_url} onChange={e => setForm({ ...form, datasheet_url: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {editing ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
