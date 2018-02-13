import { GraphQLSchema, GraphQLNamedType } from './graphql';
import { TypeComposer } from './TypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { EnumTypeComposer } from './EnumTypeComposer';
import { Resolver } from './Resolver';

export class SchemaComposer extends TypeStorage<TypeComposer | InputTypeComposer | GraphQLNamedType> {
    public TypeMapper: TypeMapper;
    public TypeComposer: typeof TypeComposer;
    public InputTypeComposer: typeof InputTypeComposer;
    public EnumTypeComposer: typeof EnumTypeComposer;
    public Resolver: typeof Resolver;

    public constructor();

    public getOrCreateTC(typeName: string): TypeComposer;

    public getOrCreateITC(typeName: string): InputTypeComposer;

    public getTC(typeName: string): TypeComposer;

    public getITC(typeName: string): InputTypeComposer;

    public rootQuery(): TypeComposer;

    public rootMutation(): TypeComposer;

    public rootSubscription(): TypeComposer;

    public buildSchema(): GraphQLSchema;

    public removeEmptyTypes(typeComposer: TypeComposer, passedTypes: Set<string>): void;
}
