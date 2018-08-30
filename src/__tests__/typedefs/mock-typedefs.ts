import { SchemaComposer } from '../../index';

// Changes a driven by the quest for better typing and a better Intelisense experience
// hence boosting productivity
// The following passed tsCheck

export interface DeepOptions {
  deep1: string;
  deep2: number;
}

export interface GenericUID {
  uid: string;
}

export interface Person extends GenericUID {
  uid: string;
  name: string;
  nickName: string;
  age: number;
  deep: DeepOptions;
}

export interface Post {
  title: string;
  author: string;
  body: string;
  timestamp: number;
}

export interface Art {
  id: number;
  personId: string;
}

export interface Context {
  req: any;
  res: any;
  uid: string;
}

// works for cases where u create your instance of
export const schemaComposerWithContext = new SchemaComposer<Context>();
