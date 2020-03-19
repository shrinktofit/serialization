

export function isPrimitive(value: any): value is number | string | boolean | undefined | null | bigint {
    return value === null ?
        true:
        typeof value !== 'object' && typeof value !== 'function';
}