import type {APIMessage, Snowflake} from '@spacebarchat/spacebar-api-types/v9';
import {action, makeObservable, observable} from 'mobx';

import type {IObservableArray} from 'mobx';
import type User from './objects/User';

export enum QueuedMessageStatus {
  SENDING = 'sending',
  FAILED = 'failed',
}

export type QueuedMessageData = {
  id: string;
  channel: string;
  author: User;
  content: string;
};

export interface QueuedMessage {
  id: string;
  status: QueuedMessageStatus;
  error?: string;
  channel: string;
  author: User;
  content: string;
  timestamp: Date;
}

export default class MessageQueue {
  @observable private readonly _messages: IObservableArray<QueuedMessage> = observable.array();

  constructor() {
    makeObservable(this);
  }

  @action
  add(data: QueuedMessageData) {
    const queuedMessage = {
      ...data,
      timestamp: new Date(),
      status: QueuedMessageStatus.SENDING,
    };
    this._messages.push(queuedMessage);
    return queuedMessage;
  }

  @action
  remove(id: string) {
    const message = this._messages.find(x => x.id === id);
    if (message) return this._messages.remove(message);
    else return false;
  }

  @action
  send(id: string) {
    const message = this._messages.find(x => x.id === id)!;
    if (message) message.status = QueuedMessageStatus.SENDING;
  }

  @action
  error(id: string, error: string) {
    const message = this._messages.find(x => x.id === id)!;
    if (message) {
      message.error = error;
      message.status = QueuedMessageStatus.FAILED;
    }
  }

  get(channel: Snowflake) {
    return this._messages.filter(message => message.channel === channel);
  }

  @action
  handleIncomingMessage(message: APIMessage) {
    if (!message.nonce) {
      return;
    }
    if (!this.get(message.channel_id).find(x => x.id === message.nonce)) {
      return;
    }

    this.remove(message.nonce.toString());
  }
}
