import React from 'react';
import { 
  Globe, 
  Monitor, 
  Cpu, 
  ShieldCheck, 
  HardDrive, 
  Wifi, 
  Clock, 
  Activity, 
  Database,
  Layers
} from 'lucide-react';
import { DeviceTelemetry } from '../lib/telemetry';

interface TelemetryInspectorProps {
  telemetry: DeviceTelemetry | null;
  loading: boolean;
}

export const TelemetryInspector: React.FC<TelemetryInspectorProps> = ({ telemetry, loading }) => {
  return (
    <section id="telemetry" className="py-24 px-6 relative border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono mb-3">
              Session Telemetry · ইনফ্রাস্ট্রাকচার ও ডাটাবেজ
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display">
              লাইভ ডিভাইস ও নেটওয়ার্ক ইনস্পেকটর
            </h2>
          </div>
          <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
            আপনার ভিজিটের সাথে সাথে আইপি, অবস্থান, ডিভাইস ও ব্রাউজার টেলিমেট্রি সনাক্ত করে সুরক্ষিত ফায়ারবেস ক্লাউড ডাটাবেজে সংরক্ষণ করা হচ্ছে।
          </p>
        </div>

        {/* Infographic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. IP & Geolocation Box */}
          <div className="bg-[#0C0C0C] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Globe className="w-4 h-4 text-white" />
                Network & Location
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">ENCRYPTED</span>
            </div>

            <div className="space-y-4 font-mono">
              <div>
                <span className="text-[11px] text-neutral-500 block mb-0.5">Detected Public IP</span>
                <span className="text-lg font-bold text-white tracking-wide">
                  {loading ? 'Analyzing...' : (telemetry?.ip || 'Unavailable')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-500 block">Country</span>
                  <span className="text-neutral-200">{telemetry?.country || 'Detecting...'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">City / Region</span>
                  <span className="text-neutral-200">
                    {telemetry?.city && telemetry.city !== 'Unknown' ? `${telemetry.city}, ` : ''}{telemetry?.region || 'Detecting...'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 text-xs">
                <span className="text-[10px] text-neutral-500 block">ISP / Network Organization</span>
                <span className="text-neutral-300 truncate block text-[11px]">{telemetry?.isp || 'Broadband Network'}</span>
              </div>
            </div>
          </div>

          {/* 2. Device & Hardware Signature */}
          <div className="bg-[#0C0C0C] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-white" />
                Device & Hardware
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">HARDWARE ID</span>
            </div>

            <div className="space-y-4 font-mono">
              <div>
                <span className="text-[11px] text-neutral-500 block mb-0.5">Classification</span>
                <span className="text-lg font-bold text-white tracking-wide">
                  {loading ? 'Scanning...' : `${telemetry?.deviceType || 'Desktop'} · ${telemetry?.deviceName || 'Standard'}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-500 block">Display Metrics</span>
                  <span className="text-neutral-200">{telemetry?.screenResolution || '1920×1080'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">Touch Interface</span>
                  <span className="text-neutral-200">{telemetry?.touchSupport ? 'Supported' : 'Disabled'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-500 block">CPU Concurrency</span>
                  <span className="text-neutral-200 tabular-nums">{telemetry?.cores ? `${telemetry.cores} Cores` : 'Standard'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">Timezone</span>
                  <span className="text-neutral-200 truncate">{telemetry?.timezone || 'Local'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Environment, Browser & Storage */}
          <div className="bg-[#0C0C0C] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-colors md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Database className="w-4 h-4 text-white" />
                Browser & Cloud Persistence
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">FIRESTORE SYNC</span>
            </div>

            <div className="space-y-4 font-mono">
              <div>
                <span className="text-[11px] text-neutral-500 block mb-0.5">Operating System & Engine</span>
                <span className="text-base font-bold text-white tracking-wide">
                  {loading ? 'Evaluating...' : `${telemetry?.os || 'OS'} / ${telemetry?.browser || 'Browser'}`}
                </span>
              </div>

              <div className="pt-2 border-t border-white/5 text-xs">
                <span className="text-[10px] text-neutral-500 block mb-1">Hardware Fingerprint Hash</span>
                <div className="bg-[#141414] border border-white/5 p-2 rounded text-[11px] text-neutral-400 break-all leading-tight">
                  {telemetry?.fingerprint || 'fp_analyzing_hardware_canvas'}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
                  Anti-Fraud Validation
                </span>
                <span className="text-neutral-300">Synchronized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
