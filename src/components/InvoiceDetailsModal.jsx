import Modal from './Modal'

export default function InvoiceDetailsModal({ showDetails, onClose }) {
  if (!showDetails) return null

  return (
    <Modal isOpen={!!showDetails} onClose={onClose} title={`Invoice ${showDetails?.invoice_number || ''}`} wide>
      <div className="modal-body">
        <div className="form-row" style={{ marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-primary)' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Billed To (Organization)</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{showDetails.client?.name || showDetails.client_name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${showDetails.status === 'Finalized' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
              {showDetails.status}
            </span>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
              Created: {new Date(showDetails.created_at || showDetails.date_created || Date.now()).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table className="line-items-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-secondary)' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Product</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Batch Info</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Qty</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unit Price</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {showDetails.lineItems?.map((li, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border-primary)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{li.products?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{li.products?.item_code}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {li.products?.item_type === 'Instrument' ? `SN: ${li.inventory?.serial_number || 'N/A'}` : `LOT: ${li.inventory?.lot_number || 'N/A'}`}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{li.quantity}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>EGP {li.unit_price?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--primary-700)' }}>EGP {(li.quantity * li.unit_price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-lg)' }}>
          <div style={{ flex: 1, paddingRight: 'var(--space-2xl)' }}>
            {showDetails.notes && (
              <>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)' }}>{showDetails.notes}</div>
              </>
            )}
          </div>
          <div style={{ textAlign: 'right', minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary-700)' }}>EGP {showDetails.total_amount?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
