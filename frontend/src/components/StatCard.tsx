import { GlassCard } from './GlassCard';
import './StatCard.css';

interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className = '' }: StatCardProps) {
  return (
    <GlassCard className={`stat-card-wrapper ${className}`}>
      <div className="text-stat-label">{label}</div>
      <div className="text-stat-value">{value}</div>
    </GlassCard>
  );
}
