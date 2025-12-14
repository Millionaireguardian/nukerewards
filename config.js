// Reward Project Configuration

export const CONFIG = {
  // Network Configuration
  network: {
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com',
    // Use 'devnet' or 'mainnet'
    current: 'devnet',
  },

  // Token Configuration
  token: {
    name: 'Reward Token',
    symbol: 'REWARD',
    decimals: 6,
    // Total supply: 1 billion tokens (1,000,000,000 * 10^6)
    totalSupply: BigInt(1_000_000_000_000_000),
    // Initial mint amount (can be less than total supply)
    initialMint: BigInt(1_000_000_000_000_000),
  },

  // Transfer Fee Configuration (Token2022 feature)
  transferFee: {
    enabled: false, // Set to true to enable transfer fees
    // Fee in basis points (1 basis point = 0.01%)
    // 100 basis points = 1%
    // 500 basis points = 5%
    feeBasisPoints: 500, // 5% fee
    // Maximum fee (in raw token units)
    maxFee: BigInt(1_000_000_000), // 1000 tokens (with 6 decimals)
  },

  // Metadata Configuration
  metadata: {
    name: 'Reward Token',
    symbol: 'REWARD',
    description: 'A reward token for the Reward Project',
    image: '', // URI to token image
    externalUrl: '', // Website or external link
    // Creator information
    creators: null, // Or array of creator objects
    sellerFeeBasisPoints: 0, // Royalty percentage (0-10000)
  },

  // Wallet Configuration
  wallet: {
    // Path to your Solana keypair file
    // Default: ~/.config/solana/id.json
    keypairPath: process.env.SOLANA_KEYPAIR_PATH || 
      (process.platform === 'win32' 
        ? `${process.env.HOME || process.env.USERPROFILE}\\.config\\solana\\id.json`
        : `${process.env.HOME}/.config/solana/id.json`),
  },
};

