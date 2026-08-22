import { useState, useCallback, useRef } from 'react';

const LANGUAGES = {
  'en-US': { name: 'English', flag: '🇺🇸' },
  'hi-IN': { name: 'Hindi', flag: '🇮🇳' },
  'ja-JP': { name: 'Japanese', flag: '🇯🇵' }
};

export const useMultiLanguageSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Please use the quick chips or text test bar.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const heard = event.results[0][0].transcript;
          if (heard) {
            setTranscript(heard);
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Mic error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition start error:", err);
      setIsListening(false);
    }
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Speech recognition stop error:", err);
      }
      setIsListening(false);
    }
  }, []);

  const changeLanguage = useCallback((newLang) => {
    setLanguage(newLang);
  }, []);

  return {
    isListening,
    transcript,
    language,
    languages: LANGUAGES,
    error,
    startListening,
    stopListening,
    changeLanguage
  };
};
