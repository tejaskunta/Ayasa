import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

const processSteps = [
  {
    index: '01',
    title: 'Daily Check-In',
    desc: 'Share how you feel in a short reflection so AYASA can understand your current stress level.',
  },
  {
    index: '02',
    title: 'Stress Model Insight',
    desc: 'Our stress model analyzes your pattern and gives clear insights you can act on right away.',
  },
  {
    index: '03',
    title: 'Guided Support Plan',
    desc: 'Get practical breathing prompts and support steps that help you calm down and reset.',
  },
];

const faq = [
  {
    q: 'What types of mental health services does AYASA provide?',
    a: 'AYASA provides stress detection, guided reflections, practical coping exercises, and personalized support recommendations based on your check-ins.',
    open: true,
  },
  {
    q: 'How do I know if I need therapy or counseling?',
    a: 'If stress is affecting your sleep, focus, relationships, or mood, regular counseling can help you reset and build stronger habits.',
  },
  {
    q: 'What should I expect during my first session?',
    a: 'You can expect a calm onboarding conversation about your recent patterns, current triggers, and a first action plan for the week.',
  },
  {
    q: 'What makes AYASA different from other services?',
    a: 'AYASA combines AI pattern recognition with practical, human-centered care structure so progress is clear and actionable.',
  },
];

export default function Landing() {
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div className="therapy-landing">
      <main className="therapy-shell">
        <section className="therapy-hero" id="top">
          <img
            src="https://images.unsplash.com/reserve/YEc7WB6ASDydBTw6GDlF_antalya-beach-lulu.jpg?q=80&w=1900&auto=format&fit=crop"
            alt="Meditation at sunset"
            className="therapy-hero-img"
          />
          <div className="therapy-hero-overlay" />
          <header className="therapy-nav">
            <Link to="/" className="therapy-logo">
              <span className="material-symbols-rounded">diversity_1</span>
              AYASA
            </Link>
            <Link to={isLoggedIn ? '/home' : '/register'} className="therapy-contact-btn">
              {isLoggedIn ? 'Dashboard' : 'Start Conversation'}
            </Link>
          </header>

          <div className="therapy-hero-content">
            <h1>
              Healing Starts with a
              <br />
              Single <em>Conversation</em>
            </h1>
            <p>
              AYASA means <em>breath</em> in Sanskrit. Start a guided conversation to understand your stress and build calmer daily habits.
            </p>
            <div className="therapy-hero-row">
              <Link to={isLoggedIn ? '/home' : '/register'} className="therapy-pill-btn">Start Conversation</Link>
            </div>
          </div>
        </section>

        <section className="therapy-about" id="about">
          <div className="therapy-heading-row">
            <span>About Us</span>
            <h2>
              Feel supported as you regain calm,
              <br />
              build confidence, and create real progress.
            </h2>
          </div>

          <div className="therapy-about-grid">
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80"
              alt="People using a wellness app"
            />
            <aside>
              <div>
                <strong>How The App Works</strong>
                <small>Daily check-ins and guided questions</small>
              </div>
              <div>
                <strong>Stress Model</strong>
                <small>Pattern detection from your responses</small>
              </div>
              <div>
                <strong>Support</strong>
                <small>Actionable coping routines and prompts</small>
              </div>
            </aside>
          </div>

          <div className="therapy-features-title">
            <span>What AYASA Provides</span>
            <p>Simple features that help you deal with stress, breathe better, and recover balance.</p>
          </div>

          <div className="therapy-mini-cards">
            <article>
              <span className="material-symbols-rounded">neurology</span>
              <h3>Stress Detection</h3>
              <p>Model-based detection that highlights your emotional pattern clearly.</p>
            </article>
            <article>
              <span className="material-symbols-rounded">air</span>
              <h3>Breathing Guidance</h3>
              <p>Fast breathing and grounding prompts for stressful moments.</p>
            </article>
            <article>
              <span className="material-symbols-rounded">forum</span>
              <h3>Supportive Conversations</h3>
              <p>Calm, private conversations that turn insight into daily action.</p>
            </article>
          </div>
        </section>

        <section className="therapy-process" id="works">
          <img
            src="https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=1900&q=80"
            alt="Calm landscape"
          />
          <div className="therapy-process-overlay" />
          <div className="therapy-process-content">
            <div className="therapy-heading-row light compact">
              <span>How It Works</span>
              <h2>Simple Steps to Better Mental Health</h2>
              <p>An easy process you can begin today, with structured support at every stage.</p>
            </div>
            <div className="therapy-steps-grid">
              {processSteps.map((step) => (
                <article key={step.index}>
                  <strong>{step.index}</strong>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </article>
              ))}
            </div>
            <Link to={isLoggedIn ? '/home' : '/register'} className="therapy-pill-btn light">Start Conversation</Link>
          </div>
        </section>

        <section className="therapy-faq" id="faq">
          <div className="therapy-heading-row compact">
            <span>FAQ</span>
            <h2>Frequently Asked Questions</h2>
            <p>Discover care that fits your needs and supports your growth every step.</p>
          </div>
          <div className="therapy-faq-list">
            {faq.map((item) => (
              <details key={item.q} open={item.open}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="therapy-cta">
          <div>
            <h2>
              One Decision Can
              <br />
              Change Your Life
            </h2>
            <p>Take the first step today and start your journey toward emotional balance.</p>
            <Link to={isLoggedIn ? '/home' : '/register'} className="therapy-pill-btn dark">
              {isLoggedIn ? 'Open Dashboard' : 'Start Conversation'}
            </Link>
          </div>
          <img
            src="https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=1500&q=80"
            alt="Standing on peak"
          />
        </section>
      </main>

      <footer className="therapy-footer">
        <div className="therapy-footer-top">
          <h3>Your journey to mental wellness starts here.</h3>
          <p>KMIT College</p>
        </div>
        <div className="therapy-footer-grid">
          <div>
            <Link to="/" className="therapy-logo">
              <span className="material-symbols-rounded">diversity_1</span>
              AYASA
            </Link>
            <small>Care-first digital support for calmer, healthier routines.</small>
          </div>
          <nav>
            <h4>Info</h4>
            <a href="#faq">FAQ</a>
            <Link to={isLoggedIn ? '/home' : '/register'}>Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

