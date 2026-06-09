import React, { useState } from 'react';

export type BadgeType =
  | 'staff'
  | 'early_supporter'
  | 'bug_hunter'
  | 'active_developer'
  | 'verified_developer'
  | 'server_booster'
  | 'hypesquad_bravery'
  | 'hypesquad_brilliance'
  | 'hypesquad_balance';

interface BadgeDef {
  label: string;
  color: string;
  icon: React.ReactNode;
}

const BADGE_DEFS: Record<BadgeType, BadgeDef> = {
  staff: {
    label: 'Nexus Staff',
    color: '#5865F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
      </svg>
    ),
  },
  early_supporter: {
    label: 'Early Supporter',
    color: '#a57fe8',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
  },
  bug_hunter: {
    label: 'Bug Hunter',
    color: '#2ecc71',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C13 5.06 12.51 5 12 5s-1 .06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"/>
      </svg>
    ),
  },
  active_developer: {
    label: 'Active Developer',
    color: '#23a55a',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M8 3a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2H3v2h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2v-2H8v-5a2 2 0 0 0-2-2 2 2 0 0 0 2-2V5h2V3H8zm8 0a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1v2h-1a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2v-2h2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5h-2V3h2z"/>
      </svg>
    ),
  },
  verified_developer: {
    label: 'Verified Bot Developer',
    color: '#5865F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
  },
  server_booster: {
    label: 'Server Booster',
    color: '#ff73fa',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12 2.5l2.5 6.5H21l-5.5 4 2 6.5L12 16l-5.5 3.5 2-6.5L3 9h6.5L12 2.5z"/>
      </svg>
    ),
  },
  hypesquad_bravery: {
    label: 'HypeSquad Bravery',
    color: '#9c84ef',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
      </svg>
    ),
  },
  hypesquad_brilliance: {
    label: 'HypeSquad Brilliance',
    color: '#f47b67',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .38-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.38.39-1.02 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.38 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/>
      </svg>
    ),
  },
  hypesquad_balance: {
    label: 'HypeSquad Balance',
    color: '#45ddc0',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2v-2c-4 0-4-2-8-2-1.13 0-1.9.16-2.53.33C14.7 11.55 17.5 9.31 21 9v-2a9.27 9.27 0 0 0-4 1z"/>
      </svg>
    ),
  },
};

interface BadgeIconProps {
  type: BadgeType;
  size?: 'sm' | 'md' | 'lg';
}

const BadgeIcon: React.FC<BadgeIconProps> = ({ type, size = 'md' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const def = BADGE_DEFS[type];
  if (!def) return null;

  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <div
      className="relative inline-flex items-center justify-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`${sizeClass} cursor-pointer transition-transform hover:scale-110`}
        style={{ color: def.color }}
      >
        {def.icon}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none shadow-lg">
          {def.label}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black" />
        </div>
      )}
    </div>
  );
};

interface UserBadgesProps {
  badges: string[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const UserBadges: React.FC<UserBadgesProps> = ({ badges, size = 'md', className = '' }) => {
  if (!badges || badges.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {badges.map((badge) =>
        BADGE_DEFS[badge as BadgeType] ? (
          <BadgeIcon key={badge} type={badge as BadgeType} size={size} />
        ) : null
      )}
    </div>
  );
};

export const HYPESQUAD_BADGES_LIST = ['hypesquad_bravery', 'hypesquad_brilliance', 'hypesquad_balance'] as const;

export { BadgeIcon, BADGE_DEFS };
export default UserBadges;
