/**
 * PRISM MCP Server - Alarm Decode Schema
 * Structured output schema for alarm decoding responses.
 * 
 * @module schemas/alarmDecodeSchema
 */

export const ALARM_DECODE_SCHEMA = {
  type: 'object' as const,
  properties: {
    controller: { type: 'string' as const, minLength: 1 },
    alarm_code: { type: 'string' as const, minLength: 1 },
    description: { type: 'string' as const, minLength: 1 },
    severity: {
      type: 'string' as const,
      enum: ['info', 'warning', 'error', 'critical'] as const,
    },
    resolution_steps: {
      type: 'array' as const,
      items: { type: 'string' as const },
    },
  },
  required: ['controller', 'alarm_code', 'description', 'severity'],
  additionalProperties: false,
} as const;

export interface AlarmDecodeResult {
  controller: string;
  alarm_code: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  resolution_steps?: string[];
}
