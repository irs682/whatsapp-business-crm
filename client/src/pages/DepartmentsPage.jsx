import React from 'react';
import { Building2, Plus, Users, MessageSquare } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const DepartmentsPage = () => {
  const departments = [
    { id: 'd1', name: 'Customer Support', desc: 'General client assistance, dispute resolution, and order tracking', agents: 6, activeChats: 24, status: 'Active' },
    { id: 'd2', name: 'Sales & Inquiries', desc: 'Inbound sales inquiries, demo requests, and contract closing', agents: 4, activeChats: 15, status: 'Active' },
    { id: 'd3', name: 'Billing & Finance', desc: 'Invoicing, wire verification, and recurring plan updates', agents: 2, activeChats: 3, status: 'Active' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Departments & Team Routing</h1>
          <p className="text-xs text-slate-400 mt-0.5">Configure operational units and automated ticket assignment pools</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {departments.map((dept) => (
          <Card key={dept.id} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <Badge color="emerald">{dept.status}</Badge>
              </div>
              <h3 className="text-base font-bold text-white">{dept.name}</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{dept.desc}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center">
                <Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                {dept.agents} Assigned Agents
              </span>
              <span className="flex items-center">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                {dept.activeChats} Active Chats
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsPage;
