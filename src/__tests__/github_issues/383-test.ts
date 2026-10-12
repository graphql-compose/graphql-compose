import { SchemaComposer } from '../..';
import type {
  ScalarTypeComposerAsObjectDefinition,
  ScalarTypeComposerDefinition,
} from '../../ScalarTypeComposer';

describe('github issue #383: ScalarTypeComposer*Definition type aliases are usable without type arguments', () => {
  it('accepts an object definition typed via ScalarTypeComposerAsObjectDefinition', () => {
    const dateDef: ScalarTypeComposerAsObjectDefinition = {
      name: 'Date',
      serialize: (value: any) => value.getTime(),
      parseValue: (value: any) => new Date(value),
    };

    const sc = new SchemaComposer();
    const tc = sc.createScalarTC(dateDef);
    expect(tc.getTypeName()).toBe('Date');
  });

  it('accepts a definition typed via ScalarTypeComposerDefinition', () => {
    const defs: ScalarTypeComposerDefinition[] = [
      'scalar ScalarFromSDL',
      {
        name: 'ScalarFromConfig',
        serialize: (value: any) => value,
      },
    ];

    const sc = new SchemaComposer();
    for (const def of defs) {
      const tc = sc.createScalarTC(def);
      expect(tc).toBeDefined();
    }
    expect(sc.getSTC('ScalarFromSDL').getTypeName()).toBe('ScalarFromSDL');
    expect(sc.getSTC('ScalarFromConfig').getTypeName()).toBe('ScalarFromConfig');
  });
});
