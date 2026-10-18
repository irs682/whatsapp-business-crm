import React from 'react';
import { Plus, DollarSign, User, ArrowRight } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const LeadsPage = () => {
  const pipelineColumns = [
    {
      id: 'NEW',
      title: 'New Inquiries',
      count: 4,
      deals: [
        { id: 'l1', title: 'Enterprise WhatsApp Suite', contact: 'Marcus Chen', value: '$12,000', agent: 'Admin' },
        { id: 'l2', title: '50-Seat Support Tier', contact: 'David Miller', value: '$8,500', agent: 'Sarah A.' },
      ],
    },
    {
      id: 'QUALIFIED',
      title: 'Qualified Leads',
      count: 2,
      deals: [
        { id: 'l3', title: 'Logistics API Integration', contact: 'Apex Shipping', value: '$25,000', agent: 'Admin' },
      ],
    },
    {
      id: 'PROPOSAL_SENT',
      title: 'Proposal Sent',
      count: 3,
      deals: [
        { id: 'l4', title: 'Omnichannel CRM Pilot', contact: 'Nexus Retail', value: '$18,000', agent: 'Mike K.' },
      ],
    },
    {
      id: 'WON',
      title: 'Closed / Won',
      count: 7,
      deals: [
        { id: 'l5', title: 'Cloud CRM Annual Plan', contact: 'Global Brands', value: '$45,000', agent: 'Sarah A.' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Leads & Sales Pipeline</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track opportunities and pipeline progression across WhatsApp conversations</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Lead
        </Button>
      </div>

      {/* Pipeline Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {pipelineColumns.map((col) => (
          <div key={col.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col min-w-[260px]">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{col.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">{col.count}</span>
            </div>

            {/* Opportunity Cards */}
            <div className="space-y-3 flex-1">
              {col.deals.map((deal) => (
                <div key={deal.id} className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 hover:border-slate-700 transition-colors cursor-pointer shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-100">{deal.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">{deal.contact}</p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-900 text-xs">
                    <span className="font-bold text-brand-400">{deal.value}</span>
                    <span className="text-[10px] text-slate-500">{deal.agent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadsPage;
