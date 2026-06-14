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
  Settings as SettingsIcon 
} from 'lucide-react';
import { MultiLanguageVoiceControl } from './components/MultiLanguageVoiceControl';

export default function App() {
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
    ta: false,
    ja: false
  });

  const logsContainerRef = useRef(null);
  const latestSettings = useRef(settings);
  const speechQueueRef = useRef([]);
  const speechIndexRef = useRef(0);
  const speechTimeoutRef = useRef(null);
  const activeUtteranceRef = useRef(null);

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
        ta: voices.some(v => v.lang.toLowerCase().startsWith('ta') || v.lang.toLowerCase().includes('ta')),
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
    fetch('http://localhost:8001/api/initial-state')
      .then(res => res.json())
      .then(data => {
        setTrains(data.trains);
        setStations(data.stations);
        if (data.trains.length > 0) setSelectedTrain(data.trains[0].id);
        if (data.stations.length > 0) setSelectedStation(data.stations[0].code);
      })
      .catch(err => console.error("Error fetching state:", err));

    fetch('http://localhost:8001/api/announcements')
      .then(res => res.json())
      .then(data => setAnnouncementsLog(data))
      .catch(err => console.error("Error fetching announcements:", err));

    const ws = new WebSocket('ws://localhost:8001/ws');
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'log') {
        setLogs(prev => [...prev, msg.data]);
        setIsProcessing(true);
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
    const utterance = new SpeechSynthesisUtterance(item.text);
    activeUtteranceRef.current = utterance; // Prevent garbage collection!

    const voices = synth.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(item.lang) || v.lang.includes(item.lang.split('-')[0]));
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

    const voices = synth.getVoices();
    const hasVoice = (langCode) => voices.some(v => v.lang.toLowerCase().startsWith(langCode) || v.lang.toLowerCase().includes(langCode));

    const items = [];
    newAnnouncements.forEach(announcement => {
      if (latestSettings.current.announcementLang === 'en' || latestSettings.current.announcementLang === 'all') {
        if (hasVoice('en')) {
          items.push({ text: announcement.text_en, lang: 'en-IN' });
        }
      }
      if (latestSettings.current.announcementLang === 'hi' || latestSettings.current.announcementLang === 'all') {
        if (hasVoice('hi')) {
          items.push({ text: announcement.text_hi, lang: 'hi-IN' });
        }
      }
      if (latestSettings.current.announcementLang === 'ta' || latestSettings.current.announcementLang === 'all') {
        if (hasVoice('ta')) {
          items.push({ text: announcement.text_ta, lang: 'ta-IN' });
        }
      }
      if (latestSettings.current.announcementLang === 'ja' || latestSettings.current.announcementLang === 'all') {
        if (hasVoice('ja')) {
          items.push({ text: announcement.text_ja || announcement.text_en, lang: 'ja-JP' });
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
      text_ta: "பயணிகளின் கவனத்திற்கு. வண்டி எண் 12302, ராஜ்தானி எக்ஸ்பிரஸ், தாமதமாக இயங்குகிறது. உங்களுக்கு ஏற்பட்ட அசௌகரியத்திற்கு வருந்துகிறோம்.",
      text_ja: "乗客の皆様にご案内いたします。列車番号 12302、ラージダーニー・エクスプレス は遅れて運行しております。ご不便をおかけして大変申し訳ございません。"
    };
    enqueueAnnouncements([mockAnnouncement]);
  };

  const handleClearAnnouncements = async () => {
    try {
      await fetch('http://localhost:8001/api/clear-announcements', { method: 'POST' });
      setAnnouncementsLog([]);
      showToast("success", "Logs Cleared", "Successfully cleared all announcement audit logs.");
    } catch (err) {
      console.error(err);
      showToast("error", "Error", "Failed to clear announcement logs.");
    }
  };

  const handleInjectDelay = async () => {
    clearSpeechQueue();
    setLogs([]);
    setReschedulePlan({});
    setReport(null);
    setCurrentSeverity(null);
    setCurrentExplanation(null);
    setIsProcessing(true);
    setActiveDelayStation(selectedStation);
    
    await fetch('http://localhost:8001/api/inject-delay', {
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
        const train_id = params.train_id;
        const new_time = params.new_time || params.time;
        
        if (!train_id) {
          showToast('error', 'Voice Reschedule', 'No train ID specified.');
          break;
        }

        // Find train by ID or name/number
        const train = trains.find(t => 
          t.id.toLowerCase() === train_id.toLowerCase() || 
          t.number === train_id || 
          t.name.toLowerCase().includes(train_id.toLowerCase())
        );

        if (!train) {
          showToast('error', 'Voice Reschedule', `Train "${train_id}" not found.`);
          break;
        }

        const stationCode = train.route[0] || 'NDLS';
        const origTime = train.schedule[stationCode];
        
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
        let delayMin = 30; // default delay if calculation fails

        if (origMin !== null && newMin !== null) {
          delayMin = newMin - origMin;
          if (delayMin < 0) {
            delayMin += 24 * 60; // handle overnight transition
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
        setIsProcessing(true);
        setActiveDelayStation(stationCode);

        try {
          await fetch('http://localhost:8001/api/inject-delay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              train_id: train.id,
              station_code: stationCode,
              delay_minutes: delayMin,
              reason: 'Voice Reschedule'
            })
          });
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
          showToast('info', 'Focus Train', `Focused on train: ${train.name}`);
        } else {
          showToast('error', 'Focus Train', `Train "${train_id}" not found.`);
        }
        break;
      }

      case 'show_delays':
        setActiveTab('dashboard');
        break;

      case 'escalate': {
        const targetTrainId = selectedTrain || (trains.length > 0 ? trains[0].id : null);
        if (!targetTrainId) {
          showToast('error', 'Escalation', 'No train available to escalate.');
          break;
        }

        const train = trains.find(t => t.id === targetTrainId);
        const stationCode = selectedStation || (train ? train.route[0] : 'NDLS');
        
        clearSpeechQueue();
        setLogs([]);
        setReschedulePlan({});
        setReport(null);
        setCurrentSeverity(null);
        setCurrentExplanation(null);
        setIsProcessing(true);
        setActiveDelayStation(stationCode);

        try {
          await fetch('http://localhost:8001/api/inject-delay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              train_id: targetTrainId,
              station_code: stationCode,
              delay_minutes: 90,
              reason: 'Voice Escalation Control'
            })
          });
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
        break;

      case 'show_metrics': {
        setActiveTab('dashboard');
        let metricsMsg = 'No active incidents.';
        if (currentExplanation) {
          const passMatch = currentExplanation.match(/passenger impact: ([\d,]+)/i);
          const costMatch = currentExplanation.match(/cost estimate: ([^\s]+)/i);
          metricsMsg = `Active Incident Metrics: \nStranded Passengers: ${passMatch ? passMatch[1] : 'Calculating...'} \nFinancial Cost: ${costMatch ? costMatch[1] : 'Calculating...'}`;
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
        break;

      case 'unmute':
        setSettings(prev => ({ ...prev, audioEnabled: true }));
        break;

      case 'enable_voice':
        showToast('info', 'Voice Control', 'Continuous listening mode initialized.');
        break;

      default:
        console.warn("Unhandled action:", action);
    }
  };

  const renderSidebar = () => (
    <div className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 10px' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
          <TrainFront size={24} color="white" />
        </div>
        <h1 className="text-gradient" style={{ fontSize: '24px' }}>RailMind</h1>
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
    
    return (
      <div className="glass-panel" style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '10px' }} className="text-gradient">Live Network Topology</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Visual representation of cascading delays across the railway backbone.</p>
        
        <div className="network-container">
          {mainRoute.map((code, index) => {
            const station = stations.find(s => s.code === code);
            const isDelayed = activeDelayStation && mainRoute.indexOf(code) >= mainRoute.indexOf(activeDelayStation);
            const isOriginOfDelay = code === activeDelayStation;

            return (
              <React.Fragment key={code}>
                <div className="network-node">
                  <div 
                    className={`node-circle ${isDelayed ? 'active' : 'safe'}`}
                    style={isDelayed ? {
                      background: severityColor,
                      boxShadow: `0 0 0 2px ${severityColor}, 0 0 20px ${severityColor}`
                    } : {}}
                  >
                    {isOriginOfDelay && (
                      <div 
                        className="shockwave"
                        style={{
                          background: currentSeverity === 'Critical' ? 'rgba(244, 63, 94, 0.6)' : currentSeverity === 'Major' ? 'rgba(245, 158, 11, 0.6)' : 'rgba(14, 165, 233, 0.6)'
                        }}
                      />
                    )}
                  </div>
                  <div className="node-label">{station?.name || code}</div>
                </div>
                {index < mainRoute.length - 1 && (
                  <div 
                    className={`network-edge ${isDelayed && mainRoute.indexOf(mainRoute[index+1]) >= mainRoute.indexOf(activeDelayStation) ? 'active' : ''}`}
                    style={isDelayed && mainRoute.indexOf(mainRoute[index+1]) >= mainRoute.indexOf(activeDelayStation) ? {
                      background: severityColor,
                      boxShadow: `0 0 15px ${severityColor}`
                    } : {}}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', gap: '15px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '32px' }}>Live Operations Command</h1>
          <p className="text-gradient-accent" style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '0.5px', marginTop: '2px' }}>Delay Propagation & Recovery</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isProcessing ? 'var(--warning)' : 'var(--success)', animation: isProcessing ? 'pulseGlow 1.5s infinite' : 'none' }}></div>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{isProcessing ? 'Agents Active' : 'System Ready'}</span>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', flex: 1, minHeight: 0 }}>
        
        {/* Control Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0, overflowY: 'auto' }}>
          <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          
          <div className="glass-panel" style={{ padding: '28px', flex: 1, minHeight: '300px' }}>
            <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <Clock size={24} color="var(--warning)" /> Updated Schedules
            </h2>
            
            {trains.map(t => {
              const isAffected = reschedulePlan[t.id];
              return (
                <div 
                  key={t.id} 
                  className={`schedule-card ${isAffected ? (currentSeverity === 'Critical' ? 'border-severity-critical' : currentSeverity === 'Major' ? 'border-severity-major' : 'border-severity-minor') : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontWeight: '600' }}>{t.name}</span>
                    <span 
                      className={`status-badge ${isAffected ? 'status-delayed' : 'status-ontime'}`}
                      style={isAffected ? {
                        background: currentSeverity === 'Critical' ? 'var(--error-bg)' : currentSeverity === 'Major' ? 'var(--warning-bg)' : 'var(--success-bg)',
                        color: currentSeverity === 'Critical' ? 'var(--error)' : currentSeverity === 'Major' ? 'var(--warning)' : 'var(--success)',
                        borderColor: currentSeverity === 'Critical' ? 'rgba(244, 63, 94, 0.3)' : currentSeverity === 'Major' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                      } : {}}
                    >
                      {isAffected ? 'Rescheduled' : 'On Time'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {t.route.map((st, i) => {
                      const newTime = isAffected ? reschedulePlan[t.id][st] : null;
                      const origTime = t.schedule[st];
                      const timeChanged = newTime && newTime !== origTime;
                      
                      return (
                        <div key={st} style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{st}</span>
                          <span style={{ color: timeChanged ? (currentSeverity === 'Critical' ? 'var(--error)' : 'var(--warning)') : 'var(--text-primary)', marginLeft: '4px', fontWeight: timeChanged ? '600' : '400' }}>
                            {timeChanged ? newTime : origTime}
                          </span>
                          {i < t.route.length - 1 && <ChevronRight size={14} color="var(--text-secondary)" style={{ margin: '0 4px' }} />}
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
              <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: currentSeverity === 'Critical' ? 'var(--error)' : currentSeverity === 'Major' ? 'var(--warning)' : 'var(--accent-secondary)' }}>
                <AlertTriangle size={20} /> Incident Explanation
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {currentExplanation}
              </p>
            </div>
          )}

          {report && (
            <div className="glass-panel animate-slide-in" style={{ padding: '28px', background: 'var(--success-bg)', borderColor: 'var(--success)', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)', overflowY: 'auto', flexShrink: 0, maxHeight: '40%' }}>
              <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--success)' }}>
                <FileText size={24} /> Incident Report
              </h2>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', fontFamily: 'inherit' }}>
                {report}
              </pre>
            </div>
          )}

        </div>
      </div>
    </>
  );

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
            <div className="announcement-script-row">
              <span className="lang-badge ta">ta</span> {ann.text_ta}
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
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="all">Play All (English + Hindi + Tamil + Japanese)</option>
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
                <span>Tamil (ta)</span>
                <span style={{ color: voicesStatus.ta ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>
                  {voicesStatus.ta ? '✓ Detected' : '✗ Missing'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Japanese (ja)</span>
                <span style={{ color: voicesStatus.ja ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>
                  {voicesStatus.ja ? '✓ Detected' : '✗ Missing'}
                </span>
              </div>
            </div>
            {(!voicesStatus.ta || !voicesStatus.ja) && (
              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--warning)', lineHeight: '1.4', background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <strong>Note:</strong> Some languages are missing in your browser/OS. Chrome will download them if connected to the internet, or you can add them in OS speech settings.
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

  return (
    <div className="app-container">
      {renderSidebar()}
      
      <div className="main-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'network' && renderNetworkTopology()}
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
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
