import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Send,
  Clock,
  UserCheck,
  Shield,
  Paperclip,
  MessageSquare,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Building,
  Tag,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  Lock,
  Plus,
  ExternalLink,
  Flame,
  Check,
  AlertTriangle,
  FileText,
  ListFilter,
  X,
  Sparkles,
  Wifi,
  WifiOff,
  History,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { initSocket, getSocket, disconnectSocket } from '../services/socket';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

const STATUS_CONFIG = {
  OPEN: { label: 'Open', color: 'emerald', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  PENDING: { label: 'Pending', color: 'amber', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  RESOLVED: { label: 'Resolved', color: 'slate', bg: 'bg-slate-700/30 text-slate-400 border-slate-700/50' },
  CLOSED: { label: 'Closed', color: 'rose', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const PRIORITY_CONFIG = {
  LOW: { label: 'Low', badge: 'slate', text: 'text-slate-400' },
  NORMAL: { label: 'Normal', badge: 'blue', text: 'text-blue-400' },
  HIGH: { label: 'High', badge: 'amber', text: 'text-amber-400' },
  URGENT: { label: 'Urgent', badge: 'rose', text: 'text-rose-400' },
};

export const InboxPage = () => {
  const { user, token } = useAuth();

  // Primary Data States
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [conversationDetails, setConversationDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [contacts, setContacts] = useState([]);

  // Loading & Sync States
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState('all'); // all, mine, unassigned, unread, urgent
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Composer States
  const [composerMode, setComposerMode] = useState('MESSAGE'); // 'MESSAGE' | 'NOTE'
  const [composerText, setComposerText] = useState('');
  const [showQuickReplyMenu, setShowQuickReplyMenu] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState('');

  // Modals & Panels
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    targetDepartmentId: '',
    assignedToUserId: '',
    reason: '',
    handoverNote: '',
  });

  // Assign Form State
  const [assignUserId, setAssignUserId] = useState('');

  // New Conversation Form State
  const [newConvForm, setNewConvForm] = useState({
    contactId: '',
    departmentId: '',
    priority: 'NORMAL',
    initialMessage: '',
  });

  const messagesEndRef = useRef(null);
  const timelineContainerRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Initialize Socket.IO connection
  useEffect(() => {
    if (!token) return;

    const socket = initSocket(token);

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Real-Time Event Handlers
    socket.on('conversation.created', (conv) => {
      setConversations((prev) => {
        if (prev.find((c) => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
    });

    socket.on('conversation.updated', (updated) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
      if (selectedConvId === updated.id) {
        setConversationDetails((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    });

    socket.on('conversation.status_changed', ({ conversationId, status }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, status } : c))
      );
      if (selectedConvId === conversationId) {
        setConversationDetails((prev) => (prev ? { ...prev, status } : prev));
      }
    });

    socket.on('conversation.priority_changed', ({ conversationId, priority }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, priority } : c))
      );
      if (selectedConvId === conversationId) {
        setConversationDetails((prev) => (prev ? { ...prev, priority } : prev));
      }
    });

    socket.on('conversation.assigned', ({ conversationId, assignedToUser }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, assignedToUser, assignedToUserId: assignedToUser?.id || null } : c
        )
      );
      if (selectedConvId === conversationId) {
        setConversationDetails((prev) =>
          prev ? { ...prev, assignedToUser, assignedToUserId: assignedToUser?.id || null } : prev
        );
      }
    });

    socket.on('conversation.transferred', ({ conversationId, toDepartmentId, transfer }) => {
      // If user's department is neither the target nor admin, revoke access
      const isPrivileged = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
      const hasDeptAccess = isPrivileged || user?.departmentId === toDepartmentId;

      if (!hasDeptAccess) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (selectedConvId === conversationId) {
          setSelectedConvId(null);
          setConversationDetails(null);
          showToast('Conversation was transferred to another department and is no longer accessible', 'warning');
        }
      } else {
        // Refresh conversation list and detail
        fetchConversations();
        if (selectedConvId === conversationId) {
          fetchConversationDetails(conversationId);
          showToast(`Conversation transferred to ${transfer?.toDepartment?.name || 'new department'}`, 'info');
        }
      }
    });

    socket.on('message.created', ({ conversationId, message }) => {
      // Update snippet and lastMessageAt in list
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            const isCurrentlySelected = selectedConvId === conversationId;
            return {
              ...c,
              lastMessageAt: message.createdAt,
              messages: [message],
              unreadCount: isCurrentlySelected ? 0 : (c.unreadCount || 0) + (message.direction === 'INBOUND' ? 1 : 0),
            };
          }
          return c;
        })
      );

      // Append to active message thread
      if (selectedConvId === conversationId) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
    });

    socket.on('note.created', ({ conversationId, note }) => {
      if (selectedConvId === conversationId) {
        setNotes((prev) => {
          if (prev.find((n) => n.id === note.id)) return prev;
          return [note, ...prev];
        });
      }
    });

    socket.on('conversation.read', ({ conversationId, userId: readerId }) => {
      if (readerId === user?.id) {
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        );
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [token, selectedConvId, user]);

  // 2. Load Reference Metadata (Departments, Agents, Quick Replies, Contacts)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [deptRes, userRes, qrRes, contactsRes] = await Promise.all([
          api.get('/departments'),
          api.get('/users?isActive=true'),
          api.get('/quick-replies'),
          api.get('/contacts?limit=50'),
        ]);

        if (deptRes.success) setDepartments(deptRes.data?.items || deptRes.data || []);
        if (userRes.success) setAgents(userRes.data?.items || userRes.data || []);
        if (qrRes.success) setQuickReplies(qrRes.data || []);
        if (contactsRes.success) setContacts(contactsRes.data?.items || contactsRes.data || []);
      } catch (err) {
        console.error('Failed to load inbox metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // 3. Fetch Conversations with query filters
  const fetchConversations = async () => {
    try {
      setLoadingList(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (deptFilter) params.departmentId = deptFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      if (activeTab === 'mine') {
        params.assignedAgentId = user?.id;
      } else if (activeTab === 'unassigned') {
        params.unassigned = 'true';
      }

      const res = await api.get('/conversations', { params });
      if (res.success) {
        const items = res.data?.items || [];
        setConversations(items);

        // Select the first conversation if none is selected
        if (!selectedConvId && items.length > 0) {
          setSelectedConvId(items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      showToast('Failed to load conversations', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeTab, deptFilter, statusFilter]);

  // Handle Search Input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 4. Fetch Active Conversation Details, Messages, and Notes
  const fetchConversationDetails = async (id) => {
    if (!id) return;
    try {
      setLoadingChat(true);

      // Join Socket Room
      const socket = getSocket();
      if (socket) {
        socket.emit('conversation:join', { conversationId: id });
      }

      const [detailRes, msgRes, noteRes, actRes] = await Promise.all([
        api.get(`/conversations/${id}`),
        api.get(`/conversations/${id}/messages?limit=100`),
        api.get(`/conversations/${id}/notes`),
        api.get(`/conversations/${id}/activity`),
      ]);

      if (detailRes.success) setConversationDetails(detailRes.data);
      if (msgRes.success) setMessages(msgRes.data?.items || []);
      if (noteRes.success) setNotes(noteRes.data?.items || []);
      if (actRes.success) setActivityHistory(actRes.data || []);

      // Mark conversation as read internally
      await api.post(`/conversations/${id}/read`);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );

      scrollToBottom();
    } catch (err) {
      console.error('Failed to load conversation details:', err);
      showToast(err.message || 'Error loading conversation', 'error');
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      fetchConversationDetails(selectedConvId);
    }
    return () => {
      const socket = getSocket();
      if (socket && selectedConvId) {
        socket.emit('conversation:leave', { conversationId: selectedConvId });
      }
    };
  }, [selectedConvId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Filtered Conversations for Tabs (client-side tabs like unread, urgent)
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (activeTab === 'unread' && (!conv.unreadCount || conv.unreadCount <= 0)) return false;
      if (activeTab === 'urgent' && conv.priority !== 'URGENT' && conv.priority !== 'HIGH') return false;
      return true;
    });
  }, [conversations, activeTab]);

  // 5. Operations: Claim Conversation
  const handleClaimConversation = async () => {
    if (!selectedConvId) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/conversations/${selectedConvId}/claim`);
      if (res.success) {
        showToast('You have successfully claimed this conversation', 'success');
        fetchConversationDetails(selectedConvId);
      }
    } catch (err) {
      showToast(err.message || 'Conflict: This conversation was already claimed by another agent', 'error');
      fetchConversations();
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Operations: Assign Agent
  const handleAssignAgent = async () => {
    if (!selectedConvId || !assignUserId) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/conversations/${selectedConvId}/assign`, {
        assignedToUserId: assignUserId,
      });
      if (res.success) {
        showToast('Agent assigned successfully', 'success');
        setShowAssignModal(false);
        fetchConversationDetails(selectedConvId);
      }
    } catch (err) {
      showToast(err.message || 'Failed to assign agent', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Operations: Department Transfer
  const handleTransferDepartment = async (e) => {
    e.preventDefault();
    if (!selectedConvId || !transferForm.targetDepartmentId) return;

    try {
      setActionLoading(true);
      const payload = {
        targetDepartmentId: transferForm.targetDepartmentId,
        reason: transferForm.reason || 'Escalation to specialized department',
        handoverNote: transferForm.handoverNote || '',
      };
      if (transferForm.assignedToUserId) {
        payload.assignedToUserId = transferForm.assignedToUserId;
      }

      const res = await api.post(`/conversations/${selectedConvId}/transfer`, payload);
      if (res.success) {
        showToast('Conversation transferred successfully', 'success');
        setShowTransferModal(false);
        setTransferForm({ targetDepartmentId: '', assignedToUserId: '', reason: '', handoverNote: '' });

        // If current user is not part of target department, selection will be cleared
        const isPrivileged = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
        if (!isPrivileged && user?.departmentId !== payload.targetDepartmentId) {
          setSelectedConvId(null);
          setConversationDetails(null);
          fetchConversations();
        } else {
          fetchConversationDetails(selectedConvId);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to transfer conversation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Operations: Update Status
  const handleStatusChange = async (newStatus) => {
    if (!selectedConvId || conversationDetails?.status === newStatus) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/conversations/${selectedConvId}/status`, { status: newStatus });
      if (res.success) {
        showToast(`Status changed to ${newStatus}`, 'success');
        setConversationDetails((prev) => ({ ...prev, status: newStatus }));
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      showToast(err.message || 'Status transition not allowed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Operations: Update Priority
  const handlePriorityChange = async (newPriority) => {
    if (!selectedConvId || conversationDetails?.priority === newPriority) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/conversations/${selectedConvId}/priority`, { priority: newPriority });
      if (res.success) {
        showToast(`Priority updated to ${newPriority}`, 'success');
        setConversationDetails((prev) => ({ ...prev, priority: newPriority }));
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, priority: newPriority } : c))
        );
      }
    } catch (err) {
      showToast(err.message || 'Failed to update priority', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 10. Operations: Send Message or Internal Note
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!selectedConvId || !composerText.trim()) return;

    const textToSend = composerText.trim();
    setComposerText('');
    setShowQuickReplyMenu(false);

    try {
      if (composerMode === 'NOTE') {
        const res = await api.post(`/conversations/${selectedConvId}/notes`, {
          content: textToSend,
          isInternal: true,
        });
        if (res.success) {
          showToast('Internal note saved', 'info');
          setNotes((prev) => [res.data, ...prev]);
        }
      } else {
        const res = await api.post(`/conversations/${selectedConvId}/messages`, {
          text: textToSend,
          direction: 'OUTBOUND',
          type: 'TEXT',
        });
        if (res.success) {
          setMessages((prev) => [...prev, res.data]);
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error('Failed to submit message/note:', err);
      showToast(err.message || 'Failed to deliver message', 'error');
    }
  };

  // 11. Create New Conversation from modal
  const handleCreateNewConversation = async (e) => {
    e.preventDefault();
    if (!newConvForm.contactId) return;

    try {
      setActionLoading(true);
      const res = await api.post('/conversations', {
        contactId: newConvForm.contactId,
        departmentId: newConvForm.departmentId || undefined,
        priority: newConvForm.priority,
      });

      if (res.success) {
        showToast('Conversation initialized', 'success');
        setShowNewConvModal(false);
        const newConv = res.data;

        // If initial message provided, send it
        if (newConvForm.initialMessage.trim()) {
          await api.post(`/conversations/${newConv.id}/messages`, {
            text: newConvForm.initialMessage.trim(),
            direction: 'OUTBOUND',
            type: 'TEXT',
          });
        }

        setNewConvForm({ contactId: '', departmentId: '', priority: 'NORMAL', initialMessage: '' });
        await fetchConversations();
        setSelectedConvId(newConv.id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create conversation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Reply Auto-Complete & Click Insert
  const filteredQuickReplies = useMemo(() => {
    if (!quickReplyFilter) return quickReplies;
    const q = quickReplyFilter.toLowerCase();
    return quickReplies.filter(
      (qr) => qr.title.toLowerCase().includes(q) || qr.shortcut.toLowerCase().includes(q)
    );
  }, [quickReplies, quickReplyFilter]);

  const insertQuickReply = (content) => {
    setComposerText(content);
    setShowQuickReplyMenu(false);
  };

  // Merged Chronological Timeline (Messages + Notes + Handover Events)
  const unifiedTimeline = useMemo(() => {
    const list = [];

    // Add messages
    messages.forEach((msg) => {
      list.push({
        type: 'message',
        id: `msg-${msg.id}`,
        timestamp: new Date(msg.createdAt).getTime(),
        data: msg,
      });
    });

    // Add internal notes
    notes.forEach((note) => {
      list.push({
        type: 'note',
        id: `note-${note.id}`,
        timestamp: new Date(note.createdAt).getTime(),
        data: note,
      });
    });

    // Add transfer events from conversationDetails.transfers
    if (conversationDetails?.transfers) {
      conversationDetails.transfers.forEach((tr) => {
        list.push({
          type: 'transfer',
          id: `transfer-${tr.id}`,
          timestamp: new Date(tr.createdAt).getTime(),
          data: tr,
        });
      });
    }

    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, notes, conversationDetails]);

  return (
    <div className="relative h-[calc(100vh-7.5rem)] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium shadow-xl backdrop-blur-md transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-500/90 text-white'
              : toastMessage.type === 'success'
              ? 'bg-emerald-500/90 text-white'
              : 'bg-slate-800/90 text-slate-200 border border-slate-700'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4 text-brand-400" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================== */}
        {/* LEFT COLUMN: Conversation Directory & Queues                   */}
        {/* ============================================================== */}
        <div className="w-80 lg:w-96 border-r border-slate-800 flex flex-col shrink-0 bg-slate-900/80">
          {/* Header & Controls */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">Shared Inbox</h2>
                <div
                  className={`w-2 h-2 rounded-full ${
                    socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                  title={socketConnected ? 'Real-Time Connected' : 'Disconnected'}
                />
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowNewConvModal(true)}
                className="gap-1.5 py-1 px-2.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contact, phone, or snippet..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'mine', label: 'Mine' },
                { id: 'unassigned', label: 'Unassigned' },
                { id: 'unread', label: 'Unread' },
                { id: 'urgent', label: 'Priority' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Department & Status Dropdown Filters */}
            <div className="flex items-center space-x-2 pt-1 text-[11px]">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-brand-500 truncate"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-brand-500 truncate"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Conversation List Cards */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin text-brand-500" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                <p className="font-semibold text-slate-400">No conversations found</p>
                <p className="text-[11px] text-slate-600">
                  Try adjusting your filters or click "New" to start a thread.
                </p>
              </div>
            ) : (
              filteredConversations.map((chat) => {
                const isSelected = selectedConvId === chat.id;
                const contactName = `${chat.contact?.firstName || ''} ${chat.contact?.lastName || ''}`.trim() || 'Unknown Contact';
                const lastSnippet = chat.messages?.[0]?.text || 'No messages yet';
                const statusMeta = STATUS_CONFIG[chat.status] || STATUS_CONFIG.OPEN;
                const priorityMeta = PRIORITY_CONFIG[chat.priority] || PRIORITY_CONFIG.NORMAL;

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedConvId(chat.id)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-l-4 border-brand-500 pl-3 shadow-inner'
                        : 'hover:bg-slate-800/40 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400 shrink-0">
                          {contactName[0]?.toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-100 truncate">{contactName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{chat.contact?.phone || 'No phone'}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1 shrink-0">
                        <span className="text-[10px] text-slate-500">
                          {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {chat.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-brand-500 text-slate-950 text-[10px] font-bold animate-pulse">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Last Message Snippet */}
                    <p className="text-xs text-slate-400 mt-2 truncate line-clamp-1">{lastSnippet}</p>

                    {/* Badges & Meta Row */}
                    <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-slate-800/40 text-[10px]">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className={`px-1.5 py-0.5 rounded font-medium border text-[9px] ${statusMeta.bg}`}>
                          {statusMeta.label}
                        </span>
                        {chat.priority && chat.priority !== 'NORMAL' && (
                          <span className={`px-1.5 py-0.5 rounded font-medium border text-[9px] ${
                            chat.priority === 'URGENT'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {priorityMeta.label}
                          </span>
                        )}
                        <span className="text-slate-500 truncate max-w-[100px]">
                          {chat.department?.name || 'General'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-slate-400 shrink-0">
                        {chat.assignedToUser ? (
                          <span className="flex items-center space-x-1 text-slate-400" title={`Assigned to ${chat.assignedToUser.firstName}`}>
                            <UserCheck className="w-3 h-3 text-emerald-400" />
                            <span className="truncate max-w-[70px]">{chat.assignedToUser.firstName}</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium flex items-center space-x-0.5">
                            <AlertCircle className="w-3 h-3" />
                            <span>Unassigned</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* CENTER COLUMN: Active Workspace & Chronological Timeline       */}
        {/* ============================================================== */}
        <div className="flex-1 flex flex-col bg-slate-950 min-w-0">
          {selectedConvId && conversationDetails ? (
            <>
              {/* Workspace Header */}
              <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center font-bold text-sm text-brand-400 shrink-0">
                    {conversationDetails.contact?.firstName?.[0] || 'C'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white truncate">
                        {`${conversationDetails.contact?.firstName || ''} ${conversationDetails.contact?.lastName || ''}`.trim() || 'WhatsApp Customer'}
                      </span>
                      <span className="text-xs text-slate-400">{conversationDetails.contact?.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center space-x-1">
                        <Building className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-300">{conversationDetails.department?.name || 'General Queue'}</span>
                      </span>
                      <span>•</span>
                      {conversationDetails.assignedToUser ? (
                        <span className="flex items-center space-x-1 text-emerald-400">
                          <UserCheck className="w-3 h-3" />
                          <span>{conversationDetails.assignedToUser.firstName} {conversationDetails.assignedToUser.lastName}</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold">Unassigned</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Action Controls */}
                <div className="flex items-center space-x-2">
                  {/* Claim Button if unassigned */}
                  {!conversationDetails.assignedToUserId && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleClaimConversation}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-xs py-1.5 px-3"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      <span>Claim</span>
                    </Button>
                  )}

                  {/* Assign / Reassign Button */}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setAssignUserId(conversationDetails.assignedToUserId || '');
                      setShowAssignModal(true);
                    }}
                    className="text-xs py-1.5 px-3"
                  >
                    <span>{conversationDetails.assignedToUserId ? 'Reassign' : 'Assign'}</span>
                  </Button>

                  {/* Transfer Department Button */}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowTransferModal(true)}
                    className="text-xs py-1.5 px-3"
                  >
                    <ArrowRight className="w-3.5 h-3.5 mr-1" />
                    <span>Transfer</span>
                  </Button>

                  {/* Status Dropdown */}
                  <select
                    value={conversationDetails.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="OPEN">🟢 Open</option>
                    <option value="PENDING">🟡 Pending</option>
                    <option value="RESOLVED">⚪ Resolved</option>
                    <option value="CLOSED">🔴 Closed</option>
                  </select>

                  {/* Priority Dropdown */}
                  <select
                    value={conversationDetails.priority || 'NORMAL'}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">🔥 Urgent</option>
                  </select>

                  {/* Right Panel Toggle */}
                  <button
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      showRightPanel
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    title="Toggle Customer Details"
                  >
                    <User className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notice Banner: Phase 3 Internal Testing Disclaimer */}
              <div className="bg-slate-900/40 border-b border-slate-800/80 px-6 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-brand-400" />
                  <span>Phase 3 Shared Team Inbox: Internal test messaging & handover operational. Live WhatsApp Cloud API activates in Phase 4.</span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                  <span>Channel: {conversationDetails.channel || 'WHATSAPP'}</span>
                  <span>•</span>
                  <span>ID: {conversationDetails.id.slice(0, 8)}</span>
                </div>
              </div>

              {/* Chronological Unified Timeline */}
              <div
                ref={timelineContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-950 to-slate-950/90"
              >
                {loadingChat ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
                  </div>
                ) : unifiedTimeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-800" />
                    <p className="text-sm font-medium">No messages or notes in this conversation yet</p>
                    <p className="text-xs">Type a message or internal note below to begin.</p>
                  </div>
                ) : (
                  unifiedTimeline.map((item) => {
                    // CASE 1: Inbound / Outbound WhatsApp Messages
                    if (item.type === 'message') {
                      const msg = item.data;
                      const isInbound = msg.direction === 'INBOUND';

                      return (
                        <div
                          key={item.id}
                          className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-lg rounded-2xl p-3.5 text-xs shadow-md transition-all ${
                              isInbound
                                ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'
                                : 'bg-brand-600 text-white rounded-tr-sm shadow-brand-950/30'
                            }`}
                          >
                            {!isInbound && msg.senderUser && (
                              <p className="text-[10px] text-brand-200 font-semibold mb-1">
                                {msg.senderUser.firstName} {msg.senderUser.lastName}
                              </p>
                            )}

                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                            <div
                              className={`flex items-center justify-end space-x-1.5 mt-1.5 text-[10px] ${
                                isInbound ? 'text-slate-500' : 'text-brand-200'
                              }`}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {!isInbound && (
                                <span className="flex items-center space-x-0.5">
                                  <span>•</span>
                                  <span>{msg.status || 'LOCAL_SAVED'}</span>
                                  <Check className="w-3 h-3 inline" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // CASE 2: Internal Team Notes
                    if (item.type === 'note') {
                      const note = item.data;
                      return (
                        <div key={item.id} className="flex justify-center my-2">
                          <div className="max-w-xl w-full bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-xs text-amber-200 shadow-sm">
                            <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20 text-[11px] font-semibold text-amber-400">
                              <div className="flex items-center space-x-1.5">
                                <Shield className="w-3.5 h-3.5 text-amber-400" />
                                <span>Internal Team Note</span>
                                <span className="text-[10px] text-amber-500 font-normal">
                                  by {note.author?.firstName || 'Staff'} {note.author?.lastName || ''}
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-500">
                                {new Date(note.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                            <p className="mt-2 text-slate-200 whitespace-pre-wrap">{note.content}</p>
                          </div>
                        </div>
                      );
                    }

                    // CASE 3: Department Transfer Handover System Event
                    if (item.type === 'transfer') {
                      const tr = item.data;
                      return (
                        <div key={item.id} className="flex justify-center my-3">
                          <div className="max-w-xl w-full bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-200">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-400 mb-1">
                              <span className="flex items-center space-x-1">
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>
                                  Department Transfer: {tr.fromDepartment?.name || 'Previous'} → {tr.toDepartment?.name || 'New'}
                                </span>
                              </span>
                              <span className="text-[10px] text-indigo-400">
                                {new Date(tr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px]">
                              <span className="text-slate-400 font-medium">Reason: </span>
                              {tr.reason}
                            </p>
                            {tr.handoverNote && (
                              <p className="mt-1 text-slate-300 text-[11px] bg-slate-900/60 p-2 rounded-lg border border-indigo-500/20">
                                <span className="text-indigo-400 font-medium">Handover Summary: </span>
                                {tr.handoverNote}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Auto-Complete Popover */}
              {showQuickReplyMenu && (
                <div className="mx-4 mb-2 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl space-y-2 z-20">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      <span>Select Quick Reply Snippet</span>
                    </div>
                    <button
                      onClick={() => setShowQuickReplyMenu(false)}
                      className="text-slate-400 hover:text-slate-200 text-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={quickReplyFilter}
                    onChange={(e) => setQuickReplyFilter(e.target.value)}
                    placeholder="Search shortcuts (/hello, /pricing)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredQuickReplies.map((qr) => (
                      <div
                        key={qr.id}
                        onClick={() => insertQuickReply(qr.content)}
                        className="p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 cursor-pointer transition-colors border border-slate-800/60 flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-xs text-slate-200">{qr.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 font-mono">
                              {qr.shortcut}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{qr.content}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-[11px] py-0.5 px-2">
                          Insert
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message & Note Composer */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/60 backdrop-blur-md">
                {/* Composer Mode Toggle & Quick Reply Triggers */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setComposerMode('MESSAGE')}
                      className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
                        composerMode === 'MESSAGE'
                          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Reply</span>
                    </button>

                    <button
                      onClick={() => setComposerMode('NOTE')}
                      className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
                        composerMode === 'NOTE'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>🔒 Internal Note</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowQuickReplyMenu(!showQuickReplyMenu)}
                      className="text-xs text-brand-400 hover:text-brand-300 px-2 py-1 rounded bg-brand-500/10 border border-brand-500/20 flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Quick Replies (/)</span>
                    </button>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">Enter to send</span>
                  </div>
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={composerText}
                    onChange={(e) => {
                      setComposerText(e.target.value);
                      if (e.target.value.startsWith('/')) {
                        setShowQuickReplyMenu(true);
                        setQuickReplyFilter(e.target.value.slice(1));
                      }
                    }}
                    placeholder={
                      composerMode === 'NOTE'
                        ? 'Type internal note visible only to team members...'
                        : 'Type customer WhatsApp message (or type / for quick replies)...'
                    }
                    className={`flex-1 bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                      composerMode === 'NOTE'
                        ? 'border-amber-500/40 focus:border-amber-500'
                        : 'border-slate-800 focus:border-brand-500'
                    }`}
                  />
                  <Button
                    type="submit"
                    size="md"
                    disabled={!composerText.trim()}
                    className={composerMode === 'NOTE' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-brand-600 hover:bg-brand-500'}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 p-8">
              <MessageSquare className="w-12 h-12 text-slate-800 animate-pulse" />
              <p className="text-base font-bold text-slate-300">No Conversation Selected</p>
              <p className="text-xs text-slate-500 max-w-sm text-center">
                Select a conversation from the left queue or initialize a new customer thread to start real-time messaging.
              </p>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: Customer Details & Handover History              */}
        {/* ============================================================== */}
        {showRightPanel && selectedConvId && conversationDetails && (
          <div className="w-80 border-l border-slate-800 flex flex-col shrink-0 bg-slate-900/90 overflow-y-auto">
            {/* Customer Profile Header */}
            <div className="p-5 border-b border-slate-800 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-500/10 border-2 border-brand-500/30 flex items-center justify-center font-bold text-xl text-brand-400 mx-auto mb-3 shadow-lg">
                {conversationDetails.contact?.firstName?.[0] || 'C'}
              </div>
              <h3 className="text-sm font-bold text-white">
                {`${conversationDetails.contact?.firstName || ''} ${conversationDetails.contact?.lastName || ''}`.trim() || 'WhatsApp Customer'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{conversationDetails.contact?.company || 'Individual Client'}</p>

              <div className="flex items-center justify-center space-x-2 mt-3">
                <Link
                  to={`/contacts`}
                  className="inline-flex items-center space-x-1 text-xs text-brand-400 hover:text-brand-300 bg-brand-500/10 px-3 py-1 rounded-lg border border-brand-500/20"
                >
                  <span>Open Contact CRM</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Contact Information */}
            <div className="p-5 border-b border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Info</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{conversationDetails.contact?.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{conversationDetails.contact?.email || 'No email registered'}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span>{conversationDetails.department?.name || 'General Department'}</span>
                </div>
              </div>

              {/* Contact Tags */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {conversationDetails.contact?.contactTags && conversationDetails.contact.contactTags.length > 0 ? (
                    conversationDetails.contact.contactTags.map((ct) => (
                      <Badge key={ct.id} color="emerald">
                        {ct.tag?.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-600 italic">No tags assigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Linked Pipeline Leads */}
            <div className="p-5 border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Linked Leads</h4>
                <Link to="/leads" className="text-[11px] text-brand-400 hover:underline">
                  View All
                </Link>
              </div>
              <div className="space-y-2">
                {conversationDetails.contact?.leads && conversationDetails.contact.leads.length > 0 ? (
                  conversationDetails.contact.leads.map((lead) => (
                    <div key={lead.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{lead.title}</span>
                        <Badge color="blue">{lead.status}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Value: ${Number(lead.value || 0).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-600 italic">No linked CRM leads</p>
                )}
              </div>
            </div>

            {/* Open Follow-up Tasks */}
            <div className="p-5 border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Follow-up Tasks</h4>
                <Link to="/tasks" className="text-[11px] text-brand-400 hover:underline">
                  View Tasks
                </Link>
              </div>
              <div className="space-y-2">
                {conversationDetails.contact?.tasks && conversationDetails.contact.tasks.length > 0 ? (
                  conversationDetails.contact.tasks.map((task) => (
                    <div key={task.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                      <span className="font-semibold text-slate-200">{task.title}</span>
                      <p className="text-[10px] text-slate-500 mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-600 italic">No pending tasks</p>
                )}
              </div>
            </div>

            {/* Department Transfer & Handover Logs */}
            <div className="p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transfer Audit</h4>
              <div className="space-y-2">
                {conversationDetails.transfers && conversationDetails.transfers.length > 0 ? (
                  conversationDetails.transfers.map((tr) => (
                    <div key={tr.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                        <span>{tr.fromDepartment?.name || 'Previous'} → {tr.toDepartment?.name}</span>
                        <span className="text-[10px] text-slate-500">{new Date(tr.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">By: {tr.transferredBy?.firstName || 'System'}</p>
                      <p className="text-[10px] text-slate-500">Reason: {tr.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-600 italic">No historical department transfers</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: Department Transfer Dialog                            */}
      {/* ============================================================== */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ArrowRight className="w-5 h-5 text-brand-400" />
                <h3 className="text-base font-bold text-white">Transfer Conversation</h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Department <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={transferForm.targetDepartmentId}
                  onChange={(e) => setTransferForm({ ...transferForm, targetDepartmentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select target department...</option>
                  {departments
                    .filter((d) => d.id !== conversationDetails?.departmentId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Transfer Reason <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Requires enterprise billing escalation"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Handover Note (Context for receiving staff)
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail customer history, agreed pricing, or next steps..."
                  value={transferForm.handoverNote}
                  onChange={(e) => setTransferForm({ ...transferForm, handoverNote: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <Button variant="secondary" size="sm" onClick={() => setShowTransferModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={actionLoading}>
                  {actionLoading ? 'Transferring...' : 'Confirm Transfer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Assign Agent Dialog                                   */}
      {/* ============================================================== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-brand-400" />
                <h3 className="text-base font-bold text-white">Assign Conversation</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Authorized Agent
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select agent...</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.firstName} {ag.lastName} ({ag.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <Button variant="secondary" size="sm" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAssignAgent}
                  disabled={actionLoading || !assignUserId}
                >
                  {actionLoading ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: New Conversation Dialog                               */}
      {/* ============================================================== */}
      {showNewConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-brand-400" />
                <h3 className="text-base font-bold text-white">Start New Conversation</h3>
              </div>
              <button onClick={() => setShowNewConvModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewConversation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Contact <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={newConvForm.contactId}
                  onChange={(e) => setNewConvForm({ ...newConvForm, contactId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select contact from directory...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Department Queue
                </label>
                <select
                  value={newConvForm.departmentId}
                  onChange={(e) => setNewConvForm({ ...newConvForm, departmentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Default / General Queue</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Priority</label>
                <select
                  value={newConvForm.priority}
                  onChange={(e) => setNewConvForm({ ...newConvForm, priority: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Initial Message (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Type opening message..."
                  value={newConvForm.initialMessage}
                  onChange={(e) => setNewConvForm({ ...newConvForm, initialMessage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <Button variant="secondary" size="sm" onClick={() => setShowNewConvModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={actionLoading}>
                  {actionLoading ? 'Creating...' : 'Initialize Thread'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxPage;
