'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar, AdminTabType } from '@/components/super-admin/admin-sidebar';
import { AdminHeader } from '@/components/super-admin/admin-header';
import { OverviewView } from '@/components/super-admin/overview-view';
import { StudentsView } from '@/components/super-admin/students-view';
import { DelegatesView } from '@/components/super-admin/delegates-view';
import { CoursesView } from '@/components/super-admin/courses-view';
import { ResultsView } from '@/components/super-admin/results-view';
import { StatisticsView } from '@/components/super-admin/statistics-view';
import { NotificationsView } from '@/components/super-admin/notifications-view';
import { ActivityView } from '@/components/super-admin/activity-view';
import { SettingsView } from '@/components/super-admin/settings-view';
import { SuperAdminsView } from '@/components/super-admin/super-admins-view';
import { ArchivageView } from '@/components/super-admin/archivage-view';

import { AdminStore } from '@/lib/admin-store';
import {
  StudentAccount,
  DelegateManagementRecord,
  AcademicResultItem,
  SystemAuditLog,
  SystemNotification,
  SystemStats,
  CourseItem
} from '@/lib/admin-types';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<string | null>(null);

  // State data loaded from AdminStore
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [delegates, setDelegates] = useState<DelegateManagementRecord[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [results, setResults] = useState<AcademicResultItem[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalStudents: 0,
    totalDelegates: 0,
    totalCourses: 0,
    recentPublicationsCount: 0,
    activeUsersCount: 42,
    studentsByLevel: {},
    studentsBySection: {},
    coursesByLevel: {},
    activityTimeline: []
  });

  const [selectedStudentForDelegateModal, setSelectedStudentForDelegateModal] = useState<StudentAccount | null>(null);

  // Verify server authentication on mount
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth/me');
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        // Fallback: check local session or redirect to login
        const localSession = AdminStore.getSuperAdminSession();
        if (!localSession) {
          router.push('/super-admin/login');
          return;
        }
      }
      setIsVerifying(false);
    } catch {
      const localSession = AdminStore.getSuperAdminSession();
      if (!localSession) {
        router.push('/super-admin/login');
        return;
      }
      setIsVerifying(false);
    }
  }, [router]);

  // Load state from server APIs with fallback
  const loadDashboardData = useCallback(async () => {
    try {
      const [statsRes, studentsRes, delegatesRes, coursesRes, logsRes] = await Promise.allSettled([
        fetch('/api/admin/statistics'),
        fetch('/api/admin/students'),
        fetch('/api/admin/delegates'),
        fetch('/api/courses?limit=100'),
        fetch('/api/admin/activity?limit=50'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const statsPayload = await statsRes.value.json();
        if (statsPayload.success && statsPayload.data) {
          setStats((prev) => ({ ...prev, ...statsPayload.data }));
        }
      } else {
        setStats(AdminStore.getSystemStats());
      }

      if (studentsRes.status === 'fulfilled' && studentsRes.value.ok) {
        const payload = await studentsRes.value.json();
        if (payload.success && Array.isArray(payload.data?.students)) {
          setStudents(payload.data.students);
        } else {
          setStudents(AdminStore.getStudents());
        }
      } else {
        setStudents(AdminStore.getStudents());
      }

      if (delegatesRes.status === 'fulfilled' && delegatesRes.value.ok) {
        const payload = await delegatesRes.value.json();
        if (payload.success && Array.isArray(payload.delegates)) {
          setDelegates(payload.delegates);
        } else {
          setDelegates(AdminStore.getDelegates());
        }
      } else {
        setDelegates(AdminStore.getDelegates());
      }

      if (coursesRes.status === 'fulfilled' && coursesRes.value.ok) {
        const payload = await coursesRes.value.json();
        if (payload.success && Array.isArray(payload.data)) {
          setCourses(payload.data);
        } else {
          setCourses(AdminStore.getAllCourses());
        }
      } else {
        setCourses(AdminStore.getAllCourses());
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
        const payload = await logsRes.value.json();
        if (payload.success && Array.isArray(payload.data?.logs)) {
          setLogs(payload.data.logs);
        } else {
          setLogs(AdminStore.getAuditLogs());
        }
      } else {
        setLogs(AdminStore.getAuditLogs());
      }

      setResults(AdminStore.getAcademicResults());
      setNotifications(AdminStore.getAdminNotifications());
    } catch {
      setStudents(AdminStore.getStudents());
      setDelegates(AdminStore.getDelegates());
      setCourses(AdminStore.getAllCourses());
      setResults(AdminStore.getAcademicResults());
      setNotifications(AdminStore.getAdminNotifications());
      setLogs(AdminStore.getAuditLogs());
      setStats(AdminStore.getSystemStats());
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const res = await fetch('/api/admin/auth/me');
        const data = await res.json();
        if (data?.user?.role) setCurrentUserRole(data.user.role);
        if (!res.ok || !data.authenticated) {
          const localSession = AdminStore.getSuperAdminSession();
          if (!localSession) {
            router.push('/super-admin/login');
            return;
          }
        }
      } catch {
        const localSession = AdminStore.getSuperAdminSession();
        if (!localSession) {
          router.push('/super-admin/login');
          return;
        }
      }
      if (mounted) {
        setIsVerifying(false);
        loadDashboardData();
        fetch('/api/academic-years')
          .then((r) => r.json())
          .then((payload) => {
            const years = payload?.data ?? [];
            const active = years.find((y: { status: string }) => y.status === 'active') || years[0];
            if (active) setActiveAcademicYearId(active.id);
          })
          .catch(() => {});
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [router, loadDashboardData]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    AdminStore.clearSuperAdminSession();
    router.push('/super-admin/login');
  };

  // Student Actions
  const handleUpdateStudentStatus = async (studentId: string, status: string) => {
    const result = await AdminStore.updateStudentStatus(studentId, status);
    loadDashboardData();
    return result;
  };

  const handleUpdateStudentLevel = async (studentId: string, levelCode: string, fieldCode: string) => {
    const result = await AdminStore.updateStudentLevel(studentId, levelCode, fieldCode);
    loadDashboardData();
    return result;
  };

  // Delegate Actions
  const handleCreateDelegate = async (params: {
    studentId: string;
    level: string;
    section: string;
    permissions: string[];
  }) => {
    const result = AdminStore.createDelegate(params);
    loadDashboardData();
    return result;
  };

  const handleCreateDelegateDirect = async (params: {
    email: string;
    name: string;
    level: string;
    section: string;
    permissions: string[];
  }) => {
    const result = AdminStore.createDelegateDirect(params);
    loadDashboardData();
    return result;
  };

  const handleRevokeDelegate = async (id: string) => {
    const result = await AdminStore.revokeDelegate(id);
    loadDashboardData();
    return result;
  };

  const handleReactivateDelegate = async (id: string) => {
    const result = await AdminStore.reactivateDelegate(id);
    loadDashboardData();
    return result;
  };

  const handleRegenerateCode = async (id: string) => {
    const result = AdminStore.regenerateDelegateCode(id);
    loadDashboardData();
    return result;
  };

  const handleUpdateDelegate = async (id: string, updates: any) => {
    const result = await AdminStore.updateDelegate(id, updates);
    loadDashboardData();
    return result;
  };

  // Course Actions
  const handleAddCourseByAdmin = async (courseData: any) => {
    const result = AdminStore.addCourseByAdmin(courseData);
    loadDashboardData();
    return result;
  };

  const handleUpdateCourseStatus = async (courseId: string, status: 'publié' | 'brouillon' | 'archivé') => {
    const result = await AdminStore.updateCourseStatus(courseId, status);
    loadDashboardData();
    return result;
  };

  const handleUpdateCourseMetadata = async (courseId: string, updates: Partial<CourseItem>) => {
    const result = AdminStore.updateCourseMetadata(courseId, updates);
    loadDashboardData();
    return result;
  };

  const handleDeleteCourse = async (courseId: string) => {
    const result = await AdminStore.deleteCoursePermanently(courseId);
    loadDashboardData();
    return result;
  };

  // Notification Actions
  const handleMarkNotificationAsRead = (id: string) => {
    AdminStore.markNotificationAsRead(id);
    loadDashboardData();
  };

  const handleClearAllNotifications = () => {
    AdminStore.clearAllNotifications();
    loadDashboardData();
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-ujlog-cream flex flex-col items-center justify-center space-y-3 text-ujlog-ink-soft">
        <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider">Vérification des droits d&apos;administration...</p>
      </div>
    );
  }

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-ujlog-cream text-ujlog-ink flex flex-col lg:flex-row">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <AdminHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          activeUsersCount={stats.activeUsersCount}
          unreadNotifsCount={unreadNotifs}
          onOpenNotifications={() => setActiveTab('notifications')}
          onRefreshData={loadDashboardData}
          isRefreshing={isRefreshing}
        />

        {/* View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              stats={stats}
              recentLogs={logs}
              onNavigateTab={setActiveTab}
              onOpenAddDelegate={() => setActiveTab('delegates')}
            />
          )}

          {activeTab === 'students' && (
            <StudentsView
              students={students}
              onUpdateStatus={handleUpdateStudentStatus}
              onUpdateLevel={handleUpdateStudentLevel}
              onOpenAddDelegateForStudent={(st) => {
                setSelectedStudentForDelegateModal(st);
                setActiveTab('delegates');
              }}
            />
          )}

          {activeTab === 'delegates' && (
            <DelegatesView
              delegates={delegates}
              students={students}
              onCreateDelegate={handleCreateDelegate}
              onCreateDelegateDirect={handleCreateDelegateDirect}
              onRevokeDelegate={handleRevokeDelegate}
              onReactivateDelegate={handleReactivateDelegate}
              onRegenerateCode={handleRegenerateCode}
              onUpdateDelegate={handleUpdateDelegate}
              initialSelectedStudent={selectedStudentForDelegateModal}
            />
          )}

          {activeTab === 'super_admins' && <SuperAdminsView />}

          {activeTab === 'courses' && (
            <CoursesView
              courses={courses}
              onAddCourse={handleAddCourseByAdmin}
              onUpdateStatus={handleUpdateCourseStatus}
              onUpdateMetadata={handleUpdateCourseMetadata}
              onDeleteCourse={handleDeleteCourse}
            />
          )}

          {activeTab === 'results' && <ResultsView results={results} />}

          {activeTab === 'archivage' && <ArchivageView />}

          {activeTab === 'statistics' && (
            <StatisticsView stats={stats} canExport={currentUserRole === 'super_admin'} academicYearId={activeAcademicYearId} />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAsRead={handleMarkNotificationAsRead}
              onClearAll={handleClearAllNotifications}
            />
          )}

          {activeTab === 'activity' && <ActivityView logs={logs} />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
