import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

// Pages
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import InboxPage from '../pages/InboxPage';
import ContactsPage from '../pages/ContactsPage';
import LeadsPage from '../pages/LeadsPage';
import TasksPage from '../pages/TasksPage';
import DepartmentsPage from '../pages/DepartmentsPage';
import UsersPage from '../pages/UsersPage';
import CampaignsPage from '../pages/CampaignsPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public / Unauthenticated routes */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      </Route>

      {/* Protected CRM Application routes */}
      <Route element={<MainLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.INBOX} element={<InboxPage />} />
        <Route path={ROUTES.CONTACTS} element={<ContactsPage />} />
        <Route path={ROUTES.LEADS} element={<LeadsPage />} />
        <Route path={ROUTES.TASKS} element={<TasksPage />} />
        <Route path={ROUTES.DEPARTMENTS} element={<DepartmentsPage />} />
        <Route path={ROUTES.USERS} element={<UsersPage />} />
        <Route path={ROUTES.CAMPAIGNS} element={<CampaignsPage />} />
        <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
};

export default AppRoutes;
