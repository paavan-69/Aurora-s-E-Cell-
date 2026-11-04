import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Award,
  Rocket,
  Mail,
  X,
  Menu,
  Shield,
  ArrowUpRight,
  Users,
  GraduationCap,
  Handshake,
} from 'lucide-react';
import {
  buildJoinEcellMailto,
  buildJoinEcellGmailWebUrl,
  MAX_NEC_MEMBERS,
  type EventRecord,
  type AchievementRecord,
  type StartupRecord,
  type NecMemberRecord,
  type LeadershipRecord,
  type SponsorRecord,
  type UserProfileRecord,
} from '../utils/ecellLogic';
import {
  HeroPopArtIllustration,
  ResilientMediaImage,
  StylishEmptyState,
  HeaderBrandLogo,
  WordRevealHeading,
  Tilt3DCard,
} from './PopArtGraphics';

export type PortalTab =
  | 'home'
  | 'events'
  | 'achievements'
  | 'startups'
  | 'leadership'
  | 'nec'
  | 'sponsors'
  | 'join';

export interface StudentPortalProps {
  currentUser: UserProfileRecord;
  isAdmin: boolean;
  onOpenAdminDashboard: () => void;
  onLogout: () => Promise<void>;
  publishedEvents: EventRecord[];
  publishedAchievements: AchievementRecord[];
  publishedStartups: StartupRecord[];
  publishedNecMembers?: NecMemberRecord[];
  publishedLeadership?: LeadershipRecord[];
  publishedSponsors?: SponsorRecord[];
  isLoadingData: boolean;
  websiteBranding?: {
    ecellLogoUrl: string;
    collegeLogoUrl: string;
  };
}

const PORTAL_NAV_ITEMS: Array<{ id: PortalTab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'events', label: 'Events' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'startups', label: 'Startups' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'nec', label: 'NEC Team' },
  { id: 'sponsors', label: 'Partners' },
  { id: 'join', label: 'Join E-Cell' },
];

export function StudentPortal({
  currentUser,
  isAdmin,
  onOpenAdminDashboard,
  onLogout,
  publishedEvents,
  publishedAchievements,
  publishedStartups,
  publishedNecMembers = [],
  publishedLeadership = [],
  publishedSponsors = [],
  isLoadingData,
  websiteBranding,
}: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementRecord | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<StartupRecord | null>(null);
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const mailtoHref = buildJoinEcellMailto();
  const gmailWebHref = buildJoinEcellGmailWebUrl();

  const filteredEvents = publishedEvents.filter((evt) =>
    eventFilter === 'all' ? true : evt.eventStatus === eventFilter
  );

  const headsList = publishedLeadership.filter((l) => l.category === 'Head');
  const convenorsList = publishedLeadership.filter((l) => l.category === 'Convenor');

  const primarySponsorsList = publishedSponsors.filter((s) => s.category === 'Sponsor');
  const supportingPartnersList = publishedSponsors.filter(
    (s) => s.category === 'Supporting Partner'
  );

  const navigateTo = (tab: PortalTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Reusable Leadership & Convenors Showcase Section
   */
  const renderLeadershipShowcase = (isDedicatedPage = false) => (
    <section
      data-testid="section-leadership-convenors"
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/12 pb-5">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[#FF3030] mb-1.5">
            {isDedicatedPage ? 'AURORA E-CELL · INSTITUTIONAL GOVERNANCE' : '04. MENTORSHIP & GOVERNANCE'}
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
            Leadership &amp; Convenors
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1AA] mt-1.5 max-w-2xl">
            The visionaries and mentors shaping our entrepreneurial ecosystem.
          </p>
        </div>
        {!isDedicatedPage && (
          <button
            type="button"
            onClick={() => navigateTo('leadership')}
            className="text-xs font-display font-bold text-white hover:text-[#FF3030] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open Leadership Directory</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {publishedLeadership.length === 0 ? (
        <StylishEmptyState
          sectionTitle="Leadership & Convenors"
          message="Nothing here yet. Stay tuned."
          subMessage="Profiles of Institutional Heads and Faculty Convenors published by the Aurora E-Cell administrator will appear here."
        />
      ) : (
        <div className="space-y-10">
          {/* Institutional Heads */}
          {headsList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white">
                <GraduationCap className="w-4 h-4 text-[#FF3030]" />
                <span>INSTITUTIONAL HEADS</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#A1A1AA]">{headsList.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {headsList.map((leader) => (
                  <Tilt3DCard
                    key={leader.id}
                    testId={`leadership-card-${leader.id}`}
                    className="aurora-card rounded-2xl overflow-hidden border-[#FF3030]/30"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 h-full">
                      <div className="sm:col-span-5 bg-[#0B0B0D] relative min-h-[220px]">
                        {leader.photoUrl ? (
                          <img
                            src={leader.photoUrl}
                            alt={leader.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full min-h-[220px] object-cover"
                          />
                        ) : (
                          <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center bg-gradient-to-br from-[#FF3030]/20 via-[#141416] to-[#050505] p-6 text-center">
                            <GraduationCap className="w-10 h-10 text-[#FF3030] mb-2" />
                            <span className="font-mono text-[11px] text-[#A1A1AA] uppercase">
                              INSTITUTIONAL HEAD
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-7 p-6 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#FF3030] mb-2">
                            <span>HEAD</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#A1A1AA]">{leader.qualification}</span>
                          </div>
                          <h3 className="font-display font-bold text-xl sm:text-2xl text-white mb-1.5">
                            {leader.name}
                          </h3>
                          <p className="text-sm font-medium text-[#A1A1AA] leading-relaxed">
                            {leader.role}
                          </p>
                        </div>
                        <div className="mt-5 pt-3 border-t border-white/10 text-xs font-mono text-[#A1A1AA]">
                          Qualification: <span className="text-white">{leader.qualification}</span>
                        </div>
                      </div>
                    </div>
                  </Tilt3DCard>
                ))}
              </div>
            </div>
          )}

          {/* Convenors */}
          {convenorsList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white">
                <Award className="w-4 h-4 text-[#FF3030]" />
                <span>E-CELL CONVENORS</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#A1A1AA]">{convenorsList.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {convenorsList.map((leader) => (
                  <Tilt3DCard
                    key={leader.id}
                    testId={`leadership-card-${leader.id}`}
                    className="aurora-card rounded-2xl overflow-hidden"
                  >
                    <div>
                      <div className="h-56 bg-[#0B0B0D] overflow-hidden border-b border-white/10">
                        {leader.photoUrl ? (
                          <img
                            src={leader.photoUrl}
                            alt={leader.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#8B0000]/25 via-[#141416] to-[#050505] p-6 text-center">
                            <GraduationCap className="w-9 h-9 text-[#FF3030] mb-2" />
                            <span className="font-mono text-[11px] text-[#A1A1AA] uppercase">
                              E-CELL CONVENOR
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#FF3030] mb-1.5">
                          <span>CONVENOR</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#A1A1AA] truncate">{leader.qualification}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl text-white mb-1">
                          {leader.name}
                        </h3>
                        <p className="text-sm text-[#A1A1AA] leading-relaxed">{leader.role}</p>
                      </div>
                    </div>
                  </Tilt3DCard>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );

  /**
   * Reusable NEC Team Showcase Section (Strictly capped at 25 members)
   */
  const renderNecTeamShowcase = (isDedicatedPage = false) => (
    <section
      data-testid="section-nec-team"
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/12 pb-5">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[#FF3030] mb-1.5">
            {isDedicatedPage
              ? `NATIONAL ENTREPRENEURSHIP CHALLENGE · COHORT (${publishedNecMembers.length} / ${MAX_NEC_MEMBERS})`
              : '05. NATIONAL ENTREPRENEURSHIP CHALLENGE'}
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
            The NEC Team
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1AA] mt-1.5 max-w-2xl">
            The minds, makers, and leaders driving our National Entrepreneurship Challenge journey.
          </p>
        </div>
        {!isDedicatedPage && (
          <button
            type="button"
            onClick={() => navigateTo('nec')}
            className="text-xs font-display font-bold text-white hover:text-[#FF3030] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View Full NEC Roster</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {publishedNecMembers.length === 0 ? (
        <StylishEmptyState
          sectionTitle="The NEC Team"
          message="Nothing here yet. Stay tuned."
          subMessage="Our National Entrepreneurship Challenge (NEC) Team roster is curated and published by the Aurora E-Cell administrator."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {publishedNecMembers.slice(0, MAX_NEC_MEMBERS).map((member, index) => (
            <Tilt3DCard
              key={member.id}
              testId={`nec-member-card-${member.id}`}
              className="aurora-card rounded-2xl overflow-hidden group"
            >
              <div>
                <div className="h-60 bg-[#0B0B0D] overflow-hidden border-b border-white/10 relative">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FF3030]/20 via-[#141416] to-[#050505] p-6 text-center">
                      <Users className="w-10 h-10 text-[#FF3030] mb-2" />
                      <span className="font-mono text-[11px] text-[#A1A1AA] uppercase">
                        NEC MEMBER #{String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#FF3030] mb-1">
                    <span>NEC #{String(index + 1).padStart(2, '0')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#A1A1AA] truncate">{member.role}</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-white leading-snug">
                    {member.name}
                  </h3>
                </div>
              </div>
            </Tilt3DCard>
          ))}
        </div>
      )}
    </section>
  );

  /**
   * Reusable Sponsors & Supporting Partners Showcase Section
   */
  const renderSponsorsShowcase = (isDedicatedPage = false) => (
    <section
      data-testid="section-sponsors-partners"
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/12 pb-5">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[#FF3030] mb-1.5">
            {isDedicatedPage ? 'AURORA E-CELL · ECOSYSTEM ALLIANCES' : '06. ECOSYSTEM ALLIANCES'}
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
            Our Partners in Progress
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1AA] mt-1.5 max-w-2xl">
            Together, we empower ideas, nurture innovation, and build the future of entrepreneurship.
          </p>
        </div>
        {!isDedicatedPage && (
          <button
            type="button"
            onClick={() => navigateTo('sponsors')}
            className="text-xs font-display font-bold text-white hover:text-[#FF3030] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Explore Partner Network</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {publishedSponsors.length === 0 ? (
        <StylishEmptyState
          sectionTitle="Our Partners in Progress"
          message="Nothing here yet. Stay tuned."
          subMessage="Official Sponsors and Supporting Partners added by the Aurora E-Cell administrator will be showcased here."
        />
      ) : (
        <div className="space-y-10">
          {/* Animated Infinite Marquee Ribbon */}
          <div className="aurora-card rounded-2xl py-6 px-4 overflow-hidden relative">
            <div className="animate-aurora-marquee flex items-center gap-12">
              {[...publishedSponsors, ...publishedSponsors].map((sp, i) => (
                <div
                  key={`${sp.id}-marquee-${i}`}
                  className="flex items-center gap-4 px-5 py-2.5 rounded-xl bg-[#0B0B0D]/90 border border-white/10 group shrink-0"
                >
                  <img
                    src={sp.logoUrl}
                    alt={sp.name}
                    referrerPolicy="no-referrer"
                    style={{ objectFit: 'contain' }}
                    className="h-9 w-auto max-w-[130px] object-contain grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                  />
                  <div className="text-left">
                    <div className="font-display font-bold text-xs text-white whitespace-nowrap">
                      {sp.name}
                    </div>
                    <div className="font-mono text-[10px] text-[#FF3030] uppercase">
                      {sp.category}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Sponsors Grid */}
          {primarySponsorsList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white">
                <Handshake className="w-4 h-4 text-[#FF3030]" />
                <span>OFFICIAL SPONSORS</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#A1A1AA]">{primarySponsorsList.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {primarySponsorsList.map((sponsor) => (
                  <Tilt3DCard
                    key={sponsor.id}
                    testId={`sponsor-card-${sponsor.id}`}
                    className="aurora-card rounded-2xl p-6 group"
                  >
                    <div className="h-28 flex items-center justify-center p-4 bg-[#0B0B0D] rounded-xl border border-white/10 mb-4">
                      <img
                        src={sponsor.logoUrl}
                        alt={sponsor.name}
                        referrerPolicy="no-referrer"
                        style={{ objectFit: 'contain' }}
                        className="max-h-20 max-w-full object-contain grayscale opacity-85 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <h3 className="font-display font-bold text-base text-white truncate">
                        {sponsor.name}
                      </h3>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#FF3030] shrink-0">
                        SPONSOR
                      </span>
                    </div>
                  </Tilt3DCard>
                ))}
              </div>
            </div>
          )}

          {/* Supporting Partners Grid */}
          {supportingPartnersList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white">
                <Handshake className="w-4 h-4 text-[#FF3030]" />
                <span>SUPPORTING PARTNERS</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#A1A1AA]">{supportingPartnersList.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {supportingPartnersList.map((partner) => (
                  <Tilt3DCard
                    key={partner.id}
                    testId={`sponsor-card-${partner.id}`}
                    className="aurora-card rounded-2xl p-6 group"
                  >
                    <div className="h-28 flex items-center justify-center p-4 bg-[#0B0B0D] rounded-xl border border-white/10 mb-4">
                      <img
                        src={partner.logoUrl}
                        alt={partner.name}
                        referrerPolicy="no-referrer"
                        style={{ objectFit: 'contain' }}
                        className="max-h-20 max-w-full object-contain grayscale opacity-85 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <h3 className="font-display font-bold text-base text-white truncate">
                        {partner.name}
                      </h3>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#A1A1AA] shrink-0">
                        PARTNER
                      </span>
                    </div>
                  </Tilt3DCard>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-aurora-void text-white flex flex-col">
      {/* Floating Responsive Top Navigation Bar (Transparent initially -> Dark Glassmorphism on scroll) */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-3.5 transition-all duration-300 ${
          isScrolled
            ? 'aurora-glass-header'
            : 'bg-[#050505]/90 backdrop-blur-md border-b border-white/10'
        }`}
      >
        {/* Zone 1 (Extreme Top-Left Corner): Aurora E-Cell Logo + Wordmark */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <HeaderBrandLogo
            src={websiteBranding?.ecellLogoUrl}
            alt="Aurora E-Cell Official Logo"
            testId="header-ecell-logo"
          />
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="text-sm sm:text-lg font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            AURORA <span className="text-[#FF3030]">E-CELL</span>
          </button>
        </div>

        {/* Zone 2 (Center): Navigation links with active crimson indicator */}
        <nav
          aria-label="Main Navigation"
          className="hidden xl:flex items-center gap-1 p-1 rounded-xl bg-[#0B0B0D]/90 border border-white/10 text-xs font-display font-semibold"
        >
          {PORTAL_NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'aurora-crimson-btn text-white'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3 (Extreme Top-Right Corner): Actions + Mobile Menu + Aurora College Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminDashboard}
              className="hidden lg:flex px-3 py-1.5 text-xs font-display font-bold aurora-crimson-btn rounded-xl items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-display font-bold aurora-outline-btn rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
          >
            Log Out
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="xl:hidden p-1.5 rounded-xl bg-[#141416] border border-white/15 text-white hover:border-[#FF3030] cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <HeaderBrandLogo
            src={websiteBranding?.collegeLogoUrl}
            alt="Aurora College Official Logo"
            testId="header-college-logo"
          />
        </div>
      </header>

      {/* Mobile / Tablet Glassmorphic Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden aurora-glass border-b border-white/15 px-6 py-4 space-y-2 z-20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PORTAL_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`text-left py-2.5 px-3 rounded-xl font-display font-bold text-xs cursor-pointer ${
                  activeTab === item.id
                    ? 'aurora-crimson-btn text-white'
                    : 'bg-[#0B0B0D] text-[#A1A1AA] border border-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 sm:hidden">
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-3 rounded-xl font-display font-bold text-xs text-center aurora-outline-btn cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* User & Admin Context Strip below the Top Bar */}
      <div className="bg-[#0B0B0D] text-white border-b border-white/10 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[#A1A1AA]">
            <span className="whitespace-nowrap text-white">
              SIGNED IN AS: {currentUser.fullName.toUpperCase()}
            </span>
            {!isAdmin && (
              <>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap">{currentUser.email}</span>
              </>
            )}
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminDashboard}
              className="px-3.5 py-1.5 aurora-crimson-btn font-display font-bold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Open Admin Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-20">
        {/* SECTION A: HOME VIEW */}
        {activeTab === 'home' && (
          <>
            {/* Cinematic Futuristic Aurora Hero Split */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 aurora-card rounded-2xl p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-28 -left-24 w-80 h-80 rounded-full bg-[#FF3030]/15 blur-3xl"
                />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF3030] mb-4 uppercase tracking-wider">
                    <span>AURORA DEGREE &amp; PG COLLEGE</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#A1A1AA]">ENTREPRENEURSHIP CELL</span>
                  </div>

                  <WordRevealHeading
                    text="Bold Ideas. Street-Smart Execution. Student Ventures."
                    highlightWords={['Bold', 'Execution.', 'Ventures.']}
                    className="font-display font-bold text-white tracking-tight leading-[1.05] mb-5"
                    style={{ fontSize: 'clamp(2.25rem, 3.6vw, 3.5rem)' }}
                  />

                  <p className="text-base text-[#A1A1AA] leading-relaxed max-w-2xl mb-8">
                    Welcome to the official Aurora E-Cell portal. Discover campus entrepreneurship
                    initiatives, student milestones, and incubating startups curated by the E-Cell
                    administration.
                  </p>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-4 pt-5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => navigateTo('join')}
                    className="px-6 py-3 aurora-crimson-btn font-display font-bold text-sm rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Join Aurora E-Cell
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('events')}
                    className="px-6 py-3 aurora-outline-btn font-display font-bold text-sm rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Explore Events
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col">
                <HeroPopArtIllustration />
              </div>
            </section>

            {/* 01. Featured Events Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/12 pb-4">
                <div>
                  <div className="text-xs font-mono font-bold text-[#FF3030] mb-1 uppercase tracking-widest">
                    01. CAMPUS INITIATIVES
                  </div>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                    Featured Events
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('events')}
                  className="text-xs font-display font-bold text-white hover:text-[#FF3030] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>View All Events</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {isLoadingData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-72 aurora-card rounded-2xl p-6 animate-pulse"
                    />
                  ))}
                </div>
              ) : publishedEvents.length === 0 ? (
                <StylishEmptyState
                  sectionTitle="Featured Events"
                  message="Nothing here yet. Stay tuned."
                  subMessage="Upcoming E-Cell workshops, speaker sessions, and pitch events published by the administrator will appear here."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publishedEvents.slice(0, 3).map((evt) => (
                    <Tilt3DCard
                      key={evt.id}
                      className="aurora-card rounded-2xl overflow-hidden"
                    >
                      <div>
                        <ResilientMediaImage
                          src={evt.posterUrl}
                          alt={evt.title}
                          fallbackTitle={evt.title}
                          fallbackSubtitle={`${evt.date} · ${evt.venue}`}
                          variant="orange"
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-6">
                          <div className="flex items-center gap-2 text-xs font-mono text-[#A1A1AA] mb-2">
                            <span className="uppercase font-bold text-[#FF3030]">{evt.eventStatus}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{evt.date}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{evt.time}</span>
                          </div>
                          <h3 className="font-display font-bold text-xl text-white mb-2">
                            {evt.title}
                          </h3>
                          <p className="text-sm text-[#A1A1AA] line-clamp-3 leading-relaxed">
                            {evt.description}
                          </p>
                        </div>
                      </div>
                      <div className="px-6 pb-6 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <span className="text-xs font-mono text-[#A1A1AA] truncate">
                          {evt.venue}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(evt)}
                          className="px-3.5 py-1.5 aurora-crimson-btn font-display font-bold text-xs rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </Tilt3DCard>
                  ))}
                </div>
              )}
            </section>

            {/* 02. Achievements Preview Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/12 pb-4">
                <div>
                  <div className="text-xs font-mono font-bold text-[#FF3030] mb-1 uppercase tracking-widest">
                    02. EDITORIAL CHRONICLE
                  </div>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                    Achievements
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('achievements')}
                  className="text-xs font-display font-bold text-white hover:text-[#FF3030] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Open Achievements Chronicle</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {publishedAchievements.length === 0 ? (
                <StylishEmptyState
                  sectionTitle="Achievements"
                  message="Nothing here yet. Stay tuned."
                  subMessage="Milestones, awards, and recognitions published by the administrator will be showcased in this editorial section."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {publishedAchievements.slice(0, 2).map((ach) => (
                    <Tilt3DCard
                      key={ach.id}
                      className="aurora-card rounded-2xl overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 h-full">
                        <div className="sm:col-span-5">
                          <ResilientMediaImage
                            src={ach.imageUrl}
                            alt={ach.title}
                            fallbackTitle={ach.title}
                            fallbackSubtitle={ach.date}
                            variant="yellow"
                            className="w-full h-full min-h-[180px] object-cover"
                          />
                        </div>
                        <div className="sm:col-span-7 p-6 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-mono text-[#A1A1AA] mb-2">
                              <span className="text-[#FF3030]">ACHIEVEMENT</span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{ach.date}</span>
                            </div>
                            <h3 className="font-display font-bold text-xl text-white mb-2">
                              {ach.title}
                            </h3>
                            <p className="text-sm text-[#A1A1AA] line-clamp-3 leading-relaxed">
                              {ach.description}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedAchievement(ach)}
                              className="px-3.5 py-1.5 aurora-outline-btn font-display font-bold text-xs rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Read Full Story
                            </button>
                          </div>
                        </div>
                      </div>
                    </Tilt3DCard>
                  ))}
                </div>
              )}
            </section>

            {/* 03. Active Incubating Startups Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/12 pb-4">
                <div>
                  <div className="text-xs font-mono font-bold text-[#FF3030] mb-1 uppercase tracking-widest">
                    03. VENTURE INCUBATOR
                  </div>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                    Active Incubating Startups
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('startups')}
                  className="text-xs font-display font-bold text-white hover:text-[#FF3030] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Explore Startup Directory</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {publishedStartups.length === 0 ? (
                <StylishEmptyState
                  sectionTitle="Incubating Startups"
                  message="Nothing here yet. Stay tuned."
                  subMessage="Student-led startups and ventures incubated at Aurora E-Cell will appear here once published by the administrator."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {publishedStartups.slice(0, 3).map((st) => (
                    <Tilt3DCard
                      key={st.id}
                      className="aurora-card rounded-2xl p-6"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl border border-white/15 overflow-hidden bg-[#0B0B0D] flex items-center justify-center shrink-0">
                            {st.logoUrl ? (
                              <img
                                src={st.logoUrl}
                                alt={`${st.name} logo`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Rocket className="w-6 h-6 text-[#FF3030]" />
                            )}
                          </div>
                          <div className="text-xs font-mono text-[#A1A1AA] text-right">
                            <span>{st.category}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="uppercase font-bold text-[#FF3030]">{st.currentStatus}</span>
                          </div>
                        </div>
                        <h3 className="font-display font-bold text-xl text-white mb-2">
                          {st.name}
                        </h3>
                        <p className="text-sm text-[#A1A1AA] line-clamp-3 leading-relaxed">
                          {st.description}
                        </p>
                      </div>
                      <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-[#A1A1AA] truncate">
                          {st.founderInfo ? `Founder: ${st.founderInfo}` : 'Aurora E-Cell Cohort'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedStartup(st)}
                          className="px-3.5 py-1.5 aurora-crimson-btn font-display font-bold text-xs rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          View Profile
                        </button>
                      </div>
                    </Tilt3DCard>
                  ))}
                </div>
              )}
            </section>

            {/* 04. Leadership & Convenors Section */}
            {renderLeadershipShowcase(false)}

            {/* 05. The NEC Team Section */}
            {renderNecTeamShowcase(false)}

            {/* 06. Our Partners in Progress Section */}
            {renderSponsorsShowcase(false)}

            {/* 07. Join E-Cell Callout Banner on Home */}
            <section className="aurora-card rounded-2xl p-8 md:p-12 relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 border-[#FF3030]/35">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#FF3030]/20 blur-3xl"
              />
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="text-xs font-mono font-bold text-[#FF3030] uppercase tracking-widest">
                  07. GET INVOLVED WITH AURORA E-CELL
                </div>
                <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
                  Ready to Build With the E-Cell Community?
                </h2>
                <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                  Click the button to open your email application with our official recipient,
                  subject line, and membership inquiry message pre-filled for{' '}
                  <strong className="font-mono text-white">edcellaurora@gmail.com</strong>.
                </p>
              </div>
              <div className="relative z-10 flex flex-wrap items-center gap-4 shrink-0">
                <a
                  href={mailtoHref}
                  data-testid="home-join-ecell-mailto"
                  className="px-6 py-3.5 aurora-crimson-btn font-display font-bold text-sm rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Mail className="w-4 h-4" />
                  <span>JOIN E-CELL</span>
                </a>
                <a
                  href={gmailWebHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 aurora-outline-btn font-display font-bold text-xs rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <span>Compose in Gmail Web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </section>
          </>
        )}

        {/* SECTION B: EVENTS PAGE */}
        {activeTab === 'events' && (
          <section className="space-y-8">
            <div className="aurora-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="text-xs font-mono font-bold text-[#FF3030] mb-2 uppercase tracking-widest">
                  AURORA E-CELL · EVENTS DIRECTORY
                </div>
                <h1 className="font-display font-bold text-3xl sm:text-4xl text-white">
                  Events &amp; Programs
                </h1>
                <p className="text-sm text-[#A1A1AA] mt-2 max-w-xl">
                  Browse all official events published by the Aurora E-Cell administrator. Click any
                  event to inspect full schedule, venue, and registration details.
                </p>
              </div>

              {/* Interactive Filter Controls */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#050505] border border-white/10 rounded-xl self-start">
                {(['all', 'upcoming', 'ongoing', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setEventFilter(status)}
                    className={`px-3.5 py-1.5 text-xs font-display font-bold rounded-lg capitalize transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      eventFilter === status
                        ? 'aurora-crimson-btn text-white'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <StylishEmptyState
                sectionTitle="Events"
                message="Nothing here yet. Stay tuned."
                subMessage="No published events match this view yet. Once the administrator publishes an event, it will appear here immediately."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((evt) => (
                  <Tilt3DCard
                    key={evt.id}
                    className="aurora-card rounded-2xl overflow-hidden"
                  >
                    <div>
                      <ResilientMediaImage
                        src={evt.posterUrl}
                        alt={evt.title}
                        fallbackTitle={evt.title}
                        fallbackSubtitle={`${evt.date} · ${evt.venue}`}
                        variant="orange"
                        className="w-full h-52 object-cover"
                      />
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-xs font-mono text-[#A1A1AA] mb-2">
                          <span className="uppercase font-bold text-[#FF3030]">{evt.eventStatus}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{evt.date}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{evt.time}</span>
                        </div>
                        <h2 className="font-display font-bold text-xl text-white mb-2">
                          {evt.title}
                        </h2>
                        <p className="text-sm text-[#A1A1AA] line-clamp-3 leading-relaxed">
                          {evt.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                      <span className="text-xs font-mono text-[#A1A1AA] truncate">
                        {evt.venue}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(evt)}
                        className="px-4 py-2 aurora-crimson-btn font-display font-bold text-xs rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Open Event Details
                      </button>
                    </div>
                  </Tilt3DCard>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION C: ACHIEVEMENTS PAGE */}
        {activeTab === 'achievements' && (
          <section className="space-y-8">
            <div className="aurora-card rounded-2xl p-6 sm:p-8">
              <div className="text-xs font-mono font-bold text-[#FF3030] mb-2 uppercase tracking-widest">
                AURORA E-CELL · EDITORIAL ISSUE
              </div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl text-white">
                Achievements &amp; Milestones
              </h1>
              <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl">
                An editorial record of accomplishments, recognitions, and milestones published by the
                Aurora E-Cell administration.
              </p>
            </div>

            {publishedAchievements.length === 0 ? (
              <StylishEmptyState
                sectionTitle="Achievements"
                message="Nothing here yet. Stay tuned."
                subMessage="No achievements have been published yet. All achievements are added and verified by the administrator."
              />
            ) : (
              <div className="space-y-8">
                {publishedAchievements.map((ach, index) => (
                  <article
                    key={ach.id}
                    className="aurora-card rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12"
                  >
                    <div
                      className={`lg:col-span-5 ${
                        index % 2 === 1 ? 'lg:order-2' : ''
                      }`}
                    >
                      <ResilientMediaImage
                        src={ach.imageUrl}
                        alt={ach.title}
                        fallbackTitle={ach.title}
                        fallbackSubtitle={ach.date}
                        variant={index % 2 === 0 ? 'yellow' : 'blue'}
                        className="w-full h-full min-h-[240px] object-cover"
                      />
                    </div>
                    <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF3030] mb-3">
                          <span>CHRONICLE NO. {String(index + 1).padStart(2, '0')}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums text-[#A1A1AA]">{ach.date}</span>
                        </div>
                        <h2 className="font-display font-bold text-2xl sm:text-3xl text-white mb-4">
                          {ach.title}
                        </h2>
                        <p className="text-base text-[#A1A1AA] leading-relaxed whitespace-pre-line">
                          {ach.description}
                        </p>
                        {ach.additionalDetails && (
                          <p className="mt-4 text-sm text-[#A1A1AA]/80 leading-relaxed whitespace-pre-line">
                            {ach.additionalDetails}
                          </p>
                        )}
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedAchievement(ach)}
                          className="px-4 py-2 aurora-crimson-btn font-display font-bold text-xs rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Inspect Full Achievement
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION D: INCUBATING STARTUPS PAGE */}
        {activeTab === 'startups' && (
          <section className="space-y-8">
            <div className="aurora-card rounded-2xl p-6 sm:p-8">
              <div className="text-xs font-mono font-bold text-[#FF3030] mb-2 uppercase tracking-widest">
                AURORA E-CELL · VENTURE SHOWCASE
              </div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl text-white">
                Incubating Startups
              </h1>
              <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl">
                Explore active student ventures and startups incubated under Aurora E-Cell.
              </p>
            </div>

            {publishedStartups.length === 0 ? (
              <StylishEmptyState
                sectionTitle="Incubating Startups"
                message="Nothing here yet. Stay tuned."
                subMessage="No startup profiles have been published yet. Startup profiles are curated and controlled by the administrator."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedStartups.map((st) => (
                  <Tilt3DCard
                    key={st.id}
                    className="aurora-card rounded-2xl overflow-hidden"
                  >
                    <div>
                      {st.imageUrl && (
                        <ResilientMediaImage
                          src={st.imageUrl}
                          alt={st.name}
                          fallbackTitle={st.name}
                          fallbackSubtitle={st.category}
                          variant="blue"
                          className="w-full h-44 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl border border-white/15 overflow-hidden bg-[#0B0B0D] flex items-center justify-center shrink-0">
                            {st.logoUrl ? (
                              <img
                                src={st.logoUrl}
                                alt={`${st.name} logo`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Rocket className="w-6 h-6 text-[#FF3030]" />
                            )}
                          </div>
                          <div>
                            <h2 className="font-display font-bold text-xl text-white">
                              {st.name}
                            </h2>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-[#A1A1AA]">
                              <span>{st.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="uppercase font-bold text-[#FF3030]">
                                {st.currentStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-[#A1A1AA] line-clamp-3 leading-relaxed">
                          {st.description}
                        </p>

                        {st.founderInfo && (
                          <p className="mt-3 text-xs font-mono text-[#A1A1AA]">
                            Founder(s): <span className="text-white">{st.founderInfo}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-3 border-t border-white/10 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedStartup(st)}
                        className="px-4 py-2 aurora-crimson-btn font-display font-bold text-xs rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Open Startup Profile
                      </button>
                    </div>
                  </Tilt3DCard>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION E: DEDICATED LEADERSHIP & CONVENORS PAGE */}
        {activeTab === 'leadership' && renderLeadershipShowcase(true)}

        {/* SECTION F: DEDICATED NEC TEAM PAGE */}
        {activeTab === 'nec' && renderNecTeamShowcase(true)}

        {/* SECTION G: DEDICATED SPONSORS & SUPPORTING PARTNERS PAGE */}
        {activeTab === 'sponsors' && renderSponsorsShowcase(true)}

        {/* SECTION H: JOIN E-CELL PAGE */}
        {activeTab === 'join' && (
          <section className="max-w-4xl mx-auto">
            <div className="aurora-card rounded-2xl p-8 sm:p-12 space-y-8 border-[#FF3030]/35 relative overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#FF3030]/15 blur-3xl"
              />
              <div className="relative z-10 space-y-3">
                <div className="text-xs font-mono font-bold text-[#FF3030] uppercase tracking-widest">
                  OFFICIAL MEMBERSHIP APPLICATION · AURORA E-CELL
                </div>
                <h1
                  className="font-display font-bold text-white tracking-tight leading-[1.08]"
                  style={{ fontSize: 'clamp(2rem, 3.8vw, 3.25rem)' }}
                >
                  JOIN <span className="text-[#FF3030]">E-CELL</span>
                </h1>
                <p className="text-base text-[#A1A1AA] leading-relaxed max-w-2xl">
                  Want to participate in Aurora E-Cell activities, events, and entrepreneurship
                  initiatives? Click the button below to launch your email client with the official
                  recipient, subject, and message pre-filled.
                </p>
              </div>

              {/* Pre-filled Email Preview Box */}
              <div className="relative z-10 bg-[#0B0B0D] border border-white/12 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono border-b border-white/10 pb-3">
                  <span className="font-bold text-[#A1A1AA]">TO:</span>
                  <span className="font-bold text-white">edcellaurora@gmail.com</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-bold text-[#A1A1AA]">SUBJECT:</span>
                  <span className="font-bold text-[#FF3030]">
                    Interested in Joining Aurora E-Cell
                  </span>
                </div>

                <div className="text-sm text-[#A1A1AA] font-sans whitespace-pre-line leading-relaxed">
                  {`Hi,\n\nI am interested in joining Aurora E-Cell. I would love to be a part of the Entrepreneurship Cell and participate in its activities, events and initiatives.\n\nPlease let me know the process to join.\n\nThank you!`}
                </div>
              </div>

              <div className="relative z-10 flex flex-wrap items-center gap-4">
                <a
                  href={mailtoHref}
                  data-testid="join-ecell-mailto-btn"
                  className="px-7 py-4 aurora-crimson-btn font-display font-bold text-base rounded-xl flex items-center gap-2.5 whitespace-nowrap shrink-0"
                >
                  <Mail className="w-5 h-5" />
                  <span>JOIN E-CELL (Open Email App)</span>
                </a>

                <a
                  href={gmailWebHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-4 aurora-outline-btn font-display font-bold text-sm rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Open in Gmail Web</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <p className="relative z-10 text-xs text-[#A1A1AA] font-medium">
                Note: Clicking the button opens your email application with the recipient, subject,
                and message pre-filled so you can review and send it directly.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-event-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="aurora-card rounded-2xl max-w-2xl w-full overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0B0B0D] border-b border-white/12">
              <span className="font-mono font-bold text-xs text-[#FF3030] uppercase">
                Event Details · {selectedEvent.eventStatus}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close event details"
                className="p-1.5 bg-[#141416] border border-white/15 rounded-lg text-white hover:border-[#FF3030] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedEvent.posterUrl && (
              <ResilientMediaImage
                src={selectedEvent.posterUrl}
                alt={selectedEvent.title}
                fallbackTitle={selectedEvent.title}
                variant="orange"
                className="w-full max-h-80 object-cover"
              />
            )}

            <div className="p-6 sm:p-8 space-y-5">
              <h2
                id="modal-event-title"
                className="font-display font-bold text-2xl sm:text-3xl text-white"
              >
                {selectedEvent.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#A1A1AA] bg-[#0B0B0D] p-3.5 rounded-xl border border-white/10">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#FF3030]" />
                  <span>Date: {selectedEvent.date}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#FF3030]" />
                  <span>Time: {selectedEvent.time}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#FF3030]" />
                  <span>Venue: {selectedEvent.venue}</span>
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-bold text-sm text-[#A1A1AA]">Description</h3>
                <p className="text-sm sm:text-base text-white whitespace-pre-line leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              {selectedEvent.additionalInfo && (
                <div className="space-y-1 pt-3 border-t border-white/10">
                  <h3 className="font-display font-bold text-sm text-[#A1A1AA]">
                    Additional Information
                  </h3>
                  <p className="text-sm text-[#A1A1AA] whitespace-pre-line leading-relaxed">
                    {selectedEvent.additionalInfo}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-white/12 flex flex-wrap items-center justify-between gap-3">
                {selectedEvent.registrationUrl ? (
                  <a
                    href={selectedEvent.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 aurora-crimson-btn font-display font-bold text-xs rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <span>Register for Event</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="text-xs font-mono text-[#A1A1AA]">
                    No external registration link required
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 aurora-outline-btn font-display font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-achievement-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="aurora-card rounded-2xl max-w-2xl w-full overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0B0B0D] border-b border-white/12">
              <span className="font-mono font-bold text-xs text-[#FF3030] flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                <span>Achievement Record · {selectedAchievement.date}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                aria-label="Close achievement details"
                className="p-1.5 bg-[#141416] text-white border border-white/15 rounded-lg hover:border-[#FF3030] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedAchievement.imageUrl && (
              <ResilientMediaImage
                src={selectedAchievement.imageUrl}
                alt={selectedAchievement.title}
                fallbackTitle={selectedAchievement.title}
                variant="yellow"
                className="w-full max-h-80 object-cover"
              />
            )}

            <div className="p-6 sm:p-8 space-y-4">
              <h2
                id="modal-achievement-title"
                className="font-display font-bold text-2xl sm:text-3xl text-white"
              >
                {selectedAchievement.title}
              </h2>
              <p className="text-sm sm:text-base text-[#A1A1AA] whitespace-pre-line leading-relaxed">
                {selectedAchievement.description}
              </p>
              {selectedAchievement.additionalDetails && (
                <div className="pt-3 border-t border-white/10">
                  <h3 className="font-display font-bold text-xs text-[#A1A1AA] mb-1">
                    Additional Details
                  </h3>
                  <p className="text-sm text-white whitespace-pre-line">
                    {selectedAchievement.additionalDetails}
                  </p>
                </div>
              )}
              <div className="pt-4 border-t border-white/12 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAchievement(null)}
                  className="px-4 py-2 aurora-outline-btn font-display font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Startup Detail Modal */}
      {selectedStartup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-startup-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="aurora-card rounded-2xl max-w-2xl w-full overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0B0B0D] border-b border-white/12">
              <span className="font-mono font-bold text-xs text-[#FF3030] uppercase">
                Startup Profile · {selectedStartup.currentStatus}
              </span>
              <button
                type="button"
                onClick={() => setSelectedStartup(null)}
                aria-label="Close startup profile"
                className="p-1.5 bg-[#141416] text-white border border-white/15 rounded-lg hover:border-[#FF3030] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedStartup.imageUrl && (
              <ResilientMediaImage
                src={selectedStartup.imageUrl}
                alt={selectedStartup.name}
                fallbackTitle={selectedStartup.name}
                variant="blue"
                className="w-full max-h-72 object-cover"
              />
            )}

            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl border border-white/15 bg-[#0B0B0D] flex items-center justify-center overflow-hidden shrink-0">
                  {selectedStartup.logoUrl ? (
                    <img
                      src={selectedStartup.logoUrl}
                      alt={`${selectedStartup.name} logo`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Rocket className="w-7 h-7 text-[#FF3030]" />
                  )}
                </div>
                <div>
                  <h2
                    id="modal-startup-title"
                    className="font-display font-bold text-2xl sm:text-3xl text-white"
                  >
                    {selectedStartup.name}
                  </h2>
                  <div className="text-xs font-mono text-[#A1A1AA]">
                    <span>Category: {selectedStartup.category}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="uppercase font-bold text-[#FF3030]">
                      Status: {selectedStartup.currentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#A1A1AA] whitespace-pre-line leading-relaxed">
                {selectedStartup.description}
              </p>

              {selectedStartup.founderInfo && (
                <div className="pt-3 border-t border-white/10">
                  <h3 className="font-display font-bold text-xs text-[#A1A1AA] mb-1">
                    Founder Information
                  </h3>
                  <p className="text-sm text-white">{selectedStartup.founderInfo}</p>
                </div>
              )}

              {selectedStartup.additionalDetails && (
                <div className="pt-3 border-t border-white/10">
                  <h3 className="font-display font-bold text-xs text-[#A1A1AA] mb-1">
                    Additional Details
                  </h3>
                  <p className="text-sm text-white whitespace-pre-line">
                    {selectedStartup.additionalDetails}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-white/12 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStartup(null)}
                  className="px-4 py-2 aurora-outline-btn font-display font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-[#0B0B0D] px-6 py-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-display font-bold text-lg text-white">
              AURORA <span className="text-[#FF3030]">E-CELL</span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Aurora Degree &amp; PG College · Official Entrepreneurship Cell Portal
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-[#A1A1AA]">
            {PORTAL_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className="hover:text-white cursor-pointer"
              >
                {item.label}
              </button>
            ))}
            <a href={mailtoHref} className="text-[#FF3030] hover:underline font-bold">
              Contact: edcellaurora@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
