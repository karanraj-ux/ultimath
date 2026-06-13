# Requirements Document

## 1. Application Overview

### 1.1 Application Name
Forge (formerly Catbot)

### 1.2 Application Description
Forge is a multi-persona AI chat platform with debate rooms, group chat capabilities, a visual pipeline builder (Agent Studio), and a comprehensive template system. Users can build customizable AI personas, share them publicly, engage in one-on-one conversations, participate in multi-persona group debates, join real-time debate rooms with AI fact-checking, orchestrate multi-step AI pipelines, save pipelines as templates, rate and discover templates, import/export templates, share templates publicly via links, manage AI agents, purchase platform credits via Stripe (INR), track creator analytics with time-series charts, and execute B2B structured-output tasks (bug fixing, marketing optimization, code refactoring) using a JSON schema engine. Built on React + TypeScript + Supabase stack.

### 1.3 Version Update
v26 → v36 Full Platform Expansion: Creator Credit System, Stripe Payments (INR), Creator Analytics Dashboard, Shareable Public Tools, and B2B Execution Engine.

## 2. Users & Usage Scenarios

### 2.1 Target Users
- Users wanting to create and customize AI personas with specific personalities
- Users seeking to orchestrate multi-persona group debates with 2-6 AI personas responding in real-time
- Users needing organized conversation management with search capabilities
- Users wanting to participate in real-time group debates with AI fact-checking
- Users building multi-step AI processing pipelines with sequential persona execution
- Users saving their pipelines as reusable templates
- Users rating and discovering templates created by others
- Users importing templates from JSON files
- Users exporting templates as JSON files for sharing
- Users tracking template usage and popularity
- Users sharing pipelines with others via public links
- Users sharing templates with others via public links
- Users exploring built-in and community-created pipeline templates
- Anonymous users rating templates without accounts
- Anonymous users viewing shared templates without accounts
- External visitors landing on public persona pages
- External visitors landing on public template share pages
- First-time visitors needing guided onboarding experience
- Users exploring public persona gallery for discovery
- Users evaluating pricing tiers and purchasing credits
- Users managing AI agents and workflows in Agent Studio
- Users filtering activity history by type in Settings
- Creators evaluating INR pricing tiers and purchasing platform credits via Stripe
- Creators tracking tool engagement analytics (views, chats, messages over time)
- Creators generating QR codes to share public tools with zero-account consumers
- External visitors consuming public tools via QR scan without signup or API keys
- Business users converting unstructured input into structured JSON deliverables
- Business users generating Jira tickets, code patches, and marketing variants via AI

### 2.2 Core Usage Scenarios
- Creating AI personas with customizable traits and behaviors
- Starting multi-persona group chat sessions with selected personas responding live
- Managing group chat sessions with ability to add/remove personas mid-session
- Building visual pipelines with sequential AI persona processing steps
- Saving pipelines as templates with category and metadata
- Rating templates with 1-5 star ratings
- Browsing template library with category filters, search, and sorting options
- Importing templates from JSON files via file picker or drag-and-drop
- Exporting templates as JSON files for sharing
- Tracking template usage and clone counts
- Editing and deleting user-created templates
- Running pipelines with step-by-step streaming output
- Sharing pipelines via public links for others to view and clone
- Sharing templates via public links for others to view and clone
- Exporting pipeline configurations as JSON files
- Importing pipeline configurations from JSON files
- Cloning templates to user's studio as new pipelines
- Using built-in pipeline templates for common workflows
- Filtering activity history by type (Chat, Pipeline, Group Chat, Persona)
- Searching through conversation history quickly
- Switching between different personas during chat
- Creating debate rooms with specific topics and access controls
- Joining debate rooms anonymously or with display names
- Fact-checking messages in real-time with AI-powered verdicts
- Viewing dashboard with usage stats and quick-start actions
- Browsing persona library with category filters and preview modals
- Comparing pricing tiers and purchasing credits via Stripe
- Managing API keys for multiple providers in settings
- Exporting conversations as PDF or Markdown
- Reviewing recent activity history in settings
- Viewing shared templates without login
- Rating shared templates anonymously
- Cloning shared templates to own studio
- Purchasing platform credits via Stripe checkout with INR pricing
- Verifying payment success and receiving credit top-up automatically
- Viewing 14-day time-series analytics for creator tools
- Sharing public personas via QR code for anonymous consumers
- Scanning QR codes to access minimal chat interfaces without signup
- Executing B2B tasks: bug fixing, marketing optimization, code refactoring
- Receiving structured JSON output with tickets, patches, and action plans

## 3. Page Structure & Functionality

```
Forge (Multi-Persona AI Chat Platform)
├── Dashboard/Home Page (/)
├── Sidebar Navigation
├── First-Run Onboarding Modal
├── AI Chat Interface (/chat/:conversationId)
├── Multi-Persona Group Chat
│   ├── Group Chat Sessions List (/group-chat)
│   └── Group Chat Room (/group-chat/:sessionId)
├── Pipeline Builder (/studio)
│   ├── Pipeline List View
│   └── Pipeline Editor View
│       ├── Pipeline Name Input
│       ├── Toolbar
│       │   ├── Save as Template Toggle/Button
│       │   ├── Share Button
│       │   ├── Export to JSON Button
│       │   ├── Save Pipeline Button
│       │   └── Delete Pipeline Button
│       ├── Visual Node Chain
│       ├── Step Configuration Panel
│       ├── Pipeline Execution Panel
│       └── Run History Section
├── Template Library Page (/studio/templates)
│   ├── Page Header
│   │   ├── Title and Description
│   │   ├── Import Template Button
│   │   └── Sort Dropdown
│   ├── Category Filter Tabs
│   │   ├── My Templates Tab
│   │   ├── All Tab
│   │   ├── Research Tab
│   │   ├── Writing Tab
│   │   ├── Code Tab
│   │   └── Other Tab
│   ├── Search Bar
│   ├── Template Cards Grid
│   │   ├── My Templates Section
│   │   │   ├── User Template Card
│   │   │   │   ├── Template Emoji
│   │   │   │   ├── Template Name
│   │   │   │   ├── Template Description
│   │   │   │   ├── Category Badge
│   │   │   │   ├── Step Count Badge
│   │   │   │   ├── Star Rating Display
│   │   │   │   ├── Clone Count Display
│   │   │   │   ├── Share Button
│   │   │   │   ├── Edit Button
│   │   │   │   ├── Delete Button
│   │   │   │   ├── Export Button
│   │   │   │   ├── Use Template Button
│   │   │   │   └── Preview Button
│   │   └── Built-in Templates Section
│   │       ├── Built-in Template Card
│   │       │   ├── Template Emoji
│   │       │   ├── Template Name
│   │       │   ├── Template Description
│   │       │   ├── Category Badge
│   │       │   ├── Step Count Badge
│   │       │   ├── Star Rating Display
│   │       │   ├── Clone Count Display
│   │       │   ├── Share Button
│   │       │   ├── Export Button
│   │       │   ├── Use Template Button
│   │       │   └── Preview Button
│   ├── Template Preview Modal
│   │   ├── Template Name and Emoji
│   │   ├── Template Description
│   │   ├── Star Rating Interactive
│   │   ├── Clone Count Display
│   │   ├── Share Button
│   │   ├── Step-by-Step Breakdown
│   │   └── Clone to My Studio Button
│   ├── Template Import Modal
│   │   ├── File Upload Area
│   │   ├── Drag-and-Drop Zone
│   │   ├── Template Preview
│   │   └── Import as Template Button
│   └── Empty State
├── Template Public Share Page (/studio/template-share/:shareToken)
│   ├── Page Header
│   │   ├── Template Name and Emoji
│   │   ├── Category Badge
│   │   └── Amber/Violet Gradient Background
│   ├── Template Description
│   ├── Template Metadata
│   │   ├── Star Rating Display (Read-Only Average + Count)
│   │   ├── Clone Count Display
│   │   └── Tags Display
│   ├── Interactive Star Rating (Anonymous)
│   ├── Step-by-Step Breakdown
│   ├── Action Buttons
│   │   ├── Clone to My Studio Button
│   │   └── View Template Library Button
│   └── Responsive Layout (Mobile + Desktop)
├── Pipeline Public Share Page (/studio/share/:shareId)
├── Persona Management
│   ├── Persona Library Page (/personas)
│   ├── Persona Creation Page (/personas/create)
│   └── Public Persona Page (/p/:personaId)
├── Agent Studio (/agent-studio)
├── Credits & Pricing Page (/credits)
│   ├── Plan Tiers (Starter Free, Growth, Pro, Business)
│   ├── Annual Toggle with 40% Discount
│   └── Stripe Checkout Integration (INR)
├── Payment Success Page (/payment-success)
│   ├── Session Verification
│   └── Credit Top-up Confirmation
├── Public Tool Page (/tool/:shareToken)
│   ├── Minimal Chat Interface (No Signup)
│   └── Platform-Powered AI (Creator Credits)
├── Debate Rooms
│   ├── Rooms List Page (/rooms)
│   ├── Room Creation Page (/rooms/create)
│   └── Room Chat Page (/room/:groupId)
├── Creator Dashboard (/dashboard)
│   ├── Stat Cards (Views, Chats, Visitors, Messages)
│   ├── Public Persona List with QR Codes
│   └── 14-Day Analytics AreaChart (Recharts)
├── B2B Execution Engine (/b2b)
│   ├── Task Templates (Bug Fixer, Marketing, Code Architect)
│   ├── Raw Input Textarea
│   └── Structured JSON Output Renderers
├── Settings Page (/settings)
├── Contacts Page (/contacts)
├── System Test Page (/system-test)
└── 404 Not Found Page
```

### 3.1 Template Library Page - UPDATED
**Purpose:** Comprehensive template discovery, rating, import/export, sharing, and management hub

**Core Functions:**
- Page header with title, description, Import Template button, Sort dropdown
- Category filter tabs: My Templates, All, Research, Writing, Code, Other
- Search bar with real-time filtering
- Template cards grid with two sections:
  + My Templates section (purple/violet accent)
    - Each card shows: emoji, name, description, category badge, step count badge, star rating, clone count, Share button (Link icon), Edit button, Delete button, Export button, Use Template button, Preview button
  + Built-in Templates section (amber/gold accent)
    - Each card shows: emoji, name, description, category badge, step count badge, star rating, clone count, Share button (Link icon), Export button, Use Template button, Preview button
- Template preview modal with: name, emoji, description, star rating interactive, clone count, Share button, step-by-step breakdown, Clone to My Studio button
- Template import modal with: file upload area, drag-and-drop zone, template preview, Import as Template button
- Empty state and loading skeleton cards

**Visual Requirements:**
- Share button with Link icon on each template card
- Share button with Link icon in preview modal
- Success toast notification after generating share link with URL displayed
- Electric violet accent on Share button

**Interaction Flow:**
1. User clicks Share button on template card or in preview modal
2. System generates share link via templateShareService
3. Share link copied to clipboard automatically
4. Success toast displayed with share URL
5. User can share URL with others

### 3.2 Template Public Share Page - NEW
**Purpose:** Public template viewing and cloning page accessible without authentication

**Core Functions:**
- Page header with:
  + Template name and emoji
  + Category badge
  + Amber/violet gradient background matching template library aesthetic
- Template description
- Template metadata:
  + Star rating display (read-only average + count)
  + Clone count display
  + Tags display
- Interactive star rating (anonymous, uses fingerprint)
- Step-by-step breakdown (read-only)
- Action buttons:
  + Clone to My Studio button (clones template as new pipeline)
  + View Template Library button (navigates to /studio/templates)
- Fully responsive layout (mobile + desktop)
- SEO-friendly page title using template name

**Visual Requirements:**
- Amber/violet gradient header matching template library aesthetic
- Dark-first editorial aesthetic
- Electric violet accent on interactive elements
- Glassmorphism effect on cards
- Responsive grid layout for mobile and desktop
- Star rating display with filled/half/empty stars
- Interactive star rating with hover effect
- Clone count with GitFork icon
- Category badge with appropriate color
- Step cards with persona name and instruction
- Action buttons with distinct styling

**Interaction Flow:**
1. User receives share link from template creator
2. User opens link in browser (no login required)
3. Page loads template data from template_shares table via shareToken
4. User views template name, emoji, description, category, tags
5. User sees star rating average and count
6. User sees clone count
7. User views step-by-step breakdown
8. User can click stars to rate template (anonymous, uses fingerprint)
9. User can click Clone to My Studio button
10. If not logged in, user redirected to login page
11. After login, template cloned to user's pipelines
12. Clone count increments
13. User redirected to /studio/:pipelineId with cloned pipeline
14. User can click View Template Library button to navigate to /studio/templates

### 3.3 Credits & Pricing Page
**Purpose:** Allow creators to purchase platform credits via Stripe using INR pricing, compare subscription tiers, and manage billing.

**Core Functions:**
- Display 4 pricing tiers: Starter (Free), Growth (₹299/month), Pro (₹799/month), Business (₹1999/month)
- Toggle between Monthly and Annual billing (40% discount on annual)
- Highlight recommended tier (Growth) with badge
- Stripe checkout button per tier initiates payment session
- Disabled state for Starter tier (always free)
- Annual plans map to `_annual` Stripe price IDs
- Redirect to Stripe checkout URL on click

**Visual Requirements:**
- Plan cards with gradient borders for featured tier
- INR currency formatting (₹ symbol)
- Checkmark/X icon lists for feature comparison
- Responsive grid layout (1 col mobile, 3 col desktop)

### 3.4 Payment Success Page
**Purpose:** Verify Stripe checkout session and automatically top up user credits.

**Core Functions:**
- Extract `session_id` from URL query params
- Call `verify_stripe_payment` Edge Function with session_id
- Edge Function retrieves Stripe session, updates order status, calls `add_credits` RPC
- Display success animation and credit balance update
- Show error state if session invalid or payment failed
- Provide "Go to Dashboard" and "Start Creating" CTAs

**Interaction Flow:**
1. User redirected from Stripe to /payment-success?session_id=xxx
2. Page calls verify_stripe_payment RPC
3. On success: display confirmation, updated credit balance
4. On failure: display error message with retry/contact support options

### 3.5 Public Tool Page
**Purpose:** Allow zero-account consumers to interact with a creator's public persona via a minimal chat interface.

**Core Functions:**
- Public route /tool/:shareToken (no authentication required)
- Loads public persona via share_token from `public_shares` table
- Displays persona avatar, name, description
- Minimal chat input interface (no sidebar, no settings, no API key required)
- Uses platform Gemini key for AI responses
- Burns credits from creator's pool per message (via deduct_credits RPC)
- Auto-pauses tool if creator has 0 credits (shows "Tool temporarily unavailable")

**Visual Requirements:**
- Clean, minimal UI without full app chrome
- Persona avatar prominently displayed
- Simple message bubble layout
- "Powered by Forge" watermark
- Responsive mobile-first design

### 3.6 Creator Dashboard Page
**Purpose:** Provide creators with analytics, public tool management, and QR code generation.

**Core Functions:**
- Stat cards: Total Views, Total Chats, Unique Visitors, Total Messages (aggregated across all public personas)
- Public Persona List table with:
  + Persona name and status (Active/Inactive)
  + Credits consumed count
  + QR code button (opens modal with QR code for sharing)
  + Disable/Enable toggle
- 14-Day Analytics AreaChart using Recharts:
  + X-axis: dates (last 14 days)
  + Y-axis: event counts
  + Two data series: Views (primary color) vs Chats (secondary color)
- Data fetched via `get_creator_analytics` RPC (time-series aggregation of persona_stats table)

**Visual Requirements:**
- Dashboard grid layout with stat cards at top
- Table with glassmorphism row styling
- QR code modal with download option
- Recharts AreaChart with gradient fills
- Responsive layout (stack on mobile)

### 3.7 B2B Execution Engine Page
**Purpose:** Convert unstructured business input into structured, executable JSON deliverables using a dual-agent AI pipeline.

**Core Functions:**
- Task template selector (3 modes):
  + Bug Fixer: Converts bad reviews/crash logs into Jira tickets + code patches + follow-up prompts
  + Marketing Optimizer: Generates copy variants + SEO keywords + A/B test plans
  + Code Architect: Refactors code + performance notes + security warnings
- Raw input textarea with template-specific placeholder text
- Execute button (costs 5 platform credits per run)
- Structured output renderers:
  + Bug Fixer: Ticket cards (priority badges) + Code patch blocks (syntax highlighted) + Prompt list
  + Marketing: JSON dump in formatted code block (ready for API integration)
  + Code Architect: JSON dump with refactored_code, performance_notes, security_warnings
- Fallback raw JSON renderer for any output

**Business Rules:**
- Authenticated users only
- 5 credits deducted per execution via `deduct_credits` RPC
- Edge Function `execute_b2b_task` enforces Gemini JSON schema (`responseSchema`) for structured output
- Input validation: non-empty input and taskType required
- Insufficient credits returns 402 error

**Visual Requirements:**
- Template cards with selection state (border highlight + glow)
- Monospace input textarea
- Output section with "Executable Deliverables" header
- Syntax-highlighted code blocks for patches
- Priority badges (High/Medium/Low) for tickets
- Responsive grid for ticket/patch layouts

## 4. Business Rules & Logic

### 4.1 Template Public Share Link Logic - NEW
- New Supabase table: template_shares
  + Fields: id (uuid), template_id (text), template_type (text ['builtin'|'user']), share_token (text unique default gen_random_uuid()::text), pipeline_id (uuid nullable references agent_pipelines(id) on delete cascade), created_at (timestamptz default now())
  + RLS: anyone can read template_shares, authenticated users can insert
- New service: templateShareService with methods:
  + shareBuiltinTemplate(templateSlug: string, templateData: PipelineTemplate): Promise<string>
    - Inserts row with template_type='builtin', template_id=templateSlug
    - Returns share_token
  + shareUserTemplate(pipelineId: string): Promise<string>
    - Inserts row with template_type='user', template_id=pipelineId, pipeline_id=pipelineId
    - Returns share_token
  + getSharedTemplate(shareToken: string): Promise<SharedTemplateData | null>
    - Fetches template_shares row by share_token
    - If template_type='builtin', returns built-in template data from hardcoded templates
    - If template_type='user', fetches pipeline from agent_pipelines table
    - Returns template data with name, emoji, description, category, tags, steps, ratings, clone count
- Share button on each template card (built-in and user)
- Share button in template preview modal
- Clicking Share button:
  + Calls shareBuiltinTemplate or shareUserTemplate based on template type
  + Generates share link: https://forge.app/studio/template-share/:shareToken
  + Copies link to clipboard
  + Shows success toast with share URL
- Public share page at /studio/template-share/:shareToken
  + Fully public (no authentication required)
  + Fetches template data via getSharedTemplate(shareToken)
  + Displays template name, emoji, description, category, tags, step-by-step breakdown
  + Displays star rating average and count (read-only)
  + Displays clone count
  + Allows anonymous star rating (uses fingerprint)
  + Clone to My Studio button clones template as new pipeline
  + If user not logged in, redirects to login page
  + After login, clones template and redirects to /studio/:pipelineId
  + View Template Library button navigates to /studio/templates
- Routes: /studio/template-share/:shareToken route added BEFORE /studio/:pipelineId to avoid conflict

### 4.2 End-to-End Connectivity Verification - NEW
- Supabase client initialized with correct env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- pipelineService.getTemplates() filters is_template=true pipelines for My Templates section
- useTemplateRatings hook reads/writes to template_ratings table with upsert on conflict (template_id, user_fingerprint)
- Clone counts for built-in templates use increment_builtin_clone_count RPC function
- Clone counts for user templates update agent_pipelines.clone_count column
- template_usage table seeded with all 6 built-in template slugs
- pipelineService.createPipeline passes emoji, category, clone_count, template_type fields correctly
- AgentStudioPage Save as Template sets is_template=true, template_type='user', category, emoji in DB
- TemplateLibraryPage My Templates tab loads from Supabase via getTemplates
- Sorting by Most Used uses clone_count from DB for user templates and template_usage for built-ins
- Page-level drag-drop on TemplateLibraryPage triggers import modal correctly
- TemplateImportModal creates pipeline with is_template=true, template_type='imported'
- StarRating component displays half-stars using SVG linearGradient
- useTemplateRatings upsert uses correct conflict target: template_id, user_fingerprint
- AgentPipeline interface includes emoji, category, clone_count fields

### 4.3 User Template Creation Logic
- User can save any pipeline as template via Save as Template button in pipeline editor
- User must select category: Research, Writing, Code, Other
- Pipeline saved with is_template=true flag in agent_pipelines table
- Template appears in Template Library under My Templates section
- Only pipeline owner can save pipeline as template
- Template inherits pipeline name, description, emoji, steps
- Template category stored in agent_pipelines.category field

### 4.4 User Template Management Logic
- User templates displayed in My Templates section at top of Template Library
- My Templates section has purple/violet accent to differentiate from built-in templates
- User can edit own templates via Edit button (navigates to /studio/:id)
- User can delete own templates via Delete button with confirmation
- Only template owner can edit/delete their templates
- Deleting template removes from Template Library but does not delete cloned pipelines
- User templates support all same features as built-in templates: rating, export, clone, share

### 4.5 Template Rating Logic
- Anonymous rating system using user fingerprint stored in localStorage
- User fingerprint generated as UUID on first rating
- Rating stored in template_ratings table:
  + Fields: id, template_id, template_type (builtin or user), user_fingerprint, rating (1-5), created_at
- Built-in templates use template_type=builtin and template_id=template name slug
- User templates use template_type=user and template_id=pipeline UUID
- User can rate any template 1-5 stars
- User can update rating (upsert by fingerprint + template_id)
- Average rating calculated from all ratings for template
- Rating count is total number of ratings for template
- Rating display shows average (1 decimal) and count
- No login required to rate

### 4.6 Template Import Logic
- Import Template button in Template Library header opens file picker
- File picker accepts .json files only
- Drag-and-drop support on Template Library page
- JSON validation checks:
  + Required fields: name, description, steps array, category, emoji
  + File size limit: 1MB
  + Steps array must have at least 1 step
- After validation, import modal shows template preview:
  + Template name
  + Step count
  + Steps list (agent name, instruction)
- User clicks Import as Template button
- Template added to user's templates with is_template=true
- Imported templates get Imported badge on card
- Error handling:
  + Invalid JSON: display error message
  + Missing required fields: display error message
  + File too large: display error message

### 4.7 Template Export Logic
- Export button on each template card (built-in and user)
- Clicking Export downloads .json file with template data
- JSON structure:
  + name: template name
  + emoji: template emoji
  + description: template description
  + category: template category
  + tags: template tags array
  + steps: steps array (agent name, instruction, pass-through)
- File naming: [template-name-slug]-template.json
- Example: research-report-template.json

### 4.8 Template Usage Tracking Logic
- Clone count increments every time template cloned via:
  + Use Template button on template card
  + Clone to My Studio button in preview modal
  + Clone to My Studio button on public share page
- For user templates:
  + Clone count stored in agent_pipelines.clone_count field
  + Increment via SQL UPDATE statement
- For built-in templates:
  + Clone count stored in template_usage table
  + Fields: template_id (name slug), clone_count, last_cloned_at
  + Increment via SQL UPDATE or INSERT if not exists
- Clone count displayed on template cards: X uses with GitFork icon
- Clone count displayed in preview modal
- Clone count displayed on public share page
- Sort by Most Used option in Template Library sorts by clone_count descending

### 4.9 Template Library Filtering and Sorting Logic
- Category filter tabs:
  + My Templates: shows only user's templates (is_template=true AND user_id=current_user)
  + All: shows all templates (built-in + user)
  + Research: shows templates with category=Research
  + Writing: shows templates with category=Writing
  + Code: shows templates with category=Code
  + Other: shows templates with category=Other
- Search bar filters by template name or description (client-side)
- Search and filter work together (AND logic)
- Sort dropdown options:
  + Top Rated: sorts by average rating descending
  + Newest: sorts by created_at descending
  + Most Used: sorts by clone_count descending
- Default sort: Newest
- Filtering and sorting are client-side (no new API calls)

### 4.10 Template Preview Modal Logic
- Preview modal opens on Preview button click
- Modal displays:
  + Template name and emoji
  + Template description
  + Star rating interactive (click to rate 1-5 stars)
  + Clone count display
  + Share button
  + Step-by-step breakdown (read-only)
  + Clone to My Studio button
- User can rate template in modal by clicking stars
- Rating submission updates average rating and count
- User can click Share button to generate share link
- Clone to My Studio button clones template to user's pipelines
- Clone count increments after cloning

### 4.11 Existing Functionality Preserved
- All v25 features continue working
- Pipeline Builder list view and editor unchanged except for new Share button on template cards
- Template Library page structure unchanged except for new Share button
- Built-in templates (6 hardcoded) remain unchanged
- Pipeline sharing, export/import, execution logic unchanged
- Multi-persona group chat, AI chat, debate rooms, persona management unchanged
- Settings, contacts, system test unchanged

### 4.12 Creator Credit System Logic
- New Supabase table: `user_credits`
  + Fields: user_id (uuid PK), balance (int default 0), created_at, updated_at
  + RLS: users can read own row
- New Supabase table: `credit_transactions`
  + Fields: id (uuid), user_id, amount (int), type (enum: grant|purchase|deduct), reason (text), created_at
  + RLS: users can read own transactions
- Credit tiers (monthly, INR):
  + Starter: ₹0 — 50 conversations, 0 credits (free, no purchase)
  + Growth: ₹299 — 150 conversations, 300 credits
  + Pro: ₹799 — 450 conversations, 900 credits
  + Business: ₹1999 — 2000 conversations, 4000 credits
- Annual discount: 40% off (Growth ₹179, Pro ₹479, Business ₹1199)
- `deduct_credits` RPC:
  + Parameters: p_user_id (uuid), p_amount (int), p_reason (text)
  + Atomically decrements balance if sufficient
  + Logs transaction to credit_transactions with type='deduct'
  + Returns new balance or throws if insufficient
- `add_credits` RPC:
  + Parameters: p_user_id (uuid), p_amount (int), p_reason (text)
  + Atomically increments balance
  + Logs transaction to credit_transactions with type='grant'
- Tool auto-pause: if `user_credits.balance` <= 0, public tools display "Temporarily unavailable"

### 4.13 Stripe Payment Logic
- New Supabase table: `orders`
  + Fields: id (uuid), user_id (uuid), stripe_session_id (text), amount (numeric), currency (text default 'INR'), status (enum: pending|paid|failed), plan_name (text), created_at, updated_at
- New Supabase enum: `order_status` (pending, paid, failed)
- Edge Function `create_stripe_checkout`:
  + Deno runtime, uses Stripe API secret key
  + Accepts: plan_id, user_id, success_url, cancel_url
  + Maps plan_id to Stripe price ID based on monthly/annual
  + Creates Stripe checkout session with INR currency
  + Inserts order row with status='pending'
  + Returns checkout session URL
- Edge Function `verify_stripe_payment`:
  + Accepts: session_id
  + Retrieves Stripe session to verify payment_status='paid'
  + Updates order status to 'paid'
  + Calls `add_credits` RPC to grant credits to user
  + Returns success/failure JSON
- CreditsPage frontend:
  + Maps internal tier IDs to Stripe price IDs
  + Monthly: starter/growth/pro/business
  + Annual: tier.id_annual fields
  + Invokes create_stripe_checkout edge function on "Buy" click
  + Redirects browser to Stripe checkout URL
- PaymentSuccessPage frontend:
  + Extracts session_id from URL
  + Calls verify_stripe_payment edge function
  + Displays success/failure UI

### 4.14 Public Tool & QR Code Logic
- New Supabase table: `public_shares`
  + Fields: id (uuid), persona_id (uuid), share_token (text unique), is_active (boolean default true), created_at
  + RLS: anyone can read (for public tool page), authenticated users can insert/update own rows
- PersonaListPage (Creator):
  + Displays user's public personas
  + "Generate QR" button creates row in public_shares if not exists, returns share_token
  + QR code modal displays QR image + URL + download option
  + URL format: /tool/:shareToken
- PublicToolPage:
  + No authentication required
  + Fetches persona via share_token from public_shares
  + Checks `user_credits.balance` for persona owner before each message
  + If balance <= 0, shows "Tool temporarily unavailable" and disables input
  + Uses platform `PLATFORM_GEMINI_KEY` for AI responses
  + Calls `deduct_credits` RPC (1 credit per message) on owner account
  + Minimal UI: only chat bubbles + input + persona header

### 4.15 Creator Analytics Logic
- New Supabase table: `persona_stats`
  + Fields: id (uuid), persona_id (uuid), event_type (text), session_id (text), created_at
  + Event types: view, chat, message
- New Supabase view/table: `persona_stat_summary`
  + Aggregated per persona: total_views, total_chats, total_messages, unique_visitors
- New RPC `get_creator_analytics`:
  + Parameter: p_user_id (uuid)
  + Aggregates persona_stats for all personas owned by user
  + Groups by DATE(created_at) and event_type
  + Returns JSON array of daily buckets for last 30 days
  + Each bucket contains: date, views, chats, messages
- CreatorDashboardPage frontend:
  + Calls get_creator_analytics RPC on load
  + Renders Recharts AreaChart with 14 days of data
  + Two series: Views (primary gradient) and Chats (secondary gradient)
  + Stat cards sum totals from persona_stat_summary
  + Responsive grid layout

### 4.16 B2B Execution Engine Logic
- Edge Function `execute_b2b_task`:
  + Deno runtime, Gemini API with `responseSchema` enforcement
  + Accepts: taskType, input, model (default gemini-1.5-flash)
  + Task types:
    - bug_fixer: Returns JSON with { tickets[], patches[], prompts[] }
    - marketing: Returns JSON with { variants[], seo_keywords[], ab_test_plan }
    - code_optimizer: Returns JSON with { refactored_code, performance_notes[], security_warnings[] }
  + System instruction defines dual-agent persona (Agent A + Agent B)
  + `generationConfig.responseSchema` enforces strict JSON output
  + Credit check: requires 5 credits; returns 402 if insufficient
  + On success: calls `deduct_credits` RPC with reason='B2B Execution Engine'
- B2BTaskPage frontend:
  + Three task template cards with selection state
  + Textarea for raw input (placeholder text varies by template)
  + Execute button invokes execute_b2b_task edge function
  + Loading state with spinner
  + Structured renderers per task type:
    - Bug Fixer: Ticket cards (title, description, priority badge) + Code patch blocks (file_path, code, explanation)
    - Marketing / Code: Formatted JSON code block
  + Error handling: 402 insufficient credits redirects to top-up prompt

## 5. Exception & Boundary Cases

| Scenario | Handling |
|----------|----------|
| User clicks Share button but share link generation fails | Display error toast, allow retry |
| Share link copied to clipboard but clipboard API fails | Display error toast with manual copy option |
| User opens share link but shareToken not found | Display 404 page with link to Template Library |
| User opens share link but template deleted | Display error message: Template no longer available |
| Anonymous user clicks Clone to My Studio on share page | Redirect to login page, after login clone template |
| User clicks Clone to My Studio but clone fails | Display error toast, allow retry |
| Share page fails to load template data | Display loading skeleton, show error message after timeout |
| Share page star rating submission fails | Display error toast, allow retry |
| Share page clone count display fails | Display 0 clone count |
| User shares built-in template multiple times | Generate new share_token each time |
| User shares user template multiple times | Generate new share_token each time |
| Share link accessed on mobile device | Display responsive mobile layout |
| Share link accessed on desktop | Display responsive desktop layout |
| Share page SEO title fails to render | Use default title: Forge Template |
| template_shares table insert fails | Display error toast, allow retry |
| template_shares table read fails | Display error message on share page |
| getSharedTemplate returns null | Display 404 page |
| shareBuiltinTemplate called with invalid templateSlug | Display error toast |
| shareUserTemplate called with invalid pipelineId | Display error toast |
| User clicks Share button on deleted template | Display error toast: Template not found |
| Share button icon fails to load | Display Share text without icon |
| Success toast with share URL too long | Truncate URL in toast, full URL in clipboard |
| Supabase client not initialized | Display error message, prevent app load |
| VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing | Display error message, prevent app load |
| pipelineService.getTemplates() fails | Display error message in My Templates section |
| useTemplateRatings hook fails to read ratings | Display 0.0 rating with 0 count |
| useTemplateRatings hook fails to write rating | Display error toast, allow retry |
| increment_builtin_clone_count RPC fails | Log error, display current count without increment |
| agent_pipelines.clone_count update fails | Log error, display current count without increment |
| template_usage table query fails | Display 0 clone count, log error |
| pipelineService.createPipeline fails to pass fields | Display error toast, prevent pipeline creation |
| AgentStudioPage Save as Template fails to set fields | Display error toast, prevent template save |
| TemplateLibraryPage My Templates tab fails to load | Display error message, show built-in templates only |
| Sort by Most Used fails to query clone_count | Display templates unsorted |
| Page-level drag-drop fails to trigger import modal | Fallback to file picker button |
| TemplateImportModal fails to create pipeline | Display error toast, allow retry |
| StarRating component fails to display half-stars | Display filled/empty stars only |
| useTemplateRatings upsert conflict target incorrect | Display error toast, log error |
| AgentPipeline interface missing fields | TypeScript compilation error, prevent build |
| User clicks Save as Template without selecting category | Display error message: Select a category |
| User tries to edit another user's template | Hide Edit button, show error if accessed directly |
| User tries to delete another user's template | Hide Delete button, show error if accessed directly |
| User deletes template that has been cloned by others | Template removed from library, cloned pipelines remain |
| User rates template multiple times | Update existing rating (upsert by fingerprint + template_id) |
| User fingerprint not found in localStorage | Generate new UUID and store in localStorage |
| Rating submission fails | Display error toast, allow retry |
| Average rating calculation fails | Display 0.0 rating, log error |
| User imports JSON with invalid structure | Display error message: Invalid JSON file format |
| User imports JSON with missing required fields | Display error message: JSON file missing required fields |
| User imports JSON file larger than 1MB | Display error message: File size too large, maximum 1MB |
| User imports JSON with non-existent persona names | Display warning, allow import with missing personas |
| User drags non-JSON file onto Template Library page | Display error message: Only JSON files supported |
| Export button clicked but export fails | Display error toast, allow retry |
| Clone count increment fails | Log error, display current count without increment |
| Template Library fails to load templates | Display loading skeleton, show error message after timeout |
| My Templates section empty | Display empty state: No templates yet, create your first template |
| Sort dropdown selection fails to apply | Display all templates unsorted, show error message |
| User clicks Import Template but cancels file picker | No action, close file picker |
| Import modal preview fails to render | Display error message in modal, provide close button |
| User clicks Import as Template but import fails | Display error toast, allow retry |
| Template card star rating display fails to render | Display 0.0 rating with 0 count |
| User clicks star to rate but submission fails | Display error toast, allow retry |
| Clone to My Studio button clicked but clone fails | Display error toast, allow retry |
| User templates section fails to load | Display error message, show built-in templates only |
| Built-in templates section fails to load | Display error message, show user templates only |
| Category picker modal fails to open | Display error toast, allow retry |
| User selects category but save fails | Display error toast, allow retry |
| Template badge (Imported) fails to display | Display template without badge |
| GitFork icon fails to load | Display clone count without icon |
| User fingerprint generation fails | Use fallback anonymous identifier |
| template_ratings table query fails | Display 0.0 rating with 0 count, log error |
| template_usage table query fails | Display 0 clone count, log error |
| User tries to import template while offline | Display error message: No internet connection |
| User tries to rate template while offline | Display error message: No internet connection |
| User tries to export template while offline | Allow export (client-side operation) |
| Drag-and-drop zone fails to detect file drop | Fallback to file picker button |
| Template preview modal fails to close | Provide close button and ESC key handler |
| Sort dropdown fails to render | Display templates unsorted |
| Category filter tabs fail to render | Display all templates without filters |
| Search bar fails to filter | Display all templates without search |
| User templates and built-in templates have same name | Differentiate by section (My Templates vs Built-in) |
| User creates template with empty name | Display error message: Template name required |
| User creates template with empty description | Allow empty description |
| User creates template with no steps | Display error message: Template must have at least 1 step |
| User imports template with empty steps array | Display error message: Template must have at least 1 step |
| User exports template but download fails | Display error toast, allow retry |
| User clicks Edit button but pipeline not found | Display error message: Pipeline not found |
| User clicks Delete button but deletion fails | Display error toast, allow retry |
| Delete confirmation dialog fails to open | Display error toast, allow retry |
| User confirms delete but deletion fails | Display error toast, allow retry |
| Template card hover effect fails | Display card without hover effect |
| Template card lift animation stutters | Reduce animation complexity |
| Glassmorphism effect not supported in browser | Fallback to solid background |
| Star rating animation stutters | Reduce animation complexity |
| Import modal backdrop fails to render | Display modal without backdrop |
| Success toast notification fails to display | Log success message to console |
| Error toast notification fails to display | Log error message to console |
| Share page gradient header fails to render | Fallback to solid background |
| Share page responsive layout breaks on mobile | Fallback to single column layout |
| Share page responsive layout breaks on desktop | Fallback to centered layout |
| Share page action buttons fail to render | Display text links instead |
| Share page step-by-step breakdown fails to render | Display error message |
| Share page category badge fails to render | Display category as text |
| Share page tags display fails to render | Hide tags section |
| Share page Clone to My Studio redirects to wrong page | Display error message, provide manual navigation link |
| Share page View Template Library button fails | Display error message, provide manual navigation link |
| Routes conflict between /studio/template-share/:shareToken and /studio/:pipelineId | Ensure /studio/template-share/:shareToken route defined BEFORE /studio/:pipelineId |
| User has 0 credits and tries to use public tool | Display "Tool temporarily unavailable" message, disable chat input |
| User has insufficient credits for B2B execution | Return 402 error, display top-up prompt |
| Stripe checkout creation fails | Display error toast, log to console, allow retry |
| Stripe payment verification fails | Display error on PaymentSuccessPage with contact support link |
| Invalid Stripe session_id in URL | Display "Invalid or expired session" error |
| Creator has no public personas | CreatorDashboard shows empty state with CTA to create persona |
| get_creator_analytics RPC returns empty data | Chart shows empty state, stat cards show 0 |
| QR code generation fails | Display error toast, allow retry |
| Public tool share_token is invalid or deleted | Redirect to 404 or "Tool not found" page |
| Platform Gemini key missing | Public tools show "Service unavailable" fallback |
| deduct_credits RPC throws insufficient balance | Frontend catches error, shows credit top-up CTA |
| add_credits RPC called with invalid user_id | Log error, do not grant credits |
| B2B task input is empty | Frontend validation blocks submission, shows error |
| B2B task Gemini returns malformed JSON | Fallback to raw JSON renderer, log warning |
| Annual plan ID mapping missing in frontend | Default to monthly plan, log error |
| User navigates to /payment-success without session_id | Display "Missing session" error state |

## 6. Acceptance Criteria

1. template_shares table created in Supabase with fields: id, template_id, template_type, share_token, pipeline_id, created_at
2. template_shares RLS policy allows anyone to read, authenticated users to insert
3. templateShareService created with shareBuiltinTemplate, shareUserTemplate, getSharedTemplate methods
4. shareBuiltinTemplate inserts row with template_type='builtin', returns share_token
5. shareUserTemplate inserts row with template_type='user', returns share_token
6. getSharedTemplate fetches template data by share_token
7. Share button added to each template card (built-in and user) with Link icon
8. Share button added to template preview modal with Link icon
9. Clicking Share button generates share link via templateShareService
10. Share link copied to clipboard automatically
11. Success toast displayed with share URL after generating link
12. Share link format: https://forge.app/studio/template-share/:shareToken
13. Public share page route added at /studio/template-share/:shareToken
14. Public share page route defined BEFORE /studio/:pipelineId to avoid conflict
15. Public share page fully public (no authentication required)
16. Public share page displays template name and emoji
17. Public share page displays category badge
18. Public share page displays amber/violet gradient header
19. Public share page displays template description
20. Public share page displays star rating average and count (read-only)
21. Public share page displays clone count with GitFork icon
22. Public share page displays tags
23. Public share page displays interactive star rating (anonymous)
24. Public share page displays step-by-step breakdown (read-only)
25. Public share page displays Clone to My Studio button
26. Public share page displays View Template Library button
27. Public share page fully responsive (mobile + desktop)
28. Public share page SEO-friendly title using template name
29. Anonymous user can rate template on share page using fingerprint
30. Clone to My Studio button clones template as new pipeline
31. If user not logged in, Clone to My Studio redirects to login page
32. After login, template cloned and user redirected to /studio/:pipelineId
33. Clone count increments after cloning on share page
34. View Template Library button navigates to /studio/templates
35. Supabase client initialized with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
36. pipelineService.getTemplates() filters is_template=true pipelines
37. useTemplateRatings hook reads/writes to template_ratings table
38. useTemplateRatings upsert uses conflict target: template_id, user_fingerprint
39. Clone counts for built-in templates use increment_builtin_clone_count RPC
40. Clone counts for user templates update agent_pipelines.clone_count
41. template_usage table seeded with all 6 built-in template slugs
42. pipelineService.createPipeline passes emoji, category, clone_count, template_type fields
43. AgentStudioPage Save as Template sets is_template=true, template_type='user', category, emoji
44. TemplateLibraryPage My Templates tab loads from Supabase via getTemplates
45. Sort by Most Used uses clone_count from DB for user templates
46. Sort by Most Used uses template_usage for built-in templates
47. Page-level drag-drop on TemplateLibraryPage triggers import modal
48. TemplateImportModal creates pipeline with is_template=true, template_type='imported'
49. StarRating component displays half-stars using SVG linearGradient
50. AgentPipeline interface includes emoji, category, clone_count fields
51. Share button has electric violet accent
52. Share button has Link icon
53. Success toast displays share URL
54. Share page gradient header matches template library aesthetic
55. Share page uses dark-first editorial aesthetic
56. Share page uses electric violet accent on interactive elements
57. Share page uses glassmorphism effect on cards
58. Share page responsive grid layout for mobile and desktop
59. Share page star rating display uses filled/half/empty stars
60. Share page interactive star rating has hover effect
61. Share page clone count uses GitFork icon
62. Share page category badge uses appropriate color
63. Share page step cards display persona name and instruction
64. Share page action buttons have distinct styling
65. Share page Clone to My Studio button works correctly
66. Share page View Template Library button works correctly
67. Share page handles deleted templates with error message
68. Share page handles invalid shareToken with 404 page
69. Share page handles anonymous user clone with login redirect
70. Share page handles clone failure with error toast
71. Share page handles rating submission failure with error toast
72. Share page handles loading failure with error message
73. Share button on template card generates unique share_token
74. Share button in preview modal generates unique share_token
75. Multiple shares of same template generate different share_tokens
76. Share link works on mobile devices
77. Share link works on desktop devices
78. Share page SEO title renders correctly
79. Share page handles missing template data gracefully
80. Share page handles network errors gracefully
81. All v25 features continue working
82. Pipeline Builder list view unchanged
83. Pipeline Builder editor unchanged except Share button
84. Template Library page structure unchanged except Share button
85. Built-in templates (6 hardcoded) remain unchanged
86. Pipeline sharing logic unchanged
87. Pipeline export/import logic unchanged
88. Pipeline execution logic unchanged
89. Multi-persona group chat unchanged
90. AI chat unchanged
91. Debate rooms unchanged
92. Persona management unchanged
93. Credits and pricing unchanged
94. API key management unchanged
95. Settings unchanged
96. Dashboard unchanged
97. Sidebar navigation unchanged
98. Onboarding unchanged
99. Template rating system unchanged
100. Template import/export unchanged
101. Template usage tracking unchanged
102. Template filtering and sorting unchanged
103. Template preview modal unchanged except Share button
104. User template creation unchanged
105. User template management unchanged
106. User template editing unchanged
107. User template deletion unchanged
108. Clone to My Studio functionality unchanged
109. Use Template functionality unchanged
110. Star rating display unchanged
111. Clone count display unchanged
112. Category filter tabs unchanged
113. Search bar unchanged
114. Sort dropdown unchanged
115. My Templates section unchanged except Share button
116. Built-in Templates section unchanged except Share button
117. Template cards unchanged except Share button
118. Empty state unchanged
119. Loading skeleton unchanged
120. Error handling unchanged
121. Success notifications unchanged
122. Error notifications unchanged
123. Responsive layout unchanged
124. Mobile layout unchanged
125. Desktop layout unchanged
126. Dark-first aesthetic unchanged
127. Electric violet accent unchanged
128. Glassmorphism effect unchanged
129. Animation effects unchanged
130. Hover effects unchanged
131. Click effects unchanged
132. Keyboard navigation unchanged
133. Accessibility unchanged
134. Performance unchanged
135. Security unchanged
136. Privacy unchanged
137. Data integrity unchanged
138. Database schema unchanged except template_shares table
139. RLS policies unchanged except template_shares
140. API endpoints unchanged
141. Service methods unchanged except templateShareService
142. React components unchanged except Share button additions
143. TypeScript types unchanged except SharedTemplateData
144. Routing unchanged except /studio/template-share/:shareToken
145. State management unchanged
146. Context providers unchanged
147. Custom hooks unchanged except templateShareService usage
148. Utility functions unchanged
149. Constants unchanged
150. Environment variables unchanged
151. Build configuration unchanged
152. Deployment process unchanged
153. Testing unchanged
154. Documentation unchanged
155. Code style unchanged
156. Linting rules unchanged
157. Formatting rules unchanged
158. Git workflow unchanged
159. CI/CD pipeline unchanged
160. Monitoring unchanged
161. `user_credits` table created with user_id PK, balance, created_at, updated_at
162. `credit_transactions` table created with id, user_id, amount, type, reason, created_at
163. `orders` table created with id, user_id, stripe_session_id, amount, currency, status, plan_name, created_at, updated_at
164. `order_status` enum created (pending, paid, failed)
165. `public_shares` table created with id, persona_id, share_token, is_active, created_at
166. `persona_stats` table created with id, persona_id, event_type, session_id, created_at
167. `persona_stat_summary` view/table created for aggregated stats
168. `deduct_credits` RPC atomically decrements balance and logs transaction
169. `add_credits` RPC atomically increments balance and logs transaction
170. `get_creator_analytics` RPC returns 30-day time-series JSON by event_type
171. `create_stripe_checkout` Edge Function creates Stripe session with INR currency
172. `verify_stripe_payment` Edge Function verifies session and calls add_credits
173. `execute_b2b_task` Edge Function enforces JSON schema output via Gemini
174. CreditsPage displays 4 tiers with monthly/annual toggle
175. CreditsPage maps annual plans to `_annual` Stripe price IDs
176. CreditsPage invokes create_stripe_checkout and redirects to Stripe URL
177. PaymentSuccessPage extracts session_id and calls verify_stripe_payment
178. CreatorDashboardPage displays stat cards with total views/chats/visitors/messages
179. CreatorDashboardPage renders Recharts AreaChart with 14-day data
180. CreatorDashboardPage calls get_creator_analytics RPC
181. PersonaListPage generates QR codes via public_shares table
182. PublicToolPage loads persona by share_token without authentication
183. PublicToolPage uses PLATFORM_GEMINI_KEY for responses
184. PublicToolPage deducts 1 credit per message from creator balance
185. PublicToolPage auto-pauses when creator balance <= 0
186. B2BTaskPage displays 3 task templates with selection state
187. B2BTaskPage sends taskType and input to execute_b2b_task
188. B2BTaskPage deducts 5 credits per execution
189. B2BTaskPage renders structured output for bug_fixer (tickets, patches, prompts)
190. B2BTaskPage renders raw JSON fallback for unrecognised output
191. Dashboard quick-start card includes B2B Execution entry
192. All lint checks pass with zero errors

## 7. Out of Scope for Current Release

- Template share link expiration dates
- Template share link password protection
- Template share link access logs
- Template share link analytics (views, clones over time)
- Template share link custom URLs
- Template share link QR code generation
- Template share link short URL generation
- Template share link social media preview cards
- Template share link embedding in external sites
- Template share link revocation or deletion
- Template share link edit permissions
- Template share link comment threads
- Template share link version history
- Template share link collaborative editing
- Template share link real-time updates
- Template share link notifications
- Template share link email sharing
- Template share link SMS sharing
- Template share link WhatsApp sharing
- Template share link Slack sharing
- Template share link Discord sharing
- Template share link Twitter sharing
- Template share link Facebook sharing
- Template share link LinkedIn sharing
- Template versioning or rollback
- Template collaboration or co-editing
- Template comments or discussions
- Template marketplace with payments
- Template licensing or copyright management
- Template analytics dashboard (views, clones over time)
- Template recommendations based on user behavior
- Template categories beyond Research, Writing, Code, Other
- Template tags beyond category
- Template search by tags
- Template advanced filtering (by rating range, clone count range, date range)
- Template bulk actions (delete multiple, export multiple)
- Template folders or collections
- Template sharing via social media
- Template API for third-party integrations
- Template import from URLs
- Template export to formats other than JSON (YAML, XML)
- Template validation beyond basic structure checks
- Template preview before import (beyond name and step count)
- Template diff view (compare two templates)
- Template merge or combine functionality
- Template duplication detection
- Template moderation or reporting system
- Template featured or promoted section
- Template trending or popular section
- Template recently viewed history
- Template bookmarking or favorites
- Template notifications (new templates, updates)
- Template subscriptions (follow template creators)
- Template leaderboard (top creators, top rated)
- Template badges or achievements
- Template gamification (points, levels)
- Template AI-powered suggestions
- Template auto-categorization
- Template auto-tagging
- Template sentiment analysis
- Template quality scoring
- Template performance metrics
- Template A/B testing
- Template localization or multi-language support
- Template accessibility audit beyond WCAG AA
- Template mobile app native features
- Template offline mode
- Template PWA capabilities
- Template voice commands
- Template keyboard shortcuts beyond standard
- Template dark/light mode toggle per template
- Template custom themes
- Template white-label or custom branding
- Template export as video or presentation
- Template print-friendly view
- Template citation or references
- Template changelog or version history
- Template auto-save drafts
- Template scheduled publishing
- Template approval workflow
- Template review process
- Template quality assurance checks
- Template automated testing
- Template CI/CD integration
- Template deployment automation
- Template monitoring and alerting
- Template performance optimization
- Template caching strategies
- Template CDN integration
- Template database indexing optimization
- Template query optimization
- Template load balancing
- Template horizontal scaling
- Template disaster recovery
- Template backup and restore
- Template data migration tools
- Template import/export to other platforms
- Template integration with external tools (Zapier, IFTTT)
- Template webhooks for events
- Template REST API
- Template GraphQL API
- Template SDK for developers
- Template CLI tool
- Template browser extension
- Template desktop app
- Template mobile app (iOS/Android)
- Template watch app
- Template TV app
- Template VR/AR experience
- Automatic monthly credit renewal (cron job)
- Credit rollover between months
- Team/organization credit pooling
- Credit gifting between users
- Credit withdrawal or cash-out
- Subscription cancellation portal
- Invoice generation and tax handling
- GST/VAT calculation on Stripe checkout
- Webhook-based real-time order updates
- Public tool custom domains or white-labeling
- Public tool password protection
- Public tool usage rate limiting per IP
- Public tool analytics for consumers (not just creators)
- B2B task scheduling or cron execution
- B2B task batch processing (multiple inputs at once)
- B2B task webhooks for async completion
- B2B task result persistence in database
- B2B task versioning or history
- B2B task collaboration or multi-user editing
- B2B task API for third-party integrations
- B2B task SDK or CLI tool
- Advanced analytics (cohort retention, funnel analysis, revenue tracking)
- Creator payouts or revenue sharing
- In-app messaging between creators and consumers
- Multi-currency support beyond INR
- Cryptocurrency payment options
- PayPal or other payment gateway integration
- In-app purchase via mobile app stores
- Affiliate or referral program for credit purchases
- AI-powered credit usage recommendations
- Dynamic pricing based on demand
- Credit usage alerts via email/SMS
- Credit auto-top-up on low balance
- Admin dashboard for platform management
- Content moderation for public tools
- Abuse detection and automatic suspension
- GDPR data export/deletion workflows
- Custom AI model training per persona
- Voice input/output for public tools
- Image generation in public tools
- Real-time streaming for B2B tasks
- B2B task result diff viewer
- B2B task result export to Jira/GitHub/Notion
- B2B task result email delivery
- Mobile native app for B2B engine
- Browser extension for B2B engine
- Desktop app for B2B engine
- B2B engine white-label for enterprises