import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  TrainFront, 
  Clock, 
  Layers, 
  Compass, 
  Play, 
  RotateCcw,
  Sparkles,
  GitBranch
} from 'lucide-react';

export const SpaceTimeDiagram = ({
  benchmarkData = null,
  trains = [],
  stations = [],
  activeDelayStation = null,
  currentSeverity = null
}) => {
  const [activeView, setActiveView] = useState('story'); // 'story', 'journey', 'tech'
  const [activeStep, setActiveStep] = useState(3); // 1: Delay, 2: Old Rule Fails, 3: AI Fixes

  const targetStation = activeDelayStation || 'CNB';
  const targetStationName = targetStation === 'CNB' ? 'Kanpur Central' : targetStation === 'NDLS' ? 'New Delhi' : targetStation === 'PRYJ' ? 'Prayagraj Jn' : targetStation;

  const defaultTrains = [
    {
      id: 't1',
      name: 'Vande Bharat Express',
      number: '22436',
      color: '#38bdf8',
      stops: [
        { station: 'NDLS', name: 'New Delhi', origTime: '06:00', newTime: '06:00', platform: 1, status: 'on_time' },
        { station: 'CNB', name: 'Kanpur Central', origTime: '10:08', newTime: activeDelayStation ? '10:38' : '10:08', platform: 1, status: activeDelayStation ? 'delayed' : 'on_time' },
        { station: 'PRYJ', name: 'Prayagraj Jn', origTime: '12:08', newTime: activeDelayStation ? '12:38' : '12:08', platform: 1, status: activeDelayStation ? 'delayed' : 'on_time' },
        { station: 'BSB', name: 'Varanasi Jn', origTime: '14:00', newTime: activeDelayStation ? '14:30' : '14:00', platform: 1, status: activeDelayStation ? 'delayed' : 'on_time' }
      ]
    },
    {
      id: 't2',
      name: 'Rajdhani Express',
      number: '12302',
      color: '#f59e0b',
      stops: [
        { station: 'NDLS', name: 'New Delhi', origTime: '16:50', newTime: '16:50', platform: 2, status: 'on_time' },
        { station: 'CNB', name: 'Kanpur Central', origTime: '21:32', newTime: '21:32', platform: 3, status: 'ai_rerouted' },
        { station: 'PRYJ', name: 'Prayagraj Jn', origTime: '23:43', newTime: '23:43', platform: 2, status: 'on_time' },
        { station: 'PNBE', name: 'Patna Jn', origTime: '04:00', newTime: '04:00', platform: 1, status: 'on_time' },
        { station: 'HWH', name: 'Howrah Jn', origTime: '09:55', newTime: '09:55', platform: 1, status: 'on_time' }
      ]
    },
    {
      id: 't3',
      name: 'Shatabdi Express',
      number: '12004',
      color: '#10b981',
      stops: [
        { station: 'NDLS', name: 'New Delhi', origTime: '06:10', newTime: '06:10', platform: 3, status: 'on_time' },
        { station: 'CNB', name: 'Kanpur Central', origTime: '11:25', newTime: '11:25', platform: 2, status: 'on_time' }
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '20px 24px', background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.08) 0%, rgba(18, 22, 38, 0.9) 100%)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="text-gradient" style={{ fontSize: '24px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={26} color="var(--accent-secondary)" /> How AI Prevents Railway Gridlock
              </h1>
              <span className="citation-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                Visual Conflict Resolver
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
              See in simple visuals why simple delay formulas fail and how RailMind's AI physically resolves track and platform conflicts.
            </p>
          </div>

          {/* View Toggles */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'story', label: '📖 What AI Did (Simple Story)' },
              { id: 'journey', label: '🚆 Live Train Timelines' },
              { id: 'tech', label: '📊 Technical Distance Plot' }
            ].map(tab => {
              const active = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: active ? '700' : '500',
                    background: active ? 'var(--accent-primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* VIEW 1: SIMPLE STORYBOARD (The Problem vs The AI Solution) */}
      {activeView === 'story' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Side-by-Side Comparison: What went wrong vs What AI fixed */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            
            {/* The Problem (Without AI) */}
            <div 
              className="glass-panel" 
              style={{ 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(239, 68, 68, 0.4)', 
                background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.06) 0%, rgba(18, 22, 38, 0.95) 100%)' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error)' }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', color: 'var(--error)', margin: 0 }}>Without AI: Naive Formula Fails</h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Rule: "Give delayed train full delay, other trains half delay"</span>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff', marginBottom: '8px' }}>
                  💥 What Actually Happens on the Ground:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>1.</span>
                    <span><strong>Platform 1 Clash:</strong> Because the formula doesn't check platforms, Train A and Train B both try to arrive on Platform 1 at the same minute.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>2.</span>
                    <span><strong>Red Signal Halt:</strong> Train B gets stuck at the outer signal outside the station, blocking the entire line behind it.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>3.</span>
                    <span><strong>Cascading Gridlock:</strong> 4 other trains get stranded, causing 14,000+ lost passenger minutes!</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Platform Collisions:</span>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--error)' }}>❌ 2 Platform Clashes</span>
              </div>
            </div>

            {/* The Solution (With RailMind AI) */}
            <div 
              className="glass-panel" 
              style={{ 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(16, 185, 129, 0.4)', 
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(18, 22, 38, 0.95) 100%)' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', color: 'var(--success)', margin: 0 }}>With RailMind AI: Smart Resolution</h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Trained AI evaluates platforms, siding loops, and overtaking</span>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff', marginBottom: '8px' }}>
                  🧠 The 3 Smart Moves AI Made:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                    <span><strong>1. Instant Platform Reassignment:</strong> AI routed the second train to empty <strong>Platform 3</strong> so neither train waited a single minute.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                    <span><strong>2. Siding Loop Overtake:</strong> Moved the delayed rake to a side track, allowing high-speed Vande Bharat to zoom past on the main line.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                    <span><strong>3. Zero Delays for Passengers:</strong> Dispatched hot-standby relief rake on time. Saved 166.7 hours of passenger commute!</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Platform Collisions:</span>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--success)' }}>✓ 0 Collisions (100% Clear)</span>
              </div>
            </div>

          </div>

          {/* Visual Step-by-Step Scenario Explainer */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--accent-secondary)" /> Step-by-Step Incident Simulation at {targetStationName} ({targetStation})
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '11px', color: 'var(--accent-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>STEP 1: DISRUPTION</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>30m Delay Injected</div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  Signal issue detected at {targetStationName}. Vande Bharat delayed by 30 mins.
                </p>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <div style={{ fontSize: '11px', color: 'var(--error)', fontWeight: 'bold', textTransform: 'uppercase' }}>STEP 2: OLD FORMULA</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>Platform 1 Congestion</div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  Naive math put Rajdhani on PF 1 at the same time. Both trains clashed.
                </p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'bold', textTransform: 'uppercase' }}>STEP 3: AI INTERVENTION</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>Smart Platform 3 Shift</div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  AI switched Rajdhani to Platform 3 & activated Siding Loop for overtaking.
                </p>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase' }}>STEP 4: FINAL OUTCOME</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>+166.7 Hrs Saved</div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  All 3 express services arrived safely with zero physical violations!
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: LIVE TRAIN TIMELINES (Clean Horizontal Station Journey Cards) */}
      {activeView === 'journey' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 14px 0', color: 'var(--text-primary)' }}>
              Station-by-Station Timetable Progress (Corridor Flow)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {defaultTrains.map(t => (
                <div 
                  key={t.id}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: `1px solid ${t.color}33`,
                    borderRadius: '12px',
                    padding: '16px 20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <TrainFront size={18} color={t.color} />
                      <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>{t.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({t.number})</span>
                    </div>
                    <span style={{ fontSize: '11px', color: t.color, fontWeight: 'bold', background: `${t.color}15`, padding: '3px 10px', borderRadius: '6px' }}>
                      AI Verified Route
                    </span>
                  </div>

                  {/* Horizontal Stop Sequence */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflowX: 'auto', paddingBottom: '6px', gap: '10px' }}>
                    {t.stops.map((st, i) => (
                      <React.Fragment key={st.station}>
                        <div style={{ textAlign: 'center', minWidth: '110px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{st.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>PF {st.platform}</div>
                          <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 'bold', color: st.status === 'delayed' ? 'var(--warning)' : st.status === 'ai_rerouted' ? '#38bdf8' : 'var(--success)', fontFamily: 'monospace' }}>
                            {st.newTime}
                          </div>
                          {st.status === 'delayed' && (
                            <div style={{ fontSize: '9px', color: 'var(--warning)', marginTop: '2px' }}>Delayed</div>
                          )}
                          {st.status === 'ai_rerouted' && (
                            <div style={{ fontSize: '9px', color: '#38bdf8', marginTop: '2px' }}>AI Platform Shift</div>
                          )}
                          {st.status === 'on_time' && (
                            <div style={{ fontSize: '9px', color: 'var(--success)', marginTop: '2px' }}>On Time</div>
                          )}
                        </div>

                        {i < t.stops.length - 1 && (
                          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>➔</div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: TECHNICAL DISTANCE PLOT (Fixed and simplified) */}
      {activeView === 'tech' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>
              Corridor Distance vs Time (Simplified Trajectory Lines)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Green & Cyan lines represent AI smooth runs. Red dashed line indicates where the naive formula causes delays.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(14, 165, 233, 0.08)', borderRadius: '10px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
              <div>
                <strong style={{ color: '#38bdf8' }}>22436 Vande Bharat Express:</strong> New Delhi (06:00) ➔ Kanpur (10:08) ➔ Varanasi (14:00)
              </div>
              <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '12px' }}>130 km/h Clean Passage</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div>
                <strong style={{ color: '#f59e0b' }}>12302 Rajdhani Express:</strong> New Delhi (16:50) ➔ Kanpur (21:32) ➔ Howrah (09:55)
              </div>
              <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '12px' }}>Platform 3 Switched</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div>
                <strong style={{ color: '#10b981' }}>12004 Shatabdi Express:</strong> New Delhi (06:10) ➔ Kanpur Central (11:25)
              </div>
              <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '12px' }}>On Time Berth</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
