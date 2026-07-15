import { DEFAULT_CYCLE_START, DEFAULT_HABITS, dateKey } from "./model.js";

export const STORAGE_KEY = "daymark-v3";
export const LEGACY_KEY = "daymark-v1";

const clone = value => JSON.parse(JSON.stringify(value));
const makeId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

export function createInitialState() {
  return {
    version:3,
    settings:{
      name:"", cycleAnchor:DEFAULT_CYCLE_START, targetWeight:null, startingWeight:null,
      privateLabelHidden:true, theme:"dark", celebrations:true
    },
    habits:clone(DEFAULT_HABITS), entries:{}, weights:{}, dayNotes:{}, oneTimeTasks:[], migration:{legacyMigrated:false}
  };
}

function migrateLegacy(base, legacy) {
  if (!legacy?.tasks) return base;
  base.settings.name = legacy.name || "";
  base.settings.theme = "dark";
  base.settings.celebrations = legacy.celebrations !== false;
  base.dayNotes = {...(legacy.notes || {})};
  const demoNames = new Set(["Morning stretch","Plan the day's priorities","Drink 8 glasses of water","30 minutes of movement","Call someone I care about"]);
  const idMap = {};
  legacy.tasks.filter(task => !demoNames.has(task.name)).forEach((task,index) => {
    const id = `legacy-${String(task.id || index).replace(/[^a-zA-Z0-9-]/g,"")}`;
    idMap[task.id] = id;
    base.habits.push({
      id, name:task.name || "Imported habit", category:task.category || "custom", icon:"check",
      schedule:task.frequency === "daily" ? [0,1,2,3,4,5,6] : task.frequency === "weekdays" ? [1,2,3,4,5] : [6],
      time:task.time || "", points:5, type:"boolean", active:true, imported:true
    });
  });
  Object.entries(legacy.completions || {}).forEach(([date,ids]) => {
    base.entries[date] ||= {};
    ids.forEach(oldId => { if(idMap[oldId]) base.entries[date][idMap[oldId]]={status:"completed",migrated:true}; });
  });
  base.migration = {legacyMigrated:true, migratedAt:new Date().toISOString()};
  return base;
}

function normalize(raw) {
  const initial=createInitialState();
  if(!raw || raw.version !== 3) return initial;
  const normalized = {
    ...initial, ...raw,
    settings:{...initial.settings,...raw.settings},
    habits:Array.isArray(raw.habits) ? raw.habits : initial.habits,
    entries:raw.entries || {}, weights:raw.weights || {}, dayNotes:raw.dayNotes || {}, oneTimeTasks:raw.oneTimeTasks || []
  };
  normalized.settings.theme="dark";
  return normalized;
}

export class DaymarkStore {
  constructor(storage = globalThis.localStorage) { this.storage=storage; this.state=this.load(); }
  load() {
    try {
      const current=JSON.parse(this.storage.getItem(STORAGE_KEY));
      if(current?.version===3) return normalize(current);
      const legacy=JSON.parse(this.storage.getItem(LEGACY_KEY));
      const migrated=migrateLegacy(createInitialState(),legacy);
      this.storage.setItem(STORAGE_KEY,JSON.stringify(migrated));
      return migrated;
    } catch(error) {
      console.warn("Daymark storage recovery",error);
      return createInitialState();
    }
  }
  save() {
    this.state.version=3;
    this.storage.setItem(STORAGE_KEY,JSON.stringify(this.state));
    return this.state;
  }
  update(mutator) { mutator(this.state); return this.save(); }
  setEntry(date,habitId,patch) {
    const key=dateKey(date);
    this.state.entries[key] ||= {};
    this.state.entries[key][habitId] = {...(this.state.entries[key][habitId]||{}),...patch,updatedAt:new Date().toISOString()};
    return this.save();
  }
  setWeight(date,value,note="") {
    const key=dateKey(date);
    this.state.weights[key]={value:Number(value),note:String(note||""),updatedAt:new Date().toISOString()};
    return this.save();
  }
  addHabit(habit) {
    const id=habit.id || makeId("habit");
    if(this.state.habits.some(item=>item.id===id)) throw new Error("A habit with this ID already exists.");
    this.state.habits.push({...habit,id,active:habit.active!==false});
    this.save(); return id;
  }
  addOneTimeTask(task) {
    const id=makeId("task");
    this.state.oneTimeTasks.push({...task,id,completed:false,createdAt:new Date().toISOString()});
    this.save(); return id;
  }
  export() { return JSON.stringify(this.state,null,2); }
  import(json) {
    const raw=JSON.parse(json);
    if(raw?.version!==3 || !Array.isArray(raw.habits)) throw new Error("This backup is not a supported Daymark file.");
    const parsed=normalize(raw);
    this.state=parsed; return this.save();
  }
  reset() { this.state=createInitialState(); return this.save(); }
}
