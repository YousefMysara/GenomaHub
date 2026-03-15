import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Link as LinkIcon, AlertTriangle, CheckCircle, Info, ExternalLink, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ProductDetails({ addToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [product, setProduct] = useState(null)
  const [inventory, setInventory] = useState(null)
  const [accessories, setAccessories] = useState([])
  const [loading, setLoading] = useState(true)

  const [brandLogoError, setBrandLogoError] = useState(false)
  const [productLogoError, setProductLogoError] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      
      // 1. Fetch Product
      const { data: pData } = await supabase.from('products').select('*, brand:brands(*)').eq('id', id).single()
      if (pData) setProduct(pData)
      
      // 2. Fetch Inventory
      const { data: iData } = await supabase.from('inventory').select('*').eq('product_id', id).maybeSingle()
      if (iData) setInventory(iData)
      
      // 3. Fetch Accessories (if Equipment)
      if (pData?.item_type === 'Equipment') {
        const { data: rels } = await supabase.from('product_relations').select('child_product_id, products!child_product_id(id, name, item_code, base_price)').eq('parent_product_id', id)
        if (rels) {
          setAccessories(rels.map(r => r.products))
        }
      }
      
      setLoading(false)
    }
    
    fetchDetails()
  }, [id])

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading details...</div>
  if (!product) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Product not found.</div>

  const brandNameObj = product.brand?.name || ''
  const brandLogoUrl = brandNameObj ? `/logos/brands/${brandNameObj.toLowerCase().replace(/\s+/g, '')}.png` : null
  const productImageUrl = `/logos/products/${product.item_code.toLowerCase()}.png`

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 'var(--space-2xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn-icon" onClick={() => navigate('/catalog')} style={{ background: 'var(--bg-secondary)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{product.name}</h1>
            <div style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{product.item_code}</div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/catalog?edit=${product.id}`)}>
          <Edit2 size={16} /> Edit Product
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 'var(--space-xl)', alignItems: 'start' }}>
        {/* Left Column - Main Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          
          {/* Top Panel (Images & Core) */}
          <div className="card" style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
            {/* Product Image */}
            <div style={{ width: 120, height: 120, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {!productLogoError ? (
                <img src={productImageUrl} alt={product.name} onError={() => setProductLogoError(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Package size={40} color="var(--border-disabled)" />
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className={`badge ${product.item_type === 'Equipment' ? 'badge-equipment' : product.item_type === 'Software' ? 'badge-info' : 'badge-kit'}`} style={{ marginBottom: 8, display: 'inline-block' }}>
                    {product.item_type}
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-700)', marginBottom: 4 }}>${product.base_price?.toLocaleString()}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>Category: {product.category}</div>
                </div>

                {/* Brand Logo */}
                {brandNameObj && (
                  <div style={{ textAlign: 'right' }}>
                    {!brandLogoError && brandLogoUrl ? (
                      <img src={brandLogoUrl} alt={brandNameObj} onError={() => setBrandLogoError(true)} style={{ height: 40, objectFit: 'contain' }} />
                    ) : (
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{brandNameObj}</div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Vendor / Brand</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 6 }}><Info size={16}/> Description</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {product.description || 'No description provided for this item.'}
            </p>
            {product.datasheet_url && (
              <a href={product.datasheet_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginTop: 'var(--space-md)', display: 'inline-flex' }}>
                View Datasheet <ExternalLink size={14} style={{ marginLeft: 6 }} />
              </a>
            )}
          </div>

          {/* Accessories */}
          {product.item_type === 'Equipment' && (
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 6 }}><LinkIcon size={16}/> Compatible Accessories</h3>
              {accessories.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No accessories linked to this equipment.</div>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                  {accessories.map(acc => (
                    <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'transform 0.1s ease-in-out' }} onClick={() => navigate(`/catalog/${acc.id}`)} className="row-hover">
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{acc.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{acc.item_code}</div>
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--primary-700)' }}>${acc.base_price?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Inventory Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Inventory Status</h3>
            
            {!product.track_stock ? (
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                Stock tracking disabled for this item.
              </div>
            ) : inventory ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>On Hand</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: inventory.quantity <= inventory.reorder_level ? 'var(--status-danger)' : 'var(--text-primary)', lineHeight: 1 }}>
                      {inventory.quantity}
                    </div>
                  </div>
                  {inventory.quantity <= inventory.reorder_level ? (
                    <span style={{ color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, fontSize: '0.85rem', paddingBottom: 4 }}><AlertTriangle size={14} /> Low Stock</span>
                  ) : (
                    <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, fontSize: '0.85rem', paddingBottom: 4 }}><CheckCircle size={14} /> Healthy</span>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Reorder Level</div>
                    <div style={{ fontWeight: 500 }}>{inventory.reorder_level} units</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Location</div>
                    <div style={{ fontWeight: 500 }}>{inventory.location || '—'}</div>
                  </div>
                </div>

                {product.storage_conditions && (
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Storage Requires</div>
                    <div style={{ fontWeight: 500 }}>{product.storage_conditions}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-tertiary)' }}>No inventory record found.</div>
            )}
          </div>
          
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/inventory')}>
            Go to Inventory Management
          </button>
        </div>
      </div>
    </div>
  )
}
