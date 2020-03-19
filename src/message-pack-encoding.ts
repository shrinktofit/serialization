

import { encode as msgPackEncode, decode as msgPackDecode, ExtensionCodec } from "@msgpack/msgpack";
import { ValueType, valueTypeSymbol, Serialized } from './persistent-data';

export const extension = new ExtensionCodec();

const extensionTypeMap: Array<[ValueType, number]> = [
    [ValueType.object, 0],
    [ValueType.array, 1],
    [ValueType.reference, 2],
];

for (const [valueType, typeBits] of extensionTypeMap) {
    extension.register({
        type: typeBits,
        encode: (object: unknown) => {
            if (typeof object === 'object' &&
                (object !== null) &&
                (valueTypeSymbol in object) &&
                ((object as any)[valueTypeSymbol]) === valueType) {
                // TODO: May be too hack??
                // @ts-ignore
                delete object[valueTypeSymbol];
                const data = msgPackEncode(object, {
                    extensionCodec: extension, // Pass myself
                });
                // @ts-ignore
                object[valueTypeSymbol] = valueType;
                return data;
            } else {
                return null;
            }
        },
        decode: (data: Uint8Array) => {
            const object = msgPackDecode(data, {
                extensionCodec: extension, // Pass myself
            }) as unknown;
            (object as any)[valueTypeSymbol] = valueType;
            return object;
        },
    });
}

export function encode(serialized: Serialized): Uint8Array {
    return msgPackEncode(serialized, {
        extensionCodec: extension,
    });
}

export function decode(data: ArrayBuffer | ArrayLike<number>): Serialized {
    return msgPackDecode(data, {
        extensionCodec: extension,
    }) as Serialized;
}