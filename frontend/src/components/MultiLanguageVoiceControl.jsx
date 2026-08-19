import React, { useEffect } from 'react';
import { useMultiLanguageSpeech } from '../hooks/useMultiLanguageSpeech';
import { useMultiLanguageTTS } from '../hooks/useMultiLanguageTTS';
import { parseMultilingualCommand } from '../services/voiceCommandsMultilang';
import { getResponse } from '../services/responses';

export const MultiLanguageVoiceControl = ({ onCommand, showToast, substitutionInfo }) => {
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

  useEffect(() => {
    if (speechError) {
      if (showToast) {
        showToast('error', 'Voice Error', speechError);
      }
    }
  }, [speechError, showToast]);

  useEffect(() => {
    if (transcript) {
      const result = parseMultilingualCommand(transcript, language);

      if (result) {
        // Map param time to new_time if present, to align with responses/app expectations
        if (result.params && result.params.time && !result.params.new_time) {
          result.params.new_time = result.params.time;
        }

        if (result.action === 'show_substitution' && substitutionInfo) {
          result.params = {
            ...result.params,
            train_name: substitutionInfo.original_train_name,
            standby_name: `${substitutionInfo.standby_train_name} (${substitutionInfo.standby_train_number})`,
            delay: '45',
            station: substitutionInfo.substitution_station
          };
        }
        
        onCommand({ ...result });
        const response = getResponse(result.action, language, result.params);
        speak(response, language);
        if (showToast) {
          showToast('success', 'Voice Action', response);
        }
      } else {
        const errorMsg = getResponse('error', language, { text: transcript });
        speak(errorMsg, language);
        if (showToast) {
          showToast('warning', 'Command Error', errorMsg);
        }
      }
    }
  }, [transcript]);

  return (
    <div className="multilang-voice-control">
      <div className="language-selector">
        <label>Language:</label>
        <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
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
      >
        🎤 {isListening ? 'Listening...' : 'Voice Command'}
      </button>

      {transcript && (
        <div className="transcript">
          <small>Heard: "{transcript}"</small>
        </div>
      )}

      <div className="command-hints">
        <strong>Example Commands ({languages[language].name}):</strong>
        <ul>
          {language === 'en-US' && (
            <>
              <li>"reschedule train t1 to 3:45 PM"</li>
              <li>"show metrics"</li>
            </>
          )}
          {language === 'ta-IN' && (
            <>
              <li>"t1 நேரம் 3.45 மணிக்கு மாற்று"</li>
              <li>"மெட்ரிக்ஸ் காட்டு"</li>
            </>
          )}
          {language === 'hi-IN' && (
            <>
              <li>"ट्रेन t1 को 3:45 पर बदलें"</li>
              <li>"मेट्रिक्स दिखाएं"</li>
            </>
          )}
          {language === 'ja-JP' && (
            <>
              <li>"トレーン t1 を 3:45 に変更"</li>
              <li>"メトリクス表示"</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};
