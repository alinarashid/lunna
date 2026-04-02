// MusicPlayer — embedded lofi music player for the timer dashboard.
//
// How it works:
//   A hidden YouTube iframe is embedded for each track.  The YouTube IFrame
//   Player API lets us send playVideo / pauseVideo / setVolume commands via
//   postMessage without needing an API key.
//
// To add or change tracks: edit the TRACKS array below.
// Each entry needs:
//   id    — the 11-character YouTube video ID (the part after "?v=")
//   title — display name shown in the player
import React, { useState, useRef, useEffect } from 'react';
import './MusicPlayer.css';

// ── Lofi track playlist ──
// To swap a track out, replace its id with the YouTube video ID of your choice.
const TRACKS = [
  { id: 'jfKfPfyJRdk', title: 'lofi girl — study beats 🌙' },
  { id: '4xDzrJKXOOY', title: 'chill lofi hip hop ☕' },
  { id: 'lTRiuFIWV54', title: 'cozy afternoon lofi 🍵' },
  { id: '7NOSDKb0HlU', title: 'night study lofi 🌸' },
  { id: 'DWcJFNfaw9c', title: 'coffee shop vibes 🎀' },
];

const MusicPlayer = () => {
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);   // index into TRACKS
  const [volume, setVolume] = useState(50);       // 0–100

  const iframeRef = useRef(null);
  const track = TRACKS[trackIdx];

  // ── Send a command to the YouTube iframe via postMessage ──
  const sendCmd = (func, args = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch (_) {}
  };

  // ── Play / pause toggle ──
  const handleToggle = () => {
    setPlaying(p => {
      sendCmd(p ? 'pauseVideo' : 'playVideo');
      return !p;
    });
  };

  // ── Next / previous track ──
  const handleNext = () => {
    setTrackIdx(i => (i + 1) % TRACKS.length);
    setPlaying(false);
  };

  const handlePrev = () => {
    setTrackIdx(i => (i - 1 + TRACKS.length) % TRACKS.length);
    setPlaying(false);
  };

  // Auto-resume playback after switching tracks (the iframe needs ~1.5 s to load)
  useEffect(() => {
    if (playing) {
      const t = setTimeout(() => sendCmd('playVideo'), 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx]);

  // Sync volume to the iframe whenever the slider changes
  useEffect(() => {
    sendCmd('setVolume', [volume]);
  }, [volume]);

  // Build the iframe src.  enablejsapi=1 unlocks postMessage control.
  const iframeSrc = [
    `https://www.youtube.com/embed/${track.id}`,
    `?enablejsapi=1`,
    `&autoplay=0`,
    `&controls=0`,
    `&loop=1`,
    `&playlist=${track.id}`,
    `&origin=${window.location.origin}`,
  ].join('');

  return (
    <div className="music-card bento-card">
      {/* Hidden iframe — audio only, never visible */}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="lofi music"
        className="music-iframe"
        allow="autoplay"
        frameBorder="0"
      />

      <div className="music-inner">
        {/* Track name with animated dot when playing */}
        <div className="music-track-name">
          <span className={`music-dot${playing ? ' music-dot--playing' : ''}`} />
          <span>{track.title}</span>
        </div>

        {/* Prev / Play-Pause / Next controls */}
        <div className="music-controls">
          {/* Previous track */}
          <button className="music-btn music-btn--sm" onClick={handlePrev}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <polygon points="19,4 8,12 19,20" />
              <rect x="5" y="4" width="3" height="16" rx="1" fill="white" />
            </svg>
          </button>

          {/* Play / Pause — switches icon based on state */}
          <button className="music-btn music-btn--play" onClick={handleToggle}>
            {playing
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <rect x="5" y="4" width="4" height="16" rx="2" />
                  <rect x="15" y="4" width="4" height="16" rx="2" />
                </svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
            }
          </button>

          {/* Next track */}
          <button className="music-btn music-btn--sm" onClick={handleNext}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <polygon points="5,4 16,12 5,20" />
              <rect x="16" y="4" width="3" height="16" rx="1" fill="white" />
            </svg>
          </button>
        </div>

        {/* Volume slider — reuses the shared .cslider-* classes from MainApp.css */}
        <div className="music-vol-row">
          <span className="music-vol-label">Volume</span>
          <div className="cslider-outer">
            <div
              className="cslider-track"
              style={{
                background: `linear-gradient(to right, #9b59b6 ${volume}%, rgba(255,255,255,0.35) ${volume}%)`,
              }}
            >
              <div
                className="cslider-thumb"
                style={{ left: `${volume}%`, background: '#6c2e8a' }}
              >
                <span>{volume}</span>
              </div>
            </div>
            <input
              type="range"
              className="cslider-input"
              min={0}
              max={100}
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
