import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { KycPage } from './pages/KycPage';
import { LandingPage } from './pages/LandingPage';
import { LegalPage } from './pages/LegalPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProProfileEditorPage } from './pages/ProProfileEditorPage';
import { SecurityPage } from './pages/SecurityPage';
import { SignupPage } from './pages/SignupPage';
import { TraderProfilePage } from './pages/TraderProfilePage';
import { BrowseTradersPage } from './pages/BrowseTradersPage';
import { RequestsPage } from './pages/RequestsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfitCalculatorPage } from './pages/ProfitCalculatorPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { DisputesPage } from './pages/DisputesPage';
import { SettlementsPage } from './pages/SettlementsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVerifyPage } from './pages/admin/AdminVerifyPage';
import { AdminConnectionsDisputesPage } from './pages/admin/AdminConnectionsDisputesPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminFinancePage } from './pages/admin/AdminFinancePage';
import { AdminGovernancePage } from './pages/admin/AdminGovernancePage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/faq" element={<LegalPage pageKey="faq" />} />
            <Route path="/help" element={<LegalPage pageKey="help" />} />
            <Route path="/contact" element={<LegalPage pageKey="contact" />} />
            <Route path="/legal/terms" element={<LegalPage pageKey="terms" />} />
            <Route path="/legal/risk" element={<LegalPage pageKey="risk" />} />
            <Route path="/legal/privacy" element={<LegalPage pageKey="privacy" />} />
            <Route path="/legal/advertising" element={<LegalPage pageKey="advertising" />} />

            {/* Phase 2 routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/kyc" element={<KycPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/security" element={<SecurityPage />} />

            {/* Phase 3 routes */}
            <Route path="/profile-editor" element={<ProProfileEditorPage />} />
            <Route path="/traders/:traderId" element={<TraderProfilePage />} />

            {/* Phase 4, 5, 6 & Profit Calculator routes */}
            <Route path="/traders" element={<BrowseTradersPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/connections/:connectionId" element={<ConnectionsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/disputes" element={<DisputesPage />} />
            <Route path="/settlements" element={<SettlementsPage />} />
            <Route path="/calculator" element={<ProfitCalculatorPage />} />

            {/* Phase 9 Admin Control Center routes */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/verify" element={<AdminVerifyPage />} />
            <Route
              path="/admin/connections"
              element={<AdminConnectionsDisputesPage key="connections" defaultTab="connections" />}
            />
            <Route
              path="/admin/disputes"
              element={<AdminConnectionsDisputesPage key="disputes" defaultTab="disputes" />}
            />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/finance" element={<AdminFinancePage />} />
            <Route
              path="/admin/fraud"
              element={<AdminGovernancePage key="fraud" defaultTab="fraud" />}
            />
            <Route
              path="/admin/audit"
              element={<AdminGovernancePage key="audit" defaultTab="audit" />}
            />
            <Route
              path="/admin/launch"
              element={<AdminGovernancePage key="launch" defaultTab="launch" />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AppProvider>
  );
}
