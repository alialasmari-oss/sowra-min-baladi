/* صورة من بلدي — auth.js | نسخة المختبر م1 */
/* ============ وضع المشرف ============ */
let IS_ADMIN=false,admTab='rep';
let admPhotos=[],admReps={};

async function checkAdmin(){
  if(!USER||USER.is_anonymous){IS_ADMIN=false;$('admGear').style.display='none';return false}
  const { data } = await sb.from('admins').select('id').maybeSingle();
  IS_ADMIN=!!data;
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
