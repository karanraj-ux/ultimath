import type { PipelineStep } from '@/types/types';

export type TemplateCategory = 'Research' | 'Writing' | 'Code' | 'Debate' | 'Other';

export interface PipelineTemplate {
  name: string;
  emoji: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  mode?: string;
  steps: Omit<PipelineStep, 'step_index'>[];
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    name: 'Research Report',
    emoji: '🔬',
    category: 'Research',
    tags: ['Research', 'Analysis', 'Report'],
    description: 'Gather facts, identify patterns, and produce a final polished report in 3 sequential steps.',
    steps: [
      {
        persona_name: 'Researcher',
        persona_emoji: '🔬',
        role: 'Research Specialist',
        instruction:
          'Research the topic thoroughly. Gather key facts, statistics, expert opinions, and relevant context. Present as structured notes.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Analyst',
        persona_emoji: '📊',
        role: 'Data Analyst',
        instruction:
          'Analyse the research notes. Identify key patterns, trends, and insights. Explain what the data means.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Writer',
        persona_emoji: '✍️',
        role: 'Report Writer',
        instruction:
          'Synthesise the research and analysis into a clear, well-structured final report. Include an executive summary, key findings, and recommendations.',
        model: 'gemini-2.5-flash',
      },
    ],
  },
  {
    name: 'Blog Post',
    emoji: '✍️',
    category: 'Writing',
    tags: ['Writing', 'Content', 'Blog'],
    description: 'Brainstorm angles, draft compelling content, then polish it into a publish-ready blog post.',
    steps: [
      {
        persona_name: 'Ideator',
        persona_emoji: '💡',
        role: 'Content Strategist',
        instruction:
          'Brainstorm 3–5 compelling angles for this topic. Consider the target audience, unique hooks, and what will make the content stand out.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Writer',
        persona_emoji: '📝',
        role: 'Blog Writer',
        instruction:
          'Write a full blog post draft based on the best angle. Include an engaging intro, 3–5 main sections with subheadings, and a strong conclusion with a CTA.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Editor',
        persona_emoji: '🖊️',
        role: 'Senior Editor',
        instruction:
          'Polish the draft. Improve clarity, tone, and flow. Fix any awkward phrasing, tighten the writing, and ensure every sentence earns its place. Output the final version.',
        model: 'gemini-2.5-flash',
      },
    ],
  },
  {
    name: 'Code Review',
    emoji: '💻',
    category: 'Code',
    tags: ['Code', 'Security', 'Performance'],
    description: 'Find bugs, audit for security vulnerabilities, then suggest performance optimisations.',
    steps: [
      {
        persona_name: 'Reviewer',
        persona_emoji: '🐛',
        role: 'Code Reviewer',
        instruction:
          'Review the code carefully. Identify bugs, logic errors, anti-patterns, and areas that violate best practices. List each issue with a brief explanation.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Security Analyst',
        persona_emoji: '🔒',
        role: 'Security Engineer',
        instruction:
          'Analyse the code for security vulnerabilities: injection risks, insecure dependencies, auth flaws, data exposure, and OWASP Top 10. Provide severity ratings for each finding.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Optimizer',
        persona_emoji: '⚡',
        role: 'Performance Engineer',
        instruction:
          'Suggest concrete performance improvements: algorithmic complexity, caching opportunities, database query optimisation, and memory efficiency. Provide before/after examples where helpful.',
        model: 'gemini-2.5-flash',
      },
    ],
  },
  {
    name: 'Market Analysis',
    emoji: '📈',
    category: 'Research',
    tags: ['Research', 'Business', 'Strategy'],
    description: 'Analyse a market landscape, identify competitors, and surface strategic opportunities.',
    steps: [
      {
        persona_name: 'Scout',
        persona_emoji: '🗺️',
        role: 'Market Researcher',
        instruction:
          'Map the market landscape. Identify key players, market size, growth trends, and customer segments. Present as a structured overview.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Competitor Analyst',
        persona_emoji: '🔍',
        role: 'Competitive Intelligence',
        instruction:
          'Analyse the top 5 competitors. For each: strengths, weaknesses, pricing, differentiation, and recent moves. Highlight gaps in the market.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Strategist',
        persona_emoji: '♟️',
        role: 'Strategy Consultant',
        instruction:
          'Based on the market overview and competitive analysis, identify the top 3 strategic opportunities. Provide a concise, actionable recommendation for each.',
        model: 'gemini-2.5-flash',
      },
    ],
  },
  {
    name: 'Press Release',
    emoji: '📰',
    category: 'Writing',
    tags: ['Writing', 'PR', 'Marketing'],
    description: 'Draft and polish a professional press release from a raw brief.',
    steps: [
      {
        persona_name: 'PR Writer',
        persona_emoji: '📰',
        role: 'PR Copywriter',
        instruction:
          'Write a first draft of the press release. Include headline, dateline, lead paragraph (who/what/when/where/why), body paragraphs, and a standard boilerplate. Use AP style.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Editor',
        persona_emoji: '✂️',
        role: 'Senior Editor',
        instruction:
          'Sharpen the press release. Improve the headline, tighten the lead, remove jargon, and ensure the key message is front-loaded. Output the polished version.',
        model: 'gemini-2.5-flash',
      },
    ],
  },
  {
    name: 'Bug Report Triage',
    emoji: '🐞',
    category: 'Code',
    tags: ['Code', 'QA', 'Debugging'],
    description: 'Reproduce the issue, identify root cause, and propose a fix with test coverage.',
    steps: [
      {
        persona_name: 'QA Engineer',
        persona_emoji: '🔎',
        role: 'QA Specialist',
        instruction:
          'Analyse the bug report. Describe the steps to reproduce, the expected vs actual behaviour, and the likely scope of impact. Rate severity (Low/Medium/High/Critical).',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Developer',
        persona_emoji: '👨‍💻',
        role: 'Software Engineer',
        instruction:
          'Identify the probable root cause based on the QA analysis. Suggest a specific code fix with a clear explanation. Note any edge cases to watch.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Test Author',
        persona_emoji: '🧪',
        role: 'Test Engineer',
        instruction:
          'Write unit and integration tests that would catch this bug and verify the fix. Use the testing framework implied by the codebase.',
        model: 'gemini-2.5-flash',
      },
    ],
  },
  // ── Debate / Roundtable templates ──────────────────────────────────────────
  {
    name: 'Perspectives Debate',
    emoji: '🗣️',
    category: 'Debate',
    tags: ['Debate', 'Roundtable', 'Analysis'],
    mode: 'roundtable',
    description:
      'The Devil\'s Advocate, The Scientist, and The Philosopher debate your topic across 2 rounds — then synthesise a verdict.',
    steps: [
      {
        persona_name: "The Devil's Advocate",
        persona_emoji: '😈',
        role: 'Contrarian',
        instruction:
          'Challenge every assumption. Find the strongest counterargument, the hidden flaw, the overlooked risk. Be direct and intellectually honest. End with your sharpest objection.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'The Scientist',
        persona_emoji: '🔬',
        role: 'Evidence Analyst',
        instruction:
          'What does the evidence actually say? Separate proven facts from probable claims from speculation. Flag any statement that exceeds the data. End with the most important unanswered empirical question.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'The Philosopher',
        persona_emoji: '🎭',
        role: 'Deep Thinker',
        instruction:
          'Go beneath the surface. What assumptions are being made? What are the ethical implications? Use a thought experiment to illuminate the core tension. End with a question that reframes everything.',
        model: 'gemini-2.5-flash',
      },
    ],
  },
  {
    name: 'Business Decision Council',
    emoji: '🏛️',
    category: 'Debate',
    tags: ['Business', 'Roundtable', 'Strategy'],
    mode: 'roundtable',
    description:
      'CEO Mentor, The Lawyer, and The Creative debate a business decision across 2 rounds — with a strategic synthesis at the end.',
    steps: [
      {
        persona_name: 'The CEO Mentor',
        persona_emoji: '💼',
        role: 'Strategic Voice',
        instruction:
          'Analyse this business decision in terms of ROI, execution risk, competitive moat, and long-term strategy. What is the single most important factor? Be blunt and specific.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'The Lawyer',
        persona_emoji: '⚖️',
        role: 'Risk & Legal Voice',
        instruction:
          'What are the legal, contractual, and liability risks? What is ambiguous? What could go wrong that the CEO hasn\'t considered? Identify the top 3 risks and what to do about each.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'The Creative',
        persona_emoji: '🎨',
        role: 'Unconventional Voice',
        instruction:
          'Throw out conventional thinking. What surprising angle has everyone missed? Is there a completely different approach that makes the whole debate irrelevant? Bring the unexpected perspective.',
        model: 'gemini-2.5-flash',
      },
    ],
  },
  // ── Swarm templates ────────────────────────────────────────────────────────
  {
    name: 'Multi-Lens Expert Swarm',
    emoji: '🧬',
    category: 'Research',
    tags: ['Research', 'Swarm', 'Multi-perspective'],
    mode: 'swarm',
    description:
      'CEO Mentor + The Creative + The Historian + The Scientist each tackle the same question from their unique lens — then a Master Synthesiser merges every perspective.',
    steps: [
      {
        persona_name: 'The CEO Mentor',
        persona_emoji: '💼',
        role: 'Strategic Lens',
        instruction:
          'Analyse this through pure business strategy. What are the ROI implications, execution risks, and competitive opportunities? What is the one thing that makes or breaks this?',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'The Creative',
        persona_emoji: '🎨',
        role: 'Lateral Lens',
        instruction:
          'Ignore conventional thinking entirely. What surprising angle, unexpected connection, or radical reframe makes this suddenly obvious? Generate 3 wild ideas — judge nothing yet.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'The Historian',
        persona_emoji: '🌍',
        role: 'Historical Lens',
        instruction:
          'Has something like this happened before in history? Name specific examples with dates. What patterns apply? What did people miss last time? What does history predict about the outcome?',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'The Scientist',
        persona_emoji: '🔬',
        role: 'Evidence Lens',
        instruction:
          'What does empirical evidence actually show? What research exists? What hypotheses apply? What would a rigorous experiment look like to test the key claims here?',
        model: 'gemini-2.5-flash',
      },
    ],
  },
  // ── Story Chain templates ──────────────────────────────────────────────────
  {
    name: 'Collaborative Story',
    emoji: '📖',
    category: 'Writing',
    tags: ['Writing', 'Story', 'Creative'],
    mode: 'story',
    description:
      'Four distinct voices co-author a story: World-Builder sets the scene, Character Weaver develops the protagonist, Conflict Architect raises the stakes, Resolution Weaver brings it home.',
    steps: [
      {
        persona_name: 'World-Builder',
        persona_emoji: '🌍',
        role: 'Setting & Atmosphere',
        instruction:
          'Open the story. Establish the world, time, place, and atmosphere with vivid sensory detail. Introduce at least one intriguing character. End at a moment of rising tension — leave the reader wanting the next line.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Character Weaver',
        persona_emoji: '🎭',
        role: 'Character & Emotion',
        instruction:
          'Advance the protagonist. Show their inner world — desires, fears, contradictions — through action and dialogue, never exposition. Build emotional tension. Hand off at a critical decision point.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Conflict Architect',
        persona_emoji: '⚡',
        role: 'Escalation & Stakes',
        instruction:
          'Escalate the conflict. Introduce a complication that makes everything harder and strips away the protagonist\'s easy options. Raise the stakes dramatically. End on the darkest moment before the turn.',
        model: 'gemini-2.5-flash',
      },
      {
        persona_name: 'Resolution Weaver',
        persona_emoji: '🌅',
        role: 'Conclusion & Theme',
        instruction:
          'Resolve the story. Show how the protagonist faces their moment of truth — not easily, but earned. Bring the themes full-circle. End with a final image or line that resonates long after the last word.',
        model: 'gemini-2.5-flash',
      },
    ],
  },
];
