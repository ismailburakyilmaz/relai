const {test}=require('node:test'),assert=require('node:assert/strict');const p=require('./privacy.cjs'),core=require('./core.cjs');
const secret='sk-proj-EXAMPLE12345678901234567890',email='test@example.com';
const message=text=>JSON.stringify({type:'user',message:{role:'user',content:text}});
test('TR mobile formats match while longer IDs and letter placeholders do not',()=>{
 const raw=message('+90 555 123 45 67; +905551234568; 0555 123 45 69; +90 (555) 123-45-60; 90555123456789; +90 5xx xxx xx xx');
 const f=p.scan(raw).findings.filter(f=>f.kind==='TELEFON');assert.equal(f.length,4);
 const out=p.apply(raw,[],f.map(f=>f.id));assert.equal(out.summary.replacements,4);assert.ok(out.input.includes('90555123456789'));
});
test('manual words group case variants including Turkish I and respect Unicode boundaries',()=>{
 const raw=message('Gemini gemini GEMINI GEMİNİ; Ali ALİ ali Aliye Halil; Işık ışık IŞIK; İzmir İZMİR izmir; önAli Ali2 Ali_');
 const custom=['Gemini','Ali','ışık','İzmir'],f=p.scan(raw,custom).findings;
 assert.deepEqual(f.map(f=>f.editableCount),[4,3,3,3]);
 const out=p.apply(raw,custom,f.map(f=>f.id));assert.equal(out.summary.replacements,13);
 for(const kept of ['Aliye','Halil','önAli','Ali2','Ali_'])assert.ok(out.input.includes(kept));
 assert.ok(!out.input.includes('GEMINI'));assert.ok(!out.input.includes('İZMİR'));
});
test('env secret values hide while keys, quotes, comments and normal settings survive',()=>{
 const raw=message('DB_PASSWORD=hunter42 # comment\nSECRET="two words"\nexport SERVICE_API_KEY=abc123\nPORT=4317\nEMPTY_SECRET=\nTOKEN=token-value');
 const f=p.scan(raw).findings;assert.equal(f.length,4);assert.ok(f.every(f=>f.kind==='ORTAM_SIRRI'));
 const out=JSON.parse(p.apply(raw,[],f.map(f=>f.id)).input).message.content;
 assert.ok(out.includes('DB_PASSWORD=[ORTAM_SIRRI_1] # comment'));assert.ok(out.includes('SECRET="[ORTAM_SIRRI_2]"'));assert.ok(out.includes('PORT=4317'));assert.ok(out.includes('EMPTY_SECRET=\n'));assert.ok(!out.includes('hunter42'));
});
test('new rules never change protected tool records',()=>{
 const text='+905551234567\nSECRET=example-password\nGEMINI',raw=[JSON.parse(message(text)),{type:'assistant',message:{content:[{type:'tool_result',content:text}]}}].map(JSON.stringify).join('\n');
 const f=p.scan(raw,['Gemini']).findings;assert.ok(f.every(f=>f.protectedCount===1));
 const out=p.apply(raw,['Gemini'],f.map(f=>f.id));assert.equal(out.summary.replacements,3);assert.equal(JSON.parse(out.input.trim().split('\n')[1]).message.content[0].content,text);
});
const rows=[{type:'session_meta',payload:{id:'938dfbba-730e-4bb5-9a48-84f2528fca9a',timestamp:'2026-10-07T10:00:00Z',cwd:'C:\\Users\\DemoUser\\demo'}},{type:'response_item',payload:{type:'message',role:'user',content:[{type:'input_text',text:`Email ${email} again ${email}; key ${secret}; folder C:\\Users\\DemoUser\\demo. Client Acme+Ltd.`}]}},{type:'response_item',payload:{type:'function_call',call_id:'call1',name:'shell',arguments:JSON.stringify({key:secret})}}];const input=rows.map(JSON.stringify).join('\n');
test('repeated values grouped; metadata and tools protected',()=>{const f=p.scan(input).findings;assert.equal(f.find(x=>x.value===email).editableCount,2);assert.equal(f.find(x=>x.value===secret).protectedCount,1);assert.equal(f.find(x=>x.value==='C:\\Users\\DemoUser').protectedCount,1);});
test('selected email hidden in all message occurrences, keep leaves values intact',()=>{const f=p.scan(input).findings.find(x=>x.value===email);const r=p.apply(input,[],[f.id]);assert.ok(!r.input.includes(email));assert.equal(r.summary.replacements,2);assert.ok(r.input.includes(secret));assert.ok(p.apply(input).input.includes(email));assert.ok(!JSON.stringify(r.summary).includes(email));});
test('protected working path and tool argument never modified',()=>{const f=p.scan(input).findings;const r=p.apply(input,[],f.filter(x=>x.editableCount).map(x=>x.id));const out=r.input.trim().split('\n').map(JSON.parse);assert.equal(out[0].payload.cwd,rows[0].payload.cwd);assert.equal(out[2].payload.arguments,rows[2].payload.arguments);assert.equal(r.summary.protectedOccurrences,2);});
test('custom literal with regex symbols and overlap is safe',()=>{const custom=['Acme+Ltd','Acme'];const f=p.scan(input,custom).findings.filter(x=>x.kind==='OZEL_IFADE');const r=p.apply(input,custom,f.map(x=>x.id));assert.ok(!r.input.includes('Acme'));assert.equal(r.summary.replacements,1);});
test('masked content survives conversion and report omits values',()=>{const f=p.scan(input).findings.find(x=>x.value===email);const r=p.apply(input,[],[f.id]);const c=core.convert(r.input,'codex','claude_code');assert.ok(!c.output.includes(email));assert.ok(!JSON.stringify(c.report).includes(email));assert.ok(c.output.includes('[EPOSTA_1]'));});
test('invalid selections and custom expressions rejected',()=>{assert.throws(()=>p.apply(input,[],['unknown']));assert.throws(()=>p.scan(input,['ab']));assert.throws(()=>p.scan('bad'));});
test('custom match overlapping automatic rule is not double counted',()=>{assert.equal(p.scan(input,[email]).findings.find(f=>f.value===email).editableCount,2);});
test('Claude message text editable; tool and metadata remain intact',()=>{const raw=JSON.stringify({type:'user',sessionId:'id',cwd:'/home/person',message:{role:'user',content:[{type:'text',text:email},{type:'tool_result',tool_use_id:'abc',content:email}]}});const f=p.scan(raw).findings.find(x=>x.value===email);assert.equal(f.editableCount,1);assert.equal(f.protectedCount,1);const out=JSON.parse(p.apply(raw,[],[f.id]).input);assert.equal(out.message.content[1].content,email);assert.equal(out.message.content[0].text,'[EPOSTA_1]');});
