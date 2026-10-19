import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Shield,
  CheckCircle,
  Mail,
  Phone,
  Search,
  Filter,
  Loader2,
  X,
  Building,
  Key,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const UsersPage = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // New User Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
    departmentIds: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, rolesRes] = await Promise.all([
        api.get('/users', { params: { search: search.trim() || undefined } }),
        api.get('/departments'),
        api.get('/roles'),
      ]);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (deptsRes.success) setDepartments(deptsRes.data || []);
      if (rolesRes.success) setRoles(rolesRes.data || []);
    } catch (err) {
      console.error('Failed to load users data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change ${user.firstName}'s status to ${newStatus}?`)) return;

    try {
      await api.patch(`/users/${user.id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.roleId) {
      alert('Please select a role');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/users', formData);
      setShowAddModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        roleId: '',
        departmentIds: [],
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeptModal = (user) => {
    setTargetUser(user);
    setSelectedDeptIds((user.departments || []).map((d) => d.id));
    setShowDeptModal(true);
  };

  const handleSaveDepartments = async (e) => {
    e.preventDefault();
    if (!targetUser) return;
    setSubmitting(true);
    try {
      await api.put(`/users/${targetUser.id}/departments`, {
        departmentIds: selectedDeptIds,
      });
      setShowDeptModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update department assignments');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Team Members & Access Control</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage staff credentials, assigned departments, and RBAC hierarchy permissions
          </p>
        </div>
        {hasPermission('users:create') && (
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500 mb-2" />
            <p className="text-xs">Loading user accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-medium text-slate-300">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Staff Name & Email</th>
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
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400 shrink-0">
                        {u.firstName ? u.firstName[0] : 'U'}
                      </div>
                      <div>
                        <span>{u.firstName} {u.lastName}</span>
                        <span className="text-xs text-slate-500 block">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        color={
                          u.role?.name === 'SUPER_ADMIN'
                            ? 'purple'
                            : u.role?.name === 'ADMIN'
                            ? 'blue'
                            : u.role?.name === 'MANAGER'
                            ? 'emerald'
                            : 'slate'
                        }
                      >
                        {u.role?.name || 'AGENT'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(u.departments || []).length === 0 ? (
                          <span className="text-xs text-slate-500">Unassigned</span>
                        ) : (
                          u.departments.map((d) => (
                            <span key={d.id} className="text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                              {d.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={u.status === 'ACTIVE' ? 'emerald' : 'rose'}>{u.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {hasPermission('users:update') && (
                        <>
                          <button
                            onClick={() => handleOpenDeptModal(u)}
                            className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                          >
                            Departments
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`text-xs font-medium ${
                              u.status === 'ACTIVE'
                                ? 'text-rose-400 hover:text-rose-300'
                                : 'text-emerald-400 hover:text-emerald-300'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Staff Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="agent@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Role *</label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                >
                  <option value="">Select authorization role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.description || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Assignment Modal */}
      {showDeptModal && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Assign Departments: {targetUser.firstName} {targetUser.lastName}
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartments} className="space-y-4 text-xs">
              <p className="text-slate-400">
                Select the organizational work queues and record isolation boundaries this user belongs to:
              </p>

              <div className="space-y-2">
                {departments.map((dept) => {
                  const isChecked = selectedDeptIds.includes(dept.id);
                  return (
                    <label
                      key={dept.id}
                      className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDeptIds([...selectedDeptIds, dept.id]);
                          } else {
                            setSelectedDeptIds(selectedDeptIds.filter((id) => id !== dept.id));
                          }
                        }}
                        className="rounded border-slate-700 text-brand-500 focus:ring-brand-500"
                      />
                      <div>
                        <span className="text-slate-200 font-medium block">{dept.name}</span>
                        {dept.description && <span className="text-[11px] text-slate-500">{dept.description}</span>}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowDeptModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Assignments'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
