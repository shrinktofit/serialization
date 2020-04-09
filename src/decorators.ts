import { AliasSchemaFinder } from './aliasing-schema-finder'
import { ObjectSchema, PropertySchema } from './schema';

export const globalSchemaFinder = new AliasSchemaFinder();

export const reconstruct = <TFunction extends new (...args: any) => any>(getArguments: (value: TFunction) => ConstructorParameters<TFunction>) => {
    return withObjectSchema((objectSchema) => {
        objectSchema.constructArguments = getArguments;
    });
};

export const serializable = withPropertySchema((propertySchema) => {
    
});

/**
 * Mark the schema as value type.
 */
export const valueType = withObjectSchema((objectSchema) => {
    objectSchema.valueType = true;
});

export const primitive = withPropertySchema((propertySchema) => {
    
});

export const array = (element: Function) => {
    return withPropertySchema((propertySchema) => {
    
    });
};

export const tuple = (...elements: Array<Function>) => {
    return withPropertySchema((propertySchema) => {
    
    });
};

function withObjectSchema(callback: <TFunction extends Function>(schema: ObjectSchema) => TFunction | void): ClassDecorator {
    return <TFunction extends Function>(target: TFunction): TFunction | void => {
        const schema = getOrCreateObjectSchema(target);
        return callback(schema);
    };
}

function withPropertySchema(callback: (propertySchema: PropertySchema) => ReturnType<PropertyDecorator>): PropertyDecorator {
    return (target, propertyKey) => {
        prohibitNonStringPropertyKey(propertyKey);
        const schema = getOrCreatePropertySchema(getOrCreateObjectSchema(target.constructor), propertyKey);
        return callback(schema);
    };
}

function prohibitNonStringPropertyKey(propertyKey: string | symbol): asserts propertyKey is string {
    if (typeof propertyKey === 'symbol') {
        throw new Error(`Serialization property must not be symbol.`);
    }
}

function getOrCreateObjectSchema(constructor: any) {
    const schemaInfo = globalSchemaFinder.getSchemaOfConstructor(constructor);
    let schema: ObjectSchema | undefined;
    if (schemaInfo) {
        schema = schemaInfo[0];
    }
    if (!schema) {
        schema = {
            construct: constructor,
            properties: [],
            // TODO: extends
        };
        globalSchemaFinder.register(constructor, schema, constructor.name);
    }
    return schema;
}

function getOrCreatePropertySchema(objectSchema: ObjectSchema, propertyName: string) {
    let propertySchema = objectSchema.properties.find((schema) => schema.name === propertyName);
    if (!propertySchema) {
        propertySchema = {
            name: propertyName,
        };
        objectSchema.properties.push(propertySchema);
    }
    return propertySchema;
}