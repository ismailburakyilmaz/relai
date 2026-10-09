const tx = require('txcript');
const {randomUUID, createHash} = require('node:crypto');
const formats = ['codex','claude_code'];
function parse(input, source) {
 if(typeof input!=='string'||!input.trim()) throw new Error('Önce bir oturum dosyası seçin.');
 if(Buffer.byteLength(input)>16*1024*1024) throw new Error('Dosya sınırı 16 MB.');
 let rows;
 try { rows=input.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(x=>x.trim()).map(JSON.parse); }
 catch { throw new Error('Dosya geçerli JSONL değil. Her satırda bir JSON kaydı bulunmalı.'); }
 const detected=rows.some(r=>r.type==='session_meta')?'codex':rows.some(r=>r.sessionId&&['user','assistant'].includes(r.type))?'claude_code':null;
 if(source==='auto') source=detected;
 if(!formats.includes(source)) throw new Error('Codex veya Claude Code oturum dosyası seçin. ChatGPT sohbet dışa aktarımı desteklenmiyor.');
 if(detected&&detected!==source) throw new Error('Seçilen kaynak, dosyanın biçimiyle uyuşmuyor. Otomatik algılamayı deneyin.');
 let common;
 try {common=JSON.parse(tx.toCommon(input.replace(/^\uFEFF/,''),source));}
 catch {throw new Error('Oturum okunamadı. Dosya bu sürümle uyumlu olmayabilir.');}
 if(!common.messages?.length) throw new Error('Bu dosyada aktarılabilir mesaj bulunamadı.');
 return {source,common,rows:rows.length};
}
function stats(c){return {messages:c.messages.length,text:c.messages.flatMap(m=>m.content).filter(b=>b.type==='text').length,tools:c.messages.flatMap(m=>m.content).filter(b=>b.type==='tool_use').length,results:c.messages.flatMap(m=>m.content).filter(b=>b.type==='tool_result').length};}
function inspect(input,source='auto'){const p=parse(input,source);return {source:p.source,stats:stats(p.common),messages:p.common.messages,records:p.rows};}
function convert(input,source,target){
 if(!formats.includes(target)) throw new Error('Geçersiz hedef.');
 const p=parse(input,source);
 if(p.source===target) throw new Error('Kaynak ve hedef farklı olmalı.');
 const native=tx.convert(input.replace(/^\uFEFF/,''),p.source,target);
 const sessionId=randomUUID();
 const output=native.trim().split('\n').map(line=>{const r=JSON.parse(line);if(target==='codex'&&r.type==='session_meta')r.payload.id=sessionId;if(target==='claude_code')r.sessionId=sessionId;return JSON.stringify(r);}).join('\n')+'\n';
 const after=JSON.parse(tx.toCommon(output,target));
 const changes=[];
 const max=Math.max(p.common.messages.length,after.messages.length);
 for(let i=0;i<max;i++){
  const a=p.common.messages[i],b=after.messages[i];
  if(!a||!b){changes.push({message:i+1,field:'message',kind:a?'missing':'added'});continue;}
  for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
   if(JSON.stringify(a[key])!==JSON.stringify(b[key]))changes.push({message:i+1,field:key,kind:'changed'});
  }
 }
 return {output,filename:`${target}-${sessionId}.jsonl`,report:{source:p.source,target,sessionId,engine:'txcript 0.14.4',before:stats(p.common),after:stats(after),changes,sourceSha256:createHash('sha256').update(input).digest('hex'),comparisonScope:'Dönüştürücünün ortak mesaj modelindeki alanlar karşılaştırılır. Ham kayıtlardaki bütün alanların korunduğu anlamına gelmez.',resumeStatus:'Bu çıktı için hedef uygulamada devam ettirme sınanmadı.',notes:['Proje dosyaları, hesap erişimi ve araç kurulumu ayrı gerekir.','Dosyayı indirmek hedef uygulamaya otomatik olarak oturum eklemez.','Yeni oturum kimliği üretildi. Kaynak dosya değiştirilmedi.']}};
}
function handoff(data={}){const fields=[['Proje',data.project],['Amaç',data.purpose],['Tamamlanan işler',data.done],['Sıradaki adım',data.next],['Kısıtlar ve kararlar',data.constraints]];return '# Proje devir kartı\n\nKullanıcı tarafından hazırlanmıştır. Otomatik AI özeti değildir.\n\n'+fields.map(([title,value])=>'## '+title+'\n\n'+String(value||'Belirtilmedi').slice(0,10000)).join('\n\n')+'\n';}
module.exports={inspect,convert,handoff};
