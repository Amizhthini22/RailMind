import { useState, useCallback } from 'react';

const VOICE_CONFIGS = {
  'en-US': { lang: 'en-US', rate: 0.95, pitch: 1.0 },
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

    if (synth.paused) {
      synth.resume();
    }

    const config = VOICE_CONFIGS[language] || VOICE_CONFIGS['en-US'];
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.lang = config.lang;
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = 1.0;

    const voices = synth.getVoices();
    const matchingVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith(config.lang.toLowerCase()) || 
      v.lang.toLowerCase().includes(config.lang.split('-')[0].toLowerCase()) ||
      v.name.toLowerCase().includes(config.lang.toLowerCase())
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.warn("TTS Playback issue:", e);
      setIsSpeaking(false);
    };

    synth.cancel();
    setTimeout(() => {
      synth.speak(utterance);
    }, 50);
  }, []);

  return { speak, isSpeaking };
};
