const COMMANDS = {
  'en-US': {
    'reschedule *train_id to *time': 'reschedule',
    'reschedule train *train_id *time': 'reschedule',
    'show train *train_id': 'focus_train',
    'train *train_id': 'focus_train',
    'delay status': 'show_delays',
    'show delays': 'show_delays',
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

  'hi-IN': {
    '*train_id को *time पर फिर से शेड्यूल करें': 'reschedule',
    '*train_id समय *time': 'reschedule',
    'ट्रेन *train_id दिखाएं': 'focus_train',
    '*train_id': 'focus_train',
    'देरी की स्थिति': 'show_delays',
    'देरी': 'show_delays',
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

// Parameter extraction
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
      const match = text.toUpperCase().match(/\b(22436|12302|12004|T[1-3]|IR-?\d+)\b/i);
      return match ? match[0].toLowerCase() : 't1';
    },
    time: (text) => {
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

  // 1. High-Priority Semantic Keyword Classification

  // Metrics & Passenger Impact
  if (
    cleaned.includes('metric') || 
    cleaned.includes('impact') || 
    cleaned.includes('cost') || 
    cleaned.includes('loss') || 
    cleaned.includes('refund') || 
    cleaned.includes('tdr') || 
    cleaned.includes('passenger') ||
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
    cleaned.includes('विस्तार') || 
    cleaned.includes('चेतावनी') || 
    cleaned.includes('エスカレーション')
  ) {
    return { action: 'escalate', params: {}, language };
  }

  // Agent Health & Telemetry
  if (
    cleaned.includes('agent') || 
    cleaned.includes('watchdog') || 
    cleaned.includes('health') || 
    cleaned.includes('pipeline') ||
    cleaned.includes('स्थिति') || 
    cleaned.includes('एजेंट') || 
    cleaned.includes('エージェント')
  ) {
    return { action: 'show_agents', params: {}, language };
  }

  // Incident Reports
  if (
    cleaned.includes('report') || 
    cleaned.includes('incident') || 
    cleaned.includes('investigation') ||
    cleaned.includes('रिपोर्ट') || 
    cleaned.includes('घटना') || 
    cleaned.includes('レポート')
  ) {
    return { action: 'show_incidents', params: {}, language };
  }

  // Rescheduling
  if (
    cleaned.includes('reschedule') || 
    cleaned.includes('schedule') || 
    cleaned.includes('change') || 
    cleaned.includes('time') || 
    cleaned.includes('postpone') || 
    cleaned.includes(' to ') || 
    cleaned.includes(' at ') ||
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
  if (extractedTrain && (cleaned.includes('train') || cleaned.includes('show') || cleaned.includes('ट्रेन') || cleaned.includes('列車'))) {
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
