import TypeStorage from './typeStorage';
import TypeComposer from './typeComposer';
import InputTypeComposer from './inputTypeComposer';
import { GraphQLSchema } from './graphql';

export class GQCClass extends TypeStorage<TypeComposer | InputTypeComposer> {
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

declare const GQC: GQCClass;

export default GQC;
