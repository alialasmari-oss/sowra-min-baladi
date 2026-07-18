async function openAdmin(){
  go('adm');
  $('admList').innerHTML='<div class="empty">⏳ جاري التحميل...</div>';
  const [ph,rp]=await Promise.all([
    sb.from('photos').select('*, profiles!user_id(display_name, banned)').order('created_at',{ascending:false}),
    sb.from('reports').select('photo_id')
  ]);
  if(ph.error){$('admList').innerHTML=`<div class="empty">⚠️ خطأ في جلب الصور:<br><span style="direction:ltr;display:inline-block;color:var(--sadu);font-size:12px">${ph.error.message}</span></div>`;return}
  if(rp.error){$('admList').innerHTML=`<div class="empty">⚠️ خطأ في جلب البلاغات:<br><span style="direction:ltr;display:inline-block;color:var(--sadu);font-size:12px">${rp.error.message}</span></div>`;return}
  admPhotos=ph.data||[];
  admReps={};
  (rp.data||[]).forEach(r=>admReps[r.photo_id]=(admReps[r.photo_id]||0)+1);
  admSetTab(admTab);
}
function admSetTab(t){
  admTab=t;
  ['Rep','All','Plc','Fb','St','Wk'].forEach(x=>$('admTab'+x).classList.remove('on'));
  $('admTab'+({rep:'Rep',all:'All',plc:'Plc',fb:'Fb',st:'St',wk:'Wk'}[t])).classList.add('on');
  $('admPlaces').style.display=t==='plc'?'block':'none';
  $('admFb').style.display=t==='fb'?'block':'none';
  $('admSt').style.display=t==='st'?'block':'none';
  $('admWk').style.display=t==='wk'?'block':'none';
  $('admList').style.display=(t==='rep'||t==='all')?'block':'none';
  if(t==='plc')renderPlaces();
  else if(t==='fb')loadFb();
  else if(t==='st')loadStats();
  else if(t==='wk')loadAdmWeek();
  else admRender();
}

/* ====== الإحصائيات ====== */
async function loadStats(){
  $('admSt').innerHTML='<div class="empty">⏳</div>';
  const [st,us]=await Promise.all([sb.rpc('admin_stats'),sb.rpc('admin_users')]);
  if(st.error||!st.data){$('admSt').innerHTML=`<div class="empty">⚠️ ${st.error?.message||'نفّذ سكربت v7 أول'}</div>`;return}
  const s=st.data;
  const card=(n,l,ic)=>`<div style="background:var(--card);border:1.5px solid var(--line);border-radius:14px;padding:14px 8px;text-align:center">
    <div style="font-size:22px">${ic}</div>
    <div style="font-size:24px;font-weight:700;color:var(--sand)">${n}</div>
    <div style="font-size:11px;color:var(--txt-dim)">${l}</div></div>`;
  let html=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">
    ${card(s.users,'مسجلين','👤')}${card(s.guests,'زوار','👀')}${card(s.photos,'صورة','📸')}
    ${card(s.ratings,'تقييم','⭐')}${card(s.comments,'تعليق','💬')}${card(s.badges,'صوت وسام','🗳️')}
    ${card(s.fb_new,'رسالة جديدة','📨')}${card(s.hidden,'مخفية','🙈')}${card(s.places,'مكان مضاف','📍')}
  </div>
  <div style="font-weight:700;font-size:15px;margin-bottom:10px">👥 المسجلون (${(us.data||[]).length})</div>`;
  html+=(us.data||[]).length
    ?(us.data.map(u=>`<div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="min-width:0">
          <b style="font-size:14px">${esc(u.display_name)}</b>
          <div style="font-size:11.5px;color:var(--txt-dim);direction:ltr;text-align:right;overflow:hidden;text-overflow:ellipsis">${esc(u.email)}</div>
        </div>
        <div style="text-align:center;flex:0 0 auto">
          <div style="font-size:15px;font-weight:700;color:var(--sand)">${u.photos_count} 📸</div>
          <div style="font-size:10px;color:var(--txt-dim)">${new Date(u.created_at).toLocaleDateString('ar-SA')}</div>
        </div>
      </div>`).join(''))
    :'<div class="empty">ما فيه مسجلين بعد</div>';
  $('admSt').innerHTML=html;
}

/* صورة من بلدي — admin.js | نسخة المختبر م1 */
const KIND_AR={city:'مدينة',village:'قرية',landmark:'معلم'};
/* ====== مراسلة الإدارة ====== */
const FB_AR={suggestion:'💡 اقتراح',complaint:'⚠️ شكوى',question:'❓ استفسار',other:'📝 أخرى'};
async function sendFeedback(){
  const kind=$('fbKind').value,body=$('fbBody').value.trim();
  if(body.length<3)return toast('اكتب رسالتك أول',true);
  const b=$('fbGo');b.disabled=true;b.textContent='⏳';
  const { error } = await sb.from('feedback').insert({user_id:USER.id,kind,body});
  b.disabled=false;b.textContent='إرسال 📨';
  if(error){toast('تعذر الإرسال: '+error.message,true);return}
  $('fbBody').value='';
  toast('وصلت رسالتك للإدارة، شكراً لك 🙏');
}
async function loadFb(){
  $('admFb').innerHTML='<div class="empty">⏳</div>';
  const { data, error } = await sb.from('feedback').select('*, profiles!user_id(display_name)').order('created_at',{ascending:false});
  if(error){$('admFb').innerHTML=`<div class="empty">⚠️ ${error.message}</div>`;return}
  if(!data.length){$('admFb').innerHTML='<div class="empty">📭 ما فيه رسائل بعد</div>';return}
  $('admFb').innerHTML=data.map(f=>`
    <div style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:13px;margin-bottom:10px;${f.status==='done'?'opacity:.55':''}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--line)">${FB_AR[f.kind]||f.kind}</span>
        <span style="font-size:11px;color:var(--txt-dim)">${esc(f.profiles?.display_name||'زائر')} · ${new Date(f.created_at).toLocaleDateString('ar-SA')}</span>
      </div>
      <div style="font-size:14px;line-height:1.8;margin-bottom:10px">${esc(f.body)}</div>
      <div style="display:flex;gap:8px">
        ${f.status==='new'
          ?`<button class="btn" style="font-size:12px;padding:7px 14px;background:var(--qblue)" onclick="fbReply(${f.id})">💬 رد</button>
           <button class="btn" style="font-size:12px;padding:7px 14px;background:var(--palm)" onclick="fbDone(${f.id})">✓ تم التعامل</button>`
          :`<span style="font-size:12px;color:var(--palm);font-weight:700;padding:7px 0">✓ منتهية</span>`}
        <button class="btn" style="font-size:12px;padding:7px 14px;background:var(--card2);border:1px solid var(--line);color:var(--txt)" onclick="fbDel(${f.id})">🗑️ حذف</button>
      </div>
    </div>`).join('');
}
async function fbReply(id){
  const t=prompt('اكتب رد الإدارة على الرسالة:');
  if(t===null||!t.trim())return;
  const {error}=await sb.from('feedback').update({reply:t.trim(),status:'done'}).eq('id',id);
  if(error){toast('فشل الرد: '+error.message,true);return}
  toast('انرسل الرد 💬');loadFb();
}
async function fbDone(id){
  const { error } = await sb.from('feedback').update({status:'done'}).eq('id',id);
  if(error){toast('فشلت العملية',true);return}
  loadFb();
}
async function fbDel(id){
  if(!confirm('حذف الرسالة نهائياً؟'))return;
  const { error } = await sb.from('feedback').delete().eq('id',id);
  if(error){toast('فشل الحذف',true);return}
  loadFb();
}
function plcFillCities(){
  const r=$('plcRegion').value,c=$('plcCity');
  c.innerHTML='<option value="">المدينة (اختياري)</option>';
  if(r&&GEO[r])GEO[r].forEach(x=>c.innerHTML+=`<option>${x}</option>`);
}
function renderPlaces(){
  const reg=$('plcRegion'),sel=reg.value;
  reg.innerHTML='<option value="">اختر المنطقة</option>';
  for(const r in BASE_GEO)reg.innerHTML+=`<option>${r}</option>`;
  if(sel)reg.value=sel;
  plcFillCities();
  $('plcList').innerHTML=customPlaces.length
    ?customPlaces.map(c=>`
      <div style="display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin-bottom:8px">
        <div style="flex:1">
          <b style="font-size:14px">${esc(c.name)}</b>
          <div style="font-size:11px;color:var(--txt-dim)">${KIND_AR[c.kind]}${c.city?' · '+esc(c.city):''} · ${esc(c.region)}</div>
        </div>
        <button class="btn" style="font-size:12px;padding:7px 12px" onclick="admDelPlace(${c.id},'${esc(c.name).replace(/'/g,"\\'")}')">🗑️ حذف</button>
      </div>`).join('')
    :`<div class="empty">ما فيه أماكن مضافة بعد — كل اللي تضيفه هنا يظهر فوراً بقوائم التطبيق</div>`;
}
async function admAddPlace(){
  const region=$('plcRegion').value,city=$('plcCity').value,name=$('plcName').value.trim(),kind=$('plcKind').value;
  if(!region)return toast('اختر المنطقة',true);
  if(name.length<2)return toast('اكتب اسم المكان',true);
  const { error } = await sb.from('custom_places').insert({region,city,name,kind});
  if(error){
    toast(error.code==='23505'?'المكان مضاف من قبل':'تعذرت الإضافة: '+error.message,true);
    return;
  }
  $('plcName').value='';
  toast('انضاف المكان ✅');
  await loadPlaces();renderPlaces();
}
async function admDelPlace(id,name){
  if(!confirm(`حذف «${name}» من القوائم؟ (الصور المنشورة عليه ما تتأثر)`))return;
  const { error } = await sb.from('custom_places').delete().eq('id',id);
  if(error){toast('تعذر الحذف',true);return}
  toast('انحذف المكان');
  await loadPlaces();renderPlaces();
}
function admRender(){
  let list=admTab==='rep'?admPhotos.filter(p=>(admReps[p.id]||0)>0||p.hidden):admPhotos;
  if(!list.length){$('admList').innerHTML=`<div class="empty">${admTab==='rep'?'✅ ما فيه بلاغات — الساحة نظيفة':'ما فيه صور'}</div>`;return}
  $('admList').innerHTML=list.map(p=>{
    const rc=admReps[p.id]||0;
    return `<div class="card" style="margin-bottom:12px;cursor:default">
      <div class="ph" style="height:150px"><img src="${imgUrl(p.image_path)}" loading="lazy"></div>
      <div class="card-body">
        <div class="card-title">#${p.id} · ${esc(p.title)}</div>
        <div class="card-meta" style="margin-bottom:8px"><span>📷 ${p.profiles?.display_name||'?'} · 📍 ${p.city}</span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          ${rc?`<span style="font-size:11px;padding:3px 9px;border-radius:10px;font-weight:700;background:rgba(242,179,61,.15);color:var(--star);border:1px solid var(--star)">🚩 ${rc} بلاغ</span>`:''}
          ${p.hidden?`<span style="font-size:11px;padding:3px 9px;border-radius:10px;font-weight:700;background:rgba(192,57,43,.15);color:var(--sadu);border:1px solid var(--sadu)">مخفية</span>`:''}
          ${p.profiles?.banned?`<span style="font-size:11px;padding:3px 9px;border-radius:10px;font-weight:700;background:rgba(192,57,43,.3);color:#fff;border:1px solid var(--sadu)">صاحبها محظور</span>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn" style="font-size:12px;padding:8px 12px;${p.hidden?'background:var(--palm)':'background:var(--card2);border:1px solid var(--line)'}" onclick="admHide(${p.id},${!p.hidden})">${p.hidden?'👁️ إظهار':'🙈 إخفاء'}</button>
          <button class="btn" style="font-size:12px;padding:8px 12px" onclick="admDel(${p.id},'${p.image_path}')">🗑️ حذف نهائي</button>
          <button class="btn" style="font-size:12px;padding:8px 12px;background:var(--star);color:var(--ink)" onclick="admWeekAdd(${p.id})">🏆 رشّح</button>
          <button class="btn" style="font-size:12px;padding:8px 12px;background:var(--card2);border:1px solid var(--line);color:var(--txt)" onclick="admClearBadges(${p.id})">🗳️ مسح الأوسمة</button>
          <button class="btn" style="font-size:12px;padding:8px 12px;${p.profiles?.banned?'background:var(--palm)':'background:var(--card2);border:1px solid var(--line)'}" onclick="admBan('${p.user_id}',${!(p.profiles?.banned)})">${p.profiles?.banned?'فك الحظر':'⛔ حظر المصور'}</button>
          ${rc?`<button class="btn" style="font-size:12px;padding:8px 12px;background:var(--card2);border:1px solid var(--line)" onclick="admClear(${p.id})">مسح البلاغات</button>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}
async function admHide(id,hide){
  const { error } = await sb.from('photos').update({hidden:hide}).eq('id',id);
  if(error){toast('فشلت العملية',true);return}
  toast(hide?'أُخفيت الصورة':'أُظهرت الصورة');
  await openAdmin();await loadPhotos();
}
async function admDel(id,path){
  if(!confirm('حذف نهائي؟ لا يمكن التراجع.'))return;
  const { error } = await sb.from('photos').delete().eq('id',id);
  if(error){toast('فشل الحذف',true);return}
  await sb.storage.from('photos').remove([path]);
  toast('حُذفت الصورة نهائياً');
  await openAdmin();await loadPhotos();
}
async function admBan(uid,ban){
  if(ban&&!confirm('حظر المصور؟ لن يستطيع النشر أو التعليق.'))return;
  const { error } = await sb.from('profiles').update({banned:ban}).eq('id',uid);
  if(error){toast('فشلت العملية',true);return}
  toast(ban?'تم حظر المصور ⛔':'فُك الحظر');
  await openAdmin();
}
async function admClear(id){
  const { error } = await sb.from('reports').delete().eq('photo_id',id);
  if(error){toast('فشلت العملية',true);return}
  toast('مُسحت البلاغات');
  await openAdmin();
}


/* ====== إدارة لقطة الأسبوع ====== */
let CW=null;
async function loadAdmWeek(){
  $('admWk').innerHTML='<div class="empty">⏳</div>';
  const c=await sb.from('weekly_contest').select('*').order('id',{ascending:false}).limit(1).maybeSingle();
  CW=c.data||null;
  let entries=[];
  if(CW){
    const en=await sb.from('weekly_entries').select('photo_id').eq('contest_id',CW.id);
    const ids=(en.data||[]).map(e=>e.photo_id);
    entries=admPhotos.filter(p=>ids.includes(p.id));
    if(!admPhotos.length){
      const ph=await sb.from('photos').select('id,title').in('id',ids.length?ids:[0]);
      entries=ph.data||[];
    }
  }
  $('admWk').innerHTML=`
    <div style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px">
      <div style="font-weight:700;font-size:14px;margin-bottom:10px">🏆 مسابقة لقطة الأسبوع ${CW?`<span style="font-size:11px;padding:3px 10px;border-radius:10px;font-weight:700;${CW.active?'background:rgba(46,139,87,.15);color:var(--palm);border:1px solid var(--palm)':'background:var(--card2);color:var(--txt-dim);border:1px solid var(--line)'}">${CW.ended_at?'🏁 منتهية — الفائز أُعلن':(CW.active?'● نشطة الآن':'○ متوقفة')}</span>`:''}</div>
      <input id="wkLabel" placeholder="وسم الأسبوع (مثال: أسبوع الغروب)" value="${CW?esc(CW.week_label):''}" style="width:100%;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:11px 13px;color:var(--txt);font-family:'Tajawal';font-size:13px;outline:none;margin-bottom:8px">
      <input id="wkSponsor" placeholder="اسم الراعي (اختياري)" value="${CW?esc(CW.sponsor_name):''}" style="width:100%;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:11px 13px;color:var(--txt);font-family:'Tajawal';font-size:13px;outline:none;margin-bottom:8px">
      <input id="wkPrize" placeholder="الجائزة (اختياري)" value="${CW?esc(CW.prize):''}" style="width:100%;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:11px 13px;color:var(--txt);font-family:'Tajawal';font-size:13px;outline:none;margin-bottom:10px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${CW&&CW.ended_at?'':'<button class="btn" style="flex:1" onclick="admWeekSave()">'+(CW?'💾 حفظ البيانات':'➕ إنشاء المسابقة')+'</button>'}
        ${CW&&!CW.ended_at?`<button class="btn" style="flex:1;${CW.active?'background:var(--card2);border:1px solid var(--line);color:var(--txt)':'background:var(--palm)'}" onclick="admWeekToggle()">${CW.active?'⏸️ إيقاف':'▶️ تفعيل للجمهور'}</button>`:''}
        ${CW&&CW.active?`<button class="btn" style="flex:1;background:var(--star);color:var(--ink)" onclick="admWeekEnd()">🏁 إنهاء وإعلان الفائز</button>`:''}
        ${CW&&CW.ended_at?`<button class="btn" style="flex:1;background:var(--palm)" onclick="admWeekNew()">➕ مسابقة جديدة</button>`:''}
        ${CW?`<button class="btn" style="flex:0 0 auto;background:var(--sadu)" onclick="admWeekDelete()">🗑️</button>`:''}
      </div>
    </div>
    <div style="font-weight:700;font-size:14px;margin-bottom:8px">اللقطات المرشحة (${entries.length}/5) <span style="font-size:11px;color:var(--txt-dim);font-weight:400">— رشّح من تبويب 🗂️ بزر 🏆</span></div>
    ${entries.length?entries.map(p=>`
      <div style="display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin-bottom:8px">
        <div style="flex:1"><b style="font-size:13px">#${p.id} · ${esc(p.title)}</b></div>
        <button class="btn" style="font-size:12px;padding:7px 12px;background:var(--card2);border:1px solid var(--line);color:var(--txt)" onclick="admWeekRemove(${p.id})">إزالة</button>
      </div>`).join(''):'<div class="empty" style="padding:20px">ما فيه ترشيحات بعد</div>'}` + await admSpBlock() + admMaintBlock();
}
/* ====== بنر الراعي ====== */
async function admSpBlock(){
  const r=await sb.from('site_banner').select('*').eq('id',1).maybeSingle();
  const b=r.data||{active:false,image_path:'',link_url:''};
  window.__SPB=b;
  return `
  <div style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:16px">
    <div style="font-weight:700;font-size:14px;margin-bottom:6px">📣 بنر الراعي (رأس الصفحة) ${b.active?'<span style="font-size:11px;color:var(--palm);font-weight:700">● ظاهر</span>':'<span style="font-size:11px;color:var(--txt-dim)">○ مخفي</span>'}</div>
    <div style="font-size:11.5px;color:var(--txt-dim);margin-bottom:10px;line-height:1.8">📐 مقاس التصميم: <b>1600 × 400 بكسل</b> (نسبة 4:1) · JPG أو PNG · يفضل أقل من 300KB</div>
    ${b.image_path?`<img src="${imgUrl(b.image_path)}" style="width:100%;aspect-ratio:4/1;object-fit:cover;border-radius:10px;border:1px solid var(--line);margin-bottom:10px">`:''}
    <input type="file" id="spFile" accept="image/*" style="display:none" onchange="admSpUpload(this.files[0])">
    <input id="spLink" placeholder="رابط الراعي عند الضغط (اختياري)" value="${esc(b.link_url)}" style="width:100%;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:11px 13px;color:var(--txt);font-family:'Tajawal';font-size:13px;outline:none;margin-bottom:10px;direction:ltr;text-align:left">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" style="flex:1" onclick="$('spFile').click()">📤 ${b.image_path?'تغيير الصورة':'رفع صورة البنر'}</button>
      <button class="btn" style="flex:1;background:var(--card2);border:1px solid var(--line);color:var(--txt)" onclick="admSpSaveLink()">💾 حفظ الرابط</button>
      ${b.image_path?`<button class="btn" style="flex:1;${b.active?'background:var(--card2);border:1px solid var(--line);color:var(--txt)':'background:var(--palm)'}" onclick="admSpToggle()">${b.active?'🙈 إخفاء':'👁️ تفعيل'}</button>`:''}
      ${b.image_path?`<button class="btn" style="flex:0 0 auto;background:var(--sadu)" onclick="admSpDelete()">🗑️ حذف</button>`:''}
    </div>
  </div>`;
}
async function admSpUpload(f){
  if(!f)return;
  toast('⏳ جاري رفع البنر...');
  const blob=await compressTo(f,1600,0.88);
  const path=`banners/sponsor_${Date.now()}.jpg`;
  const up=await sb.storage.from('photos').upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000'});
  if(up.error){toast('فشل الرفع: '+up.error.message,true);return}
  const {error}=await sb.from('site_banner').update({image_path:path,updated_at:new Date().toISOString()}).eq('id',1);
  if(error){toast('فشل الحفظ',true);return}
  toast('ارتفع البنر ✅ — فعّله متى ما جهزت');
  await loadAdmWeek();loadSponsor();
}
async function admSpSaveLink(){
  const {error}=await sb.from('site_banner').update({link_url:$('spLink').value.trim()}).eq('id',1);
  if(error){toast('فشل الحفظ',true);return}
  toast('انحفظ الرابط ✅');loadSponsor();
}
async function admSpToggle(){
  const b=window.__SPB;
  const {error}=await sb.from('site_banner').update({active:!b.active}).eq('id',1);
  if(error){toast('فشلت العملية',true);return}
  toast(b.active?'اختفى البنر':'انطلق البنر برأس الصفحة 📣');
  await loadAdmWeek();loadSponsor();
}

async function admWeekSave(){
  const data={week_label:$('wkLabel').value.trim(),sponsor_name:$('wkSponsor').value.trim(),prize:$('wkPrize').value.trim()};
  const q=CW?sb.from('weekly_contest').update(data).eq('id',CW.id):sb.from('weekly_contest').insert({...data,active:false});
  const {error}=await q;
  if(error){toast('تعذر الحفظ: '+error.message,true);return}
  toast('انحفظت المسابقة ✅');await loadAdmWeek();await loadWeek();
}
async function admWeekToggle(){
  const {error}=await sb.from('weekly_contest').update({active:!CW.active}).eq('id',CW.id);
  if(error){toast('فشلت العملية',true);return}
  toast(CW.active?'أُوقفت المسابقة':'انطلقت المسابقة للجمهور 🎉');
  await loadAdmWeek();await loadWeek();
}
async function admWeekAdd(pid){
  if(!CW){toast('أنشئ المسابقة أول من تبويب 🏆',true);return}
  if(CW.ended_at){toast('المسابقة منتهية — أنشئ جديدة من تبويب 🏆',true);return}
  const en=await sb.from('weekly_entries').select('photo_id').eq('contest_id',CW.id);
  if((en.data||[]).length>=5){toast('اكتمل العدد — 5 لقطات كحد أقصى',true);return}
  const {error}=await sb.from('weekly_entries').insert({contest_id:CW.id,photo_id:pid});
  if(error){toast(error.code==='23505'?'مرشحة من قبل':'تعذر الترشيح',true);return}
  toast('انضافت للترشيحات 🏆');
}
async function admWeekRemove(pid){
  await sb.from('weekly_entries').delete().eq('contest_id',CW.id).eq('photo_id',pid);
  toast('أُزيلت');await loadAdmWeek();
}

async function admWeekEnd(){
  const bd=await sb.from('weekly_board').select('*').eq('contest_id',CW.id);
  let win=null,mx=0;(bd.data||[]).forEach(r=>{if(r.votes>mx){mx=r.votes;win=r.photo_id}});
  if(!win){if(!confirm('ما فيه أصوات بعد — إنهاء المسابقة بدون فائز؟'))return}
  else if(!confirm('إنهاء المسابقة وإعلان الفائز؟ يظهر التتويج بالرئيسية لمدة أسبوع.'))return;
  const {error}=await sb.from('weekly_contest').update({active:false,ended_at:new Date().toISOString(),winner_photo_id:win}).eq('id',CW.id);
  if(error){toast('فشل الإنهاء: '+error.message,true);return}
  toast(win?'أُعلن الفائز — مبروك للمتوّج 👑':'أُنهيت المسابقة');
  await loadAdmWeek();await loadWeek();
}
async function admWeekNew(){
  const {error}=await sb.from('weekly_contest').insert({active:false});
  if(error){toast('تعذر الإنشاء',true);return}
  toast('مسابقة جديدة جاهزة للتجهيز ✨');
  await loadAdmWeek();
}

async function admSpDelete(){
  const b=window.__SPB;
  if(!confirm('حذف بنر الراعي نهائياً؟ الصورة تنمسح من المخزن والإعدادات تتصفّر.'))return;
  if(b.image_path)await sb.storage.from('photos').remove([b.image_path]).catch(()=>{});
  const {error}=await sb.from('site_banner').update({active:false,image_path:'',link_url:''}).eq('id',1);
  if(error){toast('فشل الحذف',true);return}
  toast('انحذف البنر نهائياً 🗑️');
  await loadAdmWeek();loadSponsor();
}

async function admWeekDelete(){
  if(!confirm(`حذف مسابقة «${CW.week_label||'بلا وسم'}» نهائياً؟ تنمسح بترشيحاتها وأصواتها، ويختفي أي تتويج مرتبط بها من الرئيسية.`))return;
  const {error}=await sb.from('weekly_contest').delete().eq('id',CW.id);
  if(error){toast('فشل الحذف: '+error.message,true);return}
  toast('انحذفت المسابقة 🗑️');
  await loadAdmWeek();await loadWeek();
}

async function admClearBadges(pid){
  const pick=prompt(
'مسح أوسمة الصورة #'+pid+' — اكتب الرقم:\n\n'+
'0 = الكل (تصفير شامل)\n'+
'1 = 📱 تصلح خلفية شاشة\n'+
'2 = ❤️ بحطها خلفية جوالي\n'+
'3 = 🌍 مسابقات عالمية\n'+
'4 = 🇸🇦 واجهة تشرّف السعودية\n'+
'5 = 🖼️ تستاهل تنطبع لوحة','0');
  if(pick===null)return;
  const keys={1:'wall',2:'mine',3:'global',4:'face',5:'print'};
  let q=sb.from('badge_votes').delete().eq('photo_id',pid);
  const k=keys[pick.trim()];
  if(pick.trim()!=='0'&&!k){toast('اكتب رقماً من 0 إلى 5',true);return}
  if(k)q=q.eq('badge_key',k);
  const {error}=await q;
  if(error){toast('فشل المسح: '+error.message,true);return}
  toast(k?'انمسح الوسام المحدد 🗳️':'انصفرت كل أوسمة الصورة 🗳️');
  await loadPhotos();openAdmin();
}

/* ====== وضع الصيانة ====== */
function admMaintBlock(){
  const b=window.__SPB||{};
  const on=!!b.maintenance;
  return `
  <div style="background:var(--card);border:1.5px solid ${on?'var(--star)':'var(--line)'};border-radius:14px;padding:14px;margin-top:16px">
    <div style="font-weight:700;font-size:14px;margin-bottom:6px">🚧 وضع الصيانة (تحت الإنشاء) ${on?'<span style="font-size:11px;color:#A87500;font-weight:700">● مفعل — الزوار محجوبون</span>':'<span style="font-size:11px;color:var(--txt-dim)">○ مطفأ</span>'}</div>
    <div style="font-size:11.5px;color:var(--txt-dim);margin-bottom:10px;line-height:1.8">عند التفعيل: الزوار يشوفون صفحة «تحت التطوير» — وأنت كمشرف تتصفح وتشتغل عادي.</div>
    <input id="mtMsg" placeholder="رسالة اختيارية للزوار (مثال: نرجع لكم الساعة 9)" value="${esc(b.maintenance_msg||'')}" style="width:100%;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:11px 13px;color:var(--txt);font-family:'Tajawal';font-size:13px;outline:none;margin-bottom:10px">
    <div style="display:flex;gap:8px">
      <button class="btn" style="flex:1;background:var(--card2);border:1px solid var(--line);color:var(--txt)" onclick="admMaintSaveMsg()">💾 حفظ الرسالة</button>
      <button class="btn" style="flex:1;${on?'background:var(--palm)':'background:var(--star);color:var(--ink)'}" onclick="admMaintToggle()">${on?'▶️ إعادة فتح الموقع':'🚧 تفعيل الصيانة'}</button>
    </div>
  </div>`;
}
async function admMaintToggle(){
  const b=window.__SPB||{};
  const to=!b.maintenance;
  if(to&&!confirm('تفعيل وضع الصيانة؟ كل الزوار (عدا المشرفين) بيشوفون صفحة تحت التطوير.'))return;
  const {error}=await sb.from('site_banner').update({maintenance:to,maintenance_msg:$('mtMsg').value.trim()}).eq('id',1);
  if(error){toast('فشلت العملية: '+error.message,true);return}
  toast(to?'الموقع دخل وضع الصيانة 🚧':'الموقع رجع مفتوحاً للجميع 🎉');
  await loadAdmWeek();
}
async function admMaintSaveMsg(){
  const {error}=await sb.from('site_banner').update({maintenance_msg:$('mtMsg').value.trim()}).eq('id',1);
  if(error){toast('فشل الحفظ',true);return}
  toast('انحفظت الرسالة ✅');
}
