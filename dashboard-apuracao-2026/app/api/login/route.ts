import {NextResponse}from"next/server";
import {credentialsAreValid,SESSION_COOKIE,sessionToken}from"@/lib/session";

export async function POST(request:Request){
 try{
  const body:unknown=await request.json();
  const values=body!==null&&typeof body==="object"?body as Record<string,unknown>:{};
  const username=String(values.username||"").trim(),password=String(values.password||"");
  if(!await credentialsAreValid(username,password))return NextResponse.json({error:"Login ou senha incorretos."},{status:401});
  const response=NextResponse.json({ok:true});
  response.cookies.set(SESSION_COOKIE,await sessionToken(),{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*12});
  return response;
 }catch{return NextResponse.json({error:"Não foi possível entrar."},{status:400})}
}
