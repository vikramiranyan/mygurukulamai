import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const system = `You are the user's Personal AI Agent prototype. Focus on concrete outcomes, not vague advice. Tools: create_file(name,content) creates a downloadable source/documentation/test/config file; plan_task(steps) returns an actionable plan. You cannot browse the web, execute code, access the user's computer, deploy projects, or retain persistent server-side memory in this prototype. Never claim otherwise. For website requests, create useful complete HTML/CSS/JS files. Never create malware, credential theft, or destructive scripts. Never put API keys or secrets in generated files.`;
const tools = [
 {type:"function",function:{name:"create_file",description:"Create a downloadable code or text file",parameters:{type:"object",properties:{name:{type:"string"},content:{type:"string"}},required:["name","content"],additionalProperties:false}}},
 {type:"function",function:{name:"plan_task",description:"Return a practical ordered task plan",parameters:{type:"object",properties:{steps:{type:"array",items:{type:"string"}}},required:["steps"],additionalProperties:false}}}
];
export async function POST(req: NextRequest) {
 const key=process.env.OPENROUTER_API_KEY;
 if(!key) return NextResponse.json({error:"Deployment setup needed: add OPENROUTER_API_KEY in Vercel Project Settings → Environment Variables."},{status:503});
 try {
  const body=await req.json();
  if(!Array.isArray(body.messages)||!body.messages.length) return NextResponse.json({error:"Send a task first."},{status:400});
  const messages:any[]=[{role:"system",content:system},...body.messages.slice(-12).map((m:any)=>({role:m.role==="assistant"?"assistant":"user",content:String(m.content||"").slice(0,12000)}))];
  const artifacts:{name:string;content:string}[]=[]; let answer="";
  for(let turn=0;turn<4;turn++){
   const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json","HTTP-Referer":process.env.NEXT_PUBLIC_APP_URL||"https://vercel.com","X-Title":"Personal AI Agent"},body:JSON.stringify({model:process.env.OPENROUTER_MODEL||"openrouter/free",messages,tools,tool_choice:"auto",temperature:0.2}),signal:AbortSignal.timeout(50000)});
   const data=await r.json(); if(!r.ok) return NextResponse.json({error:data?.error?.message||"AI provider request failed. Check the model and API key."},{status:502});
   const msg=data.choices?.[0]?.message; if(!msg) return NextResponse.json({error:"AI provider returned no response."},{status:502});
   messages.push(msg); const calls=msg.tool_calls||[];
   if(!calls.length){answer=msg.content||"I couldn't produce a response. Try rephrasing the task.";break;}
   for(const c of calls){let a:any={};try{a=JSON.parse(c.function.arguments||"{}")}catch{} let result:any;
    if(c.function.name==="create_file"){const name=String(a.name||"agent-output.txt").split(/[\\/]/).pop().replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,100)||"agent-output.txt";const content=String(a.content||"").slice(0,80000);artifacts.push({name,content});result={ok:true,name,characters:content.length};}
    else if(c.function.name==="plan_task") result={ok:true,steps:Array.isArray(a.steps)?a.steps.slice(0,20):[]};
    else result={ok:false,error:"Tool not available"};
    messages.push({role:"tool",tool_call_id:c.id,content:JSON.stringify(result)});
   }
  }
  return NextResponse.json({answer:answer||"I reached the prototype's action limit. Send a follow-up task to continue.",artifacts});
 } catch { return NextResponse.json({error:"The agent encountered an error. Try a smaller task or retry shortly."},{status:500}); }
}
