import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Users,
  Loader2,
  X,
  UserCheck,
  UserX,
  Trash2,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const DepartmentsPage = () => {
  const { hasPermission } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptUsers, setDeptUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIdToAssign, setSelectedUserIdToAssign] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Department Form State
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      if (res.success) {
        setDepartments(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await api.get('/users');
      if (res.success) {
        setAllUsers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchAllUsers();
  }, []);

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/departments', form);
      setShowAddModal(false);
      setForm({ name: '', description: '' });
      fetchDepartments();
    } catch (err) {
      alert(err.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMembersModal = async (dept) => {
    setSelectedDept(dept);
    try {
      const res = await api.get(`/departments/${dept.id}/users`);
      if (res.success) {
        setDeptUsers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch department users:', err);
    }
  };

  const handleAssignUser = async (e) => {
    e.preventDefault();
    if (!selectedUserIdToAssign || !selectedDept) return;
    try {
      await api.post(`/departments/${selectedDept.id}/users`, {
        userId: selectedUserIdToAssign,
      });
      setSelectedUserIdToAssign('');
      const res = await api.get(`/departments/${selectedDept.id}/users`);
      if (res.success) setDeptUsers(res.data || []);
      fetchDepartments();
    } catch (err) {
      alert(err.message || 'Failed to assign user');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!selectedDept) return;
    try {
      await api.delete(`/departments/${selectedDept.id}/users/${userId}`);
      const res = await api.get(`/departments/${selectedDept.id}/users`);
      if (res.success) setDeptUsers(res.data || []);
      fetchDepartments();
    } catch (err) {
      alert(err.message || 'Failed to remove user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Departments & Team Boundaries</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure record isolation boundaries, work queues, and staff department assignments
          </p>
        </div>
        {hasPermission('departments:create') && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        )}
      </div>

      {/* Grid of Departments */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
          <p className="text-xs">Loading organizational units...</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="py-24 text-center text-slate-400">
          <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-300">No departments configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const memberCount = dept.users?.length ?? (dept._count?.users || 0);

            return (
              <Card key={dept.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <Badge color={dept.isActive ? 'emerald' : 'rose'}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-white">{dept.name}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed min-h-[3rem]">
                    {dept.description || 'General organizational unit and CRM record access boundary.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    {memberCount} Assigned Staff
                  </span>
                  <button
                    onClick={() => handleOpenMembersModal(dept)}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                  >
                    Manage Staff
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Department</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inbound Sales & Enterprise"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows="3"
                  placeholder="Operational scope and responsibility..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Department Members Modal */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedDept.name} Members</h3>
                <p className="text-xs text-slate-400 mt-0.5">Staff with access to this department's records</p>
              </div>
              <button onClick={() => setSelectedDept(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Assign User Form */}
            <form onSubmit={handleAssignUser} className="flex gap-2">
              <select
                value={selectedUserIdToAssign}
                onChange={(e) => setSelectedUserIdToAssign(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select staff member to assign...</option>
                {allUsers
                  .filter((u) => !deptUsers.some((du) => du.userId === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
              </select>
              <Button type="submit" size="sm" disabled={!selectedUserIdToAssign}>
                Assign
              </Button>
            </form>

            {/* Current Members List */}
            <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto">
              {deptUsers.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">No staff currently assigned</p>
              ) : (
                deptUsers.map((du) => (
                  <div key={du.userId} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-brand-400 flex items-center justify-center font-bold text-[10px]">
                        {du.user ? du.user.firstName[0] : 'U'}
                      </div>
                      <div>
                        <span className="text-slate-200 font-medium block">
                          {du.user?.firstName} {du.user?.lastName}
                        </span>
                        <span className="text-slate-500 text-[11px]">{du.user?.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(du.userId)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Remove from department"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button variant="outline" onClick={() => setSelectedDept(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
