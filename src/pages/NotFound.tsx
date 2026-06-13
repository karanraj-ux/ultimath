import { Link } from 'react-router-dom';
import { Bot, Home, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="hero-mesh min-h-screen bg-background flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(hsl(var(--border)/0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 80%)',
        }}
      />

      <div className="relative z-10 animate-fade-up">
        {/* Glowing logo */}
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className="absolute inset-0 rounded-3xl blur-3xl opacity-40 scale-150"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }} />
          <div className="relative h-24 w-24 rounded-3xl flex items-center justify-center shadow-[0_0_60px_hsl(var(--primary)/0.4)]"
            style={{ background: 'linear-gradient(135deg, hsl(262 90% 66%), hsl(316 70% 58%))' }}>
            <Bot className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* 404 number */}
        <div className="mb-4">
          <span className="text-[120px] font-bold leading-none gradient-text glow-title select-none">
            404
          </span>
        </div>

        <h1 className="text-2xl font-bold mb-3 text-balance">Page not found</h1>
        <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto text-pretty leading-relaxed">
          This page doesn't exist or was moved. Let's get you back to building something great.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/">
            <Button className="gap-2 h-10 px-6" style={{ background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(316 70% 52%))', color: 'white' }}>
              <Home className="h-4 w-4" />
              Back to Forge
            </Button>
          </Link>
          <Link to="/personas">
            <Button variant="outline" className="gap-2 h-10 px-6">
              <Sparkles className="h-4 w-4" />
              Browse Personas
            </Button>
          </Link>
        </div>

        <p className="mt-12 text-xs text-muted-foreground/50">
          Forge · Beta
        </p>
      </div>
    </div>
  );
}
