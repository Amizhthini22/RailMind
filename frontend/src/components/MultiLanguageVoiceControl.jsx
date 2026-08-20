import React, { useEffect, useState } from 'react';
import { useMultiLanguageSpeech } from '../hooks/useMultiLanguageSpeech';
import { useMultiLanguageTTS } from '../hooks/useMultiLanguageTTS';
import { parseMultilingualCommand } from '../services/voiceCommandsMultilang';
import { getResponse } from '../services/responses';

export const MultiLanguageVoiceControl = ({ onCommand, showToast }) => {
  const {
    isListening,
    transcript,
    language,
    languages,
    startListening,
    stopListening,
    changeLanguage,
    error: speechError
  } = useMultiLanguageSpeech();

  const { speak } = useMultiLanguageTTS();
  const [manualInput, setManualInput] = useState('');
  const [lastExecuted, setLastExecuted] = useState(null);

  useEffect(() => {
    if (speechError && speechError !== 'aborted' && speechError !== 'no-speech') {
      if (showToast) {
        showToast('error', 'Voice Error', speechError);
      }
    }
  }, [speechError, showToast]);

  const executeCommand = (cmdText) => {
    if (!cmdText || !cmdText.trim()) return;
    const cleanCmd = cmdText.trim();
    const result = parseMultilingualCommand(cleanCmd, language);

    if (result) {
      if (result.params && result.params.time && !result.params.new_time) {
        result.params.new_time = result.params.time;
      }
      
      onCommand({ ...result });
      const response = getResponse(result.action, language, result.params);
      speak(response, language);
      setLastExecuted({ text: cleanCmd, action: result.action, response });
      if (showToast) {
        showToast('success', 'Voice Action', response);
      }
    } else {
      const errorMsg = getResponse('error', language, { text: cleanCmd });
      speak(errorMsg, language);
      if (showToast) {
        showToast('warning', 'Command Notice', errorMsg);
      }
    }
  };

  useEffect(() => {
    if (transcript) {
      executeCommand(transcript);
    }
  }, [transcript]);

  const QUICK_COMMANDS = {
    'en-US': [
      { label: '📊 Metrics', text: 'show metrics' },
      { label: '🔄 Reschedule T1', text: 'reschedule train t1 to 3:45 PM' },
      { label: '⏱️ Delays', text: 'delay status' },
      { label: '🚨 Escalate', text: 'trigger escalation' }
    ],
    'hi-IN': [
      { label: '📊 मेट्रिक्स', text: 'मेट्रिक्स दिखाएं' },
      { label: '🔄 ट्रेन t1 बदलें', text: 'ट्रेन t1 को 3:45 पर बदलें' },
      { label: '⏱️ देरी स्थिति', text: 'देरी की स्थिति' },
      { label: '🚨 विस्तार', text: 'विस्तार ट्रिगर करें' }
    ],
    'ja-JP': [
      { label: '📊 メトリクス', text: 'メトリクス表示' },
      { label: '🔄 スケジュール変更', text: 'トレーン t1 を 3:45 に変更' },
      { label: '⏱️ 遅延状況', text: '遅延状況' },
      { label: '🚨 エスカレーション', text: 'エスカレーション' }
    ]
  };

  const currentChips = QUICK_COMMANDS[language] || QUICK_COMMANDS['en-US'];

  return (
    <div className="multilang-voice-control" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="language-selector">
        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>Language:</label>
        <select 
          value={language} 
          onChange={(e) => changeLanguage(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {Object.entries(languages).map(([code, config]) => (
            <option key={code} value={code}>
              {config.flag} {config.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => (isListening ? stopListening() : startListening())}
        className={`voice-btn ${isListening ? 'listening' : ''}`}
        style={{
          padding: '10px 14px',
          borderRadius: '10px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        🎤 {isListening ? 'Listening (Speak now)...' : 'Voice Command'}
      </button>

      {transcript && (
        <div className="transcript" style={{ padding: '6px 10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <small style={{ color: '#93c5fd' }}>🎙️ Heard: "{transcript}"</small>
        </div>
      )}

      {/* Interactive Quick-Action Chips */}
      <div style={{ marginTop: '4px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
          Interactive Quick Commands:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {currentChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => executeCommand(chip.text)}
              style={{
                fontSize: '0.72rem',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Interactive Voice Command Bar */}
      <form 
        onSubmit={(e) => { e.preventDefault(); executeCommand(manualInput); setManualInput(''); }}
        style={{ display: 'flex', gap: '6px', marginTop: '4px' }}
      >
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder={`Type / test voice command...`}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '0.75rem',
            borderRadius: '6px',
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};
