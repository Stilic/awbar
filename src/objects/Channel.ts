import type {Snowflake} from '@puyodead1/fosscord-api-types/globals';
import {
  type APIUser,
  type APIOverwrite,
  type APIInvite,
  type GatewayVoiceState,
  type APIReadState,
  type APIWebhook,
  type APIChannel,
  ChannelType,
  Routes,
  type RESTGetAPIChannelMessagesQuery,
  type RESTGetAPIChannelMessagesResult,
  type RESTPostAPIChannelMessageJSONBody,
  type RESTPostAPIChannelMessageResult,
  type APIMessage,
} from '@puyodead1/fosscord-api-types/v9';
import {action, makeObservable, observable, type IObservableArray, computed} from 'mobx';
import type Guild from './Guild';
import Message from './Message';
import type Instance from './Instance';

export default class Channel {
  id: Snowflake;
  private created_at: string;
  @observable name?: string;
  @observable icon?: string;
  type: number;
  @observable recipients?: APIUser[];
  @observable last_message_id?: Snowflake;
  guild_id?: Snowflake;
  @observable parent_id: Snowflake;
  owner_id?: Snowflake;
  @observable last_pin_timestamp?: number;
  @observable default_auto_archive_duration?: number;
  @observable position?: number;
  @observable permission_overwrites?: APIOverwrite[];
  @observable video_quality_mode?: number;
  @observable bitrate?: number;
  @observable user_limit?: number;
  @observable nsfw: boolean;
  @observable rate_limit_per_user?: number;
  @observable topic?: string;
  @observable invites?: APIInvite[];
  @observable retention_policy_id?: string;
  @observable voice_states?: GatewayVoiceState[];
  @observable read_states?: APIReadState[];
  @observable webhooks?: APIWebhook[];
  @observable flags: number;
  @observable default_thread_rate_limit_per_user: number;
  @observable channel_icon?: string;

  @observable private readonly messages: IObservableArray<Message> = observable.array();

  readonly instance: Instance;

  constructor(data: APIChannel, instance: Instance) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.name = data.name;
    if (data.icon) this.icon = data.icon;
    this.type = data.type;
    this.recipients = data.recipients;
    this.last_message_id = data.last_message_id;
    this.guild_id = data.guild_id;
    this.parent_id = data.parent_id;
    this.owner_id = data.owner_id;
    this.last_pin_timestamp = data.last_pin_timestamp;
    this.default_auto_archive_duration = data.default_auto_archive_duration;
    this.position = data.position;
    this.permission_overwrites = data.permission_overwrites;
    this.video_quality_mode = data.video_quality_mode;
    this.bitrate = data.bitrate;
    this.user_limit = data.user_limit;
    this.nsfw = data.nsfw;
    this.rate_limit_per_user = data.rate_limit_per_user;
    this.topic = data.topic;
    this.invites = data.invites;
    this.retention_policy_id = data.retention_policy_id;
    // this.messages =
    this.voice_states = data.voice_states;
    this.read_states = data.read_states;
    this.webhooks = data.webhooks;
    this.flags = data.flags;
    this.default_thread_rate_limit_per_user = data.default_thread_rate_limit_per_user;

    switch (this.type) {
      case ChannelType.GuildText:
        this.channel_icon = 'pound';
        break;
      case ChannelType.GuildVoice:
        this.channel_icon = 'volume-high';
        break;
      case ChannelType.GuildAnnouncement:
      case ChannelType.AnnouncementThread:
        this.channel_icon = 'bullhorn-variant';
        break;
      case ChannelType.GuildStore:
      case ChannelType.Transactional:
        this.channel_icon = 'tag';
        break;
      case ChannelType.Encrypted:
      case ChannelType.EncryptedThread:
        this.channel_icon = 'message-lock';
        break;
      case ChannelType.PublicThread:
      case ChannelType.PrivateThread:
        this.channel_icon = 'comment-text-multiple';
        break;
      case ChannelType.GuildStageVoice:
        this.channel_icon = 'broadcast';
        break;
      case ChannelType.GuildForum:
        this.channel_icon = 'forum';
        break;
      case ChannelType.TicketTracker:
        this.channel_icon = 'ticket-outline';
        break;
      case ChannelType.KanBan:
        this.channel_icon = 'developer-board';
        break;
      case ChannelType.VoicelessWhiteboard:
        this.channel_icon = 'draw';
        break;
      case ChannelType.GuildDirectory:
        this.channel_icon = 'folder';
        break;
    }

    this.instance = instance;

    makeObservable(this);
  }

  @action
  update(data: APIChannel) {
    Object.assign(this, data);
  }

  @computed
  getCreationDate() {
    return new Date(this.created_at);
  }

  @action
  async fetch(limit?: number, before?: Snowflake, after?: Snowflake, around?: Snowflake) {
    let opts: RESTGetAPIChannelMessagesQuery = {
      limit: limit || 50,
    };

    if (before) opts = {...opts, before};
    if (after) opts = {...opts, after};
    if (around) opts = {...opts, around};

    // TODO: catch errors
    const messages = await this.instance.rest.get<RESTGetAPIChannelMessagesResult>(
      Routes.channelMessages(this.id),
      opts,
    );
    for (const message of messages.filter(x => !this.has(x.id)).reverse()) this.add(message);
  }

  @action
  add(data: APIMessage) {
    this.messages.push(new Message(data, this));
  }

  @computed
  get(id: string) {
    return this.messages.find(message => message.id === id);
  }

  @computed
  getAll() {
    return this.messages
      .slice()
      .sort((a, b) => a.getCreationDate().getTime() - b.getCreationDate().getTime());
  }

  @computed
  has(id: string) {
    return this.messages.some(message => message.id === id);
  }

  @action
  remove(id: string) {
    const message = this.get(id);
    if (message) this.messages.remove(message);
  }

  @action
  async send(data: RESTPostAPIChannelMessageJSONBody) {
    // TODO: handle errors, highlight message as failed
    return this.instance.rest.post<
      RESTPostAPIChannelMessageJSONBody,
      RESTPostAPIChannelMessageResult
    >(Routes.channelMessages(this.id), data);
  }

  canSendMessage(content: string) {
    return content && content.trim() && content.replace(/\r?\n|\r/g, '');
  }
}
