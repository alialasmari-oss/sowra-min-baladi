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
  if(msg)$('maintMsg').textContent=msg;
  $('maintScreen').classList.add('on');
  document.body.style.overflow='hidden';
}
function hideMaintenance(){
  $('maintScreen').classList.remove('on');
  document.body.style.overflow='';
}
