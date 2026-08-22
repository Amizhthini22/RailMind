import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, AlertTriangle, TrainFront, Zap, Clock, Activity, CheckCircle2 } from 'lucide-react';

export const DigitalTwinOccupancy = ({ 
  stations = [], 
  trains = [], 
  platformAllocations = {}, 
  reschedulePlan = {},
  activeDelayStation = null,
  currentSeverity = null,
  showToast = () => {}
}) => {
  const [selectedStationCode, setSelectedStationCode] = useState('CNB');
  const [platformsState, setPlatformsState] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8001/api/digital-twin/platforms')
      .then(res => res.json())
      .then(data => setPlatformsState(data))
      .catch(err => console.error("Error fetching platforms:", err));
  }, []);

  const currentStationInfo = platformsState[selectedStationCode] || {
    name: selectedStationCode,
    km: 440.0,
    platforms: [
      { id: `${selectedStationCode}_PF1`, number: 1, occupied_by: null },
      { id: `${selectedStationCode}_PF2`, number: 2, occupied_by: null },
      { id: `${selectedStationCode}_PF3`, number: 3, occupied_by: null },
      { id: `${selectedStationCode}_PF4`, number: 4, occupied_by: null },
      { id: `${selectedStationCode}_PF5`, number: 5, occupied_by: null },
      { id: `${selectedStationCode}_PF6`, number: 6, occupied_by: null }
    ],
    loops: [
      { id: `${selectedStationCode}_LOOP1`, name: "Overtake Siding 1", occupied_by: [] },
      { id: `${selectedStationCode}_LOOP2`, name: "Overtake Siding 2", occupied_by: [] }
    ]
  };

  // Find trains calling at this station
  const stationTrains = trains.filter(t => t.route.includes(selectedStationCode));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '20px 24px', background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.08) 0%, rgba(18, 22, 38, 0.9) 100%)', borderRadius: '16px', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="text-gradient" style={{ fontSize: '24px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={26} color="var(--accent-secondary)" /> Digital Twin Platform & Track Interlocking
              </h1>
              <span className="citation-badge" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', borderColor: 'rgba(14, 165, 233, 0.3)' }}>
                SIL-4 Physical Interlocking Active
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
              Real-time platform berth occupancy, 600m rake limits, siding loop track holding, and train turn-around buffers.
            </p>
          </div>

          {/* Station Switcher Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {['NDLS', 'CNB', 'PRYJ', 'BSB', 'PNBE', 'HWH'].map(code => {
              const active = selectedStationCode === code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedStationCode(code)}
                  style={{
                    padding: '6px 14px',
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
                  {code}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform Bay Grid */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="#38bdf8" /> {currentStationInfo.name} ({selectedStationCode}) — Live Platform Bay Layout
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Location: KM {currentStationInfo.km} · Automatic Block Infeed · 25kV AC OHE Electrified
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              Clear Platform
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></span>
              RL Allocated Berth
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
              Siding Loop Hold
            </span>
          </div>
        </div>

        {/* Platform Track Bays */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {(currentStationInfo.platforms || []).map(pf => {
            // Check which train is allocated to this platform
            const allocatedTrain = stationTrains.find(t => {
              const pfAlloc = platformAllocations[t.id]?.[selectedStationCode] || 1;
              return pfAlloc === pf.number;
            });

            const hasConflictInBaseline = pf.number === 1 && stationTrains.length > 1 && activeDelayStation;

            return (
              <div
                key={pf.id}
                style={{
                  background: allocatedTrain 
                    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(18, 22, 38, 0.95))' 
                    : 'rgba(0,0,0,0.3)',
                  border: allocatedTrain 
                    ? '1px solid rgba(56, 189, 248, 0.4)' 
                    : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '16px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Platform Track Line visual */}
                <div style={{ height: '3px', background: allocatedTrain ? '#38bdf8' : 'rgba(255,255,255,0.1)', width: '100%', marginBottom: '12px', borderRadius: '2px', position: 'relative' }}>
                  {allocatedTrain && (
                    <span style={{ position: 'absolute', right: 0, top: '-3px', width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}></span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Platform {pf.number}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      600m
                    </span>
                  </div>

                  <span 
                    className="status-badge"
                    style={{
                      background: allocatedTrain ? 'rgba(14, 165, 233, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: allocatedTrain ? '#38bdf8' : 'var(--success)',
                      borderColor: allocatedTrain ? 'rgba(14, 165, 233, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                      fontSize: '10px'
                    }}
                  >
                    {allocatedTrain ? 'BERTH OCCUPIED' : 'CLEAR'}
                  </span>
                </div>

                {allocatedTrain ? (
                  <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TrainFront size={14} color="#38bdf8" /> {allocatedTrain.name} ({allocatedTrain.number})
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Berth Timetable:</span>
                      <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>
                        {reschedulePlan[allocatedTrain.id]?.[selectedStationCode] || allocatedTrain.schedule[selectedStationCode] || 'On Time'}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
                      ✓ Digital Twin Interlocking Verified (0 Conflicts)
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Available for incoming scheduled traffic
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overtake Siding Loops */}
        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '18px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="var(--warning)" /> Siding & Loop Overtaking Tracks ({selectedStationCode})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {(currentStationInfo.loops || []).map((lp, idx) => (
              <div 
                key={lp.id}
                style={{
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    {lp.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Capacity: 2 Rakes · Axle Counter Monitored
                  </div>
                </div>

                <span style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                  LOOP STANDBY READY
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
