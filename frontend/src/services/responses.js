const RESPONSES = {
  'en-US': {
    reschedule: (train_id, new_time) => `Train ${train_id} rescheduled to ${new_time}`,
    focus_train: (train_id) => `Showing train ${train_id}`,
    show_delays: () => `Displaying all delays`,
    escalate: () => `Incident escalated`,
    show_agents: () => `Toggling agent panel`,
    show_metrics: () => `Displaying metrics`,
    show_incidents: () => `Showing incident report`,
    show_status: () => `System operational and ready`,
    mute: () => `Voice notifications muted`,
    unmute: () => `Voice notifications enabled`,
    error: (text) => `Sorry, I didn't understand "${text}". Try "show metrics" or "reschedule train t1 to 3:45 PM"`
  },

  'ta-IN': {
    reschedule: (train_id, new_time) => `ரயில் ${train_id} ${new_time} க்கு மாற்றப்பட்டது`,
    focus_train: (train_id) => `ரயில் ${train_id} காட்டப்படுகிறது`,
    show_delays: () => `அனைத்து தாமதங்களைக் காட்டுகிறது`,
    escalate: () => `சம்பவம் உயர்த்தப்பட்டது`,
    show_agents: () => `முகவர் பேனல் மாற்றப்படுகிறது`,
    show_metrics: () => `மெட்ரிக்ஸ் காட்டுகிறது`,
    show_incidents: () => `சம்பவ அறிக்கை காட்டுகிறது`,
    show_status: () => `கணினி செயல்பாட்டில் உள்ளது`,
    mute: () => `குரல் அறிவிப்புகள் முடக்கப்பட்டுள்ளன`,
    unmute: () => `குரல் அறிவிப்புகள் செயல்படுத்தப்பட்டுள்ளன`,
    error: (text) => `தயவுசெய்து மீண்டும் முயற்சிக்கவும். "${text}" புரிந்துகொள்ளவில்லை`
  },

  'hi-IN': {
    reschedule: (train_id, new_time) => `ट्रेन ${train_id} को ${new_time} पर फिर से शेड्यूल किया गया`,
    focus_train: (train_id) => `ट्रेन ${train_id} दिखाई जा रही है`,
    show_delays: () => `सभी देरी दिखाई जा रही है`,
    escalate: () => `घटना बढ़ाई गई`,
    show_agents: () => `एजेंट पैनल टॉगल किया जा रहा है`,
    show_metrics: () => `मेट्रिक्स दिखाई जा रहे हैं`,
    show_incidents: () => `घटना रिपोर्ट दिखाई जा रही है`,
    show_status: () => `सिस्टम संचालनशील है`,
    mute: () => `वॉइस सूचनाएं म्यूट की गई हैं`,
    unmute: () => `वॉइस सूचनाएं सक्षम की गई हैं`,
    error: (text) => `क्षमा करें, "${text}" को समझ नहीं आया`
  },

  'ja-JP': {
    reschedule: (train_id, new_time) => `トレーン ${train_id} は ${new_time} に変更されました`,
    focus_train: (train_id) => `トレーン ${train_id} を表示しています`,
    show_delays: () => `すべての遅延を表示しています`,
    escalate: () => `インシデントをエスカレートしました`,
    show_agents: () => `エージェントパネルを切り替えています`,
    show_metrics: () => `メトリクスを表示しています`,
    show_incidents: () => `インシデントレポートを表示しています`,
    show_status: () => `システムは動作可能です`,
    mute: () => `音声通知がミュートされました`,
    unmute: () => `音声通知が有効になりました`,
    error: (text) => `申し訳ありませんが、"${text}"が理解できませんでした`
  }
};

export function getResponse(action, language = 'en-US', params = {}) {
  const responses = RESPONSES[language] || RESPONSES['en-US'];
  const response = responses[action];
  
  if (typeof response === 'function') {
    if (action === 'error') {
      return response(params.text || 'Unknown command');
    }
    return response(params.train_id, params.new_time || params.time);
  }
  return response ? response() : RESPONSES['en-US'].error('Unknown command');
}
