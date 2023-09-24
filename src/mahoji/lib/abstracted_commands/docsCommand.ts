import { stringMatches } from '@oldschoolgg/toolkit';
import { CommandResponse } from 'mahoji/dist/lib/structures/ICommand';

import { GITBOOK_SPACE_ID, GITBOOK_TOKEN, GITBOOK_URL } from '../../../config';
import { DefaultDocsResults, getAllDocsResults } from '../../../lib/docsActivity';
import { logError } from '../../../lib/util/logError';

export async function docsArticleCommand(search: string | undefined): CommandResponse {
	const liveDocs = await getAllDocsResults();
	const validDoc = liveDocs.find(item => stringMatches(item.name, search));
	const defaultDoc = DefaultDocsResults.find(item => stringMatches(item.name, search));

	if (!validDoc && search !== '' && !defaultDoc) return 'That article was not found.';

	if (defaultDoc) return `<${GITBOOK_URL}${defaultDoc.value}>`;
	const bodyParse = validDoc?.body.replaceAll('``', '` `').replaceAll(/(\n+)/g, '\n').substring(0, 250); // .replace(/[\r\n]{2,}/gs, '\n').replace(/[\r\n]/gs, ' | ');

	let response = '';

	if (bodyParse?.length !== 0) response += `${bodyParse}...\nRead more: `;

	response += `<${GITBOOK_URL}${validDoc?.path}>`;

	return response;
}

export async function docsAskCommand(question: string | undefined): CommandResponse {
	try {
		const results = await fetch(`https://api.gitbook.com/v1/spaces/${GITBOOK_SPACE_ID}/search/ask`, {
			method: 'Post',
			headers: {
				Authorization: `Bearer ${GITBOOK_TOKEN}`
			},
			body: JSON.stringify({
				query: question
			})
		});

		const resultJson = await results.json();
		// if (resultJson.answer.length === undefined) {
		// return "I can't answer this";
		// }
		let response = '';
		response += resultJson.answer[0].text;
		response += '\n';
		response += resultJson.answer[0].followupQuestions.join('\r\n');

		return response;
	} catch (err: any) {
		logError(err);
	}
	return 'error';
}
