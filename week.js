/* صورة من بلدي — week.js | لقطة الأسبوع 🏆 */
let WEEK=null,WEEK_MODE='live',weekEntries=[],weekVotes={},myWeekVote=null;

async function loadWeek(){
  WEEK=null;WEEK_MODE='live';
  try{
    const c=await sb.from('weekly_contest').select('*').eq('active',true).order('id',{ascending:false}).limit(1).maybeSingle();
    if(c.data){WEEK=c.data;}
    else{
      const e=await sb.from('weekly_contest').select('*').not('ended_at','is',null).order('ended_at',{ascending:false}).limit(1).maybeSingle();
      if(e.data && (Date.now()-new Date(e.data.ended_at).getTime()) < 7*24*3600*1000){
        WEEK=e.data;WEEK_MODE='results';
      }
    }
  }catch(err){WEEK=null}
  const strip=$('weekStrip');if(!strip)return;
  if(!WEEK){strip.style.display='none';return}
  strip.style.display='block';
  if(WEEK_MODE==='results'){
    const win=photos.find(x=>x.id===WEEK.winner_photo_id);
    strip.classList.add('win');
    strip.innerHTML=win
      ?`👑 <b>فائز لقطة الأسبوع:</b> ${rankOf(win).ic} ${esc(win.photographer)} — «${esc(win.title)}» · شاهد النتيجة`
      :`🏁 <b>لقطة الأسبوع انتهت</b> — شاهد النتيجة`;
  }else{
    strip.classList.remove('win');
    strip.innerHTML=`🏆 <b>لقطة الأسبوع</b> — شاهد اللقطات الخمس وصوّت ${WEEK.sponsor_name?'· برعاية '+esc(WEEK.sponsor_name):''}`;
  }
}

async function openWeek(){
  if(!WEEK){toast('ما فيه مسابقة حالياً');return}
  go('week');
  $('weekBody').innerHTML='<div class="empty">⏳</div>';
  const [en,bd,mv]=await Promise.all([
    sb.from('weekly_entries').select('photo_id').eq('contest_id',WEEK.id),
    sb.from('weekly_board').select('*').eq('contest_id',WEEK.id),
    (WEEK_MODE==='live'&&USER)?sb.from('weekly_votes').select('photo_id').eq('contest_id',WEEK.id).eq('user_id',USER.id).maybeSingle():Promise.resolve({data:null})
  ]);
  weekVotes={};(bd.data||[]).forEach(r=>weekVotes[r.photo_id]=r.votes);
  myWeekVote=mv.data?.photo_id??null;
  const ids=(en.data||[]).map(e=>e.photo_id);
  weekEntries=photos.filter(p=>ids.includes(p.id));
  renderWeek();
}

function renderWeek(){
  const results=WEEK_MODE==='results';
  $('weekTitle').textContent=(results?'🏁 نتيجة لقطة الأسبوع':'🏆 لقطة الأسبوع')+(WEEK.week_label?' — '+WEEK.week_label:'');
  $('weekSponsor').innerHTML=[WEEK.sponsor_name?`برعاية <b style="color:var(--sadu)">${esc(WEEK.sponsor_name)}</b>`:'',WEEK.prize?`🎁 الجائزة: ${esc(WEEK.prize)}`:''].filter(Boolean).join(' · ')||(results?'':'صوّت لأجمل لقطة — صوت واحد وتقدر تغيّره');
  const sorted=weekEntries.slice().sort((a,b)=>(weekVotes[b.id]||0)-(weekVotes[a.id]||0));
  const winId=results?(WEEK.winner_photo_id??(sorted[0]?.id)):(sorted[0]&&(weekVotes[sorted[0].id]||0)>0?sorted[0].id:null);
  $('weekBody').innerHTML=weekEntries.length?sorted.map((p,i)=>{
    const v=weekVotes[p.id]||0, isWin=p.id===winId;
    return `<div class="card wcard ${isWin&&results?'winner':''} ${myWeekVote===p.id&&!results?'voted':''}">
      <div class="ph" style="height:170px"><img src="${thumbUrl(p.image_path)}" onerror="this.onerror=null;this.src='${imgUrl(p.image_path)}'" alt="${esc(p.title)}">
        ${isWin?'<div class="medal">👑 '+(results?'الفائز':'متصدرة')+'</div>':(results?`<div class="medal">#${i+1}</div>`:'')}
      </div>
      <div class="card-body">
        <div class="card-title">${esc(p.title)}</div>
        <div class="card-meta"><span class="who">${rankOf(p).ic} ${esc(p.photographer)}</span><span>🗳️ ${v} صوت</span></div>
        ${results?'':`<button class="btn wvote ${myWeekVote===p.id?'on':''}" onclick="voteWeek(${p.id})">${myWeekVote===p.id?'✓ صوتك هنا':'صوّت لهذه اللقطة'}</button>`}
      </div>
    </div>`;
  }).join(''):'<div class="empty">🎬 اللقطات الخمس تُعلن قريباً — ترقبوا</div>';
}

async function voteWeek(pid){
  const {error}=await sb.from('weekly_votes').upsert({contest_id:WEEK.id,user_id:USER.id,photo_id:pid});
  if(error){toast('تعذر التصويت',true);return}
  myWeekVote=pid;
  const bd=await sb.from('weekly_board').select('*').eq('contest_id',WEEK.id);
  weekVotes={};(bd.data||[]).forEach(r=>weekVotes[r.photo_id]=r.votes);
  toast('تم تصويتك 🗳️');
  renderWeek();
}

/* ====== بنر الراعي ====== */
async function loadSponsor(){
  const el=$('sponsorBar');if(!el)return;
  try{
    const r=await sb.from('site_banner').select('*').eq('id',1).maybeSingle();
    const b=r.data;
    window.__SPDATA=b||null;
    if(!b||!b.active||!b.image_path){el.style.display='none';return}
    const src=imgUrl(b.image_path);
    el.innerHTML=(b.link_url?`<a href="${esc(b.link_url)}" target="_blank" rel="noopener">`:'')
      +`<img src="${src}" alt="راعي المنصة">`
      +(b.link_url?'</a>':'')
      +`<span class="sp-tag">راعي المنصة</span>`;
    el.style.display='block';
  }catch(e){el.style.display='none'}
}

/* ====== صفحة الرعاة ====== */
function openSponsorsPage(){
  go('sponsors');
  const sp=window.__SPDATA;
  $('spListPage').innerHTML=(sp&&sp.active&&sp.image_path)
    ?`<div class="sp-main">${sp.link_url?`<a href="${esc(sp.link_url)}" target="_blank" rel="noopener">`:''}<img src="${imgUrl(sp.image_path)}" alt="الراعي الرسمي">${sp.link_url?'</a>':''}<div class="t">⭐ الراعي الرسمي للمنصة</div></div>`
    :`<div class="empty" style="padding:26px 14px">🌟 مقعد الراعي الرسمي بانتظار علامتك</div>`;
}
