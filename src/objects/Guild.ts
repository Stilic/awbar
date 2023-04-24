import {
  GatewayGuildMemberListUpdateOperation,
  type APIGuildMember,
  type APIUser,
  type GatewayGuild,
  type GatewayGuildMemberListUpdateDispatchData,
  type GatewayGuildMemberListUpdateGroup,
  type GuildMemberFlags,
  type Snowflake,
  type APIGuild,
  type APIRole,
  type APIChannel,
} from '@spacebarchat/spacebar-api-types/v9';
import {ObservableMap, action, computed, makeObservable, observable} from 'mobx';
import type Instance from './Instance';
import Role from './Role';
import Channel from './Channel';
import type User from './User';

export default class Guild {
  id: Snowflake;
  joined_at: string;
  // @observable threads: unknown[]; // TODO
  //   @observable stickers: unknown[]; // TODO
  //   @observable stageInstances: unknown[]; // TODO
  @observable lazy: boolean;
  @observable large: boolean;
  //   @observable guildScheduledEvents: unknown[]; // TODO
  //   @observable emojis: unknown[]; // TODO
  @observable name: string;
  @observable description?: string;
  @observable icon?: string;
  @observable splash?: string;
  @observable banner?: string;
  @observable features: string[];
  @observable preferred_locale: string;
  @observable owner_id: Snowflake;
  @observable application_id?: Snowflake;
  @observable afk_channel_id?: Snowflake;
  @observable afk_timeout: number;
  @observable system_channel_id?: Snowflake;
  @observable verification_level: number;
  @observable explicit_content_filter: number;
  @observable default_message_notifications: number;
  @observable mfa_level: number;
  @observable vanity_url_code?: string;
  @observable premium_tier: number;
  //   @observable premium_progress_bar_enabled: boolean; // TODO
  @observable system_channel_flags: number;
  @observable discovery_splash?: string;
  @observable rules_channel_id?: Snowflake;
  @observable public_updates_channel_id?: Snowflake;
  @observable max_video_channel_users?: number;
  @observable max_members?: number;
  @observable nsfw_level: number;
  @observable hub_type?: number;

  @observable readonly channels: ObservableMap<Snowflake, Channel>;
  @observable readonly members: ObservableMap<Snowflake, GuildMember>;
  @observable readonly roles: ObservableMap<Snowflake, Role>;

  @observable readonly memberList: GuildMemberList;

  readonly instance: Instance;

  @computed
  get acronym(): string {
    return this.name
      .split(' ')
      .map(word => word.substring(0, 1))
      .join('');
  }

  constructor(data: GatewayGuild, instance: Instance) {
    this.id = data.id;
    this.joined_at = data.joined_at;
    // this.threads = data.threads;
    // this.stickers = data.stickers;
    // this.stageInstances = data.stage_instances;
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
    this.preferred_locale = data.properties.preferred_locale;
    this.owner_id = data.properties.owner_id;
    if (data.properties.application_id) this.application_id = data.properties.application_id;
    if (data.properties.afk_channel_id) this.afk_channel_id = data.properties.afk_channel_id;
    this.afk_timeout = data.properties.afk_timeout;
    if (data.properties.system_channel_id)
      this.system_channel_id = data.properties.system_channel_id;
    this.verification_level = data.properties.verification_level;
    this.explicit_content_filter = data.properties.explicit_content_filter;
    this.default_message_notifications = data.properties.default_message_notifications;
    this.mfa_level = data.properties.mfa_level;
    if (data.properties.vanity_url_code) this.vanity_url_code = data.properties.vanity_url_code;
    this.premium_tier = data.properties.premium_tier;
    this.system_channel_flags = data.properties.system_channel_flags;
    if (data.properties.discovery_splash) this.discovery_splash = data.properties.discovery_splash;
    if (data.properties.rules_channel_id) this.rules_channel_id = data.properties.rules_channel_id;
    if (data.properties.public_updates_channel_id)
      this.public_updates_channel_id = data.properties.public_updates_channel_id;
    if (data.properties.max_video_channel_users)
      this.max_video_channel_users = data.properties.max_video_channel_users;
    if (data.properties.max_members) this.max_members = data.properties.max_members;
    this.nsfw_level = data.properties.nsfw_level;
    if (data.properties.hub_type) this.hub_type = data.properties.hub_type;

    this.channels = new ObservableMap<Snowflake, Channel>();
    this.members = new ObservableMap<Snowflake, GuildMember>();
    this.roles = new ObservableMap<Snowflake, Role>();

    data.channels.forEach(channel => this.addChannel(channel));
    data.members.forEach(member => this.addMember(member));
    data.roles.forEach(role => this.addRole(role));

    this.memberList = new GuildMemberList(this);

    this.instance = instance;
  }

  @action
  update(data: APIGuild | GatewayGuild) {
    if ('properties' in data) {
      Object.assign(this, {...data, ...data.properties});
      return;
    }

    Object.assign(this, data);
  }

  @action
  addChannel(data: APIChannel) {
    if (!this.channels.has(data.id)) this.channels.set(data.id, new Channel(data, this.instance));
  }

  @action
  addRole(data: APIRole) {
    if (!this.roles.has(data.id)) this.roles.set(data.id, new Role(data, this));
  }

  @action
  addMember(data: APIGuildMember) {
    if (!data.user) throw 'Member does not have a valid user property';
    if (!this.members.has(data.user.id))
      this.members.set(data.user.id, new GuildMember(data, this));
  }

  @action
  updateChannel(data: APIChannel) {
    this.channels.get(data.id)?.update(data);
  }

  @action
  updateRole(data: APIRole) {
    this.roles.get(data.id)?.update(data);
  }

  @action
  updateMember(data: APIGuildMember) {
    if (!data.user) throw 'Member does not have a valid user property';
    this.members.get(data.user.id)?.update(data);
  }
}

export class GuildMember {
  @observable user?: User;
  @observable nick?: string | null;
  @observable avatar?: string | null;
  @observable roles: Role[];
  @observable joined_at: string;
  @observable premium_since?: string | null;
  @observable deaf: boolean;
  @observable mute: boolean;
  @observable flags: GuildMemberFlags;
  @observable pending?: boolean;
  @observable communication_disabled_until?: string | null;

  readonly guild: Guild;

  constructor(data: APIGuildMember, guild: Guild) {
    this.user = guild.instance.users.get((data.user as APIUser).id);
    this.nick = data.nick;
    this.avatar = data.avatar;
    this.roles = data.roles.map(role => guild.roles.get(role)).filter(Boolean) as Role[];
    this.joined_at = data.joined_at;
    this.premium_since = data.premium_since;
    this.deaf = data.deaf;
    this.mute = data.mute;
    this.flags = data.flags;
    this.pending = data.pending;
    this.communication_disabled_until = data.communication_disabled_until;

    this.guild = guild;

    // if ('presence' in data) {
    //   // TODO:
    //   this.domain.presences.add(data.presence);
    // }

    makeObservable(this);
  }

  @action
  update(member: APIGuildMember) {
    Object.assign(this, member);

    // if ('presence' in member) {
    //   // TODO:
    //   this.domain.presences.add(member.presence);
    // }
  }
}

export class GuildMemberList {
  id?: string;
  @observable groups?: GatewayGuildMemberListUpdateGroup[];
  @observable onlineCount?: number;

  @observable list: (string | GuildMember)[] = [];

  readonly guild: Guild;

  constructor(guild: Guild) {
    this.guild = guild;

    makeObservable(this);
  }

  @action
  update(data: GatewayGuildMemberListUpdateDispatchData) {
    this.id = data.id;
    this.groups = data.groups;
    this.onlineCount = data.online_count;

    for (const i of data.ops) {
      switch (i.op) {
        case GatewayGuildMemberListUpdateOperation.SYNC:
          let listData: {
            title: string;
            data: {member: GuildMember; index: number}[];
          }[] = [];

          for (const item of i.items) {
            if ('group' in item) {
              const role = this.guild.roles.get(item.group.id);

              listData.push({
                title: `${(role?.name ?? item.group.id).toUpperCase()}`,
                data: [],
              });
            } else {
              // try to get the existing member
              if (item.member.user?.id) {
                const member = this.guild.members.get(item.member.user.id);
                if (member) {
                  listData[listData.length - 1].data.push({
                    member,
                    index: item.member.index,
                  });
                  return;
                }
              }
              listData[listData.length - 1].data.push({
                member: new GuildMember(item.member, this.guild),
                index: item.member.index,
              });
            }
          }

          // remove empty groups
          listData = listData.filter(i => i.data.length > 0);
          // add the number of members in each group to the group name
          listData = listData.map(i => ({
            ...i,
            title: `${i.title} - ${i.data.length}`,
          }));

          // hide offline group if it has more than 100 members
          listData = listData.filter(
            i => !(i.title.toLowerCase().startsWith('offline') && i.data.length >= 100),
          );

          // sort the list by the index
          // this.list = listData.flatMap(i => [
          //   i.title,
          //   ...i.data.sort((a, b) => a.index - b.index).map(i => i.member),
          // ]);

          this.list = listData.flatMap(i => [
            i.title,
            ...i.data
              .sort((a, b) => {
                const ua = a.member.user?.username;
                const ub = b.member.user?.username;
                if (ua && ub) {
                  return ua.toLowerCase() > ub.toLowerCase() ? 1 : -1;
                }

                return 0;
              })
              .map(i => i.member),
          ]);

          break;
        // case GatewayGuildMemberListUpdateOperation.DELETE:
        //   for (const item of items) {
        //     if ("group" in item) {
        //       this.logger.debug(
        //         `Delete group ${item.group.id} from ${this.id}`,
        //         i
        //       );
        //       //   this.listData.splice(range[0], 1);
        //     } else {
        //       //   this.listData[range[0]].data.splice(range[1], 1);
        //       this.logger.debug(
        //         `Delete member ${item.member.user.username} from ${this.id}`,
        //         i
        //       );
        //     }
        //   }
        // break;
        // case GatewayGuildMemberListUpdateOperation.UPDATE:
        //   for (const item of items) {
        //     if ("group" in item) {
        //       //   this.listData[range[0]].title = item.group.id;
        //       this.logger.debug(
        //         `Update group ${item.group.id} from ${this.id}`,
        //         i
        //       );
        //     } else {
        //       //   this.listData[range[0]].data[range[1]] = item.member;
        //       this.logger.debug(
        //         `Update member ${item.member.user.username} from ${this.id}`,
        //         i
        //       );
        //     }
        //   }
        // break;
        // case GatewayGuildMemberListUpdateOperation.INSERT:
        // if ('group' in item) {
        //   this.list.splice(index, 0, item.group.id);
        // } else {
        //   // try to get the existing member
        //   if (item.member.user?.id) {
        //     const member = this.guild.members.get(item.member.user.id);
        //     if (member) {
        //       this.list[index].data.push(member);
        //       return;
        //     }
        //   }

        //   this.list[index].data.splice(
        //     index,
        //     0,
        //     new GuildMember(this.domain, this.guild, item.member),
        //   );
        // }
        // break;
      }
    }
  }
}
