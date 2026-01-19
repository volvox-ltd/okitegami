'use client';

type AdminStatCardProps = {
  label: string;
  value: number | string;
  color: string;
};

export default function AdminStatCard({ label, value, color }: AdminStatCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-100 font-sans">
      <h3 className="text-xs font-bold text-gray-400 mb-1">{label}</h3>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}