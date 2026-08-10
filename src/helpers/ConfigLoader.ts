import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { TriageConfig } from '../triage-engine/types';

export class ConfigLoader {
  static load(filePath: string): TriageConfig {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found at ${filePath}`);
    }

    const fileContents = fs.readFileSync(filePath, 'utf8');
    const config = yaml.load(fileContents) as TriageConfig;

    return config;
  }
}
