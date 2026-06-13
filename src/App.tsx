import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import IntersectObserver from '@/components/common/IntersectObserver';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';

import { routes } from './routes';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="forge-theme">
      <AuthProvider>
        <Router>
          <IntersectObserver />
          <div className="flex flex-col min-h-screen">
            <main className="flex-grow">
              <Routes>
                {routes.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    element={route.element}
                  />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
