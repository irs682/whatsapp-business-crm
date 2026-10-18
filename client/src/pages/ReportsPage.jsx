import React from 'react';
import { BarChart3, Download, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import Button from '../components/common/Button';

export const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Analytics & SLA Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">Agent performance, message volumes, and first-response-time metrics</p>
        </div>
        <Button variant="secondary">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="First Response Time (SLA)" value="2m 14s" change="98% within SLA target" icon={Clock} color="emerald" />
        <StatCard title="Total Inbound Messages" value="14,892" change="+18% month over month" icon={BarChart3} color="blue" />
        <StatCard title="Resolution Rate" value="94.6%" change="Avg 4.8 / 5 CSAT score" icon={CheckCircle} color="purple" />
      </div>

      <Card title="Agent Performance Leaderboard">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3">Agent</th>
                <th className="py-3">Assigned Chats</th>
                <th className="py-3">Resolved</th>
                <th className="py-3">Avg First Response</th>
                <th className="py-3 text-right">CSAT Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {[
                { name: 'Sarah Adams', assigned: 148, resolved: 142, frt: '1m 45s', csat: '4.9 ★' },
                { name: 'Michael Kim', assigned: 132, resolved: 125, frt: '2m 10s', csat: '4.8 ★' },
                { name: 'Jessica Vance', assigned: 98, resolved: 94, frt: '2m 30s', csat: '4.7 ★' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3.5 font-medium text-slate-200">{row.name}</td>
                  <td className="py-3.5">{row.assigned}</td>
                  <td className="py-3.5 text-emerald-400 font-medium">{row.resolved}</td>
                  <td className="py-3.5 text-xs text-slate-400">{row.frt}</td>
                  <td className="py-3.5 text-right font-semibold text-amber-400">{row.csat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;
