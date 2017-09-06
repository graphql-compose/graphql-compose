import { GraphQLSchema } from './graphql';
import Resolver from './resolver';
import TypeComposer from './typeComposer';

export default class ComposeStorage {
    public types: { [typeName: string]: TypeComposer };

    public constructor();

    public has(typeName: string): boolean;

    public add(typeComposer: TypeComposer): void;

    public clear(): void;

    public get(typeName: string): TypeComposer;

    public rootQuery(): TypeComposer;

    public rootMutation(): TypeComposer;

    public rootSubscription(): TypeComposer;

    public resolvers(typeName: string): Map<string, Resolver<any, any>>;

    public resolver(typeName: string, resolverName: string): Resolver<any, any> | null;

    public buildSchema(): GraphQLSchema;

    /**
     * @deprecated 3.0.0
     */
    public buildRelations(): this;

    public removeEmptyTypes(typeComposer: TypeComposer, passedTypes: Set<string>): void;
}
