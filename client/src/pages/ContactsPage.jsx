import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  Tag,
  Upload,
  FileText,
  Clock,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building,
  Activity,
  Plus,
  Trash2,
} from 'lucide-react';
import api from '../api/client';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactNotes, setContactNotes] = useState([]);
  const [contactActivity, setContactActivity] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Add Contact Form State
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    tags: '',
  });
  const [addLoading, setAddLoading] = useState(false);

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/contacts', {
        params: {
          search: search.trim() || undefined,
          page,
          limit: 15,
        },
      });
      if (res.success) {
        setContacts(res.data || []);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      if (res.success) {
        setAvailableTags(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [page]);

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchContacts();
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const tagsArray = addForm.tags
        ? addForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      await api.post('/contacts', {
        firstName: addForm.firstName || null,
        lastName: addForm.lastName || null,
        phone: addForm.phone,
        email: addForm.email || null,
        company: addForm.company || null,
        tags: tagsArray,
      });

      setShowAddModal(false);
      setAddForm({ firstName: '', lastName: '', phone: '', email: '', company: '', tags: '' });
      fetchContacts();
    } catch (err) {
      alert(err.message || 'Failed to create contact');
    } finally {
      setAddLoading(false);
    }
  };

  // CSV Import Logic
  const handleParseAndPreview = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    setImportResult(null);

    // Parse CSV lines: expects header or firstName,lastName,phone,email,company
    const lines = csvText.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    const rows = [];
    const startIndex = lines[0].toLowerCase().includes('phone') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= 1) {
        rows.push({
          firstName: parts[0] || '',
          lastName: parts[1] || '',
          phone: parts[2] || parts[0], // fallback if phone is 1st column
          email: parts[3] || '',
          company: parts[4] || '',
        });
      }
    }

    try {
      const res = await api.post('/contacts/import', { rows, preview: true });
      if (res.success) {
        setImportPreview(res.data);
      }
    } catch (err) {
      alert(err.message || 'Failed to validate CSV');
    } finally {
      setImporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      // Re-parse and execute with preview=false
      const lines = csvText.trim().split('\n').map((l) => l.trim()).filter(Boolean);
      const rows = [];
      const startIndex = lines[0].toLowerCase().includes('phone') ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        rows.push({
          firstName: parts[0] || '',
          lastName: parts[1] || '',
          phone: parts[2] || parts[0],
          email: parts[3] || '',
          company: parts[4] || '',
        });
      }

      const res = await api.post('/contacts/import', { rows, preview: false });
      if (res.success) {
        setImportResult(res.data);
        setImportPreview(null);
        setCsvText('');
        fetchContacts();
      }
    } catch (err) {
      alert(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Open Contact Detail Drawer
  const handleOpenContact = async (contact) => {
    setSelectedContact(contact);
    try {
      const [notesRes, actRes] = await Promise.all([
        api.get('/notes', { params: { contactId: contact.id } }),
        api.get(`/contacts/${contact.id}/activity`),
      ]);
      if (notesRes.success) setContactNotes(notesRes.data || []);
      if (actRes.success) setContactActivity(actRes.data || []);
    } catch (err) {
      console.error('Failed to load contact details:', err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !selectedContact) return;
    setSubmittingNote(true);
    try {
      const res = await api.post('/notes', {
        content: newNoteContent.trim(),
        contactId: selectedContact.id,
        isInternal: true,
      });
      if (res.success) {
        setContactNotes([res.data, ...contactNotes]);
        setNewNoteContent('');
      }
    } catch (err) {
      alert(err.message || 'Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Contacts Directory</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Normalized E.164 profiles, duplicate detection, tags, and marketing consent tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone (+1...), or email..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>
      </div>

      {/* Contacts Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500 mb-2" />
            <p className="text-xs">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <UserPlus className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">No contacts found</p>
            <p className="text-xs text-slate-500 mt-1">Create your first contact or import from CSV</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Contact Name</th>
                  <th className="px-6 py-3.5">Phone / WhatsApp</th>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Tags</th>
                  <th className="px-6 py-3.5">Consent Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-100 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400 shrink-0">
                        {c.firstName ? c.firstName[0] : 'C'}
                      </div>
                      <div>
                        <span>{c.firstName || 'Unnamed'} {c.lastName || ''}</span>
                        {c.email && <span className="text-xs text-slate-500 block">{c.email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">{c.phone}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{c.company || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).map((t, idx) => (
                          <Badge key={idx} color="slate">{t}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={c.consentStatus === 'GRANTED' ? 'emerald' : c.consentStatus === 'REVOKED' ? 'rose' : 'amber'}>
                        {c.isOptedOut ? 'OPTED OUT' : c.consentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenContact(c)}
                        className="text-xs text-brand-400 hover:text-brand-300 font-medium mr-3"
                      >
                        Profile & Notes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create New Contact</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number (E.164) *</label>
                <input
                  type="text"
                  required
                  placeholder="+14155552671"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Company</label>
                <input
                  type="text"
                  value={addForm.company}
                  onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Customer, Enterprise, VIP"
                  value={addForm.tags}
                  onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addLoading}>
                  {addLoading ? 'Saving...' : 'Save Contact'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Import Contacts from CSV</h3>
              <button onClick={() => { setShowImportModal(false); setImportPreview(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
              <p className="font-semibold">Compliance & Marketing Non-Opt-in Safeguard</p>
              <p className="mt-0.5 text-amber-400/90">
                Imported contacts are strictly recorded with <strong>PENDING</strong> consent status. They are NOT automatically enrolled in marketing broadcasts until explicit opt-in proof is recorded.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium text-xs mb-1">
                Paste CSV Rows (Format: firstName,lastName,phone,email,company)
              </label>
              <textarea
                rows="6"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"John,Doe,+14155552671,john@acme.com,Acme Corp\nSarah,Smith,+14155552672,sarah@beta.io,Beta"}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {importPreview && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Validation Breakdown:</span>
                  <span className="text-emerald-400">{importPreview.validCount} Valid</span>
                  <span className="text-rose-400">{importPreview.rejectedCount} Rejected/Duplicates</span>
                </div>
                {importPreview.rejectedRows?.length > 0 && (
                  <div className="text-[11px] text-rose-300/80 max-h-20 overflow-y-auto">
                    {importPreview.rejectedRows.map((r, i) => (
                      <p key={i}>Row {r.rowNumber}: {r.reason}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {importResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-300">
                Successfully imported {importResult.importedCount} contacts!
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setShowImportModal(false)}>
                Close
              </Button>
              {!importPreview ? (
                <Button onClick={handleParseAndPreview} disabled={importing || !csvText.trim()}>
                  {importing ? 'Validating...' : 'Preview Import'}
                </Button>
              ) : (
                <Button onClick={handleExecuteImport} disabled={importing || importPreview.validCount === 0}>
                  {importing ? 'Importing...' : `Import ${importPreview.validCount} Contacts`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact Profile & Internal Notes Drawer */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-lg h-full flex flex-col p-6 space-y-6 overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedContact.firstName} {selectedContact.lastName}
                </h2>
                <span className="text-xs text-slate-400 font-mono">{selectedContact.phone}</span>
              </div>
              <button onClick={() => setSelectedContact(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">Email:</span>
                <span className="text-slate-200">{selectedContact.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Company:</span>
                <span className="text-slate-200">{selectedContact.company || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Consent:</span>
                <Badge color={selectedContact.consentStatus === 'GRANTED' ? 'emerald' : 'amber'}>
                  {selectedContact.consentStatus}
                </Badge>
              </div>
              <div>
                <span className="text-slate-500 block">WhatsApp ID:</span>
                <span className="text-slate-200 font-mono">{selectedContact.waId || 'Auto-created'}</span>
              </div>
            </div>

            {/* Internal Notes Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-brand-400" />
                Internal Team Notes (Confidential)
              </h3>

              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows="2"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Add internal note visible only to authorized team members..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
                <Button type="submit" size="sm" disabled={submittingNote || !newNoteContent.trim()}>
                  {submittingNote ? 'Saving...' : 'Add Note'}
                </Button>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contactNotes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No notes yet for this contact.</p>
                ) : (
                  contactNotes.map((note) => (
                    <div key={note.id} className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1">
                      <p className="text-slate-200">{note.content}</p>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{note.author ? `${note.author.firstName} ${note.author.lastName}` : 'Agent'}</span>
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Activity History Timeline */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                <Activity className="w-3.5 h-3.5 mr-1.5 text-brand-400" />
                Activity Timeline
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contactActivity.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No activity recorded.</p>
                ) : (
                  contactActivity.map((act) => (
                    <div key={act.id} className="text-xs border-l-2 border-brand-500/50 pl-3 py-1">
                      <p className="text-slate-300 font-medium">{act.description}</p>
                      <span className="text-[10px] text-slate-500">{new Date(act.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
