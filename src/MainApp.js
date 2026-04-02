// MainApp — the main timer dashboard shown after onboarding.
//
// Layout: three-column bento grid
//   Left   — Calendar  +  Lunna chat widget
//   Center — Session name pill  /  Timer card  /  Timer buttons
//             /  Settings sliders  /  Music player
//   Right  — To-do list
//
// Props:
//   sessionData — object built by Onboarding:
//     { userName, goal, tasks, workMinutes, breakMinutes }
//
// ── Lunna AI chat ──
// Lunna talks to the Groq API (llama-3.3-70b-versatile) and can:
//   • Add tasks via the add_task tool
//   • Control the timer via the control_timer tool
//   • Rename the session via the set_session_name tool
// Set REACT_APP_GROQ_API_KEY in your .env file to enable this feature.
import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import LunnaAvatar from './LunnaAvatar';
import Calendar from './Calender';
import Todolist from './Todolist';
import MusicPlayer from './MusicPlayer';
import './MainApp.css';

// ── Motivational quips Lunna cycles through every 30 seconds ──
const LUNNA_QUIPS = [
  'Little steps matter! 🌱',
  'You are doing amazing! 💪',
  'Stay focused, you got this! 🎯',
  'One task at a time! ✨',
  'Proud of you! Keep going! 🌟',
  'Breathe. Focus. Crush it! 🍅',
];

// ── Groq tool definitions ──
// These tell the model what actions it can take on behalf of the user.
// To add a new tool: add an entry here AND handle it in executeTool() below.
const LUNNA_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_task',
      description: "Add a task to the user's to-do list",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The task title to add' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_timer',
      description: 'Start, pause, or reset the pomodoro timer',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['start', 'pause', 'reset'],
            description: 'The timer action to perform',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_session_name',
      description: 'Change the focus session name shown on the timer',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The new session name' },
        },
        required: ['name'],
      },
    },
  },
];

// ── Shared SVG chevron used inside send buttons ──
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ── Custom range slider with the current value displayed inside the thumb ──
// Props:
//   value / min / max / onChange — standard range props
//   color      — fill colour for the completed portion of the track
//   thumbColor — background colour of the thumb circle
const CustomSlider = ({ value, min, max, onChange, color, thumbColor }) => {
  // Percentage filled so we can render the two-tone track gradient
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="cslider-outer">
      {/* Visual track — gradient from filled colour to translucent white */}
      <div
        className="cslider-track"
        style={{
          background: `linear-gradient(to right, ${color} ${pct}%, rgba(255,255,255,0.35) ${pct}%)`,
        }}
      >
        {/* Thumb circle with value label inside */}
        <div
          className="cslider-thumb"
          style={{ left: `${pct}%`, background: thumbColor }}
        >
          <span>{value}</span>
        </div>
      </div>

      {/* Transparent native <input> sits on top for interaction */}
      <input
        type="range"
        className="cslider-input"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
      />
      <span className="cslider-unit">min</span>
    </div>
  );
};


// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════
const MainApp = ({ sessionData }) => {
  const {
    userName = 'friend',
    goal,
    tasks: initTasks,
    workMinutes: initWork,
    breakMinutes: initBreak,
  } = sessionData;

  // ────────────────────────────────────
  // TIMER STATE
  // ────────────────────────────────────
  const [workMinutes, setWorkMinutes] = useState(initWork);
  const [breakMinutes, setBreakMinutes] = useState(initBreak);
  const [time, setTime] = useState(initWork * 60);           // remaining seconds
  const [sessionTotal, setSessionTotal] = useState(initWork * 60); // total seconds for current mode
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);             // true during break countdown
  const [confetti, setConfetti] = useState(false);           // confetti burst on work completion
  const [timerDone, setTimerDone] = useState(false);         // shows "start break" button

  // ────────────────────────────────────
  // SESSION NAME (editable pill above the timer)
  // ────────────────────────────────────
  const cap = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
  const [sessionName, setSessionName] = useState(cap(goal) || 'Focus session');
  const [editingName, setEditingName] = useState(false); // inline edit mode

  // ────────────────────────────────────
  // CALENDAR + TASKS
  // Tasks are lifted up here so Lunna can add them and so they persist per date.
  // ────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');

  // Helper: get today as a YYYY-MM-DD string
  const getTodayStr = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };

  // Save tasks for a specific date key
  const saveTasksForDate = (date, taskList) => {
    if (date) localStorage.setItem(`tasks-${date}`, JSON.stringify(taskList));
  };

  // On mount: anchor initTasks to today, overwriting anything previously stored.
  // Every new onboarding session is a clean slate for today's tasks.
  const todayStr = getTodayStr();
  const [tasks, setTasks] = useState(initTasks || []);
  const [taskDate, setTaskDate] = useState(todayStr);

  // Write the fresh onboarding tasks to today on first mount
  useEffect(() => {
    saveTasksForDate(todayStr, initTasks || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the selected date changes: save current tasks then load the new date's tasks
  useEffect(() => {
    if (!selectedDate) return;
    saveTasksForDate(taskDate, tasks);
    const saved = localStorage.getItem(`tasks-${selectedDate}`);
    setTasks(saved ? JSON.parse(saved) : []);
    setTaskDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Auto-save tasks to localStorage whenever they change (for the active date)
  useEffect(() => {
    if (taskDate) saveTasksForDate(taskDate, tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Task CRUD handlers — passed to both Todolist and Lunna's tool executor
  const handleAddTask = (title) => {
    setTasks(prev => [...prev, { id: Date.now(), title, completed: false }]);
  };
  const handleToggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };
  const handleDeleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // ────────────────────────────────────
  // LUNNA CHAT WIDGET STATE
  // ────────────────────────────────────
  const [lunnaMsg, setLunnaMsg] = useState(LUNNA_QUIPS[0]);  // rotating quip shown above chat
  const [lunnaInput, setLunnaInput] = useState('');
  const [lunnaChat, setLunnaChat] = useState([]);            // [{who: 'user'|'lunna', text}]
  const [lunnaIsTyping, setLunnaIsTyping] = useState(false);
  const lunnaBottomRef = useRef(null);
  const quipIndex = useRef(0);
  const greetedRef = useRef(false);

  // Lunna's opening intro — types into chat on first load
  const LUNNA_INTRO = [
    { text: `Hi ${userName}! I'm Lunna, your study buddy 🌙`, delay: 800  },
    { text: `Here's what I can do for you — add tasks to your list, start or pause your timer, and change your session name. Just ask!`, delay: 2400 },
  ];

  // Run the intro sequence once on mount.
  // The cleanup resets the ref so React StrictMode's double-invoke
  // doesn't prevent the real mount from running.
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;

    const timers = LUNNA_INTRO.map((msg) => {
      const typingTimer = setTimeout(() => setLunnaIsTyping(true), msg.delay - 600);
      const msgTimer = setTimeout(() => {
        setLunnaIsTyping(false);
        setLunnaChat(prev => [...prev, { who: 'lunna', text: msg.text }]);
      }, msg.delay);
      return [typingTimer, msgTimer];
    });

    return () => {
      timers.flat().forEach(clearTimeout);
      greetedRef.current = false; // allow real mount to run after StrictMode cleanup
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start rotating quips 35s after mount (after intro is done)
  useEffect(() => {
    const start = setTimeout(() => {
      const id = setInterval(() => {
        quipIndex.current = (quipIndex.current + 1) % LUNNA_QUIPS.length;
        setLunnaMsg(LUNNA_QUIPS[quipIndex.current]);
      }, 30000);
      return () => clearInterval(id);
    }, 35000);
    return () => clearTimeout(start);
  }, []);

  // ────────────────────────────────────
  // TIMER TICK
  // ────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const id = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(id);
          setIsActive(false);
          setTimerDone(true);
          playAlarm();
          // Only show confetti when a work session finishes (not a break)
          if (!isBreak) {
            setConfetti(true);
            setTimeout(() => setConfetti(false), 5000);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isActive, isBreak]);

  // Play the alarm sound from public/alarm.mp3
  const playAlarm = () => {
    try { new Audio('/alarm.mp3').play(); } catch (_) {}
  };

  // Format seconds as "MM:SS"
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Progress bar fill: 0–100 based on elapsed / total seconds
  const progress = sessionTotal > 0
    ? Math.min(((sessionTotal - time) / sessionTotal) * 100, 100)
    : 0;

  // ────────────────────────────────────
  // TIMER CONTROLS
  // ────────────────────────────────────

  // Toggle between running and paused
  const handleStartPause = () => {
    setIsActive(a => !a);
    setTimerDone(false);
  };

  // Reset the timer back to the full work duration
  const handleReset = () => {
    setIsActive(false);
    setTimerDone(false);
    setConfetti(false);
    setIsBreak(false);
    const secs = workMinutes * 60;
    setTime(secs);
    setSessionTotal(secs);
  };

  // Start the break countdown (shown after a work session completes)
  const handleStartBreak = () => {
    setIsBreak(true);
    setTimerDone(false);
    const secs = breakMinutes * 60;
    setTime(secs);
    setSessionTotal(secs);
    setIsActive(true);
  };

  // Skip the break and return to a fresh work session
  const handleSkipBreak = () => {
    setIsBreak(false);
    setTimerDone(false);
    const secs = workMinutes * 60;
    setTime(secs);
    setSessionTotal(secs);
  };

  // Duration slider changed — update work time and reset the timer if it's not running
  const handleWorkSlider = (val) => {
    const mins = Number(val);
    setWorkMinutes(mins);
    if (!isActive) {
      const secs = mins * 60;
      setTime(secs);
      setSessionTotal(secs);
    }
  };

  // Break slider changed — just update the duration (takes effect on next break)
  const handleBreakSlider = (val) => {
    setBreakMinutes(Number(val));
  };

  // ────────────────────────────────────
  // LUNNA TOOL EXECUTOR
  // Runs the tool that Groq requested and returns a result string for the
  // second API call so Lunna can acknowledge what she did.
  // ────────────────────────────────────
  const executeTool = (name, args) => {
    if (name === 'add_task') {
      handleAddTask(args.title);
      return `Task "${args.title}" added to the to-do list.`;
    }
    if (name === 'control_timer') {
      if (args.action === 'start') {
        setIsActive(true);
        setTimerDone(false);
      } else if (args.action === 'pause') {
        setIsActive(false);
      } else if (args.action === 'reset') {
        handleReset();
      }
      return `Timer ${args.action} executed.`;
    }
    if (name === 'set_session_name') {
      setSessionName(cap(args.name));
      return `Session name changed to "${args.name}".`;
    }
    return 'Unknown tool.';
  };

  // ────────────────────────────────────
  // LUNNA CHAT — Groq API with tool calling
  //
  // Flow:
  //   1. Send the conversation history + system prompt to Groq.
  //   2. If the model returns tool_calls, execute each tool locally,
  //      then send a second request with the tool results so the model
  //      can compose a natural-language reply.
  //   3. Append Lunna's reply to the chat log.
  // ────────────────────────────────────
  const handleLunnaChat = async () => {
    const trimmed = lunnaInput.trim();
    if (!trimmed) return;

    const userMsg = { who: 'user', text: trimmed };
    setLunnaChat(prev => [...prev, userMsg]);
    setLunnaInput('');
    setLunnaIsTyping(true);

    const systemPrompt = {
      role: 'system',
      content:
        `You are Lunna, a warm and encouraging pomodoro study buddy. ` +
        `The user's name is ${userName}. They are working on: "${sessionName}". ` +
        `Keep replies short (1-2 sentences), friendly, lowercase, and motivating. ` +
        `Use occasional emojis. Never break character.\n\n` +
        `You have three special abilities — use them when the user asks:\n` +
        `1. add tasks to their to-do list (use add_task tool)\n` +
        `2. control the timer: start, pause, or reset (use control_timer tool)\n` +
        `3. change the session name (use set_session_name tool)\n\n` +
        `If the user asks what you can do, list these three abilities in a ` +
        `friendly way without calling any tool. Only call a tool when the user ` +
        `is clearly requesting one of those actions.`,
    };

    try {
      // Map chat log to the format Groq expects
      const history = [...lunnaChat, userMsg].map(m => ({
        role: m.who === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      // ── First API call: may return tool_calls ──
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [systemPrompt, ...history],
          tools: LUNNA_TOOLS,
          tool_choice: 'auto',
          max_tokens: 200,
          temperature: 0.8,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Groq API error:', res.status, JSON.stringify(data));
        throw new Error(`Groq error ${res.status}`);
      }

      const choice = data.choices?.[0];

      if (choice?.message?.tool_calls?.length) {
        // ── Model requested tool calls — execute them all, then get a follow-up reply ──
        const toolResults = choice.message.tool_calls.map(tc => {
          let args = {};
          try { args = JSON.parse(tc.function.arguments); } catch (_) {}
          const result = executeTool(tc.function.name, args);
          return {
            role: 'tool',
            tool_call_id: tc.id,
            content: result,
          };
        });

        // ── Second API call: let Lunna acknowledge the actions ──
        const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [systemPrompt, ...history, choice.message, ...toolResults],
            max_tokens: 100,
            temperature: 0.8,
          }),
        });

        const data2 = await res2.json();
        const reply = data2.choices?.[0]?.message?.content?.trim()
          ?? LUNNA_QUIPS[Math.floor(Math.random() * LUNNA_QUIPS.length)];

        setLunnaIsTyping(false);
        setLunnaChat(prev => [...prev, { who: 'lunna', text: reply }]);

      } else {
        // ── Normal text reply (no tool calls) ──
        const reply = choice?.message?.content?.trim()
          ?? LUNNA_QUIPS[Math.floor(Math.random() * LUNNA_QUIPS.length)];

        setLunnaIsTyping(false);
        setLunnaChat(prev => [...prev, { who: 'lunna', text: reply }]);
      }

    } catch (err) {
      // Fallback to a random quip if the API call fails
      console.error('Lunna chat error:', err);
      setLunnaIsTyping(false);
      setLunnaChat(prev => [...prev, {
        who: 'lunna',
        text: LUNNA_QUIPS[Math.floor(Math.random() * LUNNA_QUIPS.length)],
      }]);
    }
  };

  // Auto-scroll Lunna's chat to the bottom when new messages arrive
  useEffect(() => {
    lunnaBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lunnaChat, lunnaIsTyping]);


  // ════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div className="ma-screen">
      {confetti && <Confetti />}

      <div className="bento-grid">

        {/* ────────────────────────────────────
            LEFT COLUMN — Calendar + Lunna chat
        ──────────────────────────────────── */}
        <div className="bento-col bento-left">

          {/* Calendar — clicking a day sets selectedDate which loads that day's tasks */}
          <Calendar onDateSelect={setSelectedDate} selectedDate={selectedDate} />

          {/* Lunna chat widget */}
          <div className="bento-card lunna-card">
            <h2 className="lunna-card-title">lunna ✦ {userName}</h2>

            {/* Scrollable message area */}
            <div className="lunna-body">
              {/* Rotating quip shown above the chat history */}
              <div className="lunna-msg-row">
                <LunnaAvatar size={48} />
                <p className="lunna-quip">{lunnaMsg}</p>
              </div>

              {/* Chat history */}
              {lunnaChat.map((m, i) => (
                <div key={i} className={`lunna-chat-msg lunna-chat-msg--${m.who}`}>
                  {m.text}
                </div>
              ))}

              {/* Typing indicator */}
              {lunnaIsTyping && (
                <span className="lunna-typing-label">typing..</span>
              )}

              {/* Invisible scroll anchor */}
              <div ref={lunnaBottomRef} />
            </div>

            {/* Input row */}
            <div className="lunna-input-area">
              <div className="lunna-input-row">
                <input
                  type="text"
                  placeholder="type here.."
                  value={lunnaInput}
                  onChange={e => setLunnaInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLunnaChat()}
                />
                <button
                  className={`send-btn${lunnaInput.trim() ? ' send-btn--visible' : ' send-btn--hidden'}`}
                  onClick={handleLunnaChat}
                  disabled={!lunnaInput.trim()}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────
            CENTER COLUMN — Timer + Settings + Music
        ──────────────────────────────────── */}
        <div className="bento-col bento-center">

          {/* Session name pill — press the pencil button to rename */}
          <div className="session-name-pill">
            {editingName ? (
              <>
                <input
                  className="session-name-input"
                  value={sessionName}
                  autoFocus
                  onChange={e => {
                    const v = e.target.value;
                    setSessionName(v.charAt(0).toUpperCase() + v.slice(1));
                  }}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                />
                <button className="session-name-done" onClick={() => setEditingName(false)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <span>{sessionName}</span>
                <button className="session-name-edit" onClick={() => setEditingName(true)}>edit</button>
              </>
            )}
          </div>

          {/* Timer display card — turns blue during break */}
          <div className={`bento-card timer-card${isBreak ? ' timer-card--break' : ''}`}>
            <div className="timer-display">{formatTime(time)}</div>
            {/* Progress bar fills as time elapses */}
            <div className="timer-progress-track">
              <div className="timer-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Primary timer buttons */}
          <div className="timer-btns">
            <button className="tbtn tbtn--start" onClick={handleStartPause}>
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button className="tbtn tbtn--pause" onClick={handleReset}>Reset</button>
          </div>

          {/* "Start break" button — shown only after a work session finishes */}
          {timerDone && !isBreak && (
            <div className="timer-btns">
              <button className="tbtn tbtn--break" onClick={handleStartBreak}>
                Start Break
              </button>
            </div>
          )}

          {/* "Skip break" button — shown while a break is running */}
          {isBreak && (
            <div className="timer-btns">
              <button className="tbtn tbtn--skip" onClick={handleSkipBreak}>
                Skip Break
              </button>
            </div>
          )}

          {/* Duration & break sliders */}
          <div className="bento-card settings-card">
            <div className="setting-row">
              <span className="setting-label">Duration</span>
              <CustomSlider
                value={workMinutes}
                min={1}
                max={150}
                onChange={e => handleWorkSlider(e.target.value)}
                color="#e8873a"
                thumbColor="#c45e10"
              />
            </div>
            <div className="setting-row">
              <span className="setting-label">Break</span>
              <CustomSlider
                value={breakMinutes}
                min={1}
                max={60}
                onChange={e => handleBreakSlider(e.target.value)}
                color="#3a7a4a"
                thumbColor="#1e4a2a"
              />
            </div>
          </div>

          {/* Lofi music player */}
          <MusicPlayer />
        </div>

        {/* ────────────────────────────────────
            RIGHT COLUMN — To-do list
        ──────────────────────────────────── */}
        <div className="bento-col bento-right">
          <div className="bento-card todo-card">
            {/* bentoMode=true: task state is controlled here in MainApp */}
            <Todolist
              bentoMode
              tasks={tasks}
              onAdd={handleAddTask}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
              selectedDate={selectedDate}
            />
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <div className="ma-footer">
        © {new Date().getFullYear()} Alina. All rights reserved. &nbsp;·&nbsp; Designed &amp; built by Alina.
      </div>
    </div>
  );
};

export default MainApp;
