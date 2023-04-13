import type {GatewayGuild, Snowflake} from '@puyodead1/fosscord-api-types/v9';
import {observable} from 'mobx';
import type Instance from './Instance';

export default class Guild {
  public id: Snowflake;
  public joinedAt: string;
  // @observable public threads: unknown[]; // TODO
  //   @observable public stickers: unknown[]; // TODO
  //   @observable public stageInstances: unknown[]; // TODO
  @observable public roles: RoleStore;
  @observable public memberCount: number;
  @observable public lazy: boolean;
  @observable public large: boolean;
  //   @observable public guildScheduledEvents: unknown[]; // TODO
  //   @observable public emojis: unknown[]; // TODO
  @observable public channels: ChannelStore;
  @observable public name: string;
  @observable public description?: string;
  @observable public icon?: string;
  @observable public splash?: string;
  @observable public banner?: string;
  @observable public features: string[];
  @observable public preferredLocale: string;
  @observable public ownerId: Snowflake;
  @observable public applicationId?: Snowflake;
  @observable public afkChannelId?: Snowflake;
  @observable public afkTimeout: number;
  @observable public systemChannelId?: Snowflake;
  @observable public verificationLevel: number;
  @observable public explicitContentFilter: number;
  @observable public defaultMessageNotifications: number;
  @observable public mfaLevel: number;
  @observable public vanityUrlCode?: string;
  @observable public premiumTier: number;
  //   @observable public premiumProgressBarEnabled: boolean; // TODO
  @observable public systemChannelFlags: number;
  @observable public discoverySplash?: string;
  @observable public rulesChannelId?: Snowflake;
  @observable public publicUpdatesChannelId?: Snowflake;
  @observable public maxVideoChannelUsers?: number;
  @observable public maxMembers?: number;
  @observable public nsfwLevel: number;
  @observable public hubType?: number;
  @observable public acronym: string;

  public readonly members: GuildMemberList;

  public readonly instance: Instance;

  constructor(data: GatewayGuild, instance: Instance) {
    this.id = data.id;
    this.joinedAt = data.joined_at;
    // this.threads = data.threads;
    // this.stickers = data.stickers;
    // this.stageInstances = data.stage_instances;
    this.memberCount = data.member_count;
    this.lazy = data.lazy;
    this.large = data.large;
    // this.guildScheduledEvents = data.guild_scheduled_events;
    // this.emojis = data.emojis;
    this.name = data.properties.name;
    if (data.properties.description) this.description = data.properties.description;
    if (data.properties.icon) this.icon = data.properties.icon;
    if (data.properties.splash) this.splash = data.properties.splash;
    if (data.properties.banner) this.banner = data.properties.banner;
    this.features = data.properties.features;
    this.preferredLocale = data.properties.preferred_locale;
    this.ownerId = data.properties.owner_id;
    if (data.properties.application_id) this.applicationId = data.properties.application_id;
    if (data.properties.afk_channel_id) this.afkChannelId = data.properties.afk_channel_id;
    this.afkTimeout = data.properties.afk_timeout;
    if (data.properties.system_channel_id) this.systemChannelId = data.properties.system_channel_id;
    this.verificationLevel = data.properties.verification_level;
    this.explicitContentFilter = data.properties.explicit_content_filter;
    this.defaultMessageNotifications = data.properties.default_message_notifications;
    this.mfaLevel = data.properties.mfa_level;
    if (data.properties.vanity_url_code) this.vanityUrlCode = data.properties.vanity_url_code;
    this.premiumTier = data.properties.premium_tier;
    this.systemChannelFlags = data.properties.system_channel_flags;
    if (data.properties.discovery_splash) this.discoverySplash = data.properties.discovery_splash;
    if (data.properties.rules_channel_id) this.rulesChannelId = data.properties.rules_channel_id;
    if (data.properties.public_updates_channel_id)
      this.publicUpdatesChannelId = data.properties.public_updates_channel_id;
    if (data.properties.max_video_channel_users)
      this.maxVideoChannelUsers = data.properties.max_video_channel_users;
    if (data.properties.max_members) this.maxMembers = data.properties.max_members;
    this.nsfwLevel = data.properties.nsfw_level;
    if (data.properties.hub_type) this.hubType = data.properties.hub_type;

    this.roles.addAll(data.roles);
    this.channels.addAll(data.channels);

    this.acronym = this.name
      .split(' ')
      .map(word => word.substring(0, 1))
      .join('');

    this.instance = instance;
  }
}

export class GuildMember {}

export class GuildMemberList {}
