const COMMANDS = {
  'en-US': {
    'reschedule *train_id to *time': 'reschedule',
    'reschedule train *train_id *time': 'reschedule',
    'show train *train_id': 'focus_train',
    'train *train_id': 'focus_train',
    'delay status': 'show_delays',
    'show delays': 'show_delays',
    'show substitution': 'show_substitution',
    'substitution train': 'show_substitution',
    'relief train': 'show_substitution',
    'relief status': 'show_substitution',
    'trigger escalation': 'escalate',
    'escalate': 'escalate',
    'show agent status': 'show_agents',
    'agent status': 'show_agents',
    'show metrics': 'show_metrics',
    'metrics': 'show_metrics',
    'incident report': 'show_incidents',
    'system status': 'show_status',
    'mute': 'mute',
    'unmute': 'unmute',
    'listen mode': 'enable_voice'
  },

  'ta-IN': {
    '*train_id நேரம் *time மாற்று': 'reschedule',
    '*train_id மாற்று *time': 'reschedule',
    'ரயில் *train_id காட்டு': 'focus_train',
    '*train_id': 'focus_train',
    'தாமதம் நிலை': 'show_delays',
    'நிலை': 'show_delays',
    'மாற்று ரயில்': 'show_substitution',
    'நிவாரண ரயில்': 'show_substitution',
    'மாற்று ரயில் நிலை': 'show_substitution',
    'அறிவிப்பு உயர்த்து': 'escalate',
    'உயர்த்து': 'escalate',
    'முகவர் நிலை': 'show_agents',
    'நிலைமெட்ரிக்ஸ் காட்டு': 'show_metrics',
    'மெட்ரிக்ஸ்': 'show_metrics',
    'சம்பவ அறிக்கை': 'show_incidents',
    'நிகழ்நிலை': 'show_status',
    'அமிழ்தி': 'mute',
    'ஆ': 'unmute',
    'கேட்க்': 'enable_voice'
  },

  'hi-IN': {
    '*train_id को *time पर फिर से शेड्यूल करें': 'reschedule',
    '*train_id समय *time': 'reschedule',
    'ट्रेन *train_id दिखाएं': 'focus_train',
    '*train_id': 'focus_train',
    'देरी की स्थिति': 'show_delays',
    'देरी': 'show_delays',
    'बदली ट्रेन': 'show_substitution',
    'राहत ट्रेन': 'show_substitution',
    'राहत ट्रेन स्थिति': 'show_substitution',
    'विस्तार ट्रिगर करें': 'escalate',
    'विस्तार': 'escalate',
    'एजेंट स्थिति': 'show_agents',
    'स्थिति': 'show_agents',
    'मेट्रिक्स दिखाएं': 'show_metrics',
    'मेट्रिक्स': 'show_metrics',
    'घटना रिपोर्ट': 'show_incidents',
    'सिस्टम स्थिति': 'show_status',
    'म्यूट': 'mute',
    'अनम्यूट': 'unmute',
    'सुनना': 'enable_voice'
  },

  'ja-JP': {
    '*train_id を *time に変更': 'reschedule',
    'スケジュール変更 *train_id': 'reschedule',
    'トレーン *train_id 表示': 'focus_train',
    '*train_id': 'focus_train',
    '遅延状況': 'show_delays',
    'ステータス': 'show_delays',
    '代替列車': 'show_substitution',
    '救援列車': 'show_substitution',
    '代替列車状況': 'show_substitution',
    'エスカレーション': 'escalate',
    'エスカレーション有効': 'escalate',
    'エージェント状態': 'show_agents',
    'メトリクス表示': 'show_metrics',
    'メトリクス': 'show_metrics',
    'インシデントレポート': 'show_incidents',
    'システムステータス': 'show_status',
    'ミュート': 'mute',
    'ミュート解除': 'unmute',
    'リッスン': 'enable_voice'
  }
};

// Multilingual parameter extraction with comprehensive phonetic resilience
const PARAM_EXTRACTORS = {
  'en-US': {
    train_id: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('vande bharat') || lower.includes('22436') || lower.includes('t1') || lower.includes('t one') || lower.includes('tea one') || lower.includes('tee one') || lower.includes('51') || lower.includes('train 1')) {
        return 't1';
      }
      if (lower.includes('rajdhani') || lower.includes('12302') || lower.includes('t2') || lower.includes('t two') || lower.includes('tea two') || lower.includes('tee two') || lower.includes('train 2')) {
        return 't2';
      }
      if (lower.includes('shatabdi') || lower.includes('12004') || lower.includes('t3') || lower.includes('t three') || lower.includes('tea three') || lower.includes('train 3')) {
        return 't3';
      }
      if (lower.includes('standby') || lower.includes('relief') || lower.includes('02401')) {
        return 't_standby_cnb';
      }
      const match = text.toUpperCase().match(/\b(22436|12302|12004|02401|02244|02302|T[1-3]|IR-?\d+)\b/i);
      return match ? match[0].toLowerCase() : 't1';
    },
    time: (text) => {
      // Standard HH:MM am/pm
      const match = text.match(/(\d{1,2})[:.](\d{2})\s*(am|pm|AM|PM)?/i) 
                 || text.match(/(\d{1,2})\s*(am|pm|AM|PM)/i) 
                 || text.match(/\b(\d{1,2})(\d{2})\s*(am|pm|AM|PM)?\b/i)
                 || text.match(/\b(\d{1,2})\s+(\d{2})\b/);
      if (match) {
        let hr = parseInt(match[1], 10);
        let mn = match[2] ? match[2] : '00';
        let ampm = (match[3] || '').toUpperCase();
        if (!ampm) {
          ampm = (hr < 8 || hr === 12) ? 'PM' : 'AM';
        }
        return `${hr}:${mn} ${ampm}`.trim();
      }
      return '10:30 AM';
    }
  },

  'ta-IN': {
    train_id: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('22436') || lower.includes('வந்தே பாரத்') || lower.includes('t1') || lower.includes('51') || lower.includes('1')) return 't1';
      if (lower.includes('12302') || lower.includes('ராஜ்தானி') || lower.includes('t2') || lower.includes('2')) return 't2';
      if (lower.includes('12004') || lower.includes('சதாப்தி') || lower.includes('t3') || lower.includes('3')) return 't3';
      return 't1';
    },
    time: (text) => {
      const match = text.match(/(\d{1,2})\s*(?:மணி|:|.)?\s*(\d{2})?/);
      return match ? `${match[1]}:${match[2] || '00'}` : '10:30';
    }
  },

  'hi-IN': {
    train_id: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('22436') || lower.includes('वंदे भारत') || lower.includes('t1') || lower.includes('51') || lower.includes('1')) return 't1';
      if (lower.includes('12302') || lower.includes('राजधानी') || lower.includes('t2') || lower.includes('2')) return 't2';
      if (lower.includes('12004') || lower.includes('शताब्दी') || lower.includes('t3') || lower.includes('3')) return 't3';
      return 't1';
    },
    time: (text) => {
      const match = text.match(/(\d{1,2})\s*(?:बजे|:|.)?\s*(\d{2})?/);
      return match ? `${match[1]}:${match[2] || '00'}` : '10:30';
    }
  },

  'ja-JP': {
    train_id: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('22436') || lower.includes('t1') || lower.includes('1')) return 't1';
      if (lower.includes('12302') || lower.includes('t2') || lower.includes('2')) return 't2';
      if (lower.includes('12004') || lower.includes('t3') || lower.includes('3')) return 't3';
      return 't1';
    },
    time: (text) => {
      const match = text.match(/(\d{1,2})\s*(?:時|:|.)\s*(\d{2})?\s*分?/);
      return match ? `${match[1]}:${match[2] || '00'}` : '10:30';
    }
  }
};

export function parseMultilingualCommand(transcript, language) {
  if (!transcript || typeof transcript !== 'string') return null;
  const cleaned = transcript.toLowerCase().trim();
  const commands = COMMANDS[language] || COMMANDS['en-US'];
  const extractors = PARAM_EXTRACTORS[language] || PARAM_EXTRACTORS['en-US'];

  // 1. High-Priority Semantic Keyword Classification (Understands spoken natural speech)
  
  // Substitution & Relief (Tamil + Tanglish + English + Hindi + Japanese)
  if (
    cleaned.includes('substitut') || 
    cleaned.includes('relief') || 
    cleaned.includes('replacement') || 
    cleaned.includes('standby') || 
    cleaned.includes('backup') ||
    cleaned.includes('மாற்று') || 
    cleaned.includes('நிவாரண') || 
    cleaned.includes('matru') || 
    cleaned.includes('maatu') || 
    cleaned.includes('nivarana') || 
    cleaned.includes('பதிலி') ||
    cleaned.includes('बदली') || 
    cleaned.includes('राहत') || 
    cleaned.includes('代替') || 
    cleaned.includes('救援')
  ) {
    return { action: 'show_substitution', params: {}, language };
  }

  // Metrics & Passenger Impact
  if (
    cleaned.includes('metric') || 
    cleaned.includes('impact') || 
    cleaned.includes('cost') || 
    cleaned.includes('loss') || 
    cleaned.includes('refund') || 
    cleaned.includes('tdr') || 
    cleaned.includes('passenger') ||
    cleaned.includes('மெட்ரிக்ஸ்') || 
    cleaned.includes('மெட்ரிக்') || 
    cleaned.includes('இழப்பீடு') || 
    cleaned.includes('பயணிகள்') ||
    cleaned.includes('kaatu') || 
    cleaned.includes('kaattu') ||
    cleaned.includes('காட்டு') || 
    cleaned.includes('காட்டுங்கள்') ||
    cleaned.includes('காட்டுங்க') || 
    cleaned.includes('பார்க்க') ||
    cleaned.includes('சேதம்') || 
    cleaned.includes('செலவு') ||
    cleaned.includes('விவரம்') || 
    cleaned.includes('கணக்கு') ||
    cleaned.includes('முடிவு') || 
    cleaned.includes('நிலைமை') ||
    cleaned.includes('தொகை') ||
    cleaned.includes('வருமானம்') ||
    cleaned.includes('அளவு') ||
    cleaned.includes('அறிக்கை') ||
    cleaned.includes('விவரங்கள்') ||
    cleaned.includes('மவுண்ட்') ||
    cleaned.includes('விகிதம்') ||
    cleaned.includes('மதிப்பீடு') ||
    cleaned.includes('பணம்') ||
    cleaned.includes('கட்டணம்') ||
    cleaned.includes('விகிதங்கள்') ||
    cleaned.includes('பயணிகள் பாதிப்பு') ||
    cleaned.includes('இழப்பு') ||
    cleaned.includes('தகவல்') ||
    cleaned.includes('மெட்ரிக்ஸ் காட்டு') ||
    cleaned.includes('விபரம்') ||
    cleaned.includes('விளக்கம்') ||
    cleaned.includes('பார்ப்போம்') ||
    cleaned.includes('பார்') ||
    cleaned.includes('காண்பி') ||
    cleaned.includes('விவரி') ||
    cleaned.includes('பார்க்கலாம்') ||
    cleaned.includes('காண்பிக்கவும்') ||
    cleaned.includes('மெட்ரிக்ஸ் பார்ப்போம்') ||
    cleaned.includes('மெட்ரிக்ஸ் சொல்லு') ||
    cleaned.includes('சொல்லு') ||
    cleaned.includes('சொல்லுங்கள்') ||
    cleaned.includes('சொல்') ||
    cleaned.includes('கூறு') ||
    cleaned.includes('தெரிவி') ||
    cleaned.includes('தெரியப்படுத்து') ||
    cleaned.includes('பகிர்') ||
    cleaned.includes('அறிவி') ||
    cleaned.includes('பேசு') ||
    cleaned.includes('விளக்கு') ||
    cleaned.includes('தெரிவிக்கவும்') ||
    cleaned.includes('விளக்கவும்') ||
    cleaned.includes('பகிரவும்') ||
    cleaned.includes('கூறவும்') ||
    cleaned.includes('சொல்லவும்') ||
    cleaned.includes('காட்டுக') ||
    cleaned.includes('மெட்ரி') ||
    cleaned.includes('மெடிரிக்') ||
    cleaned.includes('மெட்ரிக்ஸ') ||
    cleaned.includes('மெட்ரிக்ச்') ||
    cleaned.includes('மெட்ரிக') ||
    cleaned.includes('மெட்ரிக்ஸ் பாரு') ||
    cleaned.includes('பாரு') ||
    cleaned.includes('பாரப்பா') ||
    cleaned.includes('காட்டப்பா') ||
    cleaned.includes('மெட்ரிக்ஸ் காட்டுப்பா') ||
    cleaned.includes('மெட்ரிக்ஸ் தா') ||
    cleaned.includes('தா') ||
    cleaned.includes('தாருங்கள்') ||
    cleaned.includes('தாங்க') ||
    cleaned.includes('கொடு') ||
    cleaned.includes('கொடுங்கள்') ||
    cleaned.includes('கொடுங்க') ||
    cleaned.includes('தருமாறு') ||
    cleaned.includes('மெட்ரிக்ஸ் குடு') ||
    cleaned.includes('குடு') ||
    cleaned.includes('குடுங்கள்') ||
    cleaned.includes('குடுங்க') ||
    cleaned.includes('எடு') ||
    cleaned.includes('எடுங்கள்') ||
    cleaned.includes('எடுத்துக்காட்டு') ||
    cleaned.includes('எடுத்துக்காட்டுங்கள்') ||
    cleaned.includes('எடுத்துக்கொடு') ||
    cleaned.includes('மெட்ரிக்ஸ் எடு') ||
    cleaned.includes('மெட்ரிக்ஸ் காண்பி') ||
    cleaned.includes('மெட்ரிக்ஸ் காண்பிக்கவும்') ||
    cleaned.includes('மெட்ரிக்ஸ் காண்பிங்க') ||
    cleaned.includes('காண்பிங்க') ||
    cleaned.includes('காண்பியுங்கள்') ||
    cleaned.includes('விளங்கவை') ||
    cleaned.includes('காட்டவும்') ||
    cleaned.includes('காட்டிடு') ||
    cleaned.includes('காட்டிடுங்கள்') ||
    cleaned.includes('காட்டிடுங்க') ||
    cleaned.includes('மெட்ரிக்ஸ் காட்டிடு') ||
    cleaned.includes('மெட்ரிக்ஸ் காட்டிடுங்க') ||
    cleaned.includes('மெட்ரிக்ஸ் போடு') ||
    cleaned.includes('போடு') ||
    cleaned.includes('போடுங்கள்') ||
    cleaned.includes('போடுங்க') ||
    cleaned.includes('மெட்ரிக்ஸ் தாராளமா காட்டு') ||
    cleaned.includes('தாராளமா') ||
    cleaned.includes('மெட்ரிக்ஸ் ஓபன் பண்ணு') ||
    cleaned.includes('ஓபன் பண்ணு') ||
    cleaned.includes('ஓபன் செய்') ||
    cleaned.includes('திற') ||
    cleaned.includes('திறக்கவும்') ||
    cleaned.includes('திறந்திடு') ||
    cleaned.includes('மெட்ரிக்ஸ் திற') ||
    cleaned.includes('மெட்ரிக்ஸ் திறந்திடு') ||
    cleaned.includes('மெட்ரிக்ஸ் ஓபன்') ||
    cleaned.includes('ஓபன்') ||
    cleaned.includes('open') ||
    cleaned.includes('show') ||
    cleaned.includes('view') ||
    cleaned.includes('display') ||
    cleaned.includes('metrics') ||
    cleaned.includes('மெட்ரிக்ஸ்') ||
    cleaned.includes('मेट्रिक्स') || 
    cleaned.includes('मुआवजा') || 
    cleaned.includes('メトリクス')
  ) {
    return { action: 'show_metrics', params: {}, language };
  }

  // Delays & Status
  if (
    cleaned.includes('delay') || 
    cleaned.includes('late') || 
    cleaned.includes('behind time') ||
    cleaned.includes('தாமதம்') || 
    cleaned.includes('தாமதங்கள்') || 
    cleaned.includes('நேர தாமதம்') || 
    cleaned.includes('நிலை') || 
    cleaned.includes('தாமத நிலை') || 
    cleaned.includes('தாமத விபரம்') || 
    cleaned.includes('தாமத விவரம்') || 
    cleaned.includes('தாமத அறிக்கை') || 
    cleaned.includes('தாமத கணக்கு') || 
    cleaned.includes('தாமதம் எவ்ளோ') || 
    cleaned.includes('எவ்வளவு தாமதம்') || 
    cleaned.includes('தாமதம் சொல்லு') || 
    cleaned.includes('தாமதம் காட்டு') || 
    cleaned.includes('தாமதம் காட்டுங்கள்') || 
    cleaned.includes('தாமதம் காட்டுங்க') || 
    cleaned.includes('தாமதத்தை காட்டு') || 
    cleaned.includes('தாமதத்தை காட்டுங்கள்') || 
    cleaned.includes('தாமதத்தை சொல்லு') || 
    cleaned.includes('தாமதத்தை சொல்லுங்கள்') || 
    cleaned.includes('தாமதத்தை காட்டிடு') || 
    cleaned.includes('தாமதத்தை காட்டிடுங்கள்') || 
    cleaned.includes('தாமதத்தை ஓபன் பண்ணு') || 
    cleaned.includes('தாமதம் ஓபன் பண்ணு') || 
    cleaned.includes('தாமதம் திற') || 
    cleaned.includes('தாமதம் பார்') || 
    cleaned.includes('தாமதம் பாரு') || 
    cleaned.includes('தாமதம் பார்ப்போம்') || 
    cleaned.includes('தாமதம் பார்க்கலாம்') || 
    cleaned.includes('தாமதங்களை காட்டு') || 
    cleaned.includes('தாமதங்களை சொல்லு') || 
    cleaned.includes('தாமதங்கள் எங்கே') || 
    cleaned.includes('தாமதங்கள் எவை') || 
    cleaned.includes('தாமதங்கள் என்ன') || 
    cleaned.includes('தாமதம் என்ன') || 
    cleaned.includes('தாமதம் எவ்வளவு') || 
    cleaned.includes('எவ்வளவு நேரம்') || 
    cleaned.includes('எத்தனை நிமிடம்') || 
    cleaned.includes('எத்தனை மணி') || 
    cleaned.includes('லேட்') || 
    cleaned.includes('ரயில் லேட்') || 
    cleaned.includes('ரயில் தாமதம்') || 
    cleaned.includes('தாமதமான ரயில்கள்') || 
    cleaned.includes('தாமதமான ரயில்') || 
    cleaned.includes('தாமதம் விவரங்கள்') || 
    cleaned.includes('தாமதத் தகவல்') || 
    cleaned.includes('தாமதப் பட்டியல்') || 
    cleaned.includes('தாமதப் பட்டியலை காட்டு') || 
    cleaned.includes('தாமதப் பட்டியலை சொல்லு') || 
    cleaned.includes('பட்டியல்') || 
    cleaned.includes('தாமத லிஸ்ட்') || 
    cleaned.includes('லிஸ்ட்') || 
    cleaned.includes('thamatham') || 
    cleaned.includes('thamadham') || 
    cleaned.includes('thamadam') || 
    cleaned.includes('thatham') || 
    cleaned.includes('dhatham') || 
    cleaned.includes('dhamaatham') || 
    cleaned.includes('thamaatham') || 
    cleaned.includes('nilavaram') || 
    cleaned.includes('nilai') || 
    cleaned.includes('nilaimai') || 
    cleaned.includes('thaamatham') || 
    cleaned.includes('thaamadham') || 
    cleaned.includes('thaamadam') || 
    cleaned.includes('late') || 
    cleaned.includes('delay') || 
    cleaned.includes('delays') || 
    cleaned.includes('status') || 
    cleaned.includes('देरी') || 
    cleaned.includes('विलंब') || 
    cleaned.includes('遅延') || 
    cleaned.includes('遅れ')
  ) {
    return { action: 'show_delays', params: {}, language };
  }

  // Escalation
  if (
    cleaned.includes('escalat') || 
    cleaned.includes('emergency') || 
    cleaned.includes('alert') || 
    cleaned.includes('critical') ||
    cleaned.includes('உயர்த்து') || 
    cleaned.includes('அறிவிப்பு') || 
    cleaned.includes('உயர்த்துக') || 
    cleaned.includes('உயர்த்துங்க') || 
    cleaned.includes('உயர்த்திடு') || 
    cleaned.includes('உயர்த்திடுங்கள்') || 
    cleaned.includes('எஸ்கலேட்') || 
    cleaned.includes('எஸ்கலேஷன்') || 
    cleaned.includes('அவசர நிலை') || 
    cleaned.includes('அவசரம்') || 
    cleaned.includes('எச்சரிக்கை') || 
    cleaned.includes('அபாயம்') || 
    cleaned.includes('அதிகாரி') || 
    cleaned.includes('உயர் அதிகாரி') || 
    cleaned.includes('அறிவிப்பு செய்') || 
    cleaned.includes('அறிவிக்கை') || 
    cleaned.includes('மேல் அதிகாரி') || 
    cleaned.includes('uyarthu') || 
    cleaned.includes('uyarthunga') || 
    cleaned.includes('uyarthidu') || 
    cleaned.includes('escalate') || 
    cleaned.includes('emergency') || 
    cleaned.includes('avasaram') || 
    cleaned.includes('arivippu') || 
    cleaned.includes('echcharikkai') || 
    cleaned.includes('विस्तार') || 
    cleaned.includes('चेतावनी') || 
    cleaned.includes('エスカレーション')
  ) {
    return { action: 'escalate', params: {}, language };
  }

  // Rescheduling (Tamil / Tanglish / English / Hindi)
  if (
    cleaned.includes('reschedule') || 
    cleaned.includes('schedule') || 
    cleaned.includes('change') || 
    cleaned.includes('postpone') || 
    cleaned.includes(' to ') || 
    cleaned.includes(' at ') ||
    cleaned.includes('மாற்று') || 
    cleaned.includes('மாத்து') || 
    cleaned.includes('நேரம்') || 
    cleaned.includes('மணி') || 
    cleaned.includes('மணிக்கு') || 
    cleaned.includes('நேரத்தை மாற்று') || 
    cleaned.includes('நேரத்தை மாத்து') || 
    cleaned.includes('மாற்றி அமை') || 
    cleaned.includes('மாற்றி அமைத்திடு') || 
    cleaned.includes('மாத்திடு') || 
    cleaned.includes('மாத்திடுங்க') || 
    cleaned.includes('மாத்துங்க') || 
    cleaned.includes('புது நேரம்') || 
    cleaned.includes('புதிய நேரம்') || 
    cleaned.includes('தள்ளி வை') || 
    cleaned.includes('தள்ளிப் போடு') || 
    cleaned.includes('முன்னேற்று') || 
    cleaned.includes('நேர அட்டவணை') || 
    cleaned.includes('அட்டவணையை மாற்று') || 
    cleaned.includes('அட்டவணை') || 
    cleaned.includes('ரீசெட்') || 
    cleaned.includes('ரீஷெட்யூல்') || 
    cleaned.includes('ரீஷெடியூல்') || 
    cleaned.includes('ரீசெடியூல்') || 
    cleaned.includes('maathu') || 
    cleaned.includes('maathunga') || 
    cleaned.includes('maathidu') || 
    cleaned.includes('maathidunga') || 
    cleaned.includes('maattu') || 
    cleaned.includes('maattunga') || 
    cleaned.includes('neram') || 
    cleaned.includes('nerathai') || 
    cleaned.includes('mani') || 
    cleaned.includes('manikku') || 
    cleaned.includes('pudhu neram') || 
    cleaned.includes('reschedule') || 
    cleaned.includes('schedule') || 
    cleaned.includes('बदल') || 
    cleaned.includes('समय') || 
    cleaned.includes('शेड्यूल') || 
    cleaned.includes('変更')
  ) {
    const tid = extractors.train_id ? extractors.train_id(cleaned) : 't1';
    const ttime = extractors.time ? extractors.time(cleaned) : '10:30 AM';
    return { action: 'reschedule', params: { train_id: tid, time: ttime, new_time: ttime }, language };
  }

  // Focus train if train number mentioned
  const extractedTrain = extractors.train_id ? extractors.train_id(cleaned) : null;
  if (extractedTrain && (cleaned.includes('train') || cleaned.includes('show') || cleaned.includes('ரயில்') || cleaned.includes('ट्रेन') || cleaned.includes('列車'))) {
    return { action: 'focus_train', params: { train_id: extractedTrain }, language };
  }

  // 2. Pattern Matching with wildcards
  for (const [pattern, action] of Object.entries(commands)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(`^${pattern.replace(/\*\w+/g, '(.+)')}$`);
      const match = cleaned.match(regex);
      if (match) {
        const params = {};
        let paramIndex = 1;
        const patternParts = pattern.split(/(\*\w+)/);
        for (let i = 0; i < patternParts.length; i++) {
          if (patternParts[i].startsWith('*')) {
            const paramName = patternParts[i].slice(1);
            const paramValue = match[paramIndex] || '';
            params[paramName] = extractors[paramName]?.(paramValue) || paramValue;
            paramIndex++;
          }
        }
        return { action, params, language };
      }
    } else if (cleaned === pattern) {
      return { action, params: {}, language };
    }
  }

  // 3. Levenshtein Fuzzy match
  for (const command of Object.keys(commands)) {
    if (similarity(cleaned, command) > 0.60) {
      return { action: commands[command], params: {}, language };
    }
  }

  return null;
}

function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
