import React from 'react';
import { Users, MessageSquare, Briefcase, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

export const DashboardPage = () => {
  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Executive CRM Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time overview of customer conversations and pipeline velocity</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge color="emerald">WhatsApp Cloud API Connected</Badge>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Contacts"
          value="1,428"
          change="+12% from last week"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Open Conversations"
          value="42"
          change="8 pending assignment"
          icon={MessageSquare}
          color="blue"
        />
        <StatCard
          title="Active Leads Value"
          value="$184,500"
          change="34 open opportunities"
          icon={Briefcase}
          color="purple"
        />
        <StatCard
          title="Avg. Response Time"
          value="4.2m"
          change="-38s improvement"
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Two Column Layout: Recent Conversations & Lead Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Conversations Preview */}
        <Card title="Recent WhatsApp Conversations" className="lg:col-span-2">
          <div className="divide-y divide-slate-800">
            {[
              { name: 'Sarah Jenkins', phone: '+1 (555) 234-5678', time: '2m ago', msg: 'Can you provide the invoice for our recent order?', status: 'OPEN', dept: 'Customer Support' },
              { name: 'Marcus Chen', phone: '+1 (555) 891-2345', time: '14m ago', msg: 'Interested in the Enterprise WhatsApp tier.', status: 'PENDING', dept: 'Sales' },
              { name: 'Elena Rostova', phone: '+44 7700 900123', time: '1h ago', msg: 'Thanks! Everything is set up now.', status: 'RESOLVED', dept: 'Customer Support' },
            ].map((item, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-brand-400">
                    {item.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-slate-200">{item.name}</span>
                      <span className="text-xs text-slate-500">{item.phone}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{item.msg}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge color={item.status === 'OPEN' ? 'emerald' : item.status === 'PENDING' ? 'amber' : 'slate'}>
                    {item.status}
                  </Badge>
                  <span className="text-[11px] text-slate-500 block mt-1">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Lead Stages Pipeline Distribution */}
        <Card title="Pipeline Stage Distribution">
          <div className="space-y-4">
            {[
              { stage: 'New Inquiries', count: 18, pct: 75, color: 'bg-blue-500' },
              { stage: 'Contacted', count: 12, pct: 50, color: 'bg-emerald-500' },
              { stage: 'Qualified', count: 8, pct: 35, color: 'bg-brand-400' },
              { stage: 'Proposal Sent', count: 5, pct: 20, color: 'bg-amber-400' },
              { stage: 'Negotiation / Closing', count: 3, pct: 12, color: 'bg-purple-500' },
            ].map((p, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{p.stage}</span>
                  <span className="text-slate-400">{p.count} leads</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className={`h-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
