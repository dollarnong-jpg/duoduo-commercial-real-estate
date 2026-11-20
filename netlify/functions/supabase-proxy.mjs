const UPSTREAM = 'https://hqsrjxcujjqqekyvqrvy.supabase.co';
const ALLOWED_ORIGIN = 'https://dollarnong-jpg.github.io';
const ALLOWED_PATHS = ['/auth/v1/', '/rest/v1/', '/storage/v1/'];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type,accept,prefer,x-client-info,x-supabase-api-version',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export default async (request) => {
  const origin = request.headers.get('origin') || '';
  if (origin && origin !== ALLOWED_ORIGIN && !origin.startsWith('http://localhost:')) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
    });
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const requestUrl = new URL(request.url);
  const upstreamPath = requestUrl.pathname.replace(/^\/api\/cloud/, '') || '/';
  if (!ALLOWED_PATHS.some(prefix => upstreamPath.startsWith(prefix))) {
    return new Response(JSON.stringify({ error: 'Path not allowed' }), {
      status: 404,
      headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
    });
  }

  const headers = new Headers(request.headers);
  for (const name of ['host', 'origin', 'referer', 'connection', 'content-length', 'accept-encoding']) {
    headers.delete(name);
  }
  for (const name of [...headers.keys()]) {
    if (name.startsWith('cf-') || name.startsWith('x-forwarded-') || name.startsWith('x-nf-')) headers.delete(name);
  }
  headers.set('accept', headers.get('accept') || 'application/json');

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
  const upstream = await fetch(`${UPSTREAM}${upstreamPath}${requestUrl.search}`, {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  responseHeaders.set('cache-control', 'no-store');
  for (const [name, value] of Object.entries(corsHeaders(origin))) responseHeaders.set(name, value);
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
};
