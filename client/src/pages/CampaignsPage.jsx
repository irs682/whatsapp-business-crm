import React from 'react';
import { Megaphone, Plus, Calendar, CheckCircle2, Send, AlertTriangle } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const CampaignsPage = () => {
  const campaigns = [
    { id: 'c1', name: 'Autumn Product Launch Broadcast', template: 'product_announcement_v1', status: 'COMPLETED', sent: 1200, delivered: 1184, read: 942, scheduled: 'Oct 12, 2026' },
    { id: 'c2', name: 'VIP Customer Loyalty Discount', template: 'vip_loyalty_promo', status: 'SCHEDULED', sent: 0, delivered: 0, read: 0, scheduled: 'Oct 25, 2026' },
    { id: 'c3', name: 'Webinar RSVP Follow-up', template: 'event_reminder_utility', status: 'DRAFT', sent: 0, delivered: 0, read: 0, scheduled: 'Unscheduled' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">WhatsApp Broadcast Campaigns</h1>
          <p className="text-xs text-slate-400 mt-0.5">Deliver pre-approved WhatsApp marketing and utility templates at scale</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {campaigns.map((camp) => (
          <Card key={camp.id} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge color={camp.status === 'COMPLETED' ? 'emerald' : camp.status === 'SCHEDULED' ? 'blue' : 'slate'}>
                  {camp.status}
                </Badge>
                <span className="text-[11px] text-slate-500">{camp.scheduled}</span>
              </div>
              <h3 className="text-sm font-bold text-white">{camp.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">Template: {camp.template}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Sent / Delivered:</span>
                <span className="text-slate-200 font-medium">{camp.sent} / {camp.delivered}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Read Rate:</span>
                <span className="text-brand-400 font-medium">
                  {camp.delivered > 0 ? `${Math.round((camp.read / camp.delivered) * 100)}%` : '—'}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CampaignsPage;
