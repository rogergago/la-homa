import { publishedPosts, sitemap } from './_lib.js';

export async function onRequest() {
  const { posts } = await publishedPosts();
  return new Response(sitemap(posts.map(post => ({ slug: post.slug }))), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  });
}
