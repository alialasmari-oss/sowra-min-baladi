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
let photos=[], sortMode='top', curId=null, curPhoto=null;
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
  render();
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
function setSort(m){
  sortMode=m;
  $('tabTop').classList.toggle('on',m==='top');
  $('tabNew').classList.toggle('on',m==='new');
  $('tabAbroad').classList.toggle('on',m==='abroad');
  $('abroadHint').style.display=m==='abroad'?'block':'none';
  render();
}

function render(){
  const q=$('q').value.trim(), r=$('fRegion').value, c=$('fCity').value;
  const abroadView=sortMode==='abroad';
  let list=photos.filter(p=>!!p.abroad===abroadView);
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
  $('totalPill').textContent=`${photos.length} صورة · م5`;
  const feed=$('feed');
  if(!list.length){feed.innerHTML=`<div class="empty"><span class="big">🏜️</span>ما فيه صور بعد..<br>كن أول من يصوّر ديرته! اضغط + وشارك</div>`;return}
  feed.innerHTML=list.map((p,i)=>{
    const medal=((sortMode==='top'||sortMode==='abroad')&&i<3&&p.ratings_count>0)?['🥇','🥈','🥉'][i]+' ':'';
    const tb=topBadge(p);
    return `<div class="card" onclick="openSheet(${p.id})">
      <div class="ph"><img src="${thumbUrl(p.image_path)}" onerror="this.onerror=null;this.src='${imgUrl(p.image_path)}'" loading="lazy" alt="${esc(p.title)}">
        <div class="medal">${medal}${Number(p.avg_stars).toFixed(1)} ★</div>
        ${tb?`<div class="badge-tag">${tb.label}</div>`:''}
        <div class="loc-chip">${p.abroad?'🌍 '+esc(p.country||p.city):'📍 '+esc(p.village||p.city)}</div>
      </div>
      <div class="card-body">
        <div class="card-title">${esc(p.title)}</div>
        <div class="card-meta">
          <span class="stars-mini">${starsTxt(p.avg_stars)} (${p.ratings_count})</span>
          <span class="who">📷 ${esc(p.photographer)}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ============ نافذة الصورة ============ */
async function openSheet(id){
  curId=id;curPhoto=photos.find(x=>x.id===id);
  const p=curPhoto;
  $('sPh').innerHTML=`<img src="${imgUrl(p.image_path)}" alt="${esc(p.title)}">
    <button class="zoombtn" id="zoomBtn" onclick="togglePhotoZoom()">⤢ عرض كامل</button>`;
  $('sPh').classList.remove('full');
  $('sTitle').textContent=p.title;
  $('sLoc').innerHTML=(p.abroad?`🌍 عدسة مسافر · ${esc(p.country||p.city)} — عدسة ${esc(p.photographer)}`:`📍 ${esc(p.region)} · ${esc(p.city)}${p.village?' · '+esc(p.village):''} — عدسة ${esc(p.photographer)}`)
    +(p.lat?`<br><a href="https://maps.google.com/?q=${p.lat},${p.lng}" target="_blank" style="color:var(--palm);text-decoration:none">🗺️ الموقع الدقيق على الخريطة</a>`:'');
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
