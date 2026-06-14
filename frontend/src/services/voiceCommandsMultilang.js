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

  'ta-IN': {
    '*train_id நேரம் *time மாற்று': 'reschedule',
    '*train_id மாற்று *time': 'reschedule',
    'ரயில் *train_id காட்டு': 'focus_train',
    '*train_id': 'focus_train',
    'தாமதம் நிலை': 'show_delays',
    'நிலை': 'show_delays',
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

// Multilingual parameter extraction
const PARAM_EXTRACTORS = {
  'en-US': {
    train_id: (text) => {
      const match = text.toUpperCase().match(/IR-?\d+|[A-Z]{1,2}-?\d+/);
      return match ? match[0] : null;
    },
    time: (text) => {
      const match = text.match(/(\d{1,2})[:.](\d{2})\s*(am|pm|AM|PM)?/i) || text.match(/(\d{1,2})\s*(am|pm|AM|PM)/i);
      return match ? match[0] : null;
    }
  },

  'ta-IN': {
    train_id: (text) => {
      const match = text.toUpperCase().match(/IR-?\d+|[A-Z]{1,2}-?\d+/);
      return match ? match[0] : null;
    },
    time: (text) => {
      // Tamil: "மணி" (mani) = o'clock
      const match = text.match(/(\d{1,2})\s*(?:மணி|:|.)?\s*(\d{2})?/);
      return match ? `${match[1]}:${match[2] || '00'}` : null;
    }
  },

  'hi-IN': {
    train_id: (text) => {
      const match = text.toUpperCase().match(/IR-?\d+|[A-Z]{1,2}-?\d+/);
      return match ? match[0] : null;
    },
    time: (text) => {
      // Hindi: "बजे" (baje) = o'clock
      const match = text.match(/(\d{1,2})\s*(?:बजे|:|.)?\s*(\d{2})?/);
      return match ? `${match[1]}:${match[2] || '00'}` : null;
    }
  },

  'ja-JP': {
    train_id: (text) => {
      const match = text.toUpperCase().match(/IR-?\d+|[A-Z]{1,2}-?\d+/);
      return match ? match[0] : null;
    },
    time: (text) => {
      // Japanese: "時" (ji) = o'clock, "分" (hun) = minutes
      const match = text.match(/(\d{1,2})\s*(?:時|:|.)\s*(\d{2})?\s*分?/);
      return match ? `${match[1]}:${match[2] || '00'}` : null;
    }
  }
};

export function parseMultilingualCommand(transcript, language) {
  const cleaned = transcript.toLowerCase().trim();
  const commands = COMMANDS[language] || COMMANDS['en-US'];
  const extractors = PARAM_EXTRACTORS[language] || PARAM_EXTRACTORS['en-US'];

  // Exact and pattern match
  for (const [pattern, action] of Object.entries(commands)) {
    if (pattern.includes('*')) {
      // Fix: Replace *parameter with (.+) instead of replacing * globally
      const regex = new RegExp(`^${pattern.replace(/\*\w+/g, '(.+)')}$`);
      const match = cleaned.match(regex);
      if (match) {
        const params = {};
        let paramIndex = 1;

        // Extract parameters from pattern
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

  // Fuzzy match
  for (const command of Object.keys(commands)) {
    if (similarity(cleaned, command) > 0.7) {
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
