/* صورة من بلدي — auth.js | نسخة المختبر م1 */
/* ============ وضع المشرف ============ */
let IS_ADMIN=false,admTab='rep';
let admPhotos=[],admReps={};

async function checkAdmin(){
  if(!USER||USER.is_anonymous){IS_ADMIN=false;try{localStorage.removeItem('sowra_admin')}catch(e){}$('admGear').style.display='none';return false}
  const { data } = await sb.from('admins').select('id').maybeSingle();
  IS_ADMIN=!!data;
  try{IS_ADMIN?localStorage.setItem('sowra_admin','1'):localStorage.removeItem('sowra_admin')}catch(e){}
  $('admGear').style.display=IS_ADMIN?'block':'none';
  return IS_ADMIN;
}

/* ============ الحساب الموحد ============ */
let accMode='in';
function openAcc(){
  if(USER && !USER.is_anonymous)renderAccIn();
  else{$('accOut').style.display='block';$('accIn').style.display='none'}
  go('acc');
}
function accTab(m){
  accMode=m;
  $('accTabIn').classList.toggle('on',m==='in');
  $('accTabUp').classList.toggle('on',m==='up');
  $('accNameGrp').style.display=m==='up'?'block':'none';
  $('pledgeBox').style.display=m==='up'?'block':'none';
  $('accGo').textContent=m==='up'?'إنشاء الحساب':'دخول';
}
async function renderAccIn(){
  const { data } = await sb.from('profiles').select('display_name').eq('id',USER.id).maybeSingle();
  $('accHello').textContent='هلا '+(data?.display_name||'مصوّر');
  $('accEditName').value=data?.display_name||'';
  $('accMail').textContent=USER.email||'';
  $('accAdminBtn').style.display=IS_ADMIN?'block':'none';
  $('accOut').style.display='none';$('accIn').style.display='block';
  renderMyStats();
}
async function renderMyStats(){
  const el=$('myStats');if(!el)return;
  el.innerHTML='<div style="text-align:center;padding:10px;color:var(--txt-dim)">⏳</div>';
  try{
    const [fo,ph]=await Promise.all([
      sb.from('follows').select('follower_id',{count:'exact',head:true}).eq('followed_id',USER.id),
      sb.from('photos_ranked').select('id,title,views,comments_count,avg_stars').eq('user_id',USER.id).order('created_at',{ascending:false})
    ]);
    const list=ph.data||[];
    const totV=list.reduce((s,p)=>s+(p.views||0),0);
    el.innerHTML=`<div style="font-weight:700;font-size:15px;margin:6px 0 10px">📊 إحصائياتي</div>
      <div class="mst-row"><span>👥 متابعوني</span><b>${fo.count||0}</b></div>
      <div class="mst-row"><span>📸 صوري المنشورة</span><b>${list.length}</b></div>
      <div class="mst-row"><span>👁️ مجموع المشاهدات</span><b>${totV}</b></div>
      ${list.length?`<div style="font-size:12px;color:var(--txt-dim);margin:10px 0 6px">تفاصيل كل صورة — مشاهدات · تعليقات · تقييم:</div>`:''}
      ${list.map(p=>`<div class="mst-photo"><span class="t">${esc(p.title)}</span><span>👁️ ${p.views||0}</span><span>💬 ${p.comments_count||0}</span><span>⭐ ${Number(p.avg_stars).toFixed(1)}</span></div>`).join('')}`;
  }catch(e){el.innerHTML='<div style="font-size:12px;color:var(--txt-dim)">تعذر تحميل الإحصائيات — نفّذ سكربت v12</div>'}
}
async function saveMyName(){
  const name=$('accEditName').value.trim();
  if(!name)return toast('اكتب اسم',true);
  const { error } = await sb.from('profiles').update({display_name:name}).eq('id',USER.id);
  if(error){toast('تعذر الحفظ',true);return}
  $('accHello').textContent='هلا '+name;
  toast('انحفظ اسمك ✅');
  await loadPhotos();
}
async function accSubmit(){
  const email=$('accEmail').value.trim(),pass=$('accPass').value;
  if(!email||!pass)return toast('عبّي الإيميل وكلمة السر',true);
  const b=$('accGo');b.disabled=true;const old=b.textContent;b.textContent='⏳';
  try{
    if(accMode==='up'){
      const name=$('accName').value.trim();
      if(!name){toast('اكتب اسمك',true);return}
      if(!$('pledgeChk').checked){toast('لازم توافق على الشروط والتعهد أول ✋',true);return}
      const { data, error } = await sb.auth.signUp({
        email,password:pass,options:{data:{display_name:name}}
      });
      if(error)throw error;
      if(!data.session){toast('أُرسل رابط تأكيد لإيميلك 📧');return}
      USER=data.session.user;
    }else{
      const { error } = await sb.auth.signInWithPassword({email,password:pass});
      if(error)throw error;
      const { data:{ session } } = await sb.auth.getSession();
      USER=session.user;
    }
    await checkAdmin();
    await renderAccIn();
    toast(IS_ADMIN?'أهلاً بالمشرف 👮':'حياك الله 🌟');
    if(IS_ADMIN)openAdmin();
    await loadPhotos();
  }catch(e){
    toast(e.message&&e.message.includes('Invalid')?'بيانات الدخول غير صحيحة':(e.message||'تعذرت العملية'),true);
  }finally{b.disabled=false;b.textContent=old}
}
async function accLogout(){await sb.auth.signOut();location.reload()}
async function admLogout(){await accLogout()}

/* ====== رسائلي ====== */
function openMsgs(){
  go('msgs');
  loadMyMsgs();
}
async function loadMyMsgs(){
  const el=$('myMsgs');if(!el)return;
  if(!USER){el.innerHTML='';return}
  el.innerHTML='<div style="text-align:center;color:var(--txt-dim);padding:8px">⏳</div>';
  try{
    const r=await sb.from('feedback').select('*').eq('user_id',USER.id).order('created_at',{ascending:false});
    const list=r.data||[];
    el.innerHTML=(list.length?'<div style="font-weight:700;font-size:14px;margin-bottom:10px">سجل رسائلك:</div>':'')
      +(list.map(m=>`
      <div class="msg-card">
        <div class="mk">
          <span>${(typeof FB_AR!=='undefined'&&FB_AR[m.kind])||m.kind} · ${new Date(m.created_at).toLocaleDateString('ar-SA')}</span>
          <span class="msg-st ${m.status==='new'?'new':'done'}">${m.status==='new'?'⏳ قيد المراجعة':'✅ تمت المعالجة'}</span>
        </div>
        <div class="mb">${esc(m.body)}</div>
        ${m.reply?`<div class="msg-reply"><b>رد الإدارة:</b><br>${esc(m.reply)}</div>`:''}
      </div>`).join('')||'<div class="empty" style="padding:18px">ما أرسلت رسائل بعد</div>');
  }catch(e){el.innerHTML='<div class="empty" style="padding:14px">نفّذ سكربت v15 لعرض السجل</div>'}
}
