import { articleDocument, htmlResponse, notFoundDocument, publishedPosts } from '../_lib.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function onRequest(context) {
  const slug = String(context.params.slug || '');
  if (!SLUG.test(slug) || slug.length > 80) return htmlResponse(notFoundDocument(), 404);
  const { posts } = await publishedPosts(`&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const post = posts[0];
  if (!post) return htmlResponse(notFoundDocument(), 404);
  return htmlResponse(articleDocument(post));
}
