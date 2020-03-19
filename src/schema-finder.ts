import { ObjectSchema } from './schema';

export interface SchemaFinder<Id> {
    find(id: Id): Promise<ObjectSchema | undefined>;
    getSchemaOf(value: any): [ObjectSchema, Id] | undefined;
    isEqualId(lhs: Id, rhs: Id): boolean;
}