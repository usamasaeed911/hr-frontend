import { AlertTriangle, X } from 'lucide-react';

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
  if (!isOpen) return null;
  
  const colors = {
    danger: { bg: '#fee2e2', text: '#dc2626', button: '#dc2626' },
    warning: { bg: '#fef3c7', text: '#d97706', button: '#f59e0b' },
    info: { bg: '#dbeafe', text: '#2563eb', button: '#3b82f6' }
  };
  
  const style = colors[type] || colors.danger;
  
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <div className="confirm-header">
          <div className="confirm-icon" style={{ background: style.bg }}>
            <AlertTriangle size={24} color={style.text} />
          </div>
          <button onClick={onClose} className="confirm-close">
            <X size={20} />
          </button>
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className="confirm-btn confirm-btn-confirm" style={{ background: style.button }} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};