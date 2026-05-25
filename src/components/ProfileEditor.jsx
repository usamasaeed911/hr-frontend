import { useState } from 'react';
import { User, Save, X } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from './Toast';

export const ProfileEditor = ({ profile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    emergency_contact: profile?.emergency_contact || '',
    bank_account: profile?.bank_account || ''
  });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/api/employees/${profile.id}`, formData);
      addToast('Profile updated successfully!', 'success');
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="profile-view">
        <div className="profile-header">
          <h3><User size={20} /> My Profile</h3>
          <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        </div>
        <div className="profile-info">
          <div className="info-row"><strong>Name:</strong> {profile?.name}</div>
          <div className="info-row"><strong>Email:</strong> {profile?.email}</div>
          <div className="info-row"><strong>Role:</strong> {profile?.role}</div>
          <div className="info-row"><strong>Department:</strong> {profile?.department || 'Not set'}</div>
          <div className="info-row"><strong>Position:</strong> {profile?.position || 'Not set'}</div>
          <div className="info-row"><strong>Phone:</strong> {profile?.phone || 'Not set'}</div>
          <div className="info-row"><strong>Emergency Contact:</strong> {profile?.emergency_contact || 'Not set'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-editor">
      <div className="profile-header">
        <h3>Edit Profile</h3>
        <button className="close-btn" onClick={() => setIsEditing(false)}><X size={18} /></button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name</label>
          <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1234567890" />
        </div>
        <div className="form-group">
          <label>Address</label>
          <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows="2" />
        </div>
        <div className="form-group">
          <label>Emergency Contact</label>
          <input value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} placeholder="Name: +1234567890" />
        </div>
        <div className="form-group">
          <label>Bank Account (for payroll)</label>
          <input value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} />
        </div>
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={() => setIsEditing(false)}>Cancel</button>
          <button type="submit" disabled={loading} className="primary-button">
            <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEditor;