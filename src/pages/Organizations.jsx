/**
 * Organizations (CRM) Module — Main List View
 * 
 * Replaces the old "Clients" concept with a full CRM.
 * - Displays a grid of Organizations (from public.clients table)
 * - Click an organization to navigate to its dedicated details page
 */
import { useState, useEffect } from 'react'
import { Building2, Users, MapPin, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const ORG_TYPES = ['All', 'Hospital', 'Private Laboratory', 'Research Center', 'Academic']

export default function Organizations({ addToast }) {
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  
  // Modal states
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [orgForm, setOrgForm] = useState({ name: '', type: 'Laboratory', address: '' })

  const fetchOrgs = async () => {
    let query = supabase.from('clients').select(`*, contacts(count)`).order('created_at', { ascending: false })
    if (typeFilter !== 'All') query = query.eq('type', typeFilter)
    if (search) query = query.ilike('name', `%${search}%`)
    
    const { data, error } = await query
    if (error) console.error(error)
    else setOrgs(data || [])
  }

  useEffect(() => { fetchOrgs() }, [typeFilter, search])

  const openAddOrg = () => {
    setOrgForm({ name: '', type: 'Laboratory', address: '' })
    setShowOrgModal(true)
  }

  const handleOrgSubmit = async () => {
    if (!orgForm.name.trim()) return addToast('Organization name is required', 'error')
    
    const { error } = await supabase.from('clients').insert([orgForm])
    if (!error) { 
      addToast('Organization added')
      setShowOrgModal(false)
      fetchOrgs() 
    } else {
      console.error(error)
      addToast('Failed to add organization', 'error')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Organizations</h1>
            <p>Manage your CRM: Hospitals, Labs, and Clinics</p>
          </div>
          <button className="btn btn-primary" onClick={openAddOrg}>
            <Plus size={16} /> Add Organization
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="table-search">
          <Search size={16} />
          <input placeholder="Search organizations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters-row">
          {ORG_TYPES.map(t => (
            <button key={t} className={`filter-chip ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-md)' }}>
        {orgs.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <Building2 size={48} />
            <h3>No organizations found</h3>
            <p>Add your first organization to get started</p>
          </div>
        ) : orgs.map(org => {
          const contactCount = org.contacts?.[0]?.count || 0
          return (
            <div className="card row-hover" key={org.id} onClick={() => navigate(`/organizations/${org.id}`)} style={{ padding: 'var(--space-xl)', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }} 
                 onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-300)'}
                 onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{org.name}</h3>
                <span className="badge badge-info">{org.type}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} style={{ color: 'var(--text-tertiary)' }}/> {contactCount} Contacts
                </div>
                {org.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <MapPin size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}/> {org.address}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Org Modal */}
      <Modal isOpen={showOrgModal} onClose={() => setShowOrgModal(false)} title="Add Organization">
        <div className="modal-body">
          <div className="form-group">
            <label>Organization Name *</label>
            <input className="form-input" placeholder="e.g. King Fahad Medical City" value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="form-input" value={orgForm.type} onChange={e => setOrgForm({ ...orgForm, type: e.target.value })}>
              {ORG_TYPES.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Physical Address</label>
            <textarea className="form-input" placeholder="Full address" value={orgForm.address} onChange={e => setOrgForm({ ...orgForm, address: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowOrgModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOrgSubmit}>Add Organization</button>
        </div>
      </Modal>
    </div>
  )
}
