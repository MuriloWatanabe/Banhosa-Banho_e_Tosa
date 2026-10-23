import { NextRequest, NextResponse } from 'next/server';

// Mesmo nome usado em src/services/api.ts (AUTH_COOKIE_NAME). Não importamos
// de lá porque aquele módulo depende de next/headers, que não roda no proxy.
const AUTH_COOKIE = 'banhosa_token';

// Rotas que exigem login. Qualquer caminho fora desta lista (ex.: /login) fica liberado.
const PROTECTED_PREFIXES = ['/dashboard', '/agendamentos', '/pets', '/tutores', '/profissionais'];

// No Next.js 16 o antigo middleware.ts passou a se chamar proxy.ts.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // O proxy só confere se o cookie do JWT existe (não valida a assinatura
  // aqui). A validação de verdade acontece a cada chamada à API FastAPI,
  // que rejeita token inválido ou expirado com 401 — nesse caso a Server
  // Action correspondente retorna o erro e a tela trata normalmente.
  const isAuthenticated = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/agendamentos/:path*',
    '/pets/:path*',
    '/tutores/:path*',
    '/profissionais/:path*',
  ],
};
