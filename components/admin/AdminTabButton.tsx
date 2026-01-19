'use client';

type AdminTabButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: string;
  count?: number;
  color?: string;
  badgeColor?: string;
};

export default function AdminTabButton({ 
  label, isActive, onClick, icon, count, color, badgeColor 
}: AdminTabButtonProps) {
  return (
    <button 
      onClick={onClick} 
      className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 font-sans 
        ${isActive 
          ? (color || 'bg-gray-800 text-white shadow-md') 
          : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
    >
      <span>{icon}</span>
      {label}
      {count !== undefined && (
        <span className={`ml-1 text-xs px-1.5 rounded-full ${badgeColor || 'bg-black/10 opacity-70'}`}>
          {count}
        </span>
      )}
    </button>
  );
}