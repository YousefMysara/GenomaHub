import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export default function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={18} />}
          {toast.type === 'warning' && <AlertTriangle size={18} />}
          {toast.type === 'error' && <XCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
