import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

export class MessageProvider {
  private static instance: MessageProvider;
  private messages: Record<string, unknown> = {};

  private constructor() {
    const candidates = [
      path.resolve(__dirname, '../../messages.xml'),
      path.resolve(__dirname, '../messages.xml'),
      path.resolve(process.cwd(), 'messages.xml'),
    ];

    const xmlPath = candidates.find((p) => fs.existsSync(p));

    if (!xmlPath) {
      throw new Error(`messages.xml not found. Searched in: ${candidates.join(', ')}`);
    }

    this.loadXml(xmlPath);
  }

  private loadXml(filePath: string) {
    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const parser = new XMLParser();
    this.messages = parser.parse(xmlData).messages;
  }

  public static getInstance(): MessageProvider {
    if (!MessageProvider.instance) {
      MessageProvider.instance = new MessageProvider();
    }
    return MessageProvider.instance;
  }

  /**
   * Retrieves a message from the XML and replaces {0}, {1}, etc. with provided arguments.
   * e.g. getMessage('metrics.accountAge', 10, 30)
   */
  public getMessage(keyPath: string, ...args: unknown[]): string {
    const keys = keyPath.split('.');
    let result: unknown = this.messages;

    for (const key of keys) {
      if (result && typeof result === 'object' && result !== null && key in result) {
        result = (result as Record<string, unknown>)[key];
      } else {
        return `Missing message for key: ${keyPath}`;
      }
    }

    if (typeof result !== 'string') {
      return `Message for key: ${keyPath} is not a string`;
    }

    let formattedString = String(result).replace(/\\n/g, '\n');

    args.forEach((arg, index) => {
      formattedString = formattedString.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg));
    });

    return formattedString;
  }
}
