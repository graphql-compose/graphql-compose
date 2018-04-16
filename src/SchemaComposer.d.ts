import { GraphQLSchema, GraphQLNamedType } from './graphql';
import { TypeComposer } from './TypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { EnumTypeComposer } from './EnumTypeComposer';
import { Resolver } from './Resolver';

export class SchemaComposer<TContext> extends TypeStorage<TContext> {
    public TypeMapper: TypeMapper;
    public TypeComposer: typeof TypeComposer;
    public InputTypeComposer: typeof InputTypeComposer;
    public EnumTypeComposer: typeof EnumTypeComposer;
    public Resolver: typeof Resolver;

    public constructor();

    public getOrCreateTC(typeName: string): TypeComposer<TContext>;

    public getOrCreateITC(typeName: string): InputTypeComposer;

    public getTC(typeName: string): TypeComposer<TContext>;

    public getITC(typeName: string): InputTypeComposer;

    public rootQuery(): TypeComposer<TContext>;

    public rootMutation(): TypeComposer<TContext>;

    public rootSubscription(): TypeComposer<TContext>;

    public buildSchema(): GraphQLSchema;

    public removeEmptyTypes(typeComposer: TypeComposer<TContext>, passedTypes: Set<string>): void;
}
