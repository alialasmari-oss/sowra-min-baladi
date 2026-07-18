/* صورة من بلدي — main.js | نسخة المختبر م1 */
/* ============ التنقل ============ */
function go(p){
  if(p==='add' && (!USER || USER.is_anonymous)){
    toast('سجّل أول عشان تنشر صورك باسمك 📸');
    p='acc';
    $('accOut').style.display='block';$('accIn').style.display='none';
  }
  if(p==='adm' && !IS_ADMIN)p='feed';
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('on'));
  $('page-'+p).classList.add('on');
  $('nb-feed').classList.toggle('on',p==='feed');
  $('nb-favs').classList.toggle('on',p==='favs');
  $('nb-msgs').classList.toggle('on',p==='msgs');
  $('nb-acc').classList.toggle('on',p==='acc');
  const fb=$('fab');if(fb)fb.style.display=(p==='add')?'none':'block';
  window.scrollTo(0,0);
}

/* ============ البداية ============ */
(async()=>{
  if(window.__BOOT_FAIL)return;
  initSelects();fillAddCities();
  // الدخول بالخلفية — والمحتوى العام يتحمل فوراً بالتوازي
  const authP=ensureAuth().then(()=>{checkAdmin();loadFavs();}).catch(e=>toast('تعذر الاتصال بالحساب',true));
  try{await Promise.all([loadPlaces(),loadPhotos()]);
  loadWeek();loadSponsor();}
  catch(e){$('feed').innerHTML=`<div class="empty"><span class="big">⚠️</span>تعذر تحميل الصور<br>${e.message||''}</div>`}
  await authP;
  // 🚧 وضع الصيانة — يحجب الزوار ويستثني المشرف
  try{
    const r=await sb.from('site_banner').select('maintenance,maintenance_msg').eq('id',1).maybeSingle();
    if(r.data&&r.data.maintenance){
      if(!IS_ADMIN)showMaintenance(r.data.maintenance_msg);
      else{
        const chip=document.createElement('div');
        chip.style.cssText='position:fixed;top:10px;left:10px;z-index:9000;background:#FFF4D6;border:1.5px solid var(--star);border-radius:12px;padding:6px 13px;font-size:11.5px;font-weight:700;color:#A87500;box-shadow:0 2px 8px rgba(0,0,0,.15)';
        chip.textContent='🚧 وضع الصيانة مفعل — الزوار محجوبون';
        document.body.appendChild(chip);
      }
    }
  }catch(e){}
})();

function showMaintenance(msg){
  document.body.innerHTML=`
  <div style="position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;font-family:'Tajawal'">
    <div style="height:16px;width:100%;position:absolute;top:0;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='16' viewBox='0 0 128 16'%3E%3Crect width='128' height='16' fill='%23F7F1E3'/%3E%3Cpath d='M0 15 L16 2 L32 15 Z' fill='%23D63A2F' stroke='%23241F1C' stroke-width='1.6'/%3E%3Cpath d='M32 15 L48 2 L64 15 Z' fill='%232E6FB7' stroke='%23241F1C' stroke-width='1.6'/%3E%3Cpath d='M64 15 L80 2 L96 15 Z' fill='%23F2B33D' stroke='%23241F1C' stroke-width='1.6'/%3E%3Cpath d='M96 15 L112 2 L128 15 Z' fill='%232E8B57' stroke='%23241F1C' stroke-width='1.6'/%3E%3C/svg%3E\");background-repeat:repeat-x"></div>
    <div style="font-size:64px;margin-bottom:14px">🚧</div>
    <div style="font-family:'Reem Kufi';font-size:26px;color:var(--sadu);margin-bottom:10px">الموقع تحت التطوير</div>
    <div style="font-size:15px;color:var(--txt-dim);line-height:2;max-width:400px">${msg?msg.replace(/</g,'&lt;'):'نجهّز لكم شيئاً أجمل — نرجع قريباً بإذن الله 🇸🇦📸'}</div>
    <div style="margin-top:26px;font-size:12px;color:var(--sand-dim)">صورة من بلدي — عدسات أهل الديار</div>
  </div>`;
}
