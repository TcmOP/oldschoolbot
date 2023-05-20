import { WikiDocs } from '@prisma/client';
import fetch from 'node-fetch';

import { GITBOOK_SPACE_ID, GITBOOK_TOKEN } from '../config';
import { prisma } from './settings/prisma';
import { logError } from './util/logError';

export interface DocsContent {
	object: string;
	id: string;
	parents: string[];
	pages: DocsPages[];
	files: DocsFiles[];
	urls: string[];
	git: string[];
}

export interface DocsPages {
	id: string;
	title: string;
	kind: 'sheet' | string;
	[key: string]: any;
	pages?: DocsPages[];
	markdown: string;
}

export interface DocsSheet {
	id: string;
	title: string;
	kind: 'sheet' | string;
	description: string;
	path: string;
	slug: string;
	pages?: DocsSheet[];
	[key: string]: any;
	markdown: string;
}

export interface DocsFiles {
	id: string;
	name: string;
	downloadURL: string;
	contentType: string;
}

export interface DocsDefaultResults {
	name: string;
	value: string;
}

export const DefaultDocsResults: DocsDefaultResults[] = [
	{
		name: 'Home',
		value: ''
	},
	{
		name: 'FAQ',
		value: 'getting-started/faq'
	},
	{
		name: 'Rules',
		value: 'getting-started/rules'
	},
	{
		name: 'Beginner Guide',
		value: 'getting-started/beginner-guide'
	}
];

export async function syncDocs() {
	try {
		const results = await fetch(`https://api.gitbook.com/v1/spaces/${GITBOOK_SPACE_ID}/content`, {
			headers: {
				Authorization: `Bearer ${GITBOOK_TOKEN}`
			}
		});

		const resultJson = await results.json();

		console.log(resultJson);
		let articlesToUpdate: { id: string; name: string; value: string; body: string }[] = [];
		const { pages } = resultJson as DocsContent;

		const sheets: string[] = [];

		function filter(pages: DocsPages[]) {
			pages.forEach(p => {
				if (p.kind === 'sheet') sheets.push(p.id);

				if (p.pages && p.pages.length > 0) filter(p.pages);
			});
		}

		filter(pages);

		for (let sheet of sheets) {
			const pageResults = await fetch(
				`https://api.gitbook.com/v1/spaces/${GITBOOK_SPACE_ID}/content/page/${sheet}?format=markdown`,
				{
					headers: {
						Authorization: `Bearer ${GITBOOK_TOKEN}`
					}
				}
			);
			const pageRes: DocsSheet = await pageResults.json();
			let parsedPage: string = pageRes.markdown;
			parsedPage = parsedPage
				.replace(/(---)(\n)(\bdescription: )([>\n -]*)([a-zA-Z. \n/'!-,";:<>`~_+=?-]+)(\n---)/g, '$5') // Format page description if present.
				.replace(/^#[a-zA-Z0-9 !?]+[\\n|\n]+/, '') // Remove page title
				.replace(/((\|[^|\r\n]*)+\|(\r?\n|\r)?)+/g, '') // Remove any tables because they won't render
				.replaceAll(/(##+\s)([a-zA-Z0-9 !?()-\/:]+)([\\][n])+/g, '**$2**\n'); // Make section headers bold

			articlesToUpdate.push({
				id: pageRes.id,
				name: pageRes.title,
				value: pageRes.path,
				body: parsedPage
			});
		}

		// console.log(`id: ${section.id} \nname: ${item.title}\nvalue: ${item.path}\n\n`);
		// console.log(`id: ${section.id} \n name: ${item.title} - ${section.title}\n value: ${section.path}`);
		// console.log(articlesToUpdate);
		await prisma.$transaction(
			articlesToUpdate.map(a =>
				prisma.wikiDocs.upsert({
					create: {
						id: a.id,
						name: a.name,
						path: a.value,
						body: a.body.substring(0, 4999)
					},
					update: { id: a.id, name: a.name, path: a.value, body: a.body.substring(0, 4999) },
					where: { path: a.value }
				})
			)
		);
	} catch (err: any) {
		logError(err);
	}

	return 'Updating Docs';
}

export async function getDocsResults(SearchString: string) {
	const articleResults: WikiDocs[] = await prisma.$queryRawUnsafe(`
	SELECT *,
    LENGTH(name) as namelen,
    CASE
        WHEN path like '%#%' THEN '2'
        ELSE '1'
    END as mainpageprio,
    CASE
        WHEN REPLACE(REPLACE(name, ' - ', ' '), '''', '') ~ '(?i)(?<= |^)${SearchString}(?= |$)' THEN '1'
        WHEN REPLACE(REPLACE(name, ' - ', ' '), '''', '') ILIKE '%${SearchString}%' THEN '2'
        WHEN body ILIKE '%${SearchString}%' THEN '3'
        ELSE '4'
    END as prio
FROM wiki_docs
WHERE REPLACE(REPLACE(name, ' - ', ' '), '''', '') ILIKE '%${SearchString}%'
    OR body ILIKE '%${SearchString}%'
ORDER BY mainpageprio ASC,
    prio ASC,
    namelen ASC
LIMIT 12;`);
	return articleResults;
}

export async function getAllDocsResults() {
	const articleResults: WikiDocs[] = await prisma.$queryRawUnsafe(`SELECT *
FROM wiki_docs;`);
	return articleResults;
}
