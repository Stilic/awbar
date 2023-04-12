import type { APIUser, Snowflake, UserFlags, UserPremiumType } from 'discord-api-types/v9';

export class User {
	// TODO: make this an actual type
	// public readonly domain: string;

	public id: Snowflake;
	public username: string;
	public discriminator: string;
	public avatar: string | undefined;
	public bot: boolean = false;
	public system: boolean = false;
	public mfa_enabled: boolean = false;
	public banner: string | undefined;
	public accent_color: number | undefined;
	public locale: string | undefined;
	public verified: boolean = false;
	public email: string | undefined;
	public flags: UserFlags | undefined;
	public premium_type: UserPremiumType | undefined;
	public public_flags: UserFlags | undefined;

	constructor(user: APIUser) {
		this.id = user.id;
		this.username = user.username;
		this.discriminator = user.discriminator;
		if (user.avatar) this.avatar = user.avatar;
		if (user.bot) this.bot = user.bot;
		if (user.system) this.system = user.system;
		if (user.mfa_enabled) this.mfa_enabled = user.mfa_enabled;
		if (user.banner) this.banner = user.banner;
		if (user.accent_color) this.accent_color = user.accent_color;
		this.locale = user.locale;
		if (user.verified) this.verified = user.verified;
		if (user.email) this.email = user.email;
		this.flags = user.flags;
		this.premium_type = user.premium_type;
		this.public_flags = user.public_flags;
	}
}
