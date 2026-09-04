import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/localDb";
import { buildSamlAuthorizeUrl, getSamlBaseUrl, isSamlConfigured } from "@/lib/auth/saml.js";
import { shouldUseSecureCookie } from "@/lib/auth/dashboardSession";

export async function GET(request) {
  const settings = await getSettings();
  const origin = getSamlBaseUrl(request, settings);
  try {
    if (!isSamlConfigured(settings)) {
      return NextResponse.redirect(new URL("/dashboard/login?error=saml_not_configured", origin));
    }

    const { url: samlLoginUrl, requestId } = await buildSamlAuthnRequest(request, settings);

    const cookieStore = await cookies();
    cookieStore.set("saml_state", requestId, {
      httpOnly: true,
      secure: shouldUseSecureCookie(request),
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    });

    return NextResponse.redirect(samlLoginUrl);
    } catch (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/login?error=${encodeURIComponent(error.message || "saml_start_failed")}`, origin)
    );
    }
}
