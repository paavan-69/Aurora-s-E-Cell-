import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  buildJoinEcellMailto,
  buildJoinEcellGmailWebUrl,
  type EventRecord,
  type AchievementRecord,
  type StartupRecord,
  type UserProfileRecord,
} from '../utils/ecellLogic';
import {
  HeroPopArtIllustration,
  ResilientMediaImage,
  StylishEmptyState,
} from './PopArtGraphics';

export type PortalTab = 'home' | 'events' | 'achievements' | 'startups' | 'join';

export interface StudentPortalProps {
  currentUser: UserProfileRecord;
  isAdmin: boolean;
  onOpenAdminDashboard: () => void;
  onLogout: () => Promise<void>;
  publishedEvents: EventRecord[];
  publishedAchievements: AchievementRecord[];
  publishedStartups: StartupRecord[];
  isLoadingData: boolean;
}

export function StudentPortal({
  currentUser,
  isAdmin,
  onOpenAdminDashboard,
  onLogout,
  publishedEvents,
  publishedAchievements,
  publishedStartups,
  isLoadingData,
}: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementRecord | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<StartupRecord | null>(null);
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');

  const mailtoHref = buildJoinEcellMailto();
  const gmailWebHref = buildJoinEcellGmailWebUrl();

  const filteredEvents = publishedEvents.filter((evt) =>
    eventFilter === 'all' ? true : evt.eventStatus === eventFilter
  );

  const navigateTo = (tab: PortalTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-halftone-light text-[#0F0F0F] flex flex-col">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-[#FFFDF7] border-b-2 border-[#0F0F0F]">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="text-lg font-display font-extrabold tracking-tight text-[#0F0F0F] whitespace-nowrap shrink-0 cursor-pointer"
        >
          AURORA E-CELL
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 text-sm font-semibold text-neutral-700">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className={`hover:text-[#0F0F0F] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'home' ? 'text-[#0F0F0F] underline decoration-2 underline-offset-4 decoration-[#FF5722]' : ''
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => navigateTo('events')}
            className={`hover:text-[#0F0F0F] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'events' ? 'text-[#0F0F0F] underline decoration-2 underline-offset-4 decoration-[#FF5722]' : ''
            }`}
          >
            Events
          </button>
          <button
            type="button"
            onClick={() => navigateTo('achievements')}
            className={`hover:text-[#0F0F0F] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'achievements' ? 'text-[#0F0F0F] underline decoration-2 underline-offset-4 decoration-[#FF5722]' : ''
            }`}
          >
            Achievements
          </button>
          <button
            type="button"
            onClick={() => navigateTo('startups')}
            className={`hover:text-[#0F0F0F] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'startups' ? 'text-[#0F0F0F] underline decoration-2 underline-offset-4 decoration-[#FF5722]' : ''
            }`}
          >
            Startups
          </button>
          <button
            type="button"
            onClick={() => navigateTo('join')}
            className={`hover:text-[#0F0F0F] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'join' ? 'text-[#0F0F0F] underline decoration-2 underline-offset-4 decoration-[#FF5722]' : ''
            }`}
          >
            Join E-Cell
          </button>
        </nav>

        {/* Zone 3: Admin Console shortcut (if admin) + Log Out + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminDashboard}
              className="px-3.5 py-2 text-xs font-display font-extrabold text-[#0F0F0F] bg-[#FACC15] border-2 border-[#0F0F0F] rounded-lg hover:bg-[#FF5722] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Console (Manage Events)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-xs font-display font-bold text-[#FFFDF7] bg-[#0F0F0F] rounded-lg hover:bg-[#E11D48] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Log Out
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2 border-2 border-[#0F0F0F] rounded-lg bg-[#FACC15] text-[#0F0F0F] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFDF7] border-b-2 border-[#0F0F0F] px-6 py-4 space-y-2">
          {(['home', 'events', 'achievements', 'startups', 'join'] as PortalTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => navigateTo(tab)}
              className={`block w-full text-left py-2.5 px-3 rounded-lg font-display font-bold text-sm capitalize cursor-pointer ${
                activeTab === tab ? 'bg-[#FACC15] text-[#0F0F0F] border-2 border-[#0F0F0F]' : 'text-neutral-800'
              }`}
            >
              {tab === 'join' ? 'Join E-Cell' : tab}
            </button>
          ))}
        </div>
      )}

      {/* User & Admin Context Strip below the Top Bar */}
      <div className="bg-[#0F0F0F] text-[#FFFDF7] border-b-2 border-[#0F0F0F] px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono">
            <span className="whitespace-nowrap">SIGNED IN AS: {currentUser.fullName.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">{currentUser.email}</span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminDashboard}
              className="px-3.5 py-1.5 bg-[#FACC15] text-[#0F0F0F] font-display font-extrabold text-xs rounded-md hover:bg-[#FF5722] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Open Admin Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-16">
        {/* SECTION A: HOME VIEW */}
        {activeTab === 'home' && (
          <>
            {/* Explosive Desi Pop-Art Hero Split */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 sm:p-10 pop-shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#E11D48] mb-4">
                    <span>AURORA DEGREE &amp; PG COLLEGE</span>
                    <span aria-hidden="true">·</span>
                    <span>ENTREPRENEURSHIP CELL</span>
                  </div>

                  <h1
                    className="font-display font-extrabold text-[#0F0F0F] tracking-tight leading-[1.05] mb-5"
                    style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)' }}
                  >
                    Bold Ideas. Street-Smart Execution. Student Ventures.
                  </h1>

                  <p className="text-base text-neutral-800 leading-relaxed max-w-2xl mb-8">
                    Welcome to the official Aurora E-Cell portal. Discover campus entrepreneurship
                    initiatives, student milestones, and incubating startups curated by the E-Cell
                    administration.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4 border-t-2 border-neutral-200">
                  <button
                    type="button"
                    onClick={() => navigateTo('join')}
                    className="px-6 py-3 bg-[#FF5722] text-[#0F0F0F] font-display font-extrabold text-sm border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FACC15] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Join Aurora E-Cell
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('events')}
                    className="px-6 py-3 bg-[#FFFDF7] text-[#0F0F0F] font-display font-bold text-sm border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Explore Events
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <HeroPopArtIllustration />
              </div>
            </section>

            {/* Featured Events Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-[#0F0F0F] pb-4">
                <div>
                  <div className="text-xs font-mono font-bold text-[#1D4ED8] mb-1">
                    01. CAMPUS INITIATIVES
                  </div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F0F0F]">
                    Featured Events
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('events')}
                  className="text-xs font-display font-bold text-[#0F0F0F] hover:text-[#FF5722] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
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
                      className="h-72 bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 animate-pulse"
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
                    <article
                      key={evt.id}
                      className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl overflow-hidden pop-shadow pop-card-interactive flex flex-col justify-between"
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
                          <div className="flex items-center gap-2 text-xs font-mono text-neutral-600 mb-2">
                            <span className="uppercase font-bold text-[#E11D48]">{evt.eventStatus}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{evt.date}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{evt.time}</span>
                          </div>
                          <h3 className="font-display font-extrabold text-xl text-[#0F0F0F] mb-2">
                            {evt.title}
                          </h3>
                          <p className="text-sm text-neutral-700 line-clamp-3 leading-relaxed">
                            {evt.description}
                          </p>
                        </div>
                      </div>
                      <div className="px-6 pb-6 pt-3 border-t border-neutral-200 flex items-center justify-between gap-3">
                        <span className="text-xs font-mono text-neutral-600 truncate">
                          {evt.venue}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(evt)}
                          className="px-3.5 py-1.5 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-[#FF5722] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Achievements Preview Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-[#0F0F0F] pb-4">
                <div>
                  <div className="text-xs font-mono font-bold text-[#E11D48] mb-1">
                    02. EDITORIAL CHRONICLE
                  </div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F0F0F]">
                    Achievements
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('achievements')}
                  className="text-xs font-display font-bold text-[#0F0F0F] hover:text-[#FF5722] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
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
                    <article
                      key={ach.id}
                      className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl overflow-hidden pop-shadow pop-card-interactive grid grid-cols-1 sm:grid-cols-12"
                    >
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
                          <div className="flex items-center gap-2 text-xs font-mono text-neutral-600 mb-2">
                            <span>ACHIEVEMENT</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{ach.date}</span>
                          </div>
                          <h3 className="font-display font-extrabold text-xl text-[#0F0F0F] mb-2">
                            {ach.title}
                          </h3>
                          <p className="text-sm text-neutral-700 line-clamp-3 leading-relaxed">
                            {ach.description}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedAchievement(ach)}
                            className="px-3.5 py-1.5 bg-[#FFFDF7] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-[#FACC15] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Read Full Story
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Active Incubating Startups Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-[#0F0F0F] pb-4">
                <div>
                  <div className="text-xs font-mono font-bold text-[#FF5722] mb-1">
                    03. VENTURE INCUBATOR
                  </div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F0F0F]">
                    Active Incubating Startups
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('startups')}
                  className="text-xs font-display font-bold text-[#0F0F0F] hover:text-[#FF5722] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
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
                    <article
                      key={st.id}
                      className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow pop-card-interactive flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="w-12 h-12 rounded-lg border-2 border-[#0F0F0F] overflow-hidden bg-[#FACC15] flex items-center justify-center shrink-0">
                            {st.logoUrl ? (
                              <img
                                src={st.logoUrl}
                                alt={`${st.name} logo`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Rocket className="w-6 h-6 text-[#0F0F0F]" />
                            )}
                          </div>
                          <div className="text-xs font-mono text-neutral-600 text-right">
                            <span>{st.category}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="uppercase font-bold text-[#1D4ED8]">{st.currentStatus}</span>
                          </div>
                        </div>
                        <h3 className="font-display font-extrabold text-xl text-[#0F0F0F] mb-2">
                          {st.name}
                        </h3>
                        <p className="text-sm text-neutral-700 line-clamp-3 leading-relaxed">
                          {st.description}
                        </p>
                      </div>
                      <div className="mt-5 pt-3 border-t border-neutral-200 flex items-center justify-between">
                        <span className="text-xs text-neutral-600 truncate">
                          {st.founderInfo ? `Founder: ${st.founderInfo}` : 'Aurora E-Cell Cohort'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedStartup(st)}
                          className="px-3.5 py-1.5 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-[#FF5722] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          View Profile
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Join E-Cell Callout Banner on Home */}
            <section className="bg-halftone-yellow border-2 border-[#0F0F0F] rounded-xl p-8 md:p-12 pop-shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-2xl space-y-3">
                <div className="text-xs font-mono font-bold text-[#0F0F0F]">
                  04. GET INVOLVED WITH AURORA E-CELL
                </div>
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0F0F0F] tracking-tight">
                  Ready to Build With the E-Cell Community?
                </h2>
                <p className="text-sm sm:text-base text-[#0F0F0F] leading-relaxed">
                  Click the button to open your email application with our official recipient,
                  subject line, and membership inquiry message pre-filled for{' '}
                  <strong className="font-mono">edcellaurora@gmail.com</strong>.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 shrink-0">
                <a
                  href={mailtoHref}
                  data-testid="home-join-ecell-mailto"
                  className="px-6 py-3.5 bg-[#FF5722] text-[#0F0F0F] font-display font-extrabold text-sm border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FFFDF7] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Mail className="w-4 h-4" />
                  <span>JOIN E-CELL</span>
                </a>
                <a
                  href={gmailWebHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 bg-[#FFFDF7] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-neutral-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
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
            <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 sm:p-8 pop-shadow flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="text-xs font-mono font-bold text-[#FF5722] mb-2">
                  AURORA E-CELL · EVENTS DIRECTORY
                </div>
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0F0F0F]">
                  Events &amp; Programs
                </h1>
                <p className="text-sm text-neutral-700 mt-2 max-w-xl">
                  Browse all official events published by the Aurora E-Cell administrator. Click any
                  event to inspect full schedule, venue, and registration details.
                </p>
              </div>

              {/* Interactive Filter Controls */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0F0F0F] rounded-lg self-start">
                {(['all', 'upcoming', 'ongoing', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setEventFilter(status)}
                    className={`px-3 py-1.5 text-xs font-display font-bold rounded-md capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      eventFilter === status
                        ? 'bg-[#FACC15] text-[#0F0F0F]'
                        : 'text-[#FFFDF7] hover:text-[#FACC15]'
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
                  <article
                    key={evt.id}
                    className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl overflow-hidden pop-shadow pop-card-interactive flex flex-col justify-between"
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
                        <div className="flex items-center gap-2 text-xs font-mono text-neutral-600 mb-2">
                          <span className="uppercase font-bold text-[#E11D48]">{evt.eventStatus}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{evt.date}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{evt.time}</span>
                        </div>
                        <h2 className="font-display font-extrabold text-xl text-[#0F0F0F] mb-2">
                          {evt.title}
                        </h2>
                        <p className="text-sm text-neutral-700 line-clamp-3 leading-relaxed">
                          {evt.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-3 border-t border-neutral-200 flex items-center justify-between gap-3">
                      <span className="text-xs font-mono text-neutral-600 truncate">
                        {evt.venue}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(evt)}
                        className="px-4 py-2 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-[#FF5722] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Open Event Details
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION C: ACHIEVEMENTS PAGE (Magazine / Editorial Layout) */}
        {activeTab === 'achievements' && (
          <section className="space-y-8">
            <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 sm:p-8 pop-shadow">
              <div className="text-xs font-mono font-bold text-[#E11D48] mb-2">
                AURORA E-CELL · EDITORIAL ISSUE
              </div>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0F0F0F]">
                Achievements &amp; Milestones
              </h1>
              <p className="text-sm text-neutral-700 mt-2 max-w-2xl">
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
                    className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl overflow-hidden pop-shadow-lg grid grid-cols-1 lg:grid-cols-12"
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
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#E11D48] mb-3">
                          <span>CHRONICLE NO. {String(index + 1).padStart(2, '0')}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{ach.date}</span>
                        </div>
                        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F0F0F] mb-4">
                          {ach.title}
                        </h2>
                        <p className="text-base text-neutral-800 leading-relaxed whitespace-pre-line">
                          {ach.description}
                        </p>
                        {ach.additionalDetails && (
                          <p className="mt-4 text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                            {ach.additionalDetails}
                          </p>
                        )}
                      </div>
                      <div className="mt-6 pt-4 border-t border-neutral-200 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedAchievement(ach)}
                          className="px-4 py-2 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-[#FF5722] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
            <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 sm:p-8 pop-shadow">
              <div className="text-xs font-mono font-bold text-[#1D4ED8] mb-2">
                AURORA E-CELL · VENTURE SHOWCASE
              </div>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0F0F0F]">
                Incubating Startups
              </h1>
              <p className="text-sm text-neutral-700 mt-2 max-w-2xl">
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
                  <article
                    key={st.id}
                    className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl overflow-hidden pop-shadow pop-card-interactive flex flex-col justify-between"
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
                          <div className="w-12 h-12 rounded-lg border-2 border-[#0F0F0F] overflow-hidden bg-[#FACC15] flex items-center justify-center shrink-0">
                            {st.logoUrl ? (
                              <img
                                src={st.logoUrl}
                                alt={`${st.name} logo`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Rocket className="w-6 h-6 text-[#0F0F0F]" />
                            )}
                          </div>
                          <div>
                            <h2 className="font-display font-extrabold text-xl text-[#0F0F0F]">
                              {st.name}
                            </h2>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-600">
                              <span>{st.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="uppercase font-bold text-[#1D4ED8]">
                                {st.currentStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-neutral-700 line-clamp-3 leading-relaxed">
                          {st.description}
                        </p>

                        {st.founderInfo && (
                          <p className="mt-3 text-xs font-mono text-neutral-600">
                            Founder(s): {st.founderInfo}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-3 border-t border-neutral-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedStartup(st)}
                        className="px-4 py-2 bg-[#FACC15] text-[#0F0F0F] font-display font-bold text-xs border-2 border-[#0F0F0F] rounded-lg hover:bg-[#FF5722] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Open Startup Profile
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION E: JOIN E-CELL PAGE */}
        {activeTab === 'join' && (
          <section className="max-w-4xl mx-auto">
            <div className="bg-halftone-yellow border-2 border-[#0F0F0F] rounded-xl p-8 sm:p-12 pop-shadow-lg space-y-8">
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold text-[#0F0F0F]">
                  OFFICIAL MEMBERSHIP APPLICATION · AURORA E-CELL
                </div>
                <h1
                  className="font-display font-extrabold text-[#0F0F0F] tracking-tight leading-[1.08]"
                  style={{ fontSize: 'clamp(2rem, 3.8vw, 3.25rem)' }}
                >
                  JOIN E-CELL
                </h1>
                <p className="text-base text-[#0F0F0F] leading-relaxed max-w-2xl">
                  Want to participate in Aurora E-Cell activities, events, and entrepreneurship
                  initiatives? Click the button below to launch your email client with the official
                  recipient, subject, and message pre-filled.
                </p>
              </div>

              {/* Pre-filled Email Preview Box */}
              <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 pop-shadow space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono border-b border-neutral-200 pb-3">
                  <span className="font-bold text-neutral-500">TO:</span>
                  <span className="font-bold text-[#0F0F0F]">edcellaurora@gmail.com</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-bold text-neutral-500">SUBJECT:</span>
                  <span className="font-bold text-[#1D4ED8]">
                    Interested in Joining Aurora E-Cell
                  </span>
                </div>

                <div className="text-sm text-neutral-800 font-sans whitespace-pre-line leading-relaxed">
                  {`Hi,\n\nI am interested in joining Aurora E-Cell. I would love to be a part of the Entrepreneurship Cell and participate in its activities, events and initiatives.\n\nPlease let me know the process to join.\n\nThank you!`}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={mailtoHref}
                  data-testid="join-ecell-mailto-btn"
                  className="px-7 py-4 bg-[#FF5722] text-[#0F0F0F] font-display font-extrabold text-base border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FFFDF7] transition-colors flex items-center gap-2.5 whitespace-nowrap shrink-0"
                >
                  <Mail className="w-5 h-5" />
                  <span>JOIN E-CELL (Open Email App)</span>
                </a>

                <a
                  href={gmailWebHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-4 bg-[#FFFDF7] text-[#0F0F0F] font-display font-bold text-sm border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-neutral-100 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Open in Gmail Web</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <p className="text-xs text-neutral-800 font-medium">
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
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl max-w-2xl w-full overflow-hidden pop-shadow-lg my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-[#FACC15] border-b-2 border-[#0F0F0F]">
              <span className="font-mono font-bold text-xs text-[#0F0F0F] uppercase">
                Event Details · {selectedEvent.eventStatus}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close event details"
                className="p-1 bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-md hover:bg-[#FF5722] cursor-pointer"
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
                className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F0F0F]"
              >
                {selectedEvent.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-700 bg-neutral-100 p-3.5 rounded-lg border border-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#FF5722]" />
                  <span>Date: {selectedEvent.date}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#1D4ED8]" />
                  <span>Time: {selectedEvent.time}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#E11D48]" />
                  <span>Venue: {selectedEvent.venue}</span>
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-bold text-sm text-neutral-600">Description</h3>
                <p className="text-sm sm:text-base text-[#0F0F0F] whitespace-pre-line leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              {selectedEvent.additionalInfo && (
                <div className="space-y-1 pt-3 border-t border-neutral-200">
                  <h3 className="font-display font-bold text-sm text-neutral-600">
                    Additional Information
                  </h3>
                  <p className="text-sm text-neutral-800 whitespace-pre-line leading-relaxed">
                    {selectedEvent.additionalInfo}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t-2 border-[#0F0F0F] flex flex-wrap items-center justify-between gap-3">
                {selectedEvent.registrationUrl ? (
                  <a
                    href={selectedEvent.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-[#FF5722] text-[#0F0F0F] font-display font-extrabold text-xs border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FACC15] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <span>Register for Event</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="text-xs font-mono text-neutral-500">
                    No external registration link required
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 bg-[#0F0F0F] text-[#FFFDF7] font-display font-bold text-xs rounded-lg cursor-pointer"
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
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl max-w-2xl w-full overflow-hidden pop-shadow-lg my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-[#E11D48] text-[#FFFDF7] border-b-2 border-[#0F0F0F]">
              <span className="font-mono font-bold text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                <span>Achievement Record · {selectedAchievement.date}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                aria-label="Close achievement details"
                className="p-1 bg-[#FFFDF7] text-[#0F0F0F] border-2 border-[#0F0F0F] rounded-md cursor-pointer"
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
                className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F0F0F]"
              >
                {selectedAchievement.title}
              </h2>
              <p className="text-sm sm:text-base text-[#0F0F0F] whitespace-pre-line leading-relaxed">
                {selectedAchievement.description}
              </p>
              {selectedAchievement.additionalDetails && (
                <div className="pt-3 border-t border-neutral-200">
                  <h3 className="font-display font-bold text-xs text-neutral-600 mb-1">
                    Additional Details
                  </h3>
                  <p className="text-sm text-neutral-800 whitespace-pre-line">
                    {selectedAchievement.additionalDetails}
                  </p>
                </div>
              )}
              <div className="pt-4 border-t-2 border-[#0F0F0F] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAchievement(null)}
                  className="px-4 py-2 bg-[#0F0F0F] text-[#FFFDF7] font-display font-bold text-xs rounded-lg cursor-pointer"
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
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl max-w-2xl w-full overflow-hidden pop-shadow-lg my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-[#1D4ED8] text-[#FFFDF7] border-b-2 border-[#0F0F0F]">
              <span className="font-mono font-bold text-xs uppercase">
                Startup Profile · {selectedStartup.currentStatus}
              </span>
              <button
                type="button"
                onClick={() => setSelectedStartup(null)}
                aria-label="Close startup profile"
                className="p-1 bg-[#FFFDF7] text-[#0F0F0F] border-2 border-[#0F0F0F] rounded-md cursor-pointer"
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
                <div className="w-14 h-14 rounded-xl border-2 border-[#0F0F0F] bg-[#FACC15] flex items-center justify-center overflow-hidden shrink-0">
                  {selectedStartup.logoUrl ? (
                    <img
                      src={selectedStartup.logoUrl}
                      alt={`${selectedStartup.name} logo`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Rocket className="w-7 h-7 text-[#0F0F0F]" />
                  )}
                </div>
                <div>
                  <h2
                    id="modal-startup-title"
                    className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F0F0F]"
                  >
                    {selectedStartup.name}
                  </h2>
                  <div className="text-xs font-mono text-neutral-600">
                    <span>Category: {selectedStartup.category}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="uppercase font-bold text-[#1D4ED8]">
                      Status: {selectedStartup.currentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#0F0F0F] whitespace-pre-line leading-relaxed">
                {selectedStartup.description}
              </p>

              {selectedStartup.founderInfo && (
                <div className="pt-3 border-t border-neutral-200">
                  <h3 className="font-display font-bold text-xs text-neutral-600 mb-1">
                    Founder Information
                  </h3>
                  <p className="text-sm text-neutral-800">{selectedStartup.founderInfo}</p>
                </div>
              )}

              {selectedStartup.additionalDetails && (
                <div className="pt-3 border-t border-neutral-200">
                  <h3 className="font-display font-bold text-xs text-neutral-600 mb-1">
                    Additional Details
                  </h3>
                  <p className="text-sm text-neutral-800 whitespace-pre-line">
                    {selectedStartup.additionalDetails}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t-2 border-[#0F0F0F] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStartup(null)}
                  className="px-4 py-2 bg-[#0F0F0F] text-[#FFFDF7] font-display font-bold text-xs rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t-2 border-[#0F0F0F] bg-[#FFFDF7] px-6 py-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-display font-extrabold text-lg text-[#0F0F0F]">
              AURORA E-CELL
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Aurora Degree &amp; PG College · Official Entrepreneurship Cell Portal
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-neutral-700">
            <button type="button" onClick={() => navigateTo('home')} className="hover:text-[#0F0F0F] cursor-pointer">
              Home
            </button>
            <button type="button" onClick={() => navigateTo('events')} className="hover:text-[#0F0F0F] cursor-pointer">
              Events
            </button>
            <button type="button" onClick={() => navigateTo('achievements')} className="hover:text-[#0F0F0F] cursor-pointer">
              Achievements
            </button>
            <button type="button" onClick={() => navigateTo('startups')} className="hover:text-[#0F0F0F] cursor-pointer">
              Startups
            </button>
            <a href={mailtoHref} className="hover:text-[#FF5722] font-bold">
              Contact: edcellaurora@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
