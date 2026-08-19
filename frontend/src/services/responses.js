const RESPONSES = {
  'en-US': {
    reschedule: (train_id, new_time) => `Train ${train_id} rescheduled to ${new_time}`,
    focus_train: (train_id) => `Showing train ${train_id}`,
    show_delays: () => `Displaying all delays`,
    show_substitution: (train_name, standby_name, delay, station) => 
      standby_name 
        ? `Attention: ${train_name || 'Original Train'} is delayed by ${delay || '45'} minutes. We deeply regret the inconvenience. Standby Relief Train ${standby_name} has been dispatched from ${station || 'the hub'} on Platform 1 to run on schedule.`
        : `Standby Relief Trains are stationed on high alert at Kanpur Central, New Delhi, and Prayagraj hubs ready for instant dispatch.`,
    escalate: () => `Incident escalated`,
    show_agents: () => `Toggling agent panel`,
    show_metrics: () => `Displaying metrics`,
    show_incidents: () => `Showing incident report`,
    show_status: () => `System operational and ready`,
    mute: () => `Voice notifications muted`,
    unmute: () => `Voice notifications enabled`,
    error: (text) => `Sorry, I didn't understand "${text}". Try "show substitution", "show metrics", or "reschedule train t1 to 3:45 PM"`
  },

  'ta-IN': {
    reschedule: (train_id, new_time) => `ரயில் ${train_id} ${new_time} மணிக்கு மாற்றப்பட்டது.`,
    focus_train: (train_id) => `ரயில் ${train_id} காட்டப்படுகிறது.`,
    show_delays: () => `அனைத்து ரயில்களின் தாமத நிலை காட்டப்படுகிறது.`,
    show_substitution: (train_name, standby_name, delay, station) => 
      standby_name 
        ? `கவனத்திற்கு: ${train_name || 'ரயில்'} ${delay || '45'} நிமிடங்கள் தாமதமாகிறது. சிரமத்திற்கு வருந்துகிறோம். நிவாரண சிறப்பு ரயில் ${standby_name} சரியான நேரத்தில் புறப்படுகிறது.`
        : `கான்பூர், புதுதில்லி மற்றும் பிரயாக்ராஜ் மையங்களில் நிவாரண சிறப்பு ரயில்கள் தயார் நிலையில் உள்ளன.`,
    escalate: () => `சம்பவம் அதிகாரிகளுக்கு உயர்த்தப்பட்டது.`,
    show_agents: () => `முகவர் கண்காணிப்பு தகவல்கள் காட்டப்படுகின்றன.`,
    show_metrics: () => `பயணிகள் இழப்பீடு மற்றும் மெட்ரிக்ஸ் விவரங்கள் காட்டப்படுகின்றன.`,
    show_incidents: () => `சம்பவ விசாரணை அறிக்கை காட்டப்படுகிறது.`,
    show_status: () => `கணினி முழுமையாக செயல்பாட்டில் உள்ளது.`,
    mute: () => `குரல் அறிவிப்புகள் முடக்கப்பட்டுள்ளன.`,
    unmute: () => `குரல் அறிவிப்புகள் செயல்படுத்தப்பட்டுள்ளன.`,
    error: (text) => `தயவுசெய்து மீண்டும் முயற்சிக்கவும். "${text}" புரிந்துகொள்ளவில்லை.`
  },

  'hi-IN': {
    reschedule: (train_id, new_time) => `ट्रेन ${train_id} को ${new_time} पर फिर से शेड्यूल किया गया`,
    focus_train: (train_id) => `ट्रेन ${train_id} दिखाई जा रही है`,
    show_delays: () => `सभी देरी दिखाई जा रही है`,
    show_substitution: (train_name, standby_name, delay, station) => 
      standby_name 
        ? `सूचना: ${train_name || 'मूल ट्रेन'} में ${delay || '45'} मिनट का विलंब है। हमें असुविधा के लिए खेद है। राहत स्पेशल ट्रेन ${standby_name} को समय पर चलाने हेतु ${station || 'जंक्शन'} से रवाना किया गया है।`
        : `कानपुर सेंट्रल, नई दिल्ली और प्रयागराज हब पर राहत स्पेशल ट्रेनें हाई अलर्ट पर तैनात हैं।`,
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
    show_substitution: (train_name, standby_name, delay, station) => 
      standby_name 
        ? `ご案内: ${train_name || '該当列車'} は ${delay || '45'} 分遅れております。ご不便をおかけして大変申し訳ございません。代替臨時列車 ${standby_name} が定刻運行のため ${station || '主要駅'} より発車いたします。`
        : `カーンプル、ニューデリー、プラヤグラージの各拠点にて代替臨時列車が待機しております。`,
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
    if (action === 'show_substitution') {
      return response(params.train_name, params.standby_name, params.delay, params.station);
    }
    return response(params.train_id, params.new_time || params.time);
  }
  return response ? response() : RESPONSES['en-US'].error('Unknown command');
}
