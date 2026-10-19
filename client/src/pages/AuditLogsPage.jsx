import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertTriangle,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

export const AuditLogsPage = () => {
  const { hasPermission, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const canReadAudit = hasPermission('audit:read');

  const fetchLogs = async (page = 1) => {
    if (!canReadAudit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        page,
        limit: pagination.limit,
      };
      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/audit-logs', { params });
      if (res.success && res.data) {
        setLogs(res.data.items || []);
        setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setErrorMsg(err.message || 'Error fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, entityFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get('/audit-logs/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      alert('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const getActionBadgeColor = (action) => {
    if (/CREATE|ADD|NEW/i.test(action)) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (/UPDATE|CHANGE|EDIT/i.test(action)) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (/DELETE|REMOVE|CANCEL/i.test(action)) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (/EXPORT|DOWNLOAD/i.test(action)) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  if (!canReadAudit) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center max-w-lg mx-auto mt-12">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-400">
          You lack the <code className="text-brand-400 bg-slate-950 px-1.5 py-0.5 rounded">audit:read</code> permission
          required to review enterprise administrative and security audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-brand-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Security & Operational Audit Logs</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Traceable administrative records, lifecycle mutations, role assignments, and export events
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => fetchLogs(pagination.page)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={exporting}>
            <Download className="w-4 h-4 mr-1.5" />
            {exporting ? 'Exporting...' : 'Export Audit CSV'}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <form onSubmit={handleSearchSubmit} className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search action, entity, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </form>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Actions</option>
            <option value="USER_CREATED">User Created</option>
            <option value="USER_UPDATED">User Updated</option>
            <option value="ROLE_CHANGED">Role Changed</option>
            <option value="REPORT_EXPORTED">Report Exported</option>
            <option value="AUDIT_LOG_EXPORTED">Audit Log Exported</option>
            <option value="CAMPAIGN_STARTED">Campaign Started</option>
            <option value="CONVERSATION_TRANSFERRED">Conversation Transferred</option>
            <option value="CONTACT_UPDATED">Contact Updated</option>
          </select>

          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Entities</option>
            <option value="USER">User</option>
            <option value="CONTACT">Contact</option>
            <option value="LEAD">Lead</option>
            <option value="CONVERSATION">Conversation</option>
            <option value="CAMPAIGN">Campaign</option>
            <option value="REPORT">Report</option>
            <option value="AUDIT_LOG">Audit Log</option>
          </select>

          {/* Date Picker Start */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          />
        </div>
      </Card>

      {/* Main Table */}
      <Card>
        {errorMsg && (
          <div className="p-3 mb-4 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800 bg-slate-950/40">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-400" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    No audit records matched the chosen filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actorName = log.actor
                    ? `${log.actor.firstName || ''} ${log.actor.lastName || ''}`.trim() || log.actor.email
                    : 'System / Background';
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-200">{log.entity}</span>
                        {log.entityId && (
                          <span className="block text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                            {log.entityId}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{actorName}</div>
                        {log.actor?.email && <div className="text-[10px] text-slate-500">{log.actor.email}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {log.department?.name || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {log.ipAddress || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Inspect Metadata & States"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4 px-2 text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-medium">{logs.length}</span> of{' '}
            <span className="text-white font-medium">{pagination.total}</span> audit records
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 rounded border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 rounded border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Inspect Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Audit Record Details</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getActionBadgeColor(
                      selectedLog.action
                    )}`}
                  >
                    {selectedLog.action}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Entity</span>
                  <span className="text-slate-200 font-semibold">{selectedLog.entity}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Entity ID</span>
                  <span className="text-slate-200 font-mono text-[11px]">{selectedLog.entityId || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Actor</span>
                  <span className="text-slate-200">
                    {selectedLog.actor?.firstName} {selectedLog.actor?.lastName} ({selectedLog.actor?.email || 'System'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Correlation ID</span>
                  <span className="text-slate-200 font-mono text-[11px]">{selectedLog.correlationId || '—'}</span>
                </div>
              </div>

              {/* Metadata JSON */}
              {selectedLog.metadata && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Metadata (Safe Redacted)</span>
                  <pre className="bg-slate-950 p-3 rounded border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Previous vs New State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedLog.previousState && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Previous State</span>
                    <pre className="bg-slate-950 p-3 rounded border border-slate-800 text-[11px] font-mono text-rose-400 overflow-x-auto max-h-40">
                      {JSON.stringify(selectedLog.previousState, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.newState && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">New State</span>
                    <pre className="bg-slate-950 p-3 rounded border border-slate-800 text-[11px] font-mono text-blue-400 overflow-x-auto max-h-40">
                      {JSON.stringify(selectedLog.newState, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
