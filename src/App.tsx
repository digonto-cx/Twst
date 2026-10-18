import React, { useState, useEffect } from 'react';
import { 
  fetchClientTelemetry, 
  recordVisitorTelemetry, 
  DeviceTelemetry 
} from './lib/telemetry';
import { testConnection } from './lib/firebase';
import { ContactSection } from './components/ContactSection';
import { AdminPortal } from './components/AdminPortal';
import { AmbientBackground } from './components/AmbientBackground';
import { Sparkles, ArrowDown } from 'lucide-react';

const roles = ['Web Developer', 'App Developer', 'Digital Marketer'];

function TypewriterRoles() {
  const [roleIndex, setRoleIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentRole = roles[roleIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && displayText === currentRole) {
      // Pause after full word typed
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayText === '') {
      // Move to next word after backspace
      setIsDeleting(false);
      setRoleIndex((prev) => (prev + 1) % roles.length);
      timeout = setTimeout(() => {}, 300);
    } else {
      // Typing or deleting speed
      const speed = isDeleting ? 40 : 85;
      timeout = setTimeout(() => {
        setDisplayText((prev) =>
          isDeleting
            ? currentRole.substring(0, prev.length - 1)
            : currentRole.substring(0, prev.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, roleIndex]);

  return (
    <div className="h-7 sm:h-8 flex items-center justify-center font-mono text-xs sm:text-sm tracking-wider uppercase">
      <span className="text-neutral-400 mr-2 font-normal">Role:</span>
      <span className="text-white font-medium min-w-[140px] text-left">{displayText}</span>
      <span className="inline-block w-1.5 h-4 bg-white/70 ml-1 animate-pulse" />
    </div>
  );
}

export default function App() {
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Check route for secret /ewt or #/ewt
  const checkAdminRoute = () => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/ewt' || hash === '#/ewt' || hash === '#ewt') {
      setIsAdminView(true);
    } else {
      setIsAdminView(false);
    }
  };

  useEffect(() => {
    // Initial route check
    checkAdminRoute();

    // Listen to hash and popstate changes
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('popstate', checkAdminRoute);

    // Discrete secret keyboard shortcut (Alt + E) as an escape hatch
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        window.location.hash = '#/ewt';
        setIsAdminView(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Initial Firebase connection check
    testConnection();

    // Silently capture IP, location, device, and browser telemetry in background
    fetchClientTelemetry().then((data) => {
      setTelemetry(data);
      // Persist telemetry into Firestore visitors collection without displaying on page
      recordVisitorTelemetry(data);
    }).catch((err) => {
      console.warn('Background telemetry collection:', err);
    });

    return () => {
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleExitAdmin = () => {
    setIsAdminView(false);
    window.location.hash = '';
    if (window.location.pathname === '/ewt') {
      window.history.pushState(null, '', '/');
    }
  };

  // If on secret admin route /ewt
  if (isAdminView) {
    return <AdminPortal onExit={handleExitAdmin} />;
  }

  return (
    <div className="min-h-screen bg-[#040404] text-[#EDEDED] font-sans relative selection:bg-[#E5E5E5] selection:text-[#050505] flex flex-col justify-between overflow-x-hidden">
      {/* Dynamic ambient dust particles & ethereal breathing background */}
      <AmbientBackground />
      <div className="fixed inset-0 subtle-grid opacity-25 pointer-events-none z-0" />

      {/* Clean Top Bar */}
      <header className="relative z-20 border-b border-white/5 bg-[#040404]/70 backdrop-blur-md transition-all duration-500">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white font-display">
              DK X
            </span>
            <span className="text-[10px] text-neutral-600 font-mono tracking-widest uppercase">· PORTFOLIO</span>
          </div>

          <a
            href="#contact"
            className="text-xs text-neutral-400 hover:text-white transition-colors font-mono flex items-center gap-1.5"
          >
            <span>যোগাযোগ</span>
            <ArrowDown className="w-3 h-3 text-neutral-500" />
          </a>
        </div>
      </header>

      {/* Main Clean Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-xl mx-auto space-y-10">
          {/* Hero Section */}
          <div className="text-center space-y-6 transition-all duration-700 ease-out">
            {/* DK X Profile Picture */}
            <div className="relative inline-block mx-auto">
              {/* Outer soft ambient glow */}
              <div className="absolute -inset-1.5 bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full blur-md opacity-70 animate-aura pointer-events-none" />

              {!imageError ? (
                <img
                  src="https://i.ibb.co/Mkjkb1ZG/6755.jpg"
                  alt="DK X"
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border border-white/20 shadow-2xl filter grayscale contrast-110 hover:grayscale-0 hover:scale-105 transition-all duration-500 mx-auto cursor-pointer"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#111] border border-white/20 flex items-center justify-center font-display text-2xl font-bold text-white shadow-2xl mx-auto">
                  DK
                </div>
              )}
            </div>

            {/* Identity & Typewriter Roles */}
            <div className="space-y-3">
              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white font-display">
                DK X
              </h1>

              {/* Cycling typewriter animation for roles */}
              <TypewriterRoles />
            </div>

            {/* Special Highlight Note with Dreamy Breathing Aura & Shimmer */}
            <div className="pt-1">
              <div className="relative group/card inline-block w-full transition-transform duration-300 hover:scale-[1.015]">
                {/* Gentle ambient halo */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-white/15 via-white/5 to-white/15 rounded-2xl opacity-60 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none blur-sm" />

                <div className="relative p-6 sm:p-7 bg-[#090909]/95 border border-white/10 rounded-2xl shadow-2xl text-left overflow-hidden backdrop-blur-md">
                  {/* Subtle top shimmer beam */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer pointer-events-none" />

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-neutral-200 mt-0.5 shadow-inner">
                      <Sparkles className="w-4 h-4 text-neutral-200 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-[11px] text-neutral-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span>বিশেষ বিজ্ঞপ্তি</span>
                        <span className="text-neutral-700">·</span>
                        <span className="text-neutral-500">Notice</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight leading-snug">
                        “দুঃখীত, শিগগিরই টাকা পেয়ে যাবেন ।”
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Minimal Animated One-Time Contact Form */}
          <ContactSection telemetry={telemetry} />
        </div>
      </main>

      {/* Quiet Minimal Footer */}
      <footer className="relative z-10 border-t border-white/5 py-7 px-6 text-center text-xs text-neutral-600 font-mono flex flex-col sm:flex-row items-center justify-between max-w-4xl w-full mx-auto">
        <div>DK X · Digital Engineering</div>
        <div className="mt-2 sm:mt-0 text-[11px] text-neutral-600">
          All Rights Reserved © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
