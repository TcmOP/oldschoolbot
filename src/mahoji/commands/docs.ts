import { ApplicationCommandOptionType, CommandRunOptions } from 'mahoji';

import { DefaultDocsResults, getDocsResults } from '../../lib/docsActivity';
import { docsArticleCommand, docsAskCommand } from '../lib/abstracted_commands/docsCommand';
import { OSBMahojiCommand } from '../lib/util';

export const docsCommand: OSBMahojiCommand = {
	name: 'docs',
	description: 'Search the bot wiki.',
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'article',
			description: 'Find a article using keywords',

			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'search',
					description: 'Your search query.',
					required: true,
					autocomplete: async value => {
						if (value.length === 0)
							return DefaultDocsResults.map(i => ({
								name: i.name,
								value: i.name
							}));
						try {
							const autocompleteResult = await getDocsResults(value);
							const returnArr: { name: string; value: string }[] = [];
							for (let index = 0; index < autocompleteResult.length; index++) {
								returnArr.push({
									name: autocompleteResult[index].name,
									value: autocompleteResult[index].name
								});
							}
							return returnArr;
						} catch (_) {
							return [];
						}
					}
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'ask',
			description: 'Ask a simple question to get a simple response',

			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'question',
					description: 'Your search query.',
					required: true
				}
			]
		}
	],
	run: async ({
		options
	}: CommandRunOptions<{
		article?: { search: string };
		ask?: { question: string };
	}>) => {
		if (options.article) {
			return docsArticleCommand(options.article.search);
		}
		if (options.ask) {
			return docsAskCommand(options.ask.question);
		}
		return 'Invalid command.';
	}
};
