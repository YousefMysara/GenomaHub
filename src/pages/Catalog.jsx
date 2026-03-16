/**
 * Product Catalog Page
 * 
 * Manages the master list of all medical and laboratory equipment and consumables.
 * Features:
 * - Table view of all products with Category, Type, and Brand filters
 * - Search by product name or item code
 * - Add/Edit modal for creating or modifying product details
 * - Built-in minimum stock (reorder level) setup
 * - Accessories linking for Equipment (filtered by Brand)
 */
import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const TAXONOMY = {
  'Capital Equipment': ['Instrument', 'Spare Parts'],
  'Reagents': ['Kit', 'Chemical', 'Control'],
  'Consumables': ['Labware', 'General'],
  'Software': ['License'],
  'Services': ['Maintenance', 'Training']
}

const CATEGORIES = ['All', ...Object.keys(TAXONOMY)]
const ALL_TYPES = ['All', ...Object.values(TAXONOMY).flat()]

export default function Catalog({ addToast }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [availableAccessories, setAvailableAccessories] = useState([])

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [itemType, setItemType] = useState('All')
  const [brandFilter, setBrandFilter] = useState('All')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const [form, setForm] = useState({
    item_code: '', name: '', category: 'Consumables', item_type: 'Labware',
    description: '', base_price: '', datasheet_url: '', storage_conditions: '',
    brand_id: '', track_stock: true, reorder_level: 5, accessories: [],
    uom: '', purity_grade: '', hazmat_class: '', power_requirements: '',
    dimensions: '', weight: '', warranty_period: '', packaging_size: '',
    sterility: false, license_type: '', delivery_method: ''
  })

  // Auto-open modal if navigating from Details Page
  useEffect(() => {
    if (editId && products.length > 0) {
      const targetProduct = products.find(p => p.id === editId)
      if (targetProduct && !showModal) {
        openEdit(targetProduct)
        searchParams.delete('edit')
        setSearchParams(searchParams)
      }
    }
  }, [editId, products, searchParams, setSearchParams, showModal])

  const fetchBrandsAndAccessories = async () => {
    const { data: bData } = await supabase.from('brands').select('*').order('name')
    if (bData) setBrands(bData)

    const { data: aData } = await supabase.from('products').select('id, name, item_code, brand_id').neq('item_type', 'Instrument').order('name')
    if (aData) setAvailableAccessories(aData)
  }

  const fetchProducts = async () => {
    let query = supabase.from('products').select('*, brand:brands(name)')

    if (category !== 'All') query = query.eq('category', category)
    if (itemType !== 'All') query = query.eq('item_type', itemType)
    if (brandFilter !== 'All') query = query.eq('brand_id', brandFilter)
    if (search) query = query.or(`name.ilike.%${search}%,item_code.ilike.%${search}%`)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) console.error(error)
    else setProducts(data || [])
  }

  useEffect(() => {
    fetchBrandsAndAccessories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [category, itemType, brandFilter, search])

  const openAdd = () => {
    setEditing(null)
    setForm({
      item_code: '', name: '', category: 'Consumables', item_type: 'Labware',
      description: '', base_price: '', datasheet_url: '', storage_conditions: '',
      brand_id: '', track_stock: true, reorder_level: 5, accessories: [],
      uom: '', purity_grade: '', hazmat_class: '', power_requirements: '',
      dimensions: '', weight: '', warranty_period: '', packaging_size: '',
      sterility: false, license_type: '', delivery_method: ''
    })
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    // We show modal immediately, then fetch additional details
    setForm({
      item_code: p.item_code, name: p.name, category: p.category, item_type: p.item_type,
      description: p.description || '', base_price: p.base_price, datasheet_url: p.datasheet_url || '',
      storage_conditions: p.storage_conditions || '',
      brand_id: p.brand_id || '', track_stock: p.track_stock,
      reorder_level: 5, accessories: [],
      uom: p.uom || '', purity_grade: p.purity_grade || '', hazmat_class: p.hazmat_class || '',
      power_requirements: p.power_requirements || '', dimensions: p.dimensions || '',
      weight: p.weight || '', warranty_period: p.warranty_period || '',
      packaging_size: p.packaging_size || '', sterility: p.sterility || false,
      license_type: p.license_type || '', delivery_method: p.delivery_method || ''
    })
    setShowModal(true)

    const fetchDetails = async () => {
      let reorder_level = p.reorder_level || 5

      let accessories = []
      if (p.item_type === 'Instrument') {
        const { data: rels } = await supabase.from('product_relations').select('child_product_id').eq('parent_product_id', p.id)
        if (rels) accessories = rels.map(r => r.child_product_id)
      }

      setForm(prev => ({ ...prev, reorder_level, accessories }))
    }
    fetchDetails()
  }

  const handleSubmit = async () => {
    if (!form.item_code.trim() || !form.name.trim() || form.base_price === '') {
      addToast('Please fill in required fields (Code, Name, Price)', 'error')
      return
    }

    const productBody = {
      item_code: form.item_code, name: form.name, category: form.category, item_type: form.item_type,
      description: form.description, base_price: parseFloat(form.base_price) || 0,
      datasheet_url: form.datasheet_url, storage_conditions: form.storage_conditions,
      brand_id: form.brand_id || null, track_stock: form.track_stock,
      uom: form.uom || null, purity_grade: form.purity_grade || null,
      hazmat_class: form.hazmat_class || null, power_requirements: form.power_requirements || null,
      dimensions: form.dimensions || null, weight: form.weight || null,
      warranty_period: form.warranty_period || null, packaging_size: form.packaging_size || null,
      sterility: form.sterility, license_type: form.license_type || null,
      delivery_method: form.delivery_method || null, reorder_level: parseInt(form.reorder_level) || 5
    }

    let res
    let productId

    if (editing) {
      res = await supabase.from('products').update(productBody).eq('id', editing.id).select().single()
      productId = editing.id
    } else {
      res = await supabase.from('products').insert([productBody]).select().single()
      productId = res.data?.id
    }

    if (res.error) {
      addToast('Failed to save product: ' + res.error.message, 'error')
      return
    }

    // Handle inventory logic for reorder level
    if (form.track_stock && productId) {
      const { data: existingInv } = await supabase.from('inventory').select('id').eq('product_id', productId).maybeSingle()
      if (existingInv) {
        await supabase.from('inventory').update({ reorder_level: parseInt(form.reorder_level) || 0 }).eq('id', existingInv.id)
      } else {
        await supabase.from('inventory').insert([{ product_id: productId, quantity: 0, reorder_level: parseInt(form.reorder_level) || 5 }])
      }
    }

    // Handle accessories (only for Instrument)
    if (form.item_type === 'Instrument' && productId) {
      await supabase.from('product_relations').delete().eq('parent_product_id', productId)
      if (form.accessories.length > 0) {
        const relations = form.accessories.map(accId => ({
          parent_product_id: productId,
          child_product_id: accId,
          relation_type: 'Accessory'
        }))
        await supabase.from('product_relations').insert(relations)
      }
    }

    addToast(editing ? 'Product updated successfully' : 'Product added successfully')
    setShowModal(false)
    fetchProducts()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product? Related inventory will be cascaded.')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) {
      addToast('Product deleted')
      fetchProducts()
    } else {
      console.error(error)
      const msg = error.message?.includes('foreign key')
        ? 'Cannot delete: Product is in use by existing quotations.'
        : 'Failed to delete product'
      addToast(msg, 'error')
    }
  }

  const toggleAccessory = (accId) => {
    if (form.accessories.includes(accId)) {
      setForm({ ...form, accessories: form.accessories.filter(id => id !== accId) })
    } else {
      setForm({ ...form, accessories: [...form.accessories, accId] })
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

        <select
          style={{ padding: '8px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}
          value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
        >
          <option value="All">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <div className="filters-row">
          {CATEGORIES.map(c => (
            <button key={c} className={`filter-chip ${category === c ? 'active' : ''}`} onClick={() => {
              setCategory(c)
              setItemType('All')
            }}>{c}</button>
          ))}
        </div>
        <div className="filters-row">
          {(category === 'All' ? ALL_TYPES : ['All', ...TAXONOMY[category]]).map(t => (
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
              <th>Brand</th>
              <th>Category</th>
              <th>Type</th>
              <th>Price</th>
              <th>Stock Tracking</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>No products found</td></tr>
            ) : products.map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={(e) => {
                if (e.target.closest('.actions-cell') || e.target.closest('button')) return;
                navigate(`/catalog/${p.id}`)
              }} className="row-hover">
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', fontWeight: 600, fontSize: '0.82rem' }}>{p.item_code}</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</td>
                <td>{p.brand?.name || '—'}</td>
                <td>{p.category}</td>
                <td>
                  <span className={`badge ${p.item_type === 'Instrument' ? 'badge-equipment' : p.category === 'Software' || p.category === 'Services' ? 'badge-info' : 'badge-kit'}`}>
                    {p.item_type}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>${p.base_price.toLocaleString()}</td>
                <td>
                  {p.track_stock ? (
                    <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> Yes</span>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={14} /> No</span>
                  )}
                </td>
                <td>
                  <div className="actions-cell">
                    <button onClick={() => openEdit(p)} title="Edit"><Edit2 size={15} /></button>
                    <button className="delete" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 size={15} /></button>
                    <button onClick={() => navigate(`/catalog/${p.id}`)} title="View Details" style={{ color: 'var(--primary-600)' }}><ExternalLink size={15} /></button>
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
              <label>Brand / Vendor</label>
              <select className="form-input" value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}>
                <option value="">No Brand Selected</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value, item_type: TAXONOMY[e.target.value][0] })}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Item Type</label>
              <select className="form-input" value={form.item_type} onChange={e => setForm({ ...form, item_type: e.target.value })}>
                {TAXONOMY[form.category]?.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Track Stock for Alerts?</label>
              <select className="form-input" value={form.track_stock ? 'yes' : 'no'} onChange={e => setForm({ ...form, track_stock: e.target.value === 'yes' })}>
                <option value="yes">Yes (Track Inventory)</option>
                <option value="no">No (e.g. Services, Software)</option>
              </select>
            </div>
          </div>

          {form.track_stock && (
            <div className="form-group">
              <label>Minimum Stock Alert (Reorder Level)</label>
              <input className="form-input" type="number" min="0" placeholder="e.g. 5" value={form.reorder_level} onChange={e => setForm({ ...form, reorder_level: e.target.value })} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Alert triggered if stock drops below this number.</div>
            </div>
          )}

          {/* DYNAMIC ATTRIBUTES */}
          {['Chemical', 'Control', 'Kit'].includes(form.item_type) && (
            <div className="form-row">
              <div className="form-group">
                <label>Unit of Measure (UOM)</label>
                <select className="form-input" value={form.uom} onChange={e => setForm({ ...form, uom: e.target.value })}>
                  <option value="">Select UOM...</option>
                  {['mL', 'L', 'mg', 'g', 'kg', 'rxns', 'tests'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {form.item_type === 'Chemical' && (
                <div className="form-group">
                  <label>Purity Grade</label>
                  <select className="form-input" value={form.purity_grade} onChange={e => setForm({ ...form, purity_grade: e.target.value })}>
                    <option value="">Select Grade...</option>
                    {['ACS', 'HPLC', 'Molecular Biology', 'Technical', 'USP/EP'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {form.item_type === 'Chemical' && (
            <div className="form-group">
              <label>Hazmat Class</label>
              <select className="form-input" value={form.hazmat_class} onChange={e => setForm({ ...form, hazmat_class: e.target.value })}>
                <option value="">Non-Hazardous</option>
                {['Flammable', 'Corrosive', 'Toxic', 'Biohazard', 'Oxidizer'].map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}

          {form.item_type === 'Instrument' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Power Requirements</label>
                  <input className="form-input" placeholder="e.g. 110V/220V, 50/60Hz" value={form.power_requirements} onChange={e => setForm({ ...form, power_requirements: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Warranty Period</label>
                  <select className="form-input" value={form.warranty_period} onChange={e => setForm({ ...form, warranty_period: e.target.value })}>
                    <option value="">No Warranty</option>
                    {['1 Year', '2 Years', '3 Years', '5 Years', 'Lifetime'].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Dimensions (W x D x H)</label>
                  <input className="form-input" placeholder="e.g. 50 x 40 x 30 cm" value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Weight</label>
                  <input className="form-input" placeholder="e.g. 45 kg" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {['Labware', 'General'].includes(form.item_type) && (
            <div className="form-row">
              <div className="form-group">
                <label>Packaging Size</label>
                <input className="form-input" placeholder='e.g. "Pack of 500"' value={form.packaging_size} onChange={e => setForm({ ...form, packaging_size: e.target.value })} />
              </div>
              {form.item_type === 'Labware' && (
                <div className="form-group">
                  <label>Sterility</label>
                  <select className="form-input" value={form.sterility ? 'yes' : 'no'} onChange={e => setForm({ ...form, sterility: e.target.value === 'yes' })}>
                    <option value="no">Non-Sterile</option>
                    <option value="yes">Sterile</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {form.item_type === 'License' && (
            <div className="form-group">
              <label>License Type</label>
              <select className="form-input" value={form.license_type} onChange={e => setForm({ ...form, license_type: e.target.value })}>
                <option value="">Select Type...</option>
                {['Perpetual', 'Annual Subscription', 'Monthly Subscription', 'User-Seat'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          )}

          {['License', 'Maintenance', 'Training'].includes(form.item_type) && (
            <div className="form-group">
              <label>Delivery Method</label>
              <select className="form-input" value={form.delivery_method} onChange={e => setForm({ ...form, delivery_method: e.target.value })}>
                <option value="">Select Method...</option>
                {['Electronic Delivery', 'On-Site', 'Remote', 'Shipped Media'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {form.item_type === 'Instrument' && (
            <div className="form-group">
              <label>Compatible Accessories / Parts</label>
              <div style={{ maxHeight: 150, overflowY: 'auto', border: form.brand_id ? '1px solid var(--border-primary)' : '1px dashed var(--border-disabled)', borderRadius: 'var(--radius-md)', padding: 8 }}>
                {!form.brand_id ? (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>Please select a Brand to filter compatible accessories.</div>
                ) : (
                  availableAccessories
                    .filter(acc => acc.brand_id === form.brand_id)
                    .map(acc => (
                      <label key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={form.accessories.includes(acc.id)}
                          onChange={() => toggleAccessory(acc.id)}
                        />
                        <span style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>{acc.item_code}</span>
                        <span>{acc.name}</span>
                      </label>
                    ))
                )}
                {form.brand_id && availableAccessories.filter(acc => acc.brand_id === form.brand_id).length === 0 && (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>No accessories found for this brand.</div>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea className="form-input" placeholder="Short description for quotation line items" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {(form.item_type === 'Kit' || form.category === 'Reagents') && (
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
