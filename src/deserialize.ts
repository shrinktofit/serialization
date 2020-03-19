
import { Serialized, SerializedObject, SerializedValue, valueTypeSymbol, ValueType, SerializedArray, SerializedReference, SerializedWildObject } from './persistent-data';
import { ObjectSchema } from './schema';
import { SchemaFinder } from './schema-finder';
import { isPrimitive } from './utils';
import { decode } from './message-pack-encoding';

async function deserialize (persistentStorage: ArrayBuffer, options: deserialize.Options) {
    const {
        schemaFinder,
    } = options;

    let persistentData: Serialized;
    try {
        persistentData = decode(persistentStorage) as Serialized;
    } catch (err) {
        throw err;
    }

    // Retrieve all schemas.
    const objectSchemas = await Promise.all(persistentData.schemas.map(async (schemaId) => {
        const schema = await schemaFinder.find(schemaId);
        if (!schema) {
            throwError(`Failed to find schema.`);
        } else {
            return schema;
        }
    }));

    const sharedObjectDeserializeStates: Array<{
        object: any;
        complete: boolean;
    }> = new Array(persistentData.sharedObjects.length);

    // The entry point.
    return deserializeValue(persistentData.root);

    /**
     * Deserialize a value.
     * @param value The serialized value.
     */
    function deserializeValue(value: SerializedValue) {
        if (isPrimitive(value)) {
            return value;
        } else if (valueTypeSymbol in value) {
            const valueType = value[valueTypeSymbol];
            switch (valueType) {
                case ValueType.object:
                    return deserializeNonSharedObject(value as SerializedObject);
                case ValueType.wildObject:
                    return deserializeWildObject(value as SerializedWildObject);
                case ValueType.array:
                    return deserializeArray(value as SerializedArray);
                case ValueType.reference:
                    return deserializeReference(value as SerializedReference);
            }
        }

        throwError(`Don't know how to deserialize value ${value}`);
    }

    /**
     * Deserialize an object value.
     * @param object The serialized object value.
     */
    function deserializeNonSharedObject(object: SerializedObject) {
        const schema = objectSchemas[object.schema];
        const result = constructObject(object, schema);
        deserializeObjectInto(result, object, schema);
        return result;
    }

    /**
     * Deserialize an array value.
     * @param object The serialized array value.
     */
    function deserializeArray(array: SerializedArray) {
        const result = constructArray(array);
        deserializeArrayInto(result, array);
        return result;
    }

    function deserializeWildObject(value: SerializedWildObject) {
        const result = constructWildObject(value);
        deserializeWildObjectInto(result, value);
        return result;
    }

    function constructObject(object: SerializedObject, schema: ObjectSchema) {
        let result: any;
        if (!object.constructorArguments) {
            result = schema.constructWithoutNew ?
                schema.construct.apply(undefined) :
                new schema.construct();
        } else {
            const appliedArguments = object.constructorArguments.map((x) => deserializeValue(x));
            result = schema.constructWithoutNew ?
                schema.construct.apply(undefined, appliedArguments):
                new schema.construct(...appliedArguments);
        }
        return result;
    }

    function constructArray(array: SerializedArray) {
        return new Array(array.elements.length);
    }

    function constructWildObject(object: SerializedWildObject) {
        return {};
    }

    /**
     * Deserialize an object value, the target object has been created.
     * @param target Target object.
     * @param schema Schema.
     */
    function deserializeObjectInto(target: unknown, source: SerializedObject, schema: ObjectSchema) {
        // Assign properties.
        for (let iPropertySchema = 0; iPropertySchema < schema.properties.length; ++iPropertySchema) {
            const propertySchema = schema.properties[iPropertySchema];

            if (!(propertySchema.name in source.properties)) {
                if (!propertySchema.optional) {
                    throwError(`${propertySchema.name} is required but missed in deserialized data.`);
                }
                continue;
            }

            const serializedProperty = source.properties[propertySchema.name];

            const deserializedProperty = deserializeValue(serializedProperty);
            if (!propertySchema.assign) {
                (target as any)[propertySchema.name] = deserializedProperty;
            } else {
                propertySchema.assign(target, deserializedProperty);
            }
        }

        if (schema.extends) {
            deserializeObjectInto(target, source, schema.extends);
        }
    }

    function deserializeArrayInto(target: any[], source: SerializedArray) {
        for (let iElement = 0; iElement < target.length; ++iElement) {
            target[iElement] = deserializeValue(source.elements[iElement]);
        }
    }

    function deserializeWildObjectInto(target: any, source: SerializedWildObject) {

    }

    function deserializeReference(reference: SerializedReference) {
        let state = sharedObjectDeserializeStates[reference.index];
        if (state === undefined) {
            // If the object has not been deserialized, we start it for now.
            // We first construct and then assign properties.
            const serialized = persistentData.sharedObjects[reference.index];
            if (serialized[valueTypeSymbol] === ValueType.object) {
                const serializedObject = serialized as SerializedObject;
                const schema = objectSchemas[serializedObject.schema];
                state = {
                    object: constructObject(serializedObject, schema),
                    complete: false,
                };
                deserializeObjectInto(state.object, serializedObject, schema);
            } else if (serialized[valueTypeSymbol] === ValueType.wildObject) {
                const serializedArray = serialized as SerializedArray;
                state = {
                    object: constructArray(serializedArray),
                    complete: false,
                };
                deserializeArrayInto(state.object, serializedArray);
            } else {
                const serializedWildObject = serialized as SerializedWildObject;
                state = {
                    object: constructWildObject(serializedWildObject),
                    complete: false,
                };
                deserializeWildObjectInto(state.object, serializedWildObject);
            }
            state.complete = true;
        }
        return state.object;
    }

    function throwError(message: string): never {
        throw new Error(message);
    }
}

namespace deserialize {
    export interface Options {
        schemaFinder: SchemaFinder<any>;
    }
}

export { deserialize };
