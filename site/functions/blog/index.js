import { blogIndexDocument, htmlResponse, publishedPosts } from '../_lib.js';

export async function onRequest() {
  const { ok, posts } = await publishedPosts();
  return htmlResponse(blogIndexDocument(posts, ok));
}
