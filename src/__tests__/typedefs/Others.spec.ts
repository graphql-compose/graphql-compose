import { Post, schemaComposerWithContext } from './mock-typedefs';

// getTC from TypeStorage
const Post = schemaComposerWithContext.getTC<Post>('Post');
