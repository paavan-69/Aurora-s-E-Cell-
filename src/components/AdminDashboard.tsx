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
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Sparkles,
  Handshake,
  Crown,
  GraduationCap,
} from 'lucide-react';
import {
  MAX_NEC_MEMBERS,
  calculateDashboardStats,
  filterUsers,
  sortRecordsByDisplayOrder,
  validateEventInput,
  validateAchievementInput,
  validateStartupInput,
  validateNecMemberInput,
  validateLeadershipInput,
  validateSponsorInput,
  validateLogoFileMetadata,
  validateWebsiteBrandingInput,
  type UserProfileRecord,
  type EventRecord,
  type AchievementRecord,
  type StartupRecord,
  type NecMemberRecord,
  type LeadershipRecord,
  type LeadershipCategory,
  type SponsorRecord,
  type SponsorCategory,
  type LoginActivityRecord,
  type AdminActivityRecord,
  type EventStatus,
  type StartupStatus,
  type AccountStatus,
} from '../utils/ecellLogic';
import { compressImageFileToDataUrl, processLogoFileToDataUrl } from '../lib/firebase';
import { exportMasterDatabaseToExcel } from '../services/sheetsSyncService';
import { HeaderBrandLogo } from './PopArtGraphics';

export type AdminSection =
  | 'overview'
  | 'events'
  | 'achievements'
  | 'startups'
  | 'nec'
  | 'leadership'
  | 'sponsors'
  | 'branding'
  | 'users';

export interface AdminDashboardProps {
  currentAdmin: UserProfileRecord;
  users: UserProfileRecord[];
  events: EventRecord[];
  achievements: AchievementRecord[];
  startups: StartupRecord[];
  necMembers: NecMemberRecord[];
  leadershipMembers: LeadershipRecord[];
  sponsors: SponsorRecord[];
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
  onSaveNecMember: (
    memberData: {
      name: string;
      role: string;
      photoUrl: string;
      published: boolean;
    },
    existingId?: string
  ) => Promise<void>;
  onDeleteNecMember: (memberId: string, name: string) => Promise<void>;
  onReorderNecMember: (memberId: string, direction: 'up' | 'down') => Promise<void>;
  onSaveLeadership: (
    leaderData: {
      name: string;
      role: string;
      qualification: string;
      photoUrl: string;
      category: LeadershipCategory;
      published: boolean;
    },
    existingId?: string
  ) => Promise<void>;
  onDeleteLeadership: (leaderId: string, name: string) => Promise<void>;
  onReorderLeadership: (leaderId: string, direction: 'up' | 'down') => Promise<void>;
  onSaveSponsor: (
    sponsorData: {
      name: string;
      logoUrl: string;
      category: SponsorCategory;
      published: boolean;
    },
    existingId?: string
  ) => Promise<void>;
  onDeleteSponsor: (sponsorId: string, name: string) => Promise<void>;
  onReorderSponsor: (sponsorId: string, direction: 'up' | 'down') => Promise<void>;
  onUpdateUserStatus: (userId: string, nextStatus: AccountStatus) => Promise<void>;
  websiteBranding: {
    ecellLogoUrl: string;
    collegeLogoUrl: string;
  };
  onSaveWebsiteBranding: (branding: {
    ecellLogoUrl: string;
    collegeLogoUrl: string;
  }) => Promise<void>;
}

export function AdminDashboard({
  currentAdmin,
  users,
  events,
  achievements,
  startups,
  necMembers,
  leadershipMembers,
  sponsors,
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
  onSaveNecMember,
  onDeleteNecMember,
  onReorderNecMember,
  onSaveLeadership,
  onDeleteLeadership,
  onReorderLeadership,
  onSaveSponsor,
  onDeleteSponsor,
  onReorderSponsor,
  onUpdateUserStatus,
  websiteBranding,
  onSaveWebsiteBranding,
}: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Website Branding & Logos State (Draft Preview before publishing)
  const [draftEcellLogoUrl, setDraftEcellLogoUrl] = useState<string>(
    websiteBranding.ecellLogoUrl || ''
  );
  const [draftCollegeLogoUrl, setDraftCollegeLogoUrl] = useState<string>(
    websiteBranding.collegeLogoUrl || ''
  );
  const [brandingErrors, setBrandingErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setDraftEcellLogoUrl(websiteBranding.ecellLogoUrl || '');
    setDraftCollegeLogoUrl(websiteBranding.collegeLogoUrl || '');
  }, [websiteBranding.ecellLogoUrl, websiteBranding.collegeLogoUrl]);

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

  // NEC Team Form State (Strict max 25 members)
  const [editingNecId, setEditingNecId] = useState<string | null>(null);
  const [necName, setNecName] = useState('');
  const [necRole, setNecRole] = useState('');
  const [necPhotoUrl, setNecPhotoUrl] = useState('');
  const [necErrors, setNecErrors] = useState<Record<string, string>>({});

  // Leadership & Convenors Form State
  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null);
  const [leaderName, setLeaderName] = useState('');
  const [leaderRole, setLeaderRole] = useState('');
  const [leaderQualification, setLeaderQualification] = useState('');
  const [leaderPhotoUrl, setLeaderPhotoUrl] = useState('');
  const [leaderCategory, setLeaderCategory] = useState<LeadershipCategory>('Head');
  const [leaderErrors, setLeaderErrors] = useState<Record<string, string>>({});

  // Sponsors & Partners Form State
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('');
  const [sponsorCategory, setSponsorCategory] = useState<SponsorCategory>('Sponsor');
  const [sponsorErrors, setSponsorErrors] = useState<Record<string, string>>({});

  // User Management Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | AccountStatus>('all');

  const stats = calculateDashboardStats({ users, events, achievements, startups });
  const filteredUsersList = filterUsers(users, userSearch, 'all', userStatusFilter);

  const sortedNecMembers = sortRecordsByDisplayOrder(necMembers);
  const sortedLeadership = sortRecordsByDisplayOrder(leadershipMembers);
  const sortedSponsors = sortRecordsByDisplayOrder(sponsors);

  const isNecAtCapacity = necMembers.length >= MAX_NEC_MEMBERS && !editingNecId;

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedbackBanner({ type, message });
    setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Image Upload Helper
  const handleImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      onResult(dataUrl);
      showToast('success', 'Image processed and ready for preview.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process image.';
      showToast('error', message);
    }
  };

  // Transparent Logo Upload Helper (for Branding & Sponsor Logos)
  const handleTransparentLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void,
    fallbackToStandard = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const metaCheck = validateLogoFileMetadata({
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (!metaCheck.valid) {
      if (fallbackToStandard) {
        try {
          const compressed = await compressImageFileToDataUrl(file);
          onResult(compressed);
          showToast('success', 'Logo processed and ready for preview.');
          e.target.value = '';
          return;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to process logo.';
          showToast('error', message);
          e.target.value = '';
          return;
        }
      }
      showToast('error', metaCheck.errors.file || metaCheck.errors.size || 'Invalid logo file.');
      e.target.value = '';
      return;
    }

    try {
      const dataUrl = await processLogoFileToDataUrl(file);
      onResult(dataUrl);
      showToast('success', 'Logo loaded with transparency preserved.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process logo file.';
      showToast('error', message);
    } finally {
      e.target.value = '';
    }
  };

  const handleBrandingLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'ecell' | 'college'
  ) => {
    setBrandingErrors({});
    await handleTransparentLogoUpload(e, (dataUrl) => {
      if (target === 'ecell') {
        setDraftEcellLogoUrl(dataUrl);
      } else {
        setDraftCollegeLogoUrl(dataUrl);
      }
    });
  };

  const handleSaveBrandingSubmit = async () => {
    const validation = validateWebsiteBrandingInput({
      ecellLogoUrl: draftEcellLogoUrl,
      collegeLogoUrl: draftCollegeLogoUrl,
    });
    if (!validation.valid) {
      setBrandingErrors(validation.errors);
      showToast('error', 'Please fix branding validation issues before publishing.');
      return;
    }

    setIsSubmitting(true);
    setBrandingErrors({});
    try {
      await onSaveWebsiteBranding({
        ecellLogoUrl: draftEcellLogoUrl,
        collegeLogoUrl: draftCollegeLogoUrl,
      });
      showToast('success', 'Website branding & header logos published live!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save website branding.';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Event Form Helpers
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

  const populateEventForEdit = (ev: EventRecord) => {
    setEditingEventId(ev.id);
    setEventTitle(ev.title);
    setEventDesc(ev.description);
    setEventPosterUrl(ev.posterUrl);
    setEventDate(ev.date);
    setEventTime(ev.time);
    setEventVenue(ev.venue);
    setEventStatus(ev.eventStatus);
    setEventAdditionalInfo(ev.additionalInfo);
    setEventRegUrl(ev.registrationUrl);
    setEventErrors({});
  };

  const handleEventSubmit = async (publishNow: boolean) => {
    const validation = validateEventInput({
      title: eventTitle,
      description: eventDesc,
      date: eventDate,
      time: eventTime,
      venue: eventVenue,
      eventStatus: eventStatus,
      registrationUrl: eventRegUrl,
    });
    if (!validation.valid) {
      setEventErrors(validation.errors);
      return;
    }

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
          eventStatus: eventStatus,
          additionalInfo: eventAdditionalInfo.trim(),
          registrationUrl: eventRegUrl.trim(),
          published: publishNow,
        },
        editingEventId || undefined
      );
      showToast(
        'success',
        editingEventId
          ? `Event "${eventTitle.trim()}" updated successfully.`
          : `Event "${eventTitle.trim()}" saved.`
      );
      resetEventForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save event.';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Achievement Form Helpers
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
      showToast('success', editingAchId ? 'Achievement updated.' : 'Achievement saved.');
      resetAchForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save achievement.';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Startup Form Helpers
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
      showToast('success', editingStartupId ? 'Startup updated.' : 'Startup saved.');
      resetStartupForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save startup.';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEC Team Form Helpers (Strictly max 25 members)
  const resetNecForm = () => {
    setEditingNecId(null);
    setNecName('');
    setNecRole('');
    setNecPhotoUrl('');
    setNecErrors({});
  };

  const populateNecForEdit = (member: NecMemberRecord) => {
    setEditingNecId(member.id);
    setNecName(member.name);
    setNecRole(member.role);
    setNecPhotoUrl(member.photoUrl);
    setNecErrors({});
  };

  const handleNecSubmit = async (publishNow: boolean) => {
    const validation = validateNecMemberInput(
      {
        name: necName,
        role: necRole,
        photoUrl: necPhotoUrl,
      },
      necMembers,
      editingNecId || undefined
    );
    if (!validation.valid) {
      setNecErrors(validation.errors);
      if (validation.errors.limit || validation.errors.duplicate) {
        showToast('error', validation.errors.limit || validation.errors.duplicate);
      }
      return;
    }

    setIsSubmitting(true);
    setNecErrors({});
    try {
      await onSaveNecMember(
        {
          name: necName.trim(),
          role: necRole.trim(),
          photoUrl: necPhotoUrl.trim(),
          published: publishNow,
        },
        editingNecId || undefined
      );
      showToast(
        'success',
        editingNecId
          ? `NEC Team member "${necName.trim()}" updated.`
          : `Added "${necName.trim()}" to The NEC Team (${necMembers.length + 1} / ${MAX_NEC_MEMBERS}).`
      );
      resetNecForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save NEC Team member.';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Leadership Form Helpers
  const resetLeaderForm = () => {
    setEditingLeaderId(null);
    setLeaderName('');
    setLeaderRole('');
    setLeaderQualification('');
    setLeaderPhotoUrl('');
    setLeaderCategory('Head');
    setLeaderErrors({});
  };

  const populateLeaderForEdit = (leader: LeadershipRecord) => {
    setEditingLeaderId(leader.id);
    setLeaderName(leader.name);
    setLeaderRole(leader.role);
    setLeaderQualification(leader.qualification);
    setLeaderPhotoUrl(leader.photoUrl);
    setLeaderCategory(leader.category);
    setLeaderErrors({});
  };

  const handleLeaderSubmit = async (publishNow: boolean) => {
    const validation = validateLeadershipInput({
      name: leaderName,
      role: leaderRole,
      qualification: leaderQualification,
      photoUrl: leaderPhotoUrl,
      category: leaderCategory,
    });
    if (!validation.valid) {
      setLeaderErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setLeaderErrors({});
    try {
      await onSaveLeadership(
        {
          name: leaderName.trim(),
          role: leaderRole.trim(),
          qualification: leaderQualification.trim(),
          photoUrl: leaderPhotoUrl.trim(),
          category: leaderCategory,
          published: publishNow,
        },
        editingLeaderId || undefined
      );
      showToast(
        'success',
        editingLeaderId
          ? `Leadership profile "${leaderName.trim()}" updated.`
          : `Leadership profile "${leaderName.trim()}" saved.`
      );
      resetLeaderForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save leadership profile.';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sponsor Form Helpers
  const resetSponsorForm = () => {
    setEditingSponsorId(null);
    setSponsorName('');
    setSponsorLogoUrl('');
    setSponsorCategory('Sponsor');
    setSponsorErrors({});
  };

  const populateSponsorForEdit = (sp: SponsorRecord) => {
    setEditingSponsorId(sp.id);
    setSponsorName(sp.name);
    setSponsorLogoUrl(sp.logoUrl);
    setSponsorCategory(sp.category);
    setSponsorErrors({});
  };

  const handleSponsorSubmit = async (publishNow: boolean) => {
    const validation = validateSponsorInput({
      name: sponsorName,
      logoUrl: sponsorLogoUrl,
      category: sponsorCategory,
    });
    if (!validation.valid) {
      setSponsorErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setSponsorErrors({});
    try {
      await onSaveSponsor(
        {
          name: sponsorName.trim(),
          logoUrl: sponsorLogoUrl.trim(),
          category: sponsorCategory,
          published: publishNow,
        },
        editingSponsorId || undefined
      );
      showToast(
        'success',
        editingSponsorId
          ? `Partner "${sponsorName.trim()}" updated.`
          : `Partner "${sponsorName.trim()}" saved.`
      );
      resetSponsorForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save sponsor/partner.';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClass =
    'w-full px-3.5 py-2.5 bg-[#0B0B0D] border border-white/15 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF3030] transition-colors';
  const labelBaseClass =
    'block text-[11px] font-mono uppercase tracking-[0.14em] text-[#A1A1AA] mb-1.5';

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative">
      {/* Ambient Background Glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-aurora-atmosphere opacity-80"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cyber-grid opacity-30"
        aria-hidden="true"
      />

      {/* TOP COMMAND BAR */}
      <header className="sticky top-0 z-40 bg-[#08080B]/95 backdrop-blur-xl border-b border-white/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Extreme Top-Left: Aurora E-Cell Logo + Admin Console Title */}
          <div className="flex items-center gap-3 shrink-0">
            <HeaderBrandLogo
              src={websiteBranding.ecellLogoUrl}
              alt="Aurora E-Cell Official Logo"
              testId="admin-header-ecell-logo"
            />
            <div className="w-9 h-9 bg-[#FF3030] text-white font-display font-bold flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(255,48,48,0.4)]">
              A
            </div>
            <div>
              <div className="font-display font-bold text-sm tracking-wide flex items-center gap-2">
                <span>AURORA E-CELL</span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#FF3030]/15 text-[#FF3030] border border-[#FF3030]/30">
                  ADMIN COMMAND
                </span>
              </div>
              <div className="text-[11px] text-[#A1A1AA] font-mono hidden sm:block">
                Logged in as {currentAdmin.fullName}
              </div>
            </div>
          </div>

          {/* Extreme Top-Right: Portal Switch, Sign Out & Aurora College Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onSwitchToPortal}
              className="px-3.5 py-2 bg-white/5 text-white font-display font-bold text-xs rounded-xl border border-white/15 hover:border-[#FF3030]/60 hover:bg-[#FF3030]/10 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FF3030]" />
              <span>View Student Portal</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 bg-[#141416] text-[#A1A1AA] hover:text-white font-display font-bold text-xs rounded-xl border border-white/12 hover:border-[#FF3030]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign Out
            </button>
            <HeaderBrandLogo
              src={websiteBranding.collegeLogoUrl}
              alt="Aurora Degree & PG College Official Logo"
              testId="admin-header-college-logo"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#0B0B0D]/90 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'events', label: `Events (${events.length})`, icon: Calendar },
              { id: 'achievements', label: `Achievements (${achievements.length})`, icon: Award },
              { id: 'startups', label: `Startups (${startups.length})`, icon: Rocket },
              {
                id: 'nec',
                label: `NEC Team (${necMembers.length}/${MAX_NEC_MEMBERS})`,
                icon: Sparkles,
              },
              {
                id: 'leadership',
                label: `Leadership (${leadershipMembers.length})`,
                icon: Crown,
              },
              {
                id: 'sponsors',
                label: `Partners (${sponsors.length})`,
                icon: Handshake,
              },
              { id: 'branding', label: 'Branding & Logos', icon: Eye },
              { id: 'users', label: `Users & Sheets (${users.length})`, icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id as AdminSection)}
                  className={`px-3.5 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#FF3030] text-white shadow-[0_0_20px_rgba(255,48,48,0.35)]'
                      : 'bg-[#141416] text-[#A1A1AA] hover:text-white border border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          role="status"
          className={`max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8 w-full relative z-20`}
        >
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-[#2A090D]/90 border-[#FF3030]/60 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#FF3030] shrink-0" />
              )}
              <span>{feedbackBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="underline ml-4 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MAIN ADMIN WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8 relative z-10">
        {/* 1. OVERVIEW TAB */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="text-xs font-mono font-bold text-[#FF3030] uppercase tracking-[0.2em]">
                  REAL-TIME TELEMETRY &amp; CONTENT ENGINE
                </div>
                <h1 className="font-display font-bold text-3xl sm:text-4xl text-white mt-1">
                  Aurora E-Cell Command Overview
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSection('nec')}
                  className="px-4 py-2.5 bg-[#141416] text-white font-display font-bold text-xs border border-white/15 hover:border-[#FF3030]/60 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#FF3030]" />
                  <span>
                    NEC Team ({necMembers.length}/{MAX_NEC_MEMBERS})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('events')}
                  className="px-4 py-2.5 bg-[#FF3030] text-white font-display font-bold text-xs rounded-xl hover:bg-[#ff4747] transition-all shadow-[0_0_20px_rgba(255,48,48,0.3)] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('users')}
                  className="px-4 py-2.5 bg-[#141416] text-white font-display font-bold text-xs border border-white/15 hover:border-[#FF3030]/60 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Manage Google Sheet Sync</span>
                </button>
              </div>
            </div>

            {/* Primary Statistics Cards (Never Hardcoded — Always Computed from Live State) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div
                data-testid="stat-registered-users"
                className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-2 hover:border-[#FF3030]/40 transition-colors"
              >
                <div className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-widest">
                  REGISTERED USERS
                </div>
                <div className="font-display font-bold text-4xl text-white">
                  {stats.totalRegisteredUsers}
                </div>
                <div className="text-xs font-mono text-emerald-400">
                  {users.filter((u) => u.accountStatus === 'active').length} Active ·{' '}
                  {users.filter((u) => u.role === 'admin').length} Admin(s)
                </div>
              </div>

              <div
                data-testid="stat-published-events"
                className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-2 hover:border-[#FF3030]/40 transition-colors"
              >
                <div className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-widest">
                  PUBLISHED EVENTS
                </div>
                <div className="font-display font-bold text-4xl text-[#FF3030]">
                  {stats.totalPublishedEvents}
                </div>
                <div className="text-xs font-mono text-[#A1A1AA]">
                  {stats.totalDraftEvents} Draft · {events.length} Total
                </div>
              </div>

              <div
                data-testid="stat-published-achievements"
                className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-2 hover:border-[#FF3030]/40 transition-colors"
              >
                <div className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-widest">
                  PUBLISHED ACHIEVEMENTS
                </div>
                <div className="font-display font-bold text-4xl text-white">
                  {stats.totalAchievements}
                </div>
                <div className="text-xs font-mono text-[#A1A1AA]">
                  {achievements.length} Total Records
                </div>
              </div>

              <div
                data-testid="stat-active-startups"
                className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-2 hover:border-[#FF3030]/40 transition-colors"
              >
                <div className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-widest">
                  ACTIVE STARTUPS
                </div>
                <div className="font-display font-bold text-4xl text-white">
                  {stats.totalActiveStartups}
                </div>
                <div className="text-xs font-mono text-[#A1A1AA]">
                  {startups.length} Total Profiles
                </div>
              </div>
            </div>

            {/* Secondary Ecosystem Modules Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#141416]/90 border border-white/12 rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-[#FF3030]">
                    THE NEC TEAM ROSTER
                  </div>
                  <div className="font-display font-bold text-2xl text-white">
                    {necMembers.length} / {MAX_NEC_MEMBERS} Members
                  </div>
                  <div className="text-xs text-[#A1A1AA]">
                    {necMembers.filter((m) => m.published).length} Published on Portal
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('nec')}
                  className="px-3.5 py-2 bg-white/5 hover:bg-[#FF3030] text-white rounded-xl border border-white/12 text-xs font-display font-bold transition-colors cursor-pointer"
                >
                  Manage
                </button>
              </div>

              <div className="bg-[#141416]/90 border border-white/12 rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-[#FF3030]">
                    LEADERSHIP &amp; CONVENORS
                  </div>
                  <div className="font-display font-bold text-2xl text-white">
                    {leadershipMembers.length} Profiles
                  </div>
                  <div className="text-xs text-[#A1A1AA]">
                    {leadershipMembers.filter((l) => l.category === 'Head').length} Heads ·{' '}
                    {leadershipMembers.filter((l) => l.category === 'Convenor').length} Convenors
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('leadership')}
                  className="px-3.5 py-2 bg-white/5 hover:bg-[#FF3030] text-white rounded-xl border border-white/12 text-xs font-display font-bold transition-colors cursor-pointer"
                >
                  Manage
                </button>
              </div>

              <div className="bg-[#141416]/90 border border-white/12 rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-[#FF3030]">
                    PARTNERS IN PROGRESS
                  </div>
                  <div className="font-display font-bold text-2xl text-white">
                    {sponsors.length} Organizations
                  </div>
                  <div className="text-xs text-[#A1A1AA]">
                    {sponsors.filter((s) => s.category === 'Sponsor').length} Sponsors ·{' '}
                    {sponsors.filter((s) => s.category === 'Supporting Partner').length} Partners
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('sponsors')}
                  className="px-3.5 py-2 bg-white/5 hover:bg-[#FF3030] text-white rounded-xl border border-white/12 text-xs font-display font-bold transition-colors cursor-pointer"
                >
                  Manage
                </button>
              </div>
            </div>

            {/* Recent Registrations + Admin Activity Log */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent User Registrations */}
              <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="font-display font-bold text-lg text-white">
                    Recent User Registrations
                  </h2>
                  <span className="text-xs font-mono text-[#A1A1AA]">{users.length} total</span>
                </div>

                {users.length === 0 ? (
                  <p className="text-xs text-[#A1A1AA] py-8 text-center">
                    No registered users recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {users.slice(0, 8).map((u) => (
                      <div
                        key={u.uid}
                        className="p-3 bg-[#0B0B0D] border border-white/10 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{u.fullName}</div>
                          <div className="text-[#A1A1AA] font-mono truncate">{u.email}</div>
                        </div>
                        <div className="text-right shrink-0 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-[#FF3030]/20 text-[#FF3030] border-[#FF3030]/40'
                                : 'bg-white/5 text-[#A1A1AA] border-white/10'
                            }`}
                          >
                            {u.role}
                          </span>
                          <div className="text-[10px] text-zinc-500 mt-1">{u.registrationDate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Activity Log */}
              <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="font-display font-bold text-lg text-white">Admin Activity Log</h2>
                  <span className="text-xs font-mono text-[#A1A1AA]">
                    {adminLogs.length} actions
                  </span>
                </div>

                {adminLogs.length === 0 ? (
                  <p className="text-xs text-[#A1A1AA] py-8 text-center">
                    No administrative actions logged in this session yet.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {adminLogs.slice(0, 10).map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-[#0B0B0D] border border-white/10 rounded-xl flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{log.action}</div>
                          <div className="text-[#A1A1AA] font-mono">
                            Target: {log.targetTitle || log.targetType}
                          </div>
                        </div>
                        <div className="text-right font-mono text-[11px] text-[#FF3030] uppercase shrink-0">
                          {log.targetType}
                        </div>
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
            <div className="lg:col-span-5 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display font-bold text-xl text-white">
                  {editingEventId ? 'Edit Event' : 'Add New Event'}
                </h2>
                {editingEventId && (
                  <button
                    type="button"
                    onClick={resetEventForm}
                    className="text-xs font-mono underline text-[#FF3030] cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="ev-title" className={labelBaseClass}>
                    Event Title *
                  </label>
                  <input
                    id="ev-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Enter official event title"
                    className={inputBaseClass}
                  />
                  {eventErrors.title && (
                    <p className="text-xs text-[#FF3030] font-semibold mt-1">{eventErrors.title}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ev-date" className={labelBaseClass}>
                      Event Date *
                    </label>
                    <input
                      id="ev-date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className={inputBaseClass}
                    />
                    {eventErrors.date && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {eventErrors.date}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="ev-time" className={labelBaseClass}>
                      Event Time *
                    </label>
                    <input
                      id="ev-time"
                      type="text"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="e.g. 10:00 AM"
                      className={inputBaseClass}
                    />
                    {eventErrors.time && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {eventErrors.time}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ev-venue" className={labelBaseClass}>
                      Venue *
                    </label>
                    <input
                      id="ev-venue"
                      type="text"
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      placeholder="Hall / Campus location"
                      className={inputBaseClass}
                    />
                    {eventErrors.venue && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {eventErrors.venue}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="ev-status" className={labelBaseClass}>
                      Event Status *
                    </label>
                    <select
                      id="ev-status"
                      value={eventStatus}
                      onChange={(e) => setEventStatus(e.target.value as EventStatus)}
                      className={inputBaseClass}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="ev-desc" className={labelBaseClass}>
                    Event Description *
                  </label>
                  <textarea
                    id="ev-desc"
                    rows={4}
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Detailed description of the event..."
                    className={inputBaseClass}
                  />
                  {eventErrors.description && (
                    <p className="text-xs text-[#FF3030] font-semibold mt-1">
                      {eventErrors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="ev-poster-upload" className={labelBaseClass}>
                    Event Poster / Banner (Upload or URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="ev-poster-upload"
                      className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-xs border border-white/15 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#FF3030]" />
                      <span>Upload Image</span>
                    </label>
                    <input
                      id="ev-poster-upload"
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
                      className={inputBaseClass}
                    />
                  </div>
                  {eventPosterUrl && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-white/15 h-36 bg-[#0B0B0D]">
                      <img
                        src={eventPosterUrl}
                        alt="Event poster preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setEventPosterUrl('')}
                        className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-2.5 py-1 rounded-lg border border-white/20 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="ev-reg" className={labelBaseClass}>
                    Registration / Action Link (Optional)
                  </label>
                  <input
                    id="ev-reg"
                    type="url"
                    value={eventRegUrl}
                    onChange={(e) => setEventRegUrl(e.target.value)}
                    placeholder="https://..."
                    className={inputBaseClass}
                  />
                  {eventErrors.registrationUrl && (
                    <p className="text-xs text-[#FF3030] font-semibold mt-1">
                      {eventErrors.registrationUrl}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="ev-extra" className={labelBaseClass}>
                    Additional Information (Optional)
                  </label>
                  <textarea
                    id="ev-extra"
                    rows={2}
                    value={eventAdditionalInfo}
                    onChange={(e) => setEventAdditionalInfo(e.target.value)}
                    placeholder="Eligibility, rules, or contact notes..."
                    className={inputBaseClass}
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleEventSubmit(true)}
                    className="flex-1 py-2.5 px-4 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(255,48,48,0.3)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {editingEventId ? 'Update & Publish' : 'Publish Event'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleEventSubmit(false)}
                    className="py-2.5 px-4 bg-[#0B0B0D] text-[#A1A1AA] hover:text-white font-display font-bold text-xs border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Events List */}
            <div className="lg:col-span-7 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display font-bold text-xl text-white">
                  Managed Events ({events.length})
                </h2>
              </div>

              {events.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] py-10 text-center">
                  No events created yet. Use the form on the left to add your first official E-Cell
                  event.
                </p>
              ) : (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 bg-[#0B0B0D] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ev.published
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {ev.published ? 'PUBLISHED' : 'DRAFT'}
                          </span>
                          <span className="uppercase text-[#FF3030] font-bold">
                            {ev.eventStatus}
                          </span>
                          <span className="text-zinc-500">·</span>
                          <span className="text-[#A1A1AA]">
                            {ev.date} · {ev.time}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-base text-white">{ev.title}</h3>
                        <p className="text-xs text-[#A1A1AA] line-clamp-2">{ev.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => populateEventForEdit(ev)}
                          aria-label={`Edit event ${ev.title}`}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-display font-bold text-xs border border-white/15 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              title: 'Delete Event?',
                              description: `Are you sure you want to permanently delete "${ev.title}"? This action cannot be undone.`,
                              confirmLabel: 'Delete Event',
                              onConfirm: async () => {
                                await onDeleteEvent(ev.id, ev.title);
                                showToast('success', `Deleted event "${ev.title}".`);
                              },
                            })
                          }
                          aria-label={`Delete event ${ev.title}`}
                          className="px-3 py-1.5 bg-[#FF3030]/15 hover:bg-[#FF3030]/25 text-[#FF3030] font-display font-bold text-xs border border-[#FF3030]/30 rounded-lg flex items-center gap-1 cursor-pointer"
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
            <div className="lg:col-span-5 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display font-bold text-xl text-white">
                  {editingAchId ? 'Edit Achievement' : 'Add Achievement'}
                </h2>
                {editingAchId && (
                  <button
                    type="button"
                    onClick={resetAchForm}
                    className="text-xs font-mono underline text-[#FF3030] cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="ach-title" className={labelBaseClass}>
                    Achievement Title *
                  </label>
                  <input
                    id="ach-title"
                    type="text"
                    value={achTitle}
                    onChange={(e) => setAchTitle(e.target.value)}
                    placeholder="Enter achievement title"
                    className={inputBaseClass}
                  />
                  {achErrors.title && (
                    <p className="text-xs text-[#FF3030] font-semibold mt-1">{achErrors.title}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ach-date" className={labelBaseClass}>
                    Date / Year *
                  </label>
                  <input
                    id="ach-date"
                    type="text"
                    value={achDate}
                    onChange={(e) => setAchDate(e.target.value)}
                    placeholder="e.g. 2025 or March 2025"
                    className={inputBaseClass}
                  />
                  {achErrors.dateOrYear && (
                    <p className="text-xs text-[#FF3030] font-semibold mt-1">
                      {achErrors.dateOrYear}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="ach-desc" className={labelBaseClass}>
                    Description *
                  </label>
                  <textarea
                    id="ach-desc"
                    rows={4}
                    value={achDesc}
                    onChange={(e) => setAchDesc(e.target.value)}
                    placeholder="Describe the milestone or recognition..."
                    className={inputBaseClass}
                  />
                  {achErrors.description && (
                    <p className="text-xs text-[#FF3030] font-semibold mt-1">
                      {achErrors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="ach-image-upload" className={labelBaseClass}>
                    Photo / Certificate Image (Upload or URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="ach-image-upload"
                      className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-xs border border-white/15 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#FF3030]" />
                      <span>Upload Image</span>
                    </label>
                    <input
                      id="ach-image-upload"
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
                      className={inputBaseClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ach-extra" className={labelBaseClass}>
                    Additional Details (Optional)
                  </label>
                  <textarea
                    id="ach-extra"
                    rows={2}
                    value={achAdditional}
                    onChange={(e) => setAchAdditional(e.target.value)}
                    placeholder="Team members, jury notes, or award category..."
                    className={inputBaseClass}
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAchSubmit(true)}
                    className="flex-1 py-2.5 px-4 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(255,48,48,0.3)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {editingAchId ? 'Update & Publish' : 'Publish Achievement'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAchSubmit(false)}
                    className="py-2.5 px-4 bg-[#0B0B0D] text-[#A1A1AA] hover:text-white font-display font-bold text-xs border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Achievements List */}
            <div className="lg:col-span-7 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display font-bold text-xl text-white">
                  Managed Achievements ({achievements.length})
                </h2>
              </div>

              {achievements.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] py-10 text-center">
                  No achievements added yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-4 bg-[#0B0B0D] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ach.published
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {ach.published ? 'PUBLISHED' : 'DRAFT'}
                          </span>
                          <span className="text-[#FF3030]">{ach.date}</span>
                        </div>
                        <h3 className="font-display font-bold text-base text-white">{ach.title}</h3>
                        <p className="text-xs text-[#A1A1AA] line-clamp-2">{ach.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => populateAchForEdit(ach)}
                          aria-label={`Edit achievement ${ach.title}`}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-display font-bold text-xs border border-white/15 rounded-lg flex items-center gap-1 cursor-pointer"
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
                          className="px-3 py-1.5 bg-[#FF3030]/15 hover:bg-[#FF3030]/25 text-[#FF3030] font-display font-bold text-xs border border-[#FF3030]/30 rounded-lg flex items-center gap-1 cursor-pointer"
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
            <div className="lg:col-span-5 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display font-bold text-xl text-white">
                  {editingStartupId ? 'Edit Startup Profile' : 'Add Startup / Venture'}
                </h2>
                {editingStartupId && (
                  <button
                    type="button"
                    onClick={resetStartupForm}
                    className="text-xs font-mono underline text-[#FF3030] cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="st-name" className={labelBaseClass}>
                    Startup Name *
                  </label>
                  <input
                    id="st-name"
                    type="text"
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                    placeholder="Enter venture name"
                    className={inputBaseClass}
                  />
                  {startupErrors.name && (
                    <p className="text-xs text-[#FF3030] font-semibold mt-1">
                      {startupErrors.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="st-cat" className={labelBaseClass}>
                      Category / Sector *
                    </label>
                    <input
                      id="st-cat"
                      type="text"
                      value={startupCategory}
                      onChange={(e) => setStartupCategory(e.target.value)}
                      placeholder="e.g. EdTech, SaaS, FinTech"
                      className={inputBaseClass}
                    />
                    {startupErrors.category && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {startupErrors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="st-status" className={labelBaseClass}>
                      Startup Status *
                    </label>
                    <select
                      id="st-status"
                      value={startupStatus}
                      onChange={(e) => setStartupStatus(e.target.value as StartupStatus)}
                      className={inputBaseClass}
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
                  <label htmlFor="st-founder" className={labelBaseClass}>
                    Founder Details (Optional)
                  </label>
                  <input
                    id="st-founder"
                    type="text"
                    value={startupFounder}
                    onChange={(e) => setStartupFounder(e.target.value)}
                    placeholder="Founder name(s) and department/year"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label htmlFor="st-desc" className={labelBaseClass}>
                    Startup Description *
                  </label>
                  <textarea
                    id="st-desc"
                    rows={4}
                    value={startupDesc}
                    onChange={(e) => setStartupDesc(e.target.value)}
                    placeholder="What problem does this startup solve?"
                    className={inputBaseClass}
                  />
                  {startupErrors.description && (
                    <p className="text-xs text-[#FF3030] font-semibold mt-1">
                      {startupErrors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="st-logo-upload" className={labelBaseClass}>
                    Startup Logo (Upload or URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="st-logo-upload"
                      className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-xs border border-white/15 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#FF3030]" />
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
                      className={inputBaseClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="st-extra" className={labelBaseClass}>
                    Additional Details (Optional)
                  </label>
                  <textarea
                    id="st-extra"
                    rows={2}
                    value={startupAdditional}
                    onChange={(e) => setStartupAdditional(e.target.value)}
                    placeholder="Traction, website link, or incubation notes..."
                    className={inputBaseClass}
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleStartupSubmit(true)}
                    className="flex-1 py-2.5 px-4 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(255,48,48,0.3)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {editingStartupId ? 'Update & Publish' : 'Publish Startup'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleStartupSubmit(false)}
                    className="py-2.5 px-4 bg-[#0B0B0D] text-[#A1A1AA] hover:text-white font-display font-bold text-xs border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Startups List */}
            <div className="lg:col-span-7 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display font-bold text-xl text-white">
                  Managed Startups ({startups.length})
                </h2>
              </div>

              {startups.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] py-10 text-center">
                  No startup profiles added yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {startups.map((st) => (
                    <div
                      key={st.id}
                      className="p-4 bg-[#0B0B0D] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              st.published
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {st.published ? 'PUBLISHED' : 'DRAFT'}
                          </span>
                          <span className="text-[#A1A1AA]">{st.category}</span>
                          <span className="text-zinc-500">·</span>
                          <span className="uppercase text-[#FF3030]">{st.currentStatus}</span>
                        </div>
                        <h3 className="font-display font-bold text-base text-white">{st.name}</h3>
                        <p className="text-xs text-[#A1A1AA] line-clamp-2">{st.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => populateStartupForEdit(st)}
                          aria-label={`Edit startup ${st.name}`}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-display font-bold text-xs border border-white/15 rounded-lg flex items-center gap-1 cursor-pointer"
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
                          className="px-3 py-1.5 bg-[#FF3030]/15 hover:bg-[#FF3030]/25 text-[#FF3030] font-display font-bold text-xs border border-[#FF3030]/30 rounded-lg flex items-center gap-1 cursor-pointer"
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

        {/* 5. NEC TEAM MANAGEMENT TAB (STRICT 25 MEMBER LIMIT) */}
        {activeSection === 'nec' && (
          <div className="space-y-6" data-testid="admin-nec-module">
            {/* Capacity Header Card */}
            <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono text-[#FF3030] uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>NATIONAL ENTREPRENEURSHIP CHALLENGE ROSTER</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                  The NEC Team Management
                </h2>
                <p className="text-xs sm:text-sm text-[#A1A1AA]">
                  Manage core student leaders driving the National Entrepreneurship Challenge.
                  Strictly capped at {MAX_NEC_MEMBERS} members.
                </p>
              </div>

              <div className="bg-[#0B0B0D] border border-white/12 rounded-2xl p-4 min-w-[240px] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA]">ROSTER CAPACITY</span>
                  <span
                    data-testid="nec-member-counter"
                    className={`font-bold ${
                      necMembers.length >= MAX_NEC_MEMBERS ? 'text-[#FF3030]' : 'text-white'
                    }`}
                  >
                    {necMembers.length} / {MAX_NEC_MEMBERS} Members
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF3030] to-[#ff6b4a] transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (necMembers.length / MAX_NEC_MEMBERS) * 100)}%`,
                    }}
                  />
                </div>
                {necMembers.length >= MAX_NEC_MEMBERS && (
                  <div className="text-[11px] font-mono text-[#FF3030]">
                    Maximum limit of {MAX_NEC_MEMBERS} NEC members reached.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* NEC Member Form */}
              <div className="lg:col-span-5 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-display font-bold text-xl text-white">
                    {editingNecId ? 'Edit NEC Member' : 'Add NEC Team Member'}
                  </h3>
                  {editingNecId && (
                    <button
                      type="button"
                      onClick={resetNecForm}
                      className="text-xs font-mono underline text-[#FF3030] cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {isNecAtCapacity && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-[#2A090D]/90 border border-[#FF3030]/50 text-xs text-red-200 flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#FF3030] shrink-0 mt-0.5" />
                    <span>
                      The NEC Team has reached the strict maximum of {MAX_NEC_MEMBERS} members. You
                      can still edit, reorder, or remove existing members.
                    </span>
                  </div>
                )}

                {necErrors.capacity && (
                  <p className="text-xs text-[#FF3030] font-semibold">{necErrors.capacity}</p>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="nec-name" className={labelBaseClass}>
                      Full Name *
                    </label>
                    <input
                      id="nec-name"
                      type="text"
                      disabled={isNecAtCapacity}
                      value={necName}
                      onChange={(e) => setNecName(e.target.value)}
                      placeholder="Enter student full name"
                      className={`${inputBaseClass} disabled:opacity-50`}
                    />
                    {necErrors.name && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">{necErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="nec-role" className={labelBaseClass}>
                      NEC Role / Designation *
                    </label>
                    <input
                      id="nec-role"
                      type="text"
                      disabled={isNecAtCapacity}
                      value={necRole}
                      onChange={(e) => setNecRole(e.target.value)}
                      placeholder="e.g. NEC Lead, Operations Head, Marketing Lead"
                      className={`${inputBaseClass} disabled:opacity-50`}
                    />
                    {necErrors.role && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">{necErrors.role}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="nec-photo-upload" className={labelBaseClass}>
                      Member Portrait Photo * (Upload or URL)
                    </label>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="nec-photo-upload"
                        className={`px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-xs border border-white/15 rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          isNecAtCapacity ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 text-[#FF3030]" />
                        <span>Upload Photo</span>
                      </label>
                      <input
                        id="nec-photo-upload"
                        type="file"
                        accept="image/*"
                        disabled={isNecAtCapacity}
                        onChange={(e) => handleImageFileUpload(e, setNecPhotoUrl)}
                        className="hidden"
                      />
                      <input
                        type="url"
                        aria-label="NEC Member Photo URL"
                        disabled={isNecAtCapacity}
                        value={necPhotoUrl.startsWith('data:') ? '' : necPhotoUrl}
                        onChange={(e) => setNecPhotoUrl(e.target.value)}
                        placeholder="Or paste photo URL..."
                        className={`${inputBaseClass} disabled:opacity-50`}
                      />
                    </div>
                    {necErrors.photoUrl && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {necErrors.photoUrl}
                      </p>
                    )}
                  </div>

                  {/* Live Card Preview */}
                  {(necName || necRole || necPhotoUrl) && (
                    <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/12 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#141416] border border-white/15 shrink-0 flex items-center justify-center">
                        {necPhotoUrl ? (
                          <img
                            src={necPhotoUrl}
                            alt={necName || 'Preview'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-zinc-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-[#FF3030]">
                          LIVE CARD PREVIEW
                        </div>
                        <div className="font-display font-bold text-base text-white truncate">
                          {necName || 'Member Name'}
                        </div>
                        <div className="text-xs font-mono text-[#A1A1AA] truncate">
                          {necRole || 'Role / Designation'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting || isNecAtCapacity}
                      onClick={() => handleNecSubmit(true)}
                      data-testid="publish-nec-member-btn"
                      className="flex-1 py-2.5 px-4 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(255,48,48,0.3)] transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {editingNecId ? 'Update & Publish Member' : 'Publish NEC Member'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || isNecAtCapacity}
                      onClick={() => handleNecSubmit(false)}
                      className="py-2.5 px-4 bg-[#0B0B0D] text-[#A1A1AA] hover:text-white font-display font-bold text-xs border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      Save as Draft
                    </button>
                  </div>
                </div>
              </div>

              {/* NEC Team Members List */}
              <div className="lg:col-span-7 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-display font-bold text-xl text-white">
                    NEC Team Roster ({sortedNecMembers.length} / {MAX_NEC_MEMBERS})
                  </h3>
                  <span className="text-xs font-mono text-[#A1A1AA]">
                    Use arrows to reorder display sequence
                  </span>
                </div>

                {sortedNecMembers.length === 0 ? (
                  <p className="text-sm text-[#A1A1AA] py-12 text-center">
                    No NEC Team members added yet. Add up to {MAX_NEC_MEMBERS} members using the
                    form on the left.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sortedNecMembers.map((member, idx) => (
                      <div
                        key={member.id}
                        className="p-3.5 bg-[#0B0B0D] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#141416] border border-white/15 shrink-0 flex items-center justify-center">
                            {member.photoUrl ? (
                              <img
                                src={member.photoUrl}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-[#FF3030]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <span className="text-zinc-500">
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                  member.published
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-300'
                                }`}
                              >
                                {member.published ? 'PUBLISHED' : 'DRAFT'}
                              </span>
                            </div>
                            <h4 className="font-display font-bold text-sm text-white truncate">
                              {member.name}
                            </h4>
                            <p className="text-xs font-mono text-[#FF3030] truncate">
                              {member.role}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => onReorderNecMember(member.id, 'up')}
                            aria-label={`Move ${member.name} up`}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedNecMembers.length - 1}
                            onClick={() => onReorderNecMember(member.id, 'down')}
                            aria-label={`Move ${member.name} down`}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => populateNecForEdit(member)}
                            aria-label={`Edit NEC member ${member.name}`}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white font-display font-bold text-xs border border-white/15 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDialog({
                                title: 'Remove NEC Team Member?',
                                description: `Are you sure you want to remove "${member.name}" from The NEC Team?`,
                                confirmLabel: 'Remove Member',
                                onConfirm: async () => {
                                  await onDeleteNecMember(member.id, member.name);
                                  showToast('success', `Removed "${member.name}" from NEC Team.`);
                                },
                              })
                            }
                            aria-label={`Delete NEC member ${member.name}`}
                            className="px-2.5 py-1.5 bg-[#FF3030]/15 hover:bg-[#FF3030]/25 text-[#FF3030] font-display font-bold text-xs border border-[#FF3030]/30 rounded-lg flex items-center gap-1 cursor-pointer"
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
          </div>
        )}

        {/* 6. LEADERSHIP & CONVENORS MANAGEMENT TAB */}
        {activeSection === 'leadership' && (
          <div className="space-y-6" data-testid="admin-leadership-module">
            <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#FF3030] uppercase tracking-widest">
                  <Crown className="w-3.5 h-3.5" />
                  <span>INSTITUTIONAL MENTORSHIP &amp; GOVERNANCE</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                  Leadership &amp; Convenors Management
                </h2>
                <p className="text-xs sm:text-sm text-[#A1A1AA]">
                  Add and categorize institutional Heads and Faculty/Student Convenors with their
                  academic qualifications and official designations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Leadership Form */}
              <div className="lg:col-span-5 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-display font-bold text-xl text-white">
                    {editingLeaderId ? 'Edit Leadership Profile' : 'Add Head / Convenor'}
                  </h3>
                  {editingLeaderId && (
                    <button
                      type="button"
                      onClick={resetLeaderForm}
                      className="text-xs font-mono underline text-[#FF3030] cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="leader-category" className={labelBaseClass}>
                      Leadership Tier / Category *
                    </label>
                    <select
                      id="leader-category"
                      value={leaderCategory}
                      onChange={(e) => setLeaderCategory(e.target.value as LeadershipCategory)}
                      className={inputBaseClass}
                    >
                      <option value="Head">Head (Institutional / Executive Head)</option>
                      <option value="Convenor">Convenor (E-Cell Convenor / Coordinator)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="leader-name" className={labelBaseClass}>
                      Full Name *
                    </label>
                    <input
                      id="leader-name"
                      type="text"
                      value={leaderName}
                      onChange={(e) => setLeaderName(e.target.value)}
                      placeholder="e.g. Dr. Rameshwar Rao"
                      className={inputBaseClass}
                    />
                    {leaderErrors.name && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {leaderErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="leader-qual" className={labelBaseClass}>
                      Educational Qualification *
                    </label>
                    <input
                      id="leader-qual"
                      type="text"
                      value={leaderQualification}
                      onChange={(e) => setLeaderQualification(e.target.value)}
                      placeholder="e.g. Ph.D. in Management, MBA, M.Tech"
                      className={inputBaseClass}
                    />
                    {leaderErrors.qualification && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {leaderErrors.qualification}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="leader-role" className={labelBaseClass}>
                      Official Role / Designation *
                    </label>
                    <input
                      id="leader-role"
                      type="text"
                      value={leaderRole}
                      onChange={(e) => setLeaderRole(e.target.value)}
                      placeholder="e.g. Principal & Chairperson / Faculty Convenor"
                      className={inputBaseClass}
                    />
                    {leaderErrors.role && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {leaderErrors.role}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="leader-photo-upload" className={labelBaseClass}>
                      Portrait Photograph * (Upload or URL)
                    </label>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="leader-photo-upload"
                        className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-xs border border-white/15 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#FF3030]" />
                        <span>Upload Photo</span>
                      </label>
                      <input
                        id="leader-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, setLeaderPhotoUrl)}
                        className="hidden"
                      />
                      <input
                        type="url"
                        aria-label="Leadership Photo URL"
                        value={leaderPhotoUrl.startsWith('data:') ? '' : leaderPhotoUrl}
                        onChange={(e) => setLeaderPhotoUrl(e.target.value)}
                        placeholder="Or paste photo URL..."
                        className={inputBaseClass}
                      />
                    </div>
                    {leaderErrors.photoUrl && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {leaderErrors.photoUrl}
                      </p>
                    )}
                  </div>

                  {/* Live Preview */}
                  {(leaderName || leaderRole || leaderQualification || leaderPhotoUrl) && (
                    <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/12 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#141416] border border-white/15 shrink-0 flex items-center justify-center">
                        {leaderPhotoUrl ? (
                          <img
                            src={leaderPhotoUrl}
                            alt={leaderName || 'Preview'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Crown className="w-6 h-6 text-[#FF3030]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#FF3030]/20 text-[#FF3030]">
                          {leaderCategory}
                        </span>
                        <div className="font-display font-bold text-base text-white truncate mt-1">
                          {leaderName || 'Leader Name'}
                        </div>
                        <div className="text-xs text-[#A1A1AA] truncate">
                          {leaderQualification || 'Qualification'} · {leaderRole || 'Designation'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleLeaderSubmit(true)}
                      data-testid="publish-leadership-btn"
                      className="flex-1 py-2.5 px-4 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(255,48,48,0.3)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {editingLeaderId ? 'Update & Publish Profile' : 'Publish Leadership Profile'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleLeaderSubmit(false)}
                      className="py-2.5 px-4 bg-[#0B0B0D] text-[#A1A1AA] hover:text-white font-display font-bold text-xs border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Save as Draft
                    </button>
                  </div>
                </div>
              </div>

              {/* Leadership List */}
              <div className="lg:col-span-7 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-display font-bold text-xl text-white">
                    Managed Leadership &amp; Convenors ({sortedLeadership.length})
                  </h3>
                </div>

                {sortedLeadership.length === 0 ? (
                  <p className="text-sm text-[#A1A1AA] py-12 text-center">
                    No leadership or convenor profiles added yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sortedLeadership.map((leader, idx) => (
                      <div
                        key={leader.id}
                        className="p-3.5 bg-[#0B0B0D] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#141416] border border-white/15 shrink-0 flex items-center justify-center">
                            {leader.photoUrl ? (
                              <img
                                src={leader.photoUrl}
                                alt={leader.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <GraduationCap className="w-5 h-5 text-[#FF3030]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <span className="px-2 py-0.5 rounded bg-[#FF3030]/20 text-[#FF3030] font-bold uppercase">
                                {leader.category}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                  leader.published
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-300'
                                }`}
                              >
                                {leader.published ? 'PUBLISHED' : 'DRAFT'}
                              </span>
                            </div>
                            <h4 className="font-display font-bold text-sm text-white truncate mt-0.5">
                              {leader.name}
                            </h4>
                            <p className="text-xs text-[#A1A1AA] truncate">
                              {leader.qualification} ·{' '}
                              <span className="text-white">{leader.role}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => onReorderLeadership(leader.id, 'up')}
                            aria-label={`Move ${leader.name} up`}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedLeadership.length - 1}
                            onClick={() => onReorderLeadership(leader.id, 'down')}
                            aria-label={`Move ${leader.name} down`}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => populateLeaderForEdit(leader)}
                            aria-label={`Edit leader ${leader.name}`}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white font-display font-bold text-xs border border-white/15 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDialog({
                                title: 'Delete Leadership Profile?',
                                description: `Are you sure you want to remove "${leader.name}" from Leadership & Convenors?`,
                                confirmLabel: 'Delete Profile',
                                onConfirm: async () => {
                                  await onDeleteLeadership(leader.id, leader.name);
                                  showToast('success', `Deleted "${leader.name}".`);
                                },
                              })
                            }
                            aria-label={`Delete leader ${leader.name}`}
                            className="px-2.5 py-1.5 bg-[#FF3030]/15 hover:bg-[#FF3030]/25 text-[#FF3030] font-display font-bold text-xs border border-[#FF3030]/30 rounded-lg flex items-center gap-1 cursor-pointer"
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
          </div>
        )}

        {/* 7. SPONSORS & SUPPORTING PARTNERS MANAGEMENT TAB */}
        {activeSection === 'sponsors' && (
          <div className="space-y-6" data-testid="admin-sponsors-module">
            <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#FF3030] uppercase tracking-widest">
                  <Handshake className="w-3.5 h-3.5" />
                  <span>ECOSYSTEM ALLIANCES &amp; BACKERS</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                  Our Partners in Progress — Sponsors &amp; Supporting Partners
                </h2>
                <p className="text-xs sm:text-sm text-[#A1A1AA]">
                  Upload organization logos and categorize them as official Sponsors or Supporting
                  Partners.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Sponsor Form */}
              <div className="lg:col-span-5 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-display font-bold text-xl text-white">
                    {editingSponsorId ? 'Edit Partner / Sponsor' : 'Add Sponsor or Partner'}
                  </h3>
                  {editingSponsorId && (
                    <button
                      type="button"
                      onClick={resetSponsorForm}
                      className="text-xs font-mono underline text-[#FF3030] cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="sponsor-category" className={labelBaseClass}>
                      Partnership Tier *
                    </label>
                    <select
                      id="sponsor-category"
                      value={sponsorCategory}
                      onChange={(e) => setSponsorCategory(e.target.value as SponsorCategory)}
                      className={inputBaseClass}
                    >
                      <option value="Sponsor">Official Sponsor</option>
                      <option value="Supporting Partner">Supporting Partner</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sponsor-name" className={labelBaseClass}>
                      Company / Organization Name *
                    </label>
                    <input
                      id="sponsor-name"
                      type="text"
                      value={sponsorName}
                      onChange={(e) => setSponsorName(e.target.value)}
                      placeholder="Enter organization name"
                      className={inputBaseClass}
                    />
                    {sponsorErrors.name && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {sponsorErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sponsor-logo-upload" className={labelBaseClass}>
                      Company Logo * (Transparent PNG/SVG/WebP or URL)
                    </label>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="sponsor-logo-upload"
                        className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-xs border border-white/15 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#FF3030]" />
                        <span>Upload Logo</span>
                      </label>
                      <input
                        id="sponsor-logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleTransparentLogoUpload(e, setSponsorLogoUrl, true)}
                        className="hidden"
                      />
                      <input
                        type="url"
                        aria-label="Sponsor Logo URL"
                        value={sponsorLogoUrl.startsWith('data:') ? '' : sponsorLogoUrl}
                        onChange={(e) => setSponsorLogoUrl(e.target.value)}
                        placeholder="Or paste logo URL..."
                        className={inputBaseClass}
                      />
                    </div>
                    {sponsorErrors.logoUrl && (
                      <p className="text-xs text-[#FF3030] font-semibold mt-1">
                        {sponsorErrors.logoUrl}
                      </p>
                    )}
                  </div>

                  {/* Live Preview */}
                  {(sponsorName || sponsorLogoUrl) && (
                    <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/12 flex items-center gap-4">
                      <div className="w-20 h-14 rounded-xl bg-[#050505] border border-white/12 p-2 flex items-center justify-center shrink-0">
                        {sponsorLogoUrl ? (
                          <img
                            src={sponsorLogoUrl}
                            alt={sponsorName || 'Sponsor preview'}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <Handshake className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#FF3030]/20 text-[#FF3030]">
                          {sponsorCategory}
                        </span>
                        <div className="font-display font-bold text-base text-white truncate mt-1">
                          {sponsorName || 'Organization Name'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSponsorSubmit(true)}
                      data-testid="publish-sponsor-btn"
                      className="flex-1 py-2.5 px-4 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(255,48,48,0.3)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {editingSponsorId ? 'Update & Publish Partner' : 'Publish Partner'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSponsorSubmit(false)}
                      className="py-2.5 px-4 bg-[#0B0B0D] text-[#A1A1AA] hover:text-white font-display font-bold text-xs border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Save as Draft
                    </button>
                  </div>
                </div>
              </div>

              {/* Sponsors List */}
              <div className="lg:col-span-7 bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-display font-bold text-xl text-white">
                    Managed Sponsors &amp; Supporting Partners ({sortedSponsors.length})
                  </h3>
                </div>

                {sortedSponsors.length === 0 ? (
                  <p className="text-sm text-[#A1A1AA] py-12 text-center">
                    No sponsors or supporting partners added yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sortedSponsors.map((sp, idx) => (
                      <div
                        key={sp.id}
                        className="p-3.5 bg-[#0B0B0D] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-16 h-12 rounded-xl bg-[#050505] border border-white/15 p-2 flex items-center justify-center shrink-0">
                            {sp.logoUrl ? (
                              <img
                                src={sp.logoUrl}
                                alt={sp.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <Handshake className="w-5 h-5 text-[#FF3030]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <span className="px-2 py-0.5 rounded bg-[#FF3030]/20 text-[#FF3030] font-bold uppercase">
                                {sp.category}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                  sp.published
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-300'
                                }`}
                              >
                                {sp.published ? 'PUBLISHED' : 'DRAFT'}
                              </span>
                            </div>
                            <h4 className="font-display font-bold text-sm text-white truncate mt-1">
                              {sp.name}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => onReorderSponsor(sp.id, 'up')}
                            aria-label={`Move ${sp.name} up`}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedSponsors.length - 1}
                            onClick={() => onReorderSponsor(sp.id, 'down')}
                            aria-label={`Move ${sp.name} down`}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => populateSponsorForEdit(sp)}
                            aria-label={`Edit partner ${sp.name}`}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white font-display font-bold text-xs border border-white/15 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDialog({
                                title: 'Remove Partner / Sponsor?',
                                description: `Are you sure you want to remove "${sp.name}" from Our Partners in Progress?`,
                                confirmLabel: 'Remove Partner',
                                onConfirm: async () => {
                                  await onDeleteSponsor(sp.id, sp.name);
                                  showToast('success', `Removed "${sp.name}".`);
                                },
                              })
                            }
                            aria-label={`Delete partner ${sp.name}`}
                            className="px-2.5 py-1.5 bg-[#FF3030]/15 hover:bg-[#FF3030]/25 text-[#FF3030] font-display font-bold text-xs border border-[#FF3030]/30 rounded-lg flex items-center gap-1 cursor-pointer"
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
          </div>
        )}

        {/* 8. WEBSITE BRANDING & LOGOS MANAGEMENT TAB */}
        {activeSection === 'branding' && (
          <div className="space-y-8" data-testid="admin-branding-module">
            {/* Module Header */}
            <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="text-xs font-mono font-bold text-[#FF3030] uppercase tracking-widest">
                    OFFICIAL HEADER IDENTITY &amp; TRANSPARENT LOGO ENGINE
                  </div>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                    Website Branding &amp; Logos
                  </h2>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    Upload, preview, replace, or remove the official{' '}
                    <strong className="text-white">Aurora E-Cell Logo</strong> (displayed in the
                    extreme top-left corner) and{' '}
                    <strong className="text-white">Aurora College Logo</strong> (displayed in the
                    extreme top-right corner). Supports transparent <strong>PNG</strong>,{' '}
                    <strong>SVG</strong>, and <strong>WebP</strong> files while preserving original
                    aspect ratios.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSaveBrandingSubmit}
                    data-testid="publish-branding-btn"
                    className="px-6 py-3 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl shadow-[0_0_24px_rgba(255,48,48,0.4)] transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Publishing Changes...' : 'Save & Publish Logos'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Symmetric Header Preview Against Dark Background */}
            <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    Live Symmetric Header Preview (Before Publishing)
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Verifies how both transparent logos appear against the dark `#050505` website
                    navigation bar. If a logo is removed or not uploaded, its slot gracefully
                    collapses without broken images.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#FF3030]/15 text-[#FF3030] border border-[#FF3030]/30 rounded-lg">
                  OBJECT-FIT: CONTAIN · TRANSPARENT
                </span>
              </div>

              {/* Simulated Dark Website Header */}
              <div
                data-testid="branding-header-preview"
                className="bg-[#050505] text-white rounded-2xl border border-white/15 px-4 sm:px-6 h-20 flex items-center justify-between gap-4"
              >
                {/* Top-Left Preview: Aurora E-Cell Logo + Wordmark */}
                <div className="flex items-center gap-3">
                  <HeaderBrandLogo
                    src={draftEcellLogoUrl}
                    alt="Aurora E-Cell Logo Preview"
                    testId="preview-ecell-logo"
                  />
                  <div className="w-9 h-9 bg-[#FF3030] text-white font-display font-bold text-base flex items-center justify-center rounded-xl">
                    A
                  </div>
                  <div className="leading-none">
                    <span className="font-display font-bold text-sm tracking-tight block">
                      AURORA E-CELL
                    </span>
                    <span className="text-[10px] font-mono text-[#A1A1AA] hidden sm:block">
                      TOP-LEFT BRAND POSITION
                    </span>
                  </div>
                </div>

                {/* Simulated Center Nav */}
                <div className="hidden md:flex items-center gap-4 text-xs font-mono text-[#A1A1AA]">
                  <span>Home</span>
                  <span>·</span>
                  <span>Events</span>
                  <span>·</span>
                  <span>Leadership</span>
                  <span>·</span>
                  <span>NEC Team</span>
                </div>

                {/* Top-Right Preview: Actions + Aurora College Logo */}
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-white/5 border border-white/15 rounded-lg text-[11px] font-mono text-[#A1A1AA] hidden sm:inline-block">
                    Portal Action
                  </span>
                  <HeaderBrandLogo
                    src={draftCollegeLogoUrl}
                    alt="Aurora College Logo Preview"
                    testId="preview-college-logo"
                  />
                </div>
              </div>
            </div>

            {/* Dual Upload & Control Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Option 1: Aurora E-Cell Logo (Top-Left Corner) */}
              <div
                data-testid="ecell-logo-card"
                className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 bg-[#FF3030]/15 text-[#FF3030] border border-[#FF3030]/30 rounded">
                        1 · TOP-LEFT CORNER
                      </span>
                      <h3 className="font-display font-bold text-xl text-white mt-2">
                        Aurora E-Cell Logo
                      </h3>
                      <p className="text-xs text-[#A1A1AA]">
                        Displayed in the top-left corner of the website header across desktop,
                        tablet, and mobile views.
                      </p>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                        draftEcellLogoUrl
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/5 text-[#A1A1AA] border-white/10'
                      }`}
                    >
                      {draftEcellLogoUrl ? 'LOGO READY' : 'NOT UPLOADED'}
                    </span>
                  </div>

                  {/* Dark Transparency Inspection Stage */}
                  <div className="bg-[#050505] rounded-2xl border border-white/12 h-44 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                    {draftEcellLogoUrl ? (
                      <img
                        src={draftEcellLogoUrl}
                        alt="Aurora E-Cell Logo Preview"
                        className="max-h-28 max-w-[240px] w-auto h-auto object-contain select-none"
                      />
                    ) : (
                      <div className="text-center space-y-1">
                        <div className="text-xs font-mono text-[#A1A1AA]">
                          No Aurora E-Cell logo uploaded
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Top-left logo slot will remain cleanly hidden until uploaded.
                        </div>
                      </div>
                    )}
                  </div>

                  {brandingErrors.ecellLogoUrl && (
                    <p className="text-xs text-[#FF3030] font-semibold">
                      {brandingErrors.ecellLogoUrl}
                    </p>
                  )}
                </div>

                {/* Upload / Replace / Remove Controls */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="ecell-logo-file-input"
                      className="px-4 py-2.5 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {draftEcellLogoUrl ? 'Replace E-Cell Logo' : 'Upload E-Cell Logo'}
                      </span>
                    </label>
                    <input
                      id="ecell-logo-file-input"
                      data-testid="ecell-logo-file-input"
                      type="file"
                      accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp"
                      onChange={(e) => handleBrandingLogoUpload(e, 'ecell')}
                      className="hidden"
                    />

                    {draftEcellLogoUrl && (
                      <button
                        type="button"
                        data-testid="remove-ecell-logo-btn"
                        onClick={() => {
                          setDraftEcellLogoUrl('');
                          showToast(
                            'success',
                            'Aurora E-Cell logo removed from draft. Click "Save & Publish Logos" to apply.'
                          );
                        }}
                        className="px-4 py-2.5 bg-[#FF3030]/15 text-[#FF3030] font-display font-bold text-xs border border-[#FF3030]/30 rounded-xl hover:bg-[#FF3030]/25 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Logo</span>
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-[#A1A1AA]">
                    Accepted formats: Transparent PNG, SVG, WebP · Max size: 2 MB
                  </div>
                </div>
              </div>

              {/* Option 2: Aurora College Logo (Top-Right Corner) */}
              <div
                data-testid="college-logo-card"
                className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 bg-white/10 text-white border border-white/15 rounded">
                        2 · TOP-RIGHT CORNER
                      </span>
                      <h3 className="font-display font-bold text-xl text-white mt-2">
                        Aurora College Logo
                      </h3>
                      <p className="text-xs text-[#A1A1AA]">
                        Displayed in the top-right corner of the website header, symmetrically
                        balanced with the E-Cell logo.
                      </p>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                        draftCollegeLogoUrl
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/5 text-[#A1A1AA] border-white/10'
                      }`}
                    >
                      {draftCollegeLogoUrl ? 'LOGO READY' : 'NOT UPLOADED'}
                    </span>
                  </div>

                  {/* Dark Transparency Inspection Stage */}
                  <div className="bg-[#050505] rounded-2xl border border-white/12 h-44 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                    {draftCollegeLogoUrl ? (
                      <img
                        src={draftCollegeLogoUrl}
                        alt="Aurora College Logo Preview"
                        className="max-h-28 max-w-[240px] w-auto h-auto object-contain select-none"
                      />
                    ) : (
                      <div className="text-center space-y-1">
                        <div className="text-xs font-mono text-[#A1A1AA]">
                          No Aurora College logo uploaded
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Top-right logo slot will remain cleanly hidden until uploaded.
                        </div>
                      </div>
                    )}
                  </div>

                  {brandingErrors.collegeLogoUrl && (
                    <p className="text-xs text-[#FF3030] font-semibold">
                      {brandingErrors.collegeLogoUrl}
                    </p>
                  )}
                </div>

                {/* Upload / Replace / Remove Controls */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="college-logo-file-input"
                      className="px-4 py-2.5 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {draftCollegeLogoUrl ? 'Replace College Logo' : 'Upload College Logo'}
                      </span>
                    </label>
                    <input
                      id="college-logo-file-input"
                      data-testid="college-logo-file-input"
                      type="file"
                      accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp"
                      onChange={(e) => handleBrandingLogoUpload(e, 'college')}
                      className="hidden"
                    />

                    {draftCollegeLogoUrl && (
                      <button
                        type="button"
                        data-testid="remove-college-logo-btn"
                        onClick={() => {
                          setDraftCollegeLogoUrl('');
                          showToast(
                            'success',
                            'Aurora College logo removed from draft. Click "Save & Publish Logos" to apply.'
                          );
                        }}
                        className="px-4 py-2.5 bg-[#FF3030]/15 text-[#FF3030] font-display font-bold text-xs border border-[#FF3030]/30 rounded-xl hover:bg-[#FF3030]/25 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Logo</span>
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-[#A1A1AA]">
                    Accepted formats: Transparent PNG, SVG, WebP · Max size: 2 MB
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. USER MANAGEMENT & GOOGLE DRIVE / SHEETS INTEGRATION TAB */}
        {activeSection === 'users' && (
          <div className="space-y-8">
            {/* Google Drive + Sheets Master Database Sync Card */}
            <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="text-xs font-mono font-bold text-[#FF3030] uppercase tracking-widest">
                    GOOGLE DRIVE + EXCEL INTEGRATION
                  </div>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                    Master Spreadsheet: AURORA E-CELL — USER DATABASE
                  </h2>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    Every user registration (Sheet 1:{' '}
                    <strong className="text-white">User Registrations</strong>) and sign-in event
                    (Sheet 2: <strong className="text-white">Login Activity</strong>) is recorded in
                    Firestore and synchronised with your Google Drive master spreadsheet. Passwords
                    and authentication tokens are never stored.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {!hasGoogleToken ? (
                    <button
                      type="button"
                      onClick={onConnectGoogleWorkspace}
                      className="px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-xs border border-white/15 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
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
                      className="px-5 py-3 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(255,48,48,0.3)] transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                      <span>
                        {isSyncingSheets
                          ? 'Syncing with Google Drive...'
                          : 'Sync Now to Google Drive'}
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
                    className="px-5 py-3 bg-[#0B0B0D] text-white font-display font-bold text-xs border border-white/15 rounded-xl hover:border-[#FF3030]/60 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#FF3030]" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Sync Metadata Strip */}
              <div className="bg-[#0B0B0D] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#A1A1AA]">
                <div className="flex flex-wrap items-center gap-3">
                  <span>SHEET 1 (USER REGISTRATIONS): {stats.totalRegisteredUsers} ROWS</span>
                  <span aria-hidden="true">·</span>
                  <span>SHEET 2 (LOGIN ACTIVITY): {loginLogs.length} ROWS</span>
                  {spreadsheetInfo.lastSyncedAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400">
                        LAST SYNCED: {spreadsheetInfo.lastSyncedAt}
                      </span>
                    </>
                  )}
                </div>

                {spreadsheetInfo.spreadsheetUrl && (
                  <a
                    href={spreadsheetInfo.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF3030] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Open Master Google Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Registered Users Table */}
            <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-display font-bold text-xl text-white">
                    Registered Users ({filteredUsersList.length})
                  </h2>
                  <p className="text-xs text-[#A1A1AA]">
                    Search, filter, or manage user account status.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      aria-label="Search users by name or email"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search name or email..."
                      className="pl-9 pr-3.5 py-2 bg-[#0B0B0D] border border-white/15 rounded-xl text-xs text-white"
                    />
                  </div>

                  <select
                    aria-label="Filter users by account status"
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as 'all' | AccountStatus)}
                    className="px-3 py-2 bg-[#0B0B0D] border border-white/15 rounded-xl text-xs font-mono text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="suspended">Suspended Only</option>
                  </select>
                </div>
              </div>

              {filteredUsersList.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] py-10 text-center">
                  No users match the current search filter.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 font-mono text-[#A1A1AA] uppercase">
                        <th className="py-3 px-3">Full Name</th>
                        <th className="py-3 px-3">Email Address</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3">Registered</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredUsersList.map((u) => (
                        <tr key={u.uid} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3 font-bold text-white">{u.fullName}</td>
                          <td className="py-3 px-3 font-mono text-[#A1A1AA]">{u.email}</td>
                          <td className="py-3 px-3 font-mono uppercase">
                            <span
                              className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                                u.role === 'admin'
                                  ? 'bg-[#FF3030]/20 text-[#FF3030] border-[#FF3030]/40'
                                  : 'bg-white/5 text-[#A1A1AA] border-white/10'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[#A1A1AA]">
                            {u.registrationDate} · {u.registrationTime}
                          </td>
                          <td className="py-3 px-3 font-mono uppercase">
                            <span
                              className={`font-bold ${
                                u.accountStatus === 'active' ? 'text-emerald-400' : 'text-[#FF3030]'
                              }`}
                            >
                              {u.accountStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {u.uid !== currentAdmin.uid && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const next: AccountStatus =
                                    u.accountStatus === 'active' ? 'suspended' : 'active';
                                  await onUpdateUserStatus(u.uid, next);
                                  showToast('success', `Updated ${u.fullName} status to ${next}.`);
                                }}
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg font-mono font-bold text-[11px] text-white cursor-pointer"
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

            {/* Login Activity Sheet Preview */}
            <div className="bg-[#141416] border border-white/12 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h2 className="font-display font-bold text-xl text-white">
                    Login Activity Log ({loginLogs.length})
                  </h2>
                  <p className="text-xs text-[#A1A1AA]">
                    Mirrors Sheet 2 ("Login Activity") of the Master Database.
                  </p>
                </div>
              </div>

              {loginLogs.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] py-8 text-center">
                  No login events recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 font-mono text-[#A1A1AA] uppercase">
                        <th className="py-2.5 px-3">User ID</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3">Login Date</th>
                        <th className="py-2.5 px-3">Login Time</th>
                        <th className="py-2.5 px-3">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 font-mono">
                      {loginLogs.slice(0, 25).map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 text-zinc-500">{log.userId.slice(0, 14)}</td>
                          <td className="py-2.5 px-3 text-white">{log.email}</td>
                          <td className="py-2.5 px-3 text-[#A1A1AA]">{log.loginDate}</td>
                          <td className="py-2.5 px-3 text-[#A1A1AA]">{log.loginTime}</td>
                          <td className="py-2.5 px-3 uppercase text-[#FF3030]">
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

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-[#141416] border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)] space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF3030]/15 border border-[#FF3030]/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#FF3030]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-white">{confirmDialog.title}</h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-[#0B0B0D] text-[#A1A1AA] hover:text-white font-display font-bold text-xs border border-white/15 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  try {
                    await action();
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Operation failed.';
                    showToast('error', msg);
                  }
                }}
                className="px-4 py-2 bg-[#FF3030] hover:bg-[#ff4747] text-white font-display font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(255,48,48,0.35)] cursor-pointer"
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
