/**
 * Centralized Emoji Constants
 *
 * This file contains all emoji definitions used throughout the ITSM platform.
 * Use these constants instead of hardcoding emojis to ensure consistency.
 */

// ============================================================================
// NOTIFICATION EMOJIS
// ============================================================================

export const NOTIFICATION_EMOJIS = {
  TICKET_ASSIGNED: '🎯',
  TICKET_STATUS_CHANGED: '🔄',
  TICKET_COMMENT: '💬',
  TICKET_PRIORITY_CHANGED: '⚡',
  CHANGE_APPROVAL_NEEDED: '⚠️',
  CHANGE_APPROVED: '✅',
  CHANGE_REJECTED: '❌',
  SERVICE_REQUEST_COMPLETED: '🎉',
  SLA_BREACH_WARNING: '⏰',
  SLA_BREACHED: '🚨',
  DEFAULT: '🔔',
} as const;

export type NotificationType = keyof typeof NOTIFICATION_EMOJIS;

export function getNotificationEmoji(type: string): string {
  return NOTIFICATION_EMOJIS[type as NotificationType] || NOTIFICATION_EMOJIS.DEFAULT;
}

// ============================================================================
// CATEGORY EMOJIS
// ============================================================================

export const CATEGORY_EMOJIS = {
  HARDWARE: '💻',
  SOFTWARE: '⚙️',
  NETWORK: '🌐',
  ACCESS: '🔐',
  ACCOUNT_ACCESS: '🔐',
  SERVICE_REQUEST: '📋',
} as const;

// Quick select emojis for category modal
export const CATEGORY_QUICK_SELECT = [
  '📁', '📄', '📚', '📖', '🔧', '💡', '🎯', '📊', '🔍', '⚙️', '🎓', '🏢'
] as const;

export const DEFAULT_CATEGORY_EMOJI = '📁';

// ============================================================================
// ASSET TYPE EMOJIS
// ============================================================================

export const ASSET_TYPE_EMOJIS = {
  HARDWARE: '🔧',
  SOFTWARE: '💿',
  DEFAULT: '📦',
} as const;

// Common asset-related emojis for the emoji picker
export const ASSET_EMOJIS = {
  TECH: ['💻', '🖥️', '⌨️', '🖱️', '🖨️', '📱', '📟', '📠', '📺', '📷', '📹', '🎥'],
  STORAGE: ['💾', '💿', '📀'],
  SECURITY: ['🔒', '🔓', '🔑', '🗝️'],
  TOOLS: ['⚙️', '🔧', '🔨', '🪛', '🛠️', '⚡', '🔋', '🪫'],
  DATA: ['📦', '📋', '📊', '📈', '📉', '🗂️', '📁', '📂'],
  NETWORK: ['🌐', '🖧', '📡', '🛰️', '🔗', '⛓️', '💡', '🔦'],
} as const;

export const DEFAULT_ASSET_EMOJI = '📦';

// ============================================================================
// SERVICE REQUEST TEMPLATE EMOJIS
// ============================================================================

export const SERVICE_REQUEST_EMOJIS = {
  NEW_LAPTOP: '💻',
  SOFTWARE_INSTALLATION: '📦',
  EMAIL_SETUP: '📧',
  VPN_ACCESS: '🔐',
  MOBILE_PHONE: '📱',
  PASSWORD_RESET: '🔑',
  MONITOR_REQUEST: '🖥️',
  LICENSE_REQUEST: '🎫',
} as const;

// ============================================================================
// STATUS EMOJIS (for console/logging)
// ============================================================================

export const STATUS_EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  PROGRESS: '🔄',
  COMPLETED: '✓',
  SETTINGS: '🔧',
  PIN: '📌',
  LIST: '📋',
  EMAIL: '📧',
  TEST: '🧪',
  CELEBRATION: '✨',
  STEP_1: '1️⃣',
  STEP_2: '2️⃣',
  STEP_3: '3️⃣',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all unique emojis from asset categories
 */
export function getAllAssetEmojis(): string[] {
  return Object.values(ASSET_EMOJIS).flat();
}

/**
 * Get emoji for asset type (hardware/software)
 */
export function getAssetTypeEmoji(type: 'hardware' | 'software'): string {
  return type === 'hardware' ? ASSET_TYPE_EMOJIS.HARDWARE : ASSET_TYPE_EMOJIS.SOFTWARE;
}

/**
 * Get emoji for category by name
 */
export function getCategoryEmoji(categoryName: string): string {
  const normalizedName = categoryName.toUpperCase().replace(/\s+/g, '_');
  return CATEGORY_EMOJIS[normalizedName as keyof typeof CATEGORY_EMOJIS] || DEFAULT_CATEGORY_EMOJI;
}
