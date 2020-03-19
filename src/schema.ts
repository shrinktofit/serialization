
export interface ObjectSchema {
    /**
     * The function used to construct the object.
     */
    construct: new (...args: any[]) => any;

    /**
     * Whether the `constructor` should be called with `new` syntax.
     * @default false
     */
    constructWithoutNew?: boolean;

    /**
     * Gather the constructor arguments that used to construct the object when perform de-serialization.
     */
    constructArguments?: (object: any) => any[];

    /**
     * Property schemas.
     */
    properties: PropertySchema[];

    /**
     * Extending schema.
     */
    extends?: ObjectSchema;

    /**
     * Indicates that objects using this schema are not reference by more than one object.
     * It means that every usage of this object will create a brand new copy. 
     */
    valueType?: boolean;
}

export interface PropertySchema {
    /**
     * The property name.
     * Should be unique in `ObjectSchema.properties`.
     * The name will be used to identify the property and will be used to assign the property. 
     */
    name: string;

    /**
     * Whether the property is optional.
     */
    optional?: boolean;

    /**
     * The type of the schema.
     */
    type?: ArraySchema | ObjectSchema;

    /**
     * Define how to assign the deserialized property into target object.
     */
    assign?: (object: unknown, value: any) => void;
}

export interface ArraySchema {
    /**
     * Element schemas.
     */
    elements: PropertySchema | PropertySchema[];
}