import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardList,
  Clock3,
  Cpu,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  ReceiptText,
  Settings,
  Search,
  Shield,
  Printer,
  Save,
  Speaker,
  Sun,
  User,
  Users
} from 'lucide-react';
import './styles.css';
import './components/toast.css';
import { ToastProvider, useToast } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ProfileEditor } from './components/ProfileEditor';
import { ForgotPasswordModal } from './components/ForgotPassword';
import { BackupManager } from './components/BackupManager';
import { api } from './lib/api';
import { supabase } from './lib/supabase';
import { SuperAdmin } from './components/SuperAdmin';
import { useHRData } from './hooks/useHRData';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'leave', label: 'Leave', icon: CalendarCheck },
  { id: 'attendance', label: 'Attendance', icon: Clock3 },
  { id: 'payroll', label: 'Payroll', icon: BadgeDollarSign },
  { id: 'performance', label: 'Performance', icon: ClipboardList },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  { id: 'assets', label: 'Assets', icon: Cpu },
  { id: 'recruitment', label: 'Recruitment', icon: BriefcaseBusiness },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings, role: 'company_admin' },
  { id: 'superadmin', label: 'Super Admin', icon: Shield, role: 'super_admin' }
];

const emptyEmployee = { name: '', email: '', department: '', position: '', salary: '', hire_date: '', phone: '', role: 'employee', send_email: true };
const emptyLeave = { employee_id: '', leave_type_id: '', start_date: '', end_date: '', days: 1, reason: '' };
const emptyExpense = { category: '', amount: '', description: '', date: '' };
const emptyJob = { title: '', department: '', location: '', employment_type: 'Full-time', description: '', requirements: '' };
const emptyAsset = { name: '', category: '', serial_number: '', status: 'available' };

const ExportDropdown = ({ data, type, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { addToast } = useToast();

  const exportAsCSV = () => {
    if (!data || data.length === 0) {
      addToast(`No ${type} data to export`, 'warning');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
        return String(value).replace(/,/g, ';');
      });
      csvRows.push(values.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    addToast(`${type} exported successfully!`, 'success');
    setIsOpen(false);
  };

  const exportAsJSON = () => {
    if (!data || data.length === 0) {
      addToast(`No ${type} data to export`, 'warning');
      return;
    }
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    addToast(`${type} exported successfully!`, 'success');
    setIsOpen(false);
  };

  return (
    <div className="export-dropdown">
      <button className="export-btn" onClick={() => setIsOpen(!isOpen)}>
        <Download size={16} />
        Export {label}
      </button>
      {isOpen && (
        <div className="export-menu">
          <button onClick={exportAsCSV}>
            <FileSpreadsheet size={16} />
            Export as CSV
          </button>
          <button onClick={exportAsJSON}>
            <FileJson size={16} />
            Export as JSON
          </button>
        </div>
      )}
    </div>
  );
};

const PublicCareers = ({ subdomain }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingTo, setApplyingTo] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [appForm, setAppForm] = useState({ name: '', email: '', phone: '', cover_letter: '' });
  const { addToast } = useToast();

  useEffect(() => {
    if (!subdomain) {
      setError('Company subdomain is required');
      setLoading(false);
      return;
    }
    api.get(`/api/recruitment/public/jobs?subdomain=${subdomain}`)
      .then(setJobs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [subdomain]);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      let resumeUrl = null;
      if (resumeFile) {
        addToast('Uploading resume...', 'info');
        const fileExt = resumeFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, resumeFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('resumes').getPublicUrl(fileName);
        resumeUrl = publicUrl;
      }

      await api.post('/api/recruitment/public/apply', {
        job_post_id: applyingTo.id,
        applicant_name: appForm.name,
        applicant_email: appForm.email,
        applicant_phone: appForm.phone,
        cover_letter: appForm.cover_letter,
        resume_url: resumeUrl
      });
      addToast('Application submitted successfully!', 'success');
      setApplyingTo(null);
    } catch (err) { addToast(err.message, 'error'); }
  };

  if (loading) return <div className="empty-state">Loading job openings...</div>;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div className="public-careers" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px' }}>Open Positions</h2>
      {jobs.length === 0 ? <p className="muted">No positions currently open.</p> : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {jobs.map(job => (
            <div key={job.id} className="surface" style={{ padding: '20px' }}>
              <h3>{job.title}</h3>
              <p className="muted">{job.department} • {job.location} • {job.employment_type}</p>
              <button className="primary-button" style={{ marginTop: '12px' }} onClick={() => setApplyingTo(job)}>Apply Now</button>
            </div>
          ))}
        </div>
      )}
      {applyingTo && (
        <Modal title={`Apply for ${applyingTo.title}`} close={() => setApplyingTo(null)}>
          <form className="form-stack" onSubmit={handleApply}>
            <label>Name<input required value={appForm.name} onChange={e => setAppForm({...appForm, name: e.target.value})} /></label>
            <label>Email<input type="email" required value={appForm.email} onChange={e => setAppForm({...appForm, email: e.target.value})} /></label>
            <label>Resume (PDF/Doc)<input type="file" accept=".pdf,.doc,.docx" onChange={e => setResumeFile(e.target.files[0])} /></label>
            <label>Cover Letter<textarea rows="4" value={appForm.cover_letter} onChange={e => setAppForm({...appForm, cover_letter: e.target.value})} /></label>
            <button className="primary-button" type="submit">Submit Application</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const CompanyExport = ({ hr, company }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { addToast } = useToast();

  const exportAllData = async () => {
    setIsExporting(true);
    addToast('Preparing your data export...', 'info');
    
    try {
      const exportData = {
        company_info: company,
        export_date: new Date().toISOString(),
        data: {
          employees: hr.employees,
          leave_requests: hr.leaveRequests,
          attendance: hr.attendance,
          expenses: hr.expenses,
          payroll_runs: hr.payrollRuns,
          jobs: hr.jobs,
          applications: hr.applications,
          documents: hr.documents,
          performance_reviews: hr.reviews
        }
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${company?.name || 'company'}_full_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      addToast('Company data exported successfully!', 'success');
    } catch (error) {
      addToast('Failed to export data', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-dropdown">
      <button className="export-btn" onClick={exportAllData} disabled={isExporting}>
        <Download size={16} />
        {isExporting ? 'Exporting...' : 'Export All Company Data'}
      </button>
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [leaveForm, setLeaveForm] = useState(emptyLeave);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    company_name: '',
    subdomain: '',
    name: '',
    email: '',
    password: ''
  });
  const { addToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [breakStatus, setBreakStatus] = useState({ onBreak: false, breakStart: null });
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const hr = useHRData(Boolean(session && profile));
  const canManage = ['company_admin', 'manager', 'super_admin'].includes(profile?.role);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) loadProfile(nextSession.user.id);
      else {
        setProfile(null);
        setCompany(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    console.log('Current user role:', profile?.role);
    console.log('Settings tab visible?', profile?.role === 'company_admin' || profile?.role === 'super_admin');
  }, [profile]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }
    setDeferredPrompt(null);
  }

  async function loadProfile(userId) {
    try {
      const data = await api.get('/api/auth/me');
      setProfile({ id: userId, ...data.user });
      setCompany(data.company);
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword(loginForm);
    if (error) {
      setAuthError(error.message);
      addToast('Invalid email or password', 'error');
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      const res = await api.post('/api/auth/register', registerForm);
      setAuthMode('login');
      setLoginForm({ email: registerForm.email, password: '' });
      addToast(res.message || 'Registration successful! Please login.', 'success');
    } catch (error) {
      setAuthError(error.message);
      addToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitEmployee(event) {
    event.preventDefault();
    try {
      const response = await api.post('/api/employees', employeeForm);
      setEmployeeForm(emptyEmployee);
      setModal('');
      hr.refresh();

      if (!employeeForm.send_email && response.temp_password) {
        setConfirmDialog({
          isOpen: true,
          title: 'Employee Created',
          message: `Credentials for ${employeeForm.name}:\n\nEmail: ${employeeForm.email}\nPassword: ${response.temp_password}\n\nPlease share these securely with the employee.`,
          onConfirm: null // It's just an informative modal in this case
        });
      } else {
        addToast('Employee added successfully! Login credentials sent via email.', 'success');
      }
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function submitLeave(event) {
    event.preventDefault();
    try {
      await api.post('/api/leave-requests', leaveForm);
      setLeaveForm(emptyLeave);
      setModal('');
      hr.refresh();
      addToast('Leave request submitted', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    try {
      await api.post('/api/expenses', expenseForm);
      setExpenseForm(emptyExpense);
      setModal('');
      hr.refresh();
      addToast('Expense claim submitted', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function submitAsset(event) {
    event.preventDefault();
    try {
      await api.post('/api/assets', assetForm);
      setAssetForm(emptyAsset);
      setModal('');
      hr.refresh();
      addToast('Asset added successfully', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function approveLeave(id, action) {
    try {
      await api.patch(`/api/leave-requests/${id}/${action}`);
      hr.refresh();
      addToast(`Leave request ${action === 'approve' ? 'approved' : 'rejected'}`, action === 'approve' ? 'success' : 'warning');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function approveExpense(id, action) {
    try {
      await api.patch(`/api/expenses/${id}/${action}`);
      hr.refresh();
      addToast(`Expense claim ${action === 'approve' ? 'approved' : 'rejected'}`, action === 'approve' ? 'success' : 'warning');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function clock(action) {
    try {
      let location = null;
      
      // Get GPS location if available
      if (action === 'clock-in' && navigator.geolocation) {
        addToast('Getting your location...', 'info');
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      }

      const res = await api.post(`/api/attendance/${action}`, { location });
      hr.refresh();
      
      if (action === 'clock-in') {
        addToast(`Clocked in at ${res.clock_in}`, 'success');
        if (location) addToast(`Location recorded`, 'info');
      } else {
        addToast(`Clocked out. Total: ${res.total_hours} hours`, 'info');
      }
    } catch (error) {
      if (error.code === 1) {
        addToast('Please enable location services to clock in', 'warning');
      } else {
        addToast(error.message, 'error');
      }
    }
  }

  async function startBreak() {
    try {
      const res = await api.post('/api/attendance/break/start', {});
      setBreakStatus({ onBreak: true, breakStart: res.break_start });
      addToast('Break started', 'info');
      hr.refresh();
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function endBreak() {
    try {
      const res = await api.post('/api/attendance/break/end', {});
      setBreakStatus({ onBreak: false, breakStart: null });
      addToast('Break ended', 'success');
      hr.refresh();
    } catch (error) { addToast(error.message, 'error'); }
  }

  async function processPayroll() {
    try {
      const now = new Date();
      await api.post('/api/payroll/process', {
        month: now.getMonth() + 1,
        year: now.getFullYear()
      });
      hr.refresh();
      addToast('Payroll processed successfully', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function createJobPost(event) {
    event.preventDefault();
    try {
      await api.post('/api/recruitment/jobs', jobForm);
      setJobForm(emptyJob);
      setModal('');
      hr.refresh();
      addToast('Job posted successfully', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function updateApplicationStatus(id, status) {
    try {
      await api.patch(`/api/recruitment/applications/${id}`, { status });
      hr.refresh();
      addToast(`Application status updated to ${status}`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function hireCandidate(application) {
    setConfirmDialog({
      isOpen: true,
      title: 'Hire Candidate',
      message: `Do you want to convert ${application.applicant_name} into an employee? This will create their profile in the system.`,
      onConfirm: async () => {
        try {
          // 1. Create the employee record
          await api.post('/api/employees', {
            name: application.applicant_name,
            email: application.applicant_email,
            department: application.job_posts?.department || '',
            position: application.job_posts?.title || '',
            salary: application.expected_salary || 0, 
            hire_date: new Date().toISOString().split('T')[0]
          });

          // 2. Mark application as hired
          await api.patch(`/api/recruitment/applications/${application.id}`, { status: 'hired' });
          
          hr.refresh();
          addToast(`${application.applicant_name} has been added as an employee!`, 'success');
        } catch (error) {
          addToast(error.message, 'error');
        }
      }
    });
  }

  async function deletePayroll(id) {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Payroll Run',
      message: 'Are you sure you want to delete this payroll run? This will remove all associated line items. This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/api/payroll/${id}`);
          hr.refresh();
          addToast('Payroll run deleted', 'success');
        } catch (error) {
          addToast(error.message, 'error');
        }
      }
    });
  }


  // ============ SHARED UPDATE/DELETE FUNCTIONS ============
  async function updateEmployee(id, updates) {
    try {
      await api.patch(`/api/employees/${id}`, updates);
      hr.refresh();
      addToast('Employee updated successfully', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function deleteEmployee(id, name) {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Employee',
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`/api/employees/${id}`);
          hr.refresh();
          addToast(`${name} deleted`, 'success');
        } catch (error) {
          addToast(error.message, 'error');
        }
      }
    });
  }

  async function updateLeave(id, updates) {
    try {
      await api.patch(`/api/leave-requests/${id}`, updates);
      hr.refresh();
      addToast('Leave request updated', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function deleteLeave(id) {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Leave Request',
      message: 'Are you sure you want to remove this request?',
      onConfirm: async () => {
        try {
          await api.delete(`/api/leave-requests/${id}`);
          hr.refresh();
          addToast('Leave request deleted', 'success');
        } catch (error) {
          addToast(error.message, 'error');
        }
      }
    });
  }

  async function updateExpense(id, updates) {
    try {
      await api.patch(`/api/expenses/${id}`, updates);
      hr.refresh();
      addToast('Expense updated', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  async function deleteExpense(id) {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense claim?',
      onConfirm: async () => {
        try {
          await api.delete(`/api/expenses/${id}`);
          hr.refresh();
          addToast('Expense deleted', 'success');
        } catch (error) {
          addToast(error.message, 'error');
        }
      }
    });
  }

  async function deleteAsset(id, name) {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Asset',
      message: `Are you sure you want to delete ${name}?`,
      onConfirm: async () => {
        try {
          await api.delete(`/api/assets/${id}`);
          hr.refresh();
          addToast('Asset deleted', 'success');
        } catch (error) {
          addToast(error.message, 'error');
        }
      }
    });
  }

  async function updateAsset(id, updates) {
    try {
      await api.patch(`/api/assets/${id}`, updates);
      hr.refresh();
      addToast('Asset updated successfully', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  }

  const todayAttendance = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const data = Array.isArray(hr.attendance) ? hr.attendance : (hr.attendance?.data || []);
    return data.find((entry) => entry.date === today && entry.employee_id === profile?.id);
  }, [hr.attendance, profile?.id]);

  const isCareersPage = window.location.pathname === '/careers';
  const publicSubdomain = new URLSearchParams(window.location.search).get('subdomain');

  if (isCareersPage) {
    return <PublicCareers subdomain={publicSubdomain} />;
  }

  if (!session) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <div className="brand-row">
            <Building2 size={30} />
            <div>
              <h1>HR System</h1>
              <p>Company operations in one clean workspace</p>
            </div>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="form-stack">
              <label>Email<input type="email" required value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} /></label>
              <label>Password<input type="password" required value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} /></label>
              {authError && <p className="error-text">{authError}</p>}
              <button className="primary-button" type="submit">Sign In</button>
              <button className="link-button" type="button" onClick={() => setShowForgotPassword(true)}>Forgot Password?</button>
              <ForgotPasswordModal 
                isOpen={showForgotPassword} 
                onClose={() => setShowForgotPassword(false)} 
                addToast={addToast}
              />
              <button className="link-button" type="button" onClick={() => setAuthMode('register')}>Register a company</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="form-stack">
              <label>Company Name<input required value={registerForm.company_name} onChange={(e) => setRegisterForm({ ...registerForm, company_name: e.target.value })} /></label>
              <label>Subdomain<input required value={registerForm.subdomain} onChange={(e) => setRegisterForm({ ...registerForm, subdomain: e.target.value.toLowerCase() })} /></label>
              <label>Your Name<input required value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} /></label>
              <label>Email<input type="email" required value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} /></label>
              <label>Password<input type="password" required value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} /></label>
              {authError && <p className="error-text">{authError}</p>}
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Registering...' : 'Register Company'}</button>
              <button className="link-button" type="button" onClick={() => setAuthMode('login')}>Back to sign in</button>
            </form>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Building2 size={28} />
          <div>
            <strong>HR System</strong>
            <span>{company?.name || 'Loading company'}</span>
          </div>
        </div>
        <nav>
          {tabs.filter((tab) => {
            // If no role required, show to everyone
            if (!tab.role) return true;
            
            // Super admin sees everything
            if (profile?.role === 'super_admin') return true;
            
            // Company admin sees company_admin and manager tabs
            if (profile?.role === 'company_admin') {
              return tab.role === 'company_admin' || tab.role === 'manager';
            }
            
            // Manager sees manager tabs
            if (profile?.role === 'manager') {
              return tab.role === 'manager';
            }
            
            // Employee sees nothing with role restriction
            return false;
          }).map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        {showInstallButton && (
          <button className="install-button" onClick={handleInstallClick}>
            <Download size={18} />
            Install App
          </button>
        )}
        <div className="user-box">
          <div>
            <strong>{profile?.name}</strong>
            <span>{profile?.role}</span>
          </div>
          <button aria-label="Sign out" title="Sign out" onClick={() => supabase.auth.signOut()}><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
          </div>
          {hr.error && <span className="error-pill">{hr.error}</span>}
        </header>

        {hr.loading ? <div className="empty-state">Loading HR data...</div> : (
          <>
            {activeTab === 'dashboard' && <Dashboard stats={hr.stats} todayAttendance={todayAttendance} clock={clock} profile={profile} hr={hr} company={company} breakStatus={breakStatus} startBreak={startBreak} endBreak={endBreak} onAudit={setSelectedAuditId} />}
            {activeTab === 'employees' && <Employees employees={hr.employees} canManage={canManage} openModal={() => setModal('employee')} onEdit={updateEmployee} onDelete={deleteEmployee} />}
            {activeTab === 'leave' && <Leave requests={hr.leaveRequests} canManage={canManage} onNew={() => setModal('leave')} onAction={approveLeave} onEdit={updateLeave} onDelete={deleteLeave} />}
            {activeTab === 'attendance' && <Attendance records={hr.attendance} clock={clock} employees={hr.employees} />}
            {activeTab === 'payroll' && <Payroll runs={hr.payrollRuns} canManage={canManage} processPayroll={processPayroll} onDelete={deletePayroll} />}
            {activeTab === 'performance' && <Performance reviews={hr.reviews} />}
            {activeTab === 'expenses' && <Expenses expenses={hr.expenses} onNew={() => setModal('expense')} canManage={canManage} onAction={approveExpense} onEdit={updateExpense} onDelete={deleteExpense} />}
            {activeTab === 'assets' && (
              <Assets 
                assets={hr.assets || []} 
                employees={hr.employees} 
                canManage={canManage} 
                refresh={hr.refresh} 
                onDelete={deleteAsset} 
                onEdit={updateAsset} 
                onNew={() => setModal('asset')} 
              />
            )}
            {activeTab === 'recruitment' && (
              <Recruitment 
                jobs={hr.jobs} 
                applications={hr.applications} 
                canManage={canManage} 
                onCreateJob={() => setModal('job')}
                onStatusChange={updateApplicationStatus}
                onHire={hireCandidate}
                company={company}
              />
            )}
            {activeTab === 'documents' && <Documents documents={hr.documents} />}
            {activeTab === 'profile' && <ProfileEditor profile={profile} onUpdate={() => loadProfile(session.user.id)} />}
            {activeTab === 'settings' && <CompanySettings company={company} onUpdate={() => loadProfile(session.user.id)} />}
            {activeTab === 'superadmin' && profile?.role === 'super_admin' && <SuperAdmin />}
          </>
        )}
      </main>

      {modal === 'employee' && (
        <Modal title="Add Employee" close={() => setModal('')}>
          <form className="form-grid" onSubmit={submitEmployee}>
            <input placeholder="Full name" required value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} />
            <input placeholder="Email" type="email" required value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} />
            <input placeholder="Department" value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} />
            <input placeholder="Position" value={employeeForm.position} onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })} />
            <input placeholder="Salary" type="number" value={employeeForm.salary} onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })} />
            <input type="date" required value={employeeForm.hire_date} onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })} />
            <input placeholder="Phone" value={employeeForm.phone} onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })} />
            <select value={employeeForm.role} onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="company_admin">Company Admin</option>
            </select>
            <label className="full-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              <input 
                type="checkbox" 
                checked={employeeForm.send_email} 
                onChange={(e) => setEmployeeForm({ ...employeeForm, send_email: e.target.checked })} 
                style={{ width: '14px', height: '14px', cursor: 'pointer', margin: 0, flexShrink: 0 }}
              />
              <span style={{ lineHeight: 1 }}>Send login credentials via email</span>
            </label>
            <button className="primary-button full-row" type="submit">Add Employee</button>
          </form>
        </Modal>
      )}

      {modal === 'leave' && (
        <Modal title="Request Leave" close={() => setModal('')}>
          <form className="form-grid" onSubmit={submitLeave}>
            <select required value={leaveForm.employee_id} onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}>
              <option value="">Employee</option>
              {hr.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
            <select required value={leaveForm.leave_type_id} onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}>
              <option value="">Leave type</option>
              {hr.leaveTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
            <input type="date" required value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
            <input type="date" required value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
            <input type="number" min="0.5" step="0.5" required value={leaveForm.days} onChange={(e) => setLeaveForm({ ...leaveForm, days: e.target.value })} />
            <textarea placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            <button className="primary-button full-row" type="submit">Submit Leave</button>
          </form>
        </Modal>
      )}

      {modal === 'expense' && (
        <Modal title="Submit Expense" close={() => setModal('')}>
          <form className="form-grid" onSubmit={submitExpense}>
            <input placeholder="Category" required value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} />
            <input placeholder="Amount" type="number" min="0" step="0.01" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            <input type="date" required value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
            <textarea placeholder="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
            <button className="primary-button full-row" type="submit">Submit Expense</button>
          </form>
        </Modal>
      )}

      {modal === 'job' && (
        <Modal title="Post New Job" close={() => setModal('')}>
          <form className="form-grid" onSubmit={createJobPost}>
            <input placeholder="Job Title" required value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
            <input placeholder="Department" value={jobForm.department} onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })} />
            <input placeholder="Location" value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} />
            <select value={jobForm.employment_type} onChange={(e) => setJobForm({ ...jobForm, employment_type: e.target.value })}>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Remote">Remote</option>
            </select>
            <textarea placeholder="Job Description" rows="4" value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
            <button className="primary-button full-row" type="submit">Post Job</button>
          </form>
        </Modal>
      )}

      {modal === 'asset' && (
        <Modal title="Add New Asset" close={() => setModal('')}>
          <form className="form-grid" onSubmit={submitAsset}>
            <input placeholder="Asset Name" required value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} />
            <input placeholder="Category (e.g. Laptop)" value={assetForm.category} onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })} />
            <input placeholder="Serial Number" value={assetForm.serial_number} onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })} />
            <select value={assetForm.status} onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}>
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <button className="primary-button full-row" type="submit">Add Asset</button>
          </form>
        </Modal>
      )}

      {selectedAuditId && (
        <EmployeeAudit 
          employeeId={selectedAuditId} 
          employees={hr.employees}
          assets={hr.assets}
          onClose={() => setSelectedAuditId(null)} 
        />
      )}

      <ConfirmDialog 
        {...confirmDialog} 
        onConfirm={async () => {
          if (confirmDialog.onConfirm) await confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}

function CompanySettings({ company, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: company?.name || '',
    email: company?.email || '',
    smtp_host: company?.smtp_host || '',
    smtp_port: company?.smtp_port || '',
    smtp_user: company?.smtp_user || '',
    smtp_pass: company?.smtp_pass || ''
  });
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/api/auth/company', formData);
      addToast('Company settings updated!', 'success');
      if (onUpdate) onUpdate();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface admin-form-surface">
      <h2><Settings size={20} /> Company Settings</h2>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="full-row"><label>Company Name</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
        <div className="full-row"><label>Sender Email (From)</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="hr@yourcompany.com" /></div>
        
        <h3 className="full-row" style={{ marginTop: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Custom SMTP Configuration</h3>
        <p className="full-row muted" style={{ fontSize: '13px' }}>Leave these blank to use the system default email service.</p>
        
        <div><label>SMTP Host</label><input value={formData.smtp_host} onChange={e => setFormData({...formData, smtp_host: e.target.value})} placeholder="smtp.gmail.com" /></div>
        <div><label>SMTP Port</label><input value={formData.smtp_port} onChange={e => setFormData({...formData, smtp_port: e.target.value})} placeholder="587" /></div>
        <div><label>SMTP User</label><input value={formData.smtp_user} onChange={e => setFormData({...formData, smtp_user: e.target.value})} /></div>
        <div><label>SMTP Pass / App Password</label><input type="password" value={formData.smtp_pass} onChange={e => setFormData({...formData, smtp_pass: e.target.value})} /></div>
        
        <button className="primary-button full-row" type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ stats, todayAttendance, clock, profile, hr, company, breakStatus, startBreak, endBreak, onAudit }) {
  const [search, setSearch] = useState('');
  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return [];
    return hr.employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5);
  }, [hr.employees, search]);

  return (
    <section>
      <div className="dashboard-header">
        <div className="welcome-card">
          <div className="welcome-content">
            <h2>Welcome back, {profile?.name?.split(' ')[0] || 'Admin'}</h2>
          </div>
        </div>

        {['company_admin', 'manager', 'super_admin'].includes(profile?.role) && (
          <div className="surface" style={{ marginTop: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} className="muted" />
              <input 
                placeholder="Search employee for full record (Audit)..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ border: 0, outline: 'none', padding: '8px', flex: 1 }} 
              />
            </div>
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 10, border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', boxShadow: 'var(--shadow-lg)' }}>
                {searchResults.map(e => (
                  <button key={e.id} onClick={() => { onAudit(e.id); setSearch(''); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px', border: 0, background: 'transparent', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <strong>{e.name}</strong> - {e.department || 'No Dept'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="export-section">
          <CompanyExport hr={hr} company={company} />
          <ExportDropdown data={hr.employees} type="employees" label="Employees" />
          <ExportDropdown data={hr.leaveRequests} type="leave_requests" label="Leave" />
          <ExportDropdown data={hr.attendance} type="attendance" label="Attendance" />
          <ExportDropdown data={hr.expenses} type="expenses" label="Expenses" />
          <ExportDropdown data={hr.payrollRuns} type="payroll" label="Payroll" />
        </div>
      </div>

      {(profile?.role === 'company_admin' || profile?.role === 'super_admin') && (
        <div style={{ marginBottom: '28px' }}>
          <BackupManager company={company} hr={hr} />
        </div>
      )}

      <div className="metric-grid">
        <Metric label="Employees" value={stats.totalEmployees || 0} icon={Users} />
        <Metric label="Pending Leave" value={stats.pendingLeaves || 0} icon={CalendarCheck} tone="amber" />
        <Metric label="Pending Expenses" value={stats.pendingExpenses || 0} icon={ReceiptText} tone="rose" />
        <div className="metric-card">
          <Clock3 size={22} />
          <span>Today</span>
          <strong>{todayAttendance?.clock_in ? `In ${todayAttendance.clock_in}` : 'Not clocked in'}</strong>
          <div className="attendance-buttons">
            {!todayAttendance?.clock_in ? (
              <button className="small-button" onClick={() => clock('clock-in')}>Clock In</button>
            ) : !todayAttendance?.clock_out ? (
              <>
                {breakStatus.onBreak ? (
                  <button className="small-button" onClick={endBreak}>End Break</button>
                ) : (
                  <button className="small-button" onClick={startBreak}>Start Break</button>
                )}
                <button className="small-button" onClick={() => clock('clock-out')}>Clock Out</button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="two-column">
        <div className="surface">
          <h2><Speaker size={20} /> Announcements</h2>
          {(stats.announcements || []).length === 0 ? <p className="muted">No news today.</p> : stats.announcements.map(a => (
            <div key={a.id} className="activity-row">
              <div><strong>{a.title}</strong><span>{a.content}</span></div>
              <time className="table-subtext">{new Date(a.created_at).toLocaleDateString()}</time>
            </div>
          ))}
        </div>
        <Activity title="Recent Leave" rows={stats.recentLeaves || []} getName={(row) => row.users?.name} getMeta={(row) => `${row.leave_types?.name || 'Leave'} - ${row.days} days`} />
        <Activity title="Recent Expenses" rows={stats.recentExpenses || []} getName={(row) => row.users?.name} getMeta={(row) => `${row.category || 'Expense'} - $${row.amount}`} />
      </div>
    </section>
  );
}

function Employees({ employees, canManage, openModal, onEdit, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (emp) => {
    setEditingId(emp.id);
    setEditForm(emp);
  };

  const saveEdit = async () => {
    await onEdit(editingId, editForm);
    setEditingId(null);
  };

  return (
    <section>
      <Toolbar 
        title={`${employees.length} people`}
        canManage={canManage}
        action={canManage ? { label: 'Add Employee', onClick: openModal } : null}
        exportData={{ data: employees, name: 'employees' }}
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Department</th><th>Position</th><th>Role</th><th>Salary</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                {editingId === employee.id ? (
                  <>
                    <td><input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td><input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></td>
                    <td><input value={editForm.department || ''} onChange={e => setEditForm({...editForm, department: e.target.value})} /></td>
                    <td><input value={editForm.position || ''} onChange={e => setEditForm({...editForm, position: e.target.value})} /></td>
                    <td>
                      <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="company_admin">Company Admin</option>
                      </select>
                    </td>
                    <td><input type="number" value={editForm.salary || ''} onChange={e => setEditForm({...editForm, salary: e.target.value})} /></td>
                    <td>
                      <button className="small-button" onClick={saveEdit}>Save</button>
                      <button className="small-button" onClick={() => setEditingId(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.department || '-'}</td>
                    <td>{employee.position || '-'}</td>
                    <td><Status value={employee.role} /></td>
                    <td>{employee.salary ? `$${Number(employee.salary).toLocaleString()}` : '-'}</td>
                    {canManage && (
                      <td className="row-actions">
                        <button onClick={() => startEdit(employee)}>Edit</button>
                        <button onClick={() => onDelete(employee.id, employee.name)}>Delete</button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Leave({ requests, canManage, onNew, onAction, onEdit, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const saveEdit = async () => {
    await onEdit(editingId, { reason: editForm.reason, days: editForm.days });
    setEditingId(null);
  };

  return (
    <section>
      <Toolbar 
        title={`${requests.length} requests`} 
        action={{ label: 'Request Leave', onClick: onNew }}
        exportData={{ data: requests, name: 'leave_requests' }}
      />
      <div className="panel-list">
        {requests.map((request) => (
          <div className="panel-row" key={request.id}>
            {editingId === request.id ? (
              <>
                <input value={editForm.reason} onChange={e => setEditForm({...editForm, reason: e.target.value})} />
                <input type="number" value={editForm.days} onChange={e => setEditForm({...editForm, days: e.target.value})} />
                <button onClick={saveEdit}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <div>
                  <strong>{request.users?.name}</strong>
                  <span>{request.leave_types?.name} from {request.start_date} to {request.end_date}</span>
                </div>
                <Status value={request.status} />
                {canManage && request.status === 'pending' && (
                  <div className="row-actions">
                    <button onClick={() => onAction(request.id, 'approve')}>Approve</button>
                    <button onClick={() => onAction(request.id, 'reject')}>Reject</button>
                    <button onClick={() => { setEditingId(request.id); setEditForm(request); }}>Edit</button>
                    <button onClick={() => onDelete(request.id)}>Delete</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Attendance({ records, clock, employees }) {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');

  const data = Array.isArray(records) ? records : (records?.data || []);

  const processedRecords = useMemo(() => {
    const dayRecords = data.filter(r => r.date === dateFilter);
    
    return employees.map(emp => {
      const record = dayRecords.find(r => r.employee_id === emp.id);
      if (record) return record;
      
      return {
        id: `absent-${emp.id}`,
        employee_id: emp.id,
        users: { name: emp.name },
        date: dateFilter,
        clock_in: null,
        clock_out: null,
        total_hours: null,
        status: 'absent'
      };
    });
  }, [data, employees, dateFilter]);

  const filteredRecords = useMemo(() => {
    if (statusFilter === 'all') return processedRecords;
    return processedRecords.filter(r => r.status === statusFilter);
  }, [processedRecords, statusFilter]);

  return (
    <section>
      <Toolbar 
        title={`${filteredRecords.length} people`} 
        actions={[
          { label: 'Clock In', onClick: () => clock('clock-in') },
          { label: 'Clock Out', onClick: () => clock('clock-out') }
        ]}
        exportData={{ data: filteredRecords, name: `attendance-${dateFilter}` }}
      />
      <div className="surface" style={{ display: 'flex', gap: '12px', marginBottom: '12px', padding: '12px' }}>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>
      </div>
      <Table columns={['Employee', 'Date', 'In', 'Out', 'Hours', 'Status']} rows={filteredRecords.map((record) => [
        record.users?.name || '-',
        record.date,
        record.clock_in || '-',
        record.clock_out || '-',
        record.total_hours || '-',
        <Status value={record.status} />
      ])} />
    </section>
  );
}

function Payroll({ runs, canManage, processPayroll, onDelete }) {
  return (
    <section>
      <Toolbar 
        title={`${runs.length} payroll runs`} 
        action={canManage ? { label: 'Process This Month', onClick: processPayroll } : null}
        exportData={{ data: runs, name: 'payroll_runs' }}
      />
      <Table columns={['Period', 'Status', 'Gross', 'Deductions', 'Net', 'Actions']} rows={runs.map((run) => [
        `${run.month}/${run.year}`,
        run.status,
        `$${Number(run.total_salary).toLocaleString()}`,
        `$${Number(run.total_deductions).toLocaleString()}`,
        `$${Number(run.net_payable).toLocaleString()}`,
        canManage ? (
          <div className="row-actions">
            <button onClick={() => onDelete(run.id)}>Delete</button>
          </div>
        ) : '-'
      ])} />
    </section>
  );
}

function Expenses({ expenses, onNew, canManage, onAction, onEdit, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [dateRange, setDateRange] = useState('all');

  const saveEdit = async () => {
    await onEdit(editingId, { amount: editForm.amount, description: editForm.description });
    setEditingId(null);
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    return expenses.filter(exp => {
      if (dateRange === 'today') return exp.date === today;
      if (dateRange === 'week') return exp.date >= sevenDaysAgo;
      if (dateRange === 'month') return exp.date >= firstOfMonth;
      return true;
    });
  }, [expenses, dateRange]);

  const filteredStats = useMemo(() => {
    const total = filtered.reduce((sum, exp) => sum + Number(exp.amount), 0);
    return { count: filtered.length, total };
  }, [filtered]);

  const overallStats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    const todayTotal = expenses.filter(e => e.date === today).reduce((s, e) => s + Number(e.amount), 0);
    const monthTotal = expenses.filter(e => e.date >= firstOfMonth).reduce((s, e) => s + Number(e.amount), 0);
    
    return { todayTotal, monthTotal };
  }, [expenses]);

  return (
    <section>
      <Toolbar 
        title={`${expenses.length} claims`} 
        action={{ label: 'New Expense', onClick: onNew }}
        exportData={{ data: expenses, name: 'expenses' }}
      />
      <div className="surface" style={{ display: 'flex', gap: '12px', marginBottom: '12px', padding: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`small-button ${dateRange === 'all' ? 'active' : ''}`} style={{ marginTop: 0 }} onClick={() => setDateRange('all')}>All</button>
          <button className={`small-button ${dateRange === 'today' ? 'active' : ''}`} style={{ marginTop: 0 }} onClick={() => setDateRange('today')}>Today</button>
          <button className={`small-button ${dateRange === 'week' ? 'active' : ''}`} style={{ marginTop: 0 }} onClick={() => setDateRange('week')}>Last 7 Days</button>
          <button className={`small-button ${dateRange === 'month' ? 'active' : ''}`} style={{ marginTop: 0 }} onClick={() => setDateRange('month')}>This Month</button>
        </div>
        <div style={{ fontSize: '14px', fontWeight: '500' }}>
           Filtered: {filteredStats.count} | ${filteredStats.total.toLocaleString()}
           <span className="muted" style={{ marginLeft: '12px' }}>(Today: ${overallStats.todayTotal.toLocaleString()} | Month: ${overallStats.monthTotal.toLocaleString()})</span>
        </div>
      </div>
      <div className="panel-list">
        {filtered.map((expense) => (
          <div className="panel-row" key={expense.id}>
            {editingId === expense.id ? (
              <>
                <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                <input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                <button onClick={saveEdit}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <div>
                  <strong>{expense.users?.name} - ${expense.amount}</strong>
                  <span>{expense.category || 'General'} on {expense.date}</span>
                </div>
                <Status value={expense.status} />
                {canManage && (
                  <div className="row-actions">
                    {expense.status === 'pending' && (
                      <>
                        <button onClick={() => onAction(expense.id, 'approve')}>Approve</button>
                        <button onClick={() => onAction(expense.id, 'reject')}>Reject</button>
                      </>
                    )}
                    <button onClick={() => { setEditingId(expense.id); setEditForm(expense); }}>Edit</button>
                    <button onClick={() => onDelete(expense.id)}>Delete</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Performance({ reviews }) {
  return (
    <section>
      <Toolbar title={`${reviews.length} reviews`} />
      <Table columns={['Employee', 'Reviewer', 'Period', 'Rating', 'Status']} rows={reviews.map((review) => [
        review.users?.name || '-',
        review.reviewer?.name || '-',
        `${review.review_period_start} to ${review.review_period_end}`,
        review.overall_rating || '-',
        review.status
      ])} />
    </section>
  );
}

function Recruitment({ jobs, applications, canManage, onCreateJob, onStatusChange, onHire, company }) {
  return (
    <section className="two-stack">
      <div>
        <Toolbar 
          title={`${jobs.length} job posts`} 
          action={canManage ? { label: 'Post New Job', onClick: onCreateJob } : null}
        />
        <Table columns={['Title', 'Department', 'Location', 'Type', 'Status']} rows={jobs.map((job) => [
          job.title,
          job.department || '-',
          job.location || '-',
          job.employment_type || '-',
          job.status
        ])} />
        
        {canManage && company && (
          <div className="surface" style={{ marginTop: '24px' }}>
            <h3>Share Job Openings</h3>
            <p className="muted" style={{ marginBottom: '12px' }}>Copy this code to your company website to show open positions:</p>
            <textarea 
              readOnly 
              style={{ fontFamily: 'monospace', fontSize: '12px', background: '#f8fafc' }}
              value={`<iframe src="${window.location.origin}/careers?subdomain=${company.subdomain}" width="100%" height="600" frameborder="0"></iframe>`}
            />
            <p className="table-subtext" style={{ marginTop: '8px' }}>
              This will only show jobs currently set to <strong>OPEN</strong>.
            </p>
          </div>
        )}
      </div>
      <div>
        <Toolbar title={`${applications.length} applications`} />
        <Table columns={['Applicant', 'Job', 'Status', 'Rating', 'Actions']} rows={applications.map((application) => [
          application.applicant_name,
          application.job_posts?.title || '-',
          <Status value={application.status} />,
          application.rating || '-',
          <div className="row-actions">
            {application.resume_url && (
              <button onClick={() => window.open(application.resume_url, '_blank')} title="View CV">📄</button>
            )}
            {canManage && application.status === 'applied' && (
              <button onClick={() => onStatusChange(application.id, 'interviewing')} title="Schedule Interview">🗓️</button>
            )}
            {canManage && application.status === 'interviewing' && (
              <>
                <button onClick={() => onHire(application)} title="Hire">✅</button>
                <button onClick={() => onStatusChange(application.id, 'rejected')} title="Reject">❌</button>
              </>
            )}
          </div>
        ])} />
      </div>
    </section>
  );
}

function Documents({ documents }) {
  return (
    <section>
      <Toolbar title={`${documents.length} documents`} />
      <Table columns={['Employee', 'Name', 'Type', 'Uploaded', 'Link']} rows={documents.map((document) => [
        document.users?.name || '-',
        document.name,
        document.type || '-',
        new Date(document.uploaded_at).toLocaleDateString(),
        document.file_url ? <a href={document.file_url} target="_blank" rel="noreferrer">Open</a> : '-'
      ])} />
    </section>
  );
}

function Assets({ assets, employees, canManage, refresh, onDelete, onEdit, onNew }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm(a);
  };

  async function assignAsset(assetId, employeeId) {
    await api.patch(`/api/assets/${assetId}`, { employee_id: employeeId, status: employeeId ? 'assigned' : 'available', assigned_at: employeeId ? new Date() : null });
    refresh();
  }

  const saveEdit = async () => {
    await onEdit(editingId, { name: editForm.name, category: editForm.category, serial_number: editForm.serial_number, status: editForm.status });
    setEditingId(null);
  };

  return (
    <section>
      <Toolbar 
        title={`${assets.length} items`} 
        action={canManage ? { label: 'Add New Asset', onClick: onNew } : null}
      />
      <Table 
        columns={['Item', 'Serial', 'Status', 'Assigned To', 'Actions']} 
        rows={assets.map(a => [
          editingId === a.id ? (
            <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
          ) : a.name,
          editingId === a.id ? (
            <input value={editForm.serial_number} onChange={e => setEditForm({...editForm, serial_number: e.target.value})} />
          ) : (a.serial_number || '-'),
          editingId === a.id ? (
            <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
            </select>
          ) : <Status value={a.status} />,
          <select value={a.employee_id || ''} onChange={(e) => assignAsset(a.id, e.target.value)}>
            <option value="">Unassigned (Available)</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>,
          canManage ? (
            <div className="row-actions">
              {editingId === a.id ? (
                <button onClick={saveEdit}>Save</button>
              ) : (
                <button onClick={() => startEdit(a)}>Edit</button>
              )}
              <button onClick={() => onDelete(a.id, a.name)}>Delete</button>
            </div>
          ) : '-'
        ])} 
      />
    </section>
  );
}

function Toolbar({ title, action, actions = [], exportData }) {
  return (
    <div className="toolbar">
      <h2>{title}</h2>
      <div>
        {exportData && (
          <ExportDropdown data={exportData.data} type={exportData.name} label="Export" />
        )}
        {action && (
          <button className="primary-button" onClick={action.onClick}>
            <Plus size={16} />
            {action.label}
          </button>
        )}
        {actions.map((item) => (
          <button className="primary-button" key={item.label} onClick={item.onClick}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = '' }) {
  return (
    <div className={`metric-card ${tone}`}>
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Activity({ title, rows, getName, getMeta }) {
  return (
    <div className="surface">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="muted">No recent activity</p> : rows.map((row) => (
        <div className="activity-row" key={row.id}>
          <div>
            <strong>{getName(row) || 'Unknown'}</strong>
            <span>{getMeta(row)}</span>
          </div>
          <Status value={row.status} />
        </div>
      ))}
    </div>
  );
}

function Table({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length}>No records yet</td></tr>
          ) : rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeAudit({ employeeId, employees, assets, onClose }) {
  const employee = useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
  const employeeAssets = useMemo(() => assets.filter(a => a.employee_id === employeeId), [assets, employeeId]);
  const [attendance, setAttendance] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAttendance(1);
  }, [employeeId]);

  async function loadAttendance(page) {
    setLoading(true);
    try {
      const res = await api.get(`/api/attendance?employee_id=${employeeId}&page=${page}&limit=${pagination.limit}`);
      setAttendance(res.data || []);
      setPagination(prev => ({ ...prev, page, total: res.pagination?.total || 0 }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!employee) return null;

  return (
    <Modal title={`Full Record: ${employee.name}`} close={onClose}>
      <div style={{ display: 'grid', gap: '20px' }}>
        <div className="detail-grid" style={{ marginTop: 0 }}>
          <div className="detail-item"><span>Role</span><strong>{employee.role}</strong></div>
          <div className="detail-item"><span>Department</span><strong>{employee.department || 'Not set'}</strong></div>
          <div className="detail-item"><span>Salary</span><strong>{employee.salary ? `$${Number(employee.salary).toLocaleString()}` : 'Not set'}</strong></div>
          <div className="detail-item"><span>Email</span><strong>{employee.email}</strong></div>
        </div>
        
        <div className="surface">
          <h3 style={{ margin: '0 0 10px 0' }}>Assigned Assets</h3>
          {employeeAssets.length === 0 ? <p className="muted">No assets assigned.</p> : (
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              {employeeAssets.map(a => (
                <li key={a.id}>{a.name} ({a.serial_number || 'No serial'}) - {a.status}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface">
          <h3 style={{ margin: '0 0 10px 0' }}>Attendance History</h3>
          <div className="table-wrap" style={{ marginTop: '8px' }}>
            {loading ? <p>Loading history...</p> : (
              <table style={{ minWidth: '100%' }}>
                <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Hours</th></tr></thead>
                <tbody>
                  {attendance.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.clock_in || '-'}</td>
                      <td>{r.clock_out || '-'}</td>
                      <td>{r.total_hours || '-'}</td>
                    </tr>
                  ))}
                  {attendance.length === 0 && <tr><td colSpan="4">No history found</td></tr>}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '12px' }}>
             <button className="small-button" style={{ marginTop: 0 }} disabled={pagination.page === 1} onClick={() => loadAttendance(pagination.page - 1)}>Prev</button>
             <span style={{ alignSelf: 'center', fontSize: '13px' }}>Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit) || 1}</span>
             <button className="small-button" style={{ marginTop: 0 }} disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)} onClick={() => loadAttendance(pagination.page + 1)}>Next</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Status({ value }) {
  return <span className={`status ${value}`}>{value}</span>;
}

function Modal({ title, close, children }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={close}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function WrappedApp() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
