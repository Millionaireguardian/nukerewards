import { GlassCard } from './GlassCard';
import './DistributionCard.css';

export interface DistributionCardItem {
  date: string;
  time?: string;
  status: string;
  harvestedSOL: number;
  distributedSOL: number;
  totalHolders: number;
}

interface DistributionCardProps {
  item: DistributionCardItem;
}

export function DistributionCard({ item }: DistributionCardProps) {
  return (
    <GlassCard className="distribution-card">
      <div className="distribution-card-header">
        <div className="distribution-card-status">{item.status}</div>
        <div className="distribution-card-datetime">
          {item.time ? (
            <span className="distribution-card-datetime-text">{item.date} • {item.time}</span>
          ) : (
            <span className="distribution-card-datetime-text">{item.date}</span>
          )}
        </div>
      </div>
      <div className="distribution-card-details">
        <div className="distribution-detail">
          <span className="detail-label">Harvested:</span>
          <span className="detail-value">{item.harvestedSOL} SOL</span>
        </div>
        <div className="distribution-detail">
          <span className="detail-label">Distributed:</span>
          <span className="detail-value">{item.distributedSOL} SOL</span>
        </div>
        <div className="distribution-detail">
          <span className="detail-label">Holders:</span>
          <span className="detail-value">{item.totalHolders}</span>
        </div>
      </div>
    </GlassCard>
  );
}

