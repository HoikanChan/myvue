let logger: any[] = [];
export function log(l: any) {
    logger.push(l)
}
export function clearLog() {
    logger = [];
}
export function getLog() {
    return logger;
}