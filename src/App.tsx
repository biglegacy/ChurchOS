import React, { useState, useEffect } from 'react';
import { ApiClient } from './api';
import { User, Church } from './types';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DrawerMenu } from './components/DrawerMenu';
import { BottomNav } from './components/BottomNav';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { ChurchDashboard } from './components/ChurchDashboard';
import { MembersModule } from './components/MembersModule';
import { AttendanceModule } from './components/AttendanceModule';
import { GivingModule } from './components/GivingModule';
import { VisitorsModule } from './components/VisitorsModule';
import { PastoralModule } from './components/PastoralModule';
import { DepartmentsModule } from './components/DepartmentsModule';
import { EventsModule } from './components/EventsModule';
import { SmsModule } from './components/SmsModule';
import { ChurchSettingsModule } from './components/ChurchSettingsModule';
import { MemberPortalView } from './components/MemberPortalView';
import { ChurchStaffModule } from './components/ChurchStaffModule';
import { MembersProvider } from './context/MembersContext';
import { hasPermission } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(ApiClient.getUser());
  const [church, setChurch] = useState<Church | null>(ApiClient.getChurch());
  const [isInitializing, setIsInitializing] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const determineInitialTab = (u: User) => {
    if (u.role === 'SUPER_ADMIN') return 'sa-dashboard';
    if (u.role === 'MEMBER') return 'portal';
    if (hasPermission(u, 'view_dashboard')) return 'dashboard';
    if (hasPermission(u, 'manage_giving')) return 'giving';
    if (hasPermission(u, 'manage_members')) return 'members';
    if (hasPermission(u, 'manage_attendance')) return 'attendance';
    if (hasPermission(u, 'send_sms')) return 'sms';
    if (hasPermission(u, 'manage_pastoral')) return 'pastoral';
    return 'dashboard';
  };

  useEffect(() => {
    const verifyAuth = async () => {
      const token = ApiClient.getToken();
      if (token) {
        try {
          const res = await ApiClient.get('/api/auth/me');
          setUser(res.user);
          setChurch(res.church || null);
          setActiveTab(determineInitialTab(res.user));
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          ApiClient.logout();
          setUser(null);
          setChurch(null);
        }
      }
      setIsInitializing(false);
    };

    verifyAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser: User, loggedInChurch: Church | null, redirectTo: string) => {
    setUser(loggedInUser);
    setChurch(loggedInChurch);
    setActiveTab(determineInitialTab(loggedInUser));
  };

  const handleLogout = () => {
    ApiClient.logout();
    setUser(null);
    setChurch(null);
    setDrawerOpen(false);
    setActiveTab('dashboard');
  };

  const handleQuickAction = (action: string) => {
    if (action === 'record-giving') {
      setActiveTab('giving');
    } else if (action === 'add-member') {
      setActiveTab('members');
    } else if (action === 'add-visitor') {
      setActiveTab('visitors');
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Initializing ChurchOS...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show production login screen
  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isMember = user.role === 'MEMBER';

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Desktop Sleek Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={tab => setActiveTab(tab)}
        user={user}
        church={church}
        onLogout={handleLogout}
      />

      {/* Side Drawer Menu for Mobile / Small Screens */}
      <DrawerMenu
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={tab => setActiveTab(tab)}
        user={user}
        church={church}
        onLogout={handleLogout}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <Navbar
          user={user}
          church={church}
          onOpenDrawer={() => setDrawerOpen(true)}
          onLogout={handleLogout}
          onQuickAction={handleQuickAction}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* SUPER ADMIN CONSOLE */}
          {isSuperAdmin && (
            <SuperAdminDashboard
              activeTab={activeTab}
              onNavigateTab={tab => setActiveTab(tab)}
            />
          )}

          {/* MEMBER SANCTUARY PORTAL */}
          {isMember && (
            <MemberPortalView user={user} />
          )}

          {/* CHURCH TENANT SYSTEM (ADMIN / PASTORS / OFFICERS) */}
          {!isSuperAdmin && !isMember && (
            <MembersProvider churchId={church?.id}>
              <div>
                {activeTab === 'dashboard' && (
                  <ChurchDashboard
                    church={church}
                    onNavigateTab={tab => setActiveTab(tab)}
                    onQuickAction={handleQuickAction}
                  />
                )}

                {activeTab === 'members' && (
                  <MembersModule
                    church={church}
                    onRecordGivingForMember={() => setActiveTab('giving')}
                  />
                )}

                {activeTab === 'attendance' && (
                  <AttendanceModule />
                )}

                {activeTab === 'giving' && (
                  <GivingModule church={church} />
                )}

                {activeTab === 'visitors' && (
                  <VisitorsModule />
                )}

                {activeTab === 'pastoral' && (
                  <PastoralModule />
                )}

                {activeTab === 'departments' && (
                  <DepartmentsModule />
                )}

                {activeTab === 'events' && (
                  <EventsModule onNavigateTab={tab => setActiveTab(tab)} />
                )}

                {activeTab === 'sms' && (
                  <SmsModule
                    church={church}
                    onNavigateTab={tab => setActiveTab(tab)}
                  />
                )}

                {activeTab === 'staff' && (
                  <ChurchStaffModule church={church} />
                )}

                {activeTab === 'settings' && (
                  <ChurchSettingsModule
                    church={church}
                    onUpdateChurch={updated => setChurch(updated)}
                  />
                )}
              </div>
            </MembersProvider>
          )}
        </main>

        {/* Sleek Footer */}
        <footer className="h-12 bg-white border-t border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-slate-400 font-medium shrink-0">
          <p>&copy; {new Date().getFullYear()} {church?.name || 'ChurchOS'}. Multi-Tenant Secure Engine</p>
          <div className="flex gap-4">
            <span className="hover:text-teal-700 cursor-pointer transition-colors">Support Portal</span>
            <span className="hover:text-teal-700 cursor-pointer transition-colors">System Health</span>
          </div>
        </footer>
      </div>

      {/* Bottom Navigation for Mobile (Church Tenants only) */}
      {!isSuperAdmin && !isMember && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={tab => setActiveTab(tab)}
          onOpenMore={() => setDrawerOpen(true)}
        />
      )}
    </div>
  );
}
