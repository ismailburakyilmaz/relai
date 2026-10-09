const {createHash}=require('node:crypto');
const rules=[
 ['TELEFON',/(?<![\p{L}\p{N}_+])(?:\+90[ .-]?|0)?(?:\(5\d{2}\)|5\d{2})[ .-]?\d{3}[ .-]?\d{2}[ .-]?\d{2}(?![\p{L}\p{N}_])/gu],
 ['API_ANAHTARI',/\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{25,})\b/g],
 ['EPOSTA',/\b[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}\b/g],
 ['KULLANICI_KLASORU',/(?:[A-Za-z]:[\\/]Users[\\/][^\\/\s"'<>]+|\/(?:Users|home)\/[^/\s"'<>]+)/g]
];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fold=s=>s.replace(/[iİıI]/g,'i').toLocaleLowerCase('tr');
const matchId=m=>createHash('sha256').update(m.kind==='OZEL_IFADE'?fold(m.value):m.value).digest('hex').slice(0,24);
function patterns(custom){return [...new Set(custom.map(fold))].map(value=>new RegExp('(?<![\\p{L}\\p{N}_])'+[...value].map(c=>c==='i'?'[iİıI]':escape(c)).join('')+'(?![\\p{L}\\p{N}_])','giu'));}
function matchesIn(text,customPatterns){
 const matches=[];
 for(const [kind,regex] of rules){regex.lastIndex=0;for(const m of text.matchAll(regex))matches.push({kind,value:m[0],index:m.index});}
 // Match only assignment values, leaving names, quotes and trailing comments intact.
 const env=/^([ \t]*(?:export[ \t]+)?(?:[A-Z][A-Z0-9]*_)*(?:PASSWORD|PASSWD|PWD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)(?:_[A-Z0-9]+)*[ \t]*=[ \t]*)(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s#"']+))/gim;
 for(const m of text.matchAll(env)){const value=m[2]??m[3]??m[4];matches.push({kind:'ORTAM_SIRRI',value,index:m.index+m[1].length+(m[4]===undefined?1:0)});}
 for(const regex of customPatterns){regex.lastIndex=0;for(const m of text.matchAll(regex))matches.push({kind:'OZEL_IFADE',value:m[0],index:m.index});}
 const seen=new Set();return matches.filter(m=>{const key=m.index+':'+m.value;if(seen.has(key))return false;seen.add(key);return true;});
}
function read(input){if(typeof input!=='string'||Buffer.byteLength(input)>16*1024*1024)throw Error('Dosya sınırı 16 MB.');try{return input.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(s=>s.trim()).map(JSON.parse);}catch{throw Error('Geçerli bir JSONL dosyası gerekli.');}}
function editable(row,path){
 const p=path.join('.');
 if(row.type==='response_item'&&row.payload?.type==='message')return /^payload\.content\.\d+\.text$/.test(p);
 if(row.type==='event_msg'&&['user_message','agent_message'].includes(row.payload?.type))return p==='payload.message';
 if(['user','assistant'].includes(row.type)&&row.message){
  if(p==='message.content'&&typeof row.message.content==='string')return true;
  const m=p.match(/^message\.content\.(\d+)\.text$/);return !!m&&row.message.content?.[Number(m[1])]?.type==='text';
 }
 return false;
}
function walk(value,fn,path=[]){if(typeof value==='string')return fn(value,path);if(Array.isArray(value))return value.map((v,i)=>walk(v,fn,[...path,i]));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v,fn,[...path,k])]));return value;}
function scan(input,custom=[]){
 if(!Array.isArray(custom)||custom.length>20||custom.some(s=>typeof s!=='string'||s.length<3||s.length>200))throw Error('En fazla 20 özel ifade ekleyebilirsin. Her ifade 3–200 karakter olmalı.');
 const rows=read(input),groups=new Map(),customPatterns=patterns(custom);let truncated=false;
 rows.forEach((row,line)=>walk(row,(text,path)=>{
  const matches=matchesIn(text,customPatterns);
  for(const m of matches){const id=matchId(m);if(!groups.has(id)){if(groups.size>=300){truncated=true;continue;}groups.set(id,{id,kind:m.kind,value:m.value,variants:[],occurrences:[],editableCount:0,protectedCount:0});}
   if(!groups.get(id).variants.includes(m.value))groups.get(id).variants.push(m.value);
   const g=groups.get(id),canEdit=editable(row,path);canEdit?g.editableCount++:g.protectedCount++;
   if(g.occurrences.length<8)g.occurrences.push({line:line+1,editable:canEdit,context:text.slice(Math.max(0,m.index-45),m.index+m.value.length+45)});
  }return text;
 }));
 const counters={};const findings=[...groups.values()].map(g=>({...g,replacement:`[${g.kind}_${counters[g.kind]=(counters[g.kind]||0)+1}]`}));
 return {findings,truncated,scope:'Yalnızca yüklenen dosyanın metin alanları tarandı. Görseller ve şifreli içerikler incelenmez. Araç kayıtları ve oturum ayarları otomatik değiştirilmez.'};
}
function apply(input,custom=[],selected=[]){
 if(!Array.isArray(selected)||selected.some(s=>typeof s!=='string'))throw Error('Gizleme seçimi geçersiz.');
 const scanResult=scan(input,custom),all=new Map(scanResult.findings.map(f=>[f.id,f]));
 if(selected.some(id=>!all.has(id)||!all.get(id).editableCount))throw Error('Seçim dosyayla uyuşmuyor. Kontrolü yenile.');
 const chosen=[...new Set(selected)].map(id=>all.get(id)),ids=new Set(selected),customPatterns=patterns(custom);let replacements=0;
 // Use the same spans as scanning: boundaries and case handling cannot diverge at replacement time.
 const output=read(input).map(row=>walk(row,(text,p)=>{
  if(!editable(row,p)||!ids.size)return text;
  const matches=matchesIn(text,customPatterns).filter(m=>ids.has(matchId(m))).sort((a,b)=>a.index-b.index||b.value.length-a.value.length);
  let end=0,out='';for(const m of matches){if(m.index<end)continue;out+=text.slice(end,m.index)+all.get(matchId(m)).replacement;end=m.index+m.value.length;replacements++;}return out+text.slice(end);
 })).map(JSON.stringify).join('\n')+'\n';
 const remaining=chosen.map(f=>({kind:f.kind,replacement:f.replacement,protectedOccurrences:f.protectedCount}));
 return {input:output,summary:{selectedValues:chosen.length,replacements,protectedOccurrences:chosen.reduce((n,f)=>n+f.protectedCount,0),items:remaining,scope:scanResult.scope}};
}
module.exports={scan,apply};
