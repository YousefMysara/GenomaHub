import { useState, useEffect, useRef } from 'react'
import {
  Plus, Search, Building2, User, Calendar, X,
  MessageSquare, Phone, Mail, Link as LinkIcon,
  StickyNote, Activity, Target, List, Settings, ChevronUp,
  ChevronDown, Trash2, Check, GripVertical, FileText, Receipt
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const SOURCES = ['Referral', 'Website', 'Cold Call', 'Exhibition', 'Existing Client', 'Other']
const STAGE_COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#f59e0b', '#f97316', '#22c55e', '#ef4444']

export default function SalesPipeline({ addToast }) {
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState('kanban')
  const [search, setSearch] = useState('')
  const [leads, setLeads] = useState([])
  const [stages, setStages] = useState([])
  const [contacts, setContacts] = useState([])
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])

  const [activeLead, setActiveLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [activityForm, setActivityForm] = useState({ type: 'Note', content: '', created_by: '' })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState({ title: '', contact_id: '', priority: 'Medium', source: '', expected_value: '', expected_close_date: '', assigned_to: '' })

  const dragLead = useRef(null)

  // ── Data Loading ──────────────────────────────────────────────────
  const loadData = async () => {
    const [leadsRes, stagesRes, contactsRes, quotesRes, invoicesRes] = await Promise.all([
      supabase.from('leads').select('*, clients(name, id), contacts(first_name, last_name), quotations(quote_number, total, status), invoices(invoice_number, total_amount, status)').order('updated_at', { ascending: false }),
      supabase.from('pipeline_stages').select('*').order('position'),
      supabase.from('contacts').select('*, clients(name)'),
      supabase.from('quotations').select('id, quote_number, total, status').order('quote_number', { ascending: false }),
      supabase.from('invoices').select('id, invoice_number, total_amount, status').order('invoice_number', { ascending: false }),
    ])
    if (leadsRes.data) setLeads(leadsRes.data)
    if (stagesRes.data) setStages(stagesRes.data)
    if (contactsRes.data) setContacts(contactsRes.data)
    if (quotesRes.data) setQuotes(quotesRes.data)
    if (invoicesRes.data) setInvoices(invoicesRes.data)
  }

  const loadActivities = async (leadId) => {
    const { data } = await supabase.from('lead_activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    if (data) setActivities(data)
  }

  useEffect(() => { loadData() }, [])

  // ── Lead CRUD ─────────────────────────────────────────────────────
  const handleCreateSubmit = async () => {
    if (!form.title.trim() || !form.contact_id) return addToast('Title and Contact are required', 'error')
    const contact = contacts.find(c => c.id === form.contact_id)
    const { data, error } = await supabase.from('leads').insert([{
      title: form.title,
      client_id: contact?.client_id,
      contact_id: form.contact_id,
      status: stages[0]?.name || 'New',
      priority: form.priority,
      source: form.source || null,
      expected_value: parseFloat(form.expected_value) || null,
      expected_close_date: form.expected_close_date || null,
      assigned_to: form.assigned_to || null,
    }]).select('*').single()
    if (error) { console.error(error); return addToast('Failed to create lead', 'error') }
    addToast('Lead created')
    setShowCreateModal(false)
    loadData()
    await supabase.from('lead_activities').insert([{ lead_id: data.id, type: 'Status Change', content: 'Lead created in pipeline', created_by: form.assigned_to || 'System' }])
  }

  const openLead = (lead) => {
    setActiveLead(lead)
    loadActivities(lead.id)
  }

  const updateLeadStatus = async (newStatus) => {
    if (!activeLead || activeLead.status === newStatus) return
    const old = activeLead.status
    const { error } = await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', activeLead.id)
    if (!error) {
      setActiveLead(prev => ({ ...prev, status: newStatus }))
      setLeads(prev => prev.map(l => l.id === activeLead.id ? { ...l, status: newStatus } : l))
      await supabase.from('lead_activities').insert([{ lead_id: activeLead.id, type: 'Status Change', content: 'Moved from ' + old + ' to ' + newStatus, created_by: 'System' }])
      loadActivities(activeLead.id)
    }
  }

  const logActivity = async () => {
    if (!activityForm.content.trim()) return
    const { error } = await supabase.from('lead_activities').insert([{ lead_id: activeLead.id, ...activityForm }])
    if (!error) { setActivityForm(prev => ({ ...prev, content: '' })); loadActivities(activeLead.id); addToast('Activity logged') }
  }

  // ── Link Quote / Invoice ──────────────────────────────────────────
  const linkQuote = async (qId) => {
    await supabase.from('leads').update({ quotation_id: qId || null, updated_at: new Date().toISOString() }).eq('id', activeLead.id)
    const q = quotes.find(x => x.id === qId)
    setActiveLead(prev => ({ ...prev, quotation_id: qId || null, quotations: q || null }))
    if (qId) { await supabase.from('lead_activities').insert([{ lead_id: activeLead.id, type: 'Link', content: 'Linked Quote: ' + q?.quote_number, created_by: 'System' }]); loadActivities(activeLead.id) }
    loadData()
  }

  const linkInvoice = async (iId) => {
    await supabase.from('leads').update({ invoice_id: iId || null, updated_at: new Date().toISOString() }).eq('id', activeLead.id)
    const inv = invoices.find(x => x.id === iId)
    setActiveLead(prev => ({ ...prev, invoice_id: iId || null, invoices: inv || null }))
    if (iId) { await supabase.from('lead_activities').insert([{ lead_id: activeLead.id, type: 'Link', content: 'Linked Invoice: ' + inv?.invoice_number, created_by: 'System' }]); loadActivities(activeLead.id) }
    loadData()
  }

  // ── Drag and Drop ─────────────────────────────────────────────────
  const handleDragStart = (e, lead) => { dragLead.current = lead; e.dataTransfer.effectAllowed = 'move' }
  const handleDragOver = (e) => { e.preventDefault() }
  const handleDrop = async (e, stageName) => {
    e.preventDefault()
    const lead = dragLead.current
    if (!lead || lead.status === stageName) return
    const old = lead.status
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: stageName } : l))
    await supabase.from('leads').update({ status: stageName, updated_at: new Date().toISOString() }).eq('id', lead.id)
    await supabase.from('lead_activities').insert([{ lead_id: lead.id, type: 'Status Change', content: 'Dragged from ' + old + ' to ' + stageName, created_by: 'System' }])
    dragLead.current = null
  }

  // ── Stats ─────────────────────────────────────────────────────────
  const now = new Date()
  const thisMonth = (d) => { const dt = new Date(d); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear() }
  const wonStages = stages.filter(s => s.name.toLowerCase() === 'won').map(s => s.name)
  const lostStages = stages.filter(s => s.name.toLowerCase() === 'lost').map(s => s.name)
  const activeLeads = leads.filter(l => !wonStages.includes(l.status) && !lostStages.includes(l.status))
  const wonThisMonth = leads.filter(l => wonStages.includes(l.status) && thisMonth(l.updated_at))
  const lostThisMonth = leads.filter(l => lostStages.includes(l.status) && thisMonth(l.updated_at))
  const closingThisMonth = leads.filter(l => l.expected_close_date && thisMonth(l.expected_close_date) && !wonStages.includes(l.status) && !lostStages.includes(l.status))
  const pipelineValue = activeLeads.reduce((s, l) => s + (l.expected_value || 0), 0)

  const filteredLeads = leads.filter(l =>
    (l.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.clients?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const getPriorityColor = (p) => ({ Urgent: 'var(--status-danger)', High: 'var(--status-warning)', Medium: 'var(--primary-500)', Low: 'var(--text-tertiary)' }[p] || 'var(--text-tertiary)')

  const getActivityIcon = (type) => {
    if (type === 'Note') return <StickyNote size={13} />
    if (type === 'Call') return <Phone size={13} />
    if (type === 'Email') return <Mail size={13} />
    if (type === 'Meeting') return <User size={13} />
    if (type === 'Status Change') return <Activity size={13} />
    if (type === 'Link') return <LinkIcon size={13} />
    return <MessageSquare size={13} />
  }

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Sales Pipeline</h1>
            <p>Track deals, manage leads, and log interactions</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => { setForm({ title: '', contact_id: '', priority: 'Medium', source: '', expected_value: '', expected_close_date: '', assigned_to: '' }); setShowCreateModal(true) }}>
              <Plus size={16} /> New Lead
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        {[
          { label: 'Active Pipeline', value: 'EGP ' + pipelineValue.toLocaleString(), sub: activeLeads.length + ' deals', color: 'var(--primary-600)', icon: <Target size={20} /> },
          { label: 'Won This Month', value: wonThisMonth.length, sub: 'EGP ' + wonThisMonth.reduce((s, l) => s + (l.expected_value || 0), 0).toLocaleString(), color: 'var(--status-success)', icon: <Check size={20} /> },
          { label: 'Lost This Month', value: lostThisMonth.length, sub: 'deals lost', color: 'var(--status-danger)', icon: <X size={20} /> },
          { label: 'Closing This Month', value: closingThisMonth.length, sub: 'expected to close', color: 'var(--status-warning)', icon: <Calendar size={20} /> },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: 'var(--space-md)', borderLeft: '4px solid ' + stat.color, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: stat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{stat.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div className="table-search" style={{ maxWidth: 280, margin: 0 }}>
          <Search size={16} />
          <input placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 3 }}>
          {[['kanban', <Target size={15} />, 'Kanban'], ['table', <List size={15} />, 'Table']].map(([mode, icon, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', fontWeight: 500, background: viewMode === mode ? 'var(--bg-primary)' : 'transparent', color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-tertiary)', border: 'none', cursor: 'pointer', boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {viewMode === 'kanban' ? (
          <div style={{ display: 'flex', gap: 10, height: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: 12 }}>
            {stages.map(stage => {
              const stageLeads = filteredLeads.filter(l => l.status === stage.name)
              const total = stageLeads.reduce((s, l) => s + (l.expected_value || 0), 0)
              return (
                <div key={stage.id}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, stage.name)}
                  style={{ flex: '1 1 0', minWidth: 160, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px 8px', borderTop: '3px solid ' + stage.color, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{stage.name}</span>
                      <span style={{ fontSize: '0.7rem', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 10, color: 'var(--text-tertiary)' }}>{stageLeads.length}</span>
                    </div>
                    {total > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>EGP {total.toLocaleString()}</span>}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {stageLeads.map(lead => (
                      <div key={lead.id} draggable
                        onDragStart={e => handleDragStart(e, lead)}
                        onClick={() => openLead(lead)}
                        className="card row-hover"
                        style={{ padding: '10px 12px', cursor: 'grab', borderLeft: '3px solid ' + getPriorityColor(lead.priority), userSelect: 'none' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, lineHeight: 1.3 }}>{lead.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                          <Building2 size={11} /> {lead.clients?.name || 'No org'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{lead.contacts ? lead.contacts.first_name + ' ' + lead.contacts.last_name : ''}</span>
                          {lead.expected_value ? <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-600)' }}>EGP {lead.expected_value.toLocaleString()}</span> : null}
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem', border: '1px dashed var(--border-secondary)', borderRadius: 'var(--radius-md)', marginTop: 4 }}>Drop here</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="table-container" style={{ height: '100%', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Deal</th><th>Organization</th><th>Stage</th><th>Priority</th><th>Value</th><th>Close Date</th><th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id} className="row-hover" style={{ cursor: 'pointer' }} onClick={() => openLead(lead)}>
                    <td style={{ fontWeight: 600 }}>{lead.title}</td>
                    <td>{lead.clients?.name}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{lead.status}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: getPriorityColor(lead.priority), fontWeight: 600 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                        {lead.priority}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{lead.expected_value ? 'EGP ' + lead.expected_value.toLocaleString() : '-'}</td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : '-'}</td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{lead.assigned_to || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE LEAD MODAL */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Lead">
        <div className="modal-body">
          <div className="form-group">
            <label>Opportunity Title *</label>
            <input className="form-input" placeholder="e.g. NextSeq 2000 Upgrade for Lab X" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Contact * <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(auto-links Organization)</span></label>
            <select className="form-input" value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
              <option value="">-- Select Contact --</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.clients?.name})</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Source</label>
              <select className="form-input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                <option value="">-</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Expected Value (EGP)</label>
              <input className="form-input" type="number" placeholder="0.00" value={form.expected_value} onChange={e => setForm({ ...form, expected_value: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Expected Close Date</label>
              <input className="form-input" type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Assigned To</label>
            <input className="form-input" placeholder="e.g. Sarah Smith" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateSubmit}>Create Deal</button>
        </div>
      </Modal>

      {/* LEAD DETAIL - FULL SCREEN CENTER MODAL */}
      {activeLead && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setActiveLead(null) }}
        >
          <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 1000, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>

            {/* Modal Header — title + meta only, no stage buttons */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                    LEAD-{activeLead.id.slice(0, 6).toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: getPriorityColor(activeLead.priority) }}>
                    {activeLead.priority} Priority
                  </span>
                  {activeLead.assigned_to && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Assigned to <strong>{activeLead.assigned_to}</strong>
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>{activeLead.title}</h2>
              </div>
              <button className="btn-icon" onClick={() => setActiveLead(null)}><X size={20} /></button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

              {/* LEFT: flexible panel — Status + Details + Quote + Invoice + Notes */}
              <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '16px 20px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid var(--border-primary)' }}>

                {/* Change Status */}
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Change Status</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {stages.map(s => {
                      const isActive = activeLead.status === s.name
                      return (
                        <button key={s.id} onClick={() => updateLeadStatus(s.name)} style={{
                          padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700, borderRadius: 20, cursor: 'pointer',
                          border: isActive ? 'none' : '2px solid ' + s.color + '30',
                          background: isActive ? s.color : 'var(--bg-primary)',
                          color: isActive ? '#fff' : 'var(--text-secondary)',
                          boxShadow: isActive ? '0 2px 10px ' + s.color + '55' : 'none',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.15s',
                        }}>
                          {s.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Lead Info */}
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lead Info</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Organization</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setActiveLead(null); navigate('/organizations/' + activeLead.client_id) }}>
                        {activeLead.clients?.name || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Contact</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {activeLead.contacts ? activeLead.contacts.first_name + ' ' + activeLead.contacts.last_name : '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Value</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {activeLead.expected_value ? 'EGP ' + activeLead.expected_value.toLocaleString() : '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Close Date</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {activeLead.expected_close_date ? new Date(activeLead.expected_close_date).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Source</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{activeLead.source || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Quotation */}
                <div className="card" style={{ padding: 12, borderLeft: '3px solid var(--primary-500)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={12} /> Quotation
                  </div>
                  {activeLead.quotations ? (
                    <div>
                      {activeLead.quotations.status === 'Accepted' && (
                        <div style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', borderRadius: 5, padding: '3px 7px', marginBottom: 7, fontWeight: 600 }}>
                          Quote accepted - ready to invoice!
                        </div>
                      )}
                      <div style={{ fontSize: '0.85rem', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <strong>{activeLead.quotations.quote_number}</strong>
                          <span className="badge" style={{ fontSize: '0.68rem', marginLeft: 4 }}>{activeLead.quotations.status}</span>
                        </span>
                        <span style={{ fontWeight: 700 }}>EGP {(activeLead.quotations.total || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '4px', fontSize: '0.75rem' }} onClick={() => navigate('/quotations')}>View</button>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '4px', fontSize: '0.75rem' }} onClick={() => linkQuote('')}>Unlink</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <select className="form-input" style={{ fontSize: '0.78rem', padding: '5px 8px' }} value="" onChange={e => linkQuote(e.target.value)}>
                        <option value="">Link existing quote...</option>
                        {quotes.map(q => <option key={q.id} value={q.id}>{q.quote_number} - EGP {q.total}</option>)}
                      </select>
                      <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '5px' }} onClick={() => { setActiveLead(null); navigate('/quotations') }}>
                        <Plus size={12} /> Create New Quote
                      </button>
                    </div>
                  )}
                </div>

                {/* Invoice */}
                <div className="card" style={{ padding: 12, borderLeft: '3px solid var(--status-success)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Receipt size={12} /> Invoice
                  </div>
                  {activeLead.invoices ? (
                    <div>
                      <div style={{ fontSize: '0.85rem', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <strong>{activeLead.invoices.invoice_number}</strong>
                          <span className="badge" style={{ fontSize: '0.68rem', marginLeft: 4 }}>{activeLead.invoices.status}</span>
                        </span>
                        <span style={{ fontWeight: 700 }}>EGP {(activeLead.invoices.total_amount || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '4px', fontSize: '0.75rem' }} onClick={() => navigate('/invoices')}>View</button>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '4px', fontSize: '0.75rem' }} onClick={() => linkInvoice('')}>Unlink</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <select className="form-input" style={{ fontSize: '0.78rem', padding: '5px 8px' }} value="" onChange={e => linkInvoice(e.target.value)}>
                        <option value="">Link existing invoice...</option>
                        {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} - EGP {i.total_amount}</option>)}
                      </select>
                      <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '5px' }} onClick={() => { setActiveLead(null); navigate('/invoices') }}>
                        <Plus size={12} /> Create New Invoice
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes Box */}
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <StickyNote size={12} /> Notes
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
                    {activities.filter(a => a.type === 'Note').length === 0
                      ? <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>No notes yet.</div>
                      : activities.filter(a => a.type === 'Note').map(act => (
                        <div key={act.id} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '7px 10px', borderLeft: '3px solid var(--status-warning)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>
                            {act.created_by || 'System'} - {new Date(act.created_at).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{act.content}</div>
                        </div>
                      ))
                    }
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <input
                      className="form-input"
                      style={{ flex: 1, padding: '5px 8px', fontSize: '0.8rem' }}
                      placeholder="Add a note..."
                      value={activityForm.type === 'Note' ? activityForm.content : ''}
                      onChange={e => setActivityForm({ type: 'Note', content: e.target.value, created_by: activityForm.created_by })}
                      onKeyDown={e => { if (e.key === 'Enter') logActivity() }}
                    />
                    <button className="btn btn-secondary" style={{ padding: '0 10px', fontSize: '0.78rem' }} onClick={logActivity}>Save</button>
                  </div>
                </div>

              </div>

              {/* RIGHT: fixed 350px — Log input at top, activity list below */}
              <div style={{ width: 350, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

                {/* Log input — pinned to top */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add Log</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 7 }}>
                    {['Note', 'Call', 'Email', 'Meeting', 'Link'].map(t => (
                      <button key={t} onClick={() => setActivityForm(prev => ({ ...prev, type: t }))}
                        style={{ padding: '3px 9px', fontSize: '0.73rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600, background: activityForm.type === t ? 'var(--primary-100)' : 'transparent', color: activityForm.type === t ? 'var(--primary-700)' : 'var(--text-tertiary)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input className="form-input" style={{ padding: '6px 9px', fontSize: '0.83rem' }}
                      placeholder={'Log ' + activityForm.type.toLowerCase() + '...'}
                      value={activityForm.content}
                      onChange={e => setActivityForm(prev => ({ ...prev, content: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') logActivity() }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" style={{ flex: 1, padding: '5px 8px', fontSize: '0.83rem' }}
                        placeholder="Your name"
                        value={activityForm.created_by}
                        onChange={e => setActivityForm(prev => ({ ...prev, created_by: e.target.value }))}
                      />
                      <button className="btn btn-primary" style={{ padding: '0 16px', flexShrink: 0 }} onClick={logActivity}>Log</button>
                    </div>
                  </div>
                </div>

                {/* Activity list — scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Activity Log</div>
                  {activities.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px 0', fontSize: '0.85rem' }}>No activity yet.</div>
                  ) : activities.map(act => (
                    <div key={act.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {getActivityIcon(act.type)}
                      </div>
                      <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '6px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>
                            {act.created_by || 'System'}
                            <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}> - {act.type}</span>
                          </span>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)' }}>
                            {new Date(act.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{act.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
