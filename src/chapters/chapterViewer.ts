const CHAPTERS=['Sounds & Letters','Reading','Vocabulary','Grammar','Numbers','Addition','Subtraction','Shapes','Computer Basics','Parts of a Computer','Digital Safety','My Family','Plants Around Us','Animals','Our Neighbourhood','वर्णमाला','शब्द','पठन','लेखन','My World','Nature','People & Places','Fun Facts'];

function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}

export function openChapterViewer(chapter:string){
 const safe=escapeHtml(chapter);
 const pages=Array.from({length:6},(_,i)=>i+1);
 const win=window.open('','_blank','noopener,noreferrer');
 if(!win){window.alert('Please allow pop-ups to view the chapter.');return;}
 win.document.open();
 win.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe} · Gurukulam AI</title><style>body{margin:0;background:#eef5fa;color:#17314f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header{position:sticky;top:0;background:#fff;border-bottom:1px solid #dbe7ef;padding:18px 20px;z-index:2}header strong{font-size:20px}header small{display:block;color:#71869b;margin-top:4px}.wrap{max-width:900px;margin:0 auto;padding:24px 16px 48px}.page{background:#fff;min-height:760px;margin:0 auto 24px;padding:42px;box-sizing:border-box;border-radius:14px;box-shadow:0 4px 18px rgba(23,49,79,.08);position:relative}.page-no{position:absolute;right:24px;top:20px;font-size:13px;color:#60788e}.tag{font-size:12px;letter-spacing:2px;color:#71869b}.title{font-size:30px;margin:10px 0 6px}.rule{height:2px;background:#dbe7ef;margin:22px 0}.line{height:13px;background:#e9eef2;margin:14px 0;border-radius:3px}.line.short{width:70%}.notice{background:#f4f8fb;border:1px solid #dbe7ef;padding:12px 14px;border-radius:10px;margin-top:28px;color:#5c7286}@media(max-width:600px){.page{min-height:650px;padding:28px 22px}.title{font-size:24px}}</style></head><body><header><strong>Gurukulam AI · Chapter Viewer</strong><small>View-only · ${safe}</small></header><main class="wrap">${pages.map(p=>`<section class="page"><span class="page-no">Page ${p} of ${pages.length}</span><div class="tag">GURUKULAM AI · SOURCE PAGE</div><h1 class="title">${safe}</h1><div class="rule"></div><div class="line"></div><div class="line"></div><div class="line short"></div><div class="line"></div><div class="line"></div><div class="line short"></div><div class="notice">This chapter is opened for viewing only. Nothing is downloaded or saved locally by Gurukulam AI.</div></section>`).join('')}</main></body></html>`);
 win.document.close();
}

function attachChapterViewer(){
 if(typeof window==='undefined')return;
 document.addEventListener('change',event=>{
  const target=event.target as HTMLSelectElement;
  if(!(target instanceof HTMLSelectElement)||!CHAPTERS.includes(target.value))return;
  const parent=target.parentElement;
  const label=parent?.querySelector('label');
  if(label?.textContent?.toLowerCase().includes('chapter'))openChapterViewer(target.value);
 },true);
}

attachChapterViewer();