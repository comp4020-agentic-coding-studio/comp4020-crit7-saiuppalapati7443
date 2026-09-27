import type { APIRoute } from "astro";
import { IDENTITY_COOKIE, normalizeAnuId } from "../../lib/identity";

// Sets the ANU ID cookie the rest of the app reads to scope "your jobs".
// No password, no signature — see src/lib/identity.ts for the limits.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const id = normalizeAnuId(String(form.get("anu_id") ?? ""));
  if (!id) {
    return new Response("That doesn't look like an ANU ID — try the shape u1234567.", {
      status: 400,
    });
  }
  cookies.set(IDENTITY_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax" });
  return redirect("/", 303);
};
