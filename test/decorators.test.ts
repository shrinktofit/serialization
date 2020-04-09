
import {
    array,
    reconstruct,
    valueType,
    primitive,
    tuple,
    globalSchemaFinder,
} from '../dist/decorators';

import { serialize } from '../dist/serialize';
import { deserialize } from '../dist/deserialize';

const schemaFinder = globalSchemaFinder;

async function afterSerialize<T>(value: T, fx: (original: T, deserialized: T) => void) {
    const serialized = await serialize(value, {
        schemaFinder,
    });
    const deserialized = await deserialize(serialized, {
        schemaFinder,
    });
    fx(value, deserialized);
}

async function checkEqualityAfterSerialize<T>(value: T) {
    await afterSerialize(value, (original, deserialized) => {
        expect(deserialized).toEqual(value);
    }); 
}

test(`Decorator/Symbol property key`, async () => {
    expect(() => {
        const symbol = Symbol();
        class C {
            @primitive [symbol] = 0;
        }
    }).toThrow();
});

test('Decorator/reconstruct', async () => {
    /**
     * Illustrate the `reconstruct` decorator.
     * The `Animation.name` will be passed to constructor, which in this class in turns, initialize the property `name`.
     * So we no need to serialize `name` anymore.
     */
    @reconstruct((animal: Animal) => [animal.name])
    class Animal {
        constructor(public name: string) { this.name = name; }
    }

    await checkEqualityAfterSerialize(new Animal('Monica'));
});

test('Decorator/valueType', async () => {
    @valueType
    class Vec3 {
        @primitive
        public x: number;

        @primitive
        public y: number;

        @primitive
        public z: number;

        constructor(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
    }

    class UseValueTypeMultiTimes {
        @array(Vec3)
        public positions: Vec3[];

        constructor(positions: Vec3[]) { this.positions = positions; }
    }

    const position = new Vec3(Math.random(), Math.random(), Math.random());
    const useValueTypeMultiTimes = new UseValueTypeMultiTimes([position, position, position]);
    await afterSerialize(useValueTypeMultiTimes, (original, deserialized) => {
        const positionSet = new Set(deserialized.positions);
        expect(deserialized.positions.length).toEqual(positionSet.size);
    });
});

test('Decorator/primitive', async () => {
    class C {
        @primitive
        public s = '';

        @primitive
        public n = 0;

        @primitive
        public b = false;
    }

    await checkEqualityAfterSerialize((() => {
        const o = new C();
        o.s = 'PenApple';
        o.n = 3.1415926;
        o.b = true;
        return o;
    })());
});

test('Decorator/array', () => {
    class Component {
    }
    
    class Entity {
        @array(Component)
        public components: Component[] = [];
    }
});

test('Decorator/tuple', () => {
    class A {}
    class B {}
    class C {}
    class ABC {
        @tuple(A, B, C)
        public letters: [A, B, C];
    }
});

test('Callback', async () => {
    const uuidSymbol = Symbol();

    const assetLibrary = (() => {
        class UuidRef {
            @primitive
            uuid: string;
    
            static fromAsset(asset: Asset) {
                const ref = new UuidRef();
                ref.uuid = asset[uuidSymbol];
                return ref;
            }
    
            constructor() {
            }
        }

        class AssetLibrary {
            private _assets = new Map<string, Asset>();
            private _offlineAssets = new Map<string, Uint8Array>();

            public clearRuntime() {
                this._assets.clear();
            }

            public async load<T extends Asset>(uuid: string): Promise<T> {
                if (!this._assets.has(uuid)) {
                    const serialized = this._offlineAssets.get(uuid);
                    const postAssignments: Array<Promise<void>> = [];
                    const deserialized: T = await deserialize(serialized, {
                        schemaFinder,
                        afterPropertyDeserialized: (value: any, schemaOrIndex, target) => {
                            if (value instanceof UuidRef) {
                                postAssignments.push(this.load(value.uuid).then((asset) => {
                                    if (typeof schemaOrIndex === 'number') {
                                        target[schemaOrIndex] = asset;
                                    } else {
                                        deserialize.assignProperty(target, asset, schemaOrIndex);
                                    }
                                }));
                            } else {
                                return value;
                            }
                        },
                    });
                    await Promise.all(postAssignments);
                    this.add(deserialized);
                }
                return this._assets.get(uuid) as T;
            }

            public add(asset: Asset) {
                this._assets.set(asset[uuidSymbol], asset);
            }

            public allocateUuid () {
                return `${(Math.random() * 10000)}`;
            }

            public async serializeAll() {
                for (const [uuid, asset] of this._assets) {
                    const serialized = await serialize(texture, {
                        schemaFinder,
                        before: (value: any) => {
                            if (!(value instanceof Asset) || value === texture) {
                                return value;
                            } else {
                                return UuidRef.fromAsset(value);
                            }
                        },
                    });
                    this._offlineAssets.set(uuid, serialized);
                }
            }
        }
        return new AssetLibrary();
    })();

    class Asset {
        public [uuidSymbol] = assetLibrary.allocateUuid();
    }

    class ImageAsset extends Asset {
        source = 'blah blah';
    }

    class TextureAsset extends Asset {
        @primitive
        public image: ImageAsset | null = null;
    }

    const texture = new TextureAsset();
    const image = new ImageAsset();
    texture.image = image;

    assetLibrary.add(texture);
    assetLibrary.add(image);

    await assetLibrary.serializeAll();
    assetLibrary.clearRuntime();

    const loadedTexture = await assetLibrary.load<TextureAsset>(texture[uuidSymbol]);
    expect(loadedTexture.image.source).toBe(image.source);
})
