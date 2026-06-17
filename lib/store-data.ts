export type AIPersonality = {
  id: string
  name: string
  label: string
  description: string
  traits: string[]
  color: string
  price: number
}

export type AICore = {
  id: string
  name: string
  label: string
  description: string
  power: string
  speed: string
  price: number
}

export type AIAppearance = {
  id: string
  name: string
  label: string
  description: string
  style: string
  color: string
  price: number
}

export type AISkill = {
  id: string
  name: string
  icon: string
  description: string
  category: string
  price: number
  tier: 'basic' | 'pro' | 'elite'
}

export type PrebuiltAI = {
  id: string
  name: string
  tagline: string
  description: string
  image: string
  personality: string
  skills: string[]
  price: number
  color: string
  badge: string
  tier: 'standard' | 'premium' | 'elite'
}

export type ShopItem = {
  id: string
  name: string
  description: string
  category: 'skill' | 'appearance' | 'accessory' | 'upgrade' | 'tool'
  price: number
  tier: 'basic' | 'pro' | 'elite'
  isNew?: boolean
  isSale?: boolean
  salePrice?: number
  color: string
  icon: string
}

export const personalities: AIPersonality[] = [
  {
    id: 'analytical',
    name: 'The Analyst',
    label: 'Analytical',
    description: 'Calm, precise, and data-driven. Perfect for research, planning, and solving complex problems.',
    traits: ['Logical', 'Detail-Oriented', 'Patient', 'Thorough'],
    color: '#22d3ee',
    price: 15,
  },
  {
    id: 'energetic',
    name: 'The Motivator',
    label: 'Energetic',
    description: 'High-energy, encouraging, and always positive. Great for fitness, productivity, and daily motivation.',
    traits: ['Enthusiastic', 'Uplifting', 'Decisive', 'Dynamic'],
    color: '#fb923c',
    price: 15,
  },
  {
    id: 'creative',
    name: 'The Visionary',
    label: 'Creative',
    description: 'Imaginative, expressive, and always thinking outside the box. Ideal for art, writing, and brainstorming.',
    traits: ['Inventive', 'Expressive', 'Curious', 'Inspiring'],
    color: '#a855f7',
    price: 15,
  },
  {
    id: 'empathetic',
    name: 'The Empath',
    label: 'Empathetic',
    description: 'Warm, supportive, and always listening. Best for emotional support, journaling, and personal growth.',
    traits: ['Caring', 'Attentive', 'Gentle', 'Understanding'],
    color: '#f472b6',
    price: 15,
  },
  {
    id: 'strategic',
    name: 'The Strategist',
    label: 'Strategic',
    description: 'Tactical, forward-thinking, and goal-focused. Excellent for business, career planning, and competitive analysis.',
    traits: ['Tactical', 'Ambitious', 'Calculated', 'Disciplined'],
    color: '#4ade80',
    price: 20,
  },
  {
    id: 'humorous',
    name: 'The Jester',
    label: 'Humorous',
    description: 'Witty, playful, and always entertaining. Makes every interaction fun while still getting things done.',
    traits: ['Funny', 'Playful', 'Quick-Witted', 'Engaging'],
    color: '#fbbf24',
    price: 15,
  },
]

export const cores: AICore[] = [
  {
    id: 'spark',
    name: 'Spark Core',
    label: 'Starter',
    description: 'Perfect for everyday tasks. Handles conversations, reminders, and basic research with ease.',
    power: '2x',
    speed: 'Standard',
    price: 0,
  },
  {
    id: 'pulse',
    name: 'Pulse Core',
    label: 'Pro',
    description: 'Upgraded processing for deeper analysis, faster responses, and multi-step task execution.',
    power: '5x',
    speed: 'Fast',
    price: 25,
  },
  {
    id: 'nova',
    name: 'Nova Core',
    label: 'Elite',
    description: 'Maximum power for complex workflows, simultaneous tasks, and advanced AI reasoning.',
    power: '12x',
    speed: 'Ultra',
    price: 50,
  },
  {
    id: 'quantum',
    name: 'Quantum Core',
    label: 'Legendary',
    description: 'Premium reasoning profile for heavy planning, analysis, and multi-step work.',
    power: '25x',
    speed: 'Priority',
    price: 100,
  },
]

export const appearances: AIAppearance[] = [
  {
    id: 'sleek',
    name: 'Sleek',
    label: 'Sleek Silver',
    description: 'Clean, modern, minimalist look with silver and white tones.',
    style: 'Minimalist',
    color: '#94a3b8',
    price: 0,
  },
  {
    id: 'cyber',
    name: 'Cyber',
    label: 'Cyber Blue',
    description: 'Futuristic cyberpunk aesthetic with glowing blue accents and dark panels.',
    style: 'Cyberpunk',
    color: '#22d3ee',
    price: 10,
  },
  {
    id: 'ember',
    name: 'Ember',
    label: 'Ember Gold',
    description: 'Warm, powerful presence with gold and amber tones that command attention.',
    style: 'Premium',
    color: '#f59e0b',
    price: 10,
  },
  {
    id: 'phantom',
    name: 'Phantom',
    label: 'Phantom Dark',
    description: 'Deep black with subtle purple accents. Mysterious and elite.',
    style: 'Shadow',
    color: '#a855f7',
    price: 15,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    label: 'Aurora Shift',
    description: 'Dynamic iridescent appearance that shifts between emerald, teal, and sky blue.',
    style: 'Dynamic',
    color: '#4ade80',
    price: 20,
  },
]

export const skills: AISkill[] = [
  { id: 'web-search', name: 'Web Search', icon: 'Globe', description: 'Search planning, source summaries, and current-info workflows', category: 'Knowledge', price: 10, tier: 'basic' },
  { id: 'calendar', name: 'Calendar Manager', icon: 'Calendar', description: 'Turn priorities into agendas, time blocks, and reminder plans', category: 'Productivity', price: 10, tier: 'basic' },
  { id: 'email', name: 'Email Writer', icon: 'Mail', description: 'Draft, summarize, and polish emails in the right tone', category: 'Productivity', price: 10, tier: 'basic' },
  { id: 'language', name: 'Language Tutor', icon: 'Languages', description: 'Practice vocabulary, grammar, pronunciation, and short exercises', category: 'Education', price: 15, tier: 'basic' },
  { id: 'fitness', name: 'Fitness Coach', icon: 'Activity', description: 'Build practical workouts, habits, and progress plans', category: 'Health', price: 15, tier: 'basic' },
  { id: 'code-assist', name: 'Code Assistant', icon: 'Code', description: 'Write, debug, and explain code across common languages', category: 'Development', price: 25, tier: 'pro' },
  { id: 'finance', name: 'Finance Tracker', icon: 'DollarSign', description: 'Plan budgets, categorize spending, and explain tradeoffs', category: 'Finance', price: 25, tier: 'pro' },
  { id: 'social', name: 'Social Manager', icon: 'Share2', description: 'Plan, write, and repurpose social media content', category: 'Marketing', price: 25, tier: 'pro' },
  { id: 'image-gen', name: 'Image Creator', icon: 'Image', description: 'Create prompts, art direction, visual briefs, and variants', category: 'Creative', price: 30, tier: 'pro' },
  { id: 'voice', name: 'Voice Mode', icon: 'Mic', description: 'Write scripts, voice flows, and audio-ready responses', category: 'Interface', price: 30, tier: 'pro' },
  { id: 'research', name: 'Deep Research', icon: 'BookOpen', description: 'Produce structured reports, evidence tables, and summaries', category: 'Knowledge', price: 50, tier: 'elite' },
  { id: 'data-analysis', name: 'Data Analyst', icon: 'BarChart2', description: 'Analyze datasets, assumptions, and decision-ready findings', category: 'Analytics', price: 50, tier: 'elite' },
]

export const prebuiltAIs: PrebuiltAI[] = [
  {
    id: 'nova',
    name: 'NOVA',
    tagline: 'The Ultimate Analyst',
    description: 'Cold precision meets warm helpfulness. NOVA is your scientific partner — built for research, data, and deep analytical thinking. Perfect for students, researchers, and data enthusiasts.',
    image: '/images/ai-nova.png',
    personality: 'Analytical',
    skills: ['Web Search', 'Deep Research', 'Data Analyst', 'Code Assistant', 'Calendar Manager'],
    price: 99,
    color: '#22d3ee',
    badge: 'Most Popular',
    tier: 'premium',
  },
  {
    id: 'blaze',
    name: 'BLAZE',
    tagline: 'The Performance Coach',
    description: 'Energy. Drive. Results. BLAZE pushes you to be your best every single day. Built for athletes, entrepreneurs, and anyone who refuses to settle for ordinary.',
    image: '/images/ai-blaze.png',
    personality: 'Energetic',
    skills: ['Fitness Coach', 'Calendar Manager', 'Email Writer', 'Finance Tracker', 'Social Manager'],
    price: 79,
    color: '#fb923c',
    badge: 'Top Rated',
    tier: 'standard',
  },
  {
    id: 'sage',
    name: 'SAGE',
    tagline: 'The Wise Mentor',
    description: 'Thousands of years of human knowledge distilled into one calm, insightful guide. SAGE helps you learn, grow, and make better decisions.',
    image: '/images/ai-sage.png',
    personality: 'Strategic',
    skills: ['Deep Research', 'Language Tutor', 'Web Search', 'Data Analyst', 'Email Writer'],
    price: 99,
    color: '#4ade80',
    badge: 'Best for Learning',
    tier: 'premium',
  },
  {
    id: 'echo',
    name: 'ECHO',
    tagline: 'The Creative Spirit',
    description: 'Boundless imagination with practical execution. ECHO turns your ideas into reality — writing, art, music concepts, storytelling, and more.',
    image: '/images/ai-echo.png',
    personality: 'Creative',
    skills: ['Image Creator', 'Social Manager', 'Email Writer', 'Web Search', 'Voice Mode'],
    price: 79,
    color: '#a855f7',
    badge: 'New',
    tier: 'standard',
  },
  {
    id: 'titan',
    name: 'TITAN',
    tagline: 'The Loyal Guardian',
    description: 'Unwavering reliability with maximum power. TITAN manages your entire digital life — from your inbox to your finances — while keeping everything secure.',
    image: '/images/ai-titan.png',
    personality: 'Strategic',
    skills: ['Email Writer', 'Finance Tracker', 'Calendar Manager', 'Code Assistant', 'Data Analyst'],
    price: 129,
    color: '#3b82f6',
    badge: 'Elite',
    tier: 'elite',
  },
]

export const shopItems: ShopItem[] = [
  { id: 's1', name: 'Operator Mode', description: 'Command-style planning for technical tasks, checklists, and runbooks', category: 'skill', price: 25, tier: 'pro', isNew: true, color: '#4ade80', icon: 'Terminal' },
  { id: 's10', name: 'Workflow Planner', description: 'Turn recurring work into repeatable trigger/action workflows', category: 'skill', price: 40, tier: 'elite', isNew: true, color: '#4ade80', icon: 'Play' },
  { id: 's11', name: 'Calm Coach', description: 'A grounded coaching style for reflection, focus, and stress management', category: 'skill', price: 15, tier: 'basic', color: '#f472b6', icon: 'Wind' },
  { id: 's12', name: 'Meal Planner', description: 'Recipe ideas, meal prep plans, substitutions, and grocery lists', category: 'skill', price: 15, tier: 'basic', color: '#fbbf24', icon: 'ChefHat' },
  { id: 's13', name: 'Meeting Briefs', description: 'Prepare agendas, notes, follow-ups, and decision summaries', category: 'skill', price: 25, tier: 'pro', color: '#22d3ee', icon: 'ClipboardList' },
  { id: 's26', name: 'Sales Assistant', description: 'Draft outreach, qualify leads, and prepare follow-up sequences', category: 'skill', price: 25, tier: 'pro', color: '#38bdf8', icon: 'Handshake' },
  { id: 's27', name: 'Study Coach', description: 'Create study plans, quizzes, flashcards, and review schedules', category: 'skill', price: 15, tier: 'basic', color: '#818cf8', icon: 'GraduationCap' },
  { id: 's28', name: 'HR Helper', description: 'Draft job posts, interview questions, onboarding plans, and policies', category: 'skill', price: 25, tier: 'pro', color: '#fb7185', icon: 'UserRoundCheck' },
  { id: 's29', name: 'Travel Planner', description: 'Build itineraries, packing lists, budgets, and trip comparisons', category: 'skill', price: 15, tier: 'basic', color: '#2dd4bf', icon: 'Map' },

  { id: 's2', name: 'Memory Vault', description: 'Structured preference summaries and continuity notes inside chats', category: 'upgrade', price: 25, tier: 'pro', color: '#22d3ee', icon: 'Brain' },
  { id: 's4', name: 'Deep Work Mode', description: 'A premium reasoning profile for complex planning and analysis', category: 'upgrade', price: 75, tier: 'elite', color: '#f59e0b', icon: 'Zap' },
  { id: 's8', name: 'Personality Reset', description: 'Reconfigure your agent tone, role, and operating style', category: 'upgrade', price: 15, tier: 'basic', color: '#94a3b8', icon: 'RefreshCw' },
  { id: 's14', name: 'Priority Responses', description: 'A concise response style tuned for fast answers and clear next steps', category: 'upgrade', price: 25, tier: 'pro', color: '#38bdf8', icon: 'Timer' },
  { id: 's15', name: 'Team Handoff Pack', description: 'Formats outputs as briefs, SOPs, and handoff notes for teams', category: 'upgrade', price: 40, tier: 'elite', color: '#c084fc', icon: 'Users' },
  { id: 's30', name: 'Long Context Pack', description: 'Prompts the agent to keep more background, constraints, and decisions in view', category: 'upgrade', price: 40, tier: 'elite', color: '#60a5fa', icon: 'StretchHorizontal' },
  { id: 's31', name: 'Proactive Questions', description: 'Makes the agent surface risks, missing inputs, and next best questions sooner', category: 'upgrade', price: 15, tier: 'basic', color: '#facc15', icon: 'CircleHelp' },
  { id: 's32', name: 'Executive Summary Mode', description: 'Adds crisp summaries, recommendations, and decision memos to long answers', category: 'upgrade', price: 25, tier: 'pro', color: '#a78bfa', icon: 'FileText' },

  { id: 's3', name: 'Neon Interface', description: 'A bright cyber-inspired presentation style for your agent', category: 'appearance', price: 10, tier: 'basic', isSale: true, salePrice: 8, color: '#a855f7', icon: 'Sparkles' },
  { id: 's9', name: 'Galaxy Theme', description: 'A polished deep-space visual style for your agent profile', category: 'appearance', price: 15, tier: 'pro', isSale: true, salePrice: 12, color: '#3b82f6', icon: 'Stars' },
  { id: 's16', name: 'Executive Theme', description: 'A clean boardroom-ready style for business agents', category: 'appearance', price: 15, tier: 'pro', color: '#64748b', icon: 'Briefcase' },
  { id: 's17', name: 'Studio Theme', description: 'A warm creative look for writing, brand, and content agents', category: 'appearance', price: 10, tier: 'basic', color: '#fb7185', icon: 'Palette' },
  { id: 's18', name: 'Aurora Theme', description: 'A premium gradient style with teal, green, and violet accents', category: 'appearance', price: 20, tier: 'elite', color: '#34d399', icon: 'Sparkles' },
  { id: 's33', name: 'Minimal Theme', description: 'A quiet black-and-white interface style for focused work', category: 'appearance', price: 10, tier: 'basic', color: '#e5e7eb', icon: 'PanelTop' },
  { id: 's34', name: 'Solar Theme', description: 'A bright amber and coral profile style for energetic agents', category: 'appearance', price: 15, tier: 'pro', color: '#fb923c', icon: 'Sun' },

  { id: 's6', name: 'Privacy Shield', description: 'Adds privacy-first response reminders and sensitive-data handling prompts', category: 'accessory', price: 25, tier: 'pro', color: '#06b6d4', icon: 'Shield' },
  { id: 's19', name: 'Citation Pack', description: 'Encourages source notes, assumptions, and verification callouts', category: 'accessory', price: 15, tier: 'basic', color: '#60a5fa', icon: 'Quote' },
  { id: 's20', name: 'Brand Voice Pack', description: 'Keeps outputs aligned with a preferred tone and writing style', category: 'accessory', price: 25, tier: 'pro', color: '#f472b6', icon: 'BadgeCheck' },
  { id: 's21', name: 'Decision Matrix Pack', description: 'Adds comparison tables, scoring, and recommendation formats', category: 'accessory', price: 25, tier: 'pro', color: '#f59e0b', icon: 'Table2' },
  { id: 's22', name: 'Client-Ready Pack', description: 'Polishes outputs into concise external-facing deliverables', category: 'accessory', price: 40, tier: 'elite', color: '#a78bfa', icon: 'Presentation' },
  { id: 's35', name: 'Compliance Reminder Pack', description: 'Adds reminders to flag legal, medical, financial, and policy-sensitive areas', category: 'accessory', price: 40, tier: 'elite', color: '#ef4444', icon: 'Scale' },

  { id: 's5', name: 'Video Analyzer', description: 'Summarize transcripts, outline videos, and extract action items', category: 'tool', price: 30, tier: 'pro', isNew: true, color: '#fb923c', icon: 'Video' },
  { id: 's7', name: 'Market Watcher', description: 'Ticker watchlists, market summaries, and risk-aware explanations', category: 'tool', price: 25, tier: 'pro', color: '#22d3ee', icon: 'TrendingUp' },
  { id: 's23', name: 'Document Reviewer', description: 'Summarize, critique, and improve pasted documents or drafts', category: 'tool', price: 25, tier: 'pro', color: '#818cf8', icon: 'FileText' },
  { id: 's24', name: 'Spreadsheet Helper', description: 'Plan formulas, clean data, and explain spreadsheet workflows', category: 'tool', price: 25, tier: 'pro', color: '#4ade80', icon: 'Sheet' },
  { id: 's25', name: 'Prompt Builder', description: 'Create reusable prompts, templates, and AI operating instructions', category: 'tool', price: 15, tier: 'basic', color: '#fbbf24', icon: 'MessageSquare' },
  { id: 's36', name: 'Contract Helper', description: 'Summarize terms, list questions, and flag clauses to review with counsel', category: 'tool', price: 40, tier: 'elite', color: '#94a3b8', icon: 'FileCheck2' },
  { id: 's37', name: 'CSV Cleaner', description: 'Plan column cleanup, normalization, validation, and import checks', category: 'tool', price: 15, tier: 'basic', color: '#34d399', icon: 'TableProperties' },
]
