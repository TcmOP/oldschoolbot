import { User } from 'discord.js';
import { Extendable, ExtendableStore } from 'klasa';
import { Bank } from 'oldschooljs';
import { O } from 'ts-toolbelt';

import { similarItems } from '../../lib/data/similarItems';
import { UserSettings } from '../../lib/settings/types/UserSettings';
import { filterLootReplace } from '../../lib/slayer/slayerUtil';
import { ItemBank } from '../../lib/types';
import { bankHasAllItemsFromBank, removeBankFromBank } from '../../lib/util';
import itemID from '../../lib/util/itemID';

export interface GetUserBankOptions {
	withGP?: boolean;
}

export default class extends Extendable {
	public constructor(store: ExtendableStore, file: string[], directory: string) {
		super(store, file, directory, { appliesTo: [User] });
	}

	public bank(this: User, { withGP = false }: GetUserBankOptions = {}) {
		const bank = new Bank(this.settings.get(UserSettings.Bank));
		if (withGP) bank.add('Coins', this.settings.get(UserSettings.GP));
		return bank;
	}

	public numOfItemsOwned(this: User, itemID: number) {
		const bank = this.settings.get(UserSettings.Bank);

		let numOwned = 0;

		if (typeof bank[itemID] !== 'undefined') {
			numOwned += bank[itemID];
		}

		for (const setup of Object.values(this.rawGear())) {
			const thisItemEquipped = Object.values(setup).find(setup => setup?.item === itemID);
			if (thisItemEquipped) numOwned += thisItemEquipped.quantity;
		}

		return numOwned;
	}

	public numItemsInBankSync(this: User, itemID: number, similar = false) {
		const bank = this.settings.get(UserSettings.Bank);
		const itemQty = typeof bank[itemID] !== 'undefined' ? bank[itemID] : 0;
		if (similar && itemQty === 0 && similarItems.get(itemID)) {
			for (const i of similarItems.get(itemID)!) {
				if (bank[i] && bank[i] > 0) return bank[i];
			}
		}
		return itemQty;
	}

	public allItemsOwned(this: User): Bank {
		let totalBank = this.bank({ withGP: true });

		for (const setup of Object.values(this.rawGear())) {
			for (const equipped of Object.values(setup)) {
				if (equipped?.item) {
					totalBank.add(equipped.item, equipped.quantity);
				}
			}
		}

		const equippedPet = this.settings.get(UserSettings.Minion.EquippedPet);
		if (equippedPet) {
			totalBank.add(equippedPet);
		}

		return totalBank;
	}

	public async removeGP(this: User, amount: number) {
		await this.settings.sync(true);
		const currentGP = this.settings.get(UserSettings.GP);
		if (currentGP < amount) throw `${this.sanitizedName} doesn't have enough GP.`;
		this.log(`had ${amount} GP removed. BeforeBalance[${currentGP}] NewBalance[${currentGP - amount}]`);
		this.settings.update(UserSettings.GP, currentGP - amount);
	}

	public async addGP(this: User, amount: number) {
		await this.settings.sync(true);
		const currentGP = this.settings.get(UserSettings.GP);
		this.log(`had ${amount} GP added. BeforeBalance[${currentGP}] NewBalance[${currentGP + amount}]`);
		return this.settings.update(UserSettings.GP, currentGP + amount);
	}

	public async addItemsToBank(
		this: User,
		inputItems: ItemBank | Bank,
		collectionLog: boolean = false,
		filterLoot: boolean = true
	): Promise<{ previousCL: ItemBank; itemsAdded: ItemBank }> {
		return this.queueFn(async user => {
			const _items = inputItems instanceof Bank ? { ...inputItems.bank } : inputItems;
			await this.settings.sync(true);

			const previousCL = user.settings.get(UserSettings.CollectionLogBank);

			let items = new Bank({
				..._items
			});
			const { bankLoot, clLoot } = filterLoot
				? filterLootReplace(user.allItemsOwned(), items)
				: { bankLoot: items, clLoot: items };
			items = bankLoot;
			if (collectionLog) {
				await user.addItemsToCollectionLog(clLoot.bank);
			}

			// Get the amount of coins in the loot and remove the coins from the items to be added to the user bank
			const coinsInLoot = items.amount(995);
			if (coinsInLoot > 0) {
				await user.addGP(items.amount(995));
				items.remove(995, items.amount(995));
			}

			this.log(`Had items added to bank - ${JSON.stringify(items)}`);
			await this.settings.update(UserSettings.Bank, user.bank().add(items).bank);

			// Re-add the coins to the loot
			if (coinsInLoot > 0) items.add(995, coinsInLoot);

			return {
				previousCL,
				itemsAdded: items.bank
			};
		});
	}

	public async removeItemsFromBank(this: User, _itemBank: O.Readonly<ItemBank>) {
		return this.queueFn(async user => {
			const itemBank = _itemBank instanceof Bank ? { ..._itemBank.bank } : _itemBank;

			await user.settings.sync(true);

			const currentBank = user.settings.get(UserSettings.Bank);
			const GP = user.settings.get(UserSettings.GP);
			if (!bankHasAllItemsFromBank({ ...currentBank, 995: GP }, itemBank)) {
				throw new Error(
					`Tried to remove ${new Bank(itemBank)} from ${
						user.username
					} but failed because they don't own all these items.`
				);
			}

			const items = {
				...itemBank
			};

			if (items[995]) {
				await user.removeGP(items[995]);
				delete items[995];
			}

			user.log(`Had items removed from bank - ${JSON.stringify(items)}`);
			return user.settings.update(UserSettings.Bank, removeBankFromBank(currentBank, items));
		});
	}

	public async hasItem(this: User, itemID: number, amount = 1, sync = true) {
		if (sync) await this.settings.sync(true);

		const bank = this.settings.get(UserSettings.Bank);
		return typeof bank[itemID] !== 'undefined' && bank[itemID] >= amount;
	}

	public async numberOfItemInBank(this: User, itemID: number, sync = true) {
		if (sync) await this.settings.sync(true);

		const bank = this.settings.get(UserSettings.Bank);
		return typeof bank[itemID] !== 'undefined' ? bank[itemID] : 0;
	}

	public owns(this: User, bank: ItemBank | Bank | string | number) {
		if (typeof bank === 'string' || typeof bank === 'number') {
			return Boolean(this.settings.get(UserSettings.Bank)[typeof bank === 'number' ? bank : itemID(bank)]);
		}
		const itemBank = bank instanceof Bank ? { ...bank.bank } : bank;
		return bankHasAllItemsFromBank(
			{ ...this.settings.get(UserSettings.Bank), 995: this.settings.get(UserSettings.GP) },
			itemBank
		);
	}
}
