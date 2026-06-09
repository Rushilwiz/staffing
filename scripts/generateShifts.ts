import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/lib/generated/prisma/client.ts';
import { ShiftType } from '../src/lib/generated/prisma/enums.ts';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Check your .env file.');
	process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DATE_HINT = 'YYYY-MM-DD';
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TEN_WEEKS_DAYS = 70;

type ShiftRow = { shiftDate: Date; shiftType: (typeof ShiftType)[keyof typeof ShiftType] };

function parseInputDate(str: string): Date {
	const trimmed = str.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		throw new Error(`Invalid date "${str}". Expected ${DATE_HINT}.`);
	}
	const d = new Date(`${trimmed}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) throw new Error(`Invalid date "${str}".`);
	return d;
}

function ymd(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function addDaysUTC(d: Date, days: number): Date {
	return new Date(d.getTime() + days * 86_400_000);
}

function assertDayOfWeek(d: Date, dow: number, label: string): void {
	if (d.getUTCDay() !== dow) {
		throw new Error(`${label} (${ymd(d)}) must fall on a ${DAYS_OF_WEEK[dow]}, but is a ${DAYS_OF_WEEK[d.getUTCDay()]}.`);
	}
}

function todayUTC(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function buildCycle(start: Date, end: Date, stepDays: number, type: ShiftRow['shiftType']): ShiftRow[] {
	const out: ShiftRow[] = [];
	for (let d = start; d.getTime() <= end.getTime(); d = addDaysUTC(d, stepDays)) {
		out.push({ shiftDate: d, shiftType: type });
	}
	return out;
}

async function main(): Promise<void> {
	const rl = createInterface({ input, output });
	try {
		const first48 = parseInputDate(await rl.question(`First 48HR shift date (Friday, ${DATE_HINT}): `));
		assertDayOfWeek(first48, 5, 'First 48HR date');

		const first24 = parseInputDate(await rl.question(`First 24HR shift date (Saturday, ${DATE_HINT}): `));
		assertDayOfWeek(first24, 6, 'First 24HR date');

		const year = first48.getUTCFullYear();
		const yearEnd = new Date(Date.UTC(year, 11, 31));

		// First Monday on or after today
		let firstMonday = todayUTC();
		while (firstMonday.getUTCDay() !== 1) firstMonday = addDaysUTC(firstMonday, 1);

		const shifts: ShiftRow[] = [
			...buildCycle(firstMonday, yearEnd, 7, ShiftType.HR12),
			...buildCycle(first48, yearEnd, TEN_WEEKS_DAYS, ShiftType.HR48),
			...buildCycle(first24, yearEnd, TEN_WEEKS_DAYS, ShiftType.HR24),
		];

		const counts = {
			HR12: shifts.filter((s) => s.shiftType === ShiftType.HR12).length,
			HR24: shifts.filter((s) => s.shiftType === ShiftType.HR24).length,
			HR48: shifts.filter((s) => s.shiftType === ShiftType.HR48).length,
		};

		console.log(`\nGenerating shifts through ${ymd(yearEnd)}:`);
		console.log(`  12HR (Mondays, weekly):     ${counts.HR12}`);
		console.log(`  24HR (Saturdays, 10-week):  ${counts.HR24}`);
		console.log(`  48HR (Fridays, 10-week):    ${counts.HR48}`);
		console.log(`  total:                      ${shifts.length}`);

		const answer = (await rl.question('\nInsert into database? [y/N]: ')).trim().toLowerCase();
		if (answer !== 'y' && answer !== 'yes') {
			console.log('Aborted. No changes written.');
			return;
		}

		const result = await prisma.shift.createMany({
			data: shifts,
			skipDuplicates: true,
		});

		console.log(`\nInserted ${result.count} new shift(s); ${shifts.length - result.count} already existed.`);
	} finally {
		rl.close();
		await prisma.$disconnect();
	}
}

main().catch(async (err) => {
	console.error('\nError:', err instanceof Error ? err.message : err);
	await prisma.$disconnect();
	process.exit(1);
});
