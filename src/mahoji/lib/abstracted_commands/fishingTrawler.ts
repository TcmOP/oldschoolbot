import { calcWhatPercent, reduceNumByPercent, Time } from 'e';

import { getMinigameScore } from '../../../lib/settings/minigames';
import { MinigameActivityTaskOptions } from '../../../lib/types/minions';
import { formatDuration } from '../../../lib/util';
import addSubTaskToActivityTask from '../../../lib/util/addSubTaskToActivityTask';
import { calcMaxTripLength } from '../../../lib/util/calcMaxTripLength';

export async function fishingTrawlerCommand(user: MUser, channelID: string) {
	if (user.skillLevel('fishing') < 15) {
		return 'You need atleast level 15 Fishing to do the Fishing Trawler.';
	}

	const tripsDone = await getMinigameScore(user.id, 'fishing_trawler');

	let tripLength = Time.Minute * 13;
	// 10% boost for 50 trips done
	const boost = Math.min(100, calcWhatPercent(tripsDone, 50)) / 10;
	tripLength = reduceNumByPercent(tripLength, boost);

	const quantity = Math.floor(calcMaxTripLength(user, 'FishingTrawler') / tripLength);
	const duration = quantity * tripLength;

	await addSubTaskToActivityTask<MinigameActivityTaskOptions>({
		userID: user.id,
		channelID: channelID.toString(),
		type: 'FishingTrawler',
		minigameID: 'fishing_trawler',
		quantity,
		duration
	});

	return `${user.minionName} is now doing ${quantity}x Fishing Trawler trips, it will take around ${formatDuration(
		duration
	)} to finish.\n\n**Boosts:** ${boost}% boost for experience`;
}
