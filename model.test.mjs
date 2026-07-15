import assert from "node:assert/strict";
import {
  DEFAULT_HABITS, completionFraction, cycleForDate, cycleWeeks, habitState, isScheduled,
  scoreDay, scorePeriod, weightStats
} from "./model.js";

const today = new Date(2026, 6, 15, 12);
const cycle = cycleForDate(today, "2026-07-12");
assert.deepEqual(cycle, {index:0,number:1,start:"2026-07-12",end:"2026-08-08",day:4,week:1});
assert.deepEqual(cycleWeeks(cycle).map(w=>[w.start,w.end]), [
  ["2026-07-12","2026-07-18"],["2026-07-19","2026-07-25"],["2026-07-26","2026-08-01"],["2026-08-02","2026-08-08"]
]);

const workout=DEFAULT_HABITS.find(h=>h.id==="workout");
const temple=DEFAULT_HABITS.find(h=>h.id==="temple-ritual");
const learning=DEFAULT_HABITS.find(h=>h.id==="learning");
const kegel=DEFAULT_HABITS.find(h=>h.id==="kegel");
assert.equal(isScheduled(workout,"2026-07-12"),false,"Sunday workout must be unscheduled");
assert.equal(isScheduled(temple,"2026-07-12"),true,"Temple ritual must be scheduled Sunday");
assert.equal(isScheduled(learning,"2026-07-18"),false,"Learning must be unscheduled Saturday");
assert.deepEqual(kegel.subtasks.map(item=>item.name),["Kegel 1","Kegel 2"],"Dashboard routine uses two Kegel sessions");
assert.equal(DEFAULT_HABITS.some(h=>h.id==="back-physio"),true,"Back physiotherapy must be seeded");
assert.equal(DEFAULT_HABITS.some(h=>h.id==="avla-drink"),true,"Amla drink must be seeded");

const state={settings:{cycleAnchor:"2026-07-12"},habits:DEFAULT_HABITS,entries:{"2026-07-15":{
  "temple-ritual":{subtasks:{visited:true,"shiva-water":true,"parvati-gajra":false}},
  learning:{minutes:60},"evening-activity":{activity:"walking"}
}},weights:{"2026-07-15":{value:82.5}}};
assert.equal(completionFraction(temple,state.entries["2026-07-15"]["temple-ritual"]),2/3);
assert.equal(habitState(state,temple,"2026-07-15",today),"partial");
assert.equal(completionFraction(learning,state.entries["2026-07-15"].learning),1);
assert.equal(scoreDay(state,"2026-07-16",today).score,null,"Future days must not score");
assert.equal(scorePeriod(state,"2026-07-12","2026-08-08",today).scheduled>0,true);
assert.equal(weightStats(state,cycle).latest,82.5);
assert.equal(Object.prototype.hasOwnProperty.call(scoreDay(state,"2026-07-15",today),"weight"),false,"Weight must not enter habit score");

const memory = new Map();
const storage = {getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const {DaymarkStore,STORAGE_KEY,LEGACY_KEY} = await import("./storage.js");
storage.setItem(LEGACY_KEY,JSON.stringify({tasks:[
  {id:"demo",name:"Morning stretch",frequency:"daily"},
  {id:"mine",name:"Read philosophy",frequency:"weekdays"}
],completions:{"2026-07-14":["demo","mine"]}}));
const store = new DaymarkStore(storage);
assert.equal(store.state.habits.some(h=>h.name==="Morning stretch"),false,"Old sample tasks must not become real history");
assert.equal(store.state.habits.some(h=>h.name==="Read philosophy"),true,"Personal legacy habits should migrate");
store.setEntry("2026-07-15","learning",{minutes:20});
store.setEntry("2026-07-15","learning",{topic:"Cycle logic"});
assert.equal(Object.keys(store.state.entries["2026-07-15"]).length,1,"One habit/date pair must remain unique");
assert.equal(store.state.entries["2026-07-15"].learning.minutes,20,"Entry patches must preserve existing fields");
store.setWeight("2026-07-15",82.5);store.setWeight("2026-07-15",82.2,"After workout");
assert.equal(Object.keys(store.state.weights).length,1,"Weight records must remain unique per date");
assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).weights["2026-07-15"].value,82.2,"Changes must persist immediately");
assert.throws(()=>store.import('{"version":2}'),/not a supported/);

console.log("Daymark model and storage tests passed");
