import { SchemaFinder } from './schema-finder';
import { Serialized, MayBeSharedValue, SerializedValue, valueTypeSymbol, ValueType, SerializedObject, SerializedReference, SerializedArray, SerializedWildObject } from './persistent-data';
import { version } from '.';
import { isPrimitive } from './utils';
import { ObjectSchema } from './schema';
import { encode } from './message-pack-encoding';

async function serialize (value: any, options: serialize.Options): Promise<Uint8Array> {
    const {
        schemaFinder,
    } = options;

    const sharedObjects: MayBeSharedValue[] = [];
    const schemaIds: any[] = [];
    const deserializeMap = new Map<object, number>();
    const root = serializeValue(value);

    const serialized: Serialized = {
        version: version,
        sharedObjects,
        schemas: schemaIds,
        root,
    };

    const encoded = encode(serialized);
    return encoded;

    function serializeValue(value: any): SerializedValue {
        let v = value;
        if (options.before) {
            v = options.before(v);
        }
        return serializeValueStandard(v);
    }

    function serializeValueStandard(value: any): SerializedValue {
        if (isPrimitive(value)) {
            return value;
        } else if (Array.isArray(value)) {
            return serializeArray(value);
        } else if (typeof value === 'object') {
            return serializeJsObject(value);
        }
    }

    /**
     * Serialize a object value as either a object or a reference.
     * @param value The value to serialize.
     */
    function serializeJsObject(value: any): SerializedObject | SerializedReference | SerializedWildObject {
        const schemaInfo = schemaFinder.getSchemaOf(value);
        if (!schemaInfo) {
            return serializeJsObjectNoSchema(value);
        }

        const [schema, schemaId] = schemaInfo;

        if (schema.valueType) {
            return serializeObjectInPlace(value, schema, schemaId);
        }

        let referenceIndex = deserializeMap.get(value);
        if (referenceIndex === undefined) {
            const data = serializeObjectInPlace(value, schema, schemaId);
            referenceIndex = sharedObjects.length;
            sharedObjects.push(data);
            deserializeMap.set(value, referenceIndex);
        }
        return {
            [valueTypeSymbol]: ValueType.reference,
            index: referenceIndex,
        };
    }

    /**
     * Do serialize a object value as a object.
     * @param value 
     * @param schema 
     * @param schemaId 
     */
    function serializeObjectInPlace(value: any, schema: ObjectSchema, schemaId: any) {
        const properties: SerializedObject['properties'] = {};
        for (let iPropertySchema = 0; iPropertySchema < schema.properties.length; ++iPropertySchema) {
            const propertySchema = schema.properties[iPropertySchema];
            if (propertySchema.optional && !(propertySchema.name in value)) {
                continue;
            }
            const property = value[propertySchema.name];
            const serializedProperty = serializeValue(property);
            properties[propertySchema.name] = serializedProperty;
        }

        const data: SerializedObject = {
            [valueTypeSymbol]: ValueType.object,
            schema: referenceSchema(schemaId),
            properties,
        };

        if (schema.constructArguments) {
            data.constructorArguments = schema.constructArguments(value).map((arg) => serializeValue(arg));
        }
        return data;
    }

    function serializeArray(value: any[]): SerializedArray {
        return {
            [valueTypeSymbol]: ValueType.array,
            elements: value.map((element) => serializeValue(element)),
        }
    }

    function serializeJsObjectNoSchema(value: any): SerializedWildObject {
        return {
            [valueTypeSymbol]: ValueType.wildObject,
        };
    }

    function referenceSchema(schemaId: any): number {
        let index = schemaIds.findIndex((lhs) => schemaFinder.isEqualId(lhs, schemaId));
        if (index < 0) {
            index = schemaIds.length;
            schemaIds.push(schemaId);
        }
        return index;
    }

    function throwError(message: string): never {
        throw new Error(message);
    }
}

namespace serialize {
    export interface Options {
        schemaFinder: SchemaFinder<any>;
        before?: (value: any) => any;
    }
}

export { serialize };