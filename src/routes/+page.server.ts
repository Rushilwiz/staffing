import prisma from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const now = new Date();
	const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

	const [shiftsRaw, firefightersRaw] = await Promise.all([
		prisma.shift.findMany({
			where: { shiftDate: { gte: todayUtc } },
			orderBy: { shiftDate: 'asc' }
		}),
		prisma.firefighter.findMany({
			where: { isActive: true },
			orderBy: { name: 'asc' },
			select: { id: true, name: true, rank: true }
		})
	]);

	const shifts = shiftsRaw.map((s) => ({
		id: s.id,
		date: s.shiftDate.toISOString().slice(0, 10),
		type: s.shiftType
	}));

	return {
		shifts,
		firefighters: firefightersRaw
	};
};
