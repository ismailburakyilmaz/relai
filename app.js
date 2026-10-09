const $=id=>document.getElementById(id);
let input='',inspection=null,result=null,revision=0,busy=false,isDemo=false;
const labels={codex:'Codex',claude_code:'Claude Code'};
function status(text){$('status').textContent=text;}
async function api(name,data){const r=await fetch('/api/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await r.json();if(!r.ok)throw Error(value.error||'İşlem tamamlanamadı.');return value;}
function updateFlow(){
 const target=labels[$('target').value],same=inspection?.source===$('target').value;
 $('detected-source').textContent=inspection?labels[inspection.source]:'Dosya seçilmedi';
 $('source-help').textContent=inspection?'Bu bilgi yüklediğin dosyadan okundu.':'Dosyayı yüklediğinde otomatik bulunur.';
 $('demo-note').hidden=!isDemo||!inspection;
 $('demo-note').textContent='Örnek mod: 3 mesajlık bir Codex konuşması yüklendi. Dönüşümü denemek için kullanabilirsin; gerçek hesabına bağlanılmaz.';
 $('convert').textContent=busy?'Dosya işleniyor…':!inspection?'Önce bir oturum yükle':same?'Farklı bir hedef seç':!privacy.ready?'Önce gizlilik incelemesini tamamla':`${target} için dosya hazırla →`;
 const stage=result?4:!inspection?1:privacy.ready?3:2;
 for(let i=1;i<=4;i++){const el=$('step'+i);el.className=i===stage?'current':i<stage?'done':'';if(i===stage)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}
 $('review-link').hidden=!inspection;
 $('destination-help').textContent=!inspection?'Önce bir dosya yükle.':!privacy.ready?(privacy.noFindings?'Gizlilik bölümündeki “Devam et” ile hedef seçimine geç.':'Gizlilik seçimlerini önizle ve “İncelemeyi tamamla” ile onayla.'):'Gizlilik incelemesi tamamlandı. Hedef ajanı seçip dosyanı hazırlayabilirsin.';
 $('destination').classList.toggle('locked',!privacy.ready);
 if(result){
  const destination=labels[result.report.target];
  $('result-title').textContent=`${destination} dosyan hazır.`;
  if(result.report.privacy){$('summary').textContent=`${labels[result.report.source]} → ${destination} · ${result.report.before.messages} kaynak mesaj, ${result.report.after.messages} hedef mesaj. ${result.report.privacy.replacements} metin eşleşmesi gizlendi; ${result.report.privacy.protectedOccurrences} korunan alan eşleşmesi değiştirilmedi. Gizlilik sonrası kopyayla hedef arasında ${result.report.changes.length} alan farkı bulundu.`;}
  $('output-explanation').textContent=`Konuşmanın ${destination} oturum biçimindeki kopyası (.jsonl). Asıl kullanacağın dosya bu.`;
  $('download').textContent=`${destination} dosyasını indir ↓`;
  $('next-explanation').textContent=`Bu dosyanın ${destination} içine alınması ve oturumun orada açılması gerekiyor. Bu sürüm o adımı otomatik yapmıyor; yalnızca dosyayı hazırlıyor.`;
 }
}
function invalidate(){result=null;$('result').hidden=true;updateFlow();}
function controls(){ const locked=busy||privacy.working; $('convert').disabled=locked||!inspection||!privacy.ready||inspection.source===$('target').value; $('demo').disabled=locked; $('source').disabled=locked;$('target').disabled=locked||!inspection||!privacy.ready;$('file').disabled=locked;updateFlow(); }
function render(){const term=$('search').value.toLocaleLowerCase('tr');const area=$('messages');area.replaceChildren();let shown=0;for(const m of inspection?.messages||[]){if(term&&!JSON.stringify(m.content).toLocaleLowerCase('tr').includes(term))continue;if(shown++>=200)break;const box=document.createElement('article');box.className='message '+m.role;const role=document.createElement('div');role.className='role';role.textContent=({user:'KULLANICI',assistant:'ASİSTAN',system:'SİSTEM'})[m.role]||m.role;box.append(role);for(const c of m.content){if(c.type==='text'){const p=document.createElement('pre');p.textContent=privacy.display(c.text);box.append(p);}else{const d=document.createElement('details'),s=document.createElement('summary'),p=document.createElement('pre');s.textContent=({tool_use:'Araç çağrısı',tool_result:'Araç sonucu',thinking:'Düşünme kaydı',image:'Görsel kaydı'})[c.type]||c.type;p.textContent=privacy.display(JSON.stringify(c,null,2));d.append(s,p);box.append(d);}}area.append(box);}if(!shown)area.textContent='Aramana uyan mesaj yok.';if(shown>200){const p=document.createElement('p');p.textContent='İlk 200 eşleşme gösteriliyor. Arayarak daraltabilirsin. Dönüşüm bütün mesajları içerir.';area.append(p);}}
async function inspect(){const token=++revision;privacy.reset();invalidate();inspection=null;busy=true;controls();$('search').disabled=true;status('Oturum okunuyor…');try{const data=await api('inspect',{input,source:$('source').value});if(token!==revision)return;inspection=data;$('target').value=data.source==='codex'?'claude_code':'codex';$('count').textContent=labels[data.source];$('stats').textContent=`${data.stats.messages} mesaj · ${data.stats.tools} araç çağrısı · ${data.stats.results} araç sonucu`;$('search').disabled=false;await privacy.load();render();status('Oturum yüklendi. İkinci adımda gizlilik seçimlerini gözden geçir.');}catch(e){$('count').textContent='Dosya okunamadı';$('stats').textContent='';$('messages').textContent='Geçerli bir oturum dosyası seç.';status(e.message);}finally{busy=false;controls();}}
async function loadFile(file){
 if(!file||busy||privacy.working)return;
 isDemo=false;privacy.reset();invalidate();inspection=null;input='';$('stats').textContent='';$('count').textContent='Dosya bekleniyor';$('messages').textContent='Dosya okunuyor…';$('search').disabled=true;
 if(file.size>16*1024*1024){controls();$('messages').textContent='Daha küçük bir oturum seç.';status('Dosya sınırı 16 MB.');return;}
 busy=true;controls();$('filename').textContent=file.name;
 try{input=await file.text();$('search').value='';await inspect();}
 catch(e){status('Dosya okunamadı: '+e.message);}
 finally{busy=false;controls();}
}
$('file').addEventListener('change',e=>loadFile(e.target.files[0]));
$('drop').addEventListener('dragover',e=>{e.preventDefault();$('drop').classList.add('drag');});
$('drop').addEventListener('dragleave',()=>$('drop').classList.remove('drag'));
$('drop').addEventListener('drop',e=>{e.preventDefault();$('drop').classList.remove('drag');loadFile(e.dataTransfer.files[0]);});
$('source').addEventListener('change',()=>{if(input)inspect();});$('target').addEventListener('change',()=>{invalidate();controls();status(inspection?.source===$('target').value?'Bu dosya zaten seçtiğin ajanın biçiminde. Diğer ajanı hedef olarak seç.':`${labels[$('target').value]} için yeni bir oturum dosyası hazırlanacak.`);});$('search').addEventListener('input',render);
$('convert').addEventListener('click',async()=>{if(busy||privacy.working||!inspection||!privacy.ready||inspection.source===$('target').value)return;busy=true;controls();invalidate();status('Dönüştürülüyor ve mesaj alanları karşılaştırılıyor…');try{result=await api('convert',{input,source:inspection.source,target:$('target').value,...privacy.payload});const r=result.report;$('summary').textContent=`${labels[r.source]} → ${labels[r.target]} · ${r.before.messages} kaynak mesaj, ${r.after.messages} hedef mesaj. ${r.changes.length} alan farkı bulundu.`;const list=$('changes');list.replaceChildren();if(r.privacy){const note=document.createElement('li');note.textContent=`Gizlilik: ${r.privacy.replacements} metin eşleşmesi değiştirildi; ${r.privacy.protectedOccurrences} korunan alan eşleşmesi değiştirilmedi.`;list.append(note);}const descriptions={content:'içerik',timestamp:'zaman bilgisi',model:'model bilgisi',role:'rol',message:'mesaj'};for(const c of r.changes){const li=document.createElement('li');li.textContent=`Mesaj ${c.message}: ${descriptions[c.field]||c.field} — ${c.kind==='missing'?'hedefte yok':c.kind==='added'?'hedefte eklendi':'değişti'}`;list.append(li);}const li=document.createElement('li');li.textContent=r.comparisonScope;list.append(li);$('result').hidden=false;status('Dosya dönüşümü tamamlandı. Raporu inceleyip çıktıyı indirebilirsin.');$('result').scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){status(e.message);}finally{busy=false;controls();}});
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('İndirme isteği gönderildi. Tarayıcının indirilenler bölümünü kontrol et.');}
$('download').addEventListener('click',()=>{if(result)download(result.output,result.filename,'application/x-ndjson');});
$('report').addEventListener('click',()=>{if(result)download(JSON.stringify(result.report,null,2),'aktarim-raporu.json','application/json');});
$('demo').addEventListener('click',()=>{isDemo=true;},{capture:true});
document.querySelector('a[href="#guide"]').addEventListener('click',()=>{$('guide').open=true;});
$('card').addEventListener('submit',async e=>{e.preventDefault();try{const data=Object.fromEntries(new FormData(e.target));if(!Object.values(data).some(v=>v.trim())){status('Devir kartına en az bir bilgi yaz.');return;}const r=await api('handoff',data);download(r.text,'proje-devir-karti.md','text/markdown');}catch(e){status(e.message);}});
$('demo').addEventListener('click',()=>{const timestamp='2026-10-07T10:00:00.000Z';const rows=[{timestamp,type:'session_meta',payload:{id:'938dfbba-730e-4bb5-9a48-84f2528fca9a',timestamp,cwd:'C:/demo/ders-planlayici',originator:'demo',cli_version:'0.1.0'}},{timestamp,type:'response_item',payload:{type:'message',role:'user',content:[{type:'input_text',text:'Bu bir örnek oturumdur. Üniversite öğrencileri için Türkçe bir ders planlayıcı yapıyoruz. Veriler bilgisayarda saklanacak; ücretli API kullanmayacağız. Gizlilik kontrolünü denemek için kurmaca bilgiler: deneme@example.com, sk-proj-ORNEK12345678901234567890 ve /home/ornek/proje. Bu değerler gerçek hesap bilgileri değildir.'}]}},{timestamp,type:'response_item',payload:{type:'message',role:'assistant',content:[{type:'output_text',text:'Ders ekleme ve haftalık görünüm hazır. Sıradaki adım: çakışan ders saatlerini işaretlemek ve dışa aktarmayı tamamlamak.'}]}},{timestamp,type:'response_item',payload:{type:'message',role:'user',content:[{type:'input_text',text:'Önce pazartesi 10.00 için iki ders ekleyerek çakışma uyarısını test edelim.'}]}}];input=rows.map(JSON.stringify).join('\n')+'\n';$('filename').textContent='Örnek: ders-planlayici.jsonl';$('source').value='auto';$('search').value='';inspect();});
controls();
