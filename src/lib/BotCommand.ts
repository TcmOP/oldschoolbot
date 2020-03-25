import { Command, CommandOptions, CommandStore, KlasaMessage, util } from 'klasa';

export abstract class BotCommand extends Command {
	public altProtection: boolean;
	public guildOnly: boolean;
	public oneAtTime: boolean;
	public perkTier?: number;

	public constructor(
		store: CommandStore,
		file: string[],
		directory: string,
		options: BotCommandOptions = {}
	) {
		super(
			store,
			file,
			directory,
			util.mergeDefault({ altProtection: false, oneAtTime: false, guildOnly: false }, options)
		);
		this.altProtection = options.altProtection!;
		this.oneAtTime = options.oneAtTime!;
		this.guildOnly = options.guildOnly!;
		this.perkTier = options.perkTier;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public run(message: KlasaMessage, _params: any[]): any {
		return message;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public inhibit(_message: KlasaMessage): Promise<boolean> | boolean {
		return false;
	}
}

export interface BotCommandOptions extends CommandOptions {
	altProtection?: boolean;
	oneAtTime?: boolean;
	guildOnly?: boolean;
	perkTier?: number;
}
