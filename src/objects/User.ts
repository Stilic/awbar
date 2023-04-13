import type {
  APIUser,
  Snowflake,
  UserFlags,
  UserPremiumType,
} from '@puyodead1/fosscord-api-types/v9';
import {computed, observable} from 'mobx';
import type Instance from './Instance';

export default class User {
  public id: Snowflake;
  @observable public username: string;
  @observable public discriminator: string;
  @observable public avatar?: string;
  @observable public bot: boolean = false;
  @observable public bio?: string;
  @observable public pronouns?: string;
  @observable public system: boolean = false;
  @observable public mfaEnabled: boolean = false;
  @observable public banner?: string;
  @observable public accentColor?: number;
  @observable public themeColor?: number;
  @observable public locale?: string;
  @observable public verified: boolean = false;
  @observable public email?: string;
  @observable public flags?: UserFlags;
  @observable public premiumType?: UserPremiumType;
  public readonly premiumSince?: string;
  @observable public publicFlags?: UserFlags;

  @computed
  public get tag(): string {
    return `${this.username}#${this.discriminator}`;
  }

  public readonly instance: Instance;

  constructor(data: APIUser, instance: Instance) {
    this.id = data.id;
    this.username = data.username;
    this.discriminator = data.discriminator;
    if (data.avatar) this.avatar = data.avatar;
    if (data.bot) this.bot = data.bot;
    this.bio = data.bio;
    if (data.system) this.system = data.system;
    if (data.mfa_enabled) this.mfaEnabled = data.mfa_enabled;
    if (data.banner) this.banner = data.banner;
    if (data.accent_color) this.accentColor = data.accent_color;
    this.themeColor = data.theme_colors;
    this.locale = data.locale;
    if (data.verified) this.verified = data.verified;
    if (data.email) this.email = data.email;
    this.flags = data.flags;
    this.premiumType = data.premium_type;
    this.premiumSince = data.premium_since;
    this.publicFlags = data.public_flags;

    this.instance = instance;
  }
}
