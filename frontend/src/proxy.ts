import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export const proxy = createMiddleware(routing);

export const config = {
  // Match all pathnames except for static files & api
  matcher: ['/', '/(vi|en|zh|ja)/:path*', '/((?!_next|_vercel|.*\\..*).*)']
};
