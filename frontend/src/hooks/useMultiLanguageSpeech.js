import { useState, useCallback, useRef, useEffect } from 'react';

const LANGUAGES = {
  'en-US': { name: 'English', flag: '🇺🇸' },
  'ta-IN': { name: 'Tamil', flag: '🇮🇳' },
  'hi-IN': { name: 'Hindi', flag: '🇮🇳' },
  'ja-JP': { name: 'Japanese', flag: '🇯🇵' }
};

export const useMultiLanguageSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript(transcriptSegment);
        } else {
          interim += transcriptSegment;
        }
      }
    };

    recognition.onerror = (event) => {
      // 'aborted' and 'no-speech' are standard browser speech lifecycle events, not system errors
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error);
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech recognition start error:", err);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Speech recognition stop error:", err);
      }
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
