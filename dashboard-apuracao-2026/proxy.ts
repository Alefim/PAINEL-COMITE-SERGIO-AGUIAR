import {NextRequest,NextResponse}from"next/server";
import {SESSION_COOKIE,sessionToken}from"./lib/session";

export async function proxy(request:NextRequest){
 const expected=await sessionToken();
 const authenticated=Boolean(expected)&&request.cookies.get(SESSION_COOKIE)?.value===expected;
 const pathname=request.nextUrl.pathname;
 if(pathname==="/login")return authenticated?NextResponse.redirect(new URL("/",request.url)):NextResponse.next();
 if(authenticated)return NextResponse.next();
 if(pathname.startsWith("/api/"))return NextResponse.json({error:"Não autorizado"},{status:401});
 return NextResponse.redirect(new URL("/login",request.url));
}

export const config={matcher:["/","/login","/api/dashboard/:path*","/api/tse/:path*"]};
