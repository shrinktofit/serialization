
export const valueTypeSymbol = Symbol('Serialization/Value type');

export enum ValueType {
    object,
    wildObject,
    array,
    reference,
}

export interface Serialized {
    /**
     * Serialization API version.
     */
    version: string;

    /**
     * The root value.
     */
    root: SerializedValue;

    /**
     * Objects.
     */
    sharedObjects: MayBeSharedValue[];

    /**
     * Schemas.
     */
    schemas: any[];
}

export interface SerializedReference {
    [valueTypeSymbol]: ValueType.reference;

    /**
     * The referenced value.
     */
    index: number;
}

export interface SerializedObject {
    [valueTypeSymbol]: ValueType.object;

    /**
     * The index to the schema array.
     */
    schema: number;

    /**
     * The arguments applied to the constructor.
     */
    constructorArguments?: SerializedValue[];

    /**
     * Serialized properties.
     */
    properties: Record<string, SerializedValue>;
}

export interface SerializedWildObject {
    [valueTypeSymbol]: ValueType.wildObject;
}

export interface SerializedArray {
    [valueTypeSymbol]: ValueType.array;

    /**
     * Serialized elements.
     */
    elements: SerializedValue[];
}

export type SerializedValue = number | string | boolean | null | undefined | bigint | SerializedObject | SerializedArray | SerializedWildObject | SerializedReference;

export type MayBeSharedValue = SerializedObject | SerializedArray | SerializedWildObject;
