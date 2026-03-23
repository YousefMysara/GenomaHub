import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Globe, Phone, Mail, MapPin, Building2, GripVertical, ChevronUp, ChevronDown, UploadCloud } from 'lucide-react'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const STAGE_COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#f59e0b', '#f97316', '#22c55e', '#ef4444']

export default function Settings({ addToast }) {
  const [activeTab, setActiveTab] = useState('pipeline')
  
  // -- BRANDS STATE
  const [brands, setBrands] = useState([])
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [editingBrand, setEditingBrand] = useState(null)
  const [brandForm, setBrandForm] = useState({ name: '', logo_url: '', website: '', phone: '', email: '', address: '', notes: '' })
  const [uploading, setUploading] = useState(false)

  // -- PIPELINE STATE
  const [stages, setStages] = useState([])
  const [stageEdits, setStageEdits] = useState([])
  const [loadingStages, setLoadingStages] = useState(true)

  const loadData = async () => {
    // Load Brands
    setLoadingBrands(true)
    const { data: bData } = await supabase.from('brands').select('*').order('name')
    if (bData) setBrands(bData)
    setLoadingBrands(false)

    // Load Stages
    setLoadingStages(true)
    const { data: sData } = await supabase.from('pipeline_stages').select('*').order('position')
    if (sData) {
      setStages(sData)
      setStageEdits(JSON.parse(JSON.stringify(sData)))
    }
    setLoadingStages(false)
  }

  useEffect(() => { loadData() }, [])

  // ── BRAND MANAGER ─────────────────────────────────────
  const openAddBrand = () => {
    setEditingBrand(null)
    setBrandForm({ name: '', logo_url: '', website: '', phone: '', email: '', address: '', notes: '' })
    setShowBrandModal(true)
  }

  const openEditBrand = (b) => {
    setEditingBrand(b)
    setBrandForm({
      name: b.name || '', logo_url: b.logo_url || '', website: b.website || '',
      phone: b.phone || '', email: b.email || '', address: b.address || '', notes: b.notes || ''
    })
    setShowBrandModal(true)
  }

  const handleDeleteBrand = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', id)
    if (count > 0) {
      addToast(`Cannot delete ${name} - it is linked to ${count} product(s)`, 'error')
      return
    }
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) {
      console.error(error)
      addToast('Failed to delete brand', 'error')
    } else {
      addToast('Brand deleted')
      loadData()
    }
  }

  const handleBrandSubmit = async () => {
    if (!brandForm.name.trim()) return addToast('Brand name is required', 'error')
    const payload = {
      name: brandForm.name.trim(),
      logo_url: brandForm.logo_url.trim() || null,
      website: brandForm.website.trim() || null,
      phone: brandForm.phone.trim() || null,
      email: brandForm.email.trim() || null,
      address: brandForm.address.trim() || null,
      notes: brandForm.notes.trim() || null
    }

    let error
    if (editingBrand) {
      const res = await supabase.from('brands').update(payload).eq('id', editingBrand.id)
      error = res.error
    } else {
      const res = await supabase.from('brands').insert([payload])
      error = res.error
    }

    if (error) {
      console.error(error)
      addToast(error.message?.includes('duplicate key') ? 'Brand name already exists' : 'Failed to save brand', 'error')
    } else {
      addToast(`Brand ${editingBrand ? 'updated' : 'created'} successfully`)
      setShowBrandModal(false)
      loadData()
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    try {
      const { error: uploadError } = await supabase.storage.from('brand-logos').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('brand-logos').getPublicUrl(fileName)
      setBrandForm(prev => ({ ...prev, logo_url: data.publicUrl }))
      addToast('Logo uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      addToast('Failed to upload logo: ' + error.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  // ── PIPELINE STAGES ───────────────────────────────────
  const saveStages = async () => {
    let hasError = false
    const { data: activeLeads } = await supabase.from('leads').select('status')
    const leads = activeLeads || []

    for (const s of stageEdits) {
      if (s._new) {
        const { error } = await supabase.from('pipeline_stages').insert([{ name: s.name, position: s.position, color: s.color }])
        if (error) { console.error(error); hasError = true }
      }
      else if (s._delete) {
        if (leads.some(l => l.status === s.name)) { addToast(`Cannot delete "${s.name}" - it has active leads`, 'error'); continue }
        const { error } = await supabase.from('pipeline_stages').delete().eq('id', s.id)
        if (error) { console.error(error); hasError = true }
      } else {
        const { error } = await supabase.from('pipeline_stages').update({ name: s.name, position: s.position, color: s.color }).eq('id', s.id)
        if (error) { console.error(error); hasError = true }
      }
    }

    if (hasError) addToast('Some stages failed to save', 'error')
    else addToast('Pipeline stages saved successfully')
    
    loadData()
  }

  const resetStages = () => {
    setStageEdits(JSON.parse(JSON.stringify(stages)))
    addToast('Changes discarded')
  }

  const addStageEdit = () => setStageEdits(prev => [...prev, { id: 'new_' + Date.now(), name: 'New Stage', position: prev.length, color: STAGE_COLORS[prev.length % STAGE_COLORS.length], _new: true }])
  
  const moveStage = (i, dir) => {
    const arr = [...stageEdits]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    arr.forEach((s, idx) => { s.position = idx })
    setStageEdits(arr)
  }

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Settings</h1>
            <p>Manage application preferences and core data</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 24, borderBottom: '1px solid var(--border-primary)' }}>
          {['Brands', 'Pipeline', 'General', 'Users'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              style={{
                background: 'none', border: 'none', padding: '10px 4px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                color: activeTab === tab.toLowerCase() ? 'var(--primary-600)' : 'var(--text-tertiary)',
                borderBottom: activeTab === tab.toLowerCase() ? '2px solid var(--primary-600)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg) 0' }}>
        
        {/* BRANDS TAB */}
        {activeTab === 'brands' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Brand Manager</h2>
              <button className="btn btn-primary" onClick={openAddBrand}>
                <Plus size={16} /> Add Brand
              </button>
            </div>

            {loadingBrands ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading brands...</div>
            ) : brands.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <Building2 size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>No brands found</h3>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: 16 }}>Get started by adding your first manufacturer or brand.</p>
                <button className="btn btn-primary" onClick={openAddBrand}>Add Brand</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                {brands.map(brand => (
                  <div key={brand.id} className="card row-hover" style={{ display: 'flex', flexDirection: 'column' }}>
                    
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--border-primary)' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, border: '1px solid var(--border-secondary)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-tertiary)' }}>{brand.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand.name}</div>
                        {brand.website ? (
                          <a href={brand.website.startsWith('http') ? brand.website : 'https://' + brand.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Globe size={11} /> {brand.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {brand.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={14} style={{ color: 'var(--text-tertiary)' }} /> {brand.phone}</div>}
                      {brand.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={14} style={{ color: 'var(--text-tertiary)' }} /> {brand.email}</div>}
                      {brand.address && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><MapPin size={14} style={{ color: 'var(--text-tertiary)', marginTop: 2, flexShrink: 0 }} /> <span>{brand.address}</span></div>}
                      {brand.notes && <div style={{ marginTop: 8, padding: 10, background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>"{brand.notes}"</div>}
                    </div>

                    <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-secondary)', borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' }}>
                      <button className="btn-icon" onClick={() => openEditBrand(brand)} title="Edit"><Edit2 size={16} /></button>
                      <button className="btn-icon delete" onClick={() => handleDeleteBrand(brand.id, brand.name)} title="Delete"><Trash2 size={16} /></button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PIPELINE TAB */}
        {activeTab === 'pipeline' && (
          <div style={{ maxWidth: 640 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Sales Pipeline Stages</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                Configure the stages for your sales pipeline. Use arrows to reorder. Stages with active leads cannot be deleted.
              </p>
            </div>

            {loadingStages ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading stages...</div>
            ) : (
              <div className="card" style={{ padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stageEdits.filter(s => !s._delete).map((s, i) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid ' + s.color }}>
                      <GripVertical size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                      <input type="color" value={s.color}
                        onChange={e => setStageEdits(prev => prev.map((x, xi) => xi === i ? { ...x, color: e.target.value } : x))}
                        style={{ width: 24, height: 24, border: 'none', padding: 0, borderRadius: 4, cursor: 'pointer', flexShrink: 0 }} />
                      <input className="form-input" value={s.name}
                        onChange={e => setStageEdits(prev => prev.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))}
                        style={{ flex: 1, padding: '4px 8px', fontSize: '0.9rem' }} />
                      <button className="btn-icon" onClick={() => moveStage(i, -1)} disabled={i === 0}><ChevronUp size={14} /></button>
                      <button className="btn-icon" onClick={() => moveStage(i, 1)} disabled={i === stageEdits.filter(s => !s._delete).length - 1}><ChevronDown size={14} /></button>
                      <button className="btn-icon delete" onClick={() => setStageEdits(prev => prev.map((x, xi) => xi === i ? { ...x, _delete: true } : x))}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button className="btn-ghost" style={{ marginTop: 16, width: '100%', padding: '10px' }} onClick={addStageEdit}>
                  <Plus size={15} /> Add Stage
                </button>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button className="btn btn-secondary" onClick={resetStages}>Discard Changes</button>
                  <button className="btn btn-primary" onClick={saveStages}>Save Pipeline config</button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab !== 'brands' && activeTab !== 'pipeline' && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            This section is under construction.
          </div>
        )}
      </div>

      <Modal isOpen={showBrandModal} onClose={() => setShowBrandModal(false)} title={editingBrand ? `Edit Brand: ${editingBrand.name}` : "Add New Brand"}>
        <div className="modal-body">
          <div className="form-group">
            <label>Brand Name *</label>
            <input className="form-input" placeholder="e.g. Illumina" value={brandForm.name} onChange={e => setBrandForm({ ...brandForm, name: e.target.value })} autoFocus />
          </div>
          <div className="form-group">
            <label>Brand Logo</label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {brandForm.logo_url ? (
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={brandForm.logo_url} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-secondary)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2, flexShrink: 0 }}>No Logo</div>
              )}
              <div style={{ flex: 1, position: 'relative' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', cursor: 'pointer', zIndex: 2 }}
                  onChange={handleImageUpload} 
                  disabled={uploading}
                />
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: uploading ? '1px dashed var(--primary-400)' : '1px dashed var(--border-secondary)', borderRadius: 'var(--radius-md)', background: uploading ? 'var(--primary-50)' : 'var(--bg-secondary)', color: uploading ? 'var(--primary-600)' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                  <UploadCloud size={20} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{uploading ? 'Uploading logo...' : 'Click or drop image to upload'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>JPG, PNG, SVG up to 2MB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Website</label>
              <input className="form-input" placeholder="www.example.com" value={brandForm.website} onChange={e => setBrandForm({ ...brandForm, website: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-input" placeholder="+1..." value={brandForm.phone} onChange={e => setBrandForm({ ...brandForm, phone: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Email Support / Sales</label>
            <input className="form-input" type="email" placeholder="support@brand.com" value={brandForm.email} onChange={e => setBrandForm({ ...brandForm, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Address / HQ</label>
            <textarea className="form-input" rows={2} value={brandForm.address} onChange={e => setBrandForm({ ...brandForm, address: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Internal Notes</label>
            <textarea className="form-input" rows={2} placeholder="Account numbers, special instructions..." value={brandForm.notes} onChange={e => setBrandForm({ ...brandForm, notes: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowBrandModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleBrandSubmit}>{editingBrand ? 'Save Changes' : 'Create Brand'}</button>
        </div>
      </Modal>

    </div>
  )
}
