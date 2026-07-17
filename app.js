/* صورة من بلدي — app.js | نسخة المختبر م1 */
/* ============ إعداد Supabase ============ */
/* حارس الإقلاع — رسالة واضحة بدل موت صامت */
if(typeof supabase==='undefined'){
  document.body.innerHTML='<div style="padding:60px 30px;text-align:center;font-family:Tajawal,sans-serif;color:#241F1C"><div style="font-size:40px">⚠️</div><h2>تعذر تحميل مكتبة الاتصال</h2><p>تأكد أن ملف supabase.js مرفوع مع الموقع ثم حدّث الصفحة</p></div>';
  window.__BOOT_FAIL=true;
  throw new Error('supabase.js missing');
}
const SB_URL = "https://gquzjaxpqeggknhipmzk.supabase.co";
const SB_KEY = "sb_publishable_BNp6Fg3VLXa1Pf4V6QjncQ_f496PquX";
const sb = supabase.createClient(SB_URL, SB_KEY);
let USER = null;

/* مراقب الأخطاء — يعرض أي خطأ تشغيلي على الشاشة */
window.addEventListener('error', e=>{
  const t=document.getElementById('toast');
  if(t){t.textContent='⚠️ خطأ: '+(e.message||'غير معروف');t.className='toast err';t.style.display='block';setTimeout(()=>t.style.display='none',6000)}
});
window.addEventListener('unhandledrejection', e=>{
  const t=document.getElementById('toast');
  if(t){t.textContent='⚠️ خطأ: '+(e.reason?.message||e.reason||'غير معروف');t.className='toast err';t.style.display='block';setTimeout(()=>t.style.display='none',6000)}
});

async function ensureAuth(){
  const { data:{ session } } = await sb.auth.getSession();
  if (session) { USER = session.user; return; }
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) { toast("تعذر الاتصال بالحساب — تأكد من تفعيل Anonymous Sign-ins", true); throw error; }
  USER = data.user;
}
async function saveName(name){
  if(!name || !USER) return;
  await sb.from('profiles').update({ display_name: name }).eq('id', USER.id);
}
