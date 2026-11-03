import HandleBars from 'handlebars';
import {
  RenderedEmail,
  TemplateDataMap,
  TemplateName,
} from './email.service.ts';
import { readFileSync } from 'node:fs';

type TemplatePart = 'subject' | 'html' | 'text';
type CompiledTemplate = ReturnType<typeof HandleBars.compile>;

export class TemplateRenderer {
  private readonly cache = new Map<string, CompiledTemplate>();

  private load(name: TemplateName, part: TemplatePart): CompiledTemplate {
    const key = `${name}/${part}`;
    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    const fileUrl = new URL(`./templates/${name}/${part}.hbs`, import.meta.url);

    const source = readFileSync(fileUrl, 'utf8');

    const compiled = HandleBars.compile(source, {
      strict: true,
      noEscape: part !== 'html',
    });

    this.cache.set(key, compiled);

    return compiled;
  }

  render<T extends TemplateName>(
    name: T,
    data: TemplateDataMap[T],
  ): RenderedEmail {
    return {
      subject: this.load(name, 'subject')(data).trim(),
      html: this.load(name, 'html')(data),
      text: this.load(name, 'text')(data),
    };
  }
}
