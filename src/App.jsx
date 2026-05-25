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
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  ReceiptText,
  Shield,
  Speaker,
  Users
} from 'lucide-react';
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
  { id: 'superadmin', label: 'Super Admin', icon: Shield, role: 'super_admin' }
];

const emptyEmployee = { name: '', email: '', department: '', position: '', salary: '', hire_date: '', phone: '' };
const emptyLeave = { employee_id: '', leave_type_id: '', start_date: '', end_date: '', days: 1, reason: '' };
const emptyExpense = { category: '', amount: '', description: '', date: '' };

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
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    company_name: '',
    subdomain: '',
    name: '',
    email: '',
    password: ''
  });

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
    if (error) setAuthError(error.message);
  }

  async function handleRegister(event) {
    event.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      await api.post('/api/auth/register', registerForm);
      setAuthMode('login');
      setLoginForm({ email: registerForm.email, password: '' });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitEmployee(event) {
    event.preventDefault();
    await api.post('/api/employees', employeeForm);
    setEmployeeForm(emptyEmployee);
    setModal('');
    hr.refresh();
  }

  async function submitLeave(event) {
    event.preventDefault();
    await api.post('/api/leave-requests', leaveForm);
    setLeaveForm(emptyLeave);
    setModal('');
    hr.refresh();
  }

  async function submitExpense(event) {
    event.preventDefault();
    await api.post('/api/expenses', expenseForm);
    setExpenseForm(emptyExpense);
    setModal('');
    hr.refresh();
  }

  async function approveLeave(id, action) {
    await api.patch(`/api/leave-requests/${id}/${action}`);
    hr.refresh();
  }

  async function approveExpense(id, action) {
    await api.patch(`/api/expenses/${id}/${action}`);
    hr.refresh();
  }

  async function clock(action) {
    await api.post(`/api/attendance/${action}`, {});
    hr.refresh();
  }

  async function processPayroll() {
    const now = new Date();
    await api.post('/api/payroll/process', {
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });
    hr.refresh();
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstallButton(false);
    }
    setDeferredPrompt(null);
  }

  const todayAttendance = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return hr.attendance.find((entry) => entry.date === today && entry.employee_id === profile?.id);
  }, [hr.attendance, profile?.id]);

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
          {tabs.filter((tab) => !tab.role || tab.role === profile?.role).map((tab) => {
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
            {activeTab === 'dashboard' && <Dashboard stats={hr.stats} todayAttendance={todayAttendance} clock={clock} />}
            {activeTab === 'employees' && <Employees employees={hr.employees} canManage={canManage} openModal={() => setModal('employee')} />}
            {activeTab === 'leave' && <Leave requests={hr.leaveRequests} canManage={canManage} onNew={() => setModal('leave')} onAction={approveLeave} />}
            {activeTab === 'attendance' && <Attendance records={hr.attendance} clock={clock} />}
            {activeTab === 'payroll' && <Payroll runs={hr.payrollRuns} canManage={canManage} processPayroll={processPayroll} />}
            {activeTab === 'performance' && <Performance reviews={hr.reviews} />}
            {activeTab === 'expenses' && <Expenses expenses={hr.expenses} onNew={() => setModal('expense')} canManage={canManage} onAction={approveExpense} />}
            {activeTab === 'assets' && <Assets assets={hr.assets || []} employees={hr.employees} canManage={canManage} refresh={hr.refresh} />}
            {activeTab === 'recruitment' && <Recruitment jobs={hr.jobs} applications={hr.applications} />}
            {activeTab === 'documents' && <Documents documents={hr.documents} />}
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
    </div>
  );
}

function Dashboard({ stats, todayAttendance, clock }) {
  return (
    <section>
      <div className="metric-grid">
        <Metric label="Employees" value={stats.totalEmployees || 0} icon={Users} />
        <Metric label="Pending Leave" value={stats.pendingLeaves || 0} icon={CalendarCheck} tone="amber" />
        <Metric label="Pending Expenses" value={stats.pendingExpenses || 0} icon={ReceiptText} tone="rose" />
        <div className="metric-card">
          <Clock3 size={22} />
          <span>Today</span>
          <strong>{todayAttendance?.clock_in ? `In ${todayAttendance.clock_in}` : 'Not clocked in'}</strong>
          <button className="small-button" onClick={() => clock(todayAttendance?.clock_in && !todayAttendance?.clock_out ? 'clock-out' : 'clock-in')}>
            {todayAttendance?.clock_in && !todayAttendance?.clock_out ? 'Clock Out' : 'Clock In'}
          </button>
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

function Employees({ employees, canManage, openModal }) {
  return (
    <section>
      <Toolbar title={`${employees.length} people`} action={canManage ? { label: 'Add Employee', onClick: openModal } : null} />
      <Table columns={['Name', 'Email', 'Department', 'Position', 'Salary']} rows={employees.map((employee) => [
        employee.name,
        employee.email,
        employee.department || '-',
        employee.position || '-',
        employee.salary ? `$${Number(employee.salary).toLocaleString()}` : '-'
      ])} />
    </section>
  );
}

function Leave({ requests, canManage, onNew, onAction }) {
  return (
    <section>
      <Toolbar title={`${requests.length} requests`} action={{ label: 'Request Leave', onClick: onNew }} />
      <div className="panel-list">
        {requests.map((request) => (
          <div className="panel-row" key={request.id}>
            <div>
              <strong>{request.users?.name}</strong>
              <span>{request.leave_types?.name} from {request.start_date} to {request.end_date}</span>
            </div>
            <Status value={request.status} />
            {canManage && request.status === 'pending' && (
              <div className="row-actions">
                <button onClick={() => onAction(request.id, 'approve')}>Approve</button>
                <button onClick={() => onAction(request.id, 'reject')}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Attendance({ records, clock }) {
  return (
    <section>
      <Toolbar title={`${records.length} records`} actions={[
        { label: 'Clock In', onClick: () => clock('clock-in') },
        { label: 'Clock Out', onClick: () => clock('clock-out') }
      ]} />
      <Table columns={['Employee', 'Date', 'In', 'Out', 'Hours', 'Status']} rows={records.map((record) => [
        record.users?.name || '-',
        record.date,
        record.clock_in || '-',
        record.clock_out || '-',
        record.total_hours || '-',
        record.status
      ])} />
    </section>
  );
}

function Payroll({ runs, canManage, processPayroll }) {
  return (
    <section>
      <Toolbar title={`${runs.length} payroll runs`} action={canManage ? { label: 'Process This Month', onClick: processPayroll } : null} />
      <Table columns={['Period', 'Status', 'Gross', 'Deductions', 'Net']} rows={runs.map((run) => [
        `${run.month}/${run.year}`,
        run.status,
        `$${Number(run.total_salary).toLocaleString()}`,
        `$${Number(run.total_deductions).toLocaleString()}`,
        `$${Number(run.net_payable).toLocaleString()}`
      ])} />
    </section>
  );
}

function Expenses({ expenses, onNew, canManage, onAction }) {
  return (
    <section>
      <Toolbar title={`${expenses.length} claims`} action={{ label: 'New Expense', onClick: onNew }} />
      <div className="panel-list">
        {expenses.map((expense) => (
          <div className="panel-row" key={expense.id}>
            <div>
              <strong>{expense.users?.name} - ${expense.amount}</strong>
              <span>{expense.category || 'General'} on {expense.date}</span>
            </div>
            <Status value={expense.status} />
            {canManage && expense.status === 'pending' && (
              <div className="row-actions">
                <button onClick={() => onAction(expense.id, 'approve')}>Approve</button>
                <button onClick={() => onAction(expense.id, 'reject')}>Reject</button>
              </div>
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

function Recruitment({ jobs, applications }) {
  return (
    <section className="two-stack">
      <div>
        <Toolbar title={`${jobs.length} job posts`} />
        <Table columns={['Title', 'Department', 'Location', 'Type', 'Status']} rows={jobs.map((job) => [
          job.title,
          job.department || '-',
          job.location || '-',
          job.employment_type || '-',
          job.status
        ])} />
      </div>
      <div>
        <Toolbar title={`${applications.length} applications`} />
        <Table columns={['Applicant', 'Email', 'Job', 'Status', 'Rating']} rows={applications.map((application) => [
          application.applicant_name,
          application.applicant_email,
          application.job_posts?.title || '-',
          application.status,
          application.rating || '-'
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

function Assets({ assets, employees, canManage, refresh }) {
  async function assignAsset(assetId, employeeId) {
    await api.patch(`/api/assets/${assetId}`, { employee_id: employeeId, status: employeeId ? 'assigned' : 'available', assigned_at: employeeId ? new Date() : null });
    refresh();
  }

  return (
    <section>
      <Toolbar title={`${assets.length} items`} />
      <Table columns={['Item', 'Serial', 'Status', 'Assigned To', 'Action']} rows={assets.map(a => [
        a.name, a.serial_number || '-', a.status, a.users?.name || 'Available',
        canManage ? <select value={a.employee_id || ''} onChange={(e) => assignAsset(a.id, e.target.value)}>
          <option value="">Unassign</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select> : '-'
      ])} />
    </section>
  );
}

function Toolbar({ title, action, actions = [] }) {
  const allActions = action ? [action, ...actions] : actions;
  return (
    <div className="toolbar">
      <h2>{title}</h2>
      <div>
        {allActions.map((item) => (
          <button className="primary-button" key={item.label} onClick={item.onClick}>
            <Plus size={16} />
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

export default App;
