/**
 * Organization Details Page
 * 
 * A dedicated route for viewing and managing a specific Organization's CRM data.
 * Tabs for: Contacts, Quotations, and Invoices.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users, FileText, Receipt, Plus, Edit2,
  Trash2, Mail, Phone, MapPin, ArrowLeft, Star
} from 'lucide-react'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const ORG_TYPES = ['Hospital', 'Private Laboratory', 'Research Center', 'Academic']

export default function OrganizationDetails({ addToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [activeOrg, setActiveOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('contacts')
  
  const [contacts, setContacts] = useState([])
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])

  const [showOrgModal, setShowOrgModal] = useState(false)
  const [orgForm, setOrgForm] = useState({ name: '', type: '', address: '' })

  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', email: '', phone: '', role: '', is_primary: false })

  const loadData = async () => {
    setLoading(true)
    // Fetch Organization
    const { data: orgData, error: orgErr } = await supabase.from('clients').select('*').eq('id', id).single()
    if (orgErr || !orgData) {
      addToast('Organization not found', 'error')
      navigate('/organizations')
      return
    }
    setActiveOrg(orgData)
    
    // Fetch contacts
    const { data: cData } = await supabase.from('contacts').select('*').eq('client_id', id).order('is_primary', { ascending: false })
    if (cData) setContacts(cData)

    // Fetch quotes
    const { data: qData } = await supabase.from('quotations').select('*').eq('client_id', id).order('date_created', { ascending: false })
    if (qData) setQuotes(qData)

    // Fetch invoices
    const { data: iData } = await supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false })
    if (iData) setInvoices(iData)
      
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  // --- Org Actions ---
  const openEditOrg = () => {
    setOrgForm({ name: activeOrg.name, type: activeOrg.type, address: activeOrg.address || '' })
    setShowOrgModal(true)
  }

  const handleOrgSubmit = async () => {
    if (!orgForm.name.trim()) return addToast('Organization name is required', 'error')
    const { error } = await supabase.from('clients').update(orgForm).eq('id', id)
    if (!error) { 
      addToast('Organization updated')
      setShowOrgModal(false)
      loadData()
    } else {
      console.error(error)
      addToast('Failed to update organization', 'error')
    }
  }

  // --- Contact Actions ---
  const openAddContact = () => {
    setEditingContact(null)
    setContactForm({ first_name: '', last_name: '', email: '', phone: '', role: '', is_primary: contacts.length === 0 })
    setShowContactModal(true)
  }

  const openEditContact = (c) => {
    setEditingContact(c)
    setContactForm({ first_name: c.first_name, last_name: c.last_name, email: c.email || '', phone: c.phone || '', role: c.role || '', is_primary: c.is_primary })
    setShowContactModal(true)
  }

  const handleContactSubmit = async () => {
    if (!contactForm.first_name.trim() || !contactForm.last_name.trim()) return addToast('First and Last name required', 'error')
    
    // Ensure only one primary
    if (contactForm.is_primary) {
      await supabase.from('contacts').update({ is_primary: false }).eq('client_id', id)
    }

    const body = { ...contactForm, client_id: id }
    if (editingContact) {
      await supabase.from('contacts').update(body).eq('id', editingContact.id)
      addToast('Contact updated')
    } else {
      await supabase.from('contacts').insert([body])
      addToast('Contact added')
    }
    setShowContactModal(false)
    loadData()
  }

  const deleteContact = async (cId) => {
    if (!confirm('Remove this contact?')) return
    await supabase.from('contacts').delete().eq('id', cId)
    addToast('Contact removed')
    loadData()
  }

  if (loading || !activeOrg) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div>

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 'var(--space-2xl)' }}>
      <button className="btn-ghost" style={{ marginBottom: 'var(--space-md)' }} onClick={() => navigate('/organizations')}>
        <ArrowLeft size={16} /> Back to Organizations
      </button>

      {/* Org Header Card */}
      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 8 }}>
            <span className="badge badge-info">{activeOrg.type}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Created {new Date(activeOrg.created_at).toLocaleDateString()}</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>{activeOrg.name}</h1>
          {activeOrg.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <MapPin size={16} style={{ marginTop: 2, flexShrink: 0, color: 'var(--text-tertiary)' }} />
              <span>{activeOrg.address}</span>
            </div>
          )}
        </div>
        <button className="btn btn-secondary" onClick={openEditOrg}><Edit2 size={15}/> Edit Details</button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
        <button className={activeTab === 'contacts' ? 'active' : ''} onClick={() => setActiveTab('contacts')}>
          <Users size={16} /> Contacts ({contacts.length})
        </button>
        <button className={activeTab === 'quotes' ? 'active' : ''} onClick={() => setActiveTab('quotes')}>
          <FileText size={16} /> Quotations ({quotes.length})
        </button>
        <button className={activeTab === 'invoices' ? 'active' : ''} onClick={() => setActiveTab('invoices')}>
          <Receipt size={16} /> Invoices ({invoices.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'contacts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
            <button className="btn btn-primary" onClick={openAddContact}><Plus size={15}/> Add Contact</button>
          </div>
          {contacts.length === 0 ? (
            <div className="empty-state card">
              <Users size={40} />
              <h3>No contacts yet</h3>
              <p>Add people associated with this organization.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
              {contacts.map(c => (
                <div key={c.id} className="card" style={{ padding: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{c.first_name} {c.last_name}</h3>
                        {c.is_primary && <Star size={14} fill="var(--warning-500)" color="var(--warning-500)" title="Primary Contact" />}
                      </div>
                      {c.role && <div style={{ fontSize: '0.85rem', color: 'var(--primary-600)', fontWeight: 500, marginTop: 2 }}>{c.role}</div>}
                    </div>
                    <div className="actions-cell">
                      <button onClick={() => openEditContact(c)}><Edit2 size={14}/></button>
                      <button className="delete" onClick={() => deleteContact(c.id)}><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Mail size={14} style={{ color: 'var(--text-tertiary)' }}/> <a href={`mailto:${c.email}`} style={{ color: 'var(--text-accent)' }}>{c.email}</a>
                      </div>
                    )}
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone size={14} style={{ color: 'var(--text-tertiary)' }}/> <span>{c.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Quote #</th><th>Status</th><th>Total</th><th>Validity</th><th>Date</th></tr></thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>No quotations found.</td></tr>
              ) : quotes.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{q.quote_number}</td>
                  <td><span className={`badge ${
                    q.status === 'Draft' ? 'badge-draft' : q.status === 'Sent' ? 'badge-info' :
                    q.status === 'Accepted' ? 'badge-success' : 'badge-danger'
                  }`}>{q.status}</span></td>
                  <td style={{ fontWeight: 700 }}>${q.total?.toLocaleString()}</td>
                  <td>{q.validity_days} days</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{new Date(q.date_created).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Invoice #</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>No invoices found.</td></tr>
              ) : invoices.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{i.invoice_number}</td>
                  <td><span className={`badge ${i.status === 'Finalized' ? 'badge-success' : 'badge-warning'}`}>{i.status}</span></td>
                  <td style={{ fontWeight: 700 }}>${i.total_amount?.toLocaleString()}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{new Date(i.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Org Modal */}
      <Modal isOpen={showOrgModal} onClose={() => setShowOrgModal(false)} title="Edit Organization">
        <div className="modal-body">
          <div className="form-group">
            <label>Organization Name *</label>
            <input className="form-input" value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="form-input" value={orgForm.type} onChange={e => setOrgForm({ ...orgForm, type: e.target.value })}>
              {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Physical Address</label>
            <textarea className="form-input" value={orgForm.address} onChange={e => setOrgForm({ ...orgForm, address: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowOrgModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOrgSubmit}>Save Changes</button>
        </div>
      </Modal>

      {/* Add/Edit Contact Modal */}
      <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title={editingContact ? 'Edit Contact' : 'Add Contact'}>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input className="form-input" value={contactForm.first_name} onChange={e => setContactForm({...contactForm, first_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input className="form-input" value={contactForm.last_name} onChange={e => setContactForm({...contactForm, last_name: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Job Title / Role</label>
            <input className="form-input" placeholder="e.g. Lab Director" value={contactForm.role} onChange={e => setContactForm({...contactForm, role: e.target.value})} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-input" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 'var(--space-sm)' }}>
            <input type="checkbox" checked={contactForm.is_primary} onChange={e => setContactForm({...contactForm, is_primary: e.target.checked})} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Make this the Primary Contact</span>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleContactSubmit}>Save Contact</button>
        </div>
      </Modal>
    </div>
  )
}
