import { NextResponse } from "next/server";import { cookies } from "next/headers";
export async function GET(){const jar=await cookies();const token=process.env.SESSION_TOKEN||"painel-comite-sergio-aguiar-2026";const ok=jar.get("painel_session")?.value===token;return NextResponse.json({ok},{status:ok?200:401});}
