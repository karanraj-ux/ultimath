export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 验证请求携带的 Supabase JWT，返回 user_id（已登录用户）或 null（匿名 anon token）。
 * 如果 token 完全缺失或无效，返回 { error: Response }，调用方应直接 return。
 */
export function extractUserId(req: Request): { userId: string | null } | { error: Response } {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  try {
    const token = authHeader.slice(7);
    // JWT payload is base64url — decode without verifying signature
    // (Supabase validates the signature at the platform level before the function runs)
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('malformed jwt');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // 'sub' is present for authenticated users; anon JWTs have role='anon' and no sub
    const userId: string | null = payload?.sub ?? null;
    return { userId };
  } catch {
    return {
      error: new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }
}

export function ok(data: unknown): Response {
  return new Response(JSON.stringify({ code: 'SUCCESS', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export function fail(msg: string, code = 400): Response {
  return new Response(JSON.stringify({ code: 'FAIL', message: msg }), {
    status: code,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
