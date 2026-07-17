/* صورة من بلدي — week.js | لقطة الأسبوع 🏆 */
let WEEK=null,weekEntries=[],weekVotes={},myWeekVote=null;

async function loadWeek(){
  try{
    const c=await sb.from('weekly_contest').select('*').eq('active',true).order('id',{ascending:false}).limit(1).maybeSingle();
    WEEK=c.data||null;
  }catch(e){WEEK=null}
  const strip=$('weekStrip');if(!strip)return;
  if(!WEEK){strip.style.display='none';return}
  strip.style.display='block';
  $('weekStripSub').textContent=WEEK.sponsor_name?`· برعاية ${WEEK.sponsor_name}`:'';
}

async function openWeek(){
  if(!WEEK){toast('ما فيه مسابقة نشطة حالياً');return}
  go('week');
  $('weekBody').innerHTML='<div class="empty">⏳</div>';
  const [en,bd,mv]=await Promise.all([
    sb.from('weekly_entries').select('photo_id').eq('contest_id',WEEK.id),
    sb.from('weekly_board').select('*').eq('contest_id',WEEK.id),
    USER?sb.from('weekly_votes').select('photo_id').eq('contest_id',WEEK.id).eq('user_id',USER.id).maybeSingle():Promise.resolve({data:null})
  ]);
  weekVotes={};(bd.data||[]).forEach(r=>weekVotes[r.photo_id]=r.votes);
  myWeekVote=mv.data?.photo_id??null;
  const ids=(en.data||[]).map(e=>e.photo_id);
  weekEntries=photos.filter(p=>ids.includes(p.id));
  renderWeek();
}

function renderWeek(){
  $('weekTitle').textContent='🏆 لقطة الأسبوع'+(WEEK.week_label?' — '+WEEK.week_label:'');
  $('weekSponsor').innerHTML=[WEEK.sponsor_name?`برعاية <b style="color:var(--sadu)">${esc(WEEK.sponsor_name)}</b>`:'',WEEK.prize?`🎁 الجائزة: ${esc(WEEK.prize)}`:''].filter(Boolean).join(' · ')||'صوّت لأجمل لقطة — صوت واحد وتقدر تغيّره';
  const sorted=weekEntries.slice().sort((a,b)=>(weekVotes[b.id]||0)-(weekVotes[a.id]||0));
  const leader=sorted[0];
  $('weekBody').innerHTML=weekEntries.length?sorted.map(p=>{
    const v=weekVotes[p.id]||0;
    return `<div class="card wcard ${myWeekVote===p.id?'voted':''}">
      <div class="ph" style="height:170px"><img src="${thumbUrl(p.image_path)}" onerror="this.onerror=null;this.src='${imgUrl(p.image_path)}'" alt="${esc(p.title)}">
        ${leader&&leader.id===p.id&&v>0?'<div class="medal">👑 متصدرة</div>':''}
      </div>
      <div class="card-body">
        <div class="card-title">${esc(p.title)}</div>
        <div class="card-meta"><span class="who">📷 ${esc(p.photographer)}</span><span>🗳️ ${v} صوت</span></div>
        <button class="btn wvote ${myWeekVote===p.id?'on':''}" onclick="voteWeek(${p.id})">${myWeekVote===p.id?'✓ صوتك هنا':'صوّت لهذه اللقطة'}</button>
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
