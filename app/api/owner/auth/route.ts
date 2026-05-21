import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const ownerSecret = process.env.OWNER_SECRET;

    if (!ownerSecret) {
      console.error("OWNER_SECRET environment variable is missing.");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    if (password === ownerSecret) {
      const cookieStore = await cookies();
      cookieStore.set("owner_session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
