import { useState, useCallback } from 'react';

const VOICE_CONFIGS = {
  'en-US': { lang: 'en-US', rate: 0.95, pitch: 1.0 },
  'ta-IN': { lang: 'ta-IN', rate: 0.9, pitch: 1.0 },
  'hi-IN': { lang: 'hi-IN', rate: 0.9, pitch: 1.0 },
  'ja-JP': { lang: 'ja-JP', rate: 0.85, pitch: 1.0 }
};

export const useMultiLanguageTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text, language = 'en-US') => {
    const synth = window.speechSynthesis;
    if (!synth) {
      console.warn("Speech synthesis not supported in this browser.");
      return;
    }

    const config = VOICE_CONFIGS[language] || VOICE_CONFIGS['en-US'];
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.lang = config.lang;
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = 0.9;

    // Try to find a matching voice
    const voices = synth.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(config.lang) || v.lang.includes(config.lang.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.cancel();
    synth.speak(utterance);
  }, []);

  return { speak, isSpeaking };
};
