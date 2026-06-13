
-- ── Agent Pipelines ──────────────────────────────────────────────────────────
-- Stores saved pipeline definitions (ordered list of persona steps + roles)
CREATE TABLE agent_pipelines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  steps         jsonb NOT NULL DEFAULT '[]',
  -- steps schema: [{persona_id, persona_name, persona_emoji, role, instruction, model}]
  is_template   boolean NOT NULL DEFAULT false,
  template_type text,           -- 'content_factory' | 'debate' | 'story' | 'startup' | null
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Pipeline Runs ─────────────────────────────────────────────────────────────
-- Stores execution history for each pipeline run
CREATE TABLE pipeline_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id   uuid REFERENCES agent_pipelines(id) ON DELETE SET NULL,
  pipeline_name text NOT NULL,
  input_prompt  text NOT NULL,
  steps_output  jsonb NOT NULL DEFAULT '[]',
  -- steps_output schema: [{step_index, agent_name, agent_emoji, role, content, model, duration_ms}]
  final_output  text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'running' | 'done' | 'error'
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_agent_pipelines_is_template ON agent_pipelines(is_template);
CREATE INDEX idx_pipeline_runs_pipeline_id   ON pipeline_runs(pipeline_id);
CREATE INDEX idx_pipeline_runs_created_at    ON pipeline_runs(created_at DESC);

-- ── RLS: open read/write (no auth required, consistent with rest of app) ──────
ALTER TABLE agent_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read pipelines"  ON agent_pipelines FOR SELECT USING (true);
CREATE POLICY "anyone can insert pipelines" ON agent_pipelines FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can update pipelines" ON agent_pipelines FOR UPDATE USING (true);
CREATE POLICY "anyone can delete pipelines" ON agent_pipelines FOR DELETE USING (true);

CREATE POLICY "anyone can read runs"   ON pipeline_runs FOR SELECT USING (true);
CREATE POLICY "anyone can insert runs" ON pipeline_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can update runs" ON pipeline_runs FOR UPDATE USING (true);

-- ── Built-in template pipelines ───────────────────────────────────────────────
INSERT INTO agent_pipelines (name, description, steps, is_template, template_type) VALUES
(
  'Content Factory',
  'Research → Write → Edit → SEO-optimise. Four agents collaborate to produce polished long-form content.',
  '[
    {"step_index":0,"persona_name":"Researcher","persona_emoji":"🔍","role":"Research Specialist","model":"gemini-2.5-flash","instruction":"Research the topic thoroughly. Gather key facts, statistics, angles and context. Output a structured research brief."},
    {"step_index":1,"persona_name":"Writer","persona_emoji":"✍️","role":"Content Writer","model":"gemini-2.5-flash","instruction":"Using the research brief, write a compelling, well-structured long-form article. Use engaging narrative and clear headings."},
    {"step_index":2,"persona_name":"Editor","persona_emoji":"📝","role":"Senior Editor","model":"gemini-2.5-flash","instruction":"Review and refine the draft. Improve clarity, flow, remove redundancy, fix grammar. Preserve the author''s voice."},
    {"step_index":3,"persona_name":"SEO Specialist","persona_emoji":"📈","role":"SEO Specialist","model":"gemini-2.5-flash","instruction":"Optimise the edited content for search engines. Suggest keyword placement, meta description, and title tag. Output the final SEO-ready version."}
  ]',
  true,
  'content_factory'
),
(
  'Devil''s Advocate',
  'Propose → Attack → Mediate → Verdict. Perfect for stress-testing ideas and arguments.',
  '[
    {"step_index":0,"persona_name":"Proposer","persona_emoji":"💡","role":"Idea Proposer","model":"gemini-2.5-flash","instruction":"Present the strongest possible case FOR the topic. Use clear arguments, evidence and enthusiasm."},
    {"step_index":1,"persona_name":"Critic","persona_emoji":"⚔️","role":"Devil''s Advocate","model":"gemini-2.5-flash","instruction":"Attack the proposal ruthlessly. Find every flaw, contradiction, and weakness. Be blunt and precise."},
    {"step_index":2,"persona_name":"Mediator","persona_emoji":"⚖️","role":"Neutral Mediator","model":"gemini-2.5-flash","instruction":"Synthesise both sides fairly. Find common ground, acknowledge valid points on each side."},
    {"step_index":3,"persona_name":"Judge","persona_emoji":"🏛️","role":"Final Arbiter","model":"gemini-2.5-flash","instruction":"Deliver a final balanced verdict with clear reasoning. Rate the original idea out of 10 with justification."}
  ]',
  true,
  'debate'
),
(
  'Story Workshop',
  'Plot → Characters → Dialogue → Polish. A creative writing pipeline for rich storytelling.',
  '[
    {"step_index":0,"persona_name":"Plotter","persona_emoji":"🗺️","role":"Plot Architect","model":"gemini-2.5-flash","instruction":"Design a compelling plot outline with a clear three-act structure, conflict, and resolution. Include key story beats."},
    {"step_index":1,"persona_name":"Character Designer","persona_emoji":"🎭","role":"Character Designer","model":"gemini-2.5-flash","instruction":"Create rich, complex characters for this story. Give each a name, backstory, motivation, and distinctive voice."},
    {"step_index":2,"persona_name":"Dialogue Writer","persona_emoji":"💬","role":"Dialogue Specialist","model":"gemini-2.5-flash","instruction":"Write the key scenes and dialogue. Bring the characters to life. Make each voice distinct and authentic."},
    {"step_index":3,"persona_name":"Final Editor","persona_emoji":"✨","role":"Literary Editor","model":"gemini-2.5-flash","instruction":"Polish the complete story. Ensure narrative coherence, consistent voice, and emotional resonance. Deliver the final publishable version."}
  ]',
  true,
  'story'
),
(
  'Startup Pitch',
  'Analyse → Market → Challenge → Pitch. Build an investor-ready pitch through multi-agent collaboration.',
  '[
    {"step_index":0,"persona_name":"Analyst","persona_emoji":"📊","role":"Business Analyst","model":"gemini-2.5-flash","instruction":"Analyse the business idea. Identify market size, competition, business model, and key metrics. Produce a concise analysis."},
    {"step_index":1,"persona_name":"Marketer","persona_emoji":"📣","role":"Growth Marketer","model":"gemini-2.5-flash","instruction":"Develop the value proposition, target audience, and go-to-market strategy based on the analysis."},
    {"step_index":2,"persona_name":"Skeptic","persona_emoji":"🤔","role":"Venture Skeptic","model":"gemini-2.5-flash","instruction":"Challenge the plan hard. What will make investors say no? Identify the top 5 risks and objections."},
    {"step_index":3,"persona_name":"Pitch Master","persona_emoji":"🚀","role":"Pitch Specialist","model":"gemini-2.5-flash","instruction":"Write the final investor pitch deck narrative (executive summary + problem/solution/market/traction/ask). Address the skeptic''s objections directly."}
  ]',
  true,
  'startup'
);
