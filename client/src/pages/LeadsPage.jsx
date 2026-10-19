import React, { useState, useEffect } from 'react';
import {
  Plus,
  DollarSign,
  User,
  ArrowRight,
  Loader2,
  X,
  Briefcase,
  ChevronRight,
  Filter,
} from 'lucide-react';
import api from '../api/client';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    contactId: '',
    value: '',
    stage: 'NEW',
    description: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, stagesRes, contactsRes] = await Promise.all([
        api.get('/leads', { params: { limit: 100 } }),
        api.get('/leads/stages'),
        api.get('/contacts', { params: { limit: 50 } }),
      ]);
      if (leadsRes.success) setLeads(leadsRes.data || []);
      if (stagesRes.success) setStages(stagesRes.data || []);
      if (contactsRes.success) setContacts(contactsRes.data || []);
    } catch (err) {
      console.error('Failed to load leads data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStageChange = async (leadId, newStage) => {
    try {
      await api.patch(`/leads/${leadId}`, { stage: newStage });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update stage');
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!formData.contactId) {
      alert('Please select an associated contact');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leads', {
        title: formData.title,
        contactId: formData.contactId,
        value: formData.value ? parseFloat(formData.value) : null,
        stage: formData.stage,
        description: formData.description || null,
      });
      setShowAddModal(false);
      setFormData({ title: '', contactId: '', value: '', stage: 'NEW', description: '' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  };

  const defaultStageKeys = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Leads & Sales Pipeline</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time pipeline progression, stage velocity, and opportunity value tracking
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Lead
        </Button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
          <p className="text-xs">Loading sales pipeline...</p>
        </div>
      ) : (
        /* Kanban Pipeline Columns */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {defaultStageKeys.map((stageKey) => {
            const stageLeads = leads.filter((l) => l.stage === stageKey);
            const stageTotalValue = stageLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);

            return (
              <div
                key={stageKey}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col min-w-[270px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                      {stageKey.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-medium">
                      ${stageTotalValue.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                  {stageLeads.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-600 border border-dashed border-slate-800 rounded-lg">
                      No opportunities
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition-colors shadow-sm space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-semibold text-slate-100">{lead.title}</h4>
                        </div>

                        {lead.contact && (
                          <p className="text-[11px] text-slate-400">
                            {lead.contact.firstName} {lead.contact.lastName} ({lead.contact.phone})
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                          <span className="font-bold text-brand-400">
                            {lead.value ? `$${Number(lead.value).toLocaleString()}` : '$0'}
                          </span>

                          {/* Quick stage selector */}
                          <select
                            value={lead.stage}
                            onChange={(e) => handleStageChange(lead.id, e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                          >
                            {defaultStageKeys.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Lead Opportunity</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Opportunity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise WhatsApp API 100-Seat"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Associated Contact *</label>
                <select
                  required
                  value={formData.contactId}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                >
                  <option value="">Select a customer contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone}) - {c.company || 'Direct'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estimated Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="10000"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                  >
                    {defaultStageKeys.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows="3"
                  placeholder="Details regarding this deal..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Opportunity'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
