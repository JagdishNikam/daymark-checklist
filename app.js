import {
  CATEGORY_LABELS, DEFAULT_CYCLE_START, addDays, completionFraction, completionStreaks, consistencyLeaders,
  cycleForDate, cycleWeeks, dateKey, datesInRange, entryFor, formatRange, habitState, habitStats, isFuture, isPast,
  isScheduled, parseDate, scoreDay, scorePeriod, streakForHabit, weightStats
} from "./model.js";
import { DaymarkStore } from "./storage.js";
import { ICON_NAMES, icon } from "./icons.js";

const store = new DaymarkStore();
let state = store.state;
let activeView = "dashboard";
let selectedDate = dateKey(new Date());
let selectedCycleIndex = Math.max(0, cycleForDate(new Date(), state.settings.cycleAnchor).index);
let dashboardWeek = Math.max(0, Math.min(3, cycleForDate(new Date(), state.settings.cycleAnchor).week-1));
let inputTimer;

const DASHBOARD_GROUPS = {
  morning:{label:"Morning Foundation",icon:"sunrise"},
  spiritual:{label:"Spiritual Routine",icon:"temple"},
  nutrition:{label:"Nutrition & Hydration",icon:"nutrition"},
  care:{label:"Recovery & Personal Care",icon:"hair"}
};

const DASHBOARD_ACTIONS = [
  {key:"wake",label:"Wake up between 6:30–7:00 AM",habitId:"wake-630",icon:"sunrise",group:"morning",timeLabel:"6:30–7:00 AM"},
  {key:"coffee",label:"Black coffee",habitId:"black-coffee",icon:"coffee",group:"morning"},
  {key:"temple",label:"Go to temple",habitId:"temple-ritual",subtaskIds:["visited"],icon:"temple",group:"spiritual"},
  {key:"gajara",label:"Offer Gajra to Goddess Parvati",habitId:"temple-ritual",subtaskIds:["parvati-gajra"],icon:"spark",group:"spiritual"},
  {key:"devpuja",label:"Dev Puja at home",habitId:"dev-puja",icon:"spark",group:"spiritual"},
  {key:"amla",label:"Amla juice",habitId:"avla-drink",icon:"leaf",group:"nutrition"},
  {key:"beetroot",label:"Beetroot juice",habitId:"beetroot-juice",icon:"drop",group:"nutrition"},
  {key:"paneer",label:"Protein lunch",habitId:"protein-lunch",icon:"utensils",group:"nutrition"},
  {key:"protein-dinner",label:"Protein dinner",habitId:"protein-dinner",icon:"bowl",group:"nutrition"},
  {key:"water-1",label:"Water intake 1",habitId:"water-intake-1",icon:"drop",group:"nutrition"},
  {key:"water-2",label:"Water intake 2",habitId:"water-intake-2",icon:"drop",group:"nutrition"},
  {key:"hair-care",label:"Hair care",habitId:"hair-care",icon:"hair",group:"care"},
  {key:"physio",label:"Back physiotherapy",habitId:"back-physio",icon:"physio",group:"care"}
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const scoreText = value => value == null ? "—" : `${value}%`;
const displayDate = (key, options={weekday:"long",month:"long",day:"numeric"}) => parseDate(key).toLocaleDateString([],options);
const currentCycle = () => cycleForDate(new Date(), state.settings.cycleAnchor);
const cycleByIndex = index => {
  const start=dateKey(addDays(state.settings.cycleAnchor,index*28));
  return {index,number:index+1,start,end:dateKey(addDays(start,27)),day:1,week:1};
};
const categoryIcon = category => ({morning:"sunrise",spiritual:"temple",nutrition:"nutrition",wellness:"activity",fitness:"dumbbell",learning:"book",private:"shield",custom:"check"}[category]||"check");

function syncState(){ state=store.state; }
function renderIconSlots(root=document){ root.querySelectorAll("[data-icon]").forEach(el=>{el.innerHTML=icon(el.dataset.icon);}); }
function formatTime(value){if(!value)return"Anytime";const[h,m]=value.split(":");return new Date(2000,0,1,+h,+m).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});}
function formatNumber(value,digits=1){return Number.isFinite(value)?Number(value).toFixed(digits):"—";}
function habitName(habit){return habit.private&&state.settings.privateLabelHidden?"Private Goal":habit.name;}
function stateLabel(status){return ({completed:"Completed",missed:"Missed",pending:"Pending",partial:"Partial",upcoming:"Upcoming","not-scheduled":"Not scheduled"}[status]||status);}
function motivationalMessage(score){if(score==null)return"Start with one honest check-in.";if(score>=90)return"Exceptional consistency. Protect this standard.";if(score>=75)return"Strong momentum—keep the next action simple.";if(score>=50)return"You are building traction. Stay with the process.";return"A reset is progress too. Begin with one small win.";}
function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove("show"),1900);}
function openDialog(id){const dialog=document.getElementById(id);if(dialog&&!dialog.open)dialog.showModal();}
function closeDialog(id){const dialog=document.getElementById(id);if(dialog?.open)dialog.close();}

function render(){
  applyTheme();
  renderSidebar();
  renderDashboard();
  renderToday();
  renderCycle();
  renderHistory();
  renderSettings();
  renderQuickAddFields();
  renderIconSlots();
}

function applyTheme(){
  document.body.classList.add("dark");
  document.querySelector('meta[name="theme-color"]').content="#070a12";
}

function renderSidebar(){
  const cycle=currentCycle();
  const cycleScore=scorePeriod(state,cycle.start,cycle.end);
  $("#sidebarCycle").innerHTML=`<p>CURRENT CYCLE</p><strong>Day ${cycle.day} of 28</strong><span>Week ${cycle.week} · ${formatRange(cycle.start,cycle.end)}</span><div class="progress-track"><div class="progress-fill" style="--value:${cycleScore.score||0}"></div></div>`;
}

function headerMarkup(kicker,title,subtitle,actions="",chips=""){
  return `<header class="page-header"><div><p class="kicker">${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p>${chips?`<div class="header-chips">${chips}</div>`:""}</div><div class="page-header-actions">${actions}</div></header>`;
}

function getInsights(cycle){
  const insights=[];
  const today=dateKey(new Date());
  const leaders=consistencyLeaders(state,cycle.start,cycle.end);
  const workout=state.habits.find(h=>h.id==="workout");
  const learning=state.habits.find(h=>h.id==="learning");
  if(workout){const stats=habitStats(state,workout,cycle.start,cycle.end);if(stats.scheduled)insights.push({icon:"dumbbell",title:"Workout consistency",text:`You completed ${stats.completed} of ${stats.scheduled} eligible workouts this cycle (${stats.rate}%).`});}
  if(leaders.best?.completed) insights.push({icon:"trend",title:"Strongest habit",text:`${habitName(leaders.best.habit)} is currently your strongest habit at ${leaders.best.rate}% consistency.`});
  if(learning){const weeks=cycleWeeks(cycle);const currentWeek=Math.max(0,Math.min(3,cycleForDate(today,state.settings.cycleAnchor).week-1));if(currentWeek>0){const a=habitStats(state,learning,weeks[currentWeek-1].start,weeks[currentWeek-1].end);const b=habitStats(state,learning,weeks[currentWeek].start,weeks[currentWeek].end);if(a.scheduled&&b.scheduled)insights.push({icon:"book",title:"Learning trend",text:`Learning consistency is ${b.rate>a.rate?"up":b.rate<a.rate?"down":"steady"} versus last week (${b.rate}% vs ${a.rate}%).`});}}
  if(!insights.length)insights.push({icon:"spark",title:"Your insights will grow",text:"Complete a few scheduled habits and Daymark will surface real patterns from your data."});
  return insights.slice(0,3);
}

function dashboardActionStatus(action,date){
  if(isFuture(date))return"upcoming";
  const saved=state.actionStates?.[date]?.[action.key];
  if(saved==="completed")return"completed";
  if(saved==="missed")return"missed";
  if(saved==="not-applicable")return"not-scheduled";
  const habit=state.habits.find(item=>item.id===action.habitId);
  if(!habit||!isScheduled(habit,date))return"not-scheduled";
  if(!action.subtaskIds)return habitState(state,habit,date);
  const subtasks=entryFor(state,habit.id,date).subtasks||{};
  const completed=action.subtaskIds.filter(id=>subtasks[id]).length;
  if(completed===action.subtaskIds.length)return"completed";
  if(completed>0)return"partial";
  return isPast(date)?"missed":"pending";
}

function dashboardStateIcon(status){
  if(["upcoming","pending"].includes(status))return"";
  if(status==="not-scheduled")return`<span class="status-glyph na-mark" aria-hidden="true">N/A</span>`;
  return `<span class="status-glyph">${icon(status==="completed"?"check":status==="missed"?"x":"clock")}</span>`;
}
function dashboardStateLabel(status){return status==="not-scheduled"?"Not applicable":status==="missed"?"Not completed":stateLabel(status);}

function compactCalendarMarkup(cycle,selected){
  return `<div class="compact-calendar-labels">${["S","M","T","W","T","F","S"].map(day=>`<span>${day}</span>`).join("")}</div><div class="compact-calendar-grid">${datesInRange(cycle.start,cycle.end).map((date,index)=>{
    const statuses=DASHBOARD_ACTIONS.map(action=>dashboardActionStatus(action,date));
    const eligible=statuses.filter(status=>!["not-scheduled","upcoming"].includes(status));
    const done=statuses.filter(status=>status==="completed").length;
    const level=isFuture(date)?"future":eligible.length&&done===eligible.length?"complete":done?"progress":statuses.includes("missed")?"missed":"empty";
    return `<button class="compact-day ${level} ${date===dateKey(new Date())?"today":""} ${date===selected?"selected":""}" data-dashboard-date="${date}" aria-label="Open ${displayDate(date)}"><strong>${index+1}</strong><i></i></button>`;
  }).join("")}</div>`;
}

function actionMatrixMarkup(cycle){
  const week=cycleWeeks(cycle)[cycle.week-1],dates=datesInRange(week.start,week.end);
  const rows=Object.entries(DASHBOARD_GROUPS).map(([group,meta])=>`<div class="matrix-group group-${group}">${icon(meta.icon)}<span>${escapeHtml(meta.label)}</span></div>${DASHBOARD_ACTIONS.filter(action=>action.group===group).map(action=>`<div class="matrix-action group-${group}"><span class="action-symbol">${icon(action.icon)}</span><strong>${escapeHtml(action.label)}</strong></div>${dates.map(date=>{const status=dashboardActionStatus(action,date);return`<div class="matrix-state ${status}" role="img" aria-label="${escapeHtml(action.label)} on ${displayDate(date)}: ${dashboardStateLabel(status)}" title="${dashboardStateLabel(status)}">${dashboardStateIcon(status)}</div>`;}).join("")}`).join("")}`).join("");
  return `<div class="action-matrix-scroll"><div class="action-matrix"><div class="matrix-corner">ACTION</div>${dates.map(date=>`<div class="matrix-day ${date===dateKey(new Date())?"today":""}"><strong>${displayDate(date,{weekday:"short"})}</strong><span>${displayDate(date,{day:"numeric"})}</span></div>`).join("")}${rows}</div></div>`;
}

function dailyActionCardsMarkup(date){
  return DASHBOARD_ACTIONS.map(action=>{
    const habit=state.habits.find(item=>item.id===action.habitId),status=dashboardActionStatus(action,date),future=isFuture(date),today=date===dateKey(new Date()),entry=entryFor(state,action.habitId,date),saved=state.actionStates?.[date]?.[action.key];
    const selected=action.activity&&status==="completed"?(entry.activity||""):(saved||(status==="completed"?"completed":status==="missed"?"missed":status==="not-scheduled"?"not-applicable":""));
    const options=action.activity?[["","Choose status"],["swimming","Completed · Swimming"],["walking","Completed · Walking"],["missed","Not completed"],["not-applicable","Not applicable"]]:[["","Choose status"],["completed","Completed"],["missed","Not completed"],["not-applicable","Not applicable"]];
    const control=future?`<span class="action-upcoming-label">Upcoming</span>`:today?`<button class="current-complete-button ${status==="completed"?"done":""}" data-action-complete="${action.key}" data-date="${date}" aria-label="${status==="completed"?"Completed":"Mark complete"}: ${escapeHtml(action.label)}" ${status==="completed"?"disabled":""}>${icon("statusComplete")}<span>${status==="completed"?"Completed":"Complete"}</span></button>`:`<select class="action-status-select ${status}" data-action-status="${action.key}" data-date="${date}" aria-label="Status for ${escapeHtml(action.label)}">${options.map(([value,label])=>`<option value="${value}" ${selected===value?"selected":""}>${label}</option>`).join("")}</select>`;
    return `<article class="daily-action-card ${status} group-${action.group}"><div class="daily-action-icon">${icon(action.icon)}</div><div><h3>${escapeHtml(action.label)}</h3><p>${action.timeLabel||habit?escapeHtml(action.timeLabel||formatTime(habit.time)):"Anytime"} · ${dashboardStateLabel(status)}</p></div>${control}</article>`;
  }).join("");
}

function renderDashboard(){
  const cycle=currentCycle(),week=cycleWeeks(cycle)[cycle.week-1];
  $("#dashboardContent").innerHTML=`
    <header class="visual-header"><p class="kicker">WEEK ${cycle.week} · ${formatRange(week.start,week.end)}</p><span class="quote-mark">“</span><h1>Small disciplines, repeated daily, create a life you’re proud of.</h1><p>Focus on today. Let consistency build the result.</p></header>
    <section class="card improvement-board"><div class="board-heading"><div><p class="kicker">CURRENT WEEK</p><h2>Your actions at a glance</h2><p><span class="legend-dot completed"></span> Completed <span class="legend-dot missed"></span> Not completed <span class="legend-dot na"></span> Not applicable</p></div></div>${actionMatrixMarkup(cycle)}</section>`;
}

function greeting(){const hour=new Date().getHours();return hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";}
function weightCardMarkup(stats,date){
  const delta=stats.change;
  return `<div class="card-title-row"><div><p class="kicker">WEIGHT PROGRESS</p><h2>Cycle trend</h2></div>${icon("scale")}</div><div class="weight-hero"><div class="weight-value"><strong>${stats.latest==null?"—":formatNumber(stats.latest)}</strong> <span>kg latest</span></div><span class="weight-delta ${delta>0?"up":""}">${delta==null?"No trend yet":`${delta>0?"+":""}${formatNumber(delta)} kg this cycle`}</span></div>${sparklineMarkup(stats.values)}<div class="progress-track"><div class="progress-fill" style="--value:${stats.progress}"></div></div><p class="privacy-copy">${stats.target==null?"Set a target weight in Settings to track progress.":`${formatNumber(stats.remaining)} kg remaining to target · ${stats.progress}% progress`}</p><button class="button" data-action="record-weight" data-date="${date}" style="margin-top:11px">${icon("plus")} Add today’s weight</button>`;
}
function sparklineMarkup(values){
  if(values.length<2)return`<div class="empty-spark">Add two measurements to reveal your trend</div>`;
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const points=values.map((value,index)=>`${index/(values.length-1)*100},${48-(value-min)/range*38}`).join(" ");
  return `<svg class="sparkline" viewBox="0 0 100 54" preserveAspectRatio="none" aria-label="Weight trend"><defs><linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e33c4f" stop-opacity=".22"/><stop offset="1" stop-color="#e33c4f" stop-opacity="0"/></linearGradient></defs><polygon class="area" points="0,54 ${points} 100,54"/><polyline points="${points}"/></svg>`;
}
function weekCardMarkup(week,stats,current){
  const days=datesInRange(week.start,week.end);
  return `<button class="week-card ${current?"current":""}" data-open-week="${week.index}"><header><div><h3>Week ${week.number}</h3><span>${formatRange(week.start,week.end)}</span></div><div class="week-score">${scoreText(stats.score)}</div></header><div class="week-dots">${days.map(key=>`<i class="week-dot ${dayLevel(key)}"></i>`).join("")}</div><footer><span>${stats.completed} completed</span><span>${stats.missed} missed</span></footer></button>`;
}
function dayLevel(key){
  if(isFuture(key))return"future";
  const day=scoreDay(state,key);if(day.score===100)return"complete";if(day.score>0)return"partial";if(day.missed>0)return"missed";return"";
}
function heatmapMarkup(cycle,selected){
  const labels=["S","M","T","W","T","F","S"];
  return `<div class="heat-labels">${labels.map(x=>`<span>${x}</span>`).join("")}</div><div class="heatmap">${datesInRange(cycle.start,cycle.end).map((key,index)=>{const stats=scoreDay(state,key);const score=stats.score;const level=isFuture(key)?"future":score>=80?"level-high":score>=40?"level-mid":stats.missed?"missed":score===0?"level-low":"";return`<button class="heat-day ${level} ${key===dateKey(new Date())?"today":""} ${key===selected?"selected":""}" data-select-date="${key}" ${isFuture(key)?"aria-label=\"Upcoming day\"":""}><strong>${index+1}</strong><span>${score==null?"—":`${score}%`}</span></button>`;}).join("")}</div>`;
}
function routinePreviewMarkup(date){
  const habits=state.habits.filter(h=>h.active&&isScheduled(h,date)).slice(0,6);
  if(!habits.length)return`<div class="empty-state"><h2>A positive rest day</h2><p>No scored habits are scheduled.</p></div>`;
  return habits.map(h=>{const status=habitState(state,h,date);return`<article class="routine-row"><div class="habit-icon">${icon(h.icon)}</div><div><h3>${escapeHtml(habitName(h))}</h3><p>${h.type==="subtasks"?`${Math.round(completionFraction(h,entryFor(state,h.id,date))*(h.subtasks?.length||1))} of ${h.subtasks?.length||0} parts`:formatTime(h.time)}</p></div><span class="state-badge ${status}">${stateLabel(status)}</span></article>`;}).join("");
}

function renderToday(){
  const cycle=cycleForDate(selectedDate,state.settings.cycleAnchor);
  $("#todayContent").innerHTML=`
    <div class="date-switcher"><button data-shift-date="-1" aria-label="Previous day">${icon("arrowLeft")}</button><div><strong>${displayDate(selectedDate,{weekday:"long",month:"short",day:"numeric"})}</strong><span>Week ${cycle.week} · Day ${cycle.day} of 28</span></div><button data-shift-date="1" aria-label="Next day">${icon("arrowRight")}</button></div>
    <section class="today-actions"><div class="section-heading"><div><h2>Actions for this day</h2><p>Completed actions are highlighted in green. Previous days remain editable.</p></div></div><div class="daily-action-grid today-action-grid">${dailyActionCardsMarkup(selectedDate)}</div></section>`;
}
function habitGroupMarkup(category,habits,date){return`<section><div class="habit-group-title">${icon(categoryIcon(category))}<span>${escapeHtml(CATEGORY_LABELS[category]||category)}</span></div><div class="habit-stack">${habits.map(h=>habitCardMarkup(h,date)).join("")}</div></section>`;}
function habitCardMarkup(habit,date){
  const status=habitState(state,habit,date),entry=entryFor(state,habit.id,date),disabled=["not-scheduled","upcoming"].includes(status);
  const meta=`<span>${formatTime(habit.time)}</span><i></i><span>${stateLabel(status)}</span><i></i><span>${habit.points} pts</span>`;
  let details="";
  if(habit.type==="subtasks")details=`<div class="subtask-list">${habit.subtasks.map(item=>`<label class="subtask"><span>${escapeHtml(item.name)}</span><input type="checkbox" data-subtask="${habit.id}" data-subtask-id="${item.id}" data-date="${date}" ${entry.subtasks?.[item.id]?"checked":""} ${disabled?"disabled":""}/></label>`).join("")}</div><p class="detail-progress">${Math.round(completionFraction(habit,entry)*habit.subtasks.length)} of ${habit.subtasks.length} completed · partial credit applies</p>`;
  if(habit.type==="learning")details=`<div class="inline-fields"><div class="field-grid"><label class="compact-field"><span>Minutes studied</span><input type="number" min="0" max="720" step="5" inputmode="numeric" data-entry-field="minutes" data-habit-id="${habit.id}" data-date="${date}" value="${escapeHtml(entry.minutes||"")}" ${disabled?"disabled":""}/></label><label class="compact-field"><span>Topic learned</span><input maxlength="100" data-entry-field="topic" data-habit-id="${habit.id}" data-date="${date}" value="${escapeHtml(entry.topic||"")}" placeholder="Optional topic" ${disabled?"disabled":""}/></label></div><label class="compact-field"><span>Completion correction</span><select data-entry-field="manualStatus" data-habit-id="${habit.id}" data-date="${date}" ${disabled?"disabled":""}><option value="" ${!entry.manualStatus?"selected":""}>Automatic from minutes</option><option value="completed" ${entry.manualStatus==="completed"?"selected":""}>Force completed</option><option value="pending" ${entry.manualStatus==="pending"?"selected":""}>Force incomplete</option></select></label></div><p class="detail-progress">${Math.min(Number(entry.minutes)||0,60)} of 60 minutes · completes automatically at 60 unless corrected</p>`;
  if(habit.type==="activity")details=`<div class="inline-fields"><div class="activity-choice"><button class="choice-button ${entry.activity==="swimming"?"selected":""}" data-activity="swimming" data-habit-id="${habit.id}" data-date="${date}" ${disabled?"disabled":""}>Swimming</button><button class="choice-button ${entry.activity==="walking"?"selected":""}" data-activity="walking" data-habit-id="${habit.id}" data-date="${date}" ${disabled?"disabled":""}>Walking</button><button class="choice-button" data-activity="" data-habit-id="${habit.id}" data-date="${date}" ${!entry.activity||disabled?"disabled":""}>Clear</button></div><div class="field-grid"><label class="compact-field"><span>Duration (minutes)</span><input type="number" min="0" max="600" data-entry-field="duration" data-habit-id="${habit.id}" data-date="${date}" value="${escapeHtml(entry.duration||"")}" ${disabled?"disabled":""}/></label><label class="compact-field"><span>Distance (optional)</span><input maxlength="30" data-entry-field="distance" data-habit-id="${habit.id}" data-date="${date}" value="${escapeHtml(entry.distance||"")}" placeholder="e.g. 3 km" ${disabled?"disabled":""}/></label></div><label class="compact-field"><span>Short note</span><input maxlength="120" data-entry-field="note" data-habit-id="${habit.id}" data-date="${date}" value="${escapeHtml(entry.note||"")}" placeholder="Optional" ${disabled?"disabled":""}/></label></div>`;
  const fraction=completionFraction(habit,entry);
  const control=habit.type==="boolean"?`<button class="completion-button ${fraction===1?"done":""}" data-toggle-habit="${habit.id}" data-date="${date}" aria-label="${fraction===1?"Mark incomplete":"Mark complete"}: ${escapeHtml(habitName(habit))}" ${disabled?"disabled":""}>${fraction===1?icon("check"):""}</button>`:`<span class="state-badge ${status}">${stateLabel(status)}</span>`;
  return`<article class="habit-card" data-state="${status}"><div class="habit-main"><button class="habit-icon" data-open-habit="${habit.id}" aria-label="Open ${escapeHtml(habitName(habit))} details">${icon(habit.icon)}</button><div class="habit-copy clickable" data-open-habit="${habit.id}"><h3>${escapeHtml(habitName(habit))}</h3>${habit.description?`<p>${escapeHtml(habit.description)}</p>`:""}<div class="habit-meta">${meta}</div></div>${control}</div>${details?`<div class="habit-details">${details}<p class="autosave-note">Saved automatically</p></div>`:""}</article>`;
}
function weightGroupMarkup(date){const weight=state.weights[date];return`<section><div class="habit-group-title">${icon("scale")}<span>Weight check-in</span></div><article class="habit-card" data-state="${weight?"completed":"not-scheduled"}"><div class="habit-main"><div class="habit-icon">${icon("scale")}</div><div><h3>${weight?`${formatNumber(weight.value)} kg`:"Not recorded"}</h3><p>${weight?.note?escapeHtml(weight.note):"Optional measurement · never affects score"}</p></div><button class="button" data-action="record-weight" data-date="${date}" ${isFuture(date)?"disabled":""}>${weight?"Edit":"Add"}</button></div></article></section>`;}
function oneTimeGroupMarkup(date){const tasks=state.oneTimeTasks.filter(task=>task.date===date);if(!tasks.length)return"";return`<section><div class="habit-group-title">${icon("check")}<span>One-time tasks</span></div><div class="habit-stack">${tasks.map(task=>`<article class="habit-card" data-state="${task.completed?"completed":isFuture(date)?"upcoming":"pending"}"><div class="habit-main"><div class="habit-icon">${icon("check")}</div><div><h3>${escapeHtml(task.name)}</h3><p>${escapeHtml(task.category||"One-time")}</p></div><button class="completion-button ${task.completed?"done":""}" data-toggle-task="${task.id}" ${isFuture(date)?"disabled":""}>${task.completed?icon("check"):""}</button></div></article>`).join("")}</div></section>`;}

function renderCycle(){
  const cycle=cycleByIndex(selectedCycleIndex),stats=scorePeriod(state,cycle.start,cycle.end),weeks=cycleWeeks(cycle),weights=weightStats(state,cycle),previous=selectedCycleIndex>0?weightStats(state,cycleByIndex(selectedCycleIndex-1)):null;
  const leaders=consistencyLeaders(state,cycle.start,cycle.end);
  const actions=`<div class="cycle-nav"><button data-cycle-shift="-1" ${selectedCycleIndex<=0?"disabled":""} aria-label="Previous cycle">${icon("arrowLeft")}</button><button data-cycle-shift="1" ${selectedCycleIndex>=currentCycle().index?"disabled":""} aria-label="Next cycle">${icon("arrowRight")}</button></div>`;
  $("#cycleContent").innerHTML=`${headerMarkup(`CYCLE ${cycle.number}`,"Your 28-day cycle",formatRange(cycle.start,cycle.end),actions,`<span class="chip accent">${scoreText(stats.score)} cycle score</span><span class="chip">${stats.completed} completed</span>`)}
    <div class="cycle-content-grid"><div>
      <section class="card" style="padding:17px"><div class="section-heading"><div><h2>28-day heatmap</h2><p>Four Sunday–Saturday weeks</p></div></div>${heatmapMarkup(cycle,selectedDate)}</section>
      <section class="section"><div class="section-heading"><div><h2>Weekly performance</h2><p>Scores use only eligible scheduled activities</p></div></div><div class="week-grid">${weeks.map((week,index)=>weekCardMarkup(week,scorePeriod(state,week.start,week.end),currentCycle().index===cycle.index&&currentCycle().week===index+1)).join("")}</div></section>
      <section class="section card" style="padding:17px"><div class="section-heading"><div><h2>Weight trend</h2><p>${previous?.latest!=null&&weights.latest!=null?`Latest is ${formatNumber(weights.latest-previous.latest)} kg versus previous cycle close.`:"Neutral measurement · add entries to compare cycles."}</p></div><button class="button" data-action="record-weight" data-date="${selectedDate}">${icon("plus")} Add</button></div>${weightChartMarkup(cycle)}<div class="weight-stats"><div class="metric"><strong>${formatNumber(weights.lowest)}</strong><span>Lowest kg</span></div><div class="metric"><strong>${formatNumber(weights.average)}</strong><span>Average kg</span></div><div class="metric"><strong>${formatNumber(weights.highest)}</strong><span>Highest kg</span></div></div></section>
      <section class="section"><div class="section-heading"><div><h2>Habit performance</h2><p>Select any habit for its detail view</p></div></div><div class="performance-list">${state.habits.filter(h=>h.active).map(h=>performanceRowMarkup(h,cycle)).join("")}</div></section>
    </div><aside class="cycle-side">
      <div class="cycle-stats"><article class="card stat-card"><span>Cycle score</span><strong>${scoreText(stats.score)}</strong><small>eligible points</small></article><article class="card stat-card"><span>Completed</span><strong>${stats.completed}</strong><small>habit instances</small></article><article class="card stat-card"><span>Missed</span><strong>${stats.missed}</strong><small>past only</small></article><article class="card stat-card"><span>Partial</span><strong>${stats.partial}</strong><small>credit earned</small></article></div>
      <article class="card" style="padding:17px"><p class="kicker">CYCLE SIGNALS</p><div class="insight-list" style="grid-template-columns:1fr">${leaders.best?`<div class="insight"><div class="icon-wrap">${icon("trend")}</div><div><h3>Most consistent</h3><p>${escapeHtml(habitName(leaders.best.habit))} · ${leaders.best.rate}%</p></div></div>`:""}${leaders.attention?`<div class="insight"><div class="icon-wrap">${icon("target")}</div><div><h3>Needs attention</h3><p>${escapeHtml(habitName(leaders.attention.habit))} · ${leaders.attention.rate}%</p></div></div>`:""}</div></article>
    </aside></div>`;
}
function performanceRowMarkup(habit,cycle){const stats=habitStats(state,habit,cycle.start,cycle.end);return`<button class="performance-row" data-open-habit="${habit.id}"><div class="habit-icon">${icon(habit.icon)}</div><div><h3>${escapeHtml(habitName(habit))}</h3><p>${stats.completed} of ${stats.scheduled} completed · ${habit.points} pts</p></div><strong class="performance-rate">${scoreText(stats.rate)}</strong></button>`;}
function weightChartMarkup(cycle){
  const points=datesInRange(cycle.start,cycle.end).map((date,index)=>({date,index,value:state.weights[date]?.value})).filter(p=>Number.isFinite(p.value));
  if(points.length<2)return`<div class="empty-state" style="padding:28px"><h2>No weight trend yet</h2><p>Add at least two measurements in this cycle.</p></div>`;
  const values=points.map(p=>p.value),min=Math.min(...values)-.5,max=Math.max(...values)+.5,range=max-min||1;
  const coords=points.map(p=>({x:5+p.index/27*90,y:8+(max-p.value)/range*72,...p}));
  return`<div class="weight-chart"><svg viewBox="0 0 100 90" preserveAspectRatio="none" role="img" aria-label="Weight trend for this cycle"><line class="grid-line" x1="5" y1="8" x2="95" y2="8"/><line class="grid-line" x1="5" y1="44" x2="95" y2="44"/><line class="grid-line" x1="5" y1="80" x2="95" y2="80"/><polyline class="trend-line" points="${coords.map(p=>`${p.x},${p.y}`).join(" ")}"/>${coords.map(p=>`<circle class="point" cx="${p.x}" cy="${p.y}" r="1.8"/>`).join("")}</svg></div><div class="weight-chart-labels"><span>Day 1</span><span>Day 14</span><span>Day 28</span></div>`;
}

function renderHistory(){
  const current=currentCycle(),cycles=Array.from({length:Math.max(1,current.index+1)},(_,i)=>cycleByIndex(i)).reverse();
  const lifetime=scorePeriod(state,state.settings.cycleAnchor,dateKey(new Date()));
  const streaks=completionStreaks(state);
  $("#historyContent").innerHTML=`${headerMarkup("LONG-TERM HISTORY","Your improvement archive","Every cycle remains available on this device.",`<button class="button" data-action="export">${icon("download")} Export backup</button>`,`<span class="chip accent">${scoreText(lifetime.score)} lifetime</span><span class="chip">${streaks.current} day streak</span><span class="chip">Best ${streaks.longest}</span>`)}<div class="history-list">${cycles.map(cycle=>historyCardMarkup(cycle,current.index===cycle.index)).join("")}</div>`;
}
function historyCardMarkup(cycle,current){const stats=scorePeriod(state,cycle.start,cycle.end),weights=weightStats(state,cycle),leaders=consistencyLeaders(state,cycle.start,cycle.end);return`<button class="history-card" data-open-cycle="${cycle.index}"><div><p class="kicker">CYCLE ${cycle.number}${current?" · CURRENT":""}</p><h2>${formatRange(cycle.start,cycle.end)}</h2><p>${stats.completed} completed · ${stats.missed} missed · ${weights.change==null?"No weight change":`${weights.change>0?"+":""}${formatNumber(weights.change)} kg`} ${leaders.best?`· Best: ${escapeHtml(habitName(leaders.best.habit))}`:""}</p></div><strong class="history-score">${scoreText(stats.score)}</strong></button>`;}

function renderSettings(){
  const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  $("#settingsContent").innerHTML=`${headerMarkup("PREFERENCES","Make Daymark yours","Every setting is stored locally and applies to future calculations.",`<button class="button primary" data-action="quick-add">${icon("plus")} Add habit</button>`)}
    <div class="settings-layout">
      <section class="card settings-section"><header><h2>Profile & cycle</h2><p>Your greeting and deterministic cycle anchor.</p></header><div class="setting-list">
        <label class="setting-row"><span><strong>Your name</strong><small>Used in the greeting</small></span><input type="text" maxlength="30" data-setting="name" value="${escapeHtml(state.settings.name)}" placeholder="Your name"/></label>
        <label class="setting-row"><span><strong>Cycle start date</strong><small>Each cycle repeats every 28 days</small></span><input type="date" data-setting="cycleAnchor" value="${state.settings.cycleAnchor}"/></label>
        <div class="setting-row"><span><strong>Theme</strong><small>Premium charcoal dark theme</small></span><span class="chip accent">Dark</span></div>
      </div></section>
      <section class="card settings-section"><header><h2>Weight goals</h2><p>Measurements stay separate from habit scoring.</p></header><div class="setting-list">
        <label class="setting-row"><span><strong>Starting weight</strong><small>kg at the beginning</small></span><input type="number" min="20" max="400" step="0.1" data-setting-number="startingWeight" value="${state.settings.startingWeight??""}" placeholder="kg"/></label>
        <label class="setting-row"><span><strong>Target weight</strong><small>Used for neutral progress only</small></span><input type="number" min="20" max="400" step="0.1" data-setting-number="targetWeight" value="${state.settings.targetWeight??""}" placeholder="kg"/></label>
        <label class="setting-row"><span><strong>Hide private habit name</strong><small>Display “Private Goal” on dashboards</small></span><span class="switch"><input type="checkbox" data-setting-checkbox="privateLabelHidden" ${state.settings.privateLabelHidden?"checked":""}/><i></i></span></label>
      </div></section>
      <section class="card settings-section full"><header><h2>Habits & scoring weights</h2><p>Edit, reorder, deactivate, and configure scoring. Sunday remains positive when habits are unscheduled.</p></header><div class="habit-settings-list">${state.habits.map((h,index)=>`<div class="habit-setting"><div class="habit-icon">${icon(h.icon)}</div><div><h3>${escapeHtml(habitName(h))}</h3><p>${h.schedule.map(day=>days[day]).join(", ")} · ${h.active?"Active":"Inactive"}</p></div><label class="compact-field"><span>Points</span><input class="score-input" type="number" min="0" max="100" data-habit-points="${h.id}" value="${h.points}"/></label><div class="row-actions"><button class="mini-button" data-move-habit="${h.id}" data-direction="-1" aria-label="Move ${escapeHtml(habitName(h))} up" ${index===0?"disabled":""}>${icon("arrowUp")}</button><button class="mini-button" data-move-habit="${h.id}" data-direction="1" aria-label="Move ${escapeHtml(habitName(h))} down" ${index===state.habits.length-1?"disabled":""}>${icon("arrowDown")}</button><button class="mini-button" data-open-habit="${h.id}" aria-label="Edit ${escapeHtml(habitName(h))}">${icon("edit")}</button></div></div>`).join("")}</div></section>
      <section class="card settings-section full"><header><h2>Data & privacy</h2><p>No cloud service is connected. Export backups regularly for long-term safety.</p></header><div class="data-actions"><button class="button" data-action="export">${icon("download")} Export backup</button><button class="button" data-action="import">${icon("upload")} Import backup</button><button class="button danger" data-action="reset">${icon("alert")} Reset Daymark data</button></div><p class="privacy-copy">Importing replaces the current Daymark v3 dataset after validation. Your legacy <code>daymark-v1</code> data is never deleted by this app.</p></section>
    </div>`;
}

function renderQuickAddFields(){
  const type=$("#quickAddType")?.value||"habit",container=$("#quickAddFields");if(!container)return;
  const daySelector=`<label class="field"><span>Scheduled days</span><div class="day-selector">${["S","M","T","W","T","F","S"].map((label,index)=>`<label><input type="checkbox" name="days" value="${index}" ${index?"checked":""}/><span>${label}</span></label>`).join("")}</div></label>`;
  const commonDate=`<label class="field"><span>Date</span><input name="date" type="date" value="${selectedDate}" required/></label>`;
  const fields={
    habit:`<label class="field"><span>Habit name</span><input name="name" maxlength="80" required placeholder="e.g. Read for 20 minutes"/></label><div class="form-grid"><label class="field"><span>Category</span><select name="category">${Object.entries(CATEGORY_LABELS).filter(([k])=>k!=="private").map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></label><label class="field"><span>Icon</span><select name="icon">${ICON_NAMES.map(name=>`<option value="${name}">${name}</option>`).join("")}</select></label></div>${daySelector}<div class="form-grid"><label class="field"><span>Preferred time</span><input name="time" type="time"/></label><label class="field"><span>Score weight</span><input name="points" type="number" min="0" max="100" value="5" required/></label></div><label class="field"><span>Start date</span><input name="startDate" type="date" value="${dateKey(new Date())}" required/></label><label class="setting-row"><span><strong>Active now</strong><small>Inactive habits remain editable</small></span><span class="switch"><input name="active" type="checkbox" checked/><i></i></span></label>`,
    task:`<label class="field"><span>Task name</span><input name="name" maxlength="100" required placeholder="One-time task"/></label>${commonDate}<label class="field"><span>Category</span><input name="category" maxlength="40" placeholder="Personal"/></label>`,
    weight:`${commonDate}<label class="field"><span>Weight (kg)</span><input name="weight" type="number" min="20" max="400" step="0.1" required placeholder="e.g. 82.4"/></label><label class="field"><span>Optional note</span><textarea name="note" rows="3" maxlength="180"></textarea></label>`,
    learning:`${commonDate}<label class="field"><span>Minutes studied</span><input name="minutes" type="number" min="0" max="720" step="5" required/></label><label class="field"><span>Topic learned</span><input name="topic" maxlength="100" placeholder="Optional topic"/></label>`,
    activity:`${commonDate}<label class="field"><span>Activity</span><select name="activity"><option value="swimming">Swimming</option><option value="walking">Walking</option></select></label><div class="form-grid"><label class="field"><span>Duration (minutes)</span><input name="duration" type="number" min="1" max="600" required/></label><label class="field"><span>Distance (optional)</span><input name="distance" maxlength="30" placeholder="e.g. 3 km"/></label></div><label class="field"><span>Notes</span><textarea name="note" rows="3" maxlength="120"></textarea></label>`,
    note:`${commonDate}<label class="field"><span>Daily note</span><textarea name="note" rows="5" maxlength="500" required placeholder="Capture a thought or reflection"></textarea></label>`
  };
  container.innerHTML=fields[type];
}

function showHabitDialog(habitId){
  const habit=state.habits.find(h=>h.id===habitId);if(!habit)return;
  const cycle=cycleByIndex(selectedCycleIndex),stats=habitStats(state,habit,cycle.start,cycle.end),streak=streakForHabit(state,habit.id);
  const weeks=cycleWeeks(cycle);
  $("#habitDialogContent").innerHTML=`<header class="dialog-header"><div><p class="kicker">HABIT DETAIL</p><h2>${escapeHtml(habitName(habit))}</h2><p class="privacy-copy">${stats.completed} of ${stats.scheduled} completed this cycle · ${scoreText(stats.rate)}</p></div><button type="button" class="close-button" data-close-dialog="habitDialog" aria-label="Close habit details">×</button></header>
    <div class="cycle-stats"><article class="card stat-card"><span>Cycle rate</span><strong>${scoreText(stats.rate)}</strong></article><article class="card stat-card"><span>Current streak</span><strong>${streak.current}</strong><small>days</small></article><article class="card stat-card"><span>Longest streak</span><strong>${streak.longest}</strong><small>days</small></article><article class="card stat-card"><span>Point weight</span><strong>${habit.points}</strong><small>per eligible day</small></article></div>
    <section class="section"><div class="section-heading"><div><h2>Weekly breakdown</h2></div></div><div class="week-grid">${weeks.map(week=>{const s=habitStats(state,habit,week.start,week.end);return`<article class="week-card"><header><div><h3>Week ${week.number}</h3><span>${formatRange(week.start,week.end)}</span></div><div class="week-score">${scoreText(s.rate)}</div></header><footer><span>${s.completed}/${s.scheduled} completed</span></footer></article>`;}).join("")}</div></section>
    <section class="section"><div class="section-heading"><div><h2>Recent history</h2></div></div><div class="heatmap">${datesInRange(cycle.start,cycle.end).map((date,index)=>{const status=habitState(state,habit,date);return`<button class="heat-day ${status==="completed"?"level-high":status==="partial"?"level-mid":status==="missed"?"missed":"future"}" data-select-date="${date}"><strong>${index+1}</strong><span>${stateLabel(status)}</span></button>`;}).join("")}</div></section>
    <form id="editHabitForm" class="section" data-habit-id="${habit.id}"><div class="section-heading"><div><h2>Edit habit</h2><p>Changes preserve all historical entries under the stable ID.</p></div></div><label class="field"><span>Name</span><input name="name" maxlength="80" value="${escapeHtml(habit.name)}" required/></label><label class="field"><span>Description</span><input name="description" maxlength="140" value="${escapeHtml(habit.description||"")}"/></label><div class="form-grid"><label class="field"><span>Category</span><select name="category">${Object.entries(CATEGORY_LABELS).map(([key,label])=>`<option value="${key}" ${habit.category===key?"selected":""}>${label}</option>`).join("")}</select></label><label class="field"><span>Icon</span><select name="icon">${ICON_NAMES.map(name=>`<option value="${name}" ${habit.icon===name?"selected":""}>${name}</option>`).join("")}</select></label></div><label class="field"><span>Schedule</span><div class="day-selector">${["S","M","T","W","T","F","S"].map((label,index)=>`<label><input type="checkbox" name="days" value="${index}" ${habit.schedule.includes(index)?"checked":""}/><span>${label}</span></label>`).join("")}</div></label><div class="form-grid"><label class="field"><span>Preferred time</span><input name="time" type="time" value="${habit.time||""}"/></label><label class="field"><span>Score weight</span><input name="points" type="number" min="0" max="100" value="${habit.points}" required/></label></div><label class="setting-row"><span><strong>Active habit</strong><small>Inactive habits remain in history</small></span><span class="switch"><input name="active" type="checkbox" ${habit.active?"checked":""}/><i></i></span></label><p class="form-error" id="habitFormError"></p><button class="primary-button" type="submit">Save habit changes</button></form>`;
  renderIconSlots($("#habitDialog"));openDialog("habitDialog");
}

function showView(view){
  activeView=view;
  $$(".view").forEach(el=>el.classList.toggle("active",el.id===`${view}View`));
  $$(".nav-item[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
  history.replaceState(null,"",`#${view}`);
  window.scrollTo({top:0,behavior:"smooth"});
  $("#mainContent").focus({preventScroll:true});
}

function toggleHabit(habitId,date){
  const habit=state.habits.find(h=>h.id===habitId);if(!habit||habit.type!=="boolean")return;
  const done=completionFraction(habit,entryFor(state,habitId,date))===1;
  store.setEntry(date,habitId,{status:done?"pending":"completed"});syncState();render();showToast(done?"Marked pending":"Habit completed");
}
function toggleDashboardAction(actionKey,date){
  const action=DASHBOARD_ACTIONS.find(item=>item.key===actionKey),habit=state.habits.find(item=>item.id===action?.habitId);if(!action||!habit)return;
  if(action.subtaskIds){const entry=entryFor(state,habit.id,date),subtasks={...(entry.subtasks||{})},done=action.subtaskIds.every(id=>subtasks[id]);action.subtaskIds.forEach(id=>{subtasks[id]=!done;});store.setEntry(date,habit.id,{subtasks});syncState();render();showToast(done?`${action.label} marked pending`:`${action.label} completed`);return;}
  toggleHabit(habit.id,date);
}
function applyActionStatus(actionKey,date,value){
  const action=DASHBOARD_ACTIONS.find(item=>item.key===actionKey),habit=state.habits.find(item=>item.id===action?.habitId);if(!action||!habit)return;
  const saved=["swimming","walking"].includes(value)?"completed":value;
  store.setActionState(date,actionKey,saved);
  if(action.subtaskIds){const entry=entryFor(state,habit.id,date),subtasks={...(entry.subtasks||{})};action.subtaskIds.forEach(id=>{subtasks[id]=saved==="completed";});store.setEntry(date,habit.id,{subtasks});}
  else if(action.activity)store.setEntry(date,habit.id,{activity:["swimming","walking"].includes(value)?value:null});
  else store.setEntry(date,habit.id,{status:saved==="completed"?"completed":"pending"});
  syncState();render();showToast(saved==="completed"?`${action.label} completed`:saved==="missed"?`${action.label} not completed`:saved==="not-applicable"?`${action.label} marked not applicable`:`${action.label} reset`);
}
function setSubtask(habitId,subtaskId,date,checked){const current=entryFor(state,habitId,date);store.setEntry(date,habitId,{subtasks:{...(current.subtasks||{}),[subtaskId]:checked}});syncState();render();}
function saveEntryField(input){const value=input.type==="number"?(input.value===""?null:Number(input.value)):input.value;store.setEntry(input.dataset.date,input.dataset.habitId,{[input.dataset.entryField]:value});syncState();render();showToast("Saved automatically");}

function submitQuickAdd(event){
  event.preventDefault();const form=event.currentTarget,type=$("#quickAddType").value,data=new FormData(form),error=$("#quickAddError");error.textContent="";
  try{
    if(type==="habit"){
      const days=data.getAll("days").map(Number);if(!String(data.get("name")||"").trim())throw new Error("Enter a habit name.");if(!days.length)throw new Error("Select at least one scheduled day.");
      store.addHabit({name:String(data.get("name")).trim(),category:data.get("category"),icon:data.get("icon"),schedule:days,time:data.get("time"),points:Number(data.get("points")),startDate:data.get("startDate"),type:"boolean",active:data.get("active")==="on"});
    }else if(type==="task")store.addOneTimeTask({name:String(data.get("name")||"").trim(),date:data.get("date"),category:data.get("category")||"Personal"});
    else if(type==="weight"){const value=Number(data.get("weight"));validateWeight(value);store.setWeight(data.get("date"),value,data.get("note"));}
    else if(type==="learning"){const minutes=Number(data.get("minutes"));if(minutes<0||minutes>720)throw new Error("Learning minutes must be between 0 and 720.");store.setEntry(data.get("date"),"learning",{minutes,topic:data.get("topic")});}
    else if(type==="activity"){const duration=Number(data.get("duration"));if(duration<1||duration>600)throw new Error("Duration must be between 1 and 600 minutes.");store.setEntry(data.get("date"),"evening-activity",{activity:data.get("activity"),duration,distance:data.get("distance"),note:data.get("note")});}
    else if(type==="note")store.update(s=>{s.dayNotes[data.get("date")]=String(data.get("note")||"")});
    syncState();closeDialog("quickAddDialog");form.reset();render();showToast("Entry saved");
  }catch(err){error.textContent=err.message;}
}
function validateWeight(value){if(!Number.isFinite(value)||value<20||value>400)throw new Error("Enter a weight between 20 and 400 kg.");}
function openWeightDialog(date){const item=state.weights[date];$("#weightDate").value=date;$("#weightValue").value=item?.value??"";$("#weightNote").value=item?.note??"";$("#weightDialogTitle").textContent=`Weight · ${displayDate(date,{month:"short",day:"numeric"})}`;$("#weightError").textContent="";openDialog("weightDialog");}
function submitWeight(event){event.preventDefault();try{const value=Number($("#weightValue").value);validateWeight(value);store.setWeight($("#weightDate").value,value,$("#weightNote").value);syncState();closeDialog("weightDialog");render();showToast("Weight saved");}catch(err){$("#weightError").textContent=err.message;}}
function exportData(){const blob=new Blob([store.export()],{type:"application/json"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`daymark-backup-${dateKey(new Date())}.json`;link.click();URL.revokeObjectURL(link.href);showToast("Backup exported");}

document.addEventListener("click",event=>{
  const actionComplete=event.target.closest("[data-action-complete]");if(actionComplete){applyActionStatus(actionComplete.dataset.actionComplete,actionComplete.dataset.date,"completed");return;}
  const nav=event.target.closest("[data-view]");if(nav){showView(nav.dataset.view);return;}
  const viewLink=event.target.closest("[data-view-link]");if(viewLink){event.preventDefault();showView(viewLink.dataset.viewLink);return;}
  const action=event.target.closest("[data-action]")?.dataset.action;
  if(action==="quick-add"){openDialog("quickAddDialog");return;}if(action==="open-settings"){showView("settings");return;}if(action==="show-today"){selectedDate=event.target.closest("[data-date]")?.dataset.date||dateKey(new Date());renderToday();showView("today");return;}if(action==="record-weight"){openWeightDialog(event.target.closest("[data-date]")?.dataset.date||selectedDate);return;}if(action==="export"){exportData();return;}if(action==="import"){$("#importInput").click();return;}if(action==="reset"){if(confirm("Reset Daymark v3 data? Your legacy daymark-v1 data will remain untouched.")){store.reset();syncState();selectedCycleIndex=0;render();showToast("Daymark reset");}return;}
  const close=event.target.closest("[data-close-dialog]");if(close){closeDialog(close.dataset.closeDialog);return;}
  const dashboardDate=event.target.closest("[data-dashboard-date]");if(dashboardDate){selectedDate=dashboardDate.dataset.dashboardDate;dashboardWeek=Math.max(0,Math.min(3,cycleForDate(selectedDate,state.settings.cycleAnchor).week-1));renderDashboard();renderIconSlots($("#dashboardView"));setTimeout(()=>$("#dailyActionBoard")?.scrollIntoView({behavior:"smooth",block:"start"}),20);return;}
  const weekTab=event.target.closest("[data-dashboard-week]");if(weekTab){dashboardWeek=Number(weekTab.dataset.dashboardWeek);renderDashboard();renderIconSlots($("#dashboardView"));return;}
  const dashboardToggle=event.target.closest("[data-dashboard-toggle]");if(dashboardToggle){toggleDashboardAction(dashboardToggle.dataset.dashboardToggle,dashboardToggle.dataset.date);return;}
  const toggle=event.target.closest("[data-toggle-habit]");if(toggle){toggleHabit(toggle.dataset.toggleHabit,toggle.dataset.date);return;}
  const taskToggle=event.target.closest("[data-toggle-task]");if(taskToggle){store.update(s=>{const task=s.oneTimeTasks.find(t=>t.id===taskToggle.dataset.toggleTask);if(task)task.completed=!task.completed;});syncState();render();return;}
  const select=event.target.closest("[data-select-date]");if(select){selectedDate=select.dataset.selectDate;render();showView("today");closeDialog("habitDialog");return;}
  const shift=event.target.closest("[data-shift-date]");if(shift){selectedDate=dateKey(addDays(selectedDate,Number(shift.dataset.shiftDate)));renderToday();renderIconSlots($("#todayView"));return;}
  const week=event.target.closest("[data-open-week]");if(week){const base=activeView==="cycle"?cycleByIndex(selectedCycleIndex):currentCycle();selectedDate=dateKey(addDays(base.start,Number(week.dataset.openWeek)*7));render();showView("today");return;}
  const cycleShift=event.target.closest("[data-cycle-shift]");if(cycleShift){selectedCycleIndex+=Number(cycleShift.dataset.cycleShift);renderCycle();renderIconSlots($("#cycleView"));return;}
  const openCycle=event.target.closest("[data-open-cycle]");if(openCycle){selectedCycleIndex=Number(openCycle.dataset.openCycle);renderCycle();renderIconSlots($("#cycleView"));showView("cycle");return;}
  const habit=event.target.closest("[data-open-habit]");if(habit){showHabitDialog(habit.dataset.openHabit);return;}
  const activity=event.target.closest("[data-activity]");if(activity){const value=activity.dataset.activity||null;store.setEntry(activity.dataset.date,activity.dataset.habitId,{activity:value});syncState();render();showToast(value?`${value==="swimming"?"Swimming":"Walking"} selected`:"Evening activity cleared");return;}
  const move=event.target.closest("[data-move-habit]");if(move){store.update(s=>{const index=s.habits.findIndex(h=>h.id===move.dataset.moveHabit),next=index+Number(move.dataset.direction);if(index<0||next<0||next>=s.habits.length)return;[s.habits[index],s.habits[next]]=[s.habits[next],s.habits[index]];});syncState();render();showToast("Habit order updated");return;}
});

document.addEventListener("change",event=>{
  const target=event.target;
  if(target.matches("[data-action-status]")){applyActionStatus(target.dataset.actionStatus,target.dataset.date,target.value);return;}
  if(target.matches("[data-subtask]")){setSubtask(target.dataset.subtask,target.dataset.subtaskId,target.dataset.date,target.checked);return;}
  if(target.matches("[data-entry-field]")){saveEntryField(target);return;}
  if(target.matches("[data-setting]")){store.update(s=>{s.settings[target.dataset.setting]=target.value;});syncState();if(target.dataset.setting==="cycleAnchor")selectedCycleIndex=Math.max(0,currentCycle().index);render();showToast("Setting saved");return;}
  if(target.matches("[data-setting-number]")){const value=target.value===""?null:Number(target.value);if(value!=null&&(value<20||value>400)){showToast("Use a value between 20 and 400 kg");renderSettings();return;}store.update(s=>{s.settings[target.dataset.settingNumber]=value;});syncState();render();showToast("Weight goal saved");return;}
  if(target.matches("[data-setting-checkbox]")){store.update(s=>{s.settings[target.dataset.settingCheckbox]=target.checked;});syncState();render();return;}
  if(target.matches("[data-habit-points]")){const value=Math.max(0,Math.min(100,Number(target.value)||0));store.update(s=>{const h=s.habits.find(item=>item.id===target.dataset.habitPoints);if(h)h.points=value;});syncState();render();showToast("Score weight updated");return;}
});

document.addEventListener("input",event=>{
  const target=event.target;
  if(target.matches("[data-day-note]")){clearTimeout(inputTimer);inputTimer=setTimeout(()=>{store.update(s=>{s.dayNotes[target.dataset.dayNote]=target.value;});syncState();showToast("Note saved");},350);return;}
});

$("#quickAddType").addEventListener("change",renderQuickAddFields);
$("#quickAddForm").addEventListener("submit",submitQuickAdd);
$("#weightForm").addEventListener("submit",submitWeight);
$("#habitDialog").addEventListener("submit",event=>{
  if(event.target.id!=="editHabitForm")return;event.preventDefault();const data=new FormData(event.target),habitId=event.target.dataset.habitId,days=data.getAll("days").map(Number);
  try{if(!String(data.get("name")||"").trim())throw new Error("Habit name is required.");if(!days.length)throw new Error("Select at least one scheduled day.");store.update(s=>{const habit=s.habits.find(h=>h.id===habitId);Object.assign(habit,{name:String(data.get("name")).trim(),description:String(data.get("description")||"").trim(),category:data.get("category"),icon:data.get("icon"),schedule:days,time:data.get("time"),points:Number(data.get("points")),active:data.get("active")==="on"});});syncState();closeDialog("habitDialog");render();showToast("Habit updated");}catch(err){$("#habitFormError").textContent=err.message;}
});
$("#importInput").addEventListener("change",async event=>{const file=event.target.files[0];if(!file)return;try{store.import(await file.text());syncState();render();showToast("Backup imported");}catch(err){showToast(err.message);}finally{event.target.value="";}});
window.addEventListener("hashchange",()=>{const view=location.hash.slice(1);if(["dashboard","today","cycle","history","settings"].includes(view))showView(view);});

render();
const initialView=location.hash.slice(1);if(["dashboard","today","cycle","history","settings"].includes(initialView))showView(initialView);
