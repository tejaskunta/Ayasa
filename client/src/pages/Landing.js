import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div className="font-body text-on-surface" style={{ background: '#0a0e1a', color: '#dfe2f3', overflowX: 'hidden' }}>
      {/* Grain + Aurora */}
      <div className="fixed inset-0 z-[100] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", opacity: 0.04 }} />
      <div className="fixed inset-0 -z-10" style={{ background: 'radial-gradient(circle at 20% 30%, rgba(68,229,194,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(79,49,156,0.2) 0%, transparent 40%)' }} />

      {/* ── Nav ─────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl" style={{ background: 'rgba(2,6,18,0.45)' }}>
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
          <div className="text-2xl font-serif italic text-emerald-400 drop-shadow-[0_0_8px_rgba(68,229,194,0.4)]">AYASA</div>
          <div className="hidden md:flex gap-10">
            <a className="text-emerald-400 font-bold border-b-2 border-emerald-400/50 pb-1 font-label text-sm tracking-wide" href="#hero">Home</a>
            <a className="text-slate-300 hover:text-emerald-200 transition-colors font-label text-sm tracking-wide" href="#how-it-works">How It Works</a>
            <a className="text-slate-300 hover:text-emerald-200 transition-colors font-label text-sm tracking-wide" href="#emotions">Emotions</a>
            <a className="text-slate-300 hover:text-emerald-200 transition-colors font-label text-sm tracking-wide" href="#features">Features</a>
          </div>
          <Link to={isLoggedIn ? '/home' : '/register'} className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-2.5 rounded-full font-label font-bold text-sm tracking-tight hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(68,229,194,0.3)]" style={{ textDecoration: 'none' }}>
            {isLoggedIn ? 'Dashboard' : 'Begin Journey'}
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <header id="hero" className="relative pt-40 pb-32 px-6 flex flex-col items-center text-center min-h-screen justify-center">
        <div className="relative mb-20">
          <div className="w-[320px] h-[320px] rounded-full bg-gradient-to-tr from-primary/30 via-secondary/20 to-primary/40 flex items-center justify-center relative overflow-hidden" style={{ boxShadow: '0 0 80px 20px rgba(68,229,194,0.2)' }}>
            <div className="absolute inset-0 bg-primary/10 animate-pulse rounded-full" />
            <div className="w-48 h-48 rounded-full border border-primary/20 animate-[spin_10s_linear_infinite]" />
            <div className="absolute w-64 h-64 rounded-full border border-secondary/20 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="w-16 h-16 bg-primary rounded-full blur-xl opacity-50" />
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
            <div className="absolute top-10 -left-12 px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest text-primary border border-primary/20" style={{ background: 'rgba(49,52,66,0.1)', backdropFilter: 'blur(40px)' }}>Joy</div>
            <div className="absolute bottom-20 -right-16 px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest text-secondary border border-secondary/20" style={{ background: 'rgba(49,52,66,0.1)', backdropFilter: 'blur(40px)' }}>Calm</div>
            <div className="absolute top-1/2 -right-24 px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest text-tertiary border border-tertiary/20" style={{ background: 'rgba(49,52,66,0.1)', backdropFilter: 'blur(40px)' }}>Awe</div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto">
          <p className="font-label text-primary font-bold tracking-[0.2em] uppercase text-xs mb-6">Silent Stress Detection AI</p>
          <h1 className="font-headline text-6xl md:text-8xl font-bold leading-tight mb-8 bg-gradient-to-b from-on-background to-on-surface-variant bg-clip-text text-transparent">
            Your Silence <br /> Speaks <span className="italic text-primary">Volumes</span>
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed mb-12">
            AYASA decodes the subtle patterns in your text to reveal the emotional truths you haven't yet spoken.
          </p>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <Link to={isLoggedIn ? '/home' : '/register'} className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-10 py-5 rounded-full font-label font-extrabold text-lg shadow-[0_10px_40px_rgba(68,229,194,0.25)] hover:shadow-primary/40 transition-all duration-500" style={{ textDecoration: 'none' }}>
              Begin Your Journey
            </Link>
            <a href="#how-it-works" className="px-10 py-5 rounded-full font-label font-bold text-lg hover:bg-white/5 transition-all border border-white/10" style={{ background: 'rgba(49,52,66,0.1)', backdropFilter: 'blur(40px)', textDecoration: 'none', color: '#dfe2f3' }}>
              Learn More
            </a>
          </div>
        </div>
      </header>

      {/* ── How It Works ────────────────────── */}
      <section id="how-it-works" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-xl">
            <p className="font-label text-secondary font-bold tracking-widest uppercase text-xs mb-4">The Methodology</p>
            <h2 className="font-headline text-4xl md:text-5xl font-bold">How AYASA Detects Stress</h2>
          </div>
          <p className="text-on-surface-variant max-w-sm font-light">Three layers of intelligence working together to understand your emotional wellbeing.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { num: '01', icon: 'keyboard', title: 'Text Analysis', desc: 'Analyzes patterns in your responses — word choice, sentence structure, and emotional markers — to detect early signs of stress.', accent: true },
            { num: '02', icon: 'psychology', title: 'AI Detection', desc: 'DistilBERT-powered deep learning model processes your inputs to classify stress levels with high accuracy and emotional understanding.', featured: true },
            { num: '03', icon: 'monitor_heart', title: 'Gemini Insights', desc: 'Google Gemini generates personalized, empathetic feedback and coping strategies based on your unique emotional profile.', secondary: true },
          ].map((c) => (
            <div key={c.num} className={`p-10 rounded-[2rem] relative group hover:bg-surface-container-low transition-all duration-500 ${c.featured ? '-mt-6 border-primary/30 shadow-[0_0_50px_rgba(68,229,194,0.1)]' : ''}`} style={{ background: 'rgba(49,52,66,0.1)', backdropFilter: 'blur(40px)', border: c.featured ? undefined : '1px solid rgba(133,148,142,0.1)' }}>
              <div className="text-8xl font-serif text-white/5 absolute top-4 right-8 group-hover:text-primary/10 transition-colors">{c.num}</div>
              <div className={`mb-12 inline-flex p-4 rounded-2xl ${c.secondary ? 'bg-secondary/10 text-secondary' : c.featured ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <span className="material-symbols-outlined text-4xl">{c.icon}</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">{c.title}</h3>
              <p className="text-on-surface-variant font-light leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live Demo Chat ──────────────────── */}
      <section className="py-32 px-6" style={{ background: '#171b28' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl font-bold mb-4">Experience the Pulse</h2>
            <p className="text-on-surface-variant">A typical interaction with your silent guardian.</p>
          </div>
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ background: 'rgba(49,52,66,0.1)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="px-8 py-4 flex items-center justify-between border-b border-white/5" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="font-label font-bold text-sm tracking-widest uppercase">Ayasa Interface</span>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
            </div>
            <div className="p-8 space-y-8 min-h-[400px]">
              <div className="flex flex-col items-end">
                <div className="max-w-[80%] text-sm font-light text-on-surface/80 bg-white/5 p-4 rounded-2xl rounded-tr-none">
                  "I'm feeling fine, just have a lot on my plate today. Need to finish the report by 5."
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="flex gap-2 mb-2">
                  <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full uppercase tracking-tighter border border-red-500/20">High Stress Detected</span>
                  <span className="px-3 py-1 text-secondary text-[10px] font-bold rounded-full uppercase tracking-tighter border border-secondary/40" style={{ background: 'rgba(79,49,156,0.3)' }}>Subsurface Anxiety</span>
                </div>
                <div className="max-w-[85%] text-on-surface bg-gradient-to-br from-white/10 to-transparent p-6 rounded-3xl rounded-tl-none border border-white/10 backdrop-blur-md">
                  <p className="italic font-serif text-lg leading-relaxed">
                    "Your word patterns suggest underlying pressure beyond a busy schedule. The phrase 'feeling fine' paired with urgency markers indicates emotional suppression. Shall we try a 2-minute breathing exercise?"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Emotional Spectrum ──────────────── */}
      <section id="emotions" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <p className="font-label text-primary font-bold tracking-[0.2em] uppercase text-xs mb-4">Emotional Spectrum</p>
          <h2 className="font-headline text-5xl font-bold italic">The Six Pillars of Self</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Joy', icon: 'light_mode', color: 'primary', pct: 85 },
            { name: 'Sadness', icon: 'water_drop', color: 'blue-400', pct: 40 },
            { name: 'Anger', icon: 'bolt', color: 'red-400', pct: 15 },
            { name: 'Fear', icon: 'visibility', color: 'purple-400', pct: 60 },
            { name: 'Love', icon: 'favorite', color: 'pink-400', pct: 95 },
            { name: 'Surprise', icon: 'auto_awesome', color: 'yellow-400', pct: 25 },
          ].map((e) => (
            <div key={e.name} className={`p-8 rounded-3xl group cursor-pointer hover:border-${e.color}/40 transition-all duration-500`} style={{ background: 'rgba(49,52,66,0.1)', backdropFilter: 'blur(40px)', border: '1px solid rgba(133,148,142,0.1)' }}>
              <div className="flex justify-between items-center mb-8">
                <span className={`text-${e.color} font-label font-bold tracking-widest text-xs uppercase`}>{e.name}</span>
                <span className={`material-symbols-outlined text-${e.color}/30 group-hover:text-${e.color} transition-colors`}>{e.icon}</span>
              </div>
              <p className="text-sm text-on-surface-variant italic mb-10">{
                e.name === 'Joy' ? 'Radiant clarity and expansive energy.' :
                e.name === 'Sadness' ? 'Deep reflection and emotional depth.' :
                e.name === 'Anger' ? 'Focused drive and protective energy.' :
                e.name === 'Fear' ? 'Heightened awareness and preservation.' :
                e.name === 'Love' ? 'Harmonious connection and empathy.' :
                'Cognitive shift and new perspectives.'
              }</p>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full bg-${e.color} rounded-full group-hover:scale-x-105 transition-transform origin-left duration-700`} style={{ width: `${e.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stress Calibration ─────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto">
        <div className="p-12 rounded-[3rem] border border-white/5" style={{ background: 'linear-gradient(to bottom, #1b1f2c, #0f131f)', backdropFilter: 'blur(40px)' }}>
          <h2 className="font-headline text-3xl font-bold mb-12 text-center">Stress Variance Calibration</h2>
          <div className="space-y-12">
            {[
              { label: 'Low Tension', color: 'emerald', pct: 12 },
              { label: 'Moderate Load', color: 'yellow', pct: 48 },
              { label: 'Critical Compression', color: 'red', pct: 82 },
            ].map((s) => (
              <div key={s.label} className="space-y-3">
                <div className="flex justify-between text-xs font-label uppercase tracking-widest">
                  <span className={`text-${s.color}-400`}>{s.label}</span>
                  <span className={`text-${s.color}-400`}>{s.pct}%</span>
                </div>
                <div className="h-4 w-full bg-white/5 rounded-full p-1">
                  <div className={`h-full bg-gradient-to-r from-${s.color}-500/50 to-${s.color}-400 rounded-full`} style={{ width: `${s.pct}%`, boxShadow: `0 0 10px rgba(${s.color === 'emerald' ? '16,185,129' : s.color === 'yellow' ? '250,204,21' : '248,113,113'},0.3)` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ──────────────────── */}
      <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2 md:row-span-2 p-12 rounded-[2.5rem] flex flex-col justify-end min-h-[500px] group overflow-hidden relative" style={{ background: 'rgba(49,52,66,0.1)', backdropFilter: 'blur(40px)', border: '1px solid rgba(133,148,142,0.1)' }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all duration-700" />
            <span className="material-symbols-outlined text-6xl text-primary mb-8">security</span>
            <h3 className="text-3xl font-bold mb-4">Privacy-First Architecture</h3>
            <p className="text-on-surface-variant font-light leading-relaxed">Your emotional data stays private. Our AI processes your inputs without exposing sensitive information, ensuring your inner world remains your own.</p>
          </div>
          {[
            { icon: 'psychology', color: 'text-secondary', title: 'DistilBERT Model', desc: 'State-of-the-art NLP for stress classification.' },
            { icon: 'insights', color: 'text-emerald-400', title: 'Real-time Analysis', desc: 'Instant stress detection as you type.' },
            { icon: 'history_edu', color: 'text-blue-400', title: 'Deep History', desc: 'Review your emotional trajectory over time.' },
            { icon: 'smart_toy', color: 'text-purple-400', title: 'Gemini AI Advice', desc: 'Personalized coping strategies from Google Gemini.' },
          ].map((f) => (
            <div key={f.title} className="p-8 rounded-[2rem] group hover:bg-white/5 transition-colors" style={{ background: 'rgba(49,52,66,0.1)', backdropFilter: 'blur(40px)', border: '1px solid rgba(133,148,142,0.1)' }}>
              <span className={`material-symbols-outlined text-3xl ${f.color} mb-6 block`}>{f.icon}</span>
              <h4 className="font-bold mb-2">{f.title}</h4>
              <p className="text-sm text-on-surface-variant font-light">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────── */}
      <section className="py-40 px-6 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(68,229,194,0.1) 0%, transparent 70%)' }} />
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-primary/30 via-secondary/20 to-primary/40 flex items-center justify-center mb-16 relative" style={{ boxShadow: '0 0 80px 20px rgba(68,229,194,0.2)' }}>
            <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-xl" />
            <span className="material-symbols-outlined text-white text-5xl">auto_awesome</span>
          </div>
          <h2 className="font-headline text-5xl md:text-7xl font-bold mb-10 leading-tight">
            Your Journey Back<br />to <span className="text-primary italic">Silence</span> Starts Now
          </h2>
          <p className="text-on-surface-variant text-xl mb-12 max-w-xl mx-auto">Take the first step toward understanding your stress patterns with AI-powered emotional intelligence.</p>
          <Link to={isLoggedIn ? '/home' : '/register'} className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-12 py-6 rounded-full font-label font-extrabold text-xl shadow-[0_20px_60px_rgba(68,229,194,0.3)] hover:scale-105 transition-all duration-500 mb-6" style={{ textDecoration: 'none' }}>
            {isLoggedIn ? 'Go to Dashboard' : "Begin Your Journey — It's Free"}
          </Link>
          <p className="text-on-surface-variant/60 text-xs font-label uppercase tracking-widest">No credit card required. Private by design.</p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────── */}
      <footer className="w-full pt-20 pb-10 border-t border-white/5" style={{ background: '#020612' }}>
        <div className="flex flex-col items-center gap-10 px-4 w-full max-w-7xl mx-auto">
          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-lg font-serif text-slate-200">AYASA</div>
            <div className="flex gap-8">
              <Link to="/login" className="text-slate-500 hover:text-emerald-300 transition-colors font-sans text-sm tracking-wide" style={{ textDecoration: 'none' }}>Login</Link>
              <Link to="/register" className="text-slate-500 hover:text-emerald-300 transition-colors font-sans text-sm tracking-wide" style={{ textDecoration: 'none' }}>Register</Link>
              <a className="text-slate-500 hover:text-emerald-300 transition-colors font-sans text-sm tracking-wide" href="#features">Features</a>
              <a className="text-slate-500 hover:text-emerald-300 transition-colors font-sans text-sm tracking-wide" href="#how-it-works">How It Works</a>
            </div>
          </div>
          <div className="w-full h-px bg-white/5" />
          <div className="text-slate-500 font-sans text-sm tracking-wide text-center">
            &copy; 2025 AYASA. Cultivating Digital Serenity.
          </div>
        </div>
      </footer>
    </div>
  );
}
