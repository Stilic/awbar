import type {Snowflake} from '@spacebarchat/spacebar-api-types/globals';

export interface APILoginResponseMFARequired {
  token: null;
  mfa: true;
  sms: boolean;
  webauthn?: string;
  ticket: string;
}

export type APIRecaptchaErrorCodes =
  | 'missing-input-secret'
  | 'invalid-input-secret'
  | 'missing-input-response'
  | 'invalid-input-response'
  | 'bad-request'
  | 'timeout-or-duplicate';
export type APIHCaptchaErrorCodes =
  | 'missing-input-secret'
  | 'invalid-input-secret'
  | 'missing-input-response'
  | 'invalid-input-response'
  | 'bad-request'
  | 'invalid-or-already-seen-response'
  | 'not-using-dummy-passcode'
  | 'sitekey-secret-mismatch';

export interface APILoginResponseCaptchaRequiredRecaptcha {
  captcha_key: ['captcha-required' & APIRecaptchaErrorCodes];
  captcha_sitekey: string;
  captcha_service: 'recaptcha';
}

export interface APILoginResponseCaptchaRequiredHCaptcha {
  captcha_key: ['captcha-required' & APIHCaptchaErrorCodes];
  captcha_sitekey: string;
  captcha_service: 'hcaptcha';
}

export type APIResponseCaptchaRequired =
  | APILoginResponseCaptchaRequiredRecaptcha
  | APILoginResponseCaptchaRequiredHCaptcha;

export interface APILoginResponseSuccess {
  token: string;
  settings: {
    locale: string;
    theme: string;
  };
}

export interface APIError {
  code: number;
  message: string;
  errors?: {
    [key: string]: {
      _errors: {
        code: string;
        message: string;
      }[];
    };
  };
}

export type APILoginResponse = APILoginResponseSuccess | APILoginResponseMFARequired;

export type APILoginResponseError =
  | APILoginResponseMFARequired
  | APIResponseCaptchaRequired
  | APIError;

export interface APILoginRequest {
  login: string;
  password: string;
  undelete?: boolean;
  captcha_key?: string;
  login_source?: string;
  gift_code_sku_id?: string;
}

export interface APIRegisterRequest {
  username: string;
  password?: string;
  consent: boolean;
  email?: string;
  fingerprint?: string;
  invite?: string;
  date_of_birth?: string;
  gift_code_sku_id?: string;
  captcha_key?: string;
  promotional_email_opt_in?: boolean;
}

export type APIRegisterResponseError = APIResponseCaptchaRequired | APIError;

export interface APITOTPRequest {
  code: string;
  ticket: string;
  gift_code_sku_id?: string | null;
  login_source?: string | null;
}

export interface APIPasswordResetRequest {
  login: string;
  captcha_key?: string;
}

export enum APIErrorCodes {
  ACCOUNT_DELETED = 20011,
  ACCOUNT_DISABLED = 20013,
}

export interface APIInstancePolicies {
  instanceName: string;
  instanceDescription: string | null;
  frontPage: string | null;
  tosPage: string | null;
  correspondenceEmail: string | null;
  correspondenceUserID: string | null;
  image: string | null;
  instanceId: Snowflake;
  autoCreateBotUsers: boolean;
}

export interface APIDomainsPolicies {
  cdn: string;
  gateway: string;
  defaultApiVersion: string;
  apiEndpoint: string;
}
