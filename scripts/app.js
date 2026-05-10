// ── DATA ──────────────────────────────────────────────────────────────────
const EXERCISES = [
  { id:"legpress",    name:"Leg Press",             tag:"Legs",       defaultSets:3, repRange:[10,12], weighted:true },
  { id:"chestpress",  name:"Chest Press",            tag:"Chest",      defaultSets:3, repRange:[10,12], weighted:true },
  { id:"pullups",     name:"Pull-Ups",               tag:"Back",       defaultSets:3, repRange:[null,null], weighted:false, amrap:true },
  { id:"ohpress",     name:"Overhead Press",         tag:"Shoulders",  defaultSets:3, repRange:[10,12], weighted:true },
  { id:"rows",        name:"Dumbbell Rows",          tag:"Back",       defaultSets:3, repRange:[10,12], weighted:true, perSide:true },
  { id:"curls",       name:"Bicep Curls",            tag:"Arms",       defaultSets:2, repRange:[12,15], weighted:true },
];

// in-memory storage (mirrored to localStorage for persistence when available)
let workouts = [];
try { workouts = JSON.parse(localStorage.getItem("liftlog_workouts") || "[]"); } catch(e){}

function save() {
  try { localStorage.setItem("liftlog_workouts", JSON.stringify(workouts)); } catch(e){}
}

// ── THEME ─────────────────────────────────────────────────────────────────
(function(){
  const t = document.querySelector("[data-theme-toggle]");
  const r = document.documentElement;
  let d = r.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light");
  r.setAttribute("data-theme", d);
  if(t) updateThemeIcon(t, d);
  t && t.addEventListener("click", () => {
    d = d === "dark" ? "light" : "dark";
    r.setAttribute("data-theme", d);
    updateThemeIcon(t, d);
  });
  function updateThemeIcon(btn, theme){
    btn.innerHTML = theme === "dark"
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }
})();

// ── TABS ──────────────────────────────────────────────────────────────────
function switchTab(name){
  document.querySelectorAll(".tab").forEach((t,i)=>{
    const panels=["log","history","progress"];
    t.classList.toggle("active", panels[i]===name);
  });
  document.querySelectorAll(".tab-panel").forEach(p=>{
    p.classList.toggle("active", p.id===`panel-${name}`);
  });
  if(name==="history") renderHistory();
  if(name==="progress") renderProgress();
}

// ── DATE ──────────────────────────────────────────────────────────────────
const dateInput = document.getElementById("workout-date");
dateInput.value = new Date().toISOString().split("T")[0];

// ── EXERCISE FORM ─────────────────────────────────────────────────────────
function getLastBest(exerciseId){
  for(let i=workouts.length-1;i>=0;i--){
    const ex=workouts[i].exercises.find(e=>e.id===exerciseId);
    if(ex&&ex.sets.length){
      const done=ex.sets.filter(s=>s.done);
      if(done.length){
        const best=done.reduce((b,s)=>((s.weight||0)>=(b.weight||0)?s:b),done[0]);
        return best;
      }
    }
  }
  return null;
}

function buildExerciseForms(){
  const c=document.getElementById("exercises-container");
  c.innerHTML="";
  EXERCISES.forEach(ex=>{
    const best=getLastBest(ex.id);
    const defWeight=best?best.weight:"";
    const defReps=best?best.reps:(ex.amrap?"":ex.repRange[1]);
    const block=document.createElement("div");
    block.className="exercise-block";
    block.dataset.exid=ex.id;

    const repHint=ex.amrap?"AMRAP":`${ex.repRange[0]}–${ex.repRange[1]} reps`;
    const prevText=best?(ex.weighted?`Last: ${best.weight||"–"}lb × ${best.reps}`:`Last: ${best.reps} reps`):"First session";

    block.innerHTML=`
      <div class="exercise-header">
        <div>
          <div class="exercise-name">${ex.name}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px">${repHint}${ex.perSide?" · per side":""}</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <span class="prev-best">${prevText}</span>
          <span class="exercise-tag">${ex.tag}</span>
        </div>
      </div>
      <table class="sets-table">
        <thead>
          <tr>
            <th>#</th>
            ${ex.weighted?`<th>Weight (lbs)</th>`:""}
            <th>Reps</th>
            <th>Done</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="sets-${ex.id}"></tbody>
      </table>
      <div class="add-set-row">
        <button class="btn btn-ghost btn-sm" onclick="addSet('${ex.id}')">+ Add set</button>
      </div>`;
    c.appendChild(block);

    const numSets=ex.defaultSets;
    for(let i=0;i<numSets;i++){
      addSet(ex.id, defWeight, defReps, false);
    }
  });
}

let setCounters={};
function addSet(exId, weight="", reps="", animate=true){
  const ex=EXERCISES.find(e=>e.id===exId);
  setCounters[exId]=(setCounters[exId]||0)+1;
  const n=setCounters[exId];
  const tbody=document.getElementById(`sets-${exId}`);
  const tr=document.createElement("tr");
  tr.dataset.set=n;
  if(animate){tr.style.opacity="0";setTimeout(()=>{tr.style.opacity="1";tr.style.transition="opacity 0.2s"},10);}
  tr.innerHTML=`
    <td><span class="set-num">${n}</span></td>
    ${ex.weighted?`<td><input class="num-input" type="number" min="0" max="9999" step="2.5" value="${weight}" placeholder="lbs" aria-label="Weight set ${n}"></td>`:""}
    <td><input class="num-input" type="number" min="0" max="999" value="${reps}" placeholder="${ex.amrap?"reps":"reps"}" aria-label="Reps set ${n}"></td>
    <td><input type="checkbox" class="checkbox-done" title="Mark done"></td>
    <td><button class="btn btn-ghost btn-sm btn-danger" onclick="removeSet(this,'${exId}')" aria-label="Remove set">×</button></td>`;
  tbody.appendChild(tr);

  // auto-check done when reps filled
  const repInput=tr.querySelector("input[type=number]:last-of-type");
  const cb=tr.querySelector(".checkbox-done");
  repInput.addEventListener("input",()=>{if(repInput.value)cb.checked=true;toggleDoneStyle(tr,cb)});
  cb.addEventListener("change",()=>toggleDoneStyle(tr,cb));
}

function toggleDoneStyle(tr,cb){
  tr.classList.toggle("set-done-row",cb.checked);
}

function removeSet(btn, exId){
  const tr=btn.closest("tr");
  tr.remove();
  // renumber
  const tbody=document.getElementById(`sets-${exId}`);
  tbody.querySelectorAll("tr").forEach((r,i)=>{r.querySelector(".set-num").textContent=i+1});
}

// ── SAVE WORKOUT ──────────────────────────────────────────────────────────
function saveWorkout(){
  const date=dateInput.value;
  if(!date){showToast("Please select a date");return;}

  const exercisesData=[];
  let anyData=false;
  EXERCISES.forEach(ex=>{
    const tbody=document.getElementById(`sets-${ex.id}`);
    const rows=tbody.querySelectorAll("tr");
    const sets=[];
    rows.forEach(tr=>{
      const inputs=tr.querySelectorAll("input[type=number]");
      const cb=tr.querySelector(".checkbox-done");
      let weight=null,reps=null;
      if(ex.weighted){weight=parseFloat(inputs[0].value)||null;reps=parseFloat(inputs[1].value)||null;}
      else{reps=parseFloat(inputs[0].value)||null;}
      if(reps!==null)anyData=true;
      sets.push({weight,reps,done:cb?cb.checked:false});
    });
    exercisesData.push({id:ex.id,name:ex.name,sets});
  });

  if(!anyData){showToast("Enter at least one rep before saving");return;}

  // check duplicate date
  const existing=workouts.findIndex(w=>w.date===date);
  if(existing>=0){
    showConfirm(
      "Replace workout?",
      `You already logged a workout on ${formatDate(date)}. Replace it?`,
      ()=>{workouts[existing]={date,exercises:exercisesData};save();showToast("Workout updated ✓");},
      "Replace"
    );
    return;
  }

  workouts.push({date,exercises:exercisesData});
  workouts.sort((a,b)=>b.date.localeCompare(a.date));
  save();
  showToast("Workout saved ✓");
}

function clearForm(){
  setCounters={};
  buildExerciseForms();
  dateInput.value=new Date().toISOString().split("T")[0];
}

// ── HISTORY ───────────────────────────────────────────────────────────────
function renderHistory(){
  const list=document.getElementById("history-list");
  if(!workouts.length){
    list.innerHTML=`<div class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      <h3>No workouts yet</h3>
      <p>Log your first session to see it here.</p>
    </div>`;
    return;
  }
  list.innerHTML="";
  workouts.forEach((w,idx)=>{
    const totalSets=w.exercises.reduce((t,e)=>t+e.sets.filter(s=>s.done).length,0);
    const pills=w.exercises.filter(e=>e.sets.some(s=>s.reps)).map(e=>
      `<span class="history-pill">${e.name}</span>`).join("");
    const card=document.createElement("div");
    card.className="card history-card";
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="history-date">${formatDate(w.date)}</div>
          <div class="history-summary">${pills}</div>
          <div class="history-meta">${totalSets} sets completed</div>
        </div>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn-ghost btn-sm" onclick="toggleDetail(${idx},this)">View</button>
          <button class="btn btn-ghost btn-sm btn-danger" onclick="deleteWorkout(${idx})">Delete</button>
        </div>
      </div>
      <div class="history-detail" id="detail-${idx}">
        ${w.exercises.map(e=>`
          <div class="detail-exercise">
            <div class="detail-exercise-name">${e.name}</div>
            <div class="detail-set-row detail-set-header"><span>#</span><span>${e.sets.some(s=>s.weight)?'Weight':''}</span><span>Reps</span><span>Done</span></div>
            ${e.sets.map((s,i)=>`
              <div class="detail-set-row">
                <span>${i+1}</span>
                <span>${s.weight?s.weight+"lb":"—"}</span>
                <span>${s.reps||"—"}</span>
                <span>${s.done?"✓":"·"}</span>
              </div>`).join("")}
          </div>`).join("")}
      </div>`;
    list.appendChild(card);
  });
}

function toggleDetail(idx, btn){
  const d=document.getElementById(`detail-${idx}`);
  d.classList.toggle("open");
  btn.textContent=d.classList.contains("open")?"Hide":"View";
}

function deleteWorkout(idx){
  showConfirm("Delete workout?",`Remove the workout from ${formatDate(workouts[idx].date)}? This can't be undone.`,()=>{
    workouts.splice(idx,1);save();renderHistory();showToast("Workout deleted");
  },"Delete");
}

function clearAllHistory(){
  if(!workouts.length){showToast("Nothing to clear");return;}
  showConfirm("Clear all history?","This will permanently delete all logged workouts.",()=>{
    workouts=[];save();renderHistory();showToast("History cleared");
  },"Clear all");
}

// ── PROGRESS ──────────────────────────────────────────────────────────────
function renderProgress(){
  const grid=document.getElementById("progress-grid");
  const streakArea=document.getElementById("streak-area");
  grid.innerHTML="";

  // streak calc
  const days=workouts.map(w=>w.date).sort((a,b)=>b.localeCompare(a));
  let streak=0;
  if(days.length){
    const today=new Date().toISOString().split("T")[0];
    let check=today;
    for(let i=0;i<days.length;i++){
      if(days[i]===check){streak++;const d=new Date(check);d.setDate(d.getDate()-1);check=d.toISOString().split("T")[0];}
      else if(days[i]<check) break;
    }
  }
  streakArea.innerHTML=streak>0
    ?`<div class="streak-badge">🔥 ${streak}-session streak</div>`
    :`<div class="streak-badge" style="background:var(--color-surface-offset);color:var(--color-text-muted)">Start your streak today</div>`;

  if(!workouts.length){
    grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <h3>No data yet</h3>
      <p>Complete a few workouts to see your personal bests here.</p>
    </div>`;
    return;
  }

  EXERCISES.forEach(ex=>{
    // collect all-time best per set
    let best={weight:null,reps:null};
    let prev={weight:null,reps:null};
    let sessionBests=[];
    workouts.slice().reverse().forEach(w=>{
      const e=w.exercises.find(x=>x.id===ex.id);
      if(!e) return;
      const doneSets=e.sets.filter(s=>s.reps);
      if(!doneSets.length) return;
      const topSet=doneSets.reduce((b,s)=>{
        if(ex.weighted) return ((s.weight||0)>=( b.weight||0))?s:b;
        return (s.reps||0)>=(b.reps||0)?s:b;
      },doneSets[0]);
      sessionBests.push({date:w.date,...topSet});
    });
    if(!sessionBests.length){return;}
    const allTimeBest=sessionBests.reduce((b,s)=>{
      if(ex.weighted) return ((s.weight||0)>=(b.weight||0))?s:b;
      return (s.reps||0)>=(b.reps||0)?s:b;
    },sessionBests[0]);
    const prevBest=sessionBests.length>1?sessionBests[sessionBests.length-2]:null;

    let deltaHtml="";
    if(prevBest&&ex.weighted&&allTimeBest.weight&&prevBest.weight){
      const d=allTimeBest.weight-prevBest.weight;
      if(d>0) deltaHtml=`<span class="pb-delta">+${d}lb</span>`;
    }

    const card=document.createElement("div");
    card.className="card progress-card";
    card.innerHTML=`
      <div class="ex-name">${ex.name} <span class="exercise-tag">${ex.tag}</span></div>
      ${ex.weighted?`<div class="pb-row"><span class="pb-label">Best weight</span><div style="display:flex;gap:var(--space-2);align-items:baseline"><span class="pb-value">${allTimeBest.weight||"–"}lb</span>${deltaHtml}</div></div>`:""}
      <div class="pb-row"><span class="pb-label">Best reps</span><span class="pb-value">${allTimeBest.reps||"–"}</span></div>
      <div class="pb-row"><span class="pb-label">Sessions logged</span><span class="pb-value">${sessionBests.length}</span></div>
      <div class="pb-row"><span class="pb-label">Last worked</span><span class="pb-value" style="font-family:var(--font-body)">${formatDate(sessionBests[sessionBests.length-1].date)}</span></div>`;
    grid.appendChild(card);
  });
}

// ── TOAST ─────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"),2800);
}

// ── CONFIRM MODAL ─────────────────────────────────────────────────────────
let confirmCb=null;
function showConfirm(title,body,cb,confirmLabel="Confirm"){
  document.getElementById("modal-title").textContent=title;
  document.getElementById("modal-body-text").textContent=body;
  const btn=document.getElementById("modal-confirm-btn");
  btn.textContent=confirmLabel;
  confirmCb=cb;
  document.getElementById("confirm-modal").classList.add("open");
}
function closeModal(){
  document.getElementById("confirm-modal").classList.remove("open");
  confirmCb=null;
}
document.getElementById("modal-confirm-btn").addEventListener("click",()=>{
  if(confirmCb){confirmCb();closeModal();}
});
document.getElementById("confirm-modal").addEventListener("click",e=>{
  if(e.target===e.currentTarget) closeModal();
});

// ── HELPERS ───────────────────────────────────────────────────────────────
function formatDate(iso){
  const [y,m,d]=iso.split("-");
  const dt=new Date(+y,+m-1,+d);
  return dt.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
}

// ── INIT ──────────────────────────────────────────────────────────────────
buildExerciseForms();