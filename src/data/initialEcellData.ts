import type {
  EventRecord,
  AchievementRecord,
  StartupRecord,
  NecMemberRecord,
  LeadershipRecord,
  SponsorRecord,
  UserProfileRecord,
} from '../utils/ecellLogic';

export const INITIAL_EVENTS: EventRecord[] = [
  {
    id: 'evt_rise_2026',
    title: 'RISE 2026',
    description:
      "RISE is a national-level entrepreneurship hackathon organized by Aurora's Degree & PG College in coordination with its Entrepreneurship Development Cell (ED Cell). Designed to foster innovation, active problem-solving, and a vibrant startup culture, the initiative brought together multidisciplinary student innovators and aspiring founders from universities nationwide. Held on 26–27 February 2026, the event immersed participants in rigorous case study analysis, startup mentor interactions, rapid venture development, and live investor-style pitching before an expert jury. Beyond competition, RISE emphasized tangible, long-term venture outcomes. The concluding phase featured merit awards, cash prizes, and dedicated briefings connecting high-potential teams to institutional incubation centers, prototyping grants, and startup accelerator pipelines. Praised by participants and industry evaluators alike for its practical rigor and commercial viability, RISE successfully empowered students to transform sustainable, scalable ideas into market-ready venture models.",
    posterUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    date: '2026-02-26',
    time: '10AM - 5PM',
    venue: 'Osmania Technology Business Incubator',
    eventStatus: 'completed',
    additionalInfo: 'National Level Hackathon & Startup Ideation Conclave',
    registrationUrl: 'https://forms.gle/aurora-ecell-rise2026',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'evt_orientation_drive',
    title: 'Ed Cell Orientation Drive',
    description:
      'The Entrepreneurship Development Cell Orientation Drive was conducted by Aurora’s Degree & PG College to introduce newly admitted first-year students to the Cell’s vision, mission, objectives, and opportunities. Spread across four days, the drive covered first-year classrooms across academic streams and departments. ED Cell student coordinators visited classrooms, presented promotional material, and explained the benefits of membership, including access to workshops, hackathons, startup mentoring, industrial visits, and incubation support. Interactive discussions and question-and-answer sessions helped students understand how entrepreneurship, innovation, and leadership can complement their academic journeys. Interested students were invited to register through an online Google Form, with responses automatically recorded for official membership documentation. The initiative generated 75 new student registrations and expanded the ED Cell community across disciplines. It also highlighted Aurora’s achievement of securing 21st place in the National Entrepreneurship Challenge 2025, organized by E-Cell, IIT Bombay.',
    posterUrl:
      'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80',
    date: '2026-07-09',
    time: '9AM - 12:30PM',
    venue: "Aurora's Degree and Pg College",
    eventStatus: 'completed',
    additionalInfo: '4-Day Comprehensive First-Year Orientation & Membership Drive',
    registrationUrl: 'https://forms.gle/aurora-orientation-drive',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'evt_social_good',
    title: 'Innovations for Social Good and Better Bharat',
    description:
      'Aurora’s Degree & PG College participated as an Academic Partner in the state launch of “Innovations for Social Good and Better Bharat,” held at T-Works, Hyderabad. The initiative brought together academia, industry, and development organizations to encourage technology-driven innovation, entrepreneurship, skill development, and scalable solutions to societal challenges. The programme featured inaugural addresses, stakeholder interactions, an institutional Memorandum of Understanding (MoU) signing ceremony, and a walkthrough of T-Works’ advanced prototyping and fabrication facilities. Through this initiative, Aurora established a collaborative association with T-Works and supporting organizations, including Capgemini, BharatCares, and SRF Foundation. The collaboration aims to create opportunities for student innovation projects, corporate-backed research exposure, technical skill development, and industry–academia engagement. The event marked a significant institutional milestone, strengthening Aurora’s entrepreneurial ecosystem and opening new pathways for students to explore social entrepreneurship and develop practical solutions with meaningful societal impact.',
    posterUrl:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    date: '2026-08-05',
    time: '11 AM',
    venue: 'T - WORKS',
    eventStatus: 'completed',
    additionalInfo: 'State-Level Technology & Social Innovation Launch Event',
    registrationUrl: 'https://forms.gle/aurora-tworks-social-good',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'evt_illuminate_2026',
    title: 'ILLUMINATE 2026 — Pre-Eureka Workshop',
    description:
      'Flagship pre-Eureka entrepreneurship and business model design workshop co-hosted in strategic association with E-Cell, IIT Bombay. Equipping early-stage student founders with rapid prototyping tools, pitch deck frameworks, and direct access to national-level jury evaluations.',
    posterUrl:
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
    date: '2026-09-15',
    time: '10:00 AM - 4:00 PM',
    venue: 'Main Auditorium, Aurora Campus',
    eventStatus: 'upcoming',
    additionalInfo: 'In association with E-Cell, IIT Bombay',
    registrationUrl: 'https://forms.gle/aurora-illuminate-2026',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'evt_campus_venture_pitch',
    title: 'Campus Venture Pitch 2026',
    description:
      'Annual flagship live pitch battle where campus startups pitch directly to regional venture capitalists, angel syndicates, and incubator heads for seed capital grants and equity-free acceleration support.',
    posterUrl:
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
    date: '2026-10-10',
    time: '2:00 PM - 6:30 PM',
    venue: 'Seminar Hall 1, Aurora College',
    eventStatus: 'upcoming',
    additionalInfo: 'Seed capital grants & angel investor jury panels',
    registrationUrl: 'https://forms.gle/aurora-pitch-2026',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'evt_idea_validation_bootcamp',
    title: 'Idea Validation Bootcamp',
    description:
      'Hands-on 36-hour sprint for students with early concepts. Master customer discovery, problem-solution fit testing, landing page validation, and no-code MVP development.',
    posterUrl:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    date: '2026-11-20',
    time: '11:00 AM - 5:00 PM',
    venue: 'E-Cell Innovation Lab',
    eventStatus: 'upcoming',
    additionalInfo: 'Targeted sprint for first-time student founders',
    registrationUrl: 'https://forms.gle/aurora-bootcamp-2026',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'evt_angel_funding_masterclass',
    title: 'Angel & Seed Funding Masterclass',
    description:
      'An in-depth session breaking down cap tables, SAFE notes, seed valuations, and founder equity dilution, led by seasoned regional angel investors and startup legal counsels.',
    posterUrl:
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    date: '2026-12-05',
    time: '3:00 PM - 5:30 PM',
    venue: 'Virtual / Google Meet & Seminar Hall',
    eventStatus: 'upcoming',
    additionalInfo: 'Term sheet breakdowns & legal structuring guidelines',
    registrationUrl: 'https://forms.gle/aurora-masterclass-funding',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'evt_national_startup_day',
    title: 'National Startup Day Conclave',
    description:
      'Celebrating institutional entrepreneurship on National Startup Day with keynotes from successful alumni founders, startup demo zones, and presentation of annual E-Cell awards.',
    posterUrl:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    date: '2027-01-16',
    time: '10:00 AM - 4:00 PM',
    venue: 'Aurora College Main Grounds',
    eventStatus: 'upcoming',
    additionalInfo: 'Alumni founders exhibition & demo tables',
    registrationUrl: 'https://forms.gle/aurora-startup-day',
    published: true,
    authorId: 'admin_root',
  },
];

export const INITIAL_ACHIEVEMENTS: AchievementRecord[] = [
  {
    id: 'ach_nec_iit_bombay',
    title: 'National Entrepreneurship Challenge (NEC) — IIT Bombay',
    description:
      "Represented Aurora's Degree & PG College as Team NextGenpreneurs in the National Entrepreneurship Challenge (NEC), hosted by E-Cell, IIT Bombay. Successfully completed all key operational deliverables, annual governance reports, and ecosystem tracking milestones, demonstrating institutional commitment to entrepreneurship and innovation.",
    imageUrl:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    date: '2025-2026',
    additionalDetails:
      'Secured 21st Place Nationally across 700+ competing engineering and degree institutions nationwide.',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'ach_otbi_collaboration',
    title: 'Institutional Incubation Collaboration with Osmania TBI (OTBI)',
    description:
      'Established an ongoing institutional collaboration with Osmania Technology Business Incubator (OTBI) to co-host flagship entrepreneurship initiatives, including RISE and ILLUMINATE 2026, in partnership with E-Cell, IIT Bombay. This collaboration provided campus founders with direct access to regional incubation networks, grant opportunities, and angel investor pitching sessions.',
    imageUrl:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
    date: '2026',
    additionalDetails:
      'Direct incubation fast-track, prototyping grants, and mentor pipelines for Aurora student startups.',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'ach_tworks_fellowship',
    title: 'T-Works Prototyping & Maker Fellowship Partnership',
    description:
      "Official institutional partnership with T-Works Hyderabad, India's largest prototyping center, alongside Capgemini and Bharat Cares. Enabling student innovators to utilize advanced fabrication, 3D printing, laser cutting, and PCB prototyping labs for physical hardware and IoT ventures.",
    imageUrl:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    date: '2026',
    additionalDetails: 'Hardware and IoT prototyping access with corporate CSR backing.',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'ach_best_emerging_ecell',
    title: 'State Level Best Emerging E-Cell Citation',
    description:
      'Conferred recognition for high-impact campus entrepreneurship engagement, achieving over 1,500 student workshop participants, 75+ active registered student founders, and 3 incubating venture prototypes within one academic year.',
    imageUrl:
      'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=1200&q=80',
    date: '2025',
    additionalDetails:
      'Recognized across regional higher education institutions for rapid entrepreneurship ecosystem growth.',
    published: true,
    authorId: 'admin_root',
  },
];

export const INITIAL_STARTUPS: StartupRecord[] = [
  {
    id: 'st_goperform',
    name: 'GoPerform',
    logoUrl:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    description:
      'GoPerform is an upcoming sports nutrition startup based in Hyderabad, India, that redefines fitness supplements by replacing traditional powders and capsules with convenient, science-backed performance formats such as gummies, oral dissolving tablets, and strips to solve consumer dropouts caused by poor taste and inconvenience.',
    category: 'Pharmaceuticals',
    founderInfo: 'JAMPA PAAVAN - BSC MSCS 3',
    imageUrl:
      'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=1000&q=80',
    currentStatus: 'incubating',
    additionalDetails:
      'Currently in laboratory formulation testing and trademark filing for convenient nutraceutical strips and gummies.',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'st_naina_os',
    name: 'Naina OS',
    logoUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    description:
      'NAINA OS is a next-generation Personal AI Operating System designed to redefine human–computer interaction through intelligent, local-first AI. Powered by Rust, CUDA, local LLMs, and autonomous agent technologies, it integrates natural language intelligence, contextual memory, real-time voice computing, and intelligent automation into a unified environment. Featuring NAINA as its intelligence layer and C² as its controlled execution layer, the platform aims to deliver a private, modular, and personalized AI experience that understands user intent and executes authorized tasks. Currently in the functional prototype stage, NAINA OS is being actively developed to shape the future of personal computing.',
    category: 'AI Operating System',
    founderInfo: 'P.Jonathon - BCA 2B',
    imageUrl:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
    currentStatus: 'incubating',
    additionalDetails:
      'Functional prototype in active development using Rust and CUDA for on-device edge AI execution.',
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'st_smartpyq',
    name: 'SmartPYQ',
    logoUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
    description:
      'SmartPYQ is an AI-powered academic platform designed to revolutionize exam preparation by enabling students to access, analyze, and learn from previous-year question papers. Leveraging artificial intelligence, it identifies frequently repeated questions, important topics, and examination patterns to provide personalized insights and smarter study strategies. With features such as secure PDF access, subject-wise organization, AI-powered paper analysis, and interactive practice mode, SmartPYQ helps students optimize their preparation, save time, and improve academic performance through data-driven learning.',
    category: 'EdTech',
    founderInfo: 'Sumer Agarwal - BSC MSCS 3',
    imageUrl:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=80',
    currentStatus: 'incubating',
    additionalDetails:
      "Serving university curriculum datasets with automated frequency mapping of previous years' questions.",
    published: true,
    authorId: 'admin_root',
  },
];

export const INITIAL_LEADERSHIP: LeadershipRecord[] = [
  {
    id: 'lead_principal',
    name: 'Dr. M.C.Ajay Kumar',
    role: 'Principal & Dept of Physics',
    qualification: 'Ph.D. in Physics',
    photoUrl: '',
    category: 'Head',
    displayOrder: 1,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'lead_convenor',
    name: 'Dr. Rajini Gadlay',
    role: 'Convenor, E-Cell & Associate Professor',
    qualification: 'Ph.D. in Informatics',
    photoUrl: '',
    category: 'Convenor',
    displayOrder: 2,
    published: true,
    authorId: 'admin_root',
  },
];

export const INITIAL_NEC_MEMBERS: NecMemberRecord[] = [
  {
    id: 'nec_01',
    name: 'JAMPA PAAVAN',
    role: 'President',
    photoUrl: '',
    displayOrder: 1,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_02',
    name: 'SYED AMER AHMED',
    role: 'Vice President',
    photoUrl: '',
    displayOrder: 2,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_03',
    name: 'G. Nitesh',
    role: 'Secretary',
    photoUrl: '',
    displayOrder: 3,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_04',
    name: 'Laksh Yadav',
    role: 'Treasurer',
    photoUrl: '',
    displayOrder: 4,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_05',
    name: 'P Jonathon',
    role: 'Design & Media',
    photoUrl: '',
    displayOrder: 5,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_06',
    name: 'Sakshi Kapoor',
    role: 'Design & Media',
    photoUrl: '',
    displayOrder: 6,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_07',
    name: 'Ona Helen Zacharias',
    role: 'Design & Media',
    photoUrl: '',
    displayOrder: 7,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_08',
    name: 'Kashish',
    role: 'Event & Operations',
    photoUrl: '',
    displayOrder: 8,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_09',
    name: 'Sindhu',
    role: 'Event & Operations',
    photoUrl: '',
    displayOrder: 9,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_10',
    name: 'Arvind',
    role: 'Research & Innovation',
    photoUrl: '',
    displayOrder: 10,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_11',
    name: 'Nandhini',
    role: 'Research & Innovation',
    photoUrl: '',
    displayOrder: 11,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_12',
    name: 'Yashwant',
    role: 'Research & Innovation',
    photoUrl: '',
    displayOrder: 12,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'nec_13',
    name: 'Prabhuteja',
    role: 'Research & Innovation',
    photoUrl: '',
    displayOrder: 13,
    published: true,
    authorId: 'admin_root',
  },
];

export const INITIAL_SPONSORS: SponsorRecord[] = [
  {
    id: 'sp_otbi',
    name: 'Osmania Technology Business Incubator',
    logoUrl: '',
    category: 'Sponsor',
    displayOrder: 1,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'sp_capgemini',
    name: 'Capegemini',
    logoUrl: '',
    category: 'Supporting Partner',
    displayOrder: 2,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'sp_bharatcares',
    name: 'Bharat Cares',
    logoUrl: '',
    category: 'Supporting Partner',
    displayOrder: 3,
    published: true,
    authorId: 'admin_root',
  },
  {
    id: 'sp_iit_dhanbad',
    name: 'IIT (ISM) DHANBAD',
    logoUrl: '',
    category: 'Supporting Partner',
    displayOrder: 4,
    published: true,
    authorId: 'admin_root',
  },
];

export const INITIAL_USERS: UserProfileRecord[] = [
  {
    uid: 'user_jampa_paavan',
    fullName: 'JAMPA PAAVAN',
    email: 'paavanjampa@gmail.com',
    role: 'admin',
    accountStatus: 'active',
    registrationDate: '2026-11-04',
    registrationTime: '09:00:00 AM',
  },
  {
    uid: 'user_admin_ecell',
    fullName: 'Aurora E-Cell Admin',
    email: 'adminecell@gmail.com',
    role: 'admin',
    accountStatus: 'active',
    registrationDate: '2026-11-04',
    registrationTime: '09:05:00 AM',
  },
  {
    uid: 'user_syed_amer',
    fullName: 'Syed Amer Ahmed',
    email: 'syedamer3805@gmail.com',
    role: 'student',
    accountStatus: 'active',
    registrationDate: '2026-11-04',
    registrationTime: '09:15:00 AM',
  },
  {
    uid: 'user_prem',
    fullName: 'Prem',
    email: 'prem2025@gmail.com',
    role: 'student',
    accountStatus: 'active',
    registrationDate: '2026-11-04',
    registrationTime: '09:30:00 AM',
  },
  {
    uid: 'user_laksh_yadav',
    fullName: 'Laksh Yadav',
    email: 'lakshyadav@aurora.edu.in',
    role: 'student',
    accountStatus: 'active',
    registrationDate: '2026-11-04',
    registrationTime: '09:45:00 AM',
  },
  {
    uid: 'user_jonathan',
    fullName: 'jonathan',
    email: 'palivelajonathan@gmail.com',
    role: 'student',
    accountStatus: 'active',
    registrationDate: '2026-11-04',
    registrationTime: '10:00:00 AM',
  },
  {
    uid: 'user_rohan_verma',
    fullName: 'Rohan Verma',
    email: 'rohan_1793780226726@aurora.edu.in',
    role: 'student',
    accountStatus: 'active',
    registrationDate: '2026-11-04',
    registrationTime: '10:15:00 AM',
  },
];
