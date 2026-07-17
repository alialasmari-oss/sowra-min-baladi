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
  window.scrollTo(0,0);
}
function goTop(){go('feed');setSort('top');$('fRegion').value='';fillCities();$('q').value='';render()}

/* ============ البداية ============ */
(async()=>{
  if(window.__BOOT_FAIL)return;
  initSelects();fillAddCities();
  // الدخول بالخلفية — والمحتوى العام يتحمل فوراً بالتوازي
  const authP=ensureAuth().then(()=>checkAdmin()).catch(e=>toast('تعذر الاتصال بالحساب',true));
  try{await Promise.all([loadPlaces(),loadPhotos()]);
  loadWeek();loadSponsor();}
  catch(e){$('feed').innerHTML=`<div class="empty"><span class="big">⚠️</span>تعذر تحميل الصور<br>${e.message||''}</div>`}
  await authP;
})();
