import React from 'react';
import { HardDrive, Cpu, Activity } from '../../utils/icons';

export interface ForecastMetric {
  Day30: number;
  Day90: number;
  Day180: number;
  Day365: number;
  Confidence: 'High' | 'Medium' | 'Low';
  Note: string;
}

interface CapacityForecastingViewProps {
  forecastData?: {
    Storage?: ForecastMetric;
    Memory?: ForecastMetric;
    Cpu?: ForecastMetric;
  };
  computerName?: string;
}

export const CapacityForecastingView: React.FC<CapacityForecastingViewProps> = ({
  forecastData,
  computerName = 'Workstation Host'
}) => {
  const storage = forecastData?.Storage || { Day30: 88.6, Day90: 92.5, Day180: 98.1, Day365: 100.0, Confidence: 'High', Note: 'Exhaustion predicted in ~180 days.' };
  const memory = forecastData?.Memory || { Day30: 58.0, Day90: 62.0, Day180: 64.0, Day365: 65.5, Confidence: 'Medium', Note: 'Available headroom remains stable.' };
  const cpu = forecastData?.Cpu || { Day30: 24.0, Day90: 34.0, Day180: 34.5, Day365: 36.0, Confidence: 'Medium', Note: 'CPU demand trends normal.' };

  const renderGauge = (label: string, metric: ForecastMetric, icon: React.ReactNode, accentColor: string) => (
    <div
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '10px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {icon}
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#f3f4f6' }}>{label} Growth Projection</h3>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: metric.Confidence === 'High' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: metric.Confidence === 'High' ? '#10b981' : '#f59e0b',
            border: `1px solid ${metric.Confidence === 'High' ? '#10b981' : '#f59e0b'}`
          }}
        >
          {metric.Confidence} Confidence
        </span>
      </div>

      {/* Days projection cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { day: '30 Days', val: metric.Day30 },
          { day: '90 Days', val: metric.Day90 },
          { day: '180 Days', val: metric.Day180 },
          { day: '365 Days', val: metric.Day365 }
        ].map(item => (
          <div key={item.day} style={{ backgroundColor: '#1f2937', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block' }}>{item.day}</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: item.val >= 90 ? '#ef4444' : accentColor }}>
              {item.val}%
            </span>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#1f2937', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#9ca3af' }}>
        <strong>Model Forecast Note:</strong> {metric.Note}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', backgroundColor: 'var(--bg-primary, #0b0f19)' }}>
      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '20px 24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#f9fafb' }}>
          Polynomial Capacity Forecasting for {computerName}
        </h2>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
          Uses historical telemetry regressions to predict disk, memory, and CPU headroom exhaustion.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {renderGauge('Storage Space', storage, <HardDrive style={{ color: '#ef4444' }} size={18} />, '#ef4444')}
        {renderGauge('Memory Consumption', memory, <Cpu style={{ color: '#10b981' }} size={18} />, '#10b981')}
        {renderGauge('CPU Utilization', cpu, <Activity style={{ color: '#3b82f6' }} size={18} />, '#3b82f6')}
      </div>
    </div>
  );
};
