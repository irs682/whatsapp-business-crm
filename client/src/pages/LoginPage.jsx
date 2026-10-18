import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@crm.local');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex w-12 h-12 rounded-xl bg-brand-600 items-center justify-center text-white shadow-lg shadow-brand-950 mb-3">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">WhatsApp Business CRM</h2>
        <p className="text-sm text-slate-400 mt-1">Sign in to your shared team inbox</p>
      </div>

      {/* Form Container */}
      <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@crm.local"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Initial Seed Admin: <span className="text-slate-400 font-mono">admin@crm.local</span> / <span className="text-slate-400 font-mono">Admin123!</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
