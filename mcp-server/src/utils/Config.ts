/**
 * PRISM Config
 * ============
 * Configuration management for MCP server
 */

import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from "../constants.js";

export interface ConfigOptions {
  dataPath: string;
  userDataPath: string;
  learnedDataPath: string;
  skillsPath: string;
  scriptsPath: string;
  apiKey?: string;
  logLevel: string;
  safetyThreshold: number;
  qualityThreshold: number;
}

const defaultConfig: ConfigOptions = {
  dataPath: PATHS.EXTRACTED_DIR,
  userDataPath: path.join(PATHS.DATA_DIR, 'user'),
  learnedDataPath: path.join(PATHS.DATA_DIR, 'learned'),
  skillsPath: PATHS.SKILLS,
  scriptsPath: PATHS.SCRIPTS,
  logLevel: 'info',
  safetyThreshold: 0.70,
  qualityThreshold: 0.70,
};

export class Config {
  private static instance: Config;
  private config: ConfigOptions;

  private constructor() {
    this.config = { ...defaultConfig };
    this.loadConfig();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  static get<K extends keyof ConfigOptions>(key: K, defaultValue?: ConfigOptions[K]): ConfigOptions[K] {
    const instance = Config.getInstance();
    return instance.config[key] ?? defaultValue ?? defaultConfig[key];
  }

  static set<K extends keyof ConfigOptions>(key: K, value: ConfigOptions[K]): void {
    const instance = Config.getInstance();
    instance.config[key] = value;
  }

  static getAll(): ConfigOptions {
    return { ...Config.getInstance().config };
  }

  private loadConfig(): void {
    // Load from environment variables
    if (process.env.PRISM_DATA_PATH) {
      this.config.dataPath = process.env.PRISM_DATA_PATH;
    }
    if (process.env.PRISM_USER_DATA_PATH) {
      this.config.userDataPath = process.env.PRISM_USER_DATA_PATH;
    }
    if (process.env.PRISM_LEARNED_DATA_PATH) {
      this.config.learnedDataPath = process.env.PRISM_LEARNED_DATA_PATH;
    }
    if (process.env.PRISM_SKILLS_PATH) {
      this.config.skillsPath = process.env.PRISM_SKILLS_PATH;
    }
    if (process.env.PRISM_SCRIPTS_PATH) {
      this.config.scriptsPath = process.env.PRISM_SCRIPTS_PATH;
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.config.apiKey = process.env.ANTHROPIC_API_KEY;
    }
    if (process.env.PRISM_LOG_LEVEL) {
      this.config.logLevel = process.env.PRISM_LOG_LEVEL;
    }
    if (process.env.PRISM_SAFETY_THRESHOLD) {
      this.config.safetyThreshold = parseFloat(process.env.PRISM_SAFETY_THRESHOLD);
    }
    if (process.env.PRISM_QUALITY_THRESHOLD) {
      this.config.qualityThreshold = parseFloat(process.env.PRISM_QUALITY_THRESHOLD);
    }

    // Try to load from config file
    const configPath = path.join(process.cwd(), 'prism-config.json');
    try {
      if (fs.existsSync(configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.config = { ...this.config, ...fileConfig };
      }
    } catch (error) {
      // Ignore config file errors
    }
  }
}

export default Config;
