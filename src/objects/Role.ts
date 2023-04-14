import type {APIRole, APIRoleTags} from '@puyodead1/fosscord-api-types/v9';
import type Guild from './Guild';
import {action, computed, observable} from 'mobx';

export default class Role {
  id: string;
  @observable name: string;
  @observable color: number;
  @observable hoist: boolean;
  @observable icon?: string;
  @observable unicode_emoji?: string;
  @observable position: number;
  @observable permissions: string;
  managed: boolean;
  @observable mentionable: boolean;
  @observable tags?: APIRoleTags;

  readonly guild: Guild;

  constructor(data: APIRole, guild: Guild) {
    this.id = data.id;
    this.name = data.name;
    this.color = data.color;
    this.hoist = data.hoist;
    if (data.icon) this.icon = data.icon;
    if (data.unicode_emoji) this.unicode_emoji = data.unicode_emoji;
    this.position = data.position;
    this.permissions = data.permissions;
    this.managed = data.managed;
    this.mentionable = data.mentionable;
    this.tags = data.tags;

    this.guild = guild;
  }

  @action
  update(data: APIRole) {
    Object.assign(this, data);
  }

  @computed
  getHexaColor() {
    return `#${this.color.toString(16).padStart(6, '0')}`;
  }
}
