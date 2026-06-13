import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus('failed');
      setErrorMsg('No checkout session found.');
      return;
    }

    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    async function verifyPayment() {
      try {
        const { data, error } = await supabase.functions.invoke('verify_stripe_payment', {
          body: { sessionId },
        });

        if (error) {
          const text = await error.context?.text?.();
          throw new Error(text || 'Verification failed');
        }

        if (data?.data?.verified && data?.data?.status === 'paid') {
          setStatus('success');
          setCreditsAdded(data.data.creditsAdded);
          toast.success('Payment successful! Credits have been added to your account.');
        } else {
          setStatus('failed');
          setErrorMsg('Payment could not be verified. It might still be processing.');
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setStatus('failed');
        setErrorMsg(err.message || 'An error occurred while verifying your payment.');
      }
    }

    verifyPayment();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="forge-card max-w-md w-full p-8 text-center flex flex-col items-center">
        {status === 'loading' && (
          <>
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verifying Payment...</h1>
            <p className="text-sm text-muted-foreground text-pretty">
              Please wait while we confirm your transaction with Stripe. Do not close this page.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-16 w-16 rounded-full bg-success/15 border-4 border-success/30 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-sm text-muted-foreground text-pretty mb-6">
              Thank you for your purchase. Your account has been updated with{' '}
              <strong className="text-foreground">{creditsAdded?.toLocaleString()} credits</strong>.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Button onClick={() => navigate('/dashboard')} className="w-full font-semibold gap-2 h-11">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/credits')} className="w-full">
                View Receipt & Billing
              </Button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="h-16 w-16 rounded-full bg-destructive/15 border-4 border-destructive/30 flex items-center justify-center mb-6">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
            <p className="text-sm text-muted-foreground text-pretty mb-6">
              {errorMsg || 'We could not verify your payment at this time.'}
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Button onClick={() => navigate('/credits')} variant="default" className="w-full">
                Return to Plans
              </Button>
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}