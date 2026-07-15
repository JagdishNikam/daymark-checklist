const STORAGE_KEY = "daymark-v1";
const categoryNames = { health: "Health", focus: "Focus", personal: "Personal", home: "Home" };

const sampleTasks = [
  { id: crypto.randomUUID(), name: "Morning stretch", frequency: "daily", category: "health", time: "07:30", icon: "☀" },
  { id: crypto.randomUUID(), name: "Plan the day's priorities", frequency: "weekdays", category: "focus", time: "09:00", icon: "✦" },
  { id: crypto.randomUUID(), name: "Drink 8 glasses of water", frequency: "daily", category: "health", time: "", icon: "◒" },
  { id: crypto.randomUUID(), name: "30 minutes of movement", frequency: "daily", category: "health", time: "18:30", icon: "♥" },
  { id: crypto.randomUUID(), name: "Call someone I care about", frequency: "weekly", category: "personal", time: "", icon: "✦" }
];

let state = loadState();
let selectedDate = new Date();
let currentFilter = "all";
let selectedIcon = "☀";

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.tasks) return stored;
  } catch (_) {}
  const completions = {};
  const today = dateKey(new Date());
  completions[today] = [sampleTasks[0].id, sampleTasks[1].id];
  return { tasks: sampleTasks, completions, notes: {}, name: "", celebrations: true, dark: false };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date = new Date()) {
  const d = new Date(date); const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d;
}

function isSameDate(a, b) { return dateKey(a) === dateKey(b); }
function getGreeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
function formatTime(value) { if (!value) return "Anytime"; const [h,m]=value.split(":"); return new Date(2000,0,1,+h,+m).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}); }
function isTaskScheduled(task, date) {
  if (task.frequency === "daily") return true;
  if (task.frequency === "weekdays") return date.getDay() !== 0 && date.getDay() !== 6;
  return true;
}
function tasksForDate(date, includeWeekly = false) {
  return state.tasks.filter(t => isTaskScheduled(t, date) && (includeWeekly ? t.frequency === "weekly" : t.frequency !== "weekly"));
}
function completedFor(date) { return state.completions[dateKey(date)] || []; }
function completionRate(date) {
  const tasks = tasksForDate(date);
  if (!tasks.length) return 0;
  return Math.round(tasks.filter(t => completedFor(date).includes(t.id)).length / tasks.length * 100);
}

function render() {
  document.body.classList.toggle("dark", !!state.dark);
  document.querySelector('meta[name="theme-color"]').content = state.dark ? "#17201c" : "#f3efe6";
  renderHeader(); renderWeekStrip(); renderTasks(); renderInsights(); renderWeekly(); renderProgress(); renderSettings();
}

function renderHeader() {
  const isToday = isSameDate(selectedDate, new Date());
  document.getElementById("todayDate").textContent = isToday ? selectedDate.toLocaleDateString([], {weekday:"long", month:"long", day:"numeric"}) : selectedDate.toLocaleDateString([], {weekday:"long", month:"short", day:"numeric"});
  document.getElementById("todayTitle").textContent = isToday ? `${getGreeting()}${state.name ? `, ${state.name}` : ""}.` : "A look back.";
  const rate = completionRate(selectedDate);
  document.getElementById("progressRing").style.setProperty("--progress", rate);
  document.getElementById("progressPercent").textContent = `${rate}%`;
  document.getElementById("taskHeading").textContent = isToday ? "Today's rhythm" : selectedDate.toLocaleDateString([], {weekday:"long"}) + "'s rhythm";
  const note = document.getElementById("dailyNote"); if (document.activeElement !== note) note.value = state.notes[dateKey(selectedDate)] || "";
}

function renderWeekStrip() {
  const container = document.getElementById("weekStrip"); container.innerHTML = "";
  const monday = startOfWeek(selectedDate);
  for (let i=0;i<7;i++) {
    const d = new Date(monday); d.setDate(d.getDate()+i);
    const button = document.createElement("button");
    button.className = `day-chip ${isSameDate(d, selectedDate)?"active":""} ${completionRate(d)===100?"complete":""}`;
    button.innerHTML = `<span>${d.toLocaleDateString([], {weekday:"narrow"})}</span><strong>${d.getDate()}</strong><i></i>`;
    button.addEventListener("click", ()=>{selectedDate=d;render();}); container.appendChild(button);
  }
}

function taskCard(task, date, weekly = false) {
  const done = completedFor(date).includes(task.id);
  const el = document.createElement("article"); el.className=`task-card ${done?"done":""}`; el.dataset.category=task.category;
  el.innerHTML = `<div class="task-icon">${task.icon}</div><div><div class="task-name"></div><div class="task-meta"><span>${weekly?"This week":formatTime(task.time)}</span><i></i><span>${categoryNames[task.category]}</span></div></div><button class="check-button" aria-label="${done?"Mark incomplete":"Mark complete"}"><svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-9"/></svg></button>`;
  el.querySelector(".task-name").textContent=task.name;
  el.querySelector(".check-button").addEventListener("click",()=>toggleTask(task.id,date));
  let pressTimer; el.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;pressTimer=setTimeout(()=>deleteTask(task.id),650)}); ["pointerup","pointerleave","pointercancel"].forEach(ev=>el.addEventListener(ev,()=>clearTimeout(pressTimer)));
  return el;
}

function renderTasks() {
  const list=document.getElementById("taskList"); list.innerHTML="";
  const tasks=tasksForDate(selectedDate).filter(t=>currentFilter==="all"||t.category===currentFilter);
  tasks.sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")); tasks.forEach(t=>list.appendChild(taskCard(t,selectedDate)));
  document.getElementById("emptyState").hidden=tasks.length>0;
}

function renderInsights() {
  const tasks = tasksForDate(selectedDate).sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"));
  const completed = completedFor(selectedDate);
  const doneCount = tasks.filter(task => completed.includes(task.id)).length;
  const nextTask = tasks.find(task => !completed.includes(task.id));
  document.getElementById("completedCount").textContent = doneCount;
  document.getElementById("remainingCount").textContent = Math.max(tasks.length - doneCount, 0);
  document.getElementById("nextTaskIcon").textContent = nextTask?.icon || "✓";
  document.getElementById("nextTaskName").textContent = nextTask?.name || "Your day is clear";
  document.getElementById("nextTaskMeta").textContent = nextTask
    ? `${formatTime(nextTask.time)} · ${categoryNames[nextTask.category]}`
    : "Take a moment to reset.";
}

function toggleTask(id,date) {
  const key=dateKey(date); const ids=state.completions[key]||[]; const wasDone=ids.includes(id);
  state.completions[key]=wasDone?ids.filter(x=>x!==id):[...ids,id]; saveState(); render();
  if(!wasDone){ showToast("Nicely done"); if(state.celebrations && completionRate(date)===100) celebrate(); }
}
function deleteTask(id) { if(!confirm("Remove this task from your rhythm?")) return; state.tasks=state.tasks.filter(t=>t.id!==id); Object.keys(state.completions).forEach(k=>state.completions[k]=state.completions[k].filter(x=>x!==id));saveState();render();showToast("Task removed"); }

function renderWeekly() {
  const list=document.getElementById("weeklyTaskList");list.innerHTML="";const monday=startOfWeek();const weekly=state.tasks.filter(t=>t.frequency==="weekly");weekly.forEach(t=>list.appendChild(taskCard(t,monday,true)));
  if(!weekly.length) list.innerHTML='<div class="empty-state"><span>✦</span><h3>No weekly tasks yet</h3><p>Add one from the Today screen.</p></div>';
  const days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return d}); const rates=days.map(completionRate); const avg=Math.round(rates.reduce((a,b)=>a+b,0)/7);
  document.getElementById("weekPercent").textContent=`${avg}%`; document.getElementById("weekSummary").textContent=avg>=80?"A beautifully steady week.":avg>=40?"You are finding your rhythm.":"Every small step counts.";
  document.getElementById("miniBars").innerHTML=rates.map(v=>`<div class="mini-bar" style="--height:${35+Math.max(v,10)*.55}px;--value:${v}"></div>`).join("");
  const upcoming=document.getElementById("upcomingList");upcoming.innerHTML=""; days.forEach(d=>{const count=tasksForDate(d).length;const el=document.createElement("article");el.className="upcoming-day";el.innerHTML=`<div><time><strong>${d.getDate()}</strong><span>${d.toLocaleDateString([],{weekday:"short"})}</span></time><p>${isSameDate(d,new Date())?"Today":d.toLocaleDateString([],{month:"long",day:"numeric"})}</p></div><span>${count} ${count===1?"task":"tasks"}</span>`;upcoming.appendChild(el)});
}

function renderProgress() {
  const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d)} const rates=days.map(completionRate); const avg=Math.round(rates.reduce((a,b)=>a+b,0)/7);
  document.getElementById("sevenDayRate").textContent=`${avg}%`;document.getElementById("chartAverage").textContent=`${avg}% avg`;
  let streak=0;for(let i=0;i<365;i++){const d=new Date();d.setDate(d.getDate()-i);if(completionRate(d)>0)streak++;else if(i>0)break;}document.getElementById("currentStreak").textContent=streak;
  document.getElementById("barChart").innerHTML=days.map((d,i)=>`<div class="bar-column ${isSameDate(d,new Date())?"today":""}"><div class="bar-track"><div class="bar-fill" style="--value:${rates[i]}"></div></div><span>${d.toLocaleDateString([],{weekday:"narrow"})}</span></div>`).join("");
  const cats=Object.keys(categoryNames);document.getElementById("categoryProgress").innerHTML=cats.map(cat=>{let total=0,done=0;days.forEach(d=>tasksForDate(d).filter(t=>t.category===cat).forEach(t=>{total++;if(completedFor(d).includes(t.id))done++;}));const rate=total?Math.round(done/total*100):0;return `<div class="category-progress-row"><header><strong>${categoryNames[cat]}</strong><span>${rate}%</span></header><div class="progress-track"><div class="progress-fill" style="--value:${rate}"></div></div></div>`}).join("");
}

function renderSettings(){document.getElementById("nameInput").value=state.name||"";document.getElementById("celebrationToggle").checked=state.celebrations!==false;}
function showView(name){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`${name}View`));document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===name));scrollTo({top:0,behavior:"smooth"});if(name==="progress")renderProgress();}
function showToast(message){const t=document.getElementById("toast");t.textContent=message;t.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove("show"),1800)}
function celebrate(){const c=document.getElementById("celebration");c.classList.remove("show");void c.offsetWidth;c.classList.add("show");setTimeout(()=>c.classList.remove("show"),800);showToast("Your day is complete ✦")}

document.querySelectorAll(".nav-item").forEach(n=>n.addEventListener("click",()=>showView(n.dataset.view)));
document.getElementById("addTaskButton").addEventListener("click",()=>{document.getElementById("taskDialog").showModal();setTimeout(()=>document.getElementById("taskName").focus(),200)});
document.getElementById("closeDialog").addEventListener("click",()=>document.getElementById("taskDialog").close());
document.getElementById("iconPicker").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;document.querySelectorAll("#iconPicker button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedIcon=b.textContent});
document.getElementById("taskForm").addEventListener("submit",e=>{e.preventDefault();const name=document.getElementById("taskName").value.trim();if(!name)return;state.tasks.push({id:crypto.randomUUID(),name,frequency:document.getElementById("taskFrequency").value,category:document.getElementById("taskCategory").value,time:document.getElementById("taskTime").value,icon:selectedIcon});saveState();document.getElementById("taskDialog").close();e.target.reset();render();showToast("Added to your rhythm")});
document.getElementById("dailyNote").addEventListener("input",e=>{state.notes[dateKey(selectedDate)]=e.target.value;saveState()});
document.getElementById("filterButton").addEventListener("click",()=>{const filters=["all","health","focus","personal","home"];currentFilter=filters[(filters.indexOf(currentFilter)+1)%filters.length];document.querySelector("#filterButton span").textContent=currentFilter==="all"?"All":categoryNames[currentFilter];renderTasks()});
document.getElementById("themeButton").addEventListener("click",()=>{state.dark=!state.dark;saveState();render()});
document.getElementById("nameInput").addEventListener("change",e=>{state.name=e.target.value.trim();saveState();renderHeader();showToast("Greeting updated")});
document.getElementById("celebrationToggle").addEventListener("change",e=>{state.celebrations=e.target.checked;saveState()});
document.getElementById("exportButton").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`daymark-backup-${dateKey(new Date())}.json`;a.click();URL.revokeObjectURL(a.href);showToast("Data exported")});
document.getElementById("resetButton").addEventListener("click",()=>{if(confirm("Reset all tasks and progress to the demo?")){localStorage.removeItem(STORAGE_KEY);location.reload()}});

if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("service-worker.js");
render();
