import {
  CATEGORY_LABELS, DEFAULT_CYCLE_START, addDays, completionFraction, completionStreaks, consistencyLeaders,
  cycleForDate, cycleWeeks, dateKey, datesInRange, daysBetween, entryFor, formatRange, habitState, habitStats, isFuture, isPast,
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

const DASHBOARD_ACTIONS = [
  {key:"wake",label:"Wake up between 6:30–7:00 AM",habitId:"wake-630",icon:"sunrise",group:"morning",timeLabel:"6:30–7:00 AM"},
  {key:"coffee",label:"Black coffee",habitId:"black-coffee",icon:"coffee",group:"morning"},
  {key:"temple",label:"Temple",habitId:"temple-ritual",subtaskIds:["visited"],icon:"temple",group:"spiritual"},
  {key:"gajara",label:"Gajra Offering",habitId:"temple-ritual",subtaskIds:["parvati-gajra"],icon:"spark",group:"spiritual"},
  {key:"physio",label:"Back Physiotherapy",habitId:"back-physio",icon:"physio",group:"wellness"},
  {key:"workout",label:"Workout",habitId:"workout",icon:"dumbbell",group:"fitness"},
  {key:"kegel-1",label:"Kegel 1",habitId:"kegel",subtaskIds:["morning"],icon:"activity",group:"wellness"},
  {key:"devpuja",label:"Dev Puja",habitId:"dev-puja",icon:"spark",group:"spiritual"},
  {key:"salesforce",label:"Salesforce Training",habitId:"learning",icon:"book",group:"learning"},
  {key:"kegel-2",label:"Kegel",habitId:"kegel",subtaskIds:["evening"],icon:"activity",group:"wellness"},
  {key:"water",label:"Water Intake",habitId:"water-intake-1",icon:"drop",group:"wellness"},
  {key:"amla",label:"Aavla Juice",habitId:"avla-drink",icon:"leaf",group:"nutrition"},
  {key:"diya",label:"Diva",habitId:"diya",icon:"spark",group:"spiritual"},
  {key:"beetroot",label:"Beetroot Juice",habitId:"beetroot-juice",icon:"drop",group:"nutrition"},
  {key:"hair-care",label:"Hair - Skin care",habitId:"hair-care",icon:"hair",group:"wellness"},
  {key:"water-bath",label:"Water Storage - Bath",habitId:"water-storage-bath",icon:"drop",group:"wellness"}
];

// Keep the Today action wording aligned with the personal routine list.
DASHBOARD_ACTIONS[0].label = "Wake up at 6:30 to 7:30";


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
  document.querySelector('meta[name="theme-color"]').content="#090a09";
}

function renderSidebar(){
  const cycle=currentCycle(),week=cycleWeeks(cycle)[cycle.week-1],weekScore=scorePeriod(state,week.start,week.end);
  $("#sidebarCycle").innerHTML=`<p>CURRENT WEEK</p><strong>Week ${cycle.week}</strong><span>${formatRange(week.start,week.end)}</span><div class="progress-track"><div class="progress-fill" style="--value:${weekScore.score||0}"></div></div>`;
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
  const sunday=parseDate(date).getDay()===0;
  // Sunday exceptions from the routine sheet: only these four actions are N/A.
  if(sunday&&['wake','physio','workout','salesforce'].includes(action.key))return"not-scheduled";
  const saved=state.actionStates?.[date]?.[action.key];
  if(saved==="completed")return"completed";
  if(saved==="missed")return"missed";
  if(saved==="not-applicable")return"not-scheduled";
  const habit=state.habits.find(item=>item.id===action.habitId);
  if(!habit||(!sunday&&!isScheduled(habit,date)))return"not-scheduled";
  if(!action.subtaskIds)return habitState(state,habit,date);
  const subtasks=entryFor(state,habit.id,date).subtasks||{};
  const completed=action.subtaskIds.filter(id=>subtasks[id]).length;
  if(completed===action.subtaskIds.length)return"completed";
  if(completed>0)return"partial";
  return isPast(date)?"missed":"pending";
}

function dashboardStateIcon(status){
  if(["upcoming","pending"].includes(status))return"";
  return `<span class="status-glyph">${icon(status==="completed"?"check":status==="partial"?"clock":"x")}</span>`;
}
function dashboardStateLabel(status){return status==="upcoming"?"Upcoming":status==="completed"?"Completed":"Not completed";}

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
  const week=cycleWeeks(cycle)[dashboardWeek],dates=datesInRange(week.start,week.end);
  const rows=DASHBOARD_ACTIONS.map(action=>`<div class="matrix-action"><span class="action-symbol">${icon(action.icon)}</span><strong>${escapeHtml(action.label)}</strong></div>${dates.map(date=>{const status=dashboardActionStatus(action,date);return`<div class="matrix-state ${status}" role="img" aria-label="${escapeHtml(action.label)} on ${displayDate(date)}: ${dashboardStateLabel(status)}" title="${dashboardStateLabel(status)}">${dashboardStateIcon(status)}</div>`;}).join("")}`).join("");
  return `<div class="action-matrix-scroll"><div class="action-matrix"><div class="matrix-corner">ACTION</div>${dates.map(date=>`<div class="matrix-day ${date===dateKey(new Date())?"today":""}"><strong>${displayDate(date,{weekday:"short"})}</strong><span>${displayDate(date,{day:"numeric"})}</span></div>`).join("")}${rows}</div></div>`;
}

function dashboardActionScore(start,end=start){
  let earned=0,eligible=0;
  datesInRange(start,end).filter(date=>!isFuture(date)).forEach(date=>{
    DASHBOARD_ACTIONS.forEach(action=>{
      const status=dashboardActionStatus(action,date);
      if(["not-scheduled","upcoming"].includes(status))return;
      eligible++;
      if(status==="completed")earned++;
      else if(status==="partial")earned+=.5;
    });
  });
  return {score:eligible?Math.round(earned/eligible*100):null,earned,eligible};
}

function dashboardScoreCardsMarkup(cycle,week){
  const today=dateKey(new Date());
  const cards=[
    {label:"Today score",meta:displayDate(today,{weekday:"short",day:"numeric"}),icon:"target",stats:dashboardActionScore(today)},
    {label:"Week score",meta:`Week ${week.number}`,icon:"trend",stats:dashboardActionScore(week.start,week.end)},
    {label:"Month score",meta:"28-day cycle",icon:"cycle",stats:dashboardActionScore(cycle.start,cycle.end)}
  ];
  return `<section class="dashboard-score-panel" aria-label="Current improvement scores">${cards.map(card=>`<article class="dashboard-score-item"><span class="dashboard-score-icon">${icon(card.icon)}</span><div><span>${escapeHtml(card.label)}</span><strong>${scoreText(card.stats.score)}</strong><small>${escapeHtml(card.meta)}</small></div></article>`).join("")}</section>`;
}

function dashboardWeekCalendarMarkup(cycle){
  const currentWeek=Math.max(0,Math.min(3,cycle.week-1));
  return `<nav class="dashboard-week-calendar" aria-label="Choose a week">${cycleWeeks(cycle).map((week,index)=>`<button class="${index===dashboardWeek?"active":""} ${index===currentWeek?"current":""}" data-dashboard-week="${index}" aria-current="${index===dashboardWeek?"true":"false"}"><span>Week ${week.number}</span><small>${formatRange(week.start,week.end)}</small><i aria-hidden="true"></i></button>`).join("")}</nav>`;
}

function sectionQuoteMarkup(section,quote,copy,iconName){
  const sectionClass=section.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  return `<header class="section-quote quote-${sectionClass}"><div><p class="kicker">${escapeHtml(section.toUpperCase())}</p><h1>${escapeHtml(quote)}</h1><p>${escapeHtml(copy)}</p></div><div class="section-quote-art" aria-hidden="true">${icon(iconName)}</div></header>`;
}

function retentionMetrics(today=new Date()){
  const habit=state.habits.find(item=>item.id==="semen-retention");
  if(!habit)return{current:0,longest:0,cycleCompleted:0,habit:null};
  const todayKey=dateKey(today),keys=datesInRange(state.settings.cycleAnchor,todayKey).filter(key=>isScheduled(habit,key));
  let longest=0,run=0;
  keys.forEach(key=>{if(completionFraction(habit,entryFor(state,habit.id,key))===1){run++;longest=Math.max(longest,run);}else run=0;});
  let end=keys.length-1;
  if(keys[end]===todayKey&&completionFraction(habit,entryFor(state,habit.id,todayKey))<1)end--;
  let current=0;
  for(let index=end;index>=0;index--){if(completionFraction(habit,entryFor(state,habit.id,keys[index]))===1)current++;else break;}
  const cycle=currentCycle();
  const cycleCompleted=datesInRange(cycle.start,cycle.end).filter(key=>!isFuture(key)&&completionFraction(habit,entryFor(state,habit.id,key))===1).length;
  return{current,longest,cycleCompleted,habit};
}

function todayCalendarMarkup(cycle){
  const actual=currentCycle(),today=dateKey(new Date()),dates=datesInRange(cycle.start,cycle.end);
  return `<aside class="today-calendar card"><div class="today-calendar-heading"><span>${icon("today")}</span><div><p class="kicker">CALENDAR</p><strong>${formatRange(cycle.start,cycle.end)}</strong></div></div><div class="today-calendar-labels">${["S","M","T","W","T","F","S"].map(day=>`<span>${day}</span>`).join("")}</div><div class="today-calendar-weeks">${Array.from({length:4},(_,weekIndex)=>`<div class="today-calendar-week ${cycle.index===actual.index&&weekIndex===actual.week-1?"current":""}">${dates.slice(weekIndex*7,weekIndex*7+7).map((key,index)=>`<button data-today-date="${key}" class="${key===today?"today":""} ${key===selectedDate?"selected":""}" aria-label="Open ${displayDate(key)}"><span>${parseDate(key).getDate()}</span><i></i></button>`).join("")}</div>`).join("")}</div><p class="today-calendar-note"><i></i> Current week</p></aside>`;
}

function dashboardFocusMarkup(cycle){
  const retention=retentionMetrics(),weights=weightStats(state,cycle),target=state.settings.targetWeight??67;
  return `<section class="dashboard-focus-grid"><button class="dashboard-focus-card retention-focus" data-view="cycle"><span class="focus-art">${icon("shield")}</span><div><p class="kicker">SEMEN RETENTION</p><h3>${retention.current} day${retention.current===1?"":"s"}</h3><p>Current streak · Longest ${retention.longest} days</p></div><span class="focus-arrow">${icon("chevron")}</span></button><button class="dashboard-focus-card weight-focus" data-view="history"><span class="focus-art">${icon("scale")}</span><div><p class="kicker">WEIGHT MANAGEMENT</p><h3>${weights.latest==null?"Not recorded":`${formatNumber(weights.latest)} kg`}</h3><p>Target ${formatNumber(target)} kg${weights.remaining==null?"":` · ${formatNumber(weights.remaining)} kg remaining`}</p></div><span class="focus-arrow">${icon("chevron")}</span></button></section>`;
}

function dashboardActionStreak(action){
  const today=dateKey(new Date()),keys=datesInRange(state.settings.cycleAnchor,today).reverse();
  let streak=0;
  for(const key of keys){
    const status=dashboardActionStatus(action,key);
    if(status==="upcoming")continue;
    if(key===today&&["pending","partial"].includes(status))continue;
    if(status==="completed"||status==="not-scheduled")streak++;
    else break;
  }
  return streak;
}

function habitLanesMarkup(cycle){
  const week=cycleWeeks(cycle)[dashboardWeek],dates=datesInRange(week.start,week.end),today=dateKey(new Date());
  const header=`<div class="habit-lane-header"><div><span>Action</span><small>Current streak</small><em class="habit-lane-thought">Small steps, repeated daily, shape a stronger life.</em></div><div class="habit-lane-days">${dates.map(date=>`<div class="habit-lane-date ${date===today?"today":""}"><strong>${displayDate(date,{weekday:"short"})}</strong><span>${parseDate(date).getDate()}</span></div>`).join("")}</div></div>`;
  const rows=DASHBOARD_ACTIONS.map(action=>{const streak=dashboardActionStreak(action);return`<article class="habit-lane"><div class="habit-lane-name"><span class="action-symbol">${icon(action.icon)}</span><div><strong>${escapeHtml(action.label)}</strong><small>${streak?`${icon("trend")} ${streak} day${streak===1?"":"s"}`:"Start a streak"}</small></div></div><div class="habit-lane-days">${dates.map(date=>{const status=dashboardActionStatus(action,date);return`<button class="habit-lane-day ${status} ${date===today?"today":""}" data-today-date="${date}" aria-label="${escapeHtml(action.label)} on ${displayDate(date)}: ${dashboardStateLabel(status)}"><span>${dashboardStateIcon(status)}</span><small>${dashboardStateLabel(status)}</small></button>`;}).join("")}</div></article>`;}).join("");
  return `<div class="habit-lanes">${header}${rows}</div>`;
}

function dashboardPulseMarkup(cycle){
  const week=cycleWeeks(cycle)[dashboardWeek],dates=datesInRange(week.start,week.end),today=dateKey(new Date());
  const totals=dates.reduce((sum,date)=>{if(isFuture(date))return sum;DASHBOARD_ACTIONS.forEach(action=>{const status=dashboardActionStatus(action,date);if(["not-scheduled","upcoming"].includes(status))return;sum.eligible++;if(status==="completed")sum.completed++;});return sum;},{completed:0,eligible:0});
  const totalPercent=totals.eligible?Math.round(totals.completed/totals.eligible*100):0;
  const circles=dates.map(date=>{const statuses=DASHBOARD_ACTIONS.map(action=>dashboardActionStatus(action,date)),eligible=statuses.filter(status=>!["not-scheduled","upcoming"].includes(status)).length,completed=statuses.filter(status=>status==="completed").length,value=eligible?Math.round(completed/eligible*100):0,band=value>=75?"high":value>=50?"mid":"low";return`<div class="pulse-day ${date===today?"today":""} ${isFuture(date)?"future":""}"><div class="pulse-ring ring-${band}" style="--value:${value}"><span>${isFuture(date)?"—":`${value}%`}</span></div><strong>${displayDate(date,{weekday:"narrow"})}</strong><small>${parseDate(date).getDate()}</small></div>`;}).join("");
  return `<section class="dashboard-pulse-grid"><article class="weekly-pulse card"><div class="pulse-copy"><p class="kicker">WEEKLY MOMENTUM</p><div class="pulse-overall"><div class="pulse-ring large" style="--value:${totalPercent}"><span>${totalPercent}%</span></div><div><h3>${totalPercent}%</h3><p>eligible actions completed</p></div></div></div><div class="pulse-circles">${circles}</div></article></section>`;
}
/*
  const bars=dates.map(date=>{const statuses=DASHBOARD_ACTIONS.map(action=>dashboardActionStatus(action,date)),eligible=statuses.filter(status=>!["not-scheduled","upcoming"].includes(status)).length,completed=statuses.filter(status=>status==="completed").length,value=eligible?Math.round(completed/eligible*100):0;return`<div class="pulse-day ${date===today?"today":""} ${isFuture(date)?"future":""}"><div><i style="--value:${value}"></i></div><strong>${displayDate(date,{weekday:"narrow"})}</strong><span>${isFuture(date)?"—":`${value}%`}</span></div>`;}).join("");
  const pending=DASHBOARD_ACTIONS.find(action=>["pending","partial"].includes(dashboardActionStatus(action,today)));
  const next=pending?`<span class="next-action-icon">${icon(pending.icon)}</span><div><p class="kicker">NEXT BEST ACTION</p><h3>${escapeHtml(pending.label)}</h3><p>Complete this next to build today’s momentum.</p></div>`:`<span class="next-action-icon complete">${icon("check")}</span><div><p class="kicker">MOMENTUM COMPLETE</p><h3>${isFuture(week.start)?"This week is upcoming":"All clear for now"}</h3><p>${isFuture(week.start)?"Return when this week begins.":"No pending action needs attention."}</p></div>`;
  return `<section class="dashboard-pulse-grid"><article class="weekly-pulse card"><div class="pulse-copy"><p class="kicker">WEEKLY MOMENTUM</p><h3>${totalPercent}%</h3><p>eligible actions completed</p></div><div class="pulse-bars">${bars}</div></article><article class="next-action-card card">${next}</article></section>`;
}

*/
function dailyActionCardsMarkup(date){
  return DASHBOARD_ACTIONS.map(action=>{
    const habit=state.habits.find(item=>item.id===action.habitId),status=dashboardActionStatus(action,date),future=isFuture(date),today=date===dateKey(new Date()),entry=entryFor(state,action.habitId,date),saved=state.actionStates?.[date]?.[action.key];
    const selected=action.activity&&status==="completed"?(entry.activity||""):(saved||(status==="completed"?"completed":status==="missed"?"missed":status==="not-scheduled"?"not-applicable":""));
    const options=action.activity?[["","Choose status"],["swimming","Completed · Swimming"],["walking","Completed · Walking"],["missed","Not completed"],["not-applicable","Not applicable"]]:[["","Choose status"],["completed","Completed"],["missed","Not completed"],["not-applicable","Not applicable"]];
    const filteredOptions=options.filter(([value])=>["completed","missed","swimming","walking"].includes(value));
    const control=future?`<span class="action-upcoming-label">Upcoming</span>`:today?`<button class="current-complete-button ${status==="completed"?"done":""}" data-action-complete="${action.key}" data-date="${date}" aria-label="${status==="completed"?"Completed":"Mark complete"}">${icon("statusComplete")}<span>${status==="completed"?"Completed":"Complete"}</span></button>`:`<select class="action-status-select ${status}" data-action-status="${action.key}" data-date="${date}" aria-label="Status for ${escapeHtml(action.label)}">${filteredOptions.map(([value,label])=>`<option value="${value}" ${selected===value?"selected":""}>${label}</option>`).join("")}</select>`;
    return `<article class="daily-action-card ${status} group-${action.group}"><div class="daily-action-icon">${icon(action.icon)}</div><div><h3>${escapeHtml(action.label)}</h3><p>${dashboardStateLabel(status)}</p></div>${control}</article>`;
  }).join("");
}

function renderDashboard(){
  const cycle=currentCycle(),week=cycleWeeks(cycle)[dashboardWeek];
  $("#dashboardContent").innerHTML=`
    <div class="dashboard-top-row"><header class="visual-header"><p class="kicker">WEEK ${week.number} · ${formatRange(week.start,week.end)}</p><span class="quote-mark">“</span><h1>Rise with purpose.<br>Finish with pride.</h1><p>Every completed action is a promise kept to yourself.</p>${dashboardWeekCalendarMarkup(cycle)}</header>${dashboardFocusMarkup(cycle)}</div>
    <section class="card command-board"><div class="board-heading"><div><p class="kicker">WEEK ${week.number} · HABIT LANES</p><h2>Consistency, action by action</h2><p><span class="legend-dot completed"></span> Completed <span class="legend-dot missed"></span> Missed <span class="legend-dot na"></span> Not applicable</p></div></div>${habitLanesMarkup(cycle)}</section>`;
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

function todayMissionPanel(date){
  const stats=scoreDay(state,date),score=stats.score??0,total=stats.completed+stats.missed+stats.partial+stats.pending;
  const validActions=DASHBOARD_ACTIONS.filter(action=>["completed","not-scheduled"].includes(dashboardActionStatus(action,date))).length;
  const taskPercent=Math.round(validActions/DASHBOARD_ACTIONS.length*100);
  const streaks=DASHBOARD_ACTIONS.slice(0,9).map(action=>todayActionStreakMarkup(action)).join("");
  return `<aside class="today-mission-panel"><p class="kicker">MISSION CONTROL</p><h2>Own this day</h2><div class="today-momentum-ring" style="--value:${taskPercent}"><div><strong>${validActions} / ${DASHBOARD_ACTIONS.length}</strong><span>actions</span></div></div><p class="today-ring-caption">ACTION COMPLETED</p><div class="today-mission-streaks">${streaks}</div></aside>`;
}
function todayActionStreakMarkup(action){const streak=dashboardActionStreak(action);return `<div class="today-action-streak"><span>${icon(action.icon)}</span><strong>${escapeHtml(action.label)}</strong><em>${streak} day${streak===1?"":"s"}</em></div>`;}
function todayUpcomingPanel(date){
  return `<aside class="today-upcoming-panel"><p class="kicker">ACTION STREAKS</p><p class="today-streak-intro">Valid continuity is preserved across every day.</p>${DASHBOARD_ACTIONS.slice(9).map(action=>todayActionStreakMarkup(action)).join("")}</aside>`;
}
function renderToday(){
  const missionCycle=cycleForDate(selectedDate,state.settings.cycleAnchor);
  $("#todayContent").innerHTML=`<div class="today-mission-layout">${todayMissionPanel(selectedDate)}<main class="today-timeline-panel"><div class="date-switcher"><button data-shift-date="-1" aria-label="Previous day">${icon("arrowLeft")}</button><div><strong>${displayDate(selectedDate,{weekday:"long",month:"short",day:"numeric"})}</strong><span>Week ${missionCycle.week} Â· Day ${missionCycle.day} of 28</span></div><button data-shift-date="1" aria-label="Next day">${icon("arrowRight")}</button></div><section class="today-actions"><div class="section-heading"><div><p class="kicker">DAILY TIMELINE</p><h2>Actions for this day</h2><p>Complete or mark missed. Rest-day N/A never breaks a streak.</p></div></div><div class="daily-action-grid today-action-grid">${dailyActionCardsMarkup(selectedDate)}</div></section></main>${todayUpcomingPanel(selectedDate)}</div>`;
  // Today controls remain editable so a completion can be corrected later.
  $("#todayContent").querySelectorAll(".current-complete-button").forEach(button=>button.disabled=false);
  return;
  const cycle=cycleForDate(selectedDate,state.settings.cycleAnchor);
  $("#todayContent").innerHTML=`
    ${sectionQuoteMarkup("Today","Own this day. Build the life you want.","One focused action at a time—quiet progress becomes lasting change.","sunrise")}
    <div class="today-page-grid"><div class="today-main-column"><div class="date-switcher"><button data-shift-date="-1" aria-label="Previous day">${icon("arrowLeft")}</button><div><strong>${displayDate(selectedDate,{weekday:"long",month:"short",day:"numeric"})}</strong><span>Week ${cycle.week} · Day ${cycle.day} of 28</span></div><button data-shift-date="1" aria-label="Next day">${icon("arrowRight")}</button></div>
    <section class="today-actions"><div class="section-heading"><div><h2>Actions for this day</h2><p>Green is complete, red is missed, and yellow means not applicable.</p></div></div><div class="daily-action-grid today-action-grid">${dailyActionCardsMarkup(selectedDate)}</div></section></div></div>`;
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

function retentionCalendarMarkup(cycle,habit){
  const today=dateKey(new Date());
  const weeks=cycleWeeks(cycle);
  return `<div class="retention-timeline"><div class="retention-weekdays">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=>`<span>${day}</span>`).join("")}</div>${weeks.map((week,weekIndex)=>`<div class="retention-week-row"><div class="retention-week-label"><strong>WEEK ${weekIndex+1}</strong><span>${formatRange(week.start,week.end)}</span></div><div class="retention-week-days">${datesInRange(week.start,week.end).map((key,index)=>{const dayIndex=weekIndex*7+index,maintained=completionFraction(habit,entryFor(state,habit.id,key))===1,stateClass=isFuture(key)?"future":maintained?"maintained":isPast(key)?"broken":"pending";return`<button class="retention-day ${stateClass} ${key===today?"today":""}" data-retention-date="${key}" ${isFuture(key)?"disabled":""} aria-label="${displayDate(key)}: ${maintained?"maintained":isPast(key)?"broken":"pending"}"><span>DAY ${dayIndex+1}</span><strong>${parseDate(key).getDate()}</strong><small>${displayDate(key,{month:"short",day:"numeric"})}</small><i>${maintained?icon("check"):isPast(key)?icon("x"):""}</i></button>`;}).join("")}</div></div>`).join("")}</div>`;
}

function renderCycle(){
  const cycle=cycleByIndex(selectedCycleIndex),metrics=retentionMetrics(),habit=metrics.habit;
  const actions=`<div class="cycle-nav"><button data-cycle-shift="-1" ${selectedCycleIndex<=0?"disabled":""} aria-label="Previous month">${icon("arrowLeft")}</button><button data-cycle-shift="1" ${selectedCycleIndex>=currentCycle().index?"disabled":""} aria-label="Next month">${icon("arrowRight")}</button></div>`;
  const weeklyProgress=cycleWeeks(cycle).map((week,index)=>{
    const days=datesInRange(week.start,week.end);
    const maintained=habit?days.filter(key=>completionFraction(habit,entryFor(state,habit.id,key))===1).length:0;
    const percent=Math.round(maintained/7*100);
    return `<article class="retention-week-stat"><div><span>WEEK ${index+1}</span><small>${formatRange(week.start,week.end)}</small></div><strong>${maintained} / 7</strong><em>${percent}%</em><div class="retention-week-track"><i style="width:${percent}%"></i></div></article>`;
  }).join("");
  const milestones=[3,7,15,30,45,60,75,90],nextMilestone=milestones.find(value=>value>metrics.longest)||90;
  $("#cycleContent").innerHTML=`<div class="retention-screen"><header class="retention-topbar"><a class="retention-brand" href="#today" data-view-link="today"><span class="brand-mark"><i></i><i></i><i></i></span><strong>daymark</strong></a><nav>${[["dashboard","Dashboard"],["today","Today"],["cycle","Semen retention"],["history","Weight management"],["settings","Settings"]].map(([view,label])=>`<button class="${view==="cycle"?"active":""}" data-view="${view}">${label}</button>`).join("")}</nav><span class="retention-private">Private by design.</span></header><div class="retention-subnav"><button class="active">Overview</button><button>Insights</button><button>History</button></div>${sectionQuoteMarkup("Semen Retention","Discipline today. Freedom tomorrow.","Every private commitment strengthens the standard you are building.","shield")}<section class="retention-challenge-card"><div><p class="kicker">STREAK CHALLENGES</p><h2>${nextMilestone}-day challenge next</h2><p>${metrics.longest>0?`${metrics.longest} days is your longest streak. Keep building toward ${nextMilestone}.`:"Start with your first 3-day streak."}</p></div><div class="retention-milestones">${milestones.map(value=>`<span class="${metrics.longest>=value?"achieved":""} ${value===nextMilestone?"next":""}">${value}<small>d</small></span>`).join("")}</div></section>
    <div class="retention-dashboard-grid"><section class="card retention-calendar-card"><div class="section-heading"><div><p class="kicker">PRIVATE CALENDAR</p><h2>${formatRange(cycle.start,cycle.end)}</h2><p>Each connected day is one private commitment.</p></div>${actions}</div>${habit?retentionCalendarMarkup(cycle,habit):`<div class="empty-state"><h2>Private goal unavailable</h2></div>`}<div class="retention-legend"><span><i class="maintained"></i> Maintained</span><span><i class="broken"></i> Streak broken</span><span><i class="pending"></i> Today pending</span></div></section><aside class="retention-side-summary"><section class="retention-streak-card"><p class="kicker">STREAK SUMMARY</p><div class="retention-streak-body"><div class="retention-streak-ring" style="--streak:${Math.min(metrics.current/28*100,100)}"><strong>${metrics.current}</strong><span>days</span></div><div><p>Current streak</p><strong>${metrics.current} days</strong><p>Longest streak</p><strong>${metrics.longest} days</strong></div></div></section><section class="retention-weekly-card"><p class="kicker">WEEKLY PROGRESS</p>${weeklyProgress}</section><section class="retention-update-card"><p class="kicker">TODAY'S UPDATE</p><strong>Day ${cycle.day} of 28</strong><span>${habit&&completionFraction(habit,entryFor(state,habit.id,dateKey(new Date())))===1?"Completed":"Pending"}</span></section></aside></div>`;
}

function renderLegacyCycle(){
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

function weightReadingsMarkup(cycle){
  const today=dateKey(new Date());
  return `<div class="weight-reading-grid">${datesInRange(cycle.start,cycle.end).map((key,index)=>{const item=state.weights[key],future=isFuture(key);return`<button class="weight-reading ${item?"recorded":""} ${key===today?"today":""}" data-action="record-weight" data-date="${key}" ${future?"disabled":""}><span>Day ${index+1}</span><strong>${item?`${formatNumber(item.value)} kg`:future?"Upcoming":"Add"}</strong><small>${displayDate(key,{month:"short",day:"numeric"})}</small></button>`;}).join("")}</div>`;
}

function weightObservation(stats){
  if(stats.values.length<2)return"Add at least two readings to reveal a neutral trend.";
  if(Math.abs(stats.change)<.2)return"Weight has remained broadly stable during this period.";
  return `Weight has ${stats.change<0?"decreased":"increased"} by ${formatNumber(Math.abs(stats.change))} kg during this period.`;
}

function renderHistory(){
  const cycle=cycleByIndex(selectedCycleIndex),stats=weightStats(state,cycle),target=state.settings.targetWeight??67;
  const actions=`<div class="cycle-nav"><button data-cycle-shift="-1" ${selectedCycleIndex<=0?"disabled":""} aria-label="Previous month">${icon("arrowLeft")}</button><button data-cycle-shift="1" ${selectedCycleIndex>=currentCycle().index?"disabled":""} aria-label="Next month">${icon("arrowRight")}</button></div>`;
  $("#historyContent").innerHTML=`${sectionQuoteMarkup("Weight Management","Measure calmly. Adjust consistently.","The trend matters more than a single reading—record honestly and keep moving.","scale")}
    <section class="weight-summary-grid"><article class="weight-goal-hero"><span class="weight-goal-art">${icon("scale")}</span><div><p class="kicker">LATEST WEIGHT</p><strong>${stats.latest==null?"—":formatNumber(stats.latest)}</strong><span>kg</span><p>${weightObservation(stats)}</p></div></article><article class="weight-goal-stat"><span>Target</span><strong>${formatNumber(target)} kg</strong><small>Your current goal</small></article><article class="weight-goal-stat"><span>Remaining</span><strong>${stats.latest==null?"—":formatNumber(Math.abs(stats.latest-target))} kg</strong><small>Distance to target</small></article><article class="weight-goal-stat"><span>Cycle change</span><strong>${stats.change==null?"—":`${stats.change>0?"+":""}${formatNumber(stats.change)} kg`}</strong><small>First to latest</small></article></section>
    <section class="card weight-management-chart"><div class="section-heading"><div><p class="kicker">WEIGHT TREND</p><h2>${formatRange(cycle.start,cycle.end)}</h2><p>Daily readings are measurements and never affect habit scoring.</p></div><div class="weight-chart-actions">${actions}<button class="button" data-action="record-weight" data-date="${dateKey(new Date())}">${icon("plus")} Today</button></div></div>${weightChartMarkup(cycle)}</section>
    <section class="card weight-daily-section"><div class="section-heading"><div><p class="kicker">DAILY READINGS</p><h2>Every day at a glance</h2><p>Select a day to add or edit its reading.</p></div></div>${weightReadingsMarkup(cycle)}</section>`;
}

function renderLegacyHistory(){
  const current=currentCycle(),cycles=Array.from({length:Math.max(1,current.index+1)},(_,i)=>cycleByIndex(i)).reverse();
  const lifetime=scorePeriod(state,state.settings.cycleAnchor,dateKey(new Date()));
  const streaks=completionStreaks(state);
  $("#historyContent").innerHTML=`${headerMarkup("LONG-TERM HISTORY","Your improvement archive","Every cycle remains available on this device.",`<button class="button" data-action="export">${icon("download")} Export backup</button>`,`<span class="chip accent">${scoreText(lifetime.score)} lifetime</span><span class="chip">${streaks.current} day streak</span><span class="chip">Best ${streaks.longest}</span>`)}<div class="history-list">${cycles.map(cycle=>historyCardMarkup(cycle,current.index===cycle.index)).join("")}</div>`;
}
function historyCardMarkup(cycle,current){const stats=scorePeriod(state,cycle.start,cycle.end),weights=weightStats(state,cycle),leaders=consistencyLeaders(state,cycle.start,cycle.end);return`<button class="history-card" data-open-cycle="${cycle.index}"><div><p class="kicker">CYCLE ${cycle.number}${current?" · CURRENT":""}</p><h2>${formatRange(cycle.start,cycle.end)}</h2><p>${stats.completed} completed · ${stats.missed} missed · ${weights.change==null?"No weight change":`${weights.change>0?"+":""}${formatNumber(weights.change)} kg`} ${leaders.best?`· Best: ${escapeHtml(habitName(leaders.best.habit))}`:""}</p></div><strong class="history-score">${scoreText(stats.score)}</strong></button>`;}

function renderSettings(){
  const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  $("#settingsContent").innerHTML=`${sectionQuoteMarkup("Settings","Design your system. Protect your consistency.","Simple settings create a routine that fits your real life.","settings")}${headerMarkup("PREFERENCES","Make Daymark yours","Every setting is stored locally and applies to future calculations.",`<button class="button primary" data-action="quick-add">${icon("plus")} Add habit</button>`)}
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
  document.body.classList.toggle("retention-active",view==="cycle");
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
  const actionComplete=event.target.closest("[data-action-complete]");if(actionComplete){const action=DASHBOARD_ACTIONS.find(item=>item.key===actionComplete.dataset.actionComplete),current=action?dashboardActionStatus(action,actionComplete.dataset.date):"pending";applyActionStatus(actionComplete.dataset.actionComplete,actionComplete.dataset.date,current==="completed"?"missed":"completed");return;}
  const nav=event.target.closest("[data-view]");if(nav){showView(nav.dataset.view);return;}
  const viewLink=event.target.closest("[data-view-link]");if(viewLink){event.preventDefault();showView(viewLink.dataset.viewLink);return;}
  const action=event.target.closest("[data-action]")?.dataset.action;
  if(action==="quick-add"){openDialog("quickAddDialog");return;}if(action==="open-settings"){showView("settings");return;}if(action==="show-today"){selectedDate=event.target.closest("[data-date]")?.dataset.date||dateKey(new Date());renderToday();showView("today");return;}if(action==="record-weight"){openWeightDialog(event.target.closest("[data-date]")?.dataset.date||selectedDate);return;}if(action==="export"){exportData();return;}if(action==="import"){$("#importInput").click();return;}if(action==="reset"){if(confirm("Reset Daymark v3 data? Your legacy daymark-v1 data will remain untouched.")){store.reset();syncState();selectedCycleIndex=0;render();showToast("Daymark reset");}return;}
  const close=event.target.closest("[data-close-dialog]");if(close){closeDialog(close.dataset.closeDialog);return;}
  const dashboardDate=event.target.closest("[data-dashboard-date]");if(dashboardDate){selectedDate=dashboardDate.dataset.dashboardDate;dashboardWeek=Math.max(0,Math.min(3,cycleForDate(selectedDate,state.settings.cycleAnchor).week-1));renderDashboard();renderIconSlots($("#dashboardView"));setTimeout(()=>$("#dailyActionBoard")?.scrollIntoView({behavior:"smooth",block:"start"}),20);return;}
  const todayDate=event.target.closest("[data-today-date]");if(todayDate){selectedDate=todayDate.dataset.todayDate;renderToday();renderIconSlots($("#todayView"));return;}
  const weekTab=event.target.closest("[data-dashboard-week]");if(weekTab){dashboardWeek=Number(weekTab.dataset.dashboardWeek);renderDashboard();renderIconSlots($("#dashboardView"));return;}
  const dashboardToggle=event.target.closest("[data-dashboard-toggle]");if(dashboardToggle){toggleDashboardAction(dashboardToggle.dataset.dashboardToggle,dashboardToggle.dataset.date);return;}
  const toggle=event.target.closest("[data-toggle-habit]");if(toggle){toggleHabit(toggle.dataset.toggleHabit,toggle.dataset.date);return;}
  const taskToggle=event.target.closest("[data-toggle-task]");if(taskToggle){store.update(s=>{const task=s.oneTimeTasks.find(t=>t.id===taskToggle.dataset.toggleTask);if(task)task.completed=!task.completed;});syncState();render();return;}
  const select=event.target.closest("[data-select-date]");if(select){selectedDate=select.dataset.selectDate;render();showView("today");closeDialog("habitDialog");return;}
  const shift=event.target.closest("[data-shift-date]");if(shift){const anchor=state.settings.cycleAnchor,next=dateKey(addDays(selectedDate,Number(shift.dataset.shiftDate)));selectedDate=daysBetween(anchor,next)<0?anchor:next;renderToday();renderIconSlots($("#todayView"));return;}
  const week=event.target.closest("[data-open-week]");if(week){const base=activeView==="cycle"?cycleByIndex(selectedCycleIndex):currentCycle();selectedDate=dateKey(addDays(base.start,Number(week.dataset.openWeek)*7));render();showView("today");return;}
  const retentionDate=event.target.closest("[data-retention-date]");if(retentionDate){toggleHabit("semen-retention",retentionDate.dataset.retentionDate);return;}
  const cycleShift=event.target.closest("[data-cycle-shift]");if(cycleShift){selectedCycleIndex+=Number(cycleShift.dataset.cycleShift);if(activeView==="history"){renderHistory();renderIconSlots($("#historyView"));}else{renderCycle();renderIconSlots($("#cycleView"));}return;}
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
const initialView=location.hash.slice(1);showView(["dashboard","today","cycle","history","settings"].includes(initialView)?initialView:"dashboard");
