import { User } from '@prisma/client';

import { mahojiUsersSettingsFetch } from '../../mahoji/mahojiSettings';
import { MUserClass } from '../MUser';
import { prisma } from '../settings/prisma';

async function syncLinkedAccountPerks(user: MUser) {
	let main = user.user.main_account;
	const allAccounts: string[] = [...user.user.ironman_alts];
	if (main) {
		allAccounts.push(main);
	}
	const allUsers = await Promise.all(
		allAccounts.map(a =>
			mahojiUsersSettingsFetch(a, {
				id: true,
				premium_balance_tier: true,
				premium_balance_expiry_date: true,
				bitfield: true
			})
		)
	);
	allUsers.map(u => new MUserClass(u));
}

export async function syncLinkedAccounts() {
	const users = await prisma.user.findMany({
		where: {
			ironman_alts: {
				isEmpty: false
			}
		},
		select: {
			id: true,
			ironman_alts: true,
			premium_balance_tier: true,
			premium_balance_expiry_date: true,
			bitfield: true
		}
	});
	for (const u of users) {
		const mUser = new MUserClass(u as User);
		await syncLinkedAccountPerks(mUser);
	}
}
