import './TokenCard.css';

interface TokenCardProps {
  name: string;
  symbol: string;
  price: number | null;
  priceUSD: number | null;
  change24h?: number;
  icon?: React.ReactNode;
}

export function TokenCard({ name, symbol, price, priceUSD, change24h, icon }: TokenCardProps) {
  const isPositive = change24h !== undefined && change24h >= 0;
  const changeColor = isPositive ? 'var(--accent-success)' : 'var(--accent-danger)';

  return (
    <div className="token-card">
      <div className="token-card-header">
        {icon && <div className="token-icon">{icon}</div>}
        <div className="token-info">
          <div className="token-name">{name}</div>
          <div className="token-symbol">{symbol}</div>
        </div>
      </div>
      
      <div className="token-price-section">
        {price !== null && (
          <div className="token-price">
            {price.toFixed(8)} SOL
          </div>
        )}
        {priceUSD !== null && (
          <div className="token-price-usd">
            ${priceUSD.toFixed(6)}
          </div>
        )}
      </div>
      
      {change24h !== undefined && (
        <div className="token-change" style={{ color: changeColor }}>
          <span className="change-arrow">{isPositive ? '↑' : '↓'}</span>
          {Math.abs(change24h).toFixed(2)}%
        </div>
      )}
    </div>
  );
}

