import { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const ForgotPasswordModal = ({ isOpen, onClose, addToast }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    setLoading(false);
    
    if (error) {
      addToast(error.message, 'error');
    } else {
      setSent(true);
      addToast('Password reset email sent! Check your inbox.', 'success');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal forgot-password-modal">
        {!sent ? (
          <>
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button onClick={onClose}>✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <button type="submit" className="primary-button" style={{ marginTop: 20, width: '100%' }} disabled={loading}>
                <Mail size={18} />
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="password-reset-sent">
            <CheckCircle size={48} color="#10b981" />
            <h3>Check Your Email</h3>
            <p>We sent a password reset link to <strong>{email}</strong></p>
            <button onClick={onClose} className="primary-button" style={{ marginTop: 20 }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};