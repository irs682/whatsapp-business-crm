import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Clock,
  CheckCircle,
  Users,
  Briefcase,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Building2,
  Calendar,
  Filter,
  RefreshCw,
  Megaphone,
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Eye,
  MessageCircle,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import Button from '../components/common/Button';

export const ReportsPage = () => {
  const { user, hasPermission } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState('executive');

  // Filters
  const [rangePreset, setRangePreset] = useState('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);

  // Data states
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load Departments for filtering
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        if (res.success && res.data) {
          setDepartments(res.data.items || res.data || []);
        }
      } catch (e) {
        console.error('Failed to load departments for filter', e);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch report data on tab or filter change
  const fetchReport = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        range: rangePreset,
      };
      if (rangePreset === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (departmentId) params.departmentId = departmentId;

      const endpointMap = {
        executive: '/reports/executive',
        conversations: '/reports/conversations',
        agents: '/reports/agents',
        departments: '/reports/departments',
        customers: '/reports/contacts',
        leads: '/reports/leads',
        whatsapp: '/reports/whatsapp',
        campaigns: '/reports/campaigns',
        tasks: '/reports/tasks',
      };

      const res = await api.get(endpointMap[activeTab] || '/reports/executive', { params });
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setErrorMsg(err.message || 'Failed to fetch report metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, rangePreset, startDate, endDate, departmentId]);

  // Export report handler
  const handleExport = async () => {
    setExporting(true);
    try {
      const filterParams = { range: rangePreset };
      if (rangePreset === 'custom') {
        if (startDate) filterParams.startDate = startDate;
        if (endDate) filterParams.endDate = endDate;
      }
      if (departmentId) filterParams.departmentId = departmentId;

      const exportTypeMap = {
        executive: 'executive',
        conversations: 'conversations',
        agents: 'agents',
        departments: 'departments',
        customers: 'contacts',
        leads: 'leads',
        whatsapp: 'whatsapp',
        campaigns: 'campaigns',
        tasks: 'tasks',
      };

      const response = await api.post(
        '/reports/export',
        {
          type: exportTypeMap[activeTab] || 'executive',
          filters: filterParams,
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Report export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    { id: 'executive', name: 'Executive Overview', icon: TrendingUp },
    { id: 'conversations', name: 'Conversations & SLA', icon: Clock },
    { id: 'agents', name: 'Agent Performance', icon: Users },
    { id: 'departments', name: 'Department Flows', icon: Building2 },
    { id: 'customers', name: 'Customers & Contacts', icon: Users },
    { id: 'leads', name: 'Lead Pipeline', icon: Briefcase },
    { id: 'whatsapp', name: 'WhatsApp Messaging', icon: MessageSquare },
    { id: 'campaigns', name: 'Campaign Analytics', icon: Megaphone },
    { id: 'tasks', name: 'Tasks & Follow-ups', icon: CheckSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Management Intelligence & Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real database aggregations, SLA tracking, agent productivity, and conversion intelligence
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={exporting || loading}>
            <Download className="w-4 h-4 mr-1.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-brand-400" />
              Period:
            </span>
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {rangePreset === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-brand-500"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            {departments.length > 0 && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-400 flex items-center">
                  <Building2 className="w-3.5 h-3.5 mr-1 text-brand-400" />
                  Dept:
                </span>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {reportData?.period && (
            <div className="text-[11px] text-slate-400 font-mono">
              Window: {new Date(reportData.period.start).toLocaleDateString()} —{' '}
              {new Date(reportData.period.end).toLocaleDateString()} (UTC)
            </div>
          )}
        </div>
      </Card>

      {/* Module Navigation Tabs */}
      <div className="flex overflow-x-auto space-x-1 border-b border-slate-800 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-brand-500 text-brand-400 bg-slate-900/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-24 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-400" />
          <p className="text-sm">Calculating real database analytics...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE DASHBOARD */}
          {activeTab === 'executive' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Contacts"
                  value={reportData.customers?.total?.toLocaleString() || 0}
                  change={
                    reportData.customers?.growthPercent !== undefined
                      ? `${reportData.customers.growthPercent >= 0 ? '+' : ''}${
                          reportData.customers.growthPercent
                        }% vs prior period`
                      : null
                  }
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Total Pipeline Leads"
                  value={reportData.leads?.total?.toLocaleString() || 0}
                  change={
                    reportData.leads?.growthPercent !== undefined
                      ? `${reportData.leads.growthPercent >= 0 ? '+' : ''}${
                          reportData.leads.growthPercent
                        }% vs prior period`
                      : null
                  }
                  icon={Briefcase}
                  color="emerald"
                />
                <StatCard
                  title="Active Conversations"
                  value={reportData.inbox?.totalActive?.toLocaleString() || 0}
                  change={`${reportData.inbox?.unassigned || 0} in unassigned queue`}
                  icon={MessageSquare}
                  color="purple"
                />
                <StatCard
                  title="Overdue Follow-ups"
                  value={reportData.tasks?.overdue?.toLocaleString() || 0}
                  change={reportData.tasks?.overdue > 0 ? 'Requires immediate action' : 'All tasks up to date'}
                  icon={AlertCircle}
                  color={reportData.tasks?.overdue > 0 ? 'amber' : 'emerald'}
                />
              </div>

              {/* Lead Stage Breakdown & Workload Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Lead Pipeline by Stage">
                  <div className="space-y-3 pt-2">
                    {reportData.leads?.byStage?.length === 0 ? (
                      <p className="text-xs text-slate-500">No leads active in this department / period.</p>
                    ) : (
                      reportData.leads?.byStage?.map((s) => {
                        const totalLeads = reportData.leads.total || 1;
                        const pct = Math.min(100, Math.round((s.count / totalLeads) * 100));
                        return (
                          <div key={s.stage} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-300 font-medium">{s.stage}</span>
                              <span className="text-slate-400">
                                {s.count} leads ({pct}%) • ${Number(s.value || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                              <div className="bg-brand-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>

                <Card title="Marketing & Campaign Impact">
                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Campaigns</span>
                      <span className="text-xl font-bold text-white mt-1 block">
                        {reportData.campaigns?.completed} / {reportData.campaigns?.total}
                      </span>
                      <span className="text-[11px] text-slate-400">Completed / Total</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Total Recipients
                      </span>
                      <span className="text-xl font-bold text-white mt-1 block">
                        {reportData.campaigns?.totalRecipients?.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400">Target Audience</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Delivered Messages</span>
                      <span className="text-xl font-bold text-emerald-400 mt-1 block">
                        {reportData.campaigns?.delivered?.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {reportData.campaigns?.read?.toLocaleString()} read
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Engagement</span>
                      <span className="text-xl font-bold text-purple-400 mt-1 block">
                        {reportData.campaigns?.replies?.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {reportData.campaigns?.optOuts?.toLocaleString()} opt-outs
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: CONVERSATIONS & SLA */}
          {activeTab === 'conversations' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Conversations"
                  value={reportData.volume?.total || 0}
                  change={`${reportData.volume?.open || 0} open, ${reportData.volume?.pending || 0} pending`}
                  icon={MessageSquare}
                  color="blue"
                />
                <StatCard
                  title="Avg First Response (FRT)"
                  value={`${reportData.performance?.averageFirstResponseMinutes || 0} min`}
                  change={`Median: ${reportData.performance?.medianFirstResponseMinutes || 0} min (${
                    reportData.performance?.evaluatedFRTSampleSize || 0
                  } samples)`}
                  icon={Clock}
                  color="emerald"
                />
                <StatCard
                  title="Avg Resolution Time"
                  value={`${reportData.performance?.averageResolutionHours || 0} hrs`}
                  change={`Median: ${reportData.performance?.medianResolutionHours || 0} hrs`}
                  icon={CheckCircle}
                  color="purple"
                />
                <StatCard
                  title="Reopen Rate"
                  value={`${reportData.performance?.reopenRatePercent || 0}%`}
                  change={`${reportData.performance?.reopenCount || 0} reopen events`}
                  icon={AlertCircle}
                  color="amber"
                />
              </div>

              {/* Department & Daily Volume Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Conversation Volume by Department">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5">Department</th>
                          <th className="py-2.5 text-right">Conversations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {reportData.trends?.byDepartment?.map((d) => (
                          <tr key={d.department} className="hover:bg-slate-800/40">
                            <td className="py-2.5 font-medium">{d.department}</td>
                            <td className="py-2.5 text-right font-semibold text-brand-400">{d.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card title="Daily Inbound Volume History">
                  <div className="space-y-2 pt-2">
                    {reportData.trends?.daily?.length === 0 ? (
                      <p className="text-xs text-slate-500">No message traffic recorded in period.</p>
                    ) : (
                      reportData.trends?.daily?.map((day) => (
                        <div key={day.date} className="flex items-center justify-between text-xs py-1">
                          <span className="font-mono text-slate-400">{day.date}</span>
                          <span className="font-semibold text-white">{day.count} chats</span>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 3: AGENT PERFORMANCE */}
          {activeTab === 'agents' && reportData && (
            <Card title="Agent Productivity & SLA Scorecard">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800 bg-slate-950/40">
                    <tr>
                      <th className="py-3 px-3">Agent</th>
                      <th className="py-3 px-3">Departments</th>
                      <th className="py-3 px-3 text-center">Assigned Chats</th>
                      <th className="py-3 px-3 text-center">Resolved Chats</th>
                      <th className="py-3 px-3 text-center">Completed Tasks</th>
                      <th className="py-3 px-3 text-center">Overdue Tasks</th>
                      <th className="py-3 px-3 text-center">Internal Notes</th>
                      <th className="py-3 px-3 text-center">Transfers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {reportData.agents?.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-500">
                          No agent activity recorded for the selected scope.
                        </td>
                      </tr>
                    ) : (
                      reportData.agents?.map((a) => (
                        <tr key={a.agentId} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-200 block">{a.name}</span>
                            <span className="text-[10px] text-slate-500">{a.email}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {a.departments?.join(', ') || 'Unassigned'}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-white">
                            {a.assignedConversations}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-emerald-400">
                            {a.resolvedConversations}
                          </td>
                          <td className="py-3 px-3 text-center text-blue-400">{a.completedTasks}</td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                a.overdueTasks > 0
                                  ? 'bg-rose-500/20 text-rose-400 font-bold'
                                  : 'text-slate-500'
                              }`}
                            >
                              {a.overdueTasks}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-400">{a.notesWritten}</td>
                          <td className="py-3 px-3 text-center text-slate-400">{a.transfersInitiated}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 4: DEPARTMENT FLOWS */}
          {activeTab === 'departments' && reportData && (
            <Card title="Department Queue & Inter-Department Routing Flow">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800 bg-slate-950/40">
                    <tr>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3 text-center">Active Staff</th>
                      <th className="py-3 px-3 text-center">Active Chats</th>
                      <th className="py-3 px-3 text-center">Unassigned Queue</th>
                      <th className="py-3 px-3 text-center">Active Leads</th>
                      <th className="py-3 px-3 text-center">Transfers In</th>
                      <th className="py-3 px-3 text-center">Transfers Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {reportData.departments?.map((d) => (
                      <tr key={d.departmentId} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-slate-200">{d.name}</td>
                        <td className="py-3 px-3 text-center">{d.activeStaffCount}</td>
                        <td className="py-3 px-3 text-center font-bold text-white">{d.activeConversations}</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              d.unassignedQueueCount > 0
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {d.unassignedQueueCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-blue-400">{d.activeLeads}</td>
                        <td className="py-3 px-3 text-center text-emerald-400 font-medium">+{d.transfersReceived}</td>
                        <td className="py-3 px-3 text-center text-rose-400 font-medium">-{d.transfersHandedOver}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 5: CUSTOMERS & CONTACTS */}
          {activeTab === 'customers' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard
                  title="Total Database Contacts"
                  value={reportData.totalContacts?.toLocaleString() || 0}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="New Contacts in Period"
                  value={reportData.newContactsInPeriod?.toLocaleString() || 0}
                  icon={TrendingUp}
                  color="emerald"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Acquisition by Source">
                  <div className="space-y-2 pt-2">
                    {reportData.bySource?.map((s) => (
                      <div key={s.source} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/60">
                        <span className="text-slate-300">{s.source}</span>
                        <span className="font-semibold text-white">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Marketing Consent Breakdown">
                  <div className="space-y-2 pt-2">
                    {reportData.consentBreakdown?.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/60">
                        <span className="text-slate-300">
                          {c.consentStatus} {c.isOptedOut ? '(Opted Out)' : '(Active)'}
                        </span>
                        <span className="font-semibold text-emerald-400">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 6: LEAD PIPELINE */}
          {activeTab === 'leads' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Active Leads"
                  value={reportData.summary?.totalLeads || 0}
                  change={`+${reportData.summary?.newLeadsInPeriod || 0} in this period`}
                  icon={Briefcase}
                  color="blue"
                />
                <StatCard
                  title="Total Pipeline Value"
                  value={`$${Number(reportData.summary?.totalPipelineValue || 0).toLocaleString()}`}
                  icon={TrendingUp}
                  color="emerald"
                />
                <StatCard
                  title="Won Pipeline Value"
                  value={`$${Number(reportData.summary?.wonPipelineValue || 0).toLocaleString()}`}
                  change={`${reportData.summary?.wonLeadsInPeriod || 0} deals won`}
                  icon={CheckCircle}
                  color="purple"
                />
                <StatCard
                  title="Win Conversion Rate"
                  value={`${reportData.summary?.conversionRatePercent || 0}%`}
                  change="Won / (Won + Lost Decisions)"
                  icon={BarChart3}
                  color="amber"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Pipeline Stages & Valuation">
                  <div className="space-y-3 pt-2">
                    {reportData.stages?.map((s) => (
                      <div key={s.stage} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/60">
                        <div>
                          <span className="font-medium text-slate-200 block">{s.stage}</span>
                          <span className="text-[10px] text-slate-500">{s.count} deals</span>
                        </div>
                        <span className="font-bold text-white">${s.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Lead Distribution by Owner">
                  <div className="space-y-2 pt-2">
                    {reportData.owners?.length === 0 ? (
                      <p className="text-xs text-slate-500">No assigned leads.</p>
                    ) : (
                      reportData.owners?.map((o, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/60">
                          <span className="font-mono text-slate-300">Agent {o.agentId?.slice(0, 8)}...</span>
                          <div className="text-right">
                            <span className="font-semibold text-white block">{o.count} leads</span>
                            <span className="text-[10px] text-slate-500">${o.value.toLocaleString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 7: WHATSAPP MESSAGING */}
          {activeTab === 'whatsapp' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Inbound Messages"
                  value={reportData.metrics?.totalInbound?.toLocaleString() || 0}
                  icon={MessageCircle}
                  color="blue"
                />
                <StatCard
                  title="Total Outbound Messages"
                  value={reportData.metrics?.totalOutbound?.toLocaleString() || 0}
                  icon={Send}
                  color="emerald"
                />
                <StatCard
                  title="Delivery Success Rate"
                  value={`${reportData.metrics?.deliveryRatePercent || 0}%`}
                  change={`${reportData.metrics?.delivered || 0} confirmed delivered`}
                  icon={CheckCircle}
                  color="purple"
                />
                <StatCard
                  title="Confirmed Read Rate"
                  value={`${reportData.metrics?.readRatePercent || 0}%`}
                  change={`${reportData.metrics?.read || 0} read receipts`}
                  icon={Eye}
                  color="amber"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Outbound Status Funnel">
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Sent (Submitted to Cloud API)</span>
                      <span className="font-semibold text-white">{reportData.metrics?.sent}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Delivered to Handset</span>
                      <span className="font-semibold text-emerald-400">{reportData.metrics?.delivered}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Read by Recipient</span>
                      <span className="font-semibold text-purple-400">{reportData.metrics?.read}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Failed / Rejected</span>
                      <span className="font-semibold text-rose-400">{reportData.metrics?.failed}</span>
                    </div>
                  </div>
                </Card>

                <Card title="Message Types">
                  <div className="space-y-2 pt-2 text-xs">
                    {reportData.messageTypes?.map((t) => (
                      <div key={t.type} className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-300">{t.type}</span>
                        <span className="font-semibold text-white">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 8: CAMPAIGN ANALYTICS */}
          {activeTab === 'campaigns' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Audience Reached"
                  value={reportData.summary?.totalRecipients?.toLocaleString() || 0}
                  change={`${reportData.summary?.totalCampaigns || 0} campaigns executed`}
                  icon={Megaphone}
                  color="blue"
                />
                <StatCard
                  title="Delivery Rate"
                  value={`${reportData.summary?.deliveryRatePercent || 0}%`}
                  change={`${reportData.summary?.deliveredCount?.toLocaleString() || 0} delivered`}
                  icon={CheckCircle}
                  color="emerald"
                />
                <StatCard
                  title="Reply Engagement Rate"
                  value={`${reportData.summary?.replyRatePercent || 0}%`}
                  change={`${reportData.summary?.repliedCount || 0} inbound replies`}
                  icon={MessageCircle}
                  color="purple"
                />
                <StatCard
                  title="Opt-Out Rate"
                  value={`${reportData.summary?.optOutRatePercent || 0}%`}
                  change={`${reportData.summary?.optOutCount || 0} unsubscribes`}
                  icon={AlertCircle}
                  color="amber"
                />
              </div>

              <Card title="Campaign Execution History">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800 bg-slate-950/40">
                      <tr>
                        <th className="py-2.5 px-3">Campaign</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Template</th>
                        <th className="py-2.5 px-3 text-center">Recipients</th>
                        <th className="py-2.5 px-3 text-center">Delivered</th>
                        <th className="py-2.5 px-3 text-center">Read</th>
                        <th className="py-2.5 px-3 text-center">Replies</th>
                        <th className="py-2.5 px-3 text-center">Opt-Outs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {reportData.campaigns?.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{c.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                              {c.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{c.templateName}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-white">{c.totalRecipients}</td>
                          <td className="py-2.5 px-3 text-center text-emerald-400 font-semibold">
                            {c.deliveredCount}
                          </td>
                          <td className="py-2.5 px-3 text-center text-purple-400">{c.readCount}</td>
                          <td className="py-2.5 px-3 text-center text-blue-400 font-semibold">{c.repliedCount}</td>
                          <td className="py-2.5 px-3 text-center text-amber-400">{c.optOutCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 9: TASKS & FOLLOW-UPS */}
          {activeTab === 'tasks' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Tasks Created"
                  value={reportData.summary?.totalTasksCreated?.toLocaleString() || 0}
                  icon={CheckSquare}
                  color="blue"
                />
                <StatCard
                  title="Completed Tasks"
                  value={reportData.summary?.completedTasks?.toLocaleString() || 0}
                  change={`${reportData.summary?.completionRatePercent || 0}% completion rate`}
                  icon={CheckCircle}
                  color="emerald"
                />
                <StatCard
                  title="Overdue Tasks"
                  value={reportData.summary?.overdueTasks?.toLocaleString() || 0}
                  change={
                    reportData.summary?.overdueTasks > 0 ? 'Requires attention' : 'Zero overdue items'
                  }
                  icon={AlertCircle}
                  color={reportData.summary?.overdueTasks > 0 ? 'amber' : 'emerald'}
                />
                <StatCard
                  title="Due in Next 48h"
                  value={reportData.summary?.dueSoonTasks?.toLocaleString() || 0}
                  icon={Clock}
                  color="purple"
                />
              </div>

              <Card title="Task Priority Distribution">
                <div className="space-y-2 pt-2 text-xs">
                  {reportData.byPriority?.map((p) => (
                    <div key={p.priority} className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="font-medium text-slate-300">{p.priority}</span>
                      <span className="font-semibold text-white">{p.count} tasks</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
