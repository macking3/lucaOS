
import React from 'react';
import { SmartDevice, DeviceType } from '../types';
import { Lightbulb, Lock, Server, Bot, Video, Activity, Smartphone, Tv } from 'lucide-react';

interface Props {
  device: SmartDevice;
  onControlClick?: (device: SmartDevice) => void;
  themeColor?: string;
  themeBorder?: string;
  themeBg?: string;
}

const SmartDeviceCard: React.FC<Props> = ({ device, onControlClick, themeColor = 'text-rq-blue', themeBorder = 'border-rq-blue', themeBg = 'bg-rq-blue-dim' }) => {
  const getIcon = () => {
    switch (device.type) {
      case DeviceType.LIGHT: return <Lightbulb size={20} />;
      case DeviceType.LOCK: return <Lock size={20} />;
      case DeviceType.SERVER: return <Server size={20} />;
      case DeviceType.ROBOTIC_ARM: return <Bot size={20} />;
      case DeviceType.CAMERA: return <Video size={20} />;
      case DeviceType.MOBILE: return <Smartphone size={20} />;
      case DeviceType.SMART_TV: return <Tv size={20} />;
      default: return <Activity size={20} />;
    }
  };

  const activeColor = device.status === 'error' ? 'text-rq-red border-rq-red bg-rq-red-dim' 
    : device.isOn ? `${themeColor} ${themeBorder} ${themeBg}` 
    : 'text-slate-500 border-slate-700 bg-slate-900';

  return (
    <div 
      className={`
        relative p-4 rounded-lg transition-all duration-500
        flex flex-col gap-2 backdrop-blur-md group
        ${activeColor}
      `}
      style={{
        background: device.status === 'error' 
          ? 'rgba(127, 29, 29, 0.15)' 
          : device.isOn 
          ? 'rgba(0, 0, 0, 0.25)'
          : 'rgba(0, 0, 0, 0.2)',
        border: device.status === 'error'
          ? '1px solid rgba(239, 68, 68, 0.3)'
          : device.isOn
          ? (themeBorder.includes('blue') 
              ? '1px solid rgba(59, 130, 246, 0.4)' 
              : themeBorder.includes('#E0E0E0')
              ? '1px solid rgba(224, 224, 224, 0.4)'
              : themeBorder.includes('green')
              ? '1px solid rgba(16, 185, 129, 0.4)'
              : themeBorder.includes('#C9763D')
              ? '1px solid rgba(201, 118, 61, 0.4)'
              : '1px solid rgba(59, 130, 246, 0.4)')
          : '1px solid rgba(100, 116, 139, 0.2)',
        boxShadow: device.status === 'error'
          ? '0 0 20px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : device.isOn
          ? (themeBorder.includes('blue')
              ? '0 0 20px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 0 rgba(59, 130, 246, 0.2)'
              : themeBorder.includes('#E0E0E0')
              ? '0 0 20px rgba(224, 224, 224, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 0 rgba(224, 224, 224, 0.2)'
              : themeBorder.includes('green')
              ? '0 0 20px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 0 rgba(16, 185, 129, 0.2)'
              : themeBorder.includes('#C9763D')
              ? '0 0 20px rgba(201, 118, 61, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 0 rgba(201, 118, 61, 0.2)'
              : '0 0 20px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 0 rgba(59, 130, 246, 0.2)')
          : 'inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 1px 0 rgba(100, 116, 139, 0.1)'
      }}
    >
      <div className="flex justify-between items-start">
        <div 
          className="p-2 rounded-full backdrop-blur-sm"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
            {getIcon()}
        </div>
        <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-400' : 'bg-red-500'} animate-pulse`} />
            <span className="text-[10px] uppercase tracking-wider font-mono opacity-70">{device.status}</span>
        </div>
      </div>
      
      <div>
        <h3 className="font-display font-bold text-lg tracking-wide truncate">{device.name}</h3>
        <p className="font-mono text-xs opacity-60">{device.location}</p>
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-xs">
        <span>STATUS:</span>
        <span className={`font-bold ${device.isOn ? 'text-white' : 'opacity-50'}`}>
            {device.isOn ? 'ACTIVE' : 'STANDBY'}
        </span>
      </div>

      {device.type === DeviceType.SMART_TV && onControlClick && (
        <button 
            onClick={() => onControlClick(device)}
            className="mt-2 w-full py-1 text-[10px] font-bold tracking-widest transition-colors group/btn backdrop-blur-sm"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              // Extract hover bg color from theme
              let hoverBg = 'rgba(30, 58, 138, 0.4)'; // default blue
              if (themeBg.includes('blue-950')) hoverBg = 'rgba(30, 58, 138, 0.4)';
              else if (themeBg.includes('gray-950')) hoverBg = 'rgba(3, 7, 18, 0.4)';
              else if (themeBg.includes('green-950')) hoverBg = 'rgba(5, 46, 22, 0.4)';
              else if (themeBg.includes('rgba(201,118,61')) hoverBg = 'rgba(201, 118, 61, 0.4)';
              e.currentTarget.style.backgroundColor = hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
            }}
        >
            LAUNCH REMOTE
        </button>
      )}

      {device.type === DeviceType.MOBILE && onControlClick && (
        <button 
            onClick={() => onControlClick(device)}
            className="mt-2 w-full py-1 text-[10px] font-bold tracking-widest transition-colors group/btn backdrop-blur-sm"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              // Extract hover bg color from theme
              let hoverBg = 'rgba(30, 58, 138, 0.4)'; // default blue
              if (themeBg.includes('blue-950')) hoverBg = 'rgba(30, 58, 138, 0.4)';
              else if (themeBg.includes('gray-950')) hoverBg = 'rgba(3, 7, 18, 0.4)';
              else if (themeBg.includes('green-950')) hoverBg = 'rgba(5, 46, 22, 0.4)';
              else if (themeBg.includes('rgba(201,118,61')) hoverBg = 'rgba(201, 118, 61, 0.4)';
              e.currentTarget.style.backgroundColor = hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
            }}
        >
            ACCESS UPLINK
        </button>
      )}
    </div>
  );
};

export default SmartDeviceCard;