// Shared tier utilities — used by HomePage, Battle, and any other component
// that needs to display rank tier colors, icons, or labels.

export const TIER_COLORS: Record<string, string> = {
  bronze:   'text-[#cd7f32]',
  silver:   'text-slate-400',
  gold:     'text-yellow-400',
  platinum: 'text-sky-300',
  diamond:  'text-purple-400',
};

export const TIER_ICONS: Record<string, string> = {
  bronze:   '🥉',
  silver:   '🥈',
  gold:     '🥇',
  platinum: '💎',
  diamond:  '👑',
};

export function tierColor(tier?: string): string {
  return TIER_COLORS[tier ?? ''] ?? 'text-slate-500';
}

export function tierIcon(tier?: string): string {
  return TIER_ICONS[tier ?? ''] ?? '🎖️';
}

export function tierLabel(tier?: string): string {
  return tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Unranked';
}
