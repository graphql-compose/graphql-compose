import { SchemaComposer } from '../index';
import { TypeComposer } from '../TypeComposer';

interface Person {
    uid: string;
    name: string;
    nickName: string;
    age: number;
}

interface Context {
    req: any;
    res: any;
    uid: string;
}

// works for cases where u create your instance of
const schemaComposer = new SchemaComposer<Context>();

// Person from this schemaComposer gets the context defined for that schemaComposer
const Person = schemaComposer.getOrCreateTC<Person>('Person');

// create from default schemaComposer uses the context type passed in
// or uses `any` as type
const PersonTC = TypeComposer.create<Person, Context>({
    name: 'Person',
    fields: {
        name: 'String',
        nickName: 'String',
        age: 'Int'
    }
});

PersonTC.addResolver({
    resolve: ({ source, context }) => {
        // check availability
        if (source && context) {
            source.age = 2;
            source.name = 'XYZ';
            if (context.uid !== source.uid) {
                // do something if not the current user ...
            }
        }
    }
});

// Changes a driven by the quest for better typing and a better Intelisense experience
// hence boosting productivity
// It passes linting
