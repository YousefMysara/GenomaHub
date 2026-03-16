/**
 * Product Details Page — v3 (Redesigned Layout)
 *
 * Layout:
 *  ┌─────────────────────────────────────────────────────┐
 *  │ HEADER: Name, code, badge, price, brand (compact)   │
 *  ├──────────────────────┬──────────────────────────────┤
 *  │ LEFT (3/5):          │ RIGHT (2/5):                 │
 *  │  • Desc + specs      │  • Inventory Status          │
 *  │  • Accessories       │  • Available batches list    │
 *  ├──────────────────────┴──────────────────────────────┤
 *  │ FULL-WIDTH: Stock Ledger table (searchable,          │
 *  │             filterable, handles 1000+ rows)          │
 *  └─────────────────────────────────────────────────────┘
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Package, Link as LinkIcon, AlertTriangle, CheckCircle,
  Info, ExternalLink, Edit2, Clock, History, Search, Filter
} from 'lucide-react'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const TAXONOMY = {
  'Capital Equipment': ['Instrument', 'Spare Parts'],
  'Reagents': ['Kit', 'Chemical', 'Control'],
  'Consumables': ['Labware', 'General'],
  'Software': ['License'],
  'Services': ['Maintenance', 'Training']
}
const CATEGORIES = Object.keys(TAXONOMY)

const STATUS_STYLE = {
  Available:   { badge: 'badge-success',  border: 'var(--status-success)' },
  'In Use':    { badge: 'badge-info',     border: 'var(--primary-500)' },
  Sold:        { badge: 'badge-warning',  border: 'var(--status-warning)' },
  Quarantined: { badge: 'badge-danger',   border: 'var(--status-danger)' },
  Expired:     { badge: 'badge-danger',   border: 'var(--status-danger)' },
  Removed:     { badge: 'badge-warning',  border: 'var(--text-tertiary)' },
}

export default function ProductDetails({ addToast }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct]     = useState(null)
  const [inventory, setInventory] = useState([])     // Available only
  const [allBatches, setAllBatches] = useState([])
  const [accessories, setAccessories] = useState([])
  const [loading, setLoading] = useState(true)

  const [brandLogoError, setBrandLogoError]     = useState(false)
  const [productLogoError, setProductLogoError] = useState(false)

  // Ledger search/filter
  const [ledgerSearch, setLedgerSearch]   = useState('')
  const [ledgerStatus, setLedgerStatus]   = useState('All')

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [brands, setBrands]               = useState([])
  const [availableAccessories, setAvailableAccessories] = useState([])
  const [editForm, setEditForm]           = useState({})

  // ──────────────────────────────────────────────────
  const fetchDetails = async () => {
    setLoading(true)

    const { data: pData } = await supabase
      .from('products').select('*, brand:brands(*)').eq('id', id).single()
    if (pData) setProduct(pData)

    const { data: iData } = await supabase
      .from('inventory').select('*').eq('product_id', id)
      .order('updated_at', { ascending: false })

    if (iData) {
      setAllBatches(iData)
      setInventory(iData.filter(b => b.status === 'Available'))
    }

    if (pData?.item_type === 'Instrument') {
      const { data: rels } = await supabase
        .from('product_relations')
        .select('child_product_id, products!child_product_id(id, name, item_code, base_price)')
        .eq('parent_product_id', id)
      if (rels) setAccessories(rels.map(r => r.products))
    }

    setLoading(false)
  }

  const fetchEditData = async () => {
    const { data: bData } = await supabase.from('brands').select('*').order('name')
    if (bData) setBrands(bData)
    const { data: aData } = await supabase.from('products').select('id, name, item_code, brand_id').neq('item_type', 'Instrument').order('name')
    if (aData) setAvailableAccessories(aData)
  }

  useEffect(() => { fetchDetails() }, [id])

  const openEdit = async () => {
    await fetchEditData()
    let accs = []
    if (product.item_type === 'Instrument') {
      const { data: rels } = await supabase.from('product_relations').select('child_product_id').eq('parent_product_id', id)
      if (rels) accs = rels.map(r => r.child_product_id)
    }
    setEditForm({
      item_code: product.item_code, name: product.name,
      category: product.category, item_type: product.item_type,
      description: product.description || '', base_price: product.base_price,
      datasheet_url: product.datasheet_url || '', storage_conditions: product.storage_conditions || '',
      brand_id: product.brand_id || '', track_stock: product.track_stock,
      reorder_level: product.reorder_level || 5, accessories: accs,
      uom: product.uom || '', purity_grade: product.purity_grade || '',
      hazmat_class: product.hazmat_class || '', power_requirements: product.power_requirements || '',
      dimensions: product.dimensions || '', weight: product.weight || '',
      warranty_period: product.warranty_period || '', packaging_size: product.packaging_size || '',
      sterility: product.sterility || false, license_type: product.license_type || '',
      delivery_method: product.delivery_method || ''
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async () => {
    if (!editForm.item_code?.trim() || !editForm.name?.trim() || editForm.base_price === '') {
      return addToast('Please fill in required fields (Code, Name, Price)', 'error')
    }
    const body = {
      item_code: editForm.item_code, name: editForm.name, category: editForm.category, item_type: editForm.item_type,
      description: editForm.description, base_price: parseFloat(editForm.base_price) || 0,
      datasheet_url: editForm.datasheet_url, storage_conditions: editForm.storage_conditions,
      brand_id: editForm.brand_id || null, track_stock: editForm.track_stock,
      uom: editForm.uom || null, purity_grade: editForm.purity_grade || null,
      hazmat_class: editForm.hazmat_class || null, power_requirements: editForm.power_requirements || null,
      dimensions: editForm.dimensions || null, weight: editForm.weight || null,
      warranty_period: editForm.warranty_period || null, packaging_size: editForm.packaging_size || null,
      sterility: editForm.sterility, license_type: editForm.license_type || null,
      delivery_method: editForm.delivery_method || null,
      reorder_level: parseInt(editForm.reorder_level) || 5,
      updated_at: new Date().toISOString()
    }
    const { error } = await supabase.from('products').update(body).eq('id', id)
    if (error) return addToast('Failed to update: ' + error.message, 'error')
    if (editForm.item_type === 'Instrument') {
      await supabase.from('product_relations').delete().eq('parent_product_id', id)
      if (editForm.accessories.length > 0) {
        await supabase.from('product_relations').insert(
          editForm.accessories.map(accId => ({ parent_product_id: id, child_product_id: accId, relation_type: 'Accessory' }))
        )
      }
    }
    addToast('Product updated')
    setShowEditModal(false)
    fetchDetails()
  }

  const toggleAccessory = (accId) => {
    const acc = editForm.accessories || []
    setEditForm({ ...editForm, accessories: acc.includes(accId) ? acc.filter(a => a !== accId) : [...acc, accId] })
  }

  // ──────────────────────────────────────────────────
  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div>
  if (!product) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Product not found.</div>

  const brandName     = product.brand?.name || ''
  const brandLogoUrl  = brandName ? `/logos/brands/${brandName.toLowerCase().replace(/\s+/g, '')}.png` : null
  const productImgUrl = `/logos/products/${product.item_code.toLowerCase()}.png`

  const totalOnHand  = inventory.reduce((s, b) => s + (b.quantity || 0), 0)
  const totalSold    = allBatches.filter(b => b.status === 'Sold').reduce((s, b) => s + (b.quantity || 0), 0)
  const totalReceived = allBatches.reduce((s, b) => s + (b.quantity || 0), 0)
  const isLow = totalOnHand <= (product.reorder_level || 0) && totalOnHand > 0
  const isOut = totalOnHand === 0

  // Ledger filtered rows
  const LEDGER_STATUSES = ['All', 'Available', 'In Use', 'Sold', 'Quarantined', 'Expired', 'Removed']
  const filteredBatches = allBatches.filter(b => {
    const matchStatus = ledgerStatus === 'All' || b.status === ledgerStatus
    const matchSearch = !ledgerSearch || [b.lot_number, b.serial_number, b.location, b.notes].some(
      v => v?.toLowerCase().includes(ledgerSearch.toLowerCase())
    )
    return matchStatus && matchSearch
  })

  // Spec grid
  const specs = [
    ['UOM', product.uom], ['Purity Grade', product.purity_grade], ['Hazmat Class', product.hazmat_class],
    ['Power', product.power_requirements], ['Dimensions', product.dimensions], ['Weight', product.weight],
    ['Warranty', product.warranty_period], ['Packaging', product.packaging_size],
    ['License Type', product.license_type], ['Delivery', product.delivery_method],
    product.item_type === 'Labware' ? ['Sterility', product.sterility ? 'Sterile' : 'Non-Sterile'] : null,
    product.storage_conditions ? ['Storage', product.storage_conditions] : null,
  ].filter(Boolean).filter(([, v]) => v)

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 'var(--space-2xl)' }}>

      {/* ─── HEADER BAR ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn-icon" onClick={() => navigate('/catalog')} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 8 }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 2 }}>
              <span className={`badge ${product.item_type === 'Instrument' ? 'badge-equipment' : product.item_type === 'License' ? 'badge-info' : 'badge-kit'}`} style={{ fontSize: '0.7rem' }}>{product.item_type}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{product.category}</span>
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 2 }}>{product.name}</h1>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{product.item_code}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {/* Price + brand compact */}
          <div style={{ textAlign: 'right', marginRight: 'var(--space-sm)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-700)' }}>${product.base_price?.toLocaleString()}</div>
            {brandName && <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{brandName}</div>}
          </div>
          <button className="btn btn-secondary" onClick={openEdit} style={{ whiteSpace: 'nowrap' }}>
            <Edit2 size={15} /> Edit Product
          </button>
        </div>
      </div>

      {/* ─── TWO-COLUMN MIDDLE ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>

        {/* LEFT: Description + Specs + Accessories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

          {/* Description */}
          <div className="card" style={{ padding: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-sm)' }}>
              <Info size={15} style={{ color: 'var(--text-tertiary)' }}/><span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Description</span>
              {product.datasheet_url && (
                <a href={product.datasheet_url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--primary-700)' }}>
                  Datasheet <ExternalLink size={12}/>
                </a>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontSize: '0.9rem' }}>{product.description || 'No description.'}</p>
          </div>

          {/* Specs */}
          {specs.length > 0 && (
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>Specifications</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 'var(--space-sm)' }}>
                {specs.map(([label, value]) => (
                  <div key={label} style={{ padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accessories */}
          {product.item_type === 'Instrument' && accessories.length > 0 && (
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>
                <LinkIcon size={15} style={{ color: 'var(--text-tertiary)' }}/> Compatible Accessories
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {accessories.map(acc => (
                  <div key={acc.id} className="row-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    onClick={() => navigate(`/catalog/${acc.id}`)}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{acc.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{acc.item_code}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--primary-700)', fontSize: '0.9rem' }}>${acc.base_price?.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Inventory live status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-md)' }}>Inventory Status</div>

            {!product.track_stock ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-md)' }}>Stock tracking disabled</div>
            ) : (
              <>
                {/* Big number */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-primary)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Available</div>
                    <div style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1, color: isOut ? 'var(--status-danger)' : isLow ? 'var(--status-warning)' : 'var(--text-primary)' }}>{totalOnHand}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isOut ? <span style={{ color: 'var(--status-danger)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={13}/> OUT</span>
                           : isLow ? <span style={{ color: 'var(--status-warning)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={13}/> LOW</span>
                           : <span style={{ color: 'var(--status-success)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={13}/> OK</span>}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Min: {product.reorder_level}</div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 'var(--space-md)' }}>
                  {[['Ever In', totalReceived], ['Available', totalOnHand], ['Sold', totalSold]].map(([lbl, val]) => (
                    <div key={lbl} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{val}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Available batch list */}
                {inventory.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>In Stock</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 180, overflowY: 'auto' }}>
                      {inventory.map(b => (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', borderLeft: '3px solid var(--status-success)' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>
                            {product.item_type === 'Instrument' ? `SN: ${b.serial_number || 'N/A'}` : `LOT: ${b.lot_number || 'N/A'}`}
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                            {b.location && <span>{b.location}</span>}
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>×{b.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {inventory.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 'var(--space-sm)' }}>No available stock</div>
                )}
              </>
            )}
          </div>

          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/inventory')}>
            Open Inventory Manager
          </button>
        </div>
      </div>

      {/* ─── FULL-WIDTH STOCK LEDGER TABLE ─── */}
      {allBatches.length > 0 && (
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          {/* Ledger header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <History size={16} style={{ color: 'var(--text-tertiary)' }}/>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Stock Ledger</span>
              <span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{allBatches.length} entries</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Status filter */}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {LEDGER_STATUSES.map(s => (
                  <button key={s} className={`filter-chip ${ledgerStatus === s ? 'active' : ''}`} style={{ fontSize: '0.72rem', padding: '2px 7px' }} onClick={() => setLedgerStatus(s)}>{s}</button>
                ))}
              </div>
              {/* Search */}
              <div className="table-search" style={{ minWidth: 180 }}>
                <Search size={14}/>
                <input placeholder="Search LOT, SN, location..." value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} style={{ fontSize: '0.85rem' }}/>
              </div>
            </div>
          </div>

          {/* Row count */}
          {(ledgerSearch || ledgerStatus !== 'All') && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
              Showing {filteredBatches.length} of {allBatches.length} entries
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-primary)' }}>
                <tr>
                  <th style={{ minWidth: 160 }}>{product.item_type === 'Instrument' ? 'Serial Number' : 'LOT / Batch'}</th>
                  <th>Status</th>
                  <th>Qty</th>
                  <th>Location</th>
                  <th>Expiry</th>
                  <th>Last Updated</th>
                  <th>Notes / Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>No entries match your filter.</td></tr>
                ) : filteredBatches.map(batch => {
                  const style = STATUS_STYLE[batch.status] || { badge: 'badge-warning', border: 'var(--border-secondary)' }
                  const isInactive = ['Sold', 'Removed', 'Expired'].includes(batch.status)
                  const expiryDate = batch.expiry_date ? new Date(batch.expiry_date) : null
                  const daysLeft = expiryDate ? Math.ceil((expiryDate - new Date()) / 86400000) : null
                  const isExpiring = daysLeft !== null && daysLeft <= 30
                  return (
                    <tr key={batch.id} style={{ opacity: isInactive ? 0.65 : 1, borderLeft: `3px solid ${style.border}` }}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, textDecoration: batch.status === 'Removed' ? 'line-through' : 'none', color: 'var(--text-accent)' }}>
                        {product.item_type === 'Instrument'
                          ? (batch.serial_number || '—')
                          : (batch.lot_number || '—')}
                      </td>
                      <td><span className={`badge ${style.badge}`} style={{ fontSize: '0.7rem' }}>{batch.status}</span></td>
                      <td style={{ fontWeight: 700, color: batch.status === 'Available' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{batch.quantity}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{batch.location || '—'}</td>
                      <td>
                        {batch.expiry_date
                          ? <span style={{ color: isExpiring ? 'var(--status-danger)' : 'var(--text-secondary)', fontWeight: isExpiring ? 600 : 400, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              {isExpiring && <Clock size={11}/>} {batch.expiry_date}
                              {daysLeft !== null && daysLeft > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: 4 }}>({daysLeft}d)</span>}
                            </span>
                          : '—'}
                      </td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                        {batch.updated_at ? new Date(batch.updated_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={batch.notes}>
                        {batch.notes || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Edit Product Modal ─── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product">
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Item Code *</label>
              <input className="form-input" value={editForm.item_code || ''} onChange={e => setEditForm({ ...editForm, item_code: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Base Price ($) *</label>
              <input className="form-input" type="number" value={editForm.base_price || ''} onChange={e => setEditForm({ ...editForm, base_price: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Product Name *</label>
            <input className="form-input" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Brand / Vendor</label>
              <select className="form-input" value={editForm.brand_id || ''} onChange={e => setEditForm({ ...editForm, brand_id: e.target.value })}>
                <option value="">No Brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="form-input" value={editForm.category || ''} onChange={e => setEditForm({ ...editForm, category: e.target.value, item_type: TAXONOMY[e.target.value][0] })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Item Type</label>
              <select className="form-input" value={editForm.item_type || ''} onChange={e => setEditForm({ ...editForm, item_type: e.target.value })}>
                {(TAXONOMY[editForm.category] || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Track Stock?</label>
              <select className="form-input" value={editForm.track_stock ? 'yes' : 'no'} onChange={e => setEditForm({ ...editForm, track_stock: e.target.value === 'yes' })}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </div>
          </div>
          {editForm.track_stock && (
            <div className="form-group">
              <label>Min. Stock / Reorder Level</label>
              <input className="form-input" type="number" min="0" value={editForm.reorder_level || 0} onChange={e => setEditForm({ ...editForm, reorder_level: e.target.value })} />
            </div>
          )}
          {['Chemical', 'Control', 'Kit'].includes(editForm.item_type) && (
            <div className="form-row">
              <div className="form-group">
                <label>UOM</label>
                <select className="form-input" value={editForm.uom || ''} onChange={e => setEditForm({ ...editForm, uom: e.target.value })}>
                  <option value="">Select...</option>
                  {['mL', 'L', 'mg', 'g', 'kg', 'rxns', 'tests'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {editForm.item_type === 'Chemical' && (
                <div className="form-group">
                  <label>Purity Grade</label>
                  <select className="form-input" value={editForm.purity_grade || ''} onChange={e => setEditForm({ ...editForm, purity_grade: e.target.value })}>
                    <option value="">Select...</option>
                    {['ACS', 'HPLC', 'Molecular Biology', 'Technical', 'USP/EP'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          {editForm.item_type === 'Chemical' && (
            <div className="form-group">
              <label>Hazmat Class</label>
              <select className="form-input" value={editForm.hazmat_class || ''} onChange={e => setEditForm({ ...editForm, hazmat_class: e.target.value })}>
                <option value="">Non-Hazardous</option>
                {['Flammable', 'Corrosive', 'Toxic', 'Biohazard', 'Oxidizer'].map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
          {editForm.item_type === 'Instrument' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Power Requirements</label>
                  <input className="form-input" value={editForm.power_requirements || ''} onChange={e => setEditForm({ ...editForm, power_requirements: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Warranty Period</label>
                  <select className="form-input" value={editForm.warranty_period || ''} onChange={e => setEditForm({ ...editForm, warranty_period: e.target.value })}>
                    <option value="">No Warranty</option>
                    {['1 Year', '2 Years', '3 Years', '5 Years', 'Lifetime'].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Dimensions</label>
                  <input className="form-input" value={editForm.dimensions || ''} onChange={e => setEditForm({ ...editForm, dimensions: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Weight</label>
                  <input className="form-input" value={editForm.weight || ''} onChange={e => setEditForm({ ...editForm, weight: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Compatible Accessories</label>
                <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 8 }}>
                  {availableAccessories.filter(a => a.brand_id === editForm.brand_id).length === 0
                    ? <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: 10 }}>{editForm.brand_id ? 'No accessories.' : 'Select a brand first.'}</div>
                    : availableAccessories.filter(a => a.brand_id === editForm.brand_id).map(acc => (
                        <label key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="checkbox" checked={(editForm.accessories || []).includes(acc.id)} onChange={() => toggleAccessory(acc.id)} />
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>{acc.item_code}</span>
                          <span>{acc.name}</span>
                        </label>
                      ))}
                </div>
              </div>
            </>
          )}
          {['Labware', 'General'].includes(editForm.item_type) && (
            <div className="form-row">
              <div className="form-group">
                <label>Packaging Size</label>
                <input className="form-input" value={editForm.packaging_size || ''} onChange={e => setEditForm({ ...editForm, packaging_size: e.target.value })} />
              </div>
              {editForm.item_type === 'Labware' && (
                <div className="form-group">
                  <label>Sterility</label>
                  <select className="form-input" value={editForm.sterility ? 'yes' : 'no'} onChange={e => setEditForm({ ...editForm, sterility: e.target.value === 'yes' })}>
                    <option value="no">Non-Sterile</option><option value="yes">Sterile</option>
                  </select>
                </div>
              )}
            </div>
          )}
          {editForm.item_type === 'License' && (
            <div className="form-group">
              <label>License Type</label>
              <select className="form-input" value={editForm.license_type || ''} onChange={e => setEditForm({ ...editForm, license_type: e.target.value })}>
                <option value="">Select...</option>
                {['Perpetual', 'Annual Subscription', 'Monthly Subscription', 'User-Seat'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          )}
          {['License', 'Maintenance', 'Training'].includes(editForm.item_type) && (
            <div className="form-group">
              <label>Delivery Method</label>
              <select className="form-input" value={editForm.delivery_method || ''} onChange={e => setEditForm({ ...editForm, delivery_method: e.target.value })}>
                <option value="">Select...</option>
                {['Electronic Delivery', 'On-Site', 'Remote', 'Shipped Media'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          {(editForm.item_type === 'Kit' || editForm.category === 'Reagents') && (
            <div className="form-group">
              <label>Storage Conditions</label>
              <select className="form-input" value={editForm.storage_conditions || ''} onChange={e => setEditForm({ ...editForm, storage_conditions: e.target.value })}>
                <option value="">Not specified</option>
                <option value="Room Temperature">Room Temperature</option>
                <option value="2-8°C">2-8°C</option>
                <option value="-20°C">-20°C</option>
                <option value="-80°C">-80°C</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-input" value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Datasheet URL</label>
            <input className="form-input" placeholder="https://..." value={editForm.datasheet_url || ''} onChange={e => setEditForm({ ...editForm, datasheet_url: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEditSubmit}>Update Product</button>
        </div>
      </Modal>
    </div>
  )
}
