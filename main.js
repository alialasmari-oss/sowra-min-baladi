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
  // 🚧 فحص الصيانة أولاً — الزائر المحجوب لا يتحمّل له محتوى أصلاً
  const mt=await sb.from('site_banner').select('maintenance,maintenance_msg').eq('id',1).maybeSingle().then(r=>r.data,()=>null);
  if(mt&&mt.maintenance){
    showMaintenance(mt.maintenance_msg); // الستارة تنزل فوراً على الجميع
    await authP;
    if(!IS_ADMIN)return; // الزائر يبقى خلف الستارة
    hideMaintenance(); // المشرف: ترتفع له وحده ويكمل
    const chip=document.createElement('div');
    chip.className='maint-chip';
    chip.textContent='🚧 وضع الصيانة مفعل — الزوار محجوبون';
    document.body.appendChild(chip);
  }
  try{await Promise.all([loadPlaces(),loadPhotos()]);
  loadWeek();loadSponsor();}
  catch(e){$('feed').innerHTML=`<div class="empty"><span class="big">⚠️</span>تعذر تحميل الصور<br>${e.message||''}</div>`}
  await authP;
})();

function showMaintenance(msg){
  if($('maintScreen'))return;
  document.body.style.overflow='hidden';
  const d=document.createElement('div');
  d.id='maintScreen';
  const strip=document.createElement('div');
  strip.className='maint-strip';
  strip.style.backgroundImage="url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22128%22 height=%2216%22><rect width=%22128%22 height=%2216%22 fill=%22%23F7F1E3%22/><path d=%22M0 15 L16 2 L32 15 Z%22 fill=%22%23D63A2F%22 stroke=%22%23241F1C%22 stroke-width=%221.6%22/><path d=%22M32 15 L48 2 L64 15 Z%22 fill=%22%232E6FB7%22 stroke=%22%23241F1C%22 stroke-width=%221.6%22/><path d=%22M64 15 L80 2 L96 15 Z%22 fill=%22%23F2B33D%22 stroke=%22%23241F1C%22 stroke-width=%221.6%22/><path d=%22M96 15 L112 2 L128 15 Z%22 fill=%22%232E8B57%22 stroke=%22%23241F1C%22 stroke-width=%221.6%22/></svg>')";
  d.appendChild(strip);
  const ic=document.createElement('div');ic.className='maint-ic';ic.textContent='🚧';d.appendChild(ic);
  const ti=document.createElement('div');ti.className='maint-title';ti.textContent='الموقع تحت التطوير';d.appendChild(ti);
  const bo=document.createElement('div');bo.className='maint-msg';bo.textContent=msg||'نجهّز لكم شيئاً أجمل — نرجع قريباً بإذن الله 🇸🇦📸';d.appendChild(bo);
  const fo=document.createElement('div');fo.className='maint-foot';fo.textContent='صورة من بلدي — عدسات أهل الديار';d.appendChild(fo);
  document.body.appendChild(d);
}
function hideMaintenance(){
  const d=$('maintScreen');
  if(d)d.remove();
  document.body.style.overflow='';
}
