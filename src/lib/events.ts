import { Message } from 'discord.js';

import { CLIENT_ID } from '../config';
import { minionStatusCommand } from '../mahoji/lib/abstracted_commands/minionStatusCommand';
import { channelIsSendable } from './util';
import { makeBankImage } from './util/makeBankImage';

const mentionText = `<@${CLIENT_ID}>`;

export async function onMessage(msg: Message) {
	if (!msg.content || msg.author.bot || !channelIsSendable(msg.channel)) return;
	const content = msg.content.trim();
	if (!content.includes(mentionText)) return;
	const user = await mUserFetch(msg.author.id);
	const result = await minionStatusCommand(user, msg.channelId);
	const { components } = result;

	if (content === `${mentionText} b`) {
		msg.reply({
			files: [
				(
					await makeBankImage({
						bank: user.bankWithGP,
						title: 'Your Bank',
						user,
						flags: {
							page: 1
						}
					})
				).file.attachment
			],
			components
		});
		return;
	}
	if (content.includes(`${mentionText} bs `)) {
		const searchText = content.split(' ')[2];
		msg.reply({
			files: [
				(
					await makeBankImage({
						bank: user.bankWithGP.filter(i => i.name.toLowerCase().includes(searchText.toLowerCase())),
						title: 'Your Bank',
						user
					})
				).file.attachment
			],
			components
		});
		return;
	}

	msg.reply({
		content: result.content,
		components
	});
}
