import { Download, Send } from 'lucide-react'
import Modal from './Modal'

export default function QuoteDetailsModal({ showDetails, onClose, onDownloadPDF, onUpdateStatus }) {
  if (!showDetails) return null

  const getStatusClass = (status) => {
    if (status === 'Draft') return 'badge-draft'
    if (status === 'Sent') return 'badge-info'
    if (status === 'Accepted') return 'badge-success'
    return 'badge-danger'
  }

  return (
    <Modal isOpen={!!showDetails} onClose={onClose} title={`Quotation ${showDetails?.quote_number || ''}`} wide>
      <div className="modal-body">
        <div className="form-row" style={{ marginBottom: 'var(--space-lg)' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Billed To</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{showDetails.client_name}</div>
            {showDetails.contact_person && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Attn: {showDetails.contact_person}</div>}
            {showDetails.email && <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{showDetails.email}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${getStatusClass(showDetails.status)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
              {showDetails.status}
            </span>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
              Created: {new Date(showDetails.created_at || showDetails.date_created).toLocaleDateString()} · Valid: {showDetails.validity_days} days
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-md)' }}>
          <table className="line-items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Product</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Disc.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {(showDetails.lineItems || []).map((li, i) => (
                <tr key={li.id || i}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{li.item_code}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{li.product_name}</td>
                  <td><span className={`badge ${li.item_type === 'Equipment' ? 'badge-equipment' : 'badge-kit'}`}>{li.item_type || 'Product'}</span></td>
                  <td style={{ textAlign: 'center' }}>{li.quantity}</td>
                  <td>EGP {parseFloat(li.quoted_price).toLocaleString()}</td>
                  <td>{li.discount_percent > 0 ? `${li.discount_percent}%` : '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary-700)' }}>EGP {parseFloat(li.line_total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="quote-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>EGP {showDetails.subtotal?.toLocaleString()}</span>
            </div>
            {showDetails.discount_percent > 0 && (
              <div className="summary-row">
                <span style={{ color: 'var(--status-danger)' }}>Discount ({showDetails.discount_percent}%)</span>
                <span style={{ color: 'var(--status-danger)' }}>-EGP {(showDetails.subtotal * showDetails.discount_percent / 100).toLocaleString()}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total</span>
              <span>EGP {showDetails.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {showDetails.terms_conditions && (
          <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Terms & Conditions:</strong><br />
            {showDetails.terms_conditions}
          </div>
        )}
      </div>
      <div className="modal-footer">
        {onDownloadPDF && (
          <button className="btn btn-secondary" onClick={() => onDownloadPDF(showDetails)}>
            <Download size={16} /> Download PDF
          </button>
        )}
        {showDetails.status === 'Draft' && onUpdateStatus && (
          <button className="btn btn-primary" onClick={() => onUpdateStatus(showDetails.id, 'Sent')}>
            <Send size={16} /> Mark as Sent
          </button>
        )}
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
