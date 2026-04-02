// Onboarding — the welcome / setup screen shown before the timer dashboard.
// Lunna (the mascot) chats with the user in three steps:
//   1. "name"  — asks for the user's name
//   2. "goal"  — asks what they're working on today
//   3. "tasks" — lets them add to-do items one by one
//
// When the user says they're ready (any phrase in DONE_WORDS), onStart() is
// called with the collected session data and App.js switches to MainApp.
import React, { useState, useEffect, useRef } from 'react';
import LunnaAvatar from './LunnaAvatar';
import './Onboarding.css';

// ── Inline SVG arrow used inside the send button ──
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Phrases that signal the user wants to finish adding tasks and start the session
const DONE_WORDS = [
  'done', "let's go", 'lets go', 'start', 'ready',
  'no', 'nope', "that's it", 'thats it', 'nothing', 'go',
];

const Onboarding = ({ onStart }) => {
  // ── Conversation state ──
  const [messages, setMessages] = useState([]);  // [{sender: 'lunna'|'user', text}]
  const [input, setInput] = useState('');         // current text field value
  const [step, setStep] = useState('name');       // 'name' | 'goal' | 'tasks' | 'done'

  // ── Collected user data ──
  const [userName, setUserName] = useState('');
  const [goal, setGoal] = useState('');
  const [tasks, setTasks] = useState([]);         // [{id, title, completed}]

  // ── UI state ──
  const [isTyping, setIsTyping] = useState(false);       // shows "typing.." indicator
  const [inputDisabled, setInputDisabled] = useState(false);

  // ── Refs ──
  const bottomRef = useRef(null);   // auto-scroll anchor at bottom of message list
  const inputRef = useRef(null);    // so we can re-focus after Lunna replies
  const greetedRef = useRef(false); // prevents double-greeting in React StrictMode

  // Append a Lunna message after a short simulated typing delay
  const addLunna = (text, delay = 900) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'lunna', text }]);
    }, delay);
  };

  // ── Initial greeting (runs once) ──
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    addLunna('Hello! I am Lunna, your Pomodoro buddy 🍅\nWhat can I call you, my friend?', 800);
  }, []);

  // ── Scroll to bottom whenever messages change or typing indicator appears ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Re-focus the input whenever Lunna finishes typing ──
  useEffect(() => {
    if (!isTyping && !inputDisabled) inputRef.current?.focus();
  }, [isTyping, inputDisabled]);

  // ── Extract just the name from natural language input ──
  // Handles: "alina", "hi my name is alina", "my names alina",
  //          "i'm alina", "hey call me alina", "it's alina", etc.
  const extractName = (raw) => {
    let s = raw.trim().toLowerCase();

    // 1. Strip any leading greeting word
    s = s.replace(/^(hi+|hey+|hello|hiya|yo|sup|howdy)[,!.\s]*/i, '');

    // 2. Strip intro phrases — covers "my name is", "my names", "my name's",
    //    "i am", "i'm", "call me", "it's", "its", "i go by", etc.
    s = s.replace(
      /\b(my\s+names?\s*(is\s*)?|i\s+am\s+|i'm\s+|call\s+me\s+|it[s']\s+|i\s+go\s+by\s+|you\s+can\s+call\s+me\s+|they\s+call\s+me\s+)/i,
      ''
    ).trim();

    // 3. Take only the first word (the actual first name) and capitalise it
    const first = s.split(/\s+/)[0];
    if (!first) return raw.trim(); // fallback: return whatever they typed
    return first.charAt(0).toUpperCase() + first.slice(1);
  };

  // ── Handle a user submission ──
  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping || inputDisabled) return;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);

    if (step === 'name') {
      // Step 1: extract name smartly, advance to goal
      const name = extractName(trimmed);
      setUserName(name);
      setStep('goal');
      addLunna(`Nice to meet you, ${name}! 🌟\nWhat are you planning to work on today?`);

    } else if (step === 'goal') {
      // Step 2: capture goal, advance to task collection
      setGoal(trimmed);
      setStep('tasks');
      addLunna(`Love that! 💪\nWant to add tasks to your to-do list? Type them one by one — or say "Let's go" to start!`);

    } else if (step === 'tasks') {
      // Step 3: either add a task or detect "done" and launch the session
      const isDone = DONE_WORDS.some(w => trimmed.toLowerCase().includes(w));

      if (isDone) {
        // Snapshot current state to avoid stale closure in setTimeout
        const finalName = userName;
        const finalTasks = tasks;
        setStep('done');
        setInputDisabled(true);
        addLunna(`You're all set, ${finalName}! Let's get focused! 🚀`, 700);
        // Small delay so the user can read the final message before switching screens
        setTimeout(() => {
          onStart({
            userName: finalName,
            goal,
            tasks: finalTasks,
            workMinutes: 25,   // default focus duration
            breakMinutes: 5,   // default break duration
          });
        }, 2400);
      } else {
        // Add the typed text as a new task
        const newTask = { id: Date.now(), title: trimmed, completed: false };
        setTasks(prev => [...prev, newTask]);
        addLunna(`Added ✅ Anything else? Or say "Let's go" to start!`);
      }
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="ob-screen">
      <div className="ob-card">
        <h1 className="ob-title">lunna</h1>

        {/* ── Message thread ── */}
        <div className="ob-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`ob-msg ob-msg--${msg.sender}`}>
              {msg.sender === 'lunna' ? (
                <div className="ob-lunna-row">
                  <LunnaAvatar size={52} />
                  <p className="ob-lunna-text">{msg.text}</p>
                </div>
              ) : (
                <p className="ob-user-text">{msg.text}</p>
              )}
            </div>
          ))}

          {/* Typing indicator while Lunna is "composing" */}
          {isTyping && (
            <div className="ob-lunna-row ob-typing">
              <LunnaAvatar size={40} />
              <span className="ob-typing-label">typing..</span>
            </div>
          )}

          {/* Invisible anchor — scrolled into view to keep chat at bottom */}
          <div ref={bottomRef} />
        </div>

        {/* ── Input row ── */}
        <div className="ob-input-area">
          <div className="ob-input-row">
            <input
              ref={inputRef}
              type="text"
              placeholder="type here.."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={inputDisabled}
            />
            {/* Send button — always in the DOM (keeps input size stable),
                visible + animated only when the user has typed something */}
            <button
              className={`ob-send-btn${input.trim() && !inputDisabled ? ' ob-send-btn--visible' : ' ob-send-btn--hidden'}`}
              onClick={handleSubmit}
              disabled={!input.trim() || inputDisabled}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
