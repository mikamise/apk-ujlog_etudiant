import { sanitizeLogMetadata } from './request-context';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  message: string;
  metadata?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    code?: string;
    stack?: string;
  };
}

class StructuredLogger {
  private minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');

  private levelWeights: Record<LogLevel, number> = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelWeights[level] >= this.levelWeights[this.minLevel];
  }

  private formatEntry(entry: Omit<StructuredLogEntry, 'timestamp'>): StructuredLogEntry {
    const isProd = process.env.NODE_ENV === 'production';
    
    // In production, sanitize stack trace from error object
    let safeError = entry.error;
    if (safeError && isProd) {
      safeError = {
        name: safeError.name,
        message: safeError.message,
        code: safeError.code,
      };
    }

    return {
      timestamp: new Date().toISOString(),
      ...entry,
      metadata: entry.metadata ? sanitizeLogMetadata(entry.metadata) : undefined,
      error: safeError,
    };
  }

  private writeLog(entry: StructuredLogEntry): void {
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      console.log(JSON.stringify(entry));
    } else {
      const colorMap: Record<LogLevel, string> = {
        DEBUG: '🔍 [DEBUG]',
        INFO: 'ℹ️ [INFO]',
        WARN: '⚠️ [WARN]',
        ERROR: '❌ [ERROR]',
      };
      const header = `${colorMap[entry.level]} ${entry.route ? `${entry.method || 'GET'} ${entry.route}` : ''} (${entry.requestId || 'no-req-id'})`;
      console.log(`${header} - ${entry.message}`, entry.metadata || '', entry.error || '');
    }
  }

  public debug(message: string, context?: Partial<Omit<StructuredLogEntry, 'timestamp' | 'level' | 'message'>>): void {
    if (!this.shouldLog('DEBUG')) return;
    this.writeLog(this.formatEntry({ level: 'DEBUG', message, ...context }));
  }

  public info(message: string, context?: Partial<Omit<StructuredLogEntry, 'timestamp' | 'level' | 'message'>>): void {
    if (!this.shouldLog('INFO')) return;
    this.writeLog(this.formatEntry({ level: 'INFO', message, ...context }));
  }

  public warn(message: string, context?: Partial<Omit<StructuredLogEntry, 'timestamp' | 'level' | 'message'>>): void {
    if (!this.shouldLog('WARN')) return;
    this.writeLog(this.formatEntry({ level: 'WARN', message, ...context }));
  }

  public error(message: string, error?: unknown, context?: Partial<Omit<StructuredLogEntry, 'timestamp' | 'level' | 'message' | 'error'>>): void {
    if (!this.shouldLog('ERROR')) return;

    let errorObj: StructuredLogEntry['error'] = undefined;
    if (error instanceof Error) {
      errorObj = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    } else if (typeof error === 'string') {
      errorObj = { message: error };
    }

    this.writeLog(this.formatEntry({ level: 'ERROR', message, error: errorObj, ...context }));
  }
}

export const logger = new StructuredLogger();
