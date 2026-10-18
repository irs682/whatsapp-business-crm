import React, { useState } from 'react';
import { UserPlus, Search, Filter, Phone, Mail, Tag, ShieldCheck } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const ContactsPage = () => {
  const [search, setSearch] = useState('');

  const mockContacts = [
    { id: '1', name: 'Sarah Jenkins', phone: '+1 (555) 234-5678', email: 'sarah.j@example.com', tags: ['VIP', 'Customer'], consent: 'GRANTED', optedOut: false, lastActive: '12m ago' },
    { id: '2', name: 'Marcus Chen', phone: '+1 (555) 891-2345', email: 'marcus@chencorp.com', tags: ['Prospect', 'Enterprise'], consent: 'GRANTED', optedOut: false, lastActive: '1h ago' },
    { id: '3', name: 'David Miller', phone: '+1 (555) 432-1098', email: 'd.miller@millergroup.com', tags: ['Partner'], consent: 'PENDING', optedOut: false, lastActive: '2d ago' },
    { id: '4', name: 'Elena Rostova', phone: '+44 7700 900123', email: 'elena@novatech.io', tags: ['Support'], consent: 'REVOKED', optedOut: true, lastActive: '5d ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Contacts Directory</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage customer profiles, tags, and WhatsApp consent preferences</p>
        </div>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone (+1...), or email..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
          <Filter className="w-4 h-4 mr-2 text-slate-400" />
          Filters
        </button>
      </div>

      {/* Contacts Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Contact Name</th>
                <th className="px-6 py-3.5">Phone / WhatsApp</th>
                <th className="px-6 py-3.5">Tags</th>
                <th className="px-6 py-3.5">Consent Status</th>
                <th className="px-6 py-3.5">Last Interaction</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {mockContacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-100 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400">
                      {c.name[0]}
                    </div>
                    <div>
                      <span>{c.name}</span>
                      <span className="text-xs text-slate-500 block">{c.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">{c.phone}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t, idx) => (
                        <Badge key={idx} color="slate">{t}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={c.consent === 'GRANTED' ? 'emerald' : c.consent === 'REVOKED' ? 'rose' : 'amber'}>
                      {c.optedOut ? 'OPTED OUT' : c.consent}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">{c.lastActive}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-xs text-brand-400 hover:text-brand-300 font-medium mr-3">
                      View
                    </button>
                    <button className="text-xs text-slate-400 hover:text-slate-200 font-medium">
                      Message
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ContactsPage;
