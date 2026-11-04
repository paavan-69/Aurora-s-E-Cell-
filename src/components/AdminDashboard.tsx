import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Award,
  Rocket,
  Users,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Upload,
  Download,
  RefreshCw,
  ExternalLink,
  Search,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import {
  calculateDashboardStats,
  filterUsers,
  validateEventInput,
  validateAchievementInput,
  validateStartupInput,
  type UserProfileRecord,
  type EventRecord,
  type AchievementRecord,
  type StartupRecord,
  type LoginActivityRecord,
  type AdminActivityRecord,
  type EventStatus,
  type StartupStatus,
  type AccountStatus,
} from '../utils/ecellLogic';
import { compressImageFileToDataUrl } from '../lib/firebase';
import { exportMasterDatabaseToExcel } from '../services/sheetsSyncService';

export type AdminSection = 'overview' | 'events' | 'achievements' | 'startups' | 'users';

export interface AdminDashboardProps {
  currentAdmin: UserProfileRecord;
  users: UserProfileRecord[];
  events: EventRecord[];
  achievements: AchievementRecord[];
  startups: StartupRecord[];
  loginLogs: LoginActivityRecord[];
  adminLogs: AdminActivityRecord[];
  spreadsheetInfo: {
    spreadsheetId: string;
    spreadsheetUrl: string;
    lastSyncedAt: string;
  };
  hasGoogleToken: boolean;
  isSyncingSheets: boolean;
  onConnectGoogleWorkspace: () => Promise<void>;
  onTriggerSheetsSync: () => Promise<void>;
  onSwitchToPortal: () => void;
  onLogout: () => Promise<void>;
  onSaveEvent: (
    eventData: Omit<EventRecord, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteEvent: (eventId: string, title: string) => Promise<void>;
  onSaveAchievement: (
    achData: Omit<AchievementRecord, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteAchievement: (achId: string, title: string) => Promise<void>;
  onSaveStartup: (
    startupData: Omit<StartupRecord, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteStartup: (startupId: string, name: string) => Promise<void>;
  onUpdateUserStatus: (userId: string, nextStatus: AccountStatus) => Promise<void>;
}

export function AdminDashboard({
  currentAdmin,
  users,
  events,
  achievements,
  startups,
  loginLogs,
  adminLogs,
  spreadsheetInfo,
  hasGoogleToken,
  isSyncingSheets,
  onConnectGoogleWorkspace,
  onTriggerSheetsSync,
  onSwitchToPortal,
  onLogout,
  onSaveEvent,
  onDeleteEvent,
  onSaveAchievement,
  onDeleteAchievement,
  onSaveStartup,
  onDeleteStartup,
  onUpdateUserStatus,
}: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Modal State (for Delete & Mutating Google Sheets Sync)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Event Form State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventPosterUrl, setEventPosterUrl] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventStatus, setEventStatus] = useState<EventStatus>('upcoming');
  const [eventAdditionalInfo, setEventAdditionalInfo] = useState('');
  const [eventRegUrl, setEventRegUrl] = useState('');
  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});

  // Achievement Form State
  const [editingAchId, setEditingAchId] = useState<string | null>(null);
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achImageUrl, setAchImageUrl] = useState('');
  const [achDate, setAchDate] = useState('');
  const [achAdditional, setAchAdditional] = useState('');
  const [achErrors, setAchErrors] = useState<Record<string, string>>({});

  // Startup Form State
  const [editingStartupId, setEditingStartupId] = useState<string | null>(null);
  const [startupName, setStartupName] = useState('');
  const [startupLogoUrl, setStartupLogoUrl] = useState('');
  const [startupDesc, setStartupDesc] = useState('');
  const [startupCategory, setStartupCategory] = useState('');
  const [startupFounder, setStartupFounder] = useState('');
  const [startupImageUrl, setStartupImageUrl] = useState('');
  const [startupStatus, setStartupStatus] = useState<StartupStatus>('incubating');
  const [startupAdditional, setStartupAdditional] = useState('');
  const [startupErrors, setStartupErrors] = useState<Record<string, string>>({});

  // User Management Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | AccountStatus>('all');

  const stats = calculateDashboardStats({ users, events, achievements, startups });
  const filteredUsersList = filterUsers(users, userSearch, 'all', userStatusFilter);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedbackBanner({ type, message });
    setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Image Upload Helper
  const handleImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setter(dataUrl);
      showToast('success', `Uploaded image "${file.name}" ready.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to process uploaded image.');
    }
  };

  // Reset Event Form
  const resetEventForm = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventDesc('');
    setEventPosterUrl('');
    setEventDate('');
    setEventTime('');
    setEventVenue('');
    setEventStatus('upcoming');
    setEventAdditionalInfo('');
    setEventRegUrl('');
    setEventErrors({});
  };

  const populateEventForEdit = (evt: EventRecord) => {
    setEditingEventId(evt.id);
    setEventTitle(evt.title);
    setEventDesc(evt.description);
    setEventPosterUrl(evt.posterUrl);
    setEventDate(evt.date);
    setEventTime(evt.time);
    setEventVenue(evt.venue);
    setEventStatus(evt.eventStatus);
    setEventAdditionalInfo(evt.additionalInfo);
    setEventRegUrl(evt.registrationUrl);
    setEventErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEventSubmit = async (publishNow: boolean) => {
    const validation = validateEventInput({
      title: eventTitle,
      description: eventDesc,
      date: eventDate,
      time: eventTime,
      venue: eventVenue,
      eventStatus,
      registrationUrl: eventRegUrl,
    });
    if (!validation.valid) {
      setEventErrors(validation.errors);
      return;
    }
    setEventErrors({});
    setIsSubmitting(true);
    try {
      await onSaveEvent(
        {
          title: eventTitle.trim(),
          description: eventDesc.trim(),
          posterUrl: eventPosterUrl.trim(),
          date: eventDate.trim(),
          time: eventTime.trim(),
          venue: eventVenue.trim(),
          eventStatus,
          additionalInfo: eventAdditionalInfo.trim(),
          registrationUrl: eventRegUrl.trim(),
          published: publishNow,
        },
        editingEventId || undefined
      );
      showToast(
        'success',
        editingEventId
          ? `Event "${eventTitle.trim()}" updated (${publishNow ? 'Published' : 'Draft'}).`
          : `Event "${eventTitle.trim()}" created (${publishNow ? 'Published' : 'Saved as Draft'}).`
      );
      resetEventForm();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Achievement Form
  const resetAchForm = () => {
    setEditingAchId(null);
    setAchTitle('');
    setAchDesc('');
    setAchImageUrl('');
    setAchDate('');
    setAchAdditional('');
    setAchErrors({});
  };

  const populateAchForEdit = (ach: AchievementRecord) => {
    setEditingAchId(ach.id);
    setAchTitle(ach.title);
    setAchDesc(ach.description);
    setAchImageUrl(ach.imageUrl);
    setAchDate(ach.date);
    setAchAdditional(ach.additionalDetails);
    setAchErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAchSubmit = async (publishNow: boolean) => {
    const validation = validateAchievementInput({
      title: achTitle,
      description: achDesc,
      date: achDate,
    });
    if (!validation.valid) {
      setAchErrors(validation.errors);
      return;
    }
    setAchErrors({});
    setIsSubmitting(true);
    try {
      await onSaveAchievement(
        {
          title: achTitle.trim(),
          description: achDesc.trim(),
          imageUrl: achImageUrl.trim(),
          date: achDate.trim(),
          additionalDetails: achAdditional.trim(),
          published: publishNow,
        },
        editingAchId || undefined
      );
      showToast(
        'success',
        editingAchId
          ? `Achievement "${achTitle.trim()}" updated.`
          : `Achievement "${achTitle.trim()}" saved.`
      );
      resetAchForm();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save achievement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Startup Form
  const resetStartupForm = () => {
    setEditingStartupId(null);
    setStartupName('');
    setStartupLogoUrl('');
    setStartupDesc('');
    setStartupCategory('');
    setStartupFounder('');
    setStartupImageUrl('');
    setStartupStatus('incubating');
    setStartupAdditional('');
    setStartupErrors({});
  };

  const populateStartupForEdit = (st: StartupRecord) => {
    setEditingStartupId(st.id);
    setStartupName(st.name);
    setStartupLogoUrl(st.logoUrl);
    setStartupDesc(st.description);
    setStartupCategory(st.category);
    setStartupFounder(st.founderInfo);
    setStartupImageUrl(st.imageUrl);
    setStartupStatus(st.currentStatus);
    setStartupAdditional(st.additionalDetails);
    setStartupErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartupSubmit = async (publishNow: boolean) => {
    const validation = validateStartupInput({
      name: startupName,
      description: startupDesc,
      category: startupCategory,
      currentStatus: startupStatus,
    });
    if (!validation.valid) {
      setStartupErrors(validation.errors);
      return;
    }
    setStartupErrors({});
    setIsSubmitting(true);
    try {
      await onSaveStartup(
        {
          name: startupName.trim(),
          logoUrl: startupLogoUrl.trim(),
          description: startupDesc.trim(),
          category: startupCategory.trim(),
          founderInfo: startupFounder.trim(),
          imageUrl: startupImageUrl.trim(),
          currentStatus: startupStatus,
          additionalDetails: startupAdditional.trim(),
          published: publishNow,
        },
        editingStartupId || undefined
      );
      showToast(
        'success',
        editingStartupId
          ? `Startup "${startupName.trim()}" updated.`
          : `Startup "${startupName.trim()}" saved.`
      );
      resetStartupForm();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save startup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-halftone-light text-[#0F0F0F] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-[#0F0F0F] text-[#FFFDF7] border-b-2 border-[#0F0F0F]">
        <div className="font-display font-extrabold text-lg tracking-tight text-[#FACC15] whitespace-nowrap shrink-0">
          AURORA E-CELL · ADMIN CONSOLE
        </div>

        <nav aria-label="Admin Sections" className="hidden lg:flex items-center gap-6 text-sm font-semibold text-neutral-300">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'events', label: 'Events' },
              { id: 'achievements', label: 'Achievements' },
              { id: 'startups', label: 'Startups' },
              { id: 'users', label: 'Users & Sheets' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`hover:text-[#FFFDF7] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === item.id
                  ? 'text-[#FACC15] underline decoration-2 underline-offset-4 decoration-[#FF5722]'
                  : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onSwitchToPortal}
            className="px-3.5 py-2 text-xs font-display font-bold bg-[#FFFDF7] text-[#0F0F0F] rounded-lg hover:bg-[#FACC15] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Student Portal</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 text-xs font-display font-bold bg-[#E11D48] text-[#FFFDF7] rounded-lg hover:bg-[#FF5722] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Mobile / Tablet Section Switcher */}
      <div className="lg:hidden bg-[#FFFDF7] border-b-2 border-[#0F0F0F] px-4 py-3 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'events', label: 'Events' },
            { id: 'achievements', label: 'Achievements' },
            { id: 'startups', label: 'Startups' },
            { id: 'users', label: 'Users & Sheets' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={`px-3 py-1.5 text-xs font-display font-bold rounded-lg border-2 border-[#0F0F0F] whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === item.id ? 'bg-[#FACC15] text-[#0F0F0F]' : 'bg-white text-neutral-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Feedback Notification Banner */}
        {feedbackBanner && (
          <div
            role="status"
            className={`p-4 border-2 border-[#0F0F0F] rounded-xl pop-shadow flex items-center justify-between gap-4 ${
              feedbackBanner.type === 'success' ? 'bg-[#FEFCE8]' : 'bg-[#FFF1F2]'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm font-bold">
              <CheckCircle2
                className={`w-5 h-5 shrink-0 ${
                  feedbackBanner.type === 'success' ? 'text-[#16A34A]' : 'text-[#E11D48]'
                }`}
              />
              <span>{feedbackBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-xs font-mono font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 sm:p-8 pop-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="text-xs font-mono font-bold text-[#FF5722] mb-1">
                  VERIFIED ADMIN SESSION · {currentAdmin.email.toUpperCase()}
                </div>
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F0F0F]">
                  Aurora E-Cell Administration Overview
                </h1>
                <p className="text-sm text-neutral-700 mt-1">
                  All counters below are calculated live from actual Firestore database records.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => exportMasterDatabaseToExcel({ users, loginLogs })}
                  className="px-4 py-2.5 bg-[#FACC15] text-[#0F0F0F] font-display font-extrabold text-xs border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FF5722] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('events')}
                  className="px-4 py-2.5 bg-[#0F0F0F] text-[#FFFDF7] font-display font-bold text-xs rounded-lg hover:bg-[#1D4ED8] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Manage Content</span>
                </button>
              </div>
            </div>

            {/* 4 Live Database KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow">
                <div className="text-xs font-mono font-bold text-neutral-600 mb-2">
                  TOTAL REGISTERED USERS
                </div>
                <div
                  data-testid="stat-registered-users"
                  className="font-mono font-bold text-4xl text-[#0F0F0F] tabular-nums"
                >
                  {stats.totalRegisteredUsers}
                </div>
                <div className="mt-2 text-xs text-neutral-600">
                  Synced with User Registrations sheet
                </div>
              </div>

              <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow">
                <div className="text-xs font-mono font-bold text-[#FF5722] mb-2">
                  PUBLISHED EVENTS
                </div>
                <div
                  data-testid="stat-published-events"
                  className="font-mono font-bold text-4xl text-[#0F0F0F] tabular-nums"
                >
                  {stats.totalPublishedEvents}
                </div>
                <div className="mt-2 text-xs text-neutral-600 tabular-nums">
                  {stats.totalDraftEvents} draft(s) hidden from public
                </div>
              </div>

              <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow">
                <div className="text-xs font-mono font-bold text-[#E11D48] mb-2">
                  TOTAL ACHIEVEMENTS
                </div>
                <div
                  data-testid="stat-published-achievements"
                  className="font-mono font-bold text-4xl text-[#0F0F0F] tabular-nums"
                >
                  {stats.totalAchievements}
                </div>
                <div className="mt-2 text-xs text-neutral-600">
                  Live in Achievements Chronicle
                </div>
              </div>

              <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow">
                <div className="text-xs font-mono font-bold text-[#1D4ED8] mb-2">
                  ACTIVE INCUBATING STARTUPS
                </div>
                <div
                  data-testid="stat-active-startups"
                  className="font-mono font-bold text-4xl text-[#0F0F0F] tabular-nums"
                >
                  {stats.totalActiveStartups}
                </div>
                <div className="mt-2 text-xs text-neutral-600">
                  Live in Startup Showcase
                </div>
              </div>
            </div>

            {/* Recent Registrations & Recent Admin Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Registrations */}
              <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
                <div className="flex items-center justify-between border-b-2 border-[#0F0F0F] pb-3">
                  <h2 className="font-display font-extrabold text-lg text-[#0F0F0F]">
                    Recent Registrations
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveSection('users')}
                    className="text-xs font-display font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                  >
                    View All Users
                  </button>
                </div>

                {users.length === 0 ? (
                  <p className="text-sm text-neutral-600 py-6 text-center">
                    No user registrations recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-neutral-300 font-mono text-neutral-500">
                          <th className="py-2 pr-3">Name</th>
                          <th className="py-2 pr-3">Email</th>
                          <th className="py-2 text-right">Registered</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {users.slice(0, 6).map((u) => (
                          <tr key={u.uid}>
                            <td className="py-2.5 pr-3 font-semibold text-[#0F0F0F]">
                              {u.fullName}
                            </td>
                            <td className="py-2.5 pr-3 text-neutral-700">{u.email}</td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-neutral-600">
                              {u.registrationDate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent Admin Activity */}
              <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
                <div className="flex items-center justify-between border-b-2 border-[#0F0F0F] pb-3">
                  <h2 className="font-display font-extrabold text-lg text-[#0F0F0F]">
                    Recent Admin Activity
                  </h2>
                  <span className="text-xs font-mono text-neutral-500 tabular-nums">
                    {adminLogs.length} log entries
                  </span>
                </div>

                {adminLogs.length === 0 ? (
                  <p className="text-sm text-neutral-600 py-6 text-center">
                    No administrative actions logged yet.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {adminLogs.slice(0, 8).map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-white border border-neutral-300 rounded-lg text-xs flex items-start justify-between gap-3"
                      >
                        <div>
                          <span className="font-bold text-[#0F0F0F]">{log.action}</span>
                          <span className="text-neutral-600"> · {log.targetTitle}</span>
                        </div>
                        <span className="font-mono text-[11px] text-neutral-500 uppercase shrink-0">
                          {log.targetType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. EVENTS MANAGEMENT TAB */}
        {activeSection === 'events' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Event Editor Form */}
            <div className="lg:col-span-5 bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#0F0F0F] pb-3">
                <h2 className="font-display font-extrabold text-xl text-[#0F0F0F]">
                  {editingEventId ? 'Edit Event' : 'Add New Event'}
                </h2>
                {editingEventId && (
                  <button
                    type="button"
                    onClick={resetEventForm}
                    className="text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label htmlFor="evt-title" className="block text-xs font-display font-bold mb-1">
                    Event Title *
                  </label>
                  <input
                    id="evt-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Enter event title"
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                  {eventErrors.title && (
                    <p className="text-xs text-[#E11D48] font-semibold mt-1">{eventErrors.title}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="evt-date" className="block text-xs font-display font-bold mb-1">
                      Date *
                    </label>
                    <input
                      id="evt-date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                    />
                    {eventErrors.date && (
                      <p className="text-xs text-[#E11D48] font-semibold mt-1">{eventErrors.date}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="evt-time" className="block text-xs font-display font-bold mb-1">
                      Time *
                    </label>
                    <input
                      id="evt-time"
                      type="text"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="e.g., 10:30 AM"
                      className="w-full px-3 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                    />
                    {eventErrors.time && (
                      <p className="text-xs text-[#E11D48] font-semibold mt-1">{eventErrors.time}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="evt-venue" className="block text-xs font-display font-bold mb-1">
                      Venue *
                    </label>
                    <input
                      id="evt-venue"
                      type="text"
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      placeholder="Enter venue"
                      className="w-full px-3 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                    />
                    {eventErrors.venue && (
                      <p className="text-xs text-[#E11D48] font-semibold mt-1">{eventErrors.venue}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="evt-status" className="block text-xs font-display font-bold mb-1">
                      Event Status *
                    </label>
                    <select
                      id="evt-status"
                      value={eventStatus}
                      onChange={(e) => setEventStatus(e.target.value as EventStatus)}
                      className="w-full px-3 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="evt-desc" className="block text-xs font-display font-bold mb-1">
                    Description *
                  </label>
                  <textarea
                    id="evt-desc"
                    rows={4}
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Enter complete event description..."
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                  {eventErrors.description && (
                    <p className="text-xs text-[#E11D48] font-semibold mt-1">
                      {eventErrors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="evt-poster-upload" className="block text-xs font-display font-bold mb-1">
                    Event Poster (Upload File or Image URL)
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <label
                      htmlFor="evt-poster-upload"
                      className="px-3 py-2 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Poster</span>
                    </label>
                    <input
                      id="evt-poster-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e, setEventPosterUrl)}
                      className="hidden"
                    />
                    <input
                      type="url"
                      aria-label="Event Poster Image URL"
                      value={eventPosterUrl.startsWith('data:') ? '' : eventPosterUrl}
                      onChange={(e) => setEventPosterUrl(e.target.value)}
                      placeholder="Or paste image URL..."
                      className="flex-1 px-3 py-1.5 bg-white border-2 border-[#0F0F0F] rounded-lg text-xs"
                    />
                  </div>
                  {eventPosterUrl && (
                    <div className="flex items-center justify-between text-xs text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded">
                      <span className="truncate">Poster attached</span>
                      <button
                        type="button"
                        onClick={() => setEventPosterUrl('')}
                        className="text-[#E11D48] font-bold ml-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="evt-reg-url" className="block text-xs font-display font-bold mb-1">
                    Registration URL (Optional)
                  </label>
                  <input
                    id="evt-reg-url"
                    type="url"
                    value={eventRegUrl}
                    onChange={(e) => setEventRegUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                  {eventErrors.registrationUrl && (
                    <p className="text-xs text-[#E11D48] font-semibold mt-1">
                      {eventErrors.registrationUrl}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="evt-info" className="block text-xs font-display font-bold mb-1">
                    Additional Information (Optional)
                  </label>
                  <textarea
                    id="evt-info"
                    rows={2}
                    value={eventAdditionalInfo}
                    onChange={(e) => setEventAdditionalInfo(e.target.value)}
                    placeholder="Rules, eligibility, or speaker notes..."
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleEventSubmit(true)}
                    className="flex-1 py-2.5 px-4 bg-[#FF5722] text-[#0F0F0F] font-display font-extrabold text-xs border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FACC15] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {editingEventId ? 'Update & Publish' : 'Publish Event'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleEventSubmit(false)}
                    className="py-2.5 px-4 bg-white text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Events List */}
            <div className="lg:col-span-7 bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#0F0F0F] pb-3">
                <h2 className="font-display font-extrabold text-xl text-[#0F0F0F]">
                  Managed Events ({events.length})
                </h2>
                <span className="text-xs font-mono text-neutral-600">
                  Published: {events.filter((e) => e.published).length} · Drafts:{' '}
                  {events.filter((e) => !e.published).length}
                </span>
              </div>

              {events.length === 0 ? (
                <p className="text-sm text-neutral-600 py-10 text-center">
                  No events created yet. Use the form on the left to add your first event.
                </p>
              ) : (
                <div className="space-y-4">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-4 bg-white border-2 border-[#0F0F0F] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span
                            className={`font-bold ${
                              evt.published ? 'text-[#16A34A]' : 'text-[#D97706]'
                            }`}
                          >
                            {evt.published ? 'PUBLISHED' : 'DRAFT (HIDDEN)'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="uppercase">{evt.eventStatus}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{evt.date}</span>
                        </div>
                        <h3 className="font-display font-extrabold text-base text-[#0F0F0F]">
                          {evt.title}
                        </h3>
                        <p className="text-xs text-neutral-600 line-clamp-2">{evt.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => populateEventForEdit(evt)}
                          aria-label={`Edit event ${evt.title}`}
                          className="px-3 py-1.5 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              title: 'Delete Event?',
                              description: `Are you sure you want to permanently delete "${evt.title}"? This action cannot be undone.`,
                              confirmLabel: 'Delete Event',
                              onConfirm: async () => {
                                await onDeleteEvent(evt.id, evt.title);
                                showToast('success', `Deleted event "${evt.title}".`);
                              },
                            })
                          }
                          aria-label={`Delete event ${evt.title}`}
                          className="px-3 py-1.5 bg-[#FFF1F2] text-[#E11D48] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ACHIEVEMENTS MANAGEMENT TAB */}
        {activeSection === 'achievements' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Achievement Editor Form */}
            <div className="lg:col-span-5 bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#0F0F0F] pb-3">
                <h2 className="font-display font-extrabold text-xl text-[#0F0F0F]">
                  {editingAchId ? 'Edit Achievement' : 'Add Achievement'}
                </h2>
                {editingAchId && (
                  <button
                    type="button"
                    onClick={resetAchForm}
                    className="text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label htmlFor="ach-title" className="block text-xs font-display font-bold mb-1">
                    Achievement Title *
                  </label>
                  <input
                    id="ach-title"
                    type="text"
                    value={achTitle}
                    onChange={(e) => setAchTitle(e.target.value)}
                    placeholder="Enter achievement title"
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                  {achErrors.title && (
                    <p className="text-xs text-[#E11D48] font-semibold mt-1">{achErrors.title}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ach-date" className="block text-xs font-display font-bold mb-1">
                    Date *
                  </label>
                  <input
                    id="ach-date"
                    type="date"
                    value={achDate}
                    onChange={(e) => setAchDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                  {achErrors.date && (
                    <p className="text-xs text-[#E11D48] font-semibold mt-1">{achErrors.date}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ach-desc" className="block text-xs font-display font-bold mb-1">
                    Description *
                  </label>
                  <textarea
                    id="ach-desc"
                    rows={4}
                    value={achDesc}
                    onChange={(e) => setAchDesc(e.target.value)}
                    placeholder="Describe the milestone or recognition..."
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                  {achErrors.description && (
                    <p className="text-xs text-[#E11D48] font-semibold mt-1">
                      {achErrors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="ach-img-upload" className="block text-xs font-display font-bold mb-1">
                    Achievement Image (Upload or URL)
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <label
                      htmlFor="ach-img-upload"
                      className="px-3 py-2 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image</span>
                    </label>
                    <input
                      id="ach-img-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e, setAchImageUrl)}
                      className="hidden"
                    />
                    <input
                      type="url"
                      aria-label="Achievement Image URL"
                      value={achImageUrl.startsWith('data:') ? '' : achImageUrl}
                      onChange={(e) => setAchImageUrl(e.target.value)}
                      placeholder="Or paste image URL..."
                      className="flex-1 px-3 py-1.5 bg-white border-2 border-[#0F0F0F] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ach-extra" className="block text-xs font-display font-bold mb-1">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    id="ach-extra"
                    rows={2}
                    value={achAdditional}
                    onChange={(e) => setAchAdditional(e.target.value)}
                    placeholder="Team members, jury notes, or context..."
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAchSubmit(true)}
                    className="flex-1 py-2.5 px-4 bg-[#FF5722] text-[#0F0F0F] font-display font-extrabold text-xs border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FACC15] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {editingAchId ? 'Update & Publish' : 'Publish Achievement'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAchSubmit(false)}
                    className="py-2.5 px-4 bg-white text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Achievements List */}
            <div className="lg:col-span-7 bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#0F0F0F] pb-3">
                <h2 className="font-display font-extrabold text-xl text-[#0F0F0F]">
                  Managed Achievements ({achievements.length})
                </h2>
              </div>

              {achievements.length === 0 ? (
                <p className="text-sm text-neutral-600 py-10 text-center">
                  No achievements created yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-4 bg-white border-2 border-[#0F0F0F] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span
                            className={`font-bold ${
                              ach.published ? 'text-[#16A34A]' : 'text-[#D97706]'
                            }`}
                          >
                            {ach.published ? 'PUBLISHED' : 'DRAFT'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{ach.date}</span>
                        </div>
                        <h3 className="font-display font-extrabold text-base text-[#0F0F0F]">
                          {ach.title}
                        </h3>
                        <p className="text-xs text-neutral-600 line-clamp-2">{ach.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => populateAchForEdit(ach)}
                          aria-label={`Edit achievement ${ach.title}`}
                          className="px-3 py-1.5 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              title: 'Delete Achievement?',
                              description: `Are you sure you want to permanently delete "${ach.title}"?`,
                              confirmLabel: 'Delete Achievement',
                              onConfirm: async () => {
                                await onDeleteAchievement(ach.id, ach.title);
                                showToast('success', `Deleted achievement "${ach.title}".`);
                              },
                            })
                          }
                          aria-label={`Delete achievement ${ach.title}`}
                          className="px-3 py-1.5 bg-[#FFF1F2] text-[#E11D48] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. STARTUPS MANAGEMENT TAB */}
        {activeSection === 'startups' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Startup Editor Form */}
            <div className="lg:col-span-5 bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#0F0F0F] pb-3">
                <h2 className="font-display font-extrabold text-xl text-[#0F0F0F]">
                  {editingStartupId ? 'Edit Startup Profile' : 'Add Incubating Startup'}
                </h2>
                {editingStartupId && (
                  <button
                    type="button"
                    onClick={resetStartupForm}
                    className="text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label htmlFor="st-name" className="block text-xs font-display font-bold mb-1">
                    Startup Name *
                  </label>
                  <input
                    id="st-name"
                    type="text"
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                    placeholder="Enter startup name"
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                  {startupErrors.name && (
                    <p className="text-xs text-[#E11D48] font-semibold mt-1">
                      {startupErrors.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="st-cat" className="block text-xs font-display font-bold mb-1">
                      Industry / Category *
                    </label>
                    <input
                      id="st-cat"
                      type="text"
                      value={startupCategory}
                      onChange={(e) => setStartupCategory(e.target.value)}
                      placeholder="e.g., FinTech, EdTech, SaaS"
                      className="w-full px-3 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                    />
                    {startupErrors.category && (
                      <p className="text-xs text-[#E11D48] font-semibold mt-1">
                        {startupErrors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="st-status" className="block text-xs font-display font-bold mb-1">
                      Startup Status *
                    </label>
                    <select
                      id="st-status"
                      value={startupStatus}
                      onChange={(e) => setStartupStatus(e.target.value as StartupStatus)}
                      className="w-full px-3 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                    >
                      <option value="ideation">Ideation</option>
                      <option value="incubating">Incubating</option>
                      <option value="mvp">MVP</option>
                      <option value="funded">Funded</option>
                      <option value="graduated">Graduated</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="st-founder" className="block text-xs font-display font-bold mb-1">
                    Founder Details (Optional)
                  </label>
                  <input
                    id="st-founder"
                    type="text"
                    value={startupFounder}
                    onChange={(e) => setStartupFounder(e.target.value)}
                    placeholder="Founder name(s) and department/year"
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="st-desc" className="block text-xs font-display font-bold mb-1">
                    Startup Description *
                  </label>
                  <textarea
                    id="st-desc"
                    rows={4}
                    value={startupDesc}
                    onChange={(e) => setStartupDesc(e.target.value)}
                    placeholder="What problem does this startup solve?"
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                  {startupErrors.description && (
                    <p className="text-xs text-[#E11D48] font-semibold mt-1">
                      {startupErrors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="st-logo-upload" className="block text-xs font-display font-bold mb-1">
                    Startup Logo (Upload or URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="st-logo-upload"
                      className="px-3 py-2 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                    </label>
                    <input
                      id="st-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e, setStartupLogoUrl)}
                      className="hidden"
                    />
                    <input
                      type="url"
                      aria-label="Startup Logo URL"
                      value={startupLogoUrl.startsWith('data:') ? '' : startupLogoUrl}
                      onChange={(e) => setStartupLogoUrl(e.target.value)}
                      placeholder="Or paste logo URL..."
                      className="flex-1 px-3 py-1.5 bg-white border-2 border-[#0F0F0F] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="st-extra" className="block text-xs font-display font-bold mb-1">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    id="st-extra"
                    rows={2}
                    value={startupAdditional}
                    onChange={(e) => setStartupAdditional(e.target.value)}
                    placeholder="Traction, website link, or incubation notes..."
                    className="w-full px-3.5 py-2 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleStartupSubmit(true)}
                    className="flex-1 py-2.5 px-4 bg-[#FF5722] text-[#0F0F0F] font-display font-extrabold text-xs border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FACC15] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {editingStartupId ? 'Update & Publish' : 'Publish Startup'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleStartupSubmit(false)}
                    className="py-2.5 px-4 bg-white text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Startups List */}
            <div className="lg:col-span-7 bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#0F0F0F] pb-3">
                <h2 className="font-display font-extrabold text-xl text-[#0F0F0F]">
                  Managed Startups ({startups.length})
                </h2>
              </div>

              {startups.length === 0 ? (
                <p className="text-sm text-neutral-600 py-10 text-center">
                  No startup profiles added yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {startups.map((st) => (
                    <div
                      key={st.id}
                      className="p-4 bg-white border-2 border-[#0F0F0F] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span
                            className={`font-bold ${
                              st.published ? 'text-[#16A34A]' : 'text-[#D97706]'
                            }`}
                          >
                            {st.published ? 'PUBLISHED' : 'DRAFT'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{st.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="uppercase">{st.currentStatus}</span>
                        </div>
                        <h3 className="font-display font-extrabold text-base text-[#0F0F0F]">
                          {st.name}
                        </h3>
                        <p className="text-xs text-neutral-600 line-clamp-2">{st.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => populateStartupForEdit(st)}
                          aria-label={`Edit startup ${st.name}`}
                          className="px-3 py-1.5 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              title: 'Delete Startup Profile?',
                              description: `Are you sure you want to permanently delete "${st.name}"?`,
                              confirmLabel: 'Delete Startup',
                              onConfirm: async () => {
                                await onDeleteStartup(st.id, st.name);
                                showToast('success', `Deleted startup "${st.name}".`);
                              },
                            })
                          }
                          aria-label={`Delete startup ${st.name}`}
                          className="px-3 py-1.5 bg-[#FFF1F2] text-[#E11D48] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. USER MANAGEMENT & GOOGLE DRIVE / SHEETS INTEGRATION TAB */}
        {activeSection === 'users' && (
          <div className="space-y-8">
            {/* Google Drive + Sheets Master Database Sync Card */}
            <div className="bg-halftone-yellow border-2 border-[#0F0F0F] rounded-xl p-6 sm:p-8 pop-shadow-lg space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="text-xs font-mono font-bold text-[#0F0F0F]">
                    GOOGLE DRIVE + EXCEL INTEGRATION
                  </div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F0F0F]">
                    Master Spreadsheet: AURORA E-CELL — USER DATABASE
                  </h2>
                  <p className="text-sm text-[#0F0F0F] leading-relaxed">
                    Every user registration (Sheet 1: <strong>User Registrations</strong>) and
                    sign-in event (Sheet 2: <strong>Login Activity</strong>) is recorded in
                    Firestore and synchronised with your Google Drive master spreadsheet. Passwords
                    and authentication tokens are never stored.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {!hasGoogleToken ? (
                    <button
                      type="button"
                      onClick={onConnectGoogleWorkspace}
                      className="px-5 py-3 bg-[#FFFDF7] text-[#0F0F0F] font-display font-extrabold text-xs border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FF5722] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
                      <span>Connect Google Drive &amp; Sheets</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSyncingSheets}
                      onClick={() =>
                        setConfirmDialog({
                          title: "Update 'AURORA E-CELL — USER DATABASE' in Google Drive?",
                          description: `This will synchronise ${stats.totalRegisteredUsers} deduplicated user registration(s) to Sheet 1 ('User Registrations') and ${loginLogs.length} login activity record(s) to Sheet 2 ('Login Activity') in your Google Drive spreadsheet.`,
                          confirmLabel: 'Confirm & Sync Spreadsheet',
                          onConfirm: async () => {
                            await onTriggerSheetsSync();
                            showToast(
                              'success',
                              'Synchronised AURORA E-CELL — USER DATABASE in Google Drive.'
                            );
                          },
                        })
                      }
                      className="px-5 py-3 bg-[#FF5722] text-[#0F0F0F] font-display font-extrabold text-xs border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FFFDF7] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                      <span>
                        {isSyncingSheets ? 'Syncing with Google Drive...' : 'Sync Now to Google Drive'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      exportMasterDatabaseToExcel({ users, loginLogs });
                      showToast(
                        'success',
                        'Downloaded AURORA_E-CELL_USER_DATABASE.xlsx with both worksheets.'
                      );
                    }}
                    data-testid="export-excel-btn"
                    className="px-5 py-3 bg-[#0F0F0F] text-[#FFFDF7] font-display font-extrabold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-[#1D4ED8] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Sync Metadata Strip */}
              <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-3">
                  <span>SHEET 1 (USER REGISTRATIONS): {stats.totalRegisteredUsers} ROWS</span>
                  <span aria-hidden="true">·</span>
                  <span>SHEET 2 (LOGIN ACTIVITY): {loginLogs.length} ROWS</span>
                  {spreadsheetInfo.lastSyncedAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>LAST SYNCED: {spreadsheetInfo.lastSyncedAt}</span>
                    </>
                  )}
                </div>

                {spreadsheetInfo.spreadsheetUrl && (
                  <a
                    href={spreadsheetInfo.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1D4ED8] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Open Master Google Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Registered Users Table */}
            <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#0F0F0F] pb-4">
                <div>
                  <h2 className="font-display font-extrabold text-xl text-[#0F0F0F]">
                    Registered Users ({filteredUsersList.length})
                  </h2>
                  <p className="text-xs text-neutral-600">
                    Sheet 1 columns: User ID · Full Name · Email Address · Registration Date ·
                    Registration Time · Account Status
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      aria-label="Search registered users"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search name, email, ID..."
                      className="pl-9 pr-3 py-1.5 bg-white border-2 border-[#0F0F0F] rounded-lg text-xs"
                    />
                  </div>

                  <select
                    aria-label="Filter users by account status"
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as 'all' | AccountStatus)}
                    className="px-3 py-1.5 bg-white border-2 border-[#0F0F0F] rounded-lg text-xs font-semibold"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {filteredUsersList.length === 0 ? (
                <p className="text-sm text-neutral-600 py-8 text-center">
                  No registered users match your current filter.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b-2 border-[#0F0F0F] font-mono text-neutral-600">
                        <th className="py-2.5 pr-4">User ID</th>
                        <th className="py-2.5 pr-4">Full Name</th>
                        <th className="py-2.5 pr-4">Email Address</th>
                        <th className="py-2.5 pr-4">Registration Date</th>
                        <th className="py-2.5 pr-4">Registration Time</th>
                        <th className="py-2.5 pr-4">Account Status</th>
                        <th className="py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {filteredUsersList.map((u) => (
                        <tr key={u.uid} className="hover:bg-neutral-100/70">
                          <td className="py-3 pr-4 font-mono text-[11px] text-neutral-600">
                            {u.uid.slice(0, 14)}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-[#0F0F0F]">{u.fullName}</td>
                          <td className="py-3 pr-4 text-neutral-800">{u.email}</td>
                          <td className="py-3 pr-4 font-mono tabular-nums">{u.registrationDate}</td>
                          <td className="py-3 pr-4 font-mono tabular-nums">{u.registrationTime}</td>
                          <td className="py-3 pr-4 font-mono uppercase font-bold">
                            <span
                              className={
                                u.accountStatus === 'active' ? 'text-[#16A34A]' : 'text-[#E11D48]'
                              }
                            >
                              {u.accountStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {u.uid !== currentAdmin.uid && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStatus: AccountStatus =
                                    u.accountStatus === 'active' ? 'suspended' : 'active';
                                  setConfirmDialog({
                                    title: `${
                                      nextStatus === 'suspended' ? 'Suspend' : 'Activate'
                                    } User Account?`,
                                    description: `Change account status for ${u.fullName} (${u.email}) to "${nextStatus}"?`,
                                    confirmLabel: 'Update Status',
                                    onConfirm: async () => {
                                      await onUpdateUserStatus(u.uid, nextStatus);
                                      showToast(
                                        'success',
                                        `Updated ${u.email} status to ${nextStatus}.`
                                      );
                                    },
                                  });
                                }}
                                className="px-2.5 py-1 bg-white border border-[#0F0F0F] rounded font-display font-bold text-[11px] hover:bg-[#FACC15] cursor-pointer"
                              >
                                {u.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Historical Login Activity Table (Sheet 2 Preview) */}
            <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
              <div className="border-b-2 border-[#0F0F0F] pb-3">
                <h2 className="font-display font-extrabold text-xl text-[#0F0F0F]">
                  Historical Login Activity ({loginLogs.length})
                </h2>
                <p className="text-xs text-neutral-600">
                  Sheet 2 columns: User ID · Email Address · Login Date · Login Time · Login Method
                </p>
              </div>

              {loginLogs.length === 0 ? (
                <p className="text-sm text-neutral-600 py-6 text-center">
                  No login activity recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b-2 border-[#0F0F0F] font-mono text-neutral-600">
                        <th className="py-2 pr-4">User ID</th>
                        <th className="py-2 pr-4">Email Address</th>
                        <th className="py-2 pr-4">Login Date</th>
                        <th className="py-2 pr-4">Login Time</th>
                        <th className="py-2 text-right">Login Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {loginLogs.slice(0, 15).map((log) => (
                        <tr key={log.id}>
                          <td className="py-2.5 pr-4 font-mono text-[11px] text-neutral-600">
                            {log.userId.slice(0, 14)}
                          </td>
                          <td className="py-2.5 pr-4 text-[#0F0F0F] font-medium">{log.email}</td>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">{log.loginDate}</td>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">{log.loginTime}</td>
                          <td className="py-2.5 text-right font-mono uppercase text-[#1D4ED8]">
                            {log.loginMethod}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mandatory Confirmation Dialog for Destructive / Mutating Operations */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl max-w-md w-full p-6 pop-shadow-lg space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[#FF5722] shrink-0 mt-0.5" />
              <div>
                <h3
                  id="confirm-dialog-title"
                  className="font-display font-extrabold text-lg text-[#0F0F0F]"
                >
                  {confirmDialog.title}
                </h3>
                <p className="text-sm text-neutral-700 mt-1 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-white text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await action();
                }}
                className="px-4 py-2 bg-[#FF5722] text-[#0F0F0F] font-display font-extrabold text-xs border-2 border-[#0F0F0F] rounded-lg pop-shadow cursor-pointer"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
