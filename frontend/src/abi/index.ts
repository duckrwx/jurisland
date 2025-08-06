// Auto-generated ABI exports - Updated: 2025-08-06T20:34:08.238Z
export { default as VitrineCoreABI } from './VitrineCore.json';
export { default as MarketplaceABI } from './Marketplace.json';

// Contract addresses (from environment variables)
export const CONTRACT_ADDRESSES = {
  VitrineCore: import.meta.env.VITE_VITRINE_CORE_ADDRESS,
  Marketplace: import.meta.env.VITE_MARKETPLACE_ADDRESS,
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;
