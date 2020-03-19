
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
