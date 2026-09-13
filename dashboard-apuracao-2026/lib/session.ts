export const SESSION_COOKIE="painel_session";

const encoder=new TextEncoder();

export async function sessionToken(){
 const username=process.env.AUTH_USERNAME;
 const secret=process.env.AUTH_SESSION_SECRET;
 if(!username||!secret)return "";
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signature=await crypto.subtle.sign("HMAC",key,encoder.encode(username));
 return Array.from(new Uint8Array(signature),byte=>byte.toString(16).padStart(2,"0")).join("");
}

export async function credentialsAreValid(username:string,password:string){
 const configuredUser=process.env.AUTH_USERNAME||"";
 const configuredPassword=process.env.AUTH_PASSWORD||"";
 if(!configuredUser||!configuredPassword)return false;
 const [received,expected]=await Promise.all([
  crypto.subtle.digest("SHA-256",encoder.encode(`${username}\u0000${password}`)),
  crypto.subtle.digest("SHA-256",encoder.encode(`${configuredUser}\u0000${configuredPassword}`))
 ]);
 const a=new Uint8Array(received),b=new Uint8Array(expected);
 let difference=a.length^b.length;
 for(let index=0;index<Math.min(a.length,b.length);index++)difference|=a[index]^b[index];
 return difference===0;
}
