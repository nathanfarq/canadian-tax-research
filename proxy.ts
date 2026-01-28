import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabase, response } = await createClient(request);

  // Refresh session if expired - required for Server Components
  // This keeps auth tokens valid without redirecting guests
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
