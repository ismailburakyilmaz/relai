const privacy=(()=>{
 let findings=[],custom=[],selected=new Set(),revealed=new Set(),original=null,page=0;
 let scanned=false,previewed=false,reviewed=false,scanning=false;
 const names={TELEFON:'Olası telefon numarası',ORTAM_SIRRI:'Olası ortam değişkeni sırrı',API_ANAHTARI:'Olası API anahtarı',EPOSTA:'E-posta',KULLANICI_KLASORU:'Kişisel klasör',OZEL_IFADE:'Senin eklediğin ifade'};
 const section=document.createElement('section');section.id='privacy';section.className='panel privacy-panel';section.hidden=true;
 section.innerHTML=`<div class="panel-title"><div><h2>Gizlilik incelemesi</h2><p class="muted">Bulunan bilgileri incele, Gizle veya Koru kararını ver.</p></div><span class="small-step">2 / 4</span></div>
 <div class="privacy-limit"><strong>Aktarılacak bilgileri sen seçersin.</strong><p>Ekrandaki •••• yalnızca görüntüyü kapatır. “Koru” seçilen değerler çıktıda açık kalır; “Gizle” seçilen konuşma metinleri yer tutucuyla değiştirilir.</p><details><summary>Kontrolün kapsamı ve sınırları</summary><p>Yalnızca yüklediğin dosya incelenir. Örüntü kontrolü her sırrı bulamayabilir ve zararsız bilgileri işaretleyebilir. Araç kayıtları, çalışma klasörü ve oturum ayarları otomatik değiştirilmez; bu alanlardaki değerler çıktıda kalabilir.</p></details></div>
 <div class="privacy-toolbar"><input id="privacy-search" aria-label="Bulunan bilgilerde ara" placeholder="Bulunan bilgilerde ara…"><span id="privacy-count"></span><span class="badge" id="privacy-badge">Yerel kontrol</span></div>
 <div id="privacy-list"></div><div class="privacy-pages"><button id="privacy-prev" class="secondary">← Önceki</button><span id="privacy-page"></span><button id="privacy-next" class="secondary">Sonraki →</button></div>
 <form id="privacy-custom"><label for="privacy-expression">Bulunmayan bir ifadeyi kendin ekle</label><div class="custom-row"><input id="privacy-expression" placeholder="Örn. müşteri adı veya özel bir değer" minlength="3" maxlength="200" autocomplete="off" required><button class="secondary">Listeye ekle</button></div><small>Kelime sınırlarıyla, harf büyüklüğünden bağımsız aranır. i/İ/ı/I eşdeğerdir. En fazla 20 ifade.</small></form>
 <div class="privacy-actions"><button id="privacy-apply" class="primary">Seçimlerimi önizle</button><button id="privacy-reset" class="secondary">Gizleme seçimlerini sıfırla</button></div>
 <p id="privacy-feedback" role="status" aria-live="polite"></p>
 <section id="privacy-preview" class="review-preview" hidden aria-labelledby="review-preview-title"><h3 id="review-preview-title">Hazırlanmış konuşma</h3><p class="micro">Son 10 mesaj gösterilir. Korunan değerler ekranda kısmen kapalı görünür; dosyada açık kalır. Diğer mesajları yukarıdaki konuşma önizlemesinde arayabilirsin.</p><div id="privacy-preview-messages" class="messages"></div></section>
 <div class="review-confirm"><p id="privacy-state">Önce seçimlerini önizle, ardından incelemeyi tamamla.</p><button id="privacy-confirm" class="primary" disabled>İncelemeyi tamamla →</button></div>
 <p class="micro">Kaynak dosya değişmez. “Gizle”, aynı değerin desteklenen konuşma metnindeki tüm eşleşmelerine uygulanır. Raporda gizlenen değerlerin açık hâli bulunmaz.</p>`;
 document.querySelector('.workspace').after(section);
 section.addEventListener('click',e=>{if(busy||scanning){e.preventDefault();e.stopImmediatePropagation();}},true);
 const el=id=>document.getElementById(id);
 function mask(value){return value.length>8?value.slice(0,3)+'••••'+value.slice(-2):'••••';}
 function display(text,except){let s=String(text);for(const f of [...findings].sort((a,b)=>b.value.length-a.value.length))if(f.id!==except)for(const v of f.variants||[f.value])s=s.split(v).join(mask(v));return s;}
 function feedback(s){el('privacy-feedback').textContent=s;}
 function dirty(){previewed=false;reviewed=false;el('privacy-preview').hidden=true;el('privacy-preview-messages').replaceChildren();el('privacy-confirm').disabled=true;if(original)inspection=original;invalidate();status('Gizlilik seçimlerini yeniden önizleyip onayla.');feedback('');render();el('privacy-state').textContent='Seçimlerini önizle ve incelemeyi tamamla.';controls();}
 function filtered(){const q=el('privacy-search').value.toLocaleLowerCase('tr');return findings.filter(f=>(f.value+' '+names[f.kind]).toLocaleLowerCase('tr').includes(q));}
 function draw(){
  const list=el('privacy-list');list.replaceChildren();const found=filtered();page=Math.min(page,Math.max(0,Math.ceil(found.length/15)-1));
  el('privacy-count').textContent=`${findings.length} farklı bilgi · ${selected.size} gizleme seçimi`;
  el('privacy-badge').textContent=scanned?(findings.length?'İnceleme bekliyor':'Eşleşme bulunmadı'):'Kontrol bekleniyor';
  if(reviewed)el('privacy-badge').textContent='İnceleme tamamlandı';
  if(!found.length){const p=document.createElement('p');p.className='muted';p.textContent=!scanned?'Dosya kontrolü henüz tamamlanmadı.':findings.length?'Aramana uyan bulgu yok.':'Bu kurallarla eşleşme bulunmadı. Özel ifade ekleyebilir veya Devam et ile hedef seçimine geçebilirsin. Bu sonuç dosyanın hassas bilgi içermediğini garanti etmez.';list.append(p);}
  for(const f of found.slice(page*15,page*15+15)){
   const article=document.createElement('article');article.className='finding'+(selected.has(f.id)?' will-hide':'');
   const heading=document.createElement('div');heading.className='finding-head';const title=document.createElement('strong');title.textContent=names[f.kind];const count=document.createElement('span');count.textContent=`${f.editableCount} metin eşleşmesi · ${f.protectedCount} korunan alan`;heading.append(title,count);article.append(heading);
   const pair=document.createElement('div');pair.className='privacy-pair';const before=document.createElement('code'),after=document.createElement('code');before.textContent=revealed.has(f.id)?f.value:mask(f.value);after.textContent=selected.has(f.id)?'Gizlenecek → '+f.replacement:'Korunacak → Çıktıda açık kalacak';pair.append(before,after);article.append(pair);
   const buttons=document.createElement('div');buttons.className='finding-buttons';
   const show=document.createElement('button');show.className='secondary';show.textContent=revealed.has(f.id)?'Değeri kapat':'Göster';show.type='button';show.onclick=()=>{revealed.has(f.id)?revealed.delete(f.id):revealed.add(f.id);draw();};buttons.append(show);
   for(const [text,hide] of [['Gizle',true],['Koru',false]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.className='secondary choice '+(hide?'hide-choice':'keep-choice');b.setAttribute('aria-pressed',String(selected.has(f.id)===hide));b.disabled=hide&&!f.editableCount;b.onclick=()=>{if(selected.has(f.id)===hide)return;hide?selected.add(f.id):selected.delete(f.id);dirty();draw();};buttons.append(b);}article.append(buttons);
   if(f.protectedCount){const p=document.createElement('p');p.className='protected-note';p.textContent='Araç kaydı veya oturum ayarındaki eşleşmeler korunur. Bu alanlarda özgün değer kalabilir.';article.append(p);}
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Nerede geçiyor? (ilk 8 eşleşme)';details.append(summary);
   for(const o of f.occurrences){const p=document.createElement('p');p.textContent=`Dosya satırı ${o.line} · ${o.editable?'Konuşma metni':'Korunan alan'}: …${display(o.context,revealed.has(f.id)?f.id:null)}…`;details.append(p);}article.append(details);list.append(article);
  }
  el('privacy-page').textContent=`${found.length?page+1:0} / ${Math.ceil(found.length/15)}`;el('privacy-prev').disabled=page===0;el('privacy-next').disabled=(page+1)*15>=found.length;
  section.querySelector('.privacy-pages').hidden=found.length<=15;
  el('privacy-apply').disabled=scanning||!scanned;el('privacy-reset').disabled=scanning||!scanned;
  const empty=scanned&&findings.length===0;
  el('privacy-apply').hidden=empty;el('privacy-reset').hidden=empty;
  el('privacy-confirm').textContent=empty?'Devam et →':'İncelemeyi tamamla →';
  el('privacy-confirm').disabled=scanning||(!previewed&&!empty)||reviewed;
  if(empty&&!reviewed)el('privacy-state').textContent='Bu kurallarla bulgu bulunmadı. Konuşma değiştirilmeden aktarılacak.';
 }
 async function scanNow(){scanning=true;scanned=false;dirty();feedback('Dosyanın metin alanları kontrol ediliyor…');try{const r=await api('privacy-scan',{input,custom});findings=r.findings;selected=new Set([...selected].filter(id=>findings.some(f=>f.id===id)));revealed.clear();page=0;scanned=true;draw();render();feedback(r.truncated?'İlk 300 farklı bulgu gösteriliyor; liste tüm bulguları içermeyebilir. Seçimlerini kontrol edip önizle.':findings.length?'Kontrol tamamlandı. Bilgiler henüz gizlenmedi; seçimlerini önizleyebilirsin.':'Kontrol tamamlandı. Devam et ile hedef seçimine geçebilirsin.');}catch(e){findings=[];draw();feedback('Kontrol tamamlanamadı: '+e.message);}finally{scanning=false;draw();controls();}}
 async function load(){custom=[];selected.clear();revealed.clear();findings=[];page=0;original=inspection;section.hidden=false;el('privacy-search').value='';el('privacy-expression').value='';await scanNow();}
 function reset(){findings=[];custom=[];selected.clear();revealed.clear();original=null;scanned=false;previewed=false;reviewed=false;section.hidden=true;el('privacy-preview').hidden=true;el('privacy-preview-messages').replaceChildren();}
 el('privacy-search').oninput=()=>{page=0;draw();};el('privacy-prev').onclick=()=>{page--;draw();};el('privacy-next').onclick=()=>{page++;draw();};
 el('privacy-custom').onsubmit=async e=>{e.preventDefault();if(scanning||busy)return;const value=el('privacy-expression').value.trim();if(value.length<3||custom.length>=20){feedback('3–200 karakterlik en fazla 20 ifade ekleyebilirsin.');return;}if(!custom.includes(value))custom.push(value);await scanNow();el('privacy-expression').value='';};
 el('privacy-reset').onclick=()=>{selected.clear();revealed.clear();dirty();draw();feedback('Gizleme seçimleri sıfırlandı. Değerlerin çıktıda açık kalmasını istiyorsan önizleyip incelemeyi tamamla.');};
 el('privacy-apply').onclick=async()=>{
  if(scanning||busy||!scanned)return;scanning=true;dirty();draw();
  try{const r=await api('privacy-apply',{input,source:original.source,custom,selected:[...selected]});inspection=r.preview;previewed=true;invalidate();render();revealed.clear();
   const area=el('privacy-preview-messages');area.replaceChildren();
   for(const m of inspection.messages.slice(-10)){const article=document.createElement('article');article.className='message '+m.role;const role=document.createElement('div');role.className='role';role.textContent=({user:'Kullanıcı',assistant:'Asistan',system:'Sistem'})[m.role]||m.role;const p=document.createElement('pre');p.textContent=display(m.content.map(c=>c.type==='text'?c.text:`[${c.type} kaydı: tam önizlemede inceleyebilirsin]`).join('\n'));article.append(role,p);area.append(article);}
   el('privacy-preview').hidden=false;
   feedback(`${r.summary.replacements} metin eşleşmesi gizlendi. ${r.summary.protectedOccurrences} korunan alan eşleşmesi değiştirilmedi.`);
   el('privacy-state').textContent=selected.size?'Önizlemeyi kontrol ettiysen incelemeyi tamamlayıp hedef seçimine geç.':'Gizleme seçmedin. Değerler açık hâliyle aktarılacak. Uygunsa incelemeyi tamamla.';
  }catch(e){feedback('Önizleme oluşturulamadı: '+e.message);}finally{scanning=false;draw();controls();}
 };
 el('privacy-confirm').onclick=()=>{if((!previewed&&!(scanned&&findings.length===0))||scanning||busy)return;reviewed=true;status('Gizlilik incelemesi tamamlandı. Hedef ajanı seçebilirsin.');el('privacy-state').textContent='İnceleme tamamlandı. Bir seçimi değiştirirsen yeniden önizleyip onaylaman gerekir.';draw();controls();el('target').focus();el('destination').scrollIntoView({behavior:'smooth',block:'center'});};
 return {load,reset,display,get noFindings(){return scanned&&!scanning&&findings.length===0;},get working(){return scanning;},get ready(){return reviewed&&!scanning;},get payload(){return {custom,selected:[...selected]};}};
})();
