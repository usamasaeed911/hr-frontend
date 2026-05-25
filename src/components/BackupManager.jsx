import { useState, useEffect } from 'react';
import { Download, Upload, Database, AlertTriangle, Cloud, CloudUpload, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from './Toast';

export const BackupManager = ({ company, hr }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [cloudBackups, setCloudBackups] = useState([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchCloudBackups();
  }, []);

  const fetchCloudBackups = async () => {
    try {
      const data = await api.get('/api/backup/cloud/list');
      setCloudBackups(data);
    } catch (e) { /* ignore error in background fetch */ }
  };

  const createBackup = async () => {
    setIsBackingUp(true);
    addToast('Preparing system backup...', 'info');
    
    try {
      const response = await api.get('/api/backup/company/export');
      
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hr_system_backup_${company?.name || 'export'}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      addToast('Backup downloaded successfully', 'success');
    } catch (error) {
      addToast('Backup failed: ' + error.message, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const saveToCloud = async () => {
    setIsLoadingCloud(true);
    addToast('Uploading to cloud storage...', 'info');
    try {
      await api.post('/api/backup/cloud/save');
      addToast('Cloud backup successful', 'success');
      fetchCloudBackups();
    } catch (error) {
      addToast('Cloud backup failed: ' + error.message, 'error');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const downloadCloudBackup = async (fileName) => {
    try {
      addToast('Downloading from cloud...', 'info');
      const data = await api.get(`/api/backup/cloud/download/${fileName}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      addToast('Download failed: ' + error.message, 'error');
    }
  };

  const handleRestore = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        
        if (window.confirm('Restoring will overwrite all current company data. This cannot be undone. Proceed?')) {
          setIsRestoring(true);
          addToast('Restoring data...', 'info');
          
          await api.post('/api/backup/company/restore', {
            backupData,
            companyId: company?.id
          });
          
          addToast('System restored successfully!', 'success');
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (error) {
        addToast('Invalid backup file: ' + error.message, 'error');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="backup-manager">
      <h3><Database size={20} /> Backup & Recovery</h3>
      
      <div className="backup-stats">
        <div className="stat"><span>Staff</span><strong>{hr.employees?.length || 0}</strong></div>
        <div className="stat"><span>Leaves</span><strong>{hr.leaveRequests?.length || 0}</strong></div>
        <div className="stat"><span>Records</span><strong>{hr.attendance?.length || 0}</strong></div>
        <div className="stat"><span>Claims</span><strong>{hr.expenses?.length || 0}</strong></div>
      </div>
      
      <div className="backup-actions">
        <button className="backup-btn backup-create" onClick={createBackup} disabled={isBackingUp}>
          <Download size={18} /> {isBackingUp ? 'Exporting...' : 'Export Data (JSON)'}
        </button>
        
        <label className="backup-btn backup-restore">
          <Upload size={18} /> {isRestoring ? 'Restoring...' : 'Restore Backup'}
          <input type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} disabled={isRestoring} />
        </label>
      </div>

      <div className="cloud-backup-section">
        <div className="section-header">
          <h4><Cloud size={16} /> Cloud Storage</h4>
          <button onClick={saveToCloud} disabled={isLoadingCloud} className="backup-btn small-action">
            <CloudUpload size={14} /> {isLoadingCloud ? 'Saving...' : 'Save to Cloud'}
          </button>
        </div>
        <div className="cloud-list">
          {cloudBackups.length === 0 ? <p className="muted">No cloud backups found.</p> : cloudBackups.map(b => (
            <div key={b.name} className="cloud-item">
              <div><Clock size={14} /> {new Date(b.created_at).toLocaleString()}</div>
              <a 
                href={`${import.meta.env.VITE_API_URL}/api/backup/cloud/download/${b.name}`} 
                onClick={(e) => { e.preventDefault(); downloadCloudBackup(b.name); }}
                title="Download cloud backup"
              >
                <Download size={14} />
              </a>
            </div>
          ))}
        </div>
      </div>
      
      <div className="backup-note">
        <AlertTriangle size={14} />
        <small>Backups contain sensitive PII data. Store them securely.</small>
      </div>
    </div>
  );
};