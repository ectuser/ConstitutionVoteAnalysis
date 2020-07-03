import * as colorLog from 'color-log';

export function createLogger(context?: string): any {
    const prefix = `[${context}]`;
    const realLogger = {
        info: (...msg) => {
            colorLog.info(prefix, ...msg);
        },
        warn: (...msg) => {
            colorLog.warn(prefix, ...msg);
        },
        error: (...msg) => {
            colorLog.error(prefix, ...msg);
        },
        mark: (...msg) => {
            colorLog.mark(prefix, ...msg);
        },
        single: (...msg) => {
            colorLog.single(prefix, ...msg);
        },
        debug: null,
    };
    realLogger.debug = realLogger.mark;

    return realLogger;
}

export default createLogger('worker');