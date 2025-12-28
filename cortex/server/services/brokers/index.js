/**
 * Broker Client Registry
 * Central registry for all supported forex brokers
 */

import derivClient from './derivClient.js';
import oandaClient from './oandaClient.js';
import fxcmClient from './fxcmClient.js';
import exnessClient from './exnessClient.js';
import xmClient from './xmClient.js';
import icMarketsClient from './icMarketsClient.js';
import interactiveBrokersClient from './interactiveBrokersClient.js';
import pepperstoneClient from './pepperstoneClient.js';

/**
 * Supported brokers with metadata
 */
export const SUPPORTED_BROKERS = {
  deriv: {
    name: 'Deriv',
    client: derivClient,
    regions: ['Nigeria', 'Global'],
    features: ['Forex', 'Synthetics', 'Options'],
    apiType: 'WebSocket',
    icon: '🎲',
    color: 'from-red-500 to-pink-600',
    popular: true,
    nigeriaFriendly: true,
    requiresAccountId: false
  },
  oanda: {
    name: 'OANDA',
    client: oandaClient,
    regions: ['US', 'EU', 'Asia'],
    features: ['Forex', 'CFDs'],
    apiType: 'REST v20',
    icon: '🏦',
    color: 'from-blue-500 to-cyan-600',
    popular: true,
    nigeriaFriendly: false,
    requiresAccountId: true
  },
  fxcm: {
    name: 'FXCM',
    client: fxcmClient,
    regions: ['Global'],
    features: ['Forex', 'CFDs'],
    apiType: 'REST',
    icon: '📊',
    color: 'from-purple-500 to-indigo-600',
    popular: true,
    nigeriaFriendly: false,
    requiresAccountId: true
  },
  exness: {
    name: 'Exness',
    client: exnessClient,
    regions: ['Nigeria', 'Africa', 'Global'],
    features: ['Forex', 'Metals', 'Crypto'],
    apiType: 'REST',
    icon: '⚡',
    color: 'from-yellow-500 to-orange-600',
    popular: true,
    nigeriaFriendly: true,
    requiresAccountId: true
  },
  xm: {
    name: 'XM',
    client: xmClient,
    regions: ['Nigeria', 'Africa', 'Global'],
    features: ['Forex', 'CFDs', 'Stocks'],
    apiType: 'REST',
    icon: '🌍',
    color: 'from-green-500 to-teal-600',
    popular: true,
    nigeriaFriendly: true,
    requiresAccountId: true
  },
  icmarkets: {
    name: 'IC Markets',
    client: icMarketsClient,
    regions: ['Global'],
    features: ['Forex', 'CFDs', 'Futures'],
    apiType: 'FIX/cTrader',
    icon: '⚙️',
    color: 'from-gray-500 to-slate-600',
    popular: false,
    nigeriaFriendly: true,
    requiresAccountId: true
  },
  interactivebrokers: {
    name: 'Interactive Brokers',
    client: interactiveBrokersClient,
    regions: ['Global'],
    features: ['Stocks', 'Forex', 'Options', 'Futures'],
    apiType: 'TWS API',
    icon: '🏛️',
    color: 'from-indigo-500 to-purple-600',
    popular: false,
    nigeriaFriendly: true,
    requiresAccountId: true
  },
  pepperstone: {
    name: 'Pepperstone',
    client: pepperstoneClient,
    regions: ['Global'],
    features: ['Forex', 'CFDs', 'Indices'],
    apiType: 'cTrader/MT4',
    icon: '🌶️',
    color: 'from-red-600 to-orange-600',
    popular: false,
    nigeriaFriendly: true,
    requiresAccountId: true
  }
};

/**
 * Get broker client by ID
 */
export function getBrokerClient(brokerId) {
  const broker = SUPPORTED_BROKERS[brokerId];
  if (!broker) {
    throw new Error(`Unsupported broker: ${brokerId}`);
  }
  return broker.client;
}

/**
 * Get all broker IDs
 */
export function getAllBrokerIds() {
  return Object.keys(SUPPORTED_BROKERS);
}

/**
 * Get brokers filtered by region
 */
export function getBrokersByRegion(region) {
  return Object.entries(SUPPORTED_BROKERS)
    .filter(([_, broker]) => broker.regions.includes(region))
    .map(([id, broker]) => ({ id, ...broker }));
}

/**
 * Get Nigeria-friendly brokers
 */
export function getNigeriaFriendlyBrokers() {
  return Object.entries(SUPPORTED_BROKERS)
    .filter(([_, broker]) => broker.nigeriaFriendly)
    .map(([id, broker]) => ({ id, ...broker }));
}

export default SUPPORTED_BROKERS;
