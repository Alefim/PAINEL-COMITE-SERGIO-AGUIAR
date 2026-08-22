import { NextResponse } from "next/server";import { cookies } from "next/headers";
export async function GET(){const jar=await cookies();const ok=!!process.env.SESSION_TOKEN&&jar.get("painel_session")?.value===process.env.SESSION_TOKEN;return NextResponse.json({ok},{status:ok?200:401});}
