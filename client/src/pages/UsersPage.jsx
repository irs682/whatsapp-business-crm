import React from 'react';
import { UserPlus, Shield, CheckCircle, Mail, Phone } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const UsersPage = () => {
  const users = [
    { id: 'u1', name: 'System Administrator', email: 'admin@crm.local', role: 'SUPER_ADMIN', departments: ['Customer Support', 'Sales'], status: 'ACTIVE' },
    { id: 'u2', name: 'Sarah Adams', email: 'sarah.adams@crm.local', role: 'MANAGER', departments: ['Customer Support'], status: 'ACTIVE' },
    { id: 'u3', name: 'Michael Kim', email: 'michael.kim@crm.local', role: 'AGENT', departments: ['Sales & Inquiries'], status: 'ACTIVE' },
    { id: 'u4', name: 'Jessica Vance', email: 'jessica.v@crm.local', role: 'AGENT', departments: ['Billing & Finance'], status: 'ACTIVE' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Team Members & Agents</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage agent logins, RBAC roles, and assigned support departments</p>
        </div>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Departments</th>
                <th className="px-6 py-3.5">Account Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-100 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400">
                      {u.name[0]}
                    </div>
                    <div>
                      <span>{u.name}</span>
                      <span className="text-xs text-slate-500 block">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={u.role === 'SUPER_ADMIN' ? 'purple' : u.role === 'MANAGER' ? 'blue' : 'slate'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {u.departments.map((d, idx) => (
                        <span key={idx} className="text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color="emerald">{u.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-xs text-brand-400 hover:text-brand-300 font-medium mr-3">
                      Edit
                    </button>
                    <button className="text-xs text-rose-400 hover:text-rose-300 font-medium">
                      Deactivate
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

export default UsersPage;
