import { truncateString } from '@oldschoolgg/toolkit';
import { reduceNumByPercent } from 'e';
import { Bank } from 'oldschooljs';
import { convertLVLtoXP } from 'oldschooljs/dist/util';
import { describe, expect, test } from 'vitest';

import { baseModifyBusyCounter } from '../../src/lib/busyCounterCache';
import { deduplicateClueScrolls } from '../../src/lib/clues/clueUtils';
import getUserFoodFromBank from '../../src/lib/minions/functions/getUserFoodFromBank';
import { SkillsEnum } from '../../src/lib/skilling/types';
import { pluraliseItemName, sanitizeBank, skillingPetDropRate, stripEmojis } from '../../src/lib/util';
import getOSItem from '../../src/lib/util/getOSItem';
import { sellPriceOfItem, sellStorePriceOfItem } from '../../src/mahoji/commands/sell';
import { mockMUser } from './utils';

describe('util', () => {
	test('stripEmojis', () => {
		expect(stripEmojis('b👏r👏u👏h')).toEqual('bruh');
	});

	test('getOSItem', () => {
		expect(getOSItem('Twisted bow').id).toEqual(20_997);
		expect(getOSItem(20_997).id).toEqual(20_997);
		expect(getOSItem('20997').id).toEqual(20_997);
		expect(getOSItem('3rd age platebody').id).toEqual(10_348);

		expect(() => getOSItem('Non-existant item')).toThrowError("Non-existant item doesn't exist.");
	});

	test('getUserFoodFromBank', () => {
		const fakeUser = (b: Bank) =>
			({
				bank: b,
				skillLevel: () => 99
			} as any as MUser);
		expect(
			getUserFoodFromBank({ user: fakeUser(new Bank().add('Shark')), totalHealingNeeded: 500, favoriteFood: [] })
		).toStrictEqual(false);
		expect(
			getUserFoodFromBank({
				user: fakeUser(new Bank().add('Shark', 100)),
				totalHealingNeeded: 500,
				favoriteFood: []
			})
		).toStrictEqual(new Bank().add('Shark', 25));
		expect(
			getUserFoodFromBank({
				user: fakeUser(new Bank().add('Shark', 30).add('Tuna', 20)),
				totalHealingNeeded: 750,
				favoriteFood: []
			})
		).toStrictEqual(new Bank().add('Shark', 28).add('Tuna', 20));
		expect(
			getUserFoodFromBank({
				user: fakeUser(new Bank().add('Shark', 100).add('Lobster', 20).add('Shrimps', 50).add('Coal')),
				totalHealingNeeded: 1700,
				favoriteFood: []
			})
		).toStrictEqual(new Bank().add('Lobster', 20).add('Shark', 66).add('Shrimps', 50));
	});

	test('deduplicateClueScrolls', () => {
		const currentBank = new Bank().add('Clue scroll(easy)');
		const loot = new Bank().add('Clue scroll(easy)').add('Clue scroll(hard)', 10).add('Clue scroll(master)');
		expect(deduplicateClueScrolls({ loot, currentBank }).bank).toEqual(
			new Bank().add('Clue scroll(hard)').add('Clue scroll(master)').bank
		);
	});

	test('sanitizeBank', () => {
		let buggyBank = new Bank();
		buggyBank.bank[1] = -1;
		buggyBank.bank[2] = 0;
		sanitizeBank(buggyBank);
		expect(buggyBank.bank).toEqual({});
	});

	test('truncateString', () => {
		expect(truncateString('testtttttt', 5)).toEqual('te...');
	});

	test('sellPriceOfItem', () => {
		const item = getOSItem('Dragon pickaxe');
		const { price } = item;
		let expected = reduceNumByPercent(price, 20);
		expect(sellPriceOfItem(item)).toEqual({ price: expected, basePrice: price });
		expect(sellPriceOfItem(getOSItem('Yellow square'))).toEqual({ price: 0, basePrice: 0 });
	});

	test('sellStorePriceOfItem', () => {
		const item = getOSItem('Dragon pickaxe');
		const { cost } = item;

		let expectedOneQty =
			(((0.4 - 0.015 * Math.min(1 - 1, 10)) * Math.min(1, 11) + Math.max(1 - 11, 0) * 0.1) * cost) / 1;
		let expectedTwentytwoQty =
			(((0.4 - 0.015 * Math.min(22 - 1, 10)) * Math.min(22, 11) + Math.max(22 - 11, 0) * 0.1) * cost) / 22;
		expect(sellStorePriceOfItem(item, 1)).toEqual({ price: expectedOneQty, basePrice: cost });
		expect(sellStorePriceOfItem(item, 22)).toEqual({ price: expectedTwentytwoQty, basePrice: cost });
		expect(sellStorePriceOfItem(getOSItem('Yellow square'), 1)).toEqual({ price: 0, basePrice: 0 });
	});

	test('skillingPetRateFunction', () => {
		let testUser = mockMUser({
			skills_agility: convertLVLtoXP(30)
		});
		const baseDropRate = 300_000;
		// Lvl 30
		const dropRateLvl30 = Math.floor((baseDropRate - 30 * 25) / 1);
		expect(skillingPetDropRate(testUser, SkillsEnum.Agility, baseDropRate).petDropRate).toEqual(dropRateLvl30);
		// Lvl 99
		testUser = mockMUser({
			skills_agility: convertLVLtoXP(99)
		});
		const dropRateLvl99 = Math.floor((baseDropRate - 99 * 25) / 1);
		expect(skillingPetDropRate(testUser, SkillsEnum.Agility, baseDropRate).petDropRate).toEqual(dropRateLvl99);
		// Lvl 99 and 200M xp
		testUser = mockMUser({
			skills_agility: 200_000_000
		});
		const dropRate200M = Math.floor((baseDropRate - 99 * 25) / 15);
		expect(skillingPetDropRate(testUser, SkillsEnum.Agility, baseDropRate).petDropRate).toEqual(dropRate200M);
	});

	test('userBusyCache', () => {
		const id = '1';
		const cache = new Map();
		// expect(() => baseModifyBusyCounter(cache, id, -1)).toThrow();
		expect(baseModifyBusyCounter(cache, id, 1)).toEqual(1);
		expect(cache.get(id)).toEqual(1);
		expect(baseModifyBusyCounter(cache, id, 1)).toEqual(2);
		expect(cache.get(id)).toEqual(2);
		expect(baseModifyBusyCounter(cache, id, -1)).toEqual(1);
		expect(cache.get(id)).toEqual(1);
		expect(baseModifyBusyCounter(cache, id, -1)).toEqual(0);
		expect(cache.get(id)).toEqual(0);
		// expect(() => baseModifyBusyCounter(cache, id, -1)).toThrow();
	});

	test('pluraliseItemName correctly pluralises items', async () => {
		expect(pluraliseItemName('Steel Axe')).toEqual('Steel Axes');
		expect(pluraliseItemName('Steel Arrowtips')).toEqual('Steel Arrowtips');
		expect(pluraliseItemName('Adamantite nails')).toEqual('Adamantite nails');
	});
});
