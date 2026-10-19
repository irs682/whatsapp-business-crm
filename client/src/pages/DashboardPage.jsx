import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  CheckSquare,
  AlertTriangle,
  Clock,
  DollarSign,
  ArrowUpRight,
  Loader2,
  Activity,
  Calendar,
  Building,
} from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/common/StatCard';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/dashboard/metrics');
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError(err.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
        <p className="text-sm">Calculating real-time CRM metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
        <p className="font-semibold">Unable to load CRM Dashboard</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    );
  }

  const { metrics, stageCounts, recentLeads, recentContacts, recentActivities } = data || {
    metrics: {},
    stageCounts: {},
    recentLeads: [],
    recentContacts: [],
    recentActivities: [],
  };

  const totalLeadsCount = metrics.totalLeads || 0;

  const stageDisplay = [
    { key: 'NEW', label: 'New Inquiries', color: 'bg-blue-500' },
    { key: 'CONTACTED', label: 'Contacted', color: 'bg-cyan-500' },
    { key: 'QUALIFIED', label: 'Qualified', color: 'bg-emerald-500' },
    { key: 'PROPOSAL_SENT', label: 'Proposal Sent', color: 'bg-amber-400' },
    { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-purple-500' },
    { key: 'WON', label: 'Closed Won', color: 'bg-emerald-400' },
    { key: 'LOST', label: 'Closed Lost', color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Executive CRM Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real PostgreSQL database metrics filtered by your authorized department boundaries
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge color="emerald">CRM Core Active</Badge>
          <Badge color="blue">PostgreSQL Connected</Badge>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Contacts"
          value={metrics.totalContacts?.toLocaleString() || '0'}
          change="Accessible in your scope"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Leads"
          value={metrics.totalLeads?.toLocaleString() || '0'}
          change={`${metrics.myAssignedLeads || 0} assigned directly to you`}
          icon={Briefcase}
          color="purple"
        />
        <StatCard
          title="Total Pipeline Value"
          value={`$${(metrics.totalPipelineValue || 0).toLocaleString()}`}
          change="Combined open opportunities"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Tasks Action Items"
          value={`${metrics.tasksDueSoonCount || 0} Due Soon`}
          change={`${metrics.overdueTasksCount || 0} Overdue follow-ups`}
          icon={CheckSquare}
          color={metrics.overdueTasksCount > 0 ? 'rose' : 'amber'}
        />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution */}
        <Card title="Lead Pipeline Stage Distribution" className="lg:col-span-1">
          <div className="space-y-3.5">
            {stageDisplay.map((s) => {
              const count = stageCounts[s.key] || 0;
              const pct = totalLeadsCount > 0 ? Math.round((count / totalLeadsCount) * 100) : 0;
              return (
                <div key={s.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{s.label}</span>
                    <span className="text-slate-400 font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div className={`h-full ${s.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recently Created Leads */}
        <Card title="Recently Active Leads" className="lg:col-span-2">
          {recentLeads.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No leads currently in your pipeline
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block text-sm">{lead.title}</span>
                    <span className="text-slate-400">
                      {lead.contact ? `${lead.contact.firstName || ''} ${lead.contact.lastName || ''} (${lead.contact.phone})` : 'Unlinked Contact'}
                    </span>
                  </div>
                  <div className="text-right flex items-center space-x-3">
                    {lead.value && (
                      <span className="font-mono text-emerald-400 font-medium">
                        ${Number(lead.value).toLocaleString()}
                      </span>
                    )}
                    <Badge color={lead.stage === 'WON' ? 'emerald' : lead.stage === 'LOST' ? 'rose' : 'blue'}>
                      {lead.stage}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Grid: Recent Contacts & Customer Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Updated Contacts */}
        <Card title="Recently Updated Contacts">
          {recentContacts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No contact records found
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentContacts.map((contact) => (
                <div key={contact.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-brand-400">
                      {contact.firstName ? contact.firstName[0] : 'C'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-200 block">
                        {contact.firstName} {contact.lastName}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">{contact.phone}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">{contact.company || 'Direct Client'}</span>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(contact.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Real Customer Activity History Stream */}
        <Card title="Customer Interaction Activity Stream">
          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No recent activity recorded
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentActivities.map((act) => (
                <div key={act.id} className="py-2.5 flex items-start space-x-3 text-xs">
                  <div className="w-6 h-6 rounded bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mt-0.5 shrink-0">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-300 font-medium">{act.description}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{act.actor ? `${act.actor.firstName} ${act.actor.lastName}` : 'System'}</span>
                      <span>•</span>
                      <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <Badge color="slate">{act.entityType}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
