import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  TrainFront, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  FileText, 
  Network, 
  LayoutDashboard, 
  History, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Settings as SettingsIcon,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Fingerprint,
  ShieldCheck,
  Zap,
  Gauge,
  GitBranch,
  MapPin,
  Layers,
  Radio,
  Navigation,
  ArrowRightLeft,
  RefreshCw,
  Eye,
  Award,
  TrendingUp,
  Compass,
  Mic,
  MicOff,
  Sparkles
} from 'lucide-react';
import { MultiLanguageVoiceControl } from './components/MultiLanguageVoiceControl';
import { Login } from './components/Login';
import { DigitalTwinOccupancy } from './components/DigitalTwinOccupancy';
import { SpaceTimeDiagram } from './components/SpaceTimeDiagram';
import { RLBenchmarkArena } from './components/RLBenchmarkArena';
import { apiFetch, getWsBaseUrl } from './config/api';

export default function App() {
  const [session, setSession] = useState(() => {
    const stored = sessionStorage.getItem('railmind_session');
    return stored ? JSON.parse(stored) : null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [highlightAgents, setHighlightAgents] = useState(false);
  
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  
  const [selectedTrain, setSelectedTrain] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [reason, setReason] = useState('Signal Failure');
  
  const [logs, setLogs] = useState([]);
  const [reschedulePlan, setReschedulePlan] = useState({});
  const [report, setReport] = useState(null);
  const [historicalReports, setHistoricalReports] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeDelayStation, setActiveDelayStation] = useState(null);

  // New states for voice-over system
  const [settings, setSettings] = useState({
    audioEnabled: true,
    announcementLang: 'all',
    speechRate: 1.0,
    speechPitch: 1.0
  });
  const [announcementsLog, setAnnouncementsLog] = useState([]);
  const [toastNotifications, setToastNotifications] = useState([]);
  const [currentSeverity, setCurrentSeverity] = useState(null);
  const [currentExplanation, setCurrentExplanation] = useState(null);
  const [voicesStatus, setVoicesStatus] = useState({
    en: false,
    hi: false,
    ja: false
  });
  const [comparisonData, setComparisonData] = useState(null);
  const [reschedulerHealth, setReschedulerHealth] = useState('healthy');
  const [pendingAgentAlert, setPendingAgentAlert] = useState(null);

  // Black-Box Session Replay & WebAuthn States (F4)
  const [biometricAuditEvents, setBiometricAuditEvents] = useState([]);
  const [lastBiometricAuth, setLastBiometricAuth] = useState(null);
  const [replaySnapshots, setReplaySnapshots] = useState([]);
  const [currentScrubIndex, setCurrentScrubIndex] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [auditVerification, setAuditVerification] = useState(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);

  // Enhanced Network Topology Interactive States
  const [selectedTopologyStation, setSelectedTopologyStation] = useState('NDLS');
  const [topologyFilter, setTopologyFilter] = useState('all'); // 'all', 'up', 'down', 'bypass'
  const [isSimulatingInTopology, setIsSimulatingInTopology] = useState(false);

  // Digital Twin & Reinforcement Learning States
  const [platformAllocations, setPlatformAllocations] = useState({});
  const [rlBenchmarkData, setRlBenchmarkData] = useState(null);
  const [spaceTimeTrajectories, setSpaceTimeTrajectories] = useState([]);

  const logsContainerRef = useRef(null);
  const latestSettings = useRef(settings);
  const latestReschedulePlan = useRef(reschedulePlan);
  const latestSeverity = useRef(currentSeverity);
  const latestExplanation = useRef(currentExplanation);
  const latestAnnouncements = useRef(announcementsLog);
  const lastBiometricAuthRef = useRef(lastBiometricAuth);
  const speechQueueRef = useRef([]);
  const speechIndexRef = useRef(0);
  const speechTimeoutRef = useRef(null);
  const activeUtteranceRef = useRef(null);

  useEffect(() => {
    latestReschedulePlan.current = reschedulePlan;
  }, [reschedulePlan]);

  useEffect(() => {
    latestSeverity.current = currentSeverity;
  }, [currentSeverity]);

  useEffect(() => {
    latestExplanation.current = currentExplanation;
  }, [currentExplanation]);

  useEffect(() => {
    latestAnnouncements.current = announcementsLog;
  }, [announcementsLog]);

  useEffect(() => {
    lastBiometricAuthRef.current = lastBiometricAuth;
  }, [lastBiometricAuth]);

  // Session Replay Auto-Playback timer
  useEffect(() => {
    let timer;
    if (isPlayingReplay && replaySnapshots.length > 0) {
      timer = setTimeout(() => {
        setCurrentScrubIndex(prev => {
          if (prev >= replaySnapshots.length - 1) {
            setIsPlayingReplay(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / replaySpeed);
    }
    return () => clearTimeout(timer);
  }, [isPlayingReplay, currentScrubIndex, replaySnapshots.length, replaySpeed]);

  useEffect(() => {
    latestSettings.current = settings;
  }, [settings]);

  useEffect(() => {
    const checkVoices = () => {
      if (!window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      const status = {
        en: voices.some(v => v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().includes('en')),
        hi: voices.some(v => v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().includes('hi')),
        ja: voices.some(v => v.lang.toLowerCase().startsWith('ja') || v.lang.toLowerCase().includes('ja'))
      };
      setVoicesStatus(status);
    };

    checkVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = checkVoices;
    }
  }, []);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    apiFetch('/api/initial-state')
      .then(res => res.json())
      .then(data => {
        setTrains(data.trains);
        setStations(data.stations);
        if (data.trains.length > 0) setSelectedTrain(data.trains[0].id);
        if (data.stations.length > 0) setSelectedStation(data.stations[1].code);
      })
      .catch(err => console.error("Error loading initial state:", err));

    apiFetch('/api/announcements')
      .then(res => res.json())
      .then(data => setAnnouncementsLog(data))
      .catch(err => console.error("Error fetching announcements:", err));

    const ws = new WebSocket(getWsBaseUrl());
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'log') {
        const newLog = msg.data;
        setLogs(prev => [...prev, newLog]);
        setIsProcessing(true);

        // Record Black-Box telemetry snapshot for F4 Session Replay
        setReplaySnapshots(prev => {
          const stepNum = prev.length + 1;
          const snap = {
            stepIndex: stepNum,
            index: newLog.index || stepNum,
            previousHash: newLog.previous_hash || '0'.repeat(64),
            hash: newLog.hash || '',
            timestamp: newLog.timestamp || new Date().toLocaleTimeString(),
            activeAgent: newLog.agent,
            logMessage: newLog.message,
            logDetails: newLog.details || {},
            reschedulePlanState: latestReschedulePlan.current || {},
            severityState: latestSeverity.current || 'Minor',
            explanationState: latestExplanation.current || '',
            announcementsState: [...latestAnnouncements.current],
            biometricAuth: lastBiometricAuthRef.current,
            scenarioTitle: `Delay Simulation on ${selectedTrain ? selectedTrain.toUpperCase() : 'Train'}`
          };
          return [...prev, snap];
        });
      } else if (msg.type === 'reschedule_plan') {
        setReschedulePlan(msg.data);
      } else if (msg.type === 'severity') {
        setCurrentSeverity(msg.data);
      } else if (msg.type === 'incident_explanation') {
        setCurrentExplanation(msg.data);
      } else if (msg.type === 'announcements') {
        setAnnouncementsLog(prev => [...msg.data, ...prev]);
        if (msg.data.length > 0) {
          enqueueAnnouncements(msg.data);
        }
      } else if (msg.type === 'report') {
        setReport(msg.data);
        setHistoricalReports(prev => [
          { id: Date.now(), date: new Date().toLocaleString(), content: msg.data },
          ...prev
        ]);
        setIsProcessing(false);
      } else if (msg.type === 'comparison') {
        setComparisonData(msg.data);
      } else if (msg.type === 'rl_benchmark') {
        setRlBenchmarkData(msg.data);
      } else if (msg.type === 'platform_allocations') {
        setPlatformAllocations(msg.data);
      } else if (msg.type === 'space_time') {
        setSpaceTimeTrajectories(msg.data);
      } else if (msg.type === 'agent_alert') {
        if (msg.data.status === 'crashed') {
          setReschedulerHealth('crashed');
          setPendingAgentAlert(msg.data.message);
          showToast('warning', 'Agent Failure Injected', msg.data.message);
        } else if (msg.data.status === 'recovered') {
          setReschedulerHealth('healthy');
          setPendingAgentAlert(null);
          showToast('success', 'Self-Healing Recovery', msg.data.message);
        }
      }
    };

    return () => {
      ws.close();
      window.speechSynthesis && window.speechSynthesis.cancel();
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, []);

  const showToast = (type, title, message) => {
    const id = Date.now();
    setToastNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToastNotifications(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const clearSpeechQueue = () => {
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    speechQueueRef.current = [];
    speechIndexRef.current = 0;
    activeUtteranceRef.current = null;
  };

  const playQueue = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    if (speechIndexRef.current >= speechQueueRef.current.length) {
      activeUtteranceRef.current = null;
      return;
    }

    const item = speechQueueRef.current[speechIndexRef.current];
    if (!item) return;
    const spokenText = item.text;
    const voices = synth.getVoices();
    const matchingVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith(item.lang.toLowerCase()) || 
      v.lang.toLowerCase().includes(item.lang.split('-')[0].toLowerCase()) ||
      v.name.toLowerCase().includes('tamil') ||
      v.name.toLowerCase().includes('valluvar')
    );

    const utterance = new SpeechSynthesisUtterance(spokenText);
    activeUtteranceRef.current = utterance; // Prevent garbage collection!
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    utterance.lang = item.lang;
    utterance.rate = latestSettings.current.speechRate || 1.0;
    utterance.pitch = latestSettings.current.speechPitch || 1.0;

    const currentIdx = speechIndexRef.current;

    utterance.onend = () => {
      if (speechIndexRef.current === currentIdx) {
        activeUtteranceRef.current = null;
        speechIndexRef.current += 1;
        speechTimeoutRef.current = setTimeout(() => {
          playQueue();
        }, 2000);
      }
    };

    utterance.onerror = (e) => {
      console.error("Speech Synthesis Error:", e);
      if (speechIndexRef.current === currentIdx) {
        activeUtteranceRef.current = null;
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          showToast("error", "TTS Playback Error", `Failed to speak in ${item.lang}. Fallback notification shown.`);
        }
        speechIndexRef.current += 1;
        speechTimeoutRef.current = setTimeout(() => {
          playQueue();
        }, 2000);
      }
    };

    if (synth.paused) {
      synth.resume();
    }
    synth.speak(utterance);

    // Chrome resume-speaking loop to fix the random pauses
    if (window.speechSynthesis) {
      const resumeSpeech = () => {
        if (activeUtteranceRef.current === utterance && window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
          setTimeout(resumeSpeech, 10000);
        }
      };
      setTimeout(resumeSpeech, 10000);
    }
  };

  const enqueueAnnouncements = (newAnnouncements) => {
    if (!latestSettings.current.audioEnabled) {
      newAnnouncements.forEach(ann => {
        showToast("info", "Audio Announcement", `Text notification: ${ann.text_en.slice(0, 50)}...`);
      });
      return;
    }

    const synth = window.speechSynthesis;
    if (!synth) {
      showToast("error", "TTS Unsupported", "Text-to-speech is not supported in this browser. Fallback to text notifications.");
      return;
    }

    if (synth.paused) {
      synth.resume();
    }

    const items = [];
    newAnnouncements.forEach(announcement => {
      if (latestSettings.current.announcementLang === 'en' || latestSettings.current.announcementLang === 'all') {
        if (announcement.text_en) {
          items.push({ text: announcement.text_en, lang: 'en-IN', train_name: announcement.train_name });
        }
      }
      if (latestSettings.current.announcementLang === 'hi' || latestSettings.current.announcementLang === 'all') {
        if (announcement.text_hi) {
          items.push({ text: announcement.text_hi, lang: 'hi-IN', train_name: announcement.train_name });
        }
      }
      if (latestSettings.current.announcementLang === 'ja' || latestSettings.current.announcementLang === 'all') {
        if (announcement.text_ja) {
          items.push({ text: announcement.text_ja, lang: 'ja-JP', train_name: announcement.train_name });
        }
      }
    });

    if (items.length === 0) return;

    const wasEmptyOrFinished = speechIndexRef.current >= speechQueueRef.current.length;
    speechQueueRef.current = [...speechQueueRef.current, ...items];

    if (wasEmptyOrFinished) {
      playQueue();
    }
  };

  const testVoiceAnnouncement = () => {
    clearSpeechQueue();
    const mockAnnouncement = {
      text_en: "Attention passengers. Train number 12302, Rajdhani Express, is running late. We regret the inconvenience caused.",
      text_hi: "कृपया ध्यान दें। गाड़ी संख्या 12302, राजधानी एक्सप्रेस, अपने निर्धारित समय से देरी से चल रही है। आपको हुई असुविधा के लिए हमें खेद है।",
      text_ja: "乗客の皆様にご案内いたします。列車番号 12302、ラージダーニー・エクスプレス は遅れて運行しております。ご不便をおかけして大変申し訳ございません。"
    };
    enqueueAnnouncements([mockAnnouncement]);
  };

  const handleClearAnnouncements = async () => {
    try {
      await apiFetch('/api/clear-announcements', { method: 'POST' });
      setAnnouncementsLog([]);
      showToast("success", "Logs Cleared", "Successfully cleared all announcement audit logs.");
    } catch (err) {
      console.error(err);
      showToast("error", "Error", "Failed to clear announcement logs.");
    }
  };

  const handleKillRescheduler = async () => {
    try {
      await apiFetch('/api/fail-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'rescheduler' })
      });
    } catch (err) {
      console.error("Error killing agent:", err);
    }
  };

  const handleHealRescheduler = async () => {
    try {
      await apiFetch('/api/heal-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'rescheduler' })
      });
    } catch (err) {
      console.error("Error healing agent:", err);
    }
  };

  const triggerBiometricPrompt = async () => {
    try {
      if (window.PublicKeyCredential) {
        // Native browser-level Touch ID / Windows Hello WebAuthn prompt
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "RailMind Command Center", id: window.location.hostname },
            user: {
              id: userId,
              name: "controller@railmind.gov.in",
              displayName: "Chief Operations Controller"
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
            authenticatorSelection: { userVerification: "preferred" },
            timeout: 60000
          }
        });
        
        const timestamp = new Date().toLocaleTimeString();
        const bioEvent = {
          id: Date.now(),
          type: "biometric_auth",
          status: "biometric authorized",
          user: "Chief Operations Controller",
          credentialId: credential ? credential.id.slice(0, 12) + "..." : "PASSKEY_DEMO_OK",
          timestamp: timestamp,
          method: "Touch ID / Windows Hello WebAuthn"
        };
        
        setBiometricAuditEvents(prev => [bioEvent, ...prev]);
        setLastBiometricAuth(bioEvent);
        showToast("success", "Biometric Authorized", `Biometric credential verified at ${timestamp}`);
        return true;
      } else {
        throw new Error("WebAuthn not supported");
      }
    } catch (err) {
      console.warn("Biometric prompt note:", err);
      const timestamp = new Date().toLocaleTimeString();
      const bioEvent = {
        id: Date.now(),
        type: "biometric_auth",
        status: "biometric authorized",
        user: "Chief Operations Controller (Demo Pass)",
        credentialId: "DEMO_HARDWARE_GATE",
        timestamp: timestamp,
        method: "WebAuthn Simulated Hardware Gate"
      };
      setBiometricAuditEvents(prev => [bioEvent, ...prev]);
      setLastBiometricAuth(bioEvent);
      showToast("info", "Biometric Logged", `Client-side authorization logged at ${timestamp}`);
      return true;
    }
  };

  const handleVerifyAuditChain = async () => {
    setIsVerifyingChain(true);
    try {
      const res = await apiFetch('/api/verify-audit-chain');
      const data = await res.json();
      setAuditVerification(data);
      if (data.is_valid) {
        showToast('success', 'Chain Integrity Verified', `Hash chain valid: ${data.chain_length} linked records verified via SHA-256.`);
      } else {
        showToast('error', 'Integrity Break Detected', data.status_message);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Verification Failed', 'Unable to connect to audit verification endpoint.');
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const handleInjectDelay = async () => {
    await triggerBiometricPrompt();
    clearSpeechQueue();
    setLogs([]);
    setReschedulePlan({});
    setReport(null);
    setCurrentSeverity(null);
    setCurrentExplanation(null);
    setComparisonData(null);
    setReplaySnapshots([]);
    setCurrentScrubIndex(0);
    setIsProcessing(true);
    setActiveDelayStation(selectedStation);
    
    await apiFetch('/api/inject-delay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        train_id: selectedTrain,
        station_code: selectedStation,
        delay_minutes: delayMinutes,
        reason: reason
      })
    });
  };

  const triggerAgentHighlight = () => {
    setHighlightAgents(true);
    setTimeout(() => {
      setHighlightAgents(false);
    }, 3000);
  };

  const handleVoiceCommand = async (commandResult) => {
    const { action, params } = commandResult;
    
    switch (action) {
      case 'reschedule': {
        const train_id = params.train_id || 't1';
        const new_time = params.new_time || params.time || '11:00 AM';

        // Find train by ID or name/number
        const train = trains.find(t => 
          t.id.toLowerCase() === train_id.toLowerCase() || 
          t.number === train_id || 
          t.name.toLowerCase().includes(train_id.toLowerCase())
        ) || (trains.length > 0 ? trains[0] : { id: 't1', name: 'Vande Bharat Express', route: ['NDLS', 'CNB', 'PRYJ', 'BSB'], schedule: { NDLS: '06:00' } });

        const stationCode = selectedStation || train.route[0] || 'NDLS';
        const origTime = train.schedule ? train.schedule[stationCode] : '06:00';
        
        // Parse time to minutes to compute difference
        const parseTimeToMinutes = (timeStr) => {
          if (!timeStr) return null;
          const match = timeStr.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
          if (!match) {
            const hourMatch = timeStr.match(/(\d{1,2})/);
            if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
            return null;
          }
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const ampm = match[3];
          if (ampm) {
            if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
            if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
          }
          return hours * 60 + minutes;
        };

        const origMin = parseTimeToMinutes(origTime);
        const newMin = parseTimeToMinutes(new_time);
        let delayMin = 45; // default delay if calculation fails

        if (origMin !== null && newMin !== null) {
          delayMin = newMin - origMin;
          if (delayMin <= 0) {
            delayMin += 24 * 60; // handle overnight transition
          }
          if (delayMin <= 0 || delayMin > 1440) {
            delayMin = 45;
          }
        }

        setSelectedTrain(train.id);
        setSelectedStation(stationCode);
        setDelayMinutes(delayMin);
        
        clearSpeechQueue();
        setLogs([]);
        setReschedulePlan({});
        setReport(null);
        setCurrentSeverity(null);
        setCurrentExplanation(null);
        setComparisonData(null);
        setIsProcessing(true);
        setActiveDelayStation(stationCode);

        try {
          await apiFetch('/api/inject-delay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              train_id: train.id,
              station_code: stationCode,
              delay_minutes: delayMin,
              reason: 'Voice Reschedule'
            })
          });
          showToast('success', 'Voice Reschedule', `Reschedule triggered: ${train.name} at ${stationCode} (+${delayMin}m)`);
        } catch (err) {
          console.error("Error triggering reschedule:", err);
          showToast('error', 'Simulation Error', 'Failed to trigger reschedule simulation.');
          setIsProcessing(false);
        }
        break;
      }

      case 'focus_train': {
        const train_id = params.train_id;
        if (!train_id) break;

        const train = trains.find(t => 
          t.id.toLowerCase() === train_id.toLowerCase() || 
          t.number === train_id || 
          t.name.toLowerCase().includes(train_id.toLowerCase())
        );

        if (train) {
          setSelectedTrain(train.id);
          showToast('info', 'Focus Train', `Focused on train: ${train.name} (${train.number})`);
        } else {
          showToast('error', 'Focus Train', `Train "${train_id}" not found.`);
        }
        break;
      }

      case 'show_delays':
        setActiveTab('dashboard');
        showToast('info', 'Delay Status', `Monitoring delays across ${trains.length} trains on the corridor.`);
        break;

      case 'escalate': {
        const targetTrainId = selectedTrain || (trains.length > 0 ? trains[0].id : 't1');
        const train = trains.find(t => t.id === targetTrainId) || (trains.length > 0 ? trains[0] : { id: 't1', name: 'Vande Bharat Express', route: ['NDLS'] });
        const stationCode = selectedStation || (train.route ? train.route[0] : 'NDLS');
        
        clearSpeechQueue();
        setLogs([]);
        setReschedulePlan({});
        setReport(null);
        setCurrentSeverity(null);
        setCurrentExplanation(null);
        setComparisonData(null);
        setIsProcessing(true);
        setActiveDelayStation(stationCode);

        try {
          await apiFetch('/api/inject-delay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              train_id: targetTrainId,
              station_code: stationCode,
              delay_minutes: 90,
              reason: 'Voice Escalation Control'
            })
          });
          showToast('warning', 'Escalation Triggered', `Incident on ${train.name} escalated (+90m delay injected).`);
        } catch (err) {
          console.error("Error triggering escalation:", err);
          showToast('error', 'Simulation Error', 'Failed to trigger escalation simulation.');
          setIsProcessing(false);
        }
        break;
      }

      case 'show_agents':
        setActiveTab('dashboard');
        setTimeout(triggerAgentHighlight, 100);
        showToast('info', 'Agent Activity', 'Highlighting live multi-agent activity pipeline.');
        break;

      case 'show_metrics': {
        setActiveTab('dashboard');
        let metricsMsg = 'No active incidents. Corridor running normal.';
        if (comparisonData) {
          metricsMsg = `Corridor Metrics: \nPassenger Minutes Saved: ${comparisonData.saved_passenger_minutes.toLocaleString()} min \nRailMind Commute Time: ${(comparisonData.railmind.passenger_minutes / 850).toFixed(1)} hrs \nBaseline Gridlock: ${(comparisonData.baseline.passenger_minutes / 850).toFixed(1)} hrs`;
        } else if (currentExplanation) {
          metricsMsg = `Active Incident: \n${currentExplanation}`;
        }
        showToast('info', 'System Metrics', metricsMsg);
        break;
      }

      case 'show_incidents':
        setActiveTab('reports');
        break;

      case 'show_status':
        showToast('info', 'System Status', 'System Operational. Websocket connected. Voice commands active.');
        break;

      case 'mute':
        setSettings(prev => ({ ...prev, audioEnabled: false }));
        showToast('info', 'Audio Muted', 'Voice-over audio muted.');
        break;

      case 'unmute':
        setSettings(prev => ({ ...prev, audioEnabled: true }));
        showToast('success', 'Audio Unmuted', 'Voice-over audio enabled.');
        break;

      case 'enable_voice':
        showToast('info', 'Voice Control', 'Continuous listening mode initialized.');
        break;

      default:
        console.warn("Unhandled action:", action);
    }
  };

  const renderSidebar = (onLogout) => (
    <div className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '0 10px' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
          <TrainFront size={24} color="white" />
        </div>
        <h1 className="text-gradient" style={{ fontSize: '24px' }}>RailMind</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 12px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{session.name}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{session.role.replace('_', ' ')}</span>
        <button
          onClick={onLogout}
          style={{ marginTop: '8px', background: 'none', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--error)', borderRadius: '6px', padding: '5px 0', fontSize: '11px', cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>

      <div 
        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutDashboard size={20} />
        Live Dashboard
      </div>
      <div 
        className={`nav-item ${activeTab === 'network' ? 'active' : ''}`}
        onClick={() => setActiveTab('network')}
      >
        <Network size={20} />
        Network Topology
      </div>
      <div 
        className={`nav-item ${activeTab === 'digital_twin' ? 'active' : ''}`}
        onClick={() => setActiveTab('digital_twin')}
      >
        <Layers size={20} />
        Platform Interlocking
      </div>
      <div 
        className={`nav-item ${activeTab === 'space_time' ? 'active' : ''}`}
        onClick={() => setActiveTab('space_time')}
      >
        <Compass size={20} />
        Conflict Resolver (AI vs Rule)
      </div>
      <div 
        className={`nav-item ${activeTab === 'rl_benchmark' ? 'active' : ''}`}
        onClick={() => setActiveTab('rl_benchmark')}
      >
        <Award size={20} />
        AI RL Benchmark
      </div>
      <div 
        className={`nav-item ${activeTab === 'replay' ? 'active' : ''}`}
        onClick={() => setActiveTab('replay')}
      >
        <RotateCcw size={20} />
        Session Replay
      </div>
      <div 
        className={`nav-item ${activeTab === 'announcements' ? 'active' : ''}`}
        onClick={() => setActiveTab('announcements')}
      >
        <Volume2 size={20} />
        Announcement Audit
      </div>
      <div 
        className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
        onClick={() => setActiveTab('reports')}
      >
        <History size={20} />
        Incident History
      </div>
      <div 
        className={`nav-item ${activeTab === 'voice' ? 'active' : ''}`}
        onClick={() => setActiveTab('voice')}
      >
        <Mic size={20} />
        Voice Command Center
      </div>
      <div 
        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => setActiveTab('settings')}
      >
        <SettingsIcon size={20} />
        Settings
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <MultiLanguageVoiceControl onCommand={handleVoiceCommand} showToast={showToast} />
      </div>
    </div>
  );

  const renderNetworkTopology = () => {
    const mainRoute = ["NDLS", "CNB", "PRYJ", "BSB", "PNBE", "HWH"];
    const severityColor = currentSeverity === 'Critical' ? 'var(--error)' : currentSeverity === 'Major' ? 'var(--warning)' : 'var(--accent-secondary)';
    const isDelayActive = !!activeDelayStation;

    const STATION_META = {
      NDLS: { name: "New Delhi", zone: "Northern Railway (NR)", division: "Delhi (DLI)", platforms: 16, kavach: "Active (v4.0)", speedLimit: "130 km/h", coords: "28.64° N, 77.21° E", elevation: "216m", tracks: 16 },
      CNB: { name: "Kanpur Central", zone: "North Central (NCR)", division: "Prayagraj (PRYJ)", platforms: 10, kavach: "Active (v4.0)", speedLimit: "130 km/h", coords: "26.45° N, 80.35° E", elevation: "126m", tracks: 14 },
      PRYJ: { name: "Prayagraj Junction", zone: "North Central (NCR)", division: "Prayagraj (PRYJ)", platforms: 10, kavach: "Active (v4.0)", speedLimit: "130 km/h", coords: "25.45° N, 81.83° E", elevation: "98m", tracks: 12 },
      BSB: { name: "Varanasi Junction", zone: "Northern Railway (NR)", division: "Lucknow (LKO)", platforms: 9, kavach: "Active (v4.0)", speedLimit: "110 km/h", coords: "25.32° N, 82.98° E", elevation: "81m", tracks: 9 },
      PNBE: { name: "Patna Junction", zone: "East Central (ECR)", division: "Danapur (DNR)", platforms: 10, kavach: "Active (v4.0)", speedLimit: "130 km/h", coords: "25.60° N, 85.13° E", elevation: "53m", tracks: 10 },
      HWH: { name: "Howrah Junction", zone: "Eastern Railway (ER)", division: "Howrah (HWH)", platforms: 23, kavach: "Active (v4.0)", speedLimit: "110 km/h", coords: "22.58° N, 88.34° E", elevation: "9m", tracks: 23 }
    };

    const SECTION_DATA = [
      { from: "NDLS", to: "CNB", dist: "440 km", time: "4h 08m", tracks: "Double Track (130 km/h)", blockCount: 14 },
      { from: "CNB", to: "PRYJ", dist: "194 km", time: "2h 00m", tracks: "Double Track (130 km/h)", blockCount: 7 },
      { from: "PRYJ", to: "BSB", dist: "125 km", time: "1h 52m", tracks: "Double Track (110 km/h)", blockCount: 5 },
      { from: "BSB", to: "PNBE", dist: "230 km", time: "2h 45m", tracks: "Double Track (130 km/h)", blockCount: 8 },
      { from: "PNBE", to: "HWH", dist: "532 km", time: "5h 55m", tracks: "Quad Track Trunk (130 km/h)", blockCount: 18 }
    ];

    const currentStationData = STATION_META[selectedTopologyStation] || STATION_META["NDLS"];
    const delayOriginIndex = activeDelayStation ? mainRoute.indexOf(activeDelayStation) : -1;

    // Trains passing selected station
    const passingTrains = trains.filter(t => t.route.includes(selectedTopologyStation));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', flex: 1 }}>
        
        {/* Top OCC Telemetry HUD */}
        <div className="glass-panel" style={{ padding: '20px 24px', background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.08) 0%, rgba(18, 22, 38, 0.9) 100%)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 className="text-gradient" style={{ fontSize: '24px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Network size={26} color="var(--accent-secondary)" /> Northern-Eastern Golden Trunk Topology
                </h1>
                <span className="citation-badge" style={{ background: isDelayActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isDelayActive ? 'var(--error)' : 'var(--success)', borderColor: isDelayActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)' }}>
                  {isDelayActive ? `⚠️ CONGESTION: ${activeDelayStation}` : '🟢 100% NOMINAL FLOW'}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                Live double-track interlocking, automatic block signaling, KAVACH ATP telemetry, and dynamic AI bypass routing.
              </p>
            </div>

            {/* Topology Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.35)', padding: '4px 6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { id: 'all', label: 'All Corridors', icon: Layers },
                { id: 'up', label: 'UP Line (NDLS→HWH)', icon: Navigation },
                { id: 'down', label: 'DOWN Line (HWH→NDLS)', icon: ArrowRightLeft },
                { id: 'bypass', label: 'AI Bypass Loops', icon: GitBranch }
              ].map(tab => {
                const Icon = tab.icon;
                const active = topologyFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTopologyFilter(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: active ? '600' : 'normal',
                      background: active ? 'var(--accent-primary)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Icon size={14} /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HUD Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Gauge size={14} color="var(--accent-secondary)" /> Trunk Distance
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace' }}>
                1,521 km <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(6 Interlocks)</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <ShieldCheck size={14} color="#10b981" /> ATP Protection
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>
                KAVACH 4.0 <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'normal' }}>SIL-4 Locked</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Activity size={14} color="var(--accent-primary)" /> Fleet Velocity
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: isDelayActive ? 'var(--warning)' : '#38bdf8', marginTop: '4px', fontFamily: 'monospace' }}>
                {isDelayActive ? '86 km/h (Caution)' : '124 km/h (Nominal)'}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <TrainFront size={14} color="#f59e0b" /> Monitored Fleet
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace' }}>
                {trains.length} Express · 3 Standby
              </div>
            </div>
          </div>
        </div>

        {/* Main Interactive Topology Visual Canvas */}
        <div className="glass-panel topology-radar-bg" style={{ padding: '36px 30px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.25)', minHeight: '380px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          
          {/* Legend Banner */}
          <div style={{ position: 'absolute', top: '16px', left: '24px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)', zIndex: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
              Clear Track / Green Signal
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 8px var(--warning)' }}></span>
              Caution / Rerouted Section
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--error)', boxShadow: '0 0 8px var(--error)' }}></span>
              Active Block / Incident Zone
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '18px', height: '3px', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', borderRadius: '2px' }}></span>
              AI Dynamic Bypass Chord
            </span>
          </div>

          {/* Live Track Diagram */}
          <div style={{ position: 'relative', width: '100%', marginTop: '40px', marginBottom: '30px' }}>
            
            {/* SVG Track Layer with Sleeper Marks & Animated Beams */}
            <svg style={{ width: '100%', height: '160px', overflow: 'visible' }}>
              <defs>
                <linearGradient id="upLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                </linearGradient>

                <linearGradient id="alertGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="bypassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* UP LINE (Top Track) */}
              {(topologyFilter === 'all' || topologyFilter === 'up') && (
                <g>
                  {/* Track Ballast Base */}
                  <line x1="5%" y1="40" x2="95%" y2="40" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
                  {/* Steel Rails */}
                  <line x1="5%" y1="38" x2="95%" y2="38" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                  <line x1="5%" y1="42" x2="95%" y2="42" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                  {/* Flowing Energy Beam */}
                  <line 
                    x1="5%" 
                    y1="40" 
                    x2="95%" 
                    y2="40" 
                    stroke={isDelayActive ? "url(#alertGrad)" : "url(#upLineGrad)"} 
                    strokeWidth="3" 
                    className="track-flow-beam"
                    filter="url(#glow)"
                  />
                  <text x="2%" y="44" fill="var(--text-secondary)" fontSize="10" fontFamily="monospace" fontWeight="bold">UP</text>
                </g>
              )}

              {/* AI Dynamic Bypass Chord Loop (Connecting PRYJ / BSB / PNBE) */}
              {(topologyFilter === 'all' || topologyFilter === 'bypass' || isDelayActive) && (
                <g>
                  <path 
                    d="M 41% 40 C 45% 95, 55% 95, 77% 40" 
                    fill="none" 
                    stroke="url(#bypassGrad)" 
                    strokeWidth={isDelayActive ? "3.5" : "2"} 
                    strokeDasharray="6 6"
                    className="track-flow-beam-fast"
                    filter="url(#glow)"
                  />
                  <rect x="54%" y="78" width="120" height="20" rx="6" fill="rgba(18, 22, 38, 0.9)" stroke="rgba(139, 92, 246, 0.5)" />
                  <text x="60%" y="92" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
                    ⚡ AI CHORD BYPASS (42 km)
                  </text>
                </g>
              )}

              {/* DOWN LINE (Bottom Track) */}
              {(topologyFilter === 'all' || topologyFilter === 'down') && (
                <g>
                  {/* Track Ballast Base */}
                  <line x1="5%" y1="120" x2="95%" y2="120" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
                  {/* Steel Rails */}
                  <line x1="5%" y1="118" x2="95%" y2="118" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                  <line x1="5%" y1="122" x2="95%" y2="122" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                  {/* Flowing Energy Beam */}
                  <line 
                    x1="5%" 
                    y1="120" 
                    x2="95%" 
                    y2="120" 
                    stroke="url(#upLineGrad)" 
                    strokeWidth="3" 
                    className="track-flow-beam"
                    filter="url(#glow)"
                  />
                  <text x="2%" y="124" fill="var(--text-secondary)" fontSize="10" fontFamily="monospace" fontWeight="bold">DN</text>
                </g>
              )}
            </svg>

            {/* Station Nodes Positioned Along Corridor */}
            <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '160px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
              {mainRoute.map((code, index) => {
                const station = stations.find(s => s.code === code);
                const meta = STATION_META[code] || {};
                const isSelected = selectedTopologyStation === code;
                const isDelayedNode = activeDelayStation && index >= delayOriginIndex;
                const isOriginOfDelay = code === activeDelayStation;

                const nodeStatusColor = isOriginOfDelay 
                  ? 'var(--error)' 
                  : isDelayedNode 
                    ? 'var(--warning)' 
                    : 'var(--success)';

                return (
                  <div 
                    key={code} 
                    className={`station-node-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTopologyStation(code)}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      position: 'relative', 
                      pointerEvents: 'auto',
                      zIndex: isSelected ? 30 : 15
                    }}
                  >
                    {/* Top Signal Aspect Indicator */}
                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.6)', padding: '3px 6px', borderRadius: '12px', border: `1px solid ${nodeStatusColor}44` }}>
                      <span 
                        className="signal-lamp"
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: nodeStatusColor, 
                          boxShadow: `0 0 10px ${nodeStatusColor}` 
                        }}
                      />
                      <span style={{ fontSize: '9px', fontWeight: 'bold', color: nodeStatusColor, fontFamily: 'monospace' }}>
                        {isOriginOfDelay ? 'STOP' : isDelayedNode ? 'CAUTION' : 'CLEAR'}
                      </span>
                    </div>

                    {/* Circular Interlocking Hub */}
                    <div 
                      style={{ 
                        width: isSelected ? '46px' : '38px', 
                        height: isSelected ? '46px' : '38px', 
                        borderRadius: '50%', 
                        background: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(18, 22, 38, 0.95)', 
                        border: `3px solid ${nodeStatusColor}`, 
                        boxShadow: isSelected 
                          ? `0 0 25px ${nodeStatusColor}, inset 0 0 12px ${nodeStatusColor}88` 
                          : `0 0 12px ${nodeStatusColor}66`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative'
                      }}
                    >
                      <span style={{ fontSize: isSelected ? '12px' : '11px', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>
                        {code}
                      </span>

                      {/* Concentric Cascading Shockwave Animation for Incident Station */}
                      {isOriginOfDelay && (
                        <div className="shockwave" style={{ background: severityColor }} />
                      )}
                    </div>

                    {/* Station Name & Platform Badge */}
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: isSelected ? '700' : '600', color: isSelected ? '#fff' : 'var(--text-secondary)' }}>
                        {station?.name || meta.name || code}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span>PF 1-{meta.platforms || 8}</span>
                        <span>•</span>
                        <span style={{ color: nodeStatusColor, fontWeight: '600' }}>
                          {isOriginOfDelay ? `+${delayMinutes}m DELAY` : isDelayedNode ? 'CASCADE' : 'ON TIME'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Moving / Positioned Train Tags Along Corridor */}
            <div style={{ position: 'absolute', top: '10px', left: '10%', right: '10%', display: 'flex', justifyContent: 'space-around', pointerEvents: 'none' }}>
              
              {/* Train 1: Vande Bharat Express (22436) */}
              <div 
                className="train-tag"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(30, 41, 59, 0.95))', 
                  border: '1px solid rgba(56, 189, 248, 0.6)', 
                  borderRadius: '10px', 
                  padding: '6px 10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  pointerEvents: 'auto',
                  cursor: 'pointer' 
                }}
                onClick={() => setSelectedTrain('t1')}
                title="Click to select Vande Bharat Express (22436)"
              >
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '6px' }}>
                  <TrainFront size={14} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>22436 Vande Bharat</div>
                  <div style={{ fontSize: '9px', color: '#bae6fd' }}>
                    {reschedulePlan['t1'] ? '⚠️ Rescheduled' : '⚡ 130 km/h · Block CNB-PRYJ'}
                  </div>
                </div>
              </div>

              {/* Train 2: Rajdhani Express (12302) */}
              <div 
                className="train-tag"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(30, 41, 59, 0.95))', 
                  border: '1px solid rgba(245, 158, 11, 0.6)', 
                  borderRadius: '10px', 
                  padding: '6px 10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  pointerEvents: 'auto',
                  cursor: 'pointer' 
                }}
                onClick={() => setSelectedTrain('t2')}
                title="Click to select Rajdhani Express (12302)"
              >
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '6px' }}>
                  <TrainFront size={14} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>12302 Rajdhani Exp</div>
                  <div style={{ fontSize: '9px', color: '#fef3c7' }}>
                    {reschedulePlan['t2'] ? '⚠️ Cascading Delay' : '🟢 120 km/h · Block PRYJ-PNBE'}
                  </div>
                </div>
              </div>

              {/* Standby Relief Rake */}
              <div 
                className="train-tag"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(30, 41, 59, 0.95))', 
                  border: '1px solid rgba(139, 92, 246, 0.6)', 
                  borderRadius: '10px', 
                  padding: '6px 10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  pointerEvents: 'auto' 
                }}
              >
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '6px' }}>
                  <Zap size={14} color="#c084fc" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>02401 Relief Special</div>
                  <div style={{ fontSize: '9px', color: '#e9d5ff' }}>Standby Siding at CNB</div>
                </div>
              </div>

            </div>

          </div>

          {/* Track Section Distance Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            {SECTION_DATA.map((sec, i) => (
              <div key={i} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {sec.from} ➔ {sec.to}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {sec.dist} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({sec.time})</span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--accent-secondary)', marginTop: '2px' }}>
                  {sec.blockCount} Auto Block Sections
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Station Deep-Dive Telemetry Inspector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(380px, 1.4fr)', gap: '20px' }}>
          
          {/* Station Technical Specs Card */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                  Station Telemetry Inspector
                </div>
                <h2 style={{ fontSize: '20px', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={20} color="var(--accent-primary)" /> {currentStationData.name} ({selectedTopologyStation})
                </h2>
              </div>
              <span className="citation-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                {currentStationData.division}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '18px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Railway Zone</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>{currentStationData.zone}</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Platforms & Tracks</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>{currentStationData.platforms} PFs · {currentStationData.tracks} Yard Tracks</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>KAVACH / ATP Status</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--success)', marginTop: '2px' }}>{currentStationData.kavach}</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Section Speed Limit</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-secondary)', marginTop: '2px' }}>{currentStationData.speedLimit}</div>
              </div>
            </div>

            {/* Direct Delay Injection Action from Topology */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="btn-primary"
                onClick={async () => {
                  setSelectedStation(selectedTopologyStation);
                  setActiveTab('dashboard');
                  showToast('info', 'Target Station Set', `Selected ${selectedTopologyStation} for delay injection.`);
                }}
                style={{ flex: 1, padding: '10px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <AlertTriangle size={15} /> Inject Simulation Here
              </button>
            </div>
          </div>

          {/* Passing Trains Live Timetable & Interlocking Status Card */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--warning)" /> Scheduled Train Movements at {selectedTopologyStation}
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {passingTrains.length} Services Passing
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {passingTrains.map(t => {
                const origTime = t.schedule[selectedTopologyStation];
                const reschedTime = reschedulePlan[t.id] ? reschedulePlan[t.id][selectedTopologyStation] : null;
                const isDelayed = reschedTime && reschedTime !== origTime;

                return (
                  <div 
                    key={t.id}
                    style={{
                      background: isDelayed ? 'rgba(245, 158, 11, 0.08)' : 'rgba(0,0,0,0.3)',
                      border: isDelayed ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t.name} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({t.number})</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Route: {t.route.join(' ➔ ')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: isDelayed ? 'var(--warning)' : 'var(--success)', fontFamily: 'monospace' }}>
                          {reschedTime || origTime || 'N/A'}
                        </span>
                        {isDelayed && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through', fontFamily: 'monospace' }}>
                            {origTime}
                          </span>
                        )}
                      </div>
                      <span 
                        className={`status-badge ${isDelayed ? 'status-delayed' : 'status-ontime'}`}
                        style={{ fontSize: '9px', padding: '2px 8px', marginTop: '3px' }}
                      >
                        {isDelayed ? '⚠️ RESCHEDULED' : '✓ ON TIME'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    );
  };

  const renderDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '15px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '30px', margin: 0 }}>Live Operations Command</h1>
          <p className="text-gradient-accent" style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px', marginTop: '4px', margin: 0 }}>Delay Propagation & Recovery</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isProcessing ? 'var(--warning)' : 'var(--success)', animation: isProcessing ? 'pulseGlow 1.5s infinite' : 'none' }}></div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{isProcessing ? 'Agents Active' : 'System Ready'}</span>
        </div>
      </header>

      {pendingAgentAlert && (
        <div className="glass-panel resilience-banner animate-slide-up" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '14px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <AlertTriangle size={24} color="var(--warning)" />
            <div>
              <div style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '15px' }}>{pendingAgentAlert}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Self-healing watchdog active. Process will automatically restart in &lt; 15s.</div>
            </div>
          </div>
          <button 
            className="btn-heal" 
            onClick={handleHealRescheduler}
            style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'var(--success)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s ease' }}
          >
            Force Resume Now
          </button>
        </div>
      )}

      {comparisonData && (
        <div className="glass-panel comparison-panel animate-slide-up" style={{ padding: '20px 24px', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.08) 0%, rgba(18, 22, 38, 0.85) 100%)', borderRadius: '16px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="text-gradient" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Activity size={20} color="var(--accent-primary)" /> RailMind Optimized vs Baseline Comparison
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px', margin: 0 }}>Parallel simulation results comparing recovery strategies.</p>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '8px 14px', borderRadius: '10px', textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'var(--success)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Passenger-Minutes Saved</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', fontFamily: 'monospace' }}>
                {comparisonData.saved_passenger_minutes.toLocaleString()} min
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Baseline Path */}
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '14px 16px' }}>
              <h3 style={{ color: 'var(--error)', fontSize: '14px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 10px 0' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--error)' }}></span>
                Baseline (Unmitigated Gridlock)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Delay Time</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {(comparisonData.baseline.passenger_minutes / 850).toFixed(1)} hrs (commute equivalent)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Max Cascade Depth</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {comparisonData.baseline.max_cascade_depth} stations
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status of Affected Trains</span>
                  <span style={{ color: 'var(--error)', fontWeight: '600' }}>
                    {comparisonData.baseline.trains_cascading} cascading, 0 re-routed
                  </span>
                </div>
              </div>
            </div>

            {/* RailMind Path */}
            <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', padding: '14px 16px' }}>
              <h3 style={{ color: 'var(--accent-secondary)', fontSize: '14px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 10px 0' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-secondary)' }}></span>
                RailMind (Optimized Recovery)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Delay Time</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {(comparisonData.railmind.passenger_minutes / 850).toFixed(1)} hrs (commute equivalent)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Max Cascade Depth</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {comparisonData.railmind.max_cascade_depth} stations
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status of Affected Trains</span>
                  <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                    {comparisonData.railmind.trains_cascading} cascading, {comparisonData.railmind.trains_rerouted} re-routed
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', fontStyle: 'italic' }}>
            * Note: Passenger-minutes calculations assume a configurable average of 850 passengers per train (simulated operational metric).
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(350px, 1fr) minmax(380px, 1.15fr)', gap: '24px', alignItems: 'start', paddingBottom: '50px' }}>
        
        {/* Control Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <AlertTriangle size={20} color="var(--error)" /> Inject Delay
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Target Train</label>
            <select value={selectedTrain} onChange={(e) => setSelectedTrain(e.target.value)}>
              {trains.map(t => <option key={t.id} value={t.id}>{t.name} ({t.number})</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Location</label>
            <select value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)}>
              {stations.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Delay (Minutes)</label>
            <input type="number" value={delayMinutes} onChange={(e) => setDelayMinutes(parseInt(e.target.value))} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="Signal Failure">Signal Failure</option>
              <option value="Track Maintenance">Track Maintenance</option>
              <option value="Weather">Weather / Fog</option>
              <option value="Locomotive Issue">Locomotive Issue</option>
            </select>
          </div>

          <button className="btn-primary" onClick={handleInjectDelay} disabled={isProcessing} style={{ marginTop: '10px' }}>
            {isProcessing ? 'Processing...' : 'Trigger Simulation'}
          </button>

          <div style={{ marginTop: '6px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Fault Injection Demo</div>
            <button 
              className={`btn-danger-outline ${reschedulerHealth === 'crashed' ? 'crashed-pulse' : ''}`}
              onClick={handleKillRescheduler}
              disabled={reschedulerHealth === 'crashed'}
              style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', cursor: reschedulerHealth === 'crashed' ? 'not-allowed' : 'pointer', background: reschedulerHealth === 'crashed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.08)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.3)', transition: 'all 0.2s ease' }}
            >
              {reschedulerHealth === 'crashed' ? '⚠️ Rescheduler Crashed (Watchdog Active...)' : 'Kill Rescheduler Process (F3 Demo)'}
            </button>
          </div>
        </div>

        {/* Live Agent Logs */}
        <div className={`glass-panel ${highlightAgents ? 'highlight-panel' : ''}`} style={{ padding: '28px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <Activity size={24} color="var(--accent-secondary)" /> Live Agent Activity
          </h2>
          
          <div ref={logsContainerRef} style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
            {logs.length === 0 && !isProcessing && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
                Waiting for events...
              </div>
            )}
            
            {logs.map((log, i) => (
              <div key={i} className="agent-node animate-slide-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{log.agent}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.timestamp}</span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {log.message}
                </div>
                {log.details && (
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Object.entries(log.details).map(([key, value]) => {
                      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      
                      if (typeof value === 'object' && value !== null) {
                        return (
                          <div key={key} style={{ width: '100%', marginTop: '4px' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{formattedKey}:</div>
                            <pre style={{ margin: 0, padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', fontSize: '11px', color: 'var(--accent-secondary)', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={key} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', display: 'flex', gap: '6px', fontStyle: 'normal' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{formattedKey}:</span>
                          <span style={{ color: 'var(--accent-secondary)', fontWeight: '600' }}>{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System State & Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0, overflowY: 'auto' }}>
          
          {/* Updated Schedules Panel */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1, minHeight: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <Clock size={22} color="var(--warning)" /> Updated Schedules
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {Object.keys(reschedulePlan).length > 0 ? `${Object.keys(reschedulePlan).length} Trains Rescheduled` : 'All Trains On Time'}
              </span>
            </div>
            
            {trains.map(t => {
              const isAffected = reschedulePlan[t.id];
              return (
                <div 
                  key={t.id} 
                  className={`schedule-card ${isAffected ? (currentSeverity === 'Critical' ? 'border-severity-critical' : currentSeverity === 'Major' ? 'border-severity-major' : 'border-severity-minor') : ''}`}
                  style={{ marginBottom: '14px', padding: '16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '15px' }}>{t.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>({t.number})</span>
                    </div>
                    <span 
                      className={`status-badge ${isAffected ? 'status-delayed' : 'status-ontime'}`}
                      style={isAffected ? {
                        background: currentSeverity === 'Critical' ? 'var(--error-bg)' : currentSeverity === 'Major' ? 'var(--warning-bg)' : 'rgba(245, 158, 11, 0.15)',
                        color: currentSeverity === 'Critical' ? 'var(--error)' : 'var(--warning)',
                        borderColor: currentSeverity === 'Critical' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                      } : {}}
                    >
                      {isAffected ? '⚠️ RESCHEDULED' : '✓ ON TIME'}
                    </span>
                  </div>
                  
                  {/* Detailed Station Timetable Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {t.route.map((st) => {
                      const newTime = isAffected ? reschedulePlan[t.id][st] : null;
                      const origTime = t.schedule[st];
                      const timeChanged = newTime && newTime !== origTime;
                      
                      return (
                        <div 
                          key={st} 
                          style={{ 
                            padding: '8px 10px', 
                            background: timeChanged ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 0, 0, 0.25)', 
                            border: timeChanged ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px'
                          }}
                        >
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{st}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: timeChanged ? 'var(--warning)' : 'var(--text-primary)' }}>
                              {newTime || origTime}
                            </span>
                            {timeChanged && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                {origTime}
                              </span>
                            )}
                          </div>
                          {timeChanged && (
                            <div style={{ fontSize: '10px', color: 'var(--warning)', marginTop: '2px' }}>
                              Delayed
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Incident Explanation System */}
          {currentExplanation && (
            <div className={`glass-panel animate-slide-in ${currentSeverity === 'Critical' ? 'border-severity-critical' : currentSeverity === 'Major' ? 'border-severity-major' : 'border-severity-minor'}`} style={{ padding: '24px', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: currentSeverity === 'Critical' ? 'var(--error)' : currentSeverity === 'Major' ? 'var(--warning)' : 'var(--accent-secondary)' }}>
                  <AlertTriangle size={20} /> Incident Explanation
                </h2>
                <span className="citation-badge" title="Illustrative financial estimation tiers for simulation purposes">
                  Simulated Policy Model
                </span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {currentExplanation}
              </p>
              <div style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', fontStyle: 'italic' }}>
                * Disclaimer: Financial figures derived from Simulated Policy Model with illustrative tiers and assumed average passenger loads. Not an official regulatory calculation.
              </div>
            </div>
          )}

          {report && (
            <div className="glass-panel animate-slide-in" style={{ padding: '28px', background: 'var(--success-bg)', borderColor: 'var(--success)', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)', overflowY: 'auto', flexShrink: 0, maxHeight: '40%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--success)' }}>
                  <FileText size={24} /> Incident Report
                </h2>
                <span className="citation-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                  Simulated Policy Model
                </span>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', fontFamily: 'inherit' }}>
                {report}
              </pre>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  const renderSessionReplay = () => {
    const hasSnapshots = replaySnapshots.length > 0;
    const activeSnapshot = hasSnapshots ? replaySnapshots[Math.min(currentScrubIndex, replaySnapshots.length - 1)] : null;
    const maxSteps = hasSnapshots ? replaySnapshots.length - 1 : 0;

    return (
      <div className="glass-panel" style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RotateCcw size={28} color="var(--accent-secondary)" /> Black-Box Session Replay Scrubber
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Inspect and scrub through completed multi-agent simulation scenarios step-by-step with SHA-256 hash-chained tamper-evident telemetry.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="btn-heal"
              onClick={handleVerifyAuditChain}
              disabled={isVerifyingChain}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: 'var(--success)', cursor: 'pointer', fontWeight: '600' }}
            >
              <ShieldCheck size={16} /> {isVerifyingChain ? 'Verifying Chain...' : '🛡️ Verify Integrity'}
            </button>
            <button 
              className="btn-biometric"
              onClick={triggerBiometricPrompt}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: 'var(--accent-primary)', cursor: 'pointer' }}
            >
              <Fingerprint size={16} /> Test Biometric Gate
            </button>
          </div>
        </header>

        {/* Live Hash Chain Verification Banner */}
        {auditVerification && (
          <div className="animate-slide-in" style={{ padding: '16px 20px', marginBottom: '20px', borderRadius: '12px', background: auditVerification.is_valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)', border: auditVerification.is_valid ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: auditVerification.is_valid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: auditVerification.is_valid ? 'var(--success)' : 'var(--error)' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: auditVerification.is_valid ? 'var(--success)' : 'var(--error)' }}>
                  {auditVerification.is_valid ? `✅ Audit Chain Valid: ${auditVerification.chain_length} Records Linked & Verified` : `⚠️ Tamper Detected: Break at block #${auditVerification.broken_at_index}`}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
                  Genesis: {auditVerification.first_hash ? auditVerification.first_hash.slice(0, 16) + '...' : '0000000000000000'} | Latest Head: {auditVerification.latest_hash ? auditVerification.latest_hash.slice(0, 16) + '...' : '0000000000000000'} | Verified: {auditVerification.verified_at}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setAuditVerification(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
            >
              &times;
            </button>
          </div>
        )}

        {!hasSnapshots ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <RotateCcw size={48} style={{ opacity: 0.4, margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>No Simulation Recorded Yet</h3>
            <p style={{ fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
              Inject a delay on the Live Dashboard to generate a full telemetry session with timestamps, agent confidence states, and hash-chained audit records.
            </p>
            <button className="btn-primary" onClick={() => setActiveTab('dashboard')}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
            
            {/* Scrubber Control Console */}
            <div className="glass-panel" style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="status-badge" style={{ background: 'rgba(14, 165, 233, 0.2)', color: 'var(--accent-secondary)', border: '1px solid rgba(14, 165, 233, 0.4)' }}>
                    Step {currentScrubIndex + 1} of {replaySnapshots.length}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                    Agent: <span style={{ color: 'var(--accent-secondary)' }}>{activeSnapshot?.activeAgent}</span>
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    • Timestamp: {activeSnapshot?.timestamp}
                  </span>
                </div>

                {activeSnapshot?.biometricAuth && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', color: 'var(--success)' }}>
                    <ShieldCheck size={14} /> Biometric Authorized ({activeSnapshot.biometricAuth.user})
                  </div>
                )}
              </div>

              {/* Slider Track */}
              <div style={{ position: 'relative', margin: '15px 0' }}>
                <input 
                  type="range" 
                  min="0" 
                  max={maxSteps} 
                  value={currentScrubIndex}
                  onChange={(e) => {
                    setIsPlayingReplay(false);
                    setCurrentScrubIndex(parseInt(e.target.value));
                  }}
                  style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', appearance: 'auto' }}
                />
                
                {/* Step markers */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {replaySnapshots.map((s, idx) => (
                    <span 
                      key={idx} 
                      onClick={() => { setIsPlayingReplay(false); setCurrentScrubIndex(idx); }}
                      style={{ cursor: 'pointer', color: idx === currentScrubIndex ? 'var(--accent-secondary)' : 'var(--text-secondary)', fontWeight: idx === currentScrubIndex ? 'bold' : 'normal' }}
                    >
                      {s.activeAgent.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Transport Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    className="transport-btn" 
                    onClick={() => { setIsPlayingReplay(false); setCurrentScrubIndex(prev => Math.max(0, prev - 1)); }}
                    disabled={currentScrubIndex === 0}
                    style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', cursor: currentScrubIndex === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <SkipBack size={14} /> Step Back
                  </button>
                  <button 
                    className="btn-primary transport-play" 
                    onClick={() => setIsPlayingReplay(!isPlayingReplay)}
                    style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                  >
                    {isPlayingReplay ? <Pause size={14} /> : <Play size={14} />}
                    {isPlayingReplay ? 'Pause' : 'Play Replay'}
                  </button>
                  <button 
                    className="transport-btn" 
                    onClick={() => { setIsPlayingReplay(false); setCurrentScrubIndex(prev => Math.min(maxSteps, prev + 1)); }}
                    disabled={currentScrubIndex === maxSteps}
                    style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', cursor: currentScrubIndex === maxSteps ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    Step Next <SkipForward size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Speed:</span>
                  {[0.5, 1, 2, 4].map(speed => (
                    <button 
                      key={speed}
                      onClick={() => setReplaySpeed(speed)}
                      style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: replaySpeed === speed ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: replaySpeed === speed ? '#fff' : 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reconstructed State Grid at Current Step */}
            {activeSnapshot && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* Active Agent Log Snapshot & Hash Chain Info */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--accent-secondary)' }}>
                      <Activity size={18} /> Telemetry Log Snapshot
                    </h3>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      Block #{activeSnapshot.index || activeSnapshot.stepIndex}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '14px' }}>
                    {activeSnapshot.logMessage}
                  </div>
                  
                  {/* Hash Chain Cryptographic Pointers */}
                  <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', fontFamily: 'monospace' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Prev Hash: </span>{activeSnapshot.previousHash ? activeSnapshot.previousHash.slice(0, 24) + '...' : '000000000000000000000000...'}
                    </div>
                    <div style={{ color: 'var(--accent-secondary)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Record Hash: </span>{activeSnapshot.hash ? activeSnapshot.hash.slice(0, 24) + '...' : 'pending_hash...'}
                    </div>
                  </div>

                  {activeSnapshot.logDetails && Object.keys(activeSnapshot.logDetails).length > 0 && (
                    <pre style={{ margin: 0, padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', fontSize: '11px', color: 'var(--accent-secondary)', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {JSON.stringify(activeSnapshot.logDetails, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Timetable Reconstruction */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--warning)' }}>
                    <Clock size={18} /> Reconstructed Timetable State
                  </h3>
                  {trains.map(t => {
                    const plan = activeSnapshot.reschedulePlanState[t.id];
                    return (
                      <div key={t.id} style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '600' }}>{t.name}</span>
                          <span style={{ color: plan ? 'var(--warning)' : 'var(--success)', fontSize: '11px' }}>
                            {plan ? 'Rescheduled' : 'On Schedule'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {t.route.slice(0, 4).map(st => {
                            const newTime = plan ? plan[st] : null;
                            const origTime = t.schedule[st];
                            return (
                              <span key={st} style={{ fontSize: '11px', color: newTime && newTime !== origTime ? 'var(--warning)' : 'var(--text-secondary)' }}>
                                {st}: {newTime || origTime}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Biometric & Audit Security Block */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--success)' }}>
                    <ShieldCheck size={18} /> Audit & Security Stamp
                  </h3>
                  {activeSnapshot.biometricAuth ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '14px', borderRadius: '10px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: '600', fontSize: '13px' }}>
                        <Fingerprint size={16} /> CLIENT-SIDE BIOMETRIC ATTESTED
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Attested by: {activeSnapshot.biometricAuth.user}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        Method: {activeSnapshot.biometricAuth.method} ({activeSnapshot.biometricAuth.timestamp})
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', fontStyle: 'italic' }}>
                        * Client-side passkey attestation (no server-side signature validation required).
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
                      No biometric attestation recorded prior to this step.
                    </div>
                  )}

                  <div className="citation-badge" style={{ width: '100%', justifyContent: 'center', padding: '8px', marginTop: '10px' }}>
                    Simulated Policy Model Compliance Verified
                  </div>
                </div>

              </div>
            )}

          </div>
        )}
      </div>
    );
  };

  const renderAnnouncements = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '30px', height: '100%', overflowY: 'auto', flex: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '28px' }}>Announcement Audit Trail</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Log of all generated multi-lingual public address announcements.</p>
        </div>
        {announcementsLog.length > 0 && (
          <button 
            className="btn-primary" 
            onClick={handleClearAnnouncements}
            style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--error)', border: '1px solid rgba(244, 63, 94, 0.3)', boxShadow: 'none', padding: '10px 18px', fontSize: '14px' }}
          >
            <Trash2 size={16} style={{ marginRight: '8px', display: 'inline', verticalAlign: 'middle' }} /> Clear Audit Logs
          </button>
        )}
      </header>
      
      {announcementsLog.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Volume2 size={48} style={{ opacity: 0.5, margin: '0 auto 15px' }} />
            <h2>No Announcement Logs</h2>
            <p>Reschedule updates will generate public address announcements here.</p>
          </div>
        </div>
      ) : (
        announcementsLog.map((ann, idx) => (
          <div key={idx} className="announcement-log-card" style={{ borderLeft: `4px solid ${ann.severity === 'Critical' ? 'var(--error)' : ann.severity === 'Major' ? 'var(--warning)' : 'var(--accent-secondary)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontWeight: '700', fontSize: '16px', color: 'white' }}>{ann.train_name} ({ann.train_number})</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '12px' }}>ETA {ann.new_time} at {ann.station_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`status-badge ${ann.severity === 'Critical' ? 'status-delayed' : ann.severity === 'Major' ? 'status-delayed' : 'status-ontime'}`} style={{ animation: 'none', background: ann.severity === 'Critical' ? 'var(--error-bg)' : ann.severity === 'Major' ? 'var(--warning-bg)' : 'var(--success-bg)', color: ann.severity === 'Critical' ? 'var(--error)' : ann.severity === 'Major' ? 'var(--warning)' : 'var(--success)', border: 'none' }}>
                  {ann.severity}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ann.timestamp}</span>
              </div>
            </div>
            
            <div className="announcement-script-row">
              <span className="lang-badge en">en</span> {ann.text_en}
            </div>
            <div className="announcement-script-row">
              <span className="lang-badge hi">hi</span> {ann.text_hi}
            </div>
            {ann.text_ja && (
              <div className="announcement-script-row">
                <span className="lang-badge ja">ja</span> {ann.text_ja}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="glass-panel" style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '10px' }} className="text-gradient">System Settings</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Configure voice announcements and notification preferences.</p>

      <div className="settings-grid">
        <div className="glass-panel settings-card" style={{ padding: '24px', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Volume2 size={20} color="var(--accent-primary)" /> Voice Announcements
          </h3>
          
          <div className="switch-container" onClick={() => setSettings(prev => ({ ...prev, audioEnabled: !prev.audioEnabled }))}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Enable Audio Announcements</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Play voice-overs on reschedule events</span>
            </div>
            <label className="switch" onClick={(e) => e.stopPropagation()}>
              <input 
                type="checkbox" 
                checked={settings.audioEnabled} 
                onChange={() => setSettings(prev => ({ ...prev, audioEnabled: !prev.audioEnabled }))} 
              />
              <span className="slider"></span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Announcement Language</label>
            <select 
              value={settings.announcementLang} 
              onChange={(e) => setSettings(prev => ({ ...prev, announcementLang: e.target.value }))}
            >
              <option value="en">English (India)</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="all">Play All (English + Hindi + Japanese)</option>
            </select>
          </div>

          <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '600' }}>Voice Status in your Browser:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>English (en)</span>
                <span style={{ color: voicesStatus.en ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>
                  {voicesStatus.en ? '✓ Detected' : '✗ Missing'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Hindi (hi)</span>
                <span style={{ color: voicesStatus.hi ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>
                  {voicesStatus.hi ? '✓ Detected' : '✗ Missing'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Japanese (ja)</span>
                <span style={{ color: voicesStatus.ja ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>
                  {voicesStatus.ja ? '✓ Detected' : '✗ Missing'}
                </span>
              </div>
            </div>
            {!voicesStatus.ja && (
              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--warning)', lineHeight: '1.4', background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <strong>Note:</strong> Japanese voice may be missing in your browser/OS. Chrome will download it if connected to the internet, or you can add it in OS speech settings.
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel settings-card" style={{ padding: '24px', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-secondary)" /> Voice Configurations
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Speech Rate</span>
              <span>{settings.speechRate}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              value={settings.speechRate} 
              onChange={(e) => setSettings(prev => ({ ...prev, speechRate: parseFloat(e.target.value) }))} 
              style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', cursor: 'pointer', appearance: 'auto' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Speech Pitch</span>
              <span>{settings.speechPitch}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="1.5" 
              step="0.1" 
              value={settings.speechPitch} 
              onChange={(e) => setSettings(prev => ({ ...prev, speechPitch: parseFloat(e.target.value) }))} 
              style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', cursor: 'pointer', appearance: 'auto' }}
            />
          </div>

          <button 
            className="btn-primary" 
            onClick={testVoiceAnnouncement}
            style={{ marginTop: '16px', padding: '10px 18px', fontSize: '14px' }}
          >
            Test Audio Announcement
          </button>
        </div>
      </div>
    </div>
  );

  const renderVoiceCommandCenter = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px 0', width: '100%', flex: 1 }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.12) 0%, rgba(18, 22, 38, 0.95) 100%)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '26px', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mic size={28} color="var(--accent-secondary)" /> Multilingual Voice Command Studio
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px', margin: 0 }}>
              Hands-free natural speech commands for Indian Railways OCC Controllers in English (en-US), Hindi (hi-IN), and Japanese (ja-JP).
            </p>
          </div>

          <span className="citation-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            🎙️ Web Speech API & Neural TTS Ready
          </span>
        </div>
      </div>

      {/* Voice Control Interactive Panel */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
        <MultiLanguageVoiceControl onCommand={handleVoiceCommand} showToast={showToast} />
      </div>
    </div>
  );

  if (!session) {
    return (
      <Login onLogin={(data) => {
        sessionStorage.setItem('railmind_session', JSON.stringify(data));
        setSession(data);
      }} />
    );
  }

  const handleLogout = async () => {
    try {
      await apiFetch('/api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    sessionStorage.removeItem('railmind_session');
    setSession(null);
  };

  return (
    <div className="app-container">
      {renderSidebar(handleLogout)}
      
      <div className="main-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'network' && renderNetworkTopology()}
        {activeTab === 'digital_twin' && (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 0', width: '100%', flex: 1 }}>
            <DigitalTwinOccupancy
              stations={stations}
              trains={trains}
              platformAllocations={platformAllocations}
              reschedulePlan={reschedulePlan}
              activeDelayStation={activeDelayStation}
              currentSeverity={currentSeverity}
              showToast={showToast}
            />
          </div>
        )}
        {activeTab === 'space_time' && (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 0', width: '100%', flex: 1 }}>
            <SpaceTimeDiagram
              benchmarkData={rlBenchmarkData}
              trains={trains}
              stations={stations}
              activeDelayStation={activeDelayStation}
              currentSeverity={currentSeverity}
            />
          </div>
        )}
        {activeTab === 'rl_benchmark' && (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 0', width: '100%', flex: 1 }}>
            <RLBenchmarkArena
              benchmarkData={rlBenchmarkData}
              showToast={showToast}
            />
          </div>
        )}
        {activeTab === 'voice' && renderVoiceCommandCenter()}
        {activeTab === 'replay' && renderSessionReplay()}
        {activeTab === 'announcements' && renderAnnouncements()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '30px', height: '100%', overflowY: 'auto', flex: 1 }}>
            <h2 className="text-gradient" style={{ fontSize: '28px' }}>Incident History</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>A log of all AI-generated incident reports from this session.</p>
            
            {historicalReports.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <History size={48} style={{ opacity: 0.5, margin: '0 auto 15px' }} />
                  <h2>No Historical Data Yet</h2>
                  <p>Run a simulation on the dashboard to generate reports.</p>
                </div>
              </div>
            ) : (
              historicalReports.map(hr => (
                <div key={hr.id} className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <Clock size={16} /> Generated: {hr.date}
                    </div>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', fontFamily: 'inherit' }}>
                    {hr.content}
                  </pre>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                    * Disclaimer: Financial figures derived from Simulated Policy Model for illustrative demonstration purposes.
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating Quick Voice Command Button */}
      {activeTab !== 'voice' && (
        <button 
          className="floating-voice-pill"
          onClick={() => setActiveTab('voice')}
          title="Open Multilingual Voice Command Center"
        >
          <Mic size={18} />
          <span>Voice Commands</span>
        </button>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toastNotifications.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', fontSize: '14px', color: 'white' }}>{t.title}</span>
              <button 
                onClick={() => setToastNotifications(prev => prev.filter(item => item.id !== t.id))}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px', lineHeight: '1' }}
              >
                &times;
              </button>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
