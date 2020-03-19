import { ObjectSchema } from './schema';
import { SchemaFinder } from './schema-finder';

class AliasingSchemaFinder implements SchemaFinder<AliasSchemaFinder.SerializedId> {
    public find(id: AliasSchemaFinder.SerializedId): Promise<ObjectSchema | undefined> {
        if (typeof id ==='string') {
            return Promise.resolve(this._namedSchemas[id]);
        } else if (!id.module) {
            return Promise.resolve((globalThis as any)[id.exportName][this._schemaIdSymbol]);
        } else {
            return import(id.module).then((module) => {
                return module[id.exportName][this._schemaIdSymbol];
            })
        }
    }

    public getSchemaOf(value: any): [ObjectSchema, string] | undefined {
        return value.constructor ?
            this.getSchemaOfConstructor(value.constructor) :
            undefined;
    }

    public getSchemaOfConstructor(constructor: any): [ObjectSchema, string] | undefined {
        if (!(this._schemaIdSymbol in constructor)) {
            return undefined;
        }
        const id = constructor[this._schemaIdSymbol] as string;
        return [this._namedSchemas[id], id];
    }

    public isEqualId(lhs: AliasSchemaFinder.SerializedId, rhs: AliasSchemaFinder.SerializedId) {
        if (typeof lhs === 'string' && typeof rhs === 'string') {
            return lhs === rhs;
        } else if (typeof lhs === 'object' && typeof rhs === 'object') {
            return lhs.exportName === rhs.exportName &&
                lhs.module === rhs.module;
        } else {
            return false;
        }
    }

    public register(constructor: any, schema: ObjectSchema, id: string) {
        constructor[this._schemaIdSymbol] = id;
        this._namedSchemas[id] = schema;
    }

    public registerAsModuleExport(constructor: any, schema: ObjectSchema, module: string, exportName: string) {
        constructor[this._schemaIdSymbol] = {
            module,
            exportName,
        } as AliasSchemaFinder.ModuleExportId;
    }

    private _namedSchemas: Record<string, ObjectSchema> = {};
    private _schemaIdSymbol = Symbol("Schema Id");
}

declare namespace AliasSchemaFinder {
    export type SerializedId = string | ModuleExportId;

    export interface ModuleExportId {
        /**
         * The module from which we can import the constructor.
         * If not specified, the `globalThis` is used.
         */
        ['module']?: string;

        /**
         * The export name of the constructor.
         */
        exportName: string;
    }
}

export { AliasingSchemaFinder as AliasSchemaFinder };