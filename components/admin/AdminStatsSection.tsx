'use client';

import AdminStatCard from '@/components/admin/AdminStatCard';

interface AdminStatsSectionProps {
  stats: {
    userCount: number;
    letterCount: number;
    reportCount: number;
  };
  allUserLettersCount: number;
}

export default function AdminStatsSection({ stats, allUserLettersCount }: AdminStatsSectionProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
      <AdminStatCard label="総ユーザー数" value={stats.userCount} color="text-blue-600" />
      <AdminStatCard label="総投稿数" value={stats.letterCount} color="text-orange-500" />
      <AdminStatCard label="未対応の通報" value={stats.reportCount} color="text-red-600" />
      <AdminStatCard label="一般ユーザー投稿" value={allUserLettersCount} color="text-green-600" />
    </div>
  );
}