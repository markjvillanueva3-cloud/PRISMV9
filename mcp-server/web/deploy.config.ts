/**
 * Deployment Configuration — PRISM Web
 * S4-MS1 P0-U05: Deployment Configuration
 *
 * Environment-specific settings for different deployment targets.
 */

export type Environment = 'development' | 'staging' | 'production';

export interface DeploymentConfig {
  /** Environment name */
  environment: Environment;
  /** API base URL */
  apiBaseUrl: string;
  /** WebSocket URL */
  wsUrl: string;
  /** Enable debug mode */
  debug: boolean;
  /** Enable performance monitoring */
  performanceMonitoring: boolean;
  /** Enable error tracking */
  errorTracking: boolean;
  /** Analytics ID (if applicable) */
  analyticsId?: string;
  /** Feature flags */
  features: {
    /** Enable experimental features */
    experimental: boolean;
    /** Enable beta features */
    beta: boolean;
    /** Enable offline mode */
    offlineMode: boolean;
    /** Enable service worker */
    serviceWorker: boolean;
  };
  /** Cache configuration */
  cache: {
    /** Static asset cache duration (seconds) */
    staticAssets: number;
    /** API response cache duration (seconds) */
    apiResponses: number;
    /** Enable stale-while-revalidate */
    staleWhileRevalidate: boolean;
  };
  /** Security settings */
  security: {
    /** Content Security Policy */
    csp: string;
    /** Enable HTTPS redirect */
    httpsRedirect: boolean;
    /** HSTS max age (seconds) */
    hstsMaxAge: number;
  };
}

const baseConfig: Omit<DeploymentConfig, 'environment' | 'apiBaseUrl' | 'wsUrl'> = {
  debug: false,
  performanceMonitoring: true,
  errorTracking: true,
  features: {
    experimental: false,
    beta: false,
    offlineMode: true,
    serviceWorker: true,
  },
  cache: {
    staticAssets: 31536000, // 1 year
    apiResponses: 300, // 5 minutes
    staleWhileRevalidate: true,
  },
  security: {
    csp: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' wss: ws:;",
    httpsRedirect: true,
    hstsMaxAge: 31536000,
  },
};

export const configs: Record<Environment, DeploymentConfig> = {
  development: {
    ...baseConfig,
    environment: 'development',
    apiBaseUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000',
    debug: true,
    performanceMonitoring: false,
    errorTracking: false,
    features: {
      ...baseConfig.features,
      experimental: true,
      beta: true,
      serviceWorker: false, // Disable in dev for easier debugging
    },
    cache: {
      ...baseConfig.cache,
      staticAssets: 0,
      apiResponses: 0,
    },
    security: {
      ...baseConfig.security,
      httpsRedirect: false,
    },
  },

  staging: {
    ...baseConfig,
    environment: 'staging',
    apiBaseUrl: 'https://staging-api.prism.jmdie.com',
    wsUrl: 'wss://staging-api.prism.jmdie.com',
    debug: true,
    features: {
      ...baseConfig.features,
      beta: true,
    },
  },

  production: {
    ...baseConfig,
    environment: 'production',
    apiBaseUrl: 'https://api.prism.jmdie.com',
    wsUrl: 'wss://api.prism.jmdie.com',
    analyticsId: 'PRISM-PROD',
  },
};

/**
 * Get configuration for current environment
 */
export function getConfig(): DeploymentConfig {
  const env = (import.meta.env.MODE || 'development') as Environment;
  return configs[env] || configs.development;
}

/**
 * Get specific feature flag
 */
export function isFeatureEnabled(feature: keyof DeploymentConfig['features']): boolean {
  return getConfig().features[feature];
}

/**
 * Get API URL with optional path
 */
export function getApiUrl(path: string = ''): string {
  const { apiBaseUrl } = getConfig();
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Get WebSocket URL with optional path
 */
export function getWsUrl(path: string = ''): string {
  const { wsUrl } = getConfig();
  return `${wsUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export default getConfig;
