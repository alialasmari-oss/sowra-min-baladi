let _viewMode='grid';

/* ====== الفلتر الموحد ====== */
let _cat='all', _sort='top';
function toggleFilter(){
  const d=$('filterDrawer');
  const open=d.style.display==='none';
  d.style.display=open?'block':'none';
  $('filterBtn').classList.toggle('active',open);
}
function fdSetCat(el,k){
  _cat=k;
  document.querySelectorAll('.fd-chips .fd-chip[data-k]').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
}
function fdSetSort(el,s){
  _sort=s;
  document.querySelectorAll('.fd-chips .fd-chip[data-s]').forEach(b=>b.classList.toggle('on',b.dataset.s===s));
}
function applyFilter(){
  catFilter=_cat;
  sortMode=_sort;
  $('filterDrawer').style.display='none';
  $('filterBtn').classList.remove('active');
  const badge=$('filterBadge');
  badge.style.display=(catFilter!=='all'||_sort!=='top')?'inline':'none';
  $('abroadHint').style.display=sortMode==='abroad'?'block':'none';
  if(_viewMode==='map'){renderMap();}else{render();}
}
function clearFilter(){
  _cat='all';_sort='top';
  document.querySelectorAll('.fd-chip[data-k]').forEach(b=>b.classList.toggle('on',b.dataset.k==='all'));
  document.querySelectorAll('.fd-chip[data-s]').forEach(b=>b.classList.toggle('on',b.dataset.s==='top'));
  catFilter='all';sortMode='top';
  $('filterBadge').style.display='none';
  $('abroadHint').style.display='none';
  $('filterDrawer').style.display='none';
  $('filterBtn').classList.remove('active');
  render();
}

/* ====== الأقرب إليك ====== */
function showNearby(){
  if(!navigator.geolocation){return}
  navigator.geolocation.getCurrentPosition(pos=>{
    const{latitude:lat,longitude:lng}=pos.coords;
    window.__USER_LAT=lat;window.__USER_LNG=lng;
    // لو الخريطة مفتوحة — أضف دبوس موقعك الآن
    if(MAP)addUserPin(lat,lng);
    const dist=(p)=>Math.hypot((p.lat||0)-lat,(p.lng||0)-lng);
    const near=photos.filter(p=>p.lat&&p.lng).sort((a,b)=>dist(a)-dist(b)).slice(0,6);
    if(!near.length)return;
    $('nearbyWrap').style.display='block';
    $('nearbyFeed').innerHTML=near.map(p=>`
      <div class="card" onclick="openSheet(${p.id})">
        <div class="ph"><img src="${thumbUrl(p.image_path)}" loading="lazy" alt="${esc(p.title)}">
          <div class="loc-chip">📍 ${esc(p.village||p.city)}</div>
        </div>
        <div class="card-body">
          <div class="card-title">${esc(p.title)}</div>
          <div class="card-meta"><span>⭐ ${Number(p.avg_stars).toFixed(1)}</span></div>
        </div>
      </div>`).join('');
  },()=>{},{timeout:5000});
}

/* ====== البنر الترحيبي مرة وحدة ====== */
function initHero(){
  const el=$('hero');if(!el)return;
  try{
    if(localStorage.getItem('sowra_hero_seen')){el.style.display='none';return;}
    el.style.display='block';
  }catch(e){el.style.display='block';}
}
function closeHero(){
  $('hero').style.display='none';
  try{localStorage.setItem('sowra_hero_seen','1')}catch(e){}
}

/* ====== البنر الجانبي للراعي ====== */
function renderSponsorSide(){
  const el=$('sponsorSide');if(!el)return;
  const sp=window.__SPDATA;
  if(!sp||!sp.side_active){el.style.display='none';return}
  el.style.display='flex';
  el.innerHTML=(sp.image_path?`<img src="${imgUrl(sp.image_path)}" alt="${esc(sp.sponsor_name||'')}">`:'')+
    `<div class="sp-info">
      <div class="sp-name">${esc(sp.sponsor_name||'راعي المنصة')}</div>
      <div class="sp-cat">${esc(sp.sponsor_cat||'')}</div>
    </div>
    <button class="sp-side-btn" onclick="openSponsorsPage()">عروضنا ←</button>`;
}

/* صورة من بلدي — photos.js | نسخة المختبر م1 */
/* ============ الأوسمة ============ */
const BADGES = [
  {k:'wall',  label:'📱 خلفية شاشة'},
  {k:'mine',  label:'❤️ بحطها خلفية جوالي'},
  {k:'global',label:'🌍 تدخل مسابقات عالمية'},
  {k:'face',  label:'🇸🇦 واجهة تشرّف السعودية'},
  {k:'print', label:'🖼️ تستاهل تنطبع لوحة'}
];
function topBadge(p){
  const b=p.badge_counts||{};let best=null,bv=0;
  for(const bd of BADGES)if((b[bd.k]||0)>bv){bv=b[bd.k];best=bd}
  return bv>=2?best:null;
}

/* ============ الحالة ============ */
let photos=[], sortMode='top', curId=null, curPhoto=null, catFilter='all';

let myRating=0, myBadgeSet=new Set();
const $=id=>document.getElementById(id);
/* تعقيم النصوص — يمنع حقن أي كود في الصفحة */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const starsTxt=v=>{let f=Math.round(v);return "★".repeat(f)+"☆".repeat(5-f)};
function toast(m,err){const t=$('toast');t.textContent=m;t.className='toast'+(err?' err':'');t.style.display='block';setTimeout(()=>t.style.display='none',2600)}
function imgUrl(path){return sb.storage.from('photos').getPublicUrl(path).data.publicUrl}

/* ============ تحميل الصور ============ */
async function loadPhotos(){
  const { data, error } = await sb.from('photos_ranked').select('*');
  if(error){$('feed').innerHTML=`<div class="empty"><span class="big">⚠️</span>تعذر تحميل الصور<br>${error.message}</div>`;return}
  photos = data || [];
  if(typeof _viewMode!=='undefined'&&_viewMode==='map'){renderMap();}
  else{render();}
}

/* ============ الفلاتر والعرض ============ */
function initSelects(){
  const fr=$('fRegion'),ar=$('aRegion');
  fr.innerHTML='<option value="">كل المناطق</option>';
  ar.innerHTML='<option value="">اختر المنطقة</option>';
  for(const r in GEO){fr.innerHTML+=`<option>${r}</option>`;ar.innerHTML+=`<option>${r}</option>`;}
}
function fillCities(){
  const r=$('fRegion').value,c=$('fCity');
  c.innerHTML='<option value="">كل المدن</option>';
  if(r)GEO[r].forEach(x=>c.innerHTML+=`<option>${x}</option>`);
}
function fillAddCities(){
  const r=$('aRegion').value,c=$('aCity');
  c.innerHTML='<option value="">اختر المدينة</option>';
  if(r)GEO[r].forEach(x=>c.innerHTML+=`<option>${x}</option>`);
  $('villList').innerHTML=(r&&VILL[r]?VILL[r]:[]).map(v=>`<option value="${v}">`).join('');
}


function render(){
  if(_viewMode==='map')return;
  const q=$('q').value.trim(), r=$('fRegion').value, c=$('fCity').value;
  const mw=$('mapWrap');if(mw)mw.style.display='none';
  $('feed').style.display='';
  const abroadView=sortMode==='abroad';
  let list=photos.filter(p=>!!p.abroad===abroadView);
  if(catFilter!=='all')list=list.filter(p=>(p.category||'other')===catFilter);
  if(abroadView){
    list=list.filter(p=>!q||p.title.includes(q)||(p.country||'').includes(q));
    list.sort((a,b)=>(b.avg_stars-a.avg_stars)||(b.ratings_count-a.ratings_count)||(new Date(b.created_at)-new Date(a.created_at)));
  }else{
    list=list.filter(p=>
      (!r||p.region===r)&&(!c||p.city===c)&&
      (!q||p.title.includes(q)||(p.village||'').includes(q)||p.city.includes(q)||p.region.includes(q))
    );
    list.sort((a,b)=>sortMode==='top'
      ?(b.avg_stars-a.avg_stars)||(b.ratings_count-a.ratings_count)
      :new Date(b.created_at)-new Date(a.created_at));
  }
  $('totalPill').textContent=`${photos.length} صورة · م76`;
  const feed=$('feed');
  if(!list.length){feed.innerHTML=`<div class="empty"><span class="big">🏜️</span>ما فيه صور بعد..<br>كن أول من يصوّر ديرته! اضغط + وشارك</div>`;return}
  feed.innerHTML=list.map((p,i)=>{
    const medal=((sortMode==='top'||sortMode==='abroad')&&i<3&&p.ratings_count>0)?['🥇','🥈','🥉'][i]:'';
    return `<div class="mcard" onclick="openSheet(${p.id})">
      <img src="${thumbUrl(p.image_path)}" onerror="this.onerror=null;this.src='${imgUrl(p.image_path)}'" loading="lazy" alt="${esc(p.title)}">
      ${medal?`<div class="mc-medal">${medal}</div>`:''}
      <div class="mc-overlay">
        <div class="mc-title">${esc(p.title)}</div>
        <div class="mc-sub">${rankOf(p).ic} ${esc(p.photographer)} · ${p.abroad?esc(p.country||p.city):esc(p.village||p.city)}</div>
      </div>
    </div>`;
  }).join('');
}

/* ============ نافذة الصورة ============ */
async function openSheet(id){
  curId=id;curPhoto=photos.find(x=>x.id===id);
  const p=curPhoto;
  $('sPh').innerHTML=`<img src="${imgUrl(p.image_path)}" onclick="zoomOpen(this.src)" alt="${esc(p.title)}">
    <button class="zoombtn" id="zoomBtn" onclick="togglePhotoZoom()">⤢ عرض كامل</button>`;
  if(!seenViews.has(p.id)){seenViews.add(p.id);try{sb.rpc('bump_view',{pid:p.id}).then(()=>{},()=>{})}catch(_){}}
  $('sPh').classList.remove('full');
  $('sTitle').textContent=p.title;
  $('sLoc').innerHTML=(p.abroad?`🌍 عدسة مسافر · ${esc(p.country||p.city)} — عدسة ${esc(p.photographer)}`:`📍 ${esc(p.region)} · ${esc(p.city)}${p.village?' · '+esc(p.village):''} — عدسة ${esc(p.photographer)}`)
    +`<br><a class="mapbtn" href="${p.lat?`https://maps.google.com/?q=${p.lat},${p.lng}`:`https://maps.google.com/?q=${encodeURIComponent(p.abroad?(p.country||p.city):((p.village?p.village+' ':'')+p.city+' '+p.region))}`}" target="_blank" rel="noopener">🗺️ افتح الموقع على قوقل ماب${p.lat?'':' (بحث بالاسم)'}</a>`;
  renderFollow(p);
  $('overlay').classList.add('show');
  document.body.style.overflow='hidden';
  // تقييمي وأوسمتي وتعليقات — من القاعدة
  myRating=0;myBadgeSet=new Set();
  drawStars();renderPoll();
  $('cList').innerHTML='<div class="loader" style="padding:10px">⏳</div>';
  const [rt,bd,cm]=await Promise.all([
    sb.from('ratings').select('stars').eq('photo_id',id).eq('user_id',USER.id).maybeSingle(),
    sb.from('badge_votes').select('badge_key').eq('photo_id',id).eq('user_id',USER.id),
    sb.from('comments').select('body,created_at,profiles!user_id(display_name)').eq('photo_id',id).order('created_at')
  ]);
  myRating=rt.data?rt.data.stars:0;
  (bd.data||[]).forEach(x=>myBadgeSet.add(x.badge_key));
  curPhoto._comments=(cm.data||[]);
  $('thanks').style.display=myRating?'block':'none';
  drawStars();renderPoll();renderComments();
}
function rankOf(p){
  const ph=p.photographer_photos||0, fo=p.followers_count||0;
  if(ph>=15&&fo>=10)return{ic:'🏆',t:'عين الديرة',c:'gold'};
  if(ph>=5||fo>=5)  return{ic:'📸',t:'عدسة الديرة',c:'silver'};
  return{ic:'🌱',t:'مستكشف',c:'bronze'};
}
const seenViews=new Set();
/* ====== المفضلة ====== */
let favSet=new Set();
async function loadFavs(){
  if(!USER)return;
  try{
    const r=await sb.from('favorites').select('photo_id').eq('user_id',USER.id);
    favSet=new Set((r.data||[]).map(x=>x.photo_id));
  }catch(e){}
}
async function toggleFav(pid){
  if(!USER){toast('تعذر الحفظ — أعد تحميل الصفحة',true);return}
  if(favSet.has(pid)){
    favSet.delete(pid);
    await sb.from('favorites').delete().eq('user_id',USER.id).eq('photo_id',pid);
    toast('انشالت من مفضلتك');
  }else{
    favSet.add(pid);
    const {error}=await sb.from('favorites').insert({user_id:USER.id,photo_id:pid});
    if(error){favSet.delete(pid);toast('تعذر الحفظ — نفّذ سكربت v15',true);return}
    toast('انحفظت بمفضلتك ❤️');
  }
  if(curPhoto)renderFollow(curPhoto);
  if($('page-favs').classList.contains('on'))renderFavs();
}
function openFavs(){
  go('favs');
  renderFavs();
}
function renderFavs(){
  const list=photos.filter(p=>favSet.has(p.id));
  $('favFeed').innerHTML=list.length?list.map(p=>`
    <div class="card" onclick="openSheet(${p.id})">
      <div class="ph"><img src="${thumbUrl(p.image_path)}" onerror="this.onerror=null;this.src='${imgUrl(p.image_path)}'" alt="${esc(p.title)}" loading="lazy">
        <div class="loc-chip">${p.abroad?'🌍 '+esc(p.country||p.city):'📍 '+esc(p.village||p.city)}</div>
      </div>
      <div class="card-body">
        <div class="card-title">${esc(p.title)}</div>
        <div class="card-meta"><span class="who">${rankOf(p).ic} ${esc(p.photographer)}</span><span>⭐ ${Number(p.avg_stars).toFixed(1)}</span></div>
      </div>
    </div>`).join('')
  :'<div class="empty" style="grid-column:1/-1"><span class="big">🤍</span>مفضلتك فاضية — افتح أي صورة واضغط «حفظ»</div>';
}
async function renderFollow(p){
  const el=$('sFollow');if(!el)return;
  const mine=USER&&p.user_id===USER.id;
  let following=false;
  if(USER&&!USER.is_anonymous&&!mine){
    const r=await sb.from('follows').select('follower_id').eq('follower_id',USER.id).eq('followed_id',p.user_id).maybeSingle();
    following=!!r.data;
  }
  const rk=rankOf(p);
  el.innerHTML=`<span class="rankchip r-${rk.c}">${rk.ic} ${rk.t}</span><span class="fcount">👥 ${p.followers_count||0} متابع</span>`
    +(mine?'':`<button class="fbtn ${following?'on':''}" onclick="toggleFollow('${p.user_id}',${following})">${following?'✓ متابَع':'＋ متابعة'}</button>`)
    +`<button class="fbtn fav ${favSet.has(p.id)?'on':''}" onclick="toggleFav(${p.id})">${favSet.has(p.id)?'❤️ بالمفضلة':'🤍 حفظ'}</button>`;
}
async function toggleFollow(uid,isF){
  if(!USER||USER.is_anonymous){toast('سجّل أول عشان تتابع المصورين 👥');closeSheet();openAcc();return}
  if(isF){await sb.from('follows').delete().eq('follower_id',USER.id).eq('followed_id',uid);}
  else{
    const{error}=await sb.from('follows').insert({follower_id:USER.id,followed_id:uid});
    if(error){toast('تعذرت المتابعة',true);return}
    toast('صرت متابعاً 👥');
  }
  await refreshOne();
  renderFollow(curPhoto);
}
function closeSheet(){$('overlay').classList.remove('show');document.body.style.overflow=''}
function togglePhotoZoom(){
  const full=$('sPh').classList.toggle('full');
  $('zoomBtn').textContent=full?'⤡ تصغير':'⤢ عرض كامل';
}

function drawStars(){
  $('bigStars').innerHTML=[1,2,3,4,5].map(n=>
    `<button class="${n<=myRating?'lit':''}" onclick="rate(${n})">★</button>`).join('');
  $('sAvg').textContent=`المتوسط ${Number(curPhoto.avg_stars).toFixed(1)} من 5 · ${curPhoto.ratings_count} تقييم`;
}
async function rate(n){
  const prev=myRating;myRating=n;drawStars();
  const { error } = await sb.from('ratings').upsert({photo_id:curId,user_id:USER.id,stars:n});
  if(error){myRating=prev;drawStars();toast('تعذر حفظ التقييم',true);return}
  $('thanks').style.display='block';
  await refreshOne();
}

function renderPoll(){
  const b=curPhoto.badge_counts||{};
  $('pollChips').innerHTML=BADGES.map(bd=>
    `<div class="chip ${myBadgeSet.has(bd.k)?'on':''}" onclick="voteBadge('${bd.k}')">${bd.label}<span class="n">${b[bd.k]||0}</span></div>`
  ).join('');
}
async function voteBadge(k){
  if(myBadgeSet.has(k)){
    myBadgeSet.delete(k);renderPoll();
    await sb.from('badge_votes').delete().eq('photo_id',curId).eq('user_id',USER.id).eq('badge_key',k);
  }else{
    myBadgeSet.add(k);renderPoll();
    const { error } = await sb.from('badge_votes').insert({photo_id:curId,user_id:USER.id,badge_key:k});
    if(error){myBadgeSet.delete(k);renderPoll();toast('تعذر التصويت',true);return}
  }
  await refreshOne();
}

function renderComments(){
  const list=curPhoto._comments||[];
  $('cCount').textContent=`(${list.length})`;
  $('cList').innerHTML=list.length
    ?list.map(c=>`<div class="comment"><b>${esc(c.profiles?.display_name||'زائر')}</b>${esc(c.body)}</div>`).join('')
    :`<div style="color:var(--txt-dim);font-size:13px;padding:6px 2px">كن أول من يعلق ✍️</div>`;
}
async function reportPhoto(){
  if(!confirm('هل أنت متأكد أن هذه الصورة مخالفة؟ البلاغات الكيدية قد تعرّض حسابك للحظر.'))return;
  const { error } = await sb.from('reports').insert({photo_id:curId,user_id:USER.id});
  if(error){
    if(error.code==='23505')toast('سبق أن أبلغت عن هذه الصورة');
    else toast('تعذر إرسال البلاغ',true);
    return;
  }
  toast('وصل بلاغك، شكراً لحرصك 🙏');
}

async function addComment(){
  if(!USER || USER.is_anonymous){toast('سجّل أول عشان تعلق ✍️');closeSheet();openAcc();return}
  const t=$('cText').value.trim();if(!t)return;
  const { error } = await sb.from('comments').insert({photo_id:curId,user_id:USER.id,body:t});
  if(error){toast('تعذر إرسال التعليق',true);return}
  $('cText').value='';
  const cm=await sb.from('comments').select('body,created_at,profiles!user_id(display_name)').eq('photo_id',curId).order('created_at');
  curPhoto._comments=cm.data||[];renderComments();
}

/* تحديث بيانات صورة واحدة من العرض المجمّع */
async function refreshOne(){
  const { data } = await sb.from('photos_ranked').select('*').eq('id',curId).single();
  if(data){
    const i=photos.findIndex(x=>x.id===curId);
    if(i>-1)photos[i]={...data,_comments:curPhoto._comments};
    curPhoto=photos[i];
    drawStars();renderPoll();render();
  }
}

/* ====== عارض الزوم ====== */
let lbW=100;
function zoomOpen(src){
  lbW=100;
  const im=$('lbImg');im.src=src;im.style.width='100%';
  $('lightbox').classList.add('show');
  document.body.style.overflow='hidden';
}
function zoomClose(){
  $('lightbox').classList.remove('show');
  document.body.style.overflow='';
}
function lbScaleBy(f){
  lbW=Math.min(600,Math.max(100,lbW*f));
  $('lbImg').style.width=lbW+'%';
}
function lbDbl(){lbW=lbW>100?100:250;$('lbImg').style.width=lbW+'%';}

/* ====== الخريطة التفاعلية ====== */
let MAP=null,MARKS=null;
function renderMap(){
  const wrap=$('mapWrap');
  wrap.style.display='block';$('feed').style.display='none';
  if(typeof L==='undefined'){wrap.innerHTML='<div class="empty">⚠️ تعذر تحميل الخريطة — تأكد من رفع leaflet.js وleaflet.css</div>';return}
  if(!MAP){
    MAP=L.map('map',{zoomControl:true,attributionControl:true}).setView([23.9,45.1],5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(MAP);
    MARKS=L.layerGroup().addTo(MAP);
  }
  MARKS.clearLayers();
  const q=($('q').value||'').trim();
  const list=photos.filter(p=>p.lat&&p.lng
    &&(catFilter==='all'||(p.category||'other')===catFilter)
    &&(!q||p.title.includes(q)||(p.village||'').includes(q)||(p.city||'').includes(q)||(p.country||'').includes(q)));
  const pts=[];
  list.forEach(p=>{
    const ic=L.divIcon({className:'',html:`<div class="pmark"><img src="${thumbUrl(p.image_path)}" onerror="this.onerror=null;this.src='${imgUrl(p.image_path)}'"></div>`,iconSize:[46,46],iconAnchor:[23,23]});
    L.marker([p.lat,p.lng],{icon:ic}).addTo(MARKS).on('click',()=>openSheet(p.id));
    pts.push([p.lat,p.lng]);
  });
  if(pts.length)MAP.fitBounds(pts,{padding:[46,46],maxZoom:12});
  // دبوس الراعي
  const spd=window.__SPDATA;
  if(spd&&spd.active&&spd.image_path&&spd.sponsor_lat&&spd.sponsor_lng){
    const sic=L.divIcon({className:'',html:`<div class="pmark sp-pin"><img src="${imgUrl(spd.image_path)}"><div class="sp-pin-label">${esc(spd.sponsor_name||'راعي')}</div></div>`,iconSize:[54,66],iconAnchor:[27,66]});
    L.marker([spd.sponsor_lat,spd.sponsor_lng],{icon:sic,zIndexOffset:1000}).addTo(MARKS).on('click',()=>openSponsorsPage());
  }
  setTimeout(()=>{MAP.invalidateSize();if(window.__USER_LAT)addUserPin(window.__USER_LAT,window.__USER_LNG);},120);
  const sp=window.__SPDATA;
  $('mapSponsor').innerHTML=(sp&&sp.active&&sp.image_path)
    ?((sp.link_url?`<a href="${esc(sp.link_url)}" target="_blank" rel="noopener">`:'')+`<img src="${imgUrl(spd.image_path)}" alt="راعي المنصة">`+(sp.link_url?'</a>':''))
    :'';
}

/* ====== دبوس موقع المستخدم بالخريطة ====== */
let _userPin=null;
function addUserPin(lat,lng){
  if(!MAP||typeof L==='undefined')return;
  if(_userPin)_userPin.remove();
  const ic=L.divIcon({className:'',html:'<div class="user-pin">📍<div class="user-pin-label">موقعي</div></div>',iconSize:[40,52],iconAnchor:[20,52]});
  _userPin=L.marker([lat,lng],{icon:ic,zIndexOffset:2000}).addTo(MAP);
}

/* ====== تبديل العرض مع حفظ الحالة ====== */
function setView(v){
  _viewMode=v;
  $('vtGrid').classList.toggle('on',v==='grid');
  $('vtMap').classList.toggle('on',v==='map');
  const feed=$('feed');
  const map=$('mapWrap');
  const nearby=$('nearbyWrap');
  if(v==='map'){
    if(feed)feed.style.display='none';
    if(nearby)nearby.style.display='none';
    if(map)map.style.display='block';
    renderMap();
  } else {
    if(map)map.style.display='none';
    if(feed)feed.style.display='';
    render();
  }
}
