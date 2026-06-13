import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Zap, CheckCircle2, Sparkles, Clock, TrendingUp,
  ShieldCheck, RefreshCw, Plus, ChevronDown, XCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreditPlan {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
  popular: boolean;
}

interface UserCredits {
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface CreditTransaction {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
}

// ─── Static tier definitions (shown when no DB plans exist) ──────────────────

const STATIC_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 100,
    creditsLabel: '100 credits / mo',
    popular: false,
    cta: 'Get Started Free',
    features: [
      '100 AI message credits',
      'Access to all personas',
      'Public gallery browsing',
      'Basic chat history',
    ],
    missing: ['Multi-model access', 'Memory across chats', 'Creator dashboard'],
  },
  {
    id: 'creator_basic',
    name: 'Creator Basic',
    monthlyPrice: 299,
    annualPrice: 249,
    credits: 1000,
    creditsLabel: '1,000 credits / mo',
    popular: false,
    cta: 'Start Basic',
    features: [
      '1,000 AI message credits',
      'Multi-model (GPT, Gemini, Claude)',
      'Memory across chats',
      'Creator dashboard & analytics',
      'Share Public Tools',
    ],
    missing: ['Priority support', 'Debate room hosting'],
  },
  {
    id: 'creator_pro',
    name: 'Creator Pro',
    monthlyPrice: 799,
    annualPrice: 699,
    credits: 5000,
    creditsLabel: '5,000 credits / mo',
    popular: true,
    cta: 'Start Pro',
    features: [
      '5,000 AI message credits',
      'All Basic features',
      'Priority support',
      'Debate room hosting',
      'Custom tool avatars',
    ],
    missing: [],
  },
  {
    id: 'creator_ultra',
    name: 'Creator Ultra',
    monthlyPrice: 1999,
    annualPrice: 1799,
    credits: 20000,
    creditsLabel: '20,000 credits / mo',
    popular: false,
    cta: 'Go Ultra',
    features: [
      '20,000 AI message credits',
      'All Pro features',
      'Advanced tool analytics',
      'White-label public pages',
      'API access (coming soon)',
      'Dedicated support',
    ],
    missing: [],
  },
];

const FAQ_ITEMS = [
  {
    q: 'Do credits expire?',
    a: 'No. Credits you purchase never expire and roll over month to month.',
  },
  {
    q: 'What counts as one credit?',
    a: 'Each AI message sent (in chat, debate rooms, or public persona pages) costs one credit. Image generation costs 5 credits.',
  },
  {
    q: 'Can I switch plans?',
    a: 'Yes — you can upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle.',
  },
  {
    q: 'Is there a free trial?',
    a: 'The Starter plan is free forever with 100 credits per month. No credit card required.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit/debit cards (Visa, Mastercard, Amex) and Apple Pay via Stripe.',
  },
];

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('faq-item', open && 'border-primary/40')}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <div className={cn('faq-answer px-5', open && 'open pb-4')}>
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function StaticPlanCard({
  tier,
  annual,
  onBuy,
  buyingId,
}: {
  tier: typeof STATIC_TIERS[number];
  annual: boolean;
  onBuy: (id: string) => void;
  buyingId: string | null;
}) {
  const price = annual ? tier.annualPrice : tier.monthlyPrice;
  const loading = buyingId === tier.id;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border transition-all duration-200 h-full',
        tier.popular
          ? 'pricing-card-pro shadow-[0_0_40px_hsl(var(--primary)/0.18)] scale-[1.03] border-transparent'
          : 'border-border hover:border-primary/30 hover:shadow-[0_4px_24px_hsl(var(--primary)/0.08)]',
      )}
    >
      {/* Popular badge above card */}
      {tier.popular && (
        <div className="absolute -top-4 inset-x-0 flex justify-center z-10">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 52%))' }}
          >
            <Sparkles className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}

      <div className={cn('p-6 flex flex-col flex-1', tier.popular && 'pt-7')}>
        {/* Tier header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={
              tier.popular
                ? { background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 52%))' }
                : undefined
            }
            {...(!tier.popular ? { className: 'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20' } : {})}
          >
            <Zap className={cn('h-4 w-4', tier.popular ? 'text-white' : 'text-primary')} />
          </div>
          <div>
            <h3 className="font-bold text-base">{tier.name}</h3>
            <p className="text-[11px] text-muted-foreground">{tier.creditsLabel}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1.5">
            {price === 0 ? (
              <span className="text-4xl font-bold tracking-tight">₹0</span>
            ) : (
              <>
                <span className="text-4xl font-bold tracking-tight">₹{price}</span>
                <span className="text-muted-foreground text-sm">/ mo</span>
              </>
            )}
          </div>
          {annual && price > 0 && (
            <p className="text-xs text-primary font-medium mt-1">
              Billed ₹{price * 12}/yr — save up to 25%
            </p>
          )}
          {!annual && price > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Or ₹{tier.annualPrice}/mo billed annually
            </p>
          )}
        </div>

        {/* Feature list */}
        <ul className="space-y-2.5 mb-6 flex-1">
          {tier.features.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
          {tier.missing.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/60">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5 opacity-40" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() => onBuy(annual ? `${tier.id}_annual` : tier.id)}
          disabled={loading || tier.id === 'starter'}
          variant={tier.popular ? 'default' : tier.id === 'starter' ? 'outline' : 'default'}
          className={cn(
            'w-full h-10 font-semibold',
            tier.popular && 'shadow-[0_4px_20px_hsl(var(--primary)/0.35)]',
          )}
        >
          {loading ? 'Opening Checkout…' : tier.cta}
        </Button>
      </div>
    </div>
  );
}

// ─── DB Plan Card (fallback when DB plans exist) ──────────────────────────────

function DbPlanCard({ plan, onBuy, loading }: {
  plan: CreditPlan;
  onBuy: (planId: string) => void;
  loading: boolean;
}) {
  const dollarAmt = (plan.price_cents / 100).toFixed(2);

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-200',
      plan.popular
        ? 'pricing-card-pro border-transparent shadow-[0_0_40px_hsl(var(--primary)/0.18)] scale-[1.02]'
        : 'border-border hover:border-primary/40',
    )}>
      {plan.popular && (
        <div className="absolute -top-4 inset-x-0 flex justify-center z-10">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 52%))' }}
          >
            <Sparkles className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}
      <div className={cn('p-6 flex flex-col flex-1', plan.popular && 'pt-7')}>
        <div className="flex items-center gap-2 mb-4">
          <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center',
            plan.popular ? 'bg-gradient-to-br from-primary to-[hsl(316_70%_52%)]' : 'bg-primary/10 border border-primary/20'
          )}>
            <Zap className={cn('h-4 w-4', plan.popular ? 'text-white' : 'text-primary')} />
          </div>
          <h3 className="font-bold text-lg">{plan.name}</h3>
        </div>
        <div className="flex items-baseline gap-1 mb-5">
          <span className="text-4xl font-bold tracking-tight">${dollarAmt}</span>
          <span className="text-muted-foreground text-sm">one-time</span>
        </div>
        <ul className="space-y-2.5 mb-6 flex-1">
          {[
            `${plan.credits.toLocaleString()} AI message credits`,
            'Works with all models',
            'Credits never expire',
          ].map(f => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />{f}
            </li>
          ))}
        </ul>
        <Button
          onClick={() => onBuy(plan.id)}
          disabled={loading}
          variant={plan.popular ? 'default' : 'outline'}
          className="w-full h-10 font-semibold"
        >
          {loading ? 'Opening Checkout…' : `Buy ${plan.name}`}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);

  const load = useCallback(async () => {
    const [plansRes, creditsRes, txRes] = await Promise.all([
      supabase.from('credit_plans').select('*').order('price_cents'),
      supabase.from('user_credits').select('balance,total_earned,total_spent').maybeSingle(),
      supabase.from('credit_transactions').select('id,delta,reason,created_at').order('created_at', { ascending: false }).limit(10),
    ]);
    if (plansRes.data) setPlans(plansRes.data as CreditPlan[]);
    if (creditsRes.data) setCredits(creditsRes.data as UserCredits);
    if (txRes.data) setTransactions(txRes.data as CreditTransaction[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (planId: string) => {
    setBuyingId(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create_stripe_checkout', {
        body: { planId },
      });
      if (error) {
        const msg = await error?.context?.text?.();
        toast.error('Checkout failed', { description: msg || 'Please add your STRIPE_SECRET_KEY.' });
        return;
      }
      if (data?.data?.url) window.open(data.data.url, '_blank');
    } catch {
      toast.error('Checkout failed — check Stripe configuration.');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky nav */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <h1 className="font-bold truncate">Credits & Plans</h1>
          </div>
          {credits !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 shrink-0">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">{credits.balance.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">credits</span>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, hsl(262 90% 66% / 0.1) 0%, hsl(316 70% 58% / 0.06) 50%, transparent 100%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)/0.2) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.2) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
          }} />
        <div className="relative max-w-5xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-semibold mb-4">
            <Zap className="h-3.5 w-3.5" />
            Simple, transparent pricing
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance mb-3">
            Power up your <span className="gradient-text">Forge experience</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-pretty leading-relaxed mb-6">
            Credits fuel every AI message, debate room, and public persona. Start free — upgrade when you're ready.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-border bg-muted">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                !annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Annual
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/25">
                Save 25%
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-6">
          {plans.length > 0
            ? plans.map(plan => (
                <DbPlanCard
                  key={plan.id}
                  plan={plan}
                  onBuy={handleBuy}
                  loading={buyingId === plan.id}
                />
              ))
            : STATIC_TIERS.map(tier => (
                <StaticPlanCard
                  key={tier.id}
                  tier={tier}
                  annual={annual}
                  onBuy={handleBuy}
                  buyingId={buyingId}
                />
              ))
          }
        </div>

        {/* Trust row */}
        <div className="trust-row py-2">
          {[
            { icon: <ShieldCheck className="h-3.5 w-3.5 text-primary" />, label: 'SSL Secured' },
            { icon: <RefreshCw className="h-3.5 w-3.5 text-primary" />, label: 'Cancel Anytime' },
            { icon: <Zap className="h-3.5 w-3.5 text-primary" />, label: 'Instant Access' },
            { icon: <Plus className="h-3.5 w-3.5 text-primary" />, label: 'Credits Never Expire' },
          ].map(t => (
            <span key={t.label} className="trust-item">
              {t.icon}
              <span>{t.label}</span>
            </span>
          ))}
        </div>

        {/* Balance + history */}
        {credits !== null && (
          <div className="space-y-6 animate-fade-up">
            <h3 className="text-lg font-bold">Your Balance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: <Zap className="h-4 w-4" />,        label: 'Current Balance', value: credits.balance },
                { icon: <TrendingUp className="h-4 w-4" />, label: 'Total Earned',    value: credits.total_earned },
                { icon: <Sparkles className="h-4 w-4" />,   label: 'Total Spent',     value: credits.total_spent },
              ].map(s => (
                <div key={s.label} className="forge-card p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">{s.icon}</div>
                  <div>
                    <p className="text-xl font-bold">{s.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction history */}
        {transactions.length > 0 && (
          <div className="forge-card overflow-hidden animate-fade-up-delay-1">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Recent Transactions</h3>
            </div>
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium capitalize">{tx.reason.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={cn('font-bold text-sm', tx.delta > 0 ? 'text-success' : 'text-destructive')}>
                  {tx.delta > 0 ? '+' : ''}{tx.delta.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* FAQ */}
        <div className="space-y-4 animate-fade-up-delay-2">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">Frequently Asked Questions</h3>
            <p className="text-muted-foreground text-sm">Everything you need to know about Forge credits.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {FAQ_ITEMS.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
