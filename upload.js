/* صورة من بلدي — upload.js | نسخة المختبر م1 */
/* ============ الإضافة ============ */
let pendingFile=null,pendingGeo=null,pendingBlob=null,isAbroad=false;
function setDest(abroad){
  isAbroad=abroad;
  $('destHome').classList.toggle('on-dest',!abroad);
  $('destAbroad').classList.toggle('on-dest',abroad);
  $('abroadForm').style.display=abroad?'block':'none';
  $('grpRegion').style.display=abroad?'none':'block';
  $('grpCity').style.display=abroad?'none':'block';
  $('grpVillage').style.display=abroad?'none':'block';
}
function applyGeo(pos,source){
  const card=$('geoCard');card.style.display='block';
  if(!pos){
    card.classList.add('warn');
    $('geoStatus').textContent=source==='live'
      ?'⚠️ ما قدرنا نوصل لموقعك — تأكد أن الموقع مفعّل'
      :'⚠️ الصورة ما تحتوي معلومات موقع — حدد الموقع يدوياً';
    $('geoCoords').textContent='';
    return;
  }
  card.classList.remove('warn');
  pendingGeo={lat:pos.lat,lng:pos.lng};
  if(isAbroad){
    $('geoStatus').textContent='📡 تم التقاط إحداثيات موقعك'+(pos.acc?` · دقة ±${pos.acc}م`:'');
    $('geoCoords').textContent=`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
    return;
  }
  const n=nearestCity(pos.lat,pos.lng);
  $('aRegion').value=n.region;fillAddCities();$('aCity').value=n.city;
  $('geoStatus').textContent=`📡 تم تحديد الموقع تلقائياً: قرب ${n.city} (≈${n.km} كم)`+(pos.acc?` · دقة ±${pos.acc}م`:'');
  $('geoCoords').textContent=`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
}
async function pickImg(inp,isLive){
  const f=inp.files[0];if(!f)return;
  pendingGeo=null;pendingFile=f;pendingBlob=null;
  // معاينة فورية خفيفة (بدون قراءة الملف كاملاً)
  $('drop').style.display='block';
  $('preview').src=URL.createObjectURL(f);$('preview').style.display='block';
  $('dropTxt').textContent='✓ تم اختيار الصورة';
  $('drop').classList.add('has');
  // ضغط بالخلفية من الحين — عشان النشر يكون لحظي
  compress(f).then(b=>{pendingBlob=b});
  $('geoCard').style.display='block';$('geoCard').classList.remove('warn');
  $('geoStatus').textContent='⏳ جاري تحديد الموقع...';$('geoCoords').textContent='';
  if(isLive){
    let pos=await liveLocation();
    if(!pos)pos=await readExifGPS(f);
    applyGeo(pos,'live');
  }else{
    let pos=await readExifGPS(f);
    applyGeo(pos,pos?'exif':'exif');
  }
  inp.value='';
}

/* ضغط الصورة قبل الرفع (أقصى عرض 1600px) */
function compressTo(file,maxW,quality){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      const scale=Math.min(1,maxW/Math.max(img.width,img.height));
      const cv=document.createElement('canvas');
      cv.width=Math.round(img.width*scale);cv.height=Math.round(img.height*scale);
      const ctx=cv.getContext('2d');
      ctx.drawImage(img,0,0,cv.width,cv.height);
      // ختم المنصة المحفور
      const fsz=Math.max(11,Math.round(cv.width*0.03));
      ctx.font='bold '+fsz+'px Tajawal, Arial, sans-serif';
      ctx.textBaseline='bottom';ctx.textAlign='left';
      const pad=Math.round(fsz*0.7);
      ctx.lineWidth=Math.max(2,fsz*0.14);ctx.lineJoin='round';
      ctx.strokeStyle='rgba(36,31,28,.55)';ctx.fillStyle='rgba(255,255,255,.88)';
      ctx.strokeText('sowra.app',pad,cv.height-pad);
      ctx.fillText('sowra.app',pad,cv.height-pad);
      cv.toBlob(b=>resolve(b||file),'image/jpeg',quality);
    };
    img.onerror=()=>resolve(file);
    img.src=URL.createObjectURL(file);
  });
}
function compress(file){return compressTo(file,1280,0.8)}
const thumbPath=p=>p.replace(/\.jpg$/,'_t.jpg');
function thumbUrl(p){return imgUrl(thumbPath(p))}

async function addPhoto(){
  if(!USER || USER.is_anonymous){toast('سجّل أول عشان تنشر 📸');openAcc();return}
  const title=$('aTitle').value.trim();
  let region=$('aRegion').value,city=$('aCity').value,country='';
  if(isAbroad){
    country=$('aCountry').value.trim();
    if(country.length<2){toast('اكتب الدولة والمدينة 🌍',true);return}
    region='عدسة مسافر';city=country;
  }
  if(!pendingFile)return toast('اختر صورة أول ⚠️',true);
  if(!title)return toast('اكتب عنوان للصورة ⚠️',true);
  if(title.length<2)return toast('العنوان قصير — حرفان على الأقل ✏️',true);
  if(title.length>100)return toast('العنوان طويل — 100 حرف كحد أقصى ✏️',true);
  if(!isAbroad&&(!region||!city))return toast('حدد المنطقة والمدينة ⚠️',true);
  const btn=$('pubBtn');btn.disabled=true;btn.textContent='⏳ جاري الرفع...';
  try{
    const blob=pendingBlob||await compress(pendingFile);
    const thumb=await compressTo(pendingFile,420,0.7);
    const path=`${USER.id}/${Date.now()}.jpg`;
    const [up,upT]=await Promise.all([
      sb.storage.from('photos').upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000'}),
      sb.storage.from('photos').upload(thumbPath(path),thumb,{contentType:'image/jpeg',cacheControl:'31536000'})
    ]);
    if(up.error)throw up.error;
    const ins=await sb.from('photos').insert({
      user_id:USER.id,title,region,city,category:$('aCat').value||'other',
      abroad:isAbroad,country,
      village:isAbroad?'':$('aVillage').value.trim(),
      lat:pendingGeo?.lat??null,lng:pendingGeo?.lng??null,
      image_path:path
    });
    if(ins.error){
      // فشل التسجيل — ننظف ملفات الصورة من المخزن حتى لا تبقى يتيمة
      await sb.storage.from('photos').remove([path,thumbPath(path)]).catch(()=>{});
      throw ins.error;
    }
    pendingFile=null;pendingGeo=null;pendingBlob=null;
    $('preview').style.display='none';$('drop').style.display='none';$('geoCard').style.display='none';
    $('aTitle').value='';$('aVillage').value='';
    toast('نُشرت صورتك 🎉');
    const wasAbroad=isAbroad;
    $('aCountry').value='';
    await loadPhotos();go('feed');setSort(wasAbroad?'abroad':'new');
  }catch(e){
    if(e.message&&e.message.includes('row-level')){
      // نسأل القاعدة عن السبب الحقيقي
      const [ban,lim]=await Promise.all([sb.rpc('am_i_banned'),sb.rpc('my_uploads_today')]);
      if(ban.data===true)toast('حسابك محظور من النشر — راسل الإدارة من صفحة حسابي ⛔',true);
      else if((lim.data??0)>=10)toast('وصلت حد النشر اليومي (10 صور) — كمّل بكرة 🌙',true);
      else toast('تعذر النشر — تأكد أنك مسجل دخول',true);
    }else if(e.message&&e.message.includes('check constraint')){
      toast('تأكد من البيانات: العنوان 2–100 حرف ✏️',true);
    }else toast('تعذر النشر: '+(e.message||''),true);
  }finally{
    btn.disabled=false;btn.textContent='انشر الصورة 🚀';
  }
}
