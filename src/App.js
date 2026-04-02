// Root component — controls which screen is shown.
// Flow: 'onboarding' → 'loading' (mascot transition) → 'main'
import React, { useState, useEffect } from 'react';
import Onboarding from './Onboarding';
import MainApp from './MainApp';
import './App.css';

function App() {
  const [screen, setScreen] = useState('onboarding');
  const [sessionData, setSessionData] = useState(null);

  // Called by Onboarding when the user finishes setup.
  // Shows the loading screen briefly, then switches to main.
  const handleStart = (data) => {
    setSessionData(data);
    setScreen('loading');
  };

  // Auto-advance from loading → main after all messages have shown
  useEffect(() => {
    if (screen !== 'loading') return;
    const t = setTimeout(() => setScreen('main'), 8000);
    return () => clearTimeout(t);
  }, [screen]);

  if (screen === 'onboarding') return <Onboarding onStart={handleStart} />;
  if (screen === 'loading')    return <LoadingScreen />;
  return <MainApp sessionData={sessionData} />;
}

// Messages that type in one by one — only ✨ and 🌙 allowed
const LOADING_MESSAGES = [
  { text: 'Setting up your space ✨', delay: 800  },
  { text: 'You\'ve got this today',   delay: 2400 },
  { text: 'Great things take focus',  delay: 4000 },
  { text: 'Lunna is ready for you 🌙', delay: 5600 },
];

// ── Typewriter — types out `text` one character at a time ──
const Typewriter = ({ text, speed = 45 }) => {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && <span className="typewriter-cursor" />}
    </span>
  );
};

// ── Mascot transition screen ──
const LoadingScreen = () => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers = LOADING_MESSAGES.map((msg, i) =>
      setTimeout(() => setVisibleCount(i + 1), msg.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="loading-screen">
      <img src="/lunna_mascot.png" alt="lunna" className="loading-mascot" />
      <div className="loading-messages">
        {LOADING_MESSAGES.slice(0, visibleCount).map((msg, i) => (
          <p key={i} className={`loading-msg${i === visibleCount - 1 ? ' loading-msg--active' : ' loading-msg--done'}`}>
            {i === visibleCount - 1
              ? <Typewriter text={msg.text} speed={40} />
              : msg.text
            }
          </p>
        ))}
      </div>
    </div>
  );
};

export default App;
