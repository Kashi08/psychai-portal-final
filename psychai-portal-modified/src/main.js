import './style.css';

// State variables for local server presence
// External apps are always available (no localhost workspace ping needed).
let clinicianOnline = false;

// Video Walkthrough Simulation State
let videoInterval = null;
let videoElapsedMs = 0;
const videoDurationMs = 30000; // 30 seconds
let videoIsPlaying = false;
let videoMessagesTriggered = new Set();
let videoRepeatCount = 0;
const videoMaxRepeats = 2;

// Cached female voice
let cachedFemaleVoice = null;

function loadFemaleVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  const femaleKeywords = [
    'samantha', 'karen', 'zira', 'susan', 'victoria', 'fiona',
    'moira', 'tessa', 'veena', 'alice', 'amelie', 'serena',
    'google uk english female', 'google us english female',
    'female', 'woman'
  ];
  // First pass: exact female keyword match on English voice
  cachedFemaleVoice = voices.find(v =>
    v.lang.startsWith('en') &&
    femaleKeywords.some(k => v.name.toLowerCase().includes(k))
  );
  // Second pass: any English voice (most default en-US voices are female)
  if (!cachedFemaleVoice) {
    cachedFemaleVoice = voices.find(v => v.lang === 'en-US') ||
                        voices.find(v => v.lang.startsWith('en'));
  }
}

// Load voices immediately if available, else wait for the event
if (window.speechSynthesis) {
  loadFemaleVoice();
  window.speechSynthesis.onvoiceschanged = loadFemaleVoice;
}

// Web Audio API & Speech Synthesis States
let audioCtx = null;
let ambientTimer = null;
let isMuted = false;

document.addEventListener('DOMContentLoaded', () => {
  initTiltEffect();
  initServerStatusCheck();
  initLaunchInterceptor();
  initNavbarScroll();
  initMoodWidget();
  initClickSparkles();
  initButtonFunTriggers();
  initVideoPlayerSim();
});

/* ==========================================================================
   Interactive 3D Tilt Effect
   ========================================================================== */
function initTiltEffect() {
  const cards = document.querySelectorAll('.portal-card');
  
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${xPercent}%`);
      card.style.setProperty('--mouse-y', `${yPercent}%`);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 8;
      const rotateX = -((y - centerY) / centerY) * 8;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      card.style.setProperty('--mouse-x', `50%`);
      card.style.setProperty('--mouse-y', `50%`);
    });
  });
}

/* ==========================================================================
   Active App Server Ping Check
   ========================================================================== */
function initServerStatusCheck() {
  checkServer('http://localhost:3000', (online) => {
    patientOnline = online;
    updateStatusIndicator('patient-status', online);
  });

  checkServer('http://localhost:3001', (online) => {
    clinicianOnline = online;
    updateStatusIndicator('clinician-status', online);
  });

  setInterval(() => {
    checkServer('http://localhost:3000', (online) => {
      patientOnline = online;
      updateStatusIndicator('patient-status', online);
    });

    checkServer('http://localhost:3001', (online) => {
      clinicianOnline = online;
      updateStatusIndicator('clinician-status', online);
    });
  }, 8000);
}

function checkServer(url, callback) {
  fetch(url, { mode: 'no-cors', cache: 'no-store' })
    .then(() => {
      callback(true);
    })
    .catch(() => {
      callback(false);
    });
}

function updateStatusIndicator(containerId, isOnline) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const dot = container.querySelector('.status-dot');
  const text = container.querySelector('.status-text');

  if (isOnline) {
    dot.className = 'status-dot online';
    text.innerHTML = 'Workspace status: <span class="text-success">Available</span>';
  } else {
    dot.className = 'status-dot warning';
    text.innerHTML = 'Workspace status: <span class="text-warning">Offline</span>';
  }
}

/* ==========================================================================
   Workspace Launch & Modal Integration
   ========================================================================== */
function initLaunchInterceptor() {
  const patientLink = document.getElementById('patient-link');
  const clinicianLink = document.getElementById('clinician-link');
  
  const modal = document.getElementById('offline-modal');
  const modalClose = document.getElementById('modal-close');
  const modalProceed = document.getElementById('modal-proceed');
  const modalOverlay = modal ? modal.querySelector('.modal-overlay') : null;

  if (!modal || !modalClose || !modalProceed || !modalOverlay) return;

  const openOfflineModal = (appName, appPort, targetHref) => {
    document.getElementById('modal-app-name').textContent = appName;
    document.getElementById('modal-app-port').textContent = appPort;
    modalProceed.setAttribute('href', targetHref);
    modal.classList.add('active');
  };

  const closeModal = () => {
    modal.classList.remove('active');
  };

  patientLink.addEventListener('click', (e) => {
    if (!patientOnline) {
      e.preventDefault();
      openOfflineModal('PsychAI Patient View App', 'https://psychai-patient-app.vercel.app/', 'https://psychai-patient-app.vercel.app/');
    }
  });

  clinicianLink.addEventListener('click', (e) => {
    if (!clinicianOnline) {
      e.preventDefault();
      openOfflineModal('PsychAI Clinician View App', 'https://psychai-clinician-app.vercel.app/', 'https://psychai-clinician-app.vercel.app/');
    }
  });

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);
  modalProceed.addEventListener('click', closeModal);
}

/* ==========================================================================
   Navbar Scroll Transitions
   ========================================================================== */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

/* ==========================================================================
   Interactive Mood Check Widget
   ========================================================================== */
function initMoodWidget() {
  const emojiButtons = document.querySelectorAll('.btn-mood-emoji');
  const responseBox = document.getElementById('mood-response');

  if (!responseBox) return;

  const responses = {
    '1': "We see you. It's okay to have down days. PsychAI's journal helper is ready to capture your reflections.",
    '2': "Taking a deep breath helps. Try matching the mindfulness breathing pacer bubble on your right.",
    '3': "A calm mind is a great baseline. Log your thoughts in the Patient App to keep tracking trends.",
    '4': "Glad you're doing well! Keeping up with daily check-ins helps maintain clinical balance.",
    '5': "Fantastic! Share your positive energy in today's reflective journal logs."
  };

  emojiButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mood = btn.getAttribute('data-mood');
      
      emojiButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      responseBox.style.opacity = 0;
      setTimeout(() => {
        responseBox.textContent = responses[mood] || '';
        responseBox.style.opacity = 1;
      }, 150);

      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2 + window.scrollX;
      const y = rect.top + rect.height / 2 + window.scrollY;
      createConfetti(x, y);

      // Play soft chime note on mood select!
      playChimeSynthesizer(300 + (mood * 80));
    });
  });
}

/* ==========================================================================
   Mouse Sparkle Particle Emitter
   ========================================================================== */
function initClickSparkles() {
  const colors = ['#0DA99E', '#7C6FCD', '#FF79C6', '#FBBF24', '#0E9F6E'];

  document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;

    const count = 6;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'click-sparkle-particle';
      
      const size = Math.random() * 8 + 4;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = `${e.pageX}px`;
      particle.style.top = `${e.pageY}px`;

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 50 + 20;
      const destinationX = Math.cos(angle) * distance;
      const destinationY = Math.sin(angle) * distance - 20;

      particle.style.setProperty('--dx', `${destinationX}px`);
      particle.style.setProperty('--dy', `${destinationY}px`);

      document.body.appendChild(particle);

      setTimeout(() => {
        particle.remove();
      }, 1000);
    }
  });
}

/* ==========================================================================
   Confetti Explosion Physics
   ========================================================================== */
function createConfetti(centerX, centerY) {
  const colors = ['#0DA99E', '#7C6FCD', '#38bdf8', '#fb7185', '#facc15', '#4ade80'];
  const count = 35;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-burst-piece';
    
    const sizeWidth = Math.random() * 8 + 6;
    const sizeHeight = Math.random() * 12 + 6;
    piece.style.width = `${sizeWidth}px`;
    piece.style.height = `${sizeHeight}px`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.left = `${centerX}px`;
    piece.style.top = `${centerY}px`;

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 100 + 40;
    const distanceX = Math.cos(angle) * velocity;
    const distanceY = Math.sin(angle) * velocity - 10;

    piece.style.setProperty('--dx', `${distanceX}px`);
    piece.style.setProperty('--dy', `${distanceY}px`);

    document.body.appendChild(piece);

    setTimeout(() => {
      piece.remove();
    }, 1500);
  }
}

/* ==========================================================================
   Download / Launch Button Trigger Fun
   ========================================================================== */
function initButtonFunTriggers() {
  const funButtons = document.querySelectorAll('.btn-trigger-fun');
  funButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2 + window.scrollX;
      const y = rect.top + rect.height / 2 + window.scrollY;
      
      createConfetti(x - 20, y);
      createConfetti(x + 20, y);
    });
  });
}

/* ==========================================================================
   Web Audio API Synthesizer (Ambient Chimes)
   ========================================================================== */
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playChimeSynthesizer(frequencyVal = null) {
  if (isMuted) return;
  try {
    initAudioContext();
    const now = audioCtx.currentTime;
    
    // Create oscillator and soft gain node
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    // Major pentatonic scale notes: C4, D4, E4, G4, A4, C5 (261Hz to 523Hz)
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    const freq = frequencyVal || notes[Math.floor(Math.random() * notes.length)];
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    // Gentle volume envelope to create a sweet "chime" sound
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.5); // Decay/Sustain
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 2.5);
  } catch (err) {
    console.warn("Audio Context blocked or failed to initialize", err);
  }
}

function startAmbientLoop() {
  clearInterval(ambientTimer);
  playChimeSynthesizer();
  ambientTimer = setInterval(() => {
    if (videoIsPlaying && !isMuted) {
      playChimeSynthesizer();
    }
  }, 4000);
}

function stopAmbientLoop() {
  clearInterval(ambientTimer);
  if (audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend();
  }
}

/* ==========================================================================
   Voice Synthesis Narration (Speech API)
   ========================================================================== */
function speakText(text, sender) {
  if (isMuted) return;
  if (!window.speechSynthesis) return;

  const doSpeak = () => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      // Both speakers female — AI slightly brighter, patient slightly warmer
      utterance.pitch = sender === 'ai' ? 1.15 : 1.0;
      if (cachedFemaleVoice) utterance.voice = cachedFemaleVoice;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Voice speech synthesis failed to play', err);
    }
  };

  // If voice already cached, speak immediately
  if (cachedFemaleVoice) {
    doSpeak();
  } else {
    // Wait for voices to load then speak
    const original = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = () => {
      loadFemaleVoice();
      if (original) original();
      doSpeak();
    };
  }
}

/* ==========================================================================
   Ecosystem Demo Video Walkthrough Simulation
   ========================================================================== */
function initVideoPlayerSim() {
  const player = document.getElementById('mock-video-player');
  const thumbnail = document.getElementById('video-thumbnail');
  const btnPlay = document.getElementById('btn-play-video');
  const btnPause = document.getElementById('btn-pause-sim');
  const pauseIcon = document.getElementById('pause-icon');
  const seekbarFill = document.getElementById('sim-seekbar-fill');
  const timerLabel = document.getElementById('sim-timer');
  const chatLog = document.getElementById('sim-chat-log');
  const btnLike = document.getElementById('btn-like-sim');
  
  // Audio Controls
  const btnMute = document.getElementById('btn-mute-sim');
  const muteIcon = document.getElementById('mute-icon');

  if (!player || !thumbnail || !btnPlay || !btnPause || !seekbarFill || !timerLabel || !chatLog || !btnMute || !muteIcon) return;

  const playVideo = () => {
    player.classList.add('playing');
    thumbnail.style.display = 'none';
    videoIsPlaying = true;
    
    // Play state pause icon
    pauseIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />';
    
    // Start ambient synthesizers
    initAudioContext();
    startAmbientLoop();
    
    startVideoTimer();
  };

  const pauseVideo = () => {
    videoIsPlaying = false;
    clearInterval(videoInterval);
    stopAmbientLoop();
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Pause state play icon
    pauseIcon.innerHTML = '<path d="M8 5v14l11-7z" />';
  };

  btnPlay.addEventListener('click', playVideo);
  thumbnail.addEventListener('click', playVideo);

  // Auto-play when video section scrolls into view, pause when out
  let autoPlayTriggered = false;
  const videoSection = document.getElementById('intro-video');
  if (videoSection && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!autoPlayTriggered && !videoIsPlaying) {
            autoPlayTriggered = true;
            setTimeout(() => {
              playVideo();
            }, 600);
          }
        } else {
          // Pause when scrolled out
          if (videoIsPlaying) {
            pauseVideo();
          }
        }
      });
    }, { threshold: 0.3 });
    observer.observe(videoSection);
  }

  btnPause.addEventListener('click', () => {
    if (videoIsPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  });

  // Mute / Unmute Handler
  btnMute.addEventListener('click', () => {
    isMuted = !isMuted;
    
    if (isMuted) {
      // Mute Icon
      muteIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopAmbientLoop();
    } else {
      // Unmute Icon
      muteIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
      initAudioContext();
      startAmbientLoop();
    }
  });

  btnLike.addEventListener('click', (e) => {
    const rect = btnLike.getBoundingClientRect();
    createConfetti(rect.left + rect.width / 2 + window.scrollX, rect.top + rect.height / 2 + window.scrollY);
    
    // Play sweet chime chord on heart click!
    playChimeSynthesizer(523.25); // high note C5
    setTimeout(() => playChimeSynthesizer(659.25), 120); // high E5
  });

  function startVideoTimer() {
    clearInterval(videoInterval);
    videoRepeatCount = 0;
    
    const intervalMs = 250;
    videoInterval = setInterval(() => {
      if (!videoIsPlaying) return;

      videoElapsedMs += intervalMs;
      if (videoElapsedMs >= videoDurationMs) {
        videoRepeatCount++;
        if (videoRepeatCount >= videoMaxRepeats) {
          // Stop after 2 full plays
          videoIsPlaying = false;
          clearInterval(videoInterval);
          videoElapsedMs = videoDurationMs;
          seekbarFill.style.width = '100%';
          return;
        }
        videoElapsedMs = 0;
        videoMessagesTriggered.clear();
        chatLog.innerHTML = '';
        resetBarGraph();
        
        // Loop start chime
        playChimeSynthesizer(261.63);
      }

      const percentage = (videoElapsedMs / videoDurationMs) * 100;
      seekbarFill.style.width = `${percentage}%`;

      const seconds = Math.floor(videoElapsedMs / 1000);
      timerLabel.textContent = `00:${seconds < 10 ? '0' + seconds : seconds}`;

      handleVideoTimeline(seconds);
    }, intervalMs);
  }

  function handleVideoTimeline(sec) {
    // 2s: User reports exam stress
    if (sec === 2 && !videoMessagesTriggered.has(2)) {
      videoMessagesTriggered.add(2);
      const text = 'I am feeling extremely stressed about my exams tomorrow.';
      appendSimBubble('user', text);
      speakText(text, 'user');
      updateBarGraph([60, 75, 70, 85, 90]);
      
      // Accompany with synth chime
      playChimeSynthesizer(293.66);
    }
    
    // 6s: AI Counselor grounding breathing prompt
    if (sec === 6 && !videoMessagesTriggered.has(6)) {
      videoMessagesTriggered.add(6);
      const text = "Breathe with me. Take a deep, 4-second breath. Let's ground ourselves together.";
      appendSimBubble('ai', text);
      speakText(text, 'ai');
      
      playChimeSynthesizer(392.00);
    }

    // 13s: User reports breathing helped
    if (sec === 13 && !videoMessagesTriggered.has(13)) {
      videoMessagesTriggered.add(13);
      const text = "That breathing timer helped calm my racing thoughts. Logging this session outcome.";
      appendSimBubble('user', text);
      speakText(text, 'user');
      updateBarGraph([45, 55, 40, 50, 45]);
      
      playChimeSynthesizer(329.63);
    }

    // 20s: AI Counselor informs synced with therapist
    if (sec === 20 && !videoMessagesTriggered.has(20)) {
      videoMessagesTriggered.add(20);
      const text = "Excellent work. I have securely shared this grounding activity with Dr. David Chen.";
      appendSimBubble('ai', text);
      speakText(text, 'ai');
      updateBarGraph([20, 30, 25, 20, 15]);
      
      playChimeSynthesizer(440.00);
    }
  }

  function appendSimBubble(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function updateBarGraph(heights) {
    for (let i = 1; i <= 5; i++) {
      const bar = document.getElementById(`sim-bar-${i}`);
      if (bar && heights[i - 1] !== undefined) {
        bar.style.height = `${heights[i - 1]}%`;
      }
    }
  }

  function resetBarGraph() {
    updateBarGraph([30, 50, 45, 70, 85]);
  }
}