import type {
  APIUser,
  Snowflake,
  UserFlags,
  UserPremiumType,
} from '@puyodead1/fosscord-api-types/v9';
import {computed, observable} from 'mobx';
import type Instance from './Instance';

export default class User {
  id: Snowflake;
  @observable username: string;
  @observable discriminator: string;
  @observable avatar?: string;
  @observable bot: boolean = false;
  @observable bio?: string;
  @observable pronouns?: string;
  @observable system: boolean = false;
  @observable mfa_enabled: boolean = false;
  @observable banner?: string;
  @observable accent_color?: number;
  @observable theme_color?: number;
  @observable locale?: string;
  @observable verified: boolean = false;
  @observable email?: string;
  @observable flags?: UserFlags;
  @observable premium_type?: UserPremiumType;
  readonly premium_since?: string;
  @observable public_flags?: UserFlags;

  @computed
  get tag(): string {
    return `${this.username}#${this.discriminator}`;
  }

  @computed
  get instanceTag(): string {
    return `${this.tag}@${this.instance.domain}`;
  }

  readonly instance: Instance;

  constructor(data: APIUser, instance: Instance) {
    this.id = data.id;
    this.username = data.username;
    this.discriminator = data.discriminator;
    if (data.avatar) this.avatar = data.avatar;
    if (data.bot) this.bot = data.bot;
    this.bio = data.bio;
    if (data.system) this.system = data.system;
    if (data.mfa_enabled) this.mfa_enabled = data.mfa_enabled;
    if (data.banner) this.banner = data.banner;
    if (data.accent_color) this.accent_color = data.accent_color;
    this.theme_color = data.theme_colors;
    this.locale = data.locale;
    if (data.verified) this.verified = data.verified;
    if (data.email) this.email = data.email;
    this.flags = data.flags;
    this.premium_type = data.premium_type;
    this.premium_since = data.premium_since;
    this.public_flags = data.public_flags;

    this.instance = instance;
  }
}
