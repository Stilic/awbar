import type {
  Snowflake,
  APIUser,
  APIRole,
  APIChannelMention,
  APIAttachment,
  APIEmbed,
  APIReaction,
  MessageType,
  APIMessageActivity,
  APIApplication,
  APIMessageReference,
  MessageFlags,
  APIMessageInteraction,
  APIChannel,
  APIActionRowComponent,
  APIMessageActionRowComponent,
  APIStickerItem,
  APISticker,
  APIMessage,
} from '@spacebarchat/spacebar-api-types/v9';
import {action, computed, makeObservable, observable} from 'mobx';
import type Channel from './Channel';

export default class Message {
  id: Snowflake;
  channel_id: Snowflake;
  @observable content: string;
  private timestamp: string;
  @observable private edited_timestamp?: string;
  tts: boolean;
  mention_everyone: boolean;
  mentions: APIUser[];
  mention_roles: APIRole['id'][];
  mention_channels?: APIChannelMention[];
  @observable attachments: APIAttachment[];
  @observable embeds: APIEmbed[];
  @observable reactions?: APIReaction[];
  nonce?: string | number;
  @observable pinned: boolean;
  webhook_id?: Snowflake;
  type: MessageType;
  activity?: APIMessageActivity;
  application?: Partial<APIApplication>;
  application_id?: Snowflake;
  message_reference?: APIMessageReference;
  flags?: MessageFlags;
  referenced_message?: APIMessage;
  interaction?: APIMessageInteraction;
  thread?: APIChannel;
  @observable components?: APIActionRowComponent<APIMessageActionRowComponent>[];
  sticker_items?: APIStickerItem[];
  stickers?: APISticker[];
  position?: number;

  readonly channel: Channel;

  constructor(data: APIMessage, channel: Channel) {
    this.id = data.id;
    this.channel_id = data.channel_id;
    this.content = data.content;
    this.timestamp = data.timestamp;
    if (data.edited_timestamp) this.edited_timestamp = data.edited_timestamp;
    this.tts = data.tts;
    this.mention_everyone = data.mention_everyone;
    this.mentions = data.mentions; // TODO: user object?
    this.mention_roles = data.mention_roles;
    this.mention_channels = data.mention_channels;
    this.attachments = data.attachments;
    this.embeds = data.embeds;
    this.reactions = data.reactions;
    this.nonce = data.nonce;
    this.pinned = data.pinned;
    this.webhook_id = data.webhook_id;
    this.type = data.type;
    this.activity = data.activity;
    this.application = data.application;
    this.application_id = data.application_id;
    this.message_reference = data.message_reference;
    this.flags = data.flags;
    if (data.referenced_message) this.referenced_message = data.referenced_message;
    this.interaction = data.interaction;
    this.thread = data.thread;
    this.components = data.components;
    this.sticker_items = data.sticker_items;
    this.stickers = data.stickers;
    this.position = data.position;

    this.channel = channel;

    makeObservable(this);
  }

  @computed
  getCreationDate() {
    return new Date(this.timestamp);
  }

  @computed
  getEditedDate() {
    return this.edited_timestamp ? new Date(this.edited_timestamp) : null;
  }

  @action
  update(data: APIMessage) {
    Object.assign(this, data);
  }
}
