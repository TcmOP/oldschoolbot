import deepMerge from 'deepmerge';
import { Items } from 'oldschooljs';
import { Item } from 'oldschooljs/dist/meta/types';
import { itemNameMap } from 'oldschooljs/dist/structures/Items';

import getOSItem from '../util/getOSItem';

function cleanString(str: string): string {
	return str.replace(/\s/g, '').toUpperCase();
}
export const customPrices: Record<number, number> = [];

export const customItems: number[] = [];

export function isCustomItem(itemID: number) {
	return customItems.includes(itemID);
}

interface CustomItemData {
	isSuperUntradeable?: boolean;
	cantDropFromMysteryBoxes?: boolean;
}
declare module 'oldschooljs/dist/meta/types' {
	interface Item {
		customItemData?: CustomItemData;
	}
}

export const hasSet = new Set();

export function setCustomItem(id: number, name: string, baseItem: string, newItemData?: Partial<Item>, price = 0) {
	if (hasSet.has(id)) {
		throw new Error(`Tried to add 2 custom items with same id ${id}, called ${name}`);
	}
	hasSet.add(id);
	const data = deepMerge({ ...getOSItem(baseItem) }, { ...newItemData, name, id });
	data.price = price || 1;

	Items.set(id, data);
	const cleanName = cleanString(name);
	itemNameMap.set(cleanName, id);
	itemNameMap.set(name, id);

	// Add the item to the custom items array
	customItems.push(id);
}
