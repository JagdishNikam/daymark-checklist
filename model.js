export const DAY_MS = 86_400_000;
export const CYCLE_LENGTH = 28;
export const DEFAULT_CYCLE_START = "2026-07-12";

export const DEFAULT_HABITS = [
  { id:"wake-630", name:"Wake up at 6:30 to 7:30", category:"morning", icon:"sunrise", schedule:[1,2,3,4,5,6], time:"06:30", points:10, type:"boolean", active:true },
  { id:"temple-ritual", name:"Temple Ritual", category:"spiritual", icon:"temple", schedule:[0,1,2,3,4,5,6], time:"07:00", points:10, type:"subtasks", active:true, subtasks:[
    { id:"visited", name:"Temple visited" },
    { id:"shiva-water", name:"Water offered to Lord Shiva" },
    { id:"parvati-gajra", name:"Gajra offered to Goddess Parvati" }
  ]},
  { id:"black-coffee", name:"Drink black coffee", category:"morning", icon:"coffee", schedule:[1,2,3,4,5,6], time:"07:15", points:3, type:"boolean", active:true },
  { id:"orange", name:"Eat an orange", category:"nutrition", icon:"orange", schedule:[1,2,3,4,5,6], time:"06:45", points:4, type:"boolean", active:true },
  { id:"workout", name:"Gym / workout", category:"fitness", icon:"dumbbell", schedule:[1,2,3,4,5,6], time:"07:30", points:15, type:"boolean", active:true },
  { id:"back-physio", name:"Back physiotherapy", category:"fitness", icon:"physio", schedule:[1,2,3,4,5,6], time:"08:15", points:8, type:"boolean", active:true },
  { id:"soya-rice", name:"Post-workout soya chunks rice", category:"nutrition", icon:"bowl", schedule:[1,2,3,4,5,6], time:"09:00", points:7, type:"boolean", active:true, editableDescription:true },
  { id:"protein-lunch", name:"Protein-focused lunch", description:"Paneer bhurji and bhakri", category:"nutrition", icon:"utensils", schedule:[1,2,3,4,5,6], time:"13:00", points:7, type:"boolean", active:true, editableDescription:true },
  { id:"protein-dinner", name:"Protein dinner", category:"nutrition", icon:"bowl", schedule:[1,2,3,4,5,6], time:"20:00", points:7, type:"boolean", active:true, editableDescription:true },
  { id:"protein-goal", name:"Daily protein / nutrition goal", category:"nutrition", icon:"nutrition", schedule:[1,2,3,4,5,6], time:"20:00", points:8, type:"boolean", active:true, editableDescription:true },
  { id:"kegel", name:"Kegel Exercise", category:"wellness", icon:"activity", schedule:[1,2,3,4,5,6], points:9, type:"subtasks", active:true, subtasks:[
    { id:"morning", name:"Kegel 1" },
    { id:"evening", name:"Kegel 2" }
  ]},
  { id:"avla-drink", name:"Amla drink", category:"nutrition", icon:"leaf", schedule:[1,2,3,4,5,6], time:"11:00", points:4, type:"boolean", active:true },
  { id:"beetroot-juice", name:"Beetroot juice", category:"nutrition", icon:"drop", schedule:[1,2,3,4,5,6], time:"16:30", points:4, type:"boolean", active:true },
  { id:"water-intake-1", name:"Water intake 1", category:"nutrition", icon:"drop", schedule:[0,1,2,3,4,5,6], time:"12:00", points:3, type:"boolean", active:true },
  { id:"water-intake-2", name:"Water intake 2", category:"nutrition", icon:"drop", schedule:[0,1,2,3,4,5,6], time:"18:00", points:3, type:"boolean", active:true },
  { id:"hair-care", name:"Hair - Skin care", category:"wellness", icon:"hair", schedule:[0,1,2,3,4,5,6], time:"21:00", points:4, type:"boolean", active:true },
  { id:"learning", name:"Salesforce Training", category:"learning", icon:"book", schedule:[1,2,3,4,5], time:"19:00", points:15, type:"learning", active:true },
  { id:"dev-puja", name:"Dev Puja at home", category:"spiritual", icon:"spark", schedule:[1,2,3,4,5,6], time:"18:00", points:6, type:"boolean", active:true },
  { id:"evening-activity", name:"Evening Activity", category:"fitness", icon:"footsteps", schedule:[1,2,3,4,5,6], time:"18:30", points:10, type:"activity", active:true },
  { id:"semen-retention", name:"Semen Retention", category:"private", icon:"shield", schedule:[0,1,2,3,4,5,6], points:10, type:"boolean", active:true, private:true },
  { id:"diya", name:"Diva", category:"spiritual", icon:"spark", schedule:[0,1,2,3,4,5,6], points:4, type:"boolean", active:true },
  { id:"water-storage-bath", name:"Water Storage - Bath", category:"wellness", icon:"drop", schedule:[0,1,2,3,4,5,6], points:4, type:"boolean", active:true }
];

export const CATEGORY_LABELS = {
  morning:"Morning Foundation", spiritual:"Spiritual Routine", nutrition:"Nutrition & Protein",
  wellness:"Kegel Exercise", fitness:"Fitness", learning:"Learning", private:"Personal Goal", custom:"Custom"
};

export function parseDate(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function dateKey(date) {
  const d = typeof date === "string" ? parseDate(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function addDays(date, amount) {
  const d = typeof date === "string" ? parseDate(date) : new Date(date);
  d.setDate(d.getDate() + amount);
  d.setHours(12,0,0,0);
  return d;
}

export function daysBetween(a, b) {
  const left = Date.UTC(parseDate(dateKey(a)).getFullYear(), parseDate(dateKey(a)).getMonth(), parseDate(dateKey(a)).getDate());
  const right = Date.UTC(parseDate(dateKey(b)).getFullYear(), parseDate(dateKey(b)).getMonth(), parseDate(dateKey(b)).getDate());
  return Math.round((right - left) / DAY_MS);
}

export function cycleForDate(date, anchor = DEFAULT_CYCLE_START) {
  const offset = daysBetween(anchor, date);
  const index = Math.floor(offset / CYCLE_LENGTH);
  const start = addDays(anchor, index * CYCLE_LENGTH);
  const end = addDays(start, CYCLE_LENGTH - 1);
  const day = offset - index * CYCLE_LENGTH + 1;
  return { index, number:index + 1, start:dateKey(start), end:dateKey(end), day, week:Math.floor((day-1)/7)+1 };
}

export function cycleWeeks(cycle) {
  return Array.from({length:4}, (_, index) => ({
    index, number:index+1,
    start:dateKey(addDays(cycle.start, index*7)),
    end:dateKey(addDays(cycle.start, index*7+6))
  }));
}

export function datesInRange(start, end) {
  const length = daysBetween(start, end) + 1;
  return Array.from({length:Math.max(0,length)}, (_, index) => dateKey(addDays(start,index)));
}

export function isFuture(date, today = new Date()) { return daysBetween(today, date) > 0; }
export function isPast(date, today = new Date()) { return daysBetween(date, today) > 0; }
export function isScheduled(habit, date) {
  if (!habit?.active) return false;
  const key = dateKey(date);
  if (habit.startDate && daysBetween(habit.startDate, key) < 0) return false;
  if (habit.archivedAt && daysBetween(key, habit.archivedAt) <= 0) return false;
  // Sunday is a positive rest/spiritual day. Only the temple ritual and
  // private goal remain eligible; other routines are not scheduled.
  if (parseDate(key).getDay() === 0 && !["temple-ritual", "semen-retention"].includes(habit.id)) return false;
  return (habit.schedule || []).includes(parseDate(key).getDay());
}

export function entryFor(state, habitId, date) { return state.entries?.[dateKey(date)]?.[habitId] || {}; }

export function completionFraction(habit, entry = {}) {
  if (habit.type === "subtasks") {
    const total = habit.subtasks?.length || 1;
    return habit.subtasks.reduce((sum, item) => sum + (entry.subtasks?.[item.id] ? 1 : 0), 0) / total;
  }
  if (habit.type === "learning") {
    if (entry.manualStatus === "completed") return 1;
    if (entry.manualStatus === "pending") return 0;
    return Math.min(Math.max(Number(entry.minutes) || 0, 0) / 60, 1);
  }
  if (habit.type === "activity") return ["swimming","walking"].includes(entry.activity) ? 1 : 0;
  return entry.status === "completed" ? 1 : 0;
}

export function habitState(state, habit, date, today = new Date()) {
  const key = dateKey(date);
  if (!isScheduled(habit, key)) return "not-scheduled";
  if (isFuture(key, today)) return "upcoming";
  const entry = entryFor(state, habit.id, key);
  const fraction = completionFraction(habit, entry);
  if (fraction >= 1) return "completed";
  if (fraction > 0 || entry.status === "partial") return "partial";
  if (isPast(key, today)) return "missed";
  return "pending";
}

export function scoreDay(state, date, today = new Date()) {
  const key = dateKey(date);
  if (isFuture(key, today)) return {score:null, earned:0, scheduled:0, completed:0, missed:0, partial:0, pending:0};
  let earned=0, scheduled=0, completed=0, missed=0, partial=0, pending=0;
  state.habits.filter(h => isScheduled(h,key)).forEach(habit => {
    const points = Math.max(0, Number(habit.points) || 0);
    const fraction = completionFraction(habit, entryFor(state,habit.id,key));
    const status = habitState(state,habit,key,today);
    scheduled += points; earned += points*fraction;
    if(status === "completed") completed++;
    else if(status === "missed") missed++;
    else if(status === "partial") partial++;
    else if(status === "pending") pending++;
  });
  return { score:scheduled ? Math.round(earned/scheduled*100) : null, earned, scheduled, completed, missed, partial, pending };
}

export function scorePeriod(state, start, end, today = new Date()) {
  let earned=0, scheduled=0, completed=0, missed=0, partial=0, pending=0;
  datesInRange(start,end).filter(key => !isFuture(key,today)).forEach(key => {
    const day = scoreDay(state,key,today);
    earned += day.earned; scheduled += day.scheduled; completed += day.completed; missed += day.missed; partial += day.partial; pending += day.pending;
  });
  return {score:scheduled ? Math.round(earned/scheduled*100) : null,earned,scheduled,completed,missed,partial,pending};
}

export function habitStats(state, habit, start, end, today = new Date()) {
  let scheduled=0, completed=0, earned=0;
  const history=[];
  datesInRange(start,end).filter(key=>!isFuture(key,today)).forEach(key=>{
    if(!isScheduled(habit,key)) return;
    scheduled++;
    const fraction=completionFraction(habit,entryFor(state,habit.id,key));
    earned+=fraction;
    if(fraction>=1) completed++;
    history.push({date:key,status:habitState(state,habit,key,today),fraction});
  });
  return {scheduled,completed,rate:scheduled?Math.round(earned/scheduled*100):null,history};
}

export function streakForHabit(state, habitId, today = new Date()) {
  const habit=state.habits.find(item=>item.id===habitId);
  if(!habit) return {current:0,longest:0};
  const anchor=state.settings?.cycleAnchor || DEFAULT_CYCLE_START;
  const keys=datesInRange(anchor,dateKey(today)).filter(key=>isScheduled(habit,key));
  let longest=0,run=0;
  keys.forEach(key=>{ if(completionFraction(habit,entryFor(state,habit.id,key))>=1){run++;longest=Math.max(longest,run);}else run=0; });
  let current=0;
  for(let i=keys.length-1;i>=0;i--){ if(completionFraction(habit,entryFor(state,habit.id,keys[i]))>=1) current++; else break; }
  return {current,longest};
}

export function completionStreaks(state, today = new Date()) {
  const anchor=state.settings?.cycleAnchor || DEFAULT_CYCLE_START;
  const keys=datesInRange(anchor,dateKey(today));
  let longest=0,run=0;
  keys.forEach(key=>{const day=scoreDay(state,key,today);if(day.scheduled>0&&day.score===100){run++;longest=Math.max(longest,run);}else run=0;});
  let current=0;
  for(let i=keys.length-1;i>=0;i--){const day=scoreDay(state,keys[i],today);if(day.scheduled>0&&day.score===100)current++;else break;}
  return {current,longest};
}

export function consistencyLeaders(state, start, end, today = new Date()) {
  const scored=state.habits.filter(h=>h.active).map(h=>({habit:h,...habitStats(state,h,start,end,today)})).filter(item=>item.scheduled>0);
  scored.sort((a,b)=>(b.rate??-1)-(a.rate??-1));
  return {best:scored[0]||null,attention:[...scored].reverse()[0]||null};
}

export function weightStats(state, cycle) {
  const values=datesInRange(cycle.start,cycle.end).map(date=>state.weights?.[date]?.value).filter(Number.isFinite);
  const first=values[0] ?? null, latest=values.at(-1) ?? null;
  const average=values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  const target=Number.isFinite(state.settings?.targetWeight) ? state.settings.targetWeight : null;
  const starting=Number.isFinite(state.settings?.startingWeight) ? state.settings.startingWeight : first;
  const totalDistance=starting!=null&&target!=null?Math.abs(starting-target):null;
  const covered=starting!=null&&latest!=null&&target!=null?Math.max(0,Math.min(totalDistance,Math.abs(starting-latest))):0;
  return {values,first,latest,average,highest:values.length?Math.max(...values):null,lowest:values.length?Math.min(...values):null,change:first!=null&&latest!=null?latest-first:null,target,starting,remaining:latest!=null&&target!=null?Math.abs(latest-target):null,progress:totalDistance?Math.round(covered/totalDistance*100):0};
}

export function formatRange(start,end,locale=undefined){
  const a=parseDate(start),b=parseDate(end);
  return `${a.toLocaleDateString(locale,{month:"short",day:"numeric"})} – ${b.toLocaleDateString(locale,{month:"short",day:"numeric",year:"numeric"})}`;
}
