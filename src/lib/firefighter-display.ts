import { FirefighterRank } from '$lib/generated/prisma/enums';

export type RankStyle = { color: string; background: string };

export const rankStyles: Record<FirefighterRank, RankStyle> = {
	[FirefighterRank.DOT]: { color: '#ffffff', background: '#dc2626' },
	[FirefighterRank.ROOKIE]: { color: '#dc2626', background: '#000000' },
	[FirefighterRank.RELEASED]: { color: '#ffffff', background: '#000000' },
	[FirefighterRank.SENIOR]: { color: '#facc15', background: '#000000' },
	[FirefighterRank.MASTER]: { color: '#000000', background: '#facc15' },
	[FirefighterRank.LIEUTENANT]: { color: '#000000', background: '#facc15' },
	[FirefighterRank.CAPTAIN]: { color: '#000000', background: '#facc15' }
};

export function rankStyleAttr(rank: FirefighterRank): string {
	const { color, background } = rankStyles[rank];
	return `color: ${color}; background-color: ${background};`;
}

export function formatFirefighterName(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length < 2) return name;
	const first = parts[0];
	const last = parts[parts.length - 1];
	return `${first[0].toUpperCase()}. ${last}`;
}
