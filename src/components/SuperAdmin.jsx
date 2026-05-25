import { useEffect, useState } from 'react';
import {
  Activity,
  Ban,
  BarChart3,
  Building2,
  CheckCircle,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  Mail,
  PieChart,
  RefreshCw,
  Shield,
  Trash2,
  TrendingUp,
  Users,
  XCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

const adminTabs = [
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'audit', label: 'Audit Logs', icon: Activity },
  { id: 'announcements', label: 'Announcements', icon: Mail }
];

export function SuperAdmin() {
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('companies');
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError('');

    const [companiesResult, statsResult, logsResult] = await Promise.allSettled([
      api.get('/api/admin/companies'),
      api.get('/api/admin/stats'),
      api.get('/api/admin/audit-logs?limit=50')
    ]);

    if (companiesResult.status === 'fulfilled') setCompanies(companiesResult.value);
    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    if (logsResult.status === 'fulfilled') setAuditLogs(logsResult.value.data || []);

    const firstError = [companiesResult, statsResult, logsResult].find((result) => result.status === 'rejected');
    if (firstError) setError(firstError.reason.message);

    setLoading(false);
  }

  async function updateCompany(companyId, changes) {
    await api.patch(`/api/admin/companies/${companyId}`, changes);
    loadAllData();
  }

  async function deleteCompany(companyId) {
    if (!confirm('Delete this company and all company data?')) return;
    await api.delete(`/api/admin/companies/${companyId}`);
    setSelectedCompany(null);
    loadAllData();
  }

  async function sendAnnouncement(event) {
    event.preventDefault();
    await api.post('/api/admin/announcements', announcement);
    setAnnouncement({ title: '', message: '' });
    alert('Announcement sent to all companies.');
  }

  async function exportReport(type) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.open(`${baseUrl}/api/admin/export/${type}?token=${encodeURIComponent(token)}`, '_blank');
  }

  if (loading) {
    return (
      <div className="empty-state">
        <RefreshCw className="spin" size={34} />
        <h2>Loading super admin dashboard...</h2>
      </div>
    );
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-hero">
        <div>
          <p className="eyebrow">System Control</p>
          <h2>Super Admin Dashboard</h2>
          <span>Manage companies, subscriptions, analytics, audit logs, and broadcasts.</span>
        </div>
        <div className="admin-actions">
          <button className="primary-button" onClick={() => exportReport('companies')}><Download size={16} /> Export Companies</button>
          <button className="primary-button" onClick={() => exportReport('revenue')}><Download size={16} /> Export Revenue</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {stats && (
        <div className="metric-grid">
          <AdminMetric label="Total Companies" value={stats.total_companies || 0} icon={Building2} />
          <AdminMetric label="Total Employees" value={stats.total_employees || 0} icon={Users} tone="green" />
          <AdminMetric label="Monthly Revenue" value={`$${Number(stats.mrr || 0).toLocaleString()}`} icon={DollarSign} tone="purple" />
          <AdminMetric label="Active Subscriptions" value={stats.active_subscriptions || 0} icon={CreditCard} tone="orange" />
        </div>
      )}

      <div className="admin-tabs">
        {adminTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'companies' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Subdomain</th>
                <th>Employees</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Trial Ends</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>
                    <strong>{company.name}</strong>
                    <span className="table-subtext">{company.email}</span>
                  </td>
                  <td>{company.subdomain}</td>
                  <td>{company.active_employees || 0}</td>
                  <td>
                    <select value={company.subscription_plan || 'basic'} onChange={(event) => updateCompany(company.id, { subscription_plan: event.target.value })}>
                      <option value="basic">Basic ($29)</option>
                      <option value="pro">Pro ($99)</option>
                      <option value="enterprise">Enterprise ($299)</option>
                    </select>
                  </td>
                  <td><StatusBadge value={company.subscription_status} /></td>
                  <td>{company.trial_ends_at ? new Date(company.trial_ends_at).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="icon-actions">
                      <button title="View details" onClick={() => setSelectedCompany(company)}><Eye size={17} /></button>
                      {company.subscription_status === 'active' ? (
                        <button title="Block company" onClick={() => updateCompany(company.id, { subscription_status: 'expired' })}><Ban size={17} /></button>
                      ) : (
                        <button title="Activate company" onClick={() => updateCompany(company.id, { subscription_status: 'active' })}><CheckCircle size={17} /></button>
                      )}
                      <button title="Delete company" onClick={() => deleteCompany(company.id)}><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'analytics' && stats && (
        <div className="two-column">
          <div className="surface">
            <h2><TrendingUp size={20} /> Revenue Overview</h2>
            <RevenueRow label="Basic Plan ($29/mo)" data={stats.revenue_by_plan?.basic} />
            <RevenueRow label="Pro Plan ($99/mo)" data={stats.revenue_by_plan?.pro} />
            <RevenueRow label="Enterprise ($299/mo)" data={stats.revenue_by_plan?.enterprise} />
            <div className="summary-row">
              <strong>Total MRR</strong>
              <strong>${Number(stats.total_mrr || stats.mrr || 0).toLocaleString()}</strong>
            </div>
          </div>
          <div className="surface">
            <h2><PieChart size={20} /> System Statistics</h2>
            <StatLine label="Total Companies" value={stats.total_companies || 0} />
            <StatLine label="Total Employees" value={stats.total_employees || 0} />
            <StatLine label="Total Payroll Runs" value={stats.total_payrolls || 0} />
            <StatLine label="Total Leave Requests" value={stats.total_leave_requests || 0} />
            <StatLine label="Growth Rate" value={`${stats.growth_percentage || 0}%`} />
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="surface">
          <h2><Activity size={20} /> Recent Activity Across Companies</h2>
          <div className="audit-list">
            {auditLogs.length === 0 ? <p className="muted">No audit logs yet</p> : auditLogs.map((log) => (
              <div className="audit-row" key={log.id}>
                <div>
                  <strong>{log.action}</strong>
                  <span>Company: {log.companies?.name || '-'} | User: {log.users?.email || '-'}</span>
                  {log.details && <code>{JSON.stringify(log.details)}</code>}
                </div>
                <time>{new Date(log.created_at).toLocaleString()}</time>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="surface admin-form-surface">
          <h2><Mail size={20} /> Send Announcement</h2>
          <form className="form-stack" onSubmit={sendAnnouncement}>
            <label>Title<input required value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} /></label>
            <label>Message<textarea required rows="5" value={announcement.message} onChange={(event) => setAnnouncement({ ...announcement, message: event.target.value })} /></label>
            <button className="primary-button" type="submit"><Mail size={16} /> Send Announcement</button>
          </form>
        </div>
      )}

      {selectedCompany && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal company-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>{selectedCompany.name}</h2>
              <button onClick={() => setSelectedCompany(null)}><XCircle size={18} /> Close</button>
            </div>
            <div className="detail-grid">
              <Detail label="Email" value={selectedCompany.email} />
              <Detail label="Subdomain" value={selectedCompany.subdomain} />
              <Detail label="Phone" value={selectedCompany.phone || '-'} />
              <Detail label="Created" value={new Date(selectedCompany.created_at).toLocaleDateString()} />
              <Detail label="Plan" value={selectedCompany.subscription_plan || 'basic'} />
              <Detail label="Status" value={selectedCompany.subscription_status || 'trial'} />
              <Detail label="Trial Ends" value={selectedCompany.trial_ends_at ? new Date(selectedCompany.trial_ends_at).toLocaleDateString() : '-'} />
              <Detail label="Address" value={selectedCompany.address || '-'} wide />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AdminMetric({ label, value, icon: Icon, tone = '' }) {
  return (
    <div className={`metric-card admin-metric ${tone}`}>
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ value = 'trial' }) {
  return <span className={`status ${value}`}>{value}</span>;
}

function RevenueRow({ label, data = {} }) {
  return (
    <div className="revenue-row">
      <span>{label}</span>
      <strong>{data.count || 0} companies</strong>
      <strong>${Number(data.revenue || 0).toLocaleString()}</strong>
    </div>
  );
}

function StatLine({ label, value }) {
  return (
    <div className="stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ label, value, wide }) {
  return (
    <div className={wide ? 'detail-item wide' : 'detail-item'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
