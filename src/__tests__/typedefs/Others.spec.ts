import { Post, schemaComposerWithContext } from './mock-typedefs';

// getOTC from TypeStorage
const Post = schemaComposerWithContext.getOTC<Post>('Post');
