import { useState, useEffect } from 'react'
import { Users, Plus, Search, Edit2, Trash2, FileText, Building2, GraduationCap, FlaskConical } from 'lucide-react'
import Modal from '../components/Modal'

const CLIENT_TYPES = ['All', 'Hospital', 'Private Laboratory', 'Research Center', 'Academic']

export default function Clients({ addToast }) {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showHistory, setShowHistory] = useState(null)
  const [form, setForm] = useState({
    name: '', type: 'Laboratory', contact_person: '', email: '', phone: '', address: ''
  })

  const fetchClients = () => {
    const params = new URLSearchParams()
    if (typeFilter !== 'All') params.set('type', typeFilter)
    if (search) params.set('search', search)
    fetch(`/api/clients?${params}`)
      .then(r => r.json())
      .then(setClients)
  }

  useEffect(() => { fetchClients() }, [typeFilter, search])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', type: 'Laboratory', contact_person: '', email: '', phone: '', address: '' })
    setShowModal(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({
      name: c.name, type: c.type, contact_person: c.contact_person || '',
      email: c.email || '', phone: c.phone || '', address: c.address || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    const url = editing ? `/api/clients/${editing.id}` : '/api/clients'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      addToast(editing ? 'Client updated' : 'Client added successfully')
      setShowModal(false)
      fetchClients()
    } else {
      addToast('Failed to save client', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    addToast('Client deleted')
    fetchClients()
  }

  const viewHistory = async (id) => {
    const res = await fetch(`/api/clients/${id}`)
    const data = await res.json()
    setShowHistory(data)
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Hospital': return <Building2 size={14} />
      case 'Research Center': return <FlaskConical size={14} />
      case 'Academic': return <GraduationCap size={14} />
      default: return <FlaskConical size={14} />
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
            <h1>Clients</h1>
            <p>Manage laboratories, hospitals, and research institutions</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="table-search">
          <Search size={16} />
          <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters-row">
          {CLIENT_TYPES.map(t => (
            <button key={t} className={`filter-chip ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Clients Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-md)' }}>
        {clients.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <Users size={48} />
            <h3>No clients found</h3>
            <p>Add your first client to get started</p>
          </div>
        ) : clients.map(c => (
          <div className="card" key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{c.name}</h3>
                <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {getTypeIcon(c.type)} {c.type}
                </span>
              </div>
              <div className="actions-cell">
                <button onClick={() => viewHistory(c.id)} title="Quote History"><FileText size={15} /></button>
                <button onClick={() => openEdit(c)} title="Edit"><Edit2 size={15} /></button>
                <button className="delete" onClick={() => handleDelete(c.id)} title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
              {c.contact_person && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-tertiary)', width: 60, flexShrink: 0, fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Contact</span>
                  <span>{c.contact_person}</span>
                </div>
              )}
              {c.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-tertiary)', width: 60, flexShrink: 0, fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Email</span>
                  <a href={`mailto:${c.email}`} style={{ color: 'var(--text-accent)' }}>{c.email}</a>
                </div>
              )}
              {c.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-tertiary)', width: 60, flexShrink: 0, fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Phone</span>
                  <span>{c.phone}</span>
                </div>
              )}
              {c.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-tertiary)', width: 60, flexShrink: 0, fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>Address</span>
                  <span>{c.address}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Client' : 'Add Client'}>
        <div className="modal-body">
          <div className="form-group">
            <label>Organization Name *</label>
            <input className="form-input" placeholder="e.g. King Fahad Medical City" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {CLIENT_TYPES.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Contact Person</label>
              <input className="form-input" placeholder="Full name" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" type="email" placeholder="email@domain.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-input" placeholder="+966-XX-XXX-XXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea className="form-input" placeholder="Full address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {editing ? 'Update Client' : 'Add Client'}
          </button>
        </div>
      </Modal>

      {/* Quote History Modal */}
      <Modal isOpen={!!showHistory} onClose={() => setShowHistory(null)} title={`${showHistory?.name || ''} — Quote History`} wide>
        {showHistory && (
          <div className="modal-body">
            {(!showHistory.quotes || showHistory.quotes.length === 0) ? (
              <div className="empty-state">
                <FileText size={40} />
                <h3>No quotations yet</h3>
                <p>No quotations have been created for this client</p>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Quote #</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Validity</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showHistory.quotes.map(q => (
                      <tr key={q.id}>
                        <td style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{q.quote_number}</td>
                        <td><span className={`badge ${getStatusClass(q.status)}`}>{q.status}</span></td>
                        <td style={{ fontWeight: 600 }}>${q.total?.toLocaleString()}</td>
                        <td>{q.validity_days} days</td>
                        <td>{new Date(q.date_created).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
