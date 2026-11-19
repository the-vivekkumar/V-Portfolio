// Single source of truth for everything the page says.
// All of it comes from the verified classic portfolio. Edit here, not in the components.
import certificateGroups from './data/certificates.json';

export const profile = {
  name: 'Vivek T K',
  // The main headline on the first screen, one line per row (shown in capitals).
  headline: ['AI & Machine', 'Learning', 'Developer'],
  tagline:
    'MCA student in Mysore building machine learning models and AI software with Python and the Gemini API. Published author on autonomous rocket landing.',
  location: 'Mysore, Karnataka, India',
  email: 'vivek28666@gmail.com',
  github: 'https://github.com/the-vivekkumar',
  // Shown only if GitHub cannot be reached; the page normally reads the live number. Checked against GitHub on this date.
  repoFallback: { count: 22, checked: '2026-11-19' },
  linkedin: 'https://www.linkedin.com/in/-vivek-/',
  resume: 'Vivek_T_K_Resume.pdf',
  cv: 'Vivek_T_K_CV.pdf',
  classic: 'classic/'
};

export const about = {
  lead:
    'I like problems where AI meets the real world: how a booster lands itself, how an assistant remembers a conversation, how soil data turns into a crop decision.',
  body:
    "I'm a Master of Computer Applications student at SBRR Mahajana First Grade College PG Wing in Mysore, aiming for a Data Scientist, AI/ML Engineer or Data Analyst role. I have completed two internships, in data science and in cyber security, built machine learning and full-stack projects, and earned Google Cloud badges in Gemini and BigQuery ML.",
  facts: [
    ['Based in', 'Mysore, Karnataka, India'],
    ['Studying', 'MCA, expected 2027'],
    ['Experience', 'Two internships, 2024 and 2025'],
    ['Focus', 'AI, machine learning, data science']
  ]
};

export const doing = [
  {
    id: 'model',
    title: 'AI and machine learning',
    text: 'Models and data analysis in Python: Random Forest classification, Ridge regression, text similarity and exploratory data analysis, plus assistants powered by Google Gemini.',
    chips: ['Python', 'scikit-learn', 'Pandas', 'NumPy', 'Gemini API', 'BigQuery ML']
  },
  {
    id: 'develop',
    title: 'AI-powered software',
    text: 'Full-stack apps that put models to work: React or Next.js front ends, Node.js, Express or Flask back ends, REST APIs, SQLite and PostgreSQL.',
    chips: ['React', 'Next.js', 'Node.js', 'Flask', 'Supabase', 'SQLite']
  },
  {
    id: 'research',
    title: 'Research',
    text: 'Guidance, navigation and control for autonomous vehicles. Author of a published survey on autonomous rocket landing.',
    chips: ['Kalman filter', 'PID control', 'Sensor fusion']
  }
];

// Oldest first, so the line reads like a path. "kind" only changes the small label.
export const journey = [
  {
    when: '2022',
    range: '2020 to 2022',
    kind: 'Education',
    title: 'Pre-University Course, Commerce',
    where: 'KNC Innovative PU College'
  },
  {
    when: '2024',
    range: 'June to August 2024',
    kind: 'Experience',
    title: 'Data Science Intern',
    where: 'Unified Mentor, remote',
    points: [
      'Analyzed datasets with Python (Pandas, NumPy) to find trends and insights.',
      'Built Tableau dashboards that turn raw data into clear visualizations.',
      'Cleaned and pre-processed data, including missing values and inconsistencies.',
      'Implemented automated data validation checks to improve accuracy.'
    ]
  },
  {
    when: '2025',
    range: 'January to March 2025',
    kind: 'Experience',
    title: 'Cyber Security Intern',
    where: 'Vaishnav Technologies',
    note: 'Three-month internship. The certificate is listed under Certifications.'
  },
  {
    when: '2025',
    range: 'Graduated 2025',
    kind: 'Education',
    title: 'Bachelor of Computer Applications',
    where: 'Seshadripuram Degree College, Mysore',
    note: 'Degree from the University of Mysore, passed with distinction in the May 2025 examination.'
  },
  {
    when: 'Now',
    range: 'Expected 2027',
    kind: 'Education',
    title: 'Master of Computer Applications',
    where: 'SBRR Mahajana First Grade College PG Wing, Mysore'
  }
];

// The four featured projects, in the order they appear. Every repo URL below is a real public repository.
// "kind" adds a small AI or ML badge on the card. "lang" is the main language GitHub reports.
export const projects = [
  {
    id: 'subscription-tracker',
    title: 'Subscription Tracker',
    short: 'Subscription Tracker',
    kind: null,
    lang: 'TypeScript',
    lead: 'A simple, professional app for keeping track of every subscription: what you pay each month and year, and when each one renews.',
    objective: 'Give one clear place to see recurring costs and never miss a renewal.',
    how: [
      ['Sign in', 'Email and password with email verification, or Google OAuth. Dashboard routes are protected.'],
      ['Subscriptions', 'Add, edit and delete entries with cost, billing cycle, renewal date, vendor, website, notes and category.'],
      ['Dashboard', 'Subscription count, monthly and yearly spend, and upcoming renewals, with search and filters by category and status.'],
      ['Renewals', 'A view of the next 7 days with the days remaining for each.'],
      ['Email reminders', 'Sent through Resend 30, 14, 7, 3 and 1 days before renewal, and on the day.']
    ],
    flow: 'You sign in, add your subscriptions and see spend and renewals on the dashboard. A scheduled route checks upcoming renewals and sends the reminder emails.',
    features: [
      'Email and Google sign-in with protected routes',
      'Per-user data in Supabase PostgreSQL with row-level security',
      'Monthly and yearly spend dashboard with search and filters',
      'Automatic renewal reminder emails',
      'Light and dark themes, responsive layout'
    ],
    tech: ['Next.js', 'React 19', 'TypeScript', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'Resend', 'Zod', 'React Hook Form'],
    tags: ['fullstack'],
    repo: 'https://github.com/the-vivekkumar/Subscription-Tracker'
  },
  {
    id: 'jarvis',
    title: 'JARVIS AI Voice Assistant',
    short: 'JARVIS',
    kind: 'AI',
    lang: 'JavaScript',
    lead: "A voice-based personal AI assistant inspired by Iron Man's JARVIS, built with React, Node.js and the Google Gemini API. You talk or type, it answers, and it remembers facts across sessions.",
    objective: 'A personal assistant you can speak to hands-free, that answers with a language model and keeps its memory between sessions.',
    how: [
      ['Interface', 'React 18, Vite, Zustand and Framer Motion in a HUD-style layout. Speech in and out through the Web Speech API.'],
      ['Express REST API', 'Routes, controllers and services across five modules: AI, memory, settings, voice and system.'],
      ['Google Gemini', 'gemini-2.5-flash writes each reply from recent history and stored facts.'],
      ['SQLite (sql.js)', 'Sessions, messages, memory and settings persist across restarts.']
    ],
    flow: 'The interface sends your text, or your transcribed speech, to the Express API. The API adds chat history and stored memory, asks Gemini for a reply, saves the exchange in SQLite and returns the answer to be shown and spoken.',
    features: [
      'Speech input and output in the browser',
      'Long-term memory that extracts and recalls facts about you',
      'Adjustable voice and AI behaviour settings',
      'Rate limiting, request validation, Helmet headers and a backend-only API key',
      'Runs in the browser or as an Electron desktop app'
    ],
    tech: ['React 18', 'Vite', 'Zustand', 'Framer Motion', 'Node.js', 'Express', 'Google Gemini API', 'SQLite (sql.js)', 'Web Speech API', 'Electron'],
    tags: ['ai', 'fullstack'],
    repo: 'https://github.com/the-vivekkumar/JARVIS-AI-Voice-Assistant'
  },
  {
    id: 'verify-net-video',
    title: 'Verify Net Video',
    short: 'Verify Net Video',
    kind: 'AI',
    lang: 'HTML',
    lead: 'A web-based AI video analysis tool that evaluates social media video URLs and gives an estimate of how authentic they look. Results are experimental and may not be fully accurate.',
    objective: 'Help people check a social media video before they trust or share it.',
    how: [
      ['Video URL', 'You paste a link to a social media video.'],
      ['AI analysis', 'The tool evaluates the video.'],
      ['Authenticity estimate', 'You get an estimate of how authentic the video appears.']
    ],
    features: [
      'Works from a social media video URL',
      'AI-based authenticity estimate',
      'Clear note that results are experimental and may not be fully accurate'
    ],
    tech: ['HTML', 'AI video analysis'],
    tags: ['ai'],
    repo: 'https://github.com/the-vivekkumar/Verify-Net-Video'
  },
  {
    id: 'crop',
    title: 'Crop Recommendation System',
    short: 'Crop Recommendation',
    kind: 'ML',
    lang: 'Python',
    lead: 'An ML-powered web app that gives real-time crop recommendations from soil and environmental data.',
    objective: 'Turn soil and climate readings into a crop recommendation a farmer can act on.',
    how: [
      ['Soil and climate data', 'Nitrogen, phosphorus, potassium, temperature and more, entered in the web app.'],
      ['Random Forest model', '100 trees, trained on labelled crop data with an 80/20 train-test split.'],
      ['Flask web app', 'Serves each prediction in real time.'],
      ['Crop recommendation', 'The crop best suited to the conditions.']
    ],
    flow: 'Exploratory data analysis and missing-value checks come first. The Random Forest classifier is then trained and evaluated with accuracy and a classification report, and Flask serves its predictions.',
    features: [
      'Exploratory data analysis and missing-value checks before modelling',
      'Random Forest classifier evaluated with accuracy and a classification report',
      'Real-time predictions in a Flask web app'
    ],
    tech: ['Python', 'scikit-learn', 'Flask', 'Random Forest', 'Pandas', 'NumPy'],
    tags: ['ml'],
    repo: 'https://github.com/the-vivekkumar/Crop-Recommendation-System'
  }
];

export const paper = {
  title:
    'Autonomous Rocket Landing: A Comprehensive Survey of Guidance, Navigation, Control Algorithms, and Sensor Fusion Techniques in SpaceX Falcon-9',
  authors: 'Vivek T K and Dr. Anisha Kumar',
  journal: 'International Journal of Creative and Open Research in Engineering and Management (IJCOPE)',
  issue: 'Volume 2, issue 9, September 2026, pages 1 to 9',
  doi: '10.55041/ijcope.v2i9.196',
  doiUrl: 'https://doi.org/10.55041/ijcope.v2i9.196',
  certificate: 'Certificate of Publication IJCOPE/26/09/196',
  covers: [
    'The guidance, navigation and control framework: trajectory planning, state estimation and actuation.',
    'Sensor fusion across radar altimeters, GPS receivers, inertial measurement units and star trackers, using an Extended Kalman Filter.',
    'The PID control law behind the powered landing burn, with annotated pseudocode.'
  ],
  also: 'A four-phase landing model, a comparison with related work, and open challenges such as real-time computation, changing vehicle mass and landing on moving drone ships. Reinforcement-learning-based guidance is covered as future work.',
  keywords: [
    'Autonomous landing',
    'SpaceX Falcon 9',
    'Guidance, navigation and control',
    'PID control',
    'Sensor fusion',
    'Reusable launch vehicles',
    'Powered descent guidance',
    'Kalman filter'
  ],
  citation:
    'T.K, V. (2026). Autonomous Rocket Landing: A Comprehensive Survey of Guidance, Navigation, Control Algorithms and Sensor Fusion Techniques in SpaceX Falcon 9. International Journal of Creative and Open Research in Engineering and Management, 02(9), 1-9. https://doi.org/10.55041/ijcope.v2i9.196'
};

export const phases = [
  { alt: 'Above 70 km', name: 'Boostback burn', text: 'Reverses toward the landing zone.', sys: 'Sensors: GPS, inertial unit. Actuators: engine gimbal, cold-gas thrusters.' },
  { alt: '70 to 30 km', name: 'Entry burn', text: 'Slows the booster in the upper atmosphere.', sys: 'Sensors: GPS, inertial unit. Actuators: grid fins, engine gimbal.' },
  { alt: '30 to 3 km', name: 'Aerodynamic descent', text: 'Unpowered glide steered by grid fins.', sys: 'Sensors: GPS, inertial unit, radar altimeter. Actuators: grid fins.' },
  { alt: '3 km to touchdown', name: 'Landing burn', text: 'PID-controlled powered deceleration.', sys: 'Sensors: radar altimeter, inertial unit. Actuators: engine gimbal, cold-gas thrusters.' }
];

// Every label below appears in the CV's skills list. AI and ML tools come first.
export const techStack = [
  'Python', 'scikit-learn', 'Pandas', 'NumPy', 'Gemini API', 'BigQuery', 'Tableau', 'SQL', 'JavaScript',
  'TypeScript', 'React', 'Next.js', 'Node.js', 'Flask', 'Supabase', 'Git', 'GitHub', 'Linux'
];

export const certificates = certificateGroups;
export const certificateCount = certificateGroups.reduce((n, g) => n + g.items.length, 0);

export const achievements = [
  {
    title: 'Participated in AI-Thon',
    text: 'A two-day training and competition event on AI tools, held on 7 and 8 February 2025 at Seshadripuram Degree College, Mysore, in association with Digital Maven. I received a certificate of participation.'
  },
  { title: 'Volunteered at the IT Fest', text: 'Helped organize and run technical events.' },
  { title: 'Regular blood donor with the Red Cross', text: 'Takes part in recurring blood donation drives.' }
];

export const navLinks = [
  ['about', 'About'],
  ['work', 'Work'],
  ['research', 'Research'],
  ['certifications', 'Certifications'],
  ['contact', 'Contact']
];
