export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface TemplateDataMap {
  welcome: {
    name: string;
    appUrl: string;
  };
}

export type TemplateName = keyof TemplateDataMap;

export type SendEmailInput<T extends TemplateName = TemplateName> = {
  [K in T]: {
    template: K;
    to: string | string[];
    data: TemplateDataMap[K];
  };
}[T];

export interface EmailService {
  send<T extends TemplateName>(input: SendEmailInput<T>): Promise<void>;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}
