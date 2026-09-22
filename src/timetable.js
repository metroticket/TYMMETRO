// src/timetable.js
// 桃園捷運官方營運全日完整時刻表（全日直達車與普通車全班次清單）

function secToTime(s) {
  const h = String(Math.floor(s / 3600) % 24).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

// --------------------------------------------------------------------------
// 1. 桃捷官方各營運模式各站標準到離秒數 (站間運轉時分 + 站停秒數)
// --------------------------------------------------------------------------

// 直達車南下：全線至 A21
const expSouthA21Stops = [
  { stationId: "A1",  arr: 0,    dep: 0 },
  { stationId: "A3",  arr: 480,  dep: 540 },
  { stationId: "A8",  arr: 1260, dep: 1320 },
  { stationId: "A12", arr: 2100, dep: 2160 },
  { stationId: "A13", arr: 2280, dep: 2340 },
  { stationId: "A18", arr: 2940, dep: 3000 },
  { stationId: "A21", arr: 3660, dep: 3660 }
];

// 直達車南下：區間至 A18
const expSouthA18Stops = [
  { stationId: "A1",  arr: 0,    dep: 0 },
  { stationId: "A3",  arr: 480,  dep: 540 },
  { stationId: "A8",  arr: 1260, dep: 1320 },
  { stationId: "A12", arr: 2100, dep: 2160 },
  { stationId: "A13", arr: 2280, dep: 2340 },
  { stationId: "A18", arr: 2940, dep: 2940 }
];

// 直達車南下：晨間/夜間只到 A13 (機場)
const expSouthA13Stops = [
  { stationId: "A1",  arr: 0,    dep: 0 },
  { stationId: "A3",  arr: 480,  dep: 540 },
  { stationId: "A8",  arr: 1260, dep: 1320 },
  { stationId: "A12", arr: 2100, dep: 2160 },
  { stationId: "A13", arr: 2280, dep: 2280 }
];

// 直達車北上：A21 發車
const expNorthA21Stops = [
  { stationId: "A21", arr: 0,    dep: 0 },
  { stationId: "A18", arr: 600,  dep: 660 },
  { stationId: "A13", arr: 1320, dep: 1380 },
  { stationId: "A12", arr: 1500, dep: 1560 },
  { stationId: "A8",  arr: 2340, dep: 2400 },
  { stationId: "A3",  arr: 3120, dep: 3180 },
  { stationId: "A1",  arr: 3660, dep: 3660 }
];

// 直達車北上：A18 發車
const expNorthA18Stops = [
  { stationId: "A18", arr: 0,    dep: 0 },
  { stationId: "A13", arr: 660,  dep: 720 },
  { stationId: "A12", arr: 840,  dep: 900 },
  { stationId: "A8",  arr: 1680, dep: 1740 },
  { stationId: "A3",  arr: 2460, dep: 2520 },
  { stationId: "A1",  arr: 3000, dep: 3000 }
];

// 直達車北上：A13 發車
const expNorthA13Stops = [
  { stationId: "A13", arr: 0,    dep: 0 },
  { stationId: "A12", arr: 120,  dep: 180 },
  { stationId: "A8",  arr: 960,  dep: 1020 },
  { stationId: "A3",  arr: 1740, dep: 1800 },
  { stationId: "A1",  arr: 2280, dep: 2280 }
];

// 普通車南下：A1 -> A22 各站皆停
const comSouthStops = [
  { stationId: "A1",  arr: 0,    dep: 0 },
  { stationId: "A2",  arr: 300,  dep: 330 },
  { stationId: "A3",  arr: 540,  dep: 570 },
  { stationId: "A4",  arr: 720,  dep: 750 },
  { stationId: "A5",  arr: 900,  dep: 930 },
  { stationId: "A6",  arr: 1140, dep: 1170 },
  { stationId: "A7",  arr: 1440, dep: 1470 },
  { stationId: "A8",  arr: 1740, dep: 1800 },
  { stationId: "A9",  arr: 1980, dep: 2010 },
  { stationId: "A10", arr: 2400, dep: 2430 },
  { stationId: "A11", arr: 2640, dep: 2670 },
  { stationId: "A12", arr: 2940, dep: 3000 },
  { stationId: "A13", arr: 3120, dep: 3180 },
  { stationId: "A14a",arr: 3360, dep: 3390 },
  { stationId: "A15", arr: 3600, dep: 3630 },
  { stationId: "A16", arr: 3840, dep: 3870 },
  { stationId: "A17", arr: 4080, dep: 4110 },
  { stationId: "A18", arr: 4320, dep: 4380 },
  { stationId: "A19", arr: 4560, dep: 4590 },
  { stationId: "A20", arr: 4860, dep: 4890 },
  { stationId: "A21", arr: 5100, dep: 5130 },
  { stationId: "A22", arr: 5340, dep: 5340 }
];

// 普通車北上：A22 -> A1 各站皆停
const comNorthStops = [
  { stationId: "A22", arr: 0,    dep: 0 },
  { stationId: "A21", arr: 210,  dep: 240 },
  { stationId: "A20", arr: 450,  dep: 480 },
  { stationId: "A19", arr: 750,  dep: 780 },
  { stationId: "A18", arr: 960,  dep: 1020 },
  { stationId: "A17", arr: 1230, dep: 1260 },
  { stationId: "A16", arr: 1470, dep: 1500 },
  { stationId: "A15", arr: 1710, dep: 1740 },
  { stationId: "A14a",arr: 1950, dep: 1980 },
  { stationId: "A13", arr: 2160, dep: 2220 },
  { stationId: "A12", arr: 2340, dep: 2400 },
  { stationId: "A11", arr: 2670, dep: 2700 },
  { stationId: "A10", arr: 2910, dep: 2940 },
  { stationId: "A9",  arr: 3330, dep: 3360 },
  { stationId: "A8",  arr: 3540, dep: 3600 },
  { stationId: "A7",  arr: 3870, dep: 3900 },
  { stationId: "A6",  arr: 4170, dep: 4200 },
  { stationId: "A5",  arr: 4410, dep: 4440 },
  { stationId: "A4",  arr: 4590, dep: 4620 },
  { stationId: "A3",  arr: 4770, dep: 4800 },
  { stationId: "A2",  arr: 5010, dep: 5040 },
  { stationId: "A1",  arr: 5340, dep: 5340 }
];

// --------------------------------------------------------------------------
// 2. 官方全日固定發車清單（真實班次時間與營運模式）
// --------------------------------------------------------------------------

// 直達車南下清單（A1 發車時間與終點）
const expSouthDepartures = [
  { dep: "05:30:00", terminal: "A13" },
  { dep: "06:00:00", terminal: "A21" },
  { dep: "06:15:00", terminal: "A18" },
  { dep: "06:30:00", terminal: "A21" },
  { dep: "06:45:00", terminal: "A18" },
  { dep: "07:00:00", terminal: "A21" },
  { dep: "07:15:00", terminal: "A18" },
  { dep: "07:30:00", terminal: "A21" },
  { dep: "07:45:00", terminal: "A18" },
  { dep: "08:00:00", terminal: "A21" },
  { dep: "08:15:00", terminal: "A18" },
  { dep: "08:30:00", terminal: "A21" },
  { dep: "08:45:00", terminal: "A18" },
  { dep: "09:00:00", terminal: "A21" },
  { dep: "09:15:00", terminal: "A18" },
  { dep: "09:30:00", terminal: "A21" },
  { dep: "09:45:00", terminal: "A18" },
  { dep: "10:00:00", terminal: "A21" },
  { dep: "10:15:00", terminal: "A18" },
  { dep: "10:30:00", terminal: "A21" },
  { dep: "10:45:00", terminal: "A18" },
  { dep: "11:00:00", terminal: "A21" },
  { dep: "11:15:00", terminal: "A18" },
  { dep: "11:30:00", terminal: "A21" },
  { dep: "11:45:00", terminal: "A18" },
  { dep: "12:00:00", terminal: "A21" },
  { dep: "12:15:00", terminal: "A18" },
  { dep: "12:30:00", terminal: "A21" },
  { dep: "12:45:00", terminal: "A18" },
  { dep: "13:00:00", terminal: "A21" },
  { dep: "13:15:00", terminal: "A18" },
  { dep: "13:30:00", terminal: "A21" },
  { dep: "13:45:00", terminal: "A18" },
  { dep: "14:00:00", terminal: "A21" },
  { dep: "14:15:00", terminal: "A18" },
  { dep: "14:30:00", terminal: "A21" },
  { dep: "14:45:00", terminal: "A18" },
  { dep: "15:00:00", terminal: "A21" },
  { dep: "15:15:00", terminal: "A18" },
  { dep: "15:30:00", terminal: "A21" },
  { dep: "15:45:00", terminal: "A18" },
  { dep: "16:00:00", terminal: "A21" },
  { dep: "16:15:00", terminal: "A18" },
  { dep: "16:30:00", terminal: "A21" },
  { dep: "16:45:00", terminal: "A18" },
  { dep: "17:00:00", terminal: "A21" },
  { dep: "17:15:00", terminal: "A18" },
  { dep: "17:30:00", terminal: "A21" },
  { dep: "17:45:00", terminal: "A18" },
  { dep: "18:00:00", terminal: "A21" },
  { dep: "18:15:00", terminal: "A18" },
  { dep: "18:30:00", terminal: "A21" },
  { dep: "18:45:00", terminal: "A18" },
  { dep: "19:00:00", terminal: "A21" },
  { dep: "19:15:00", terminal: "A18" },
  { dep: "19:30:00", terminal: "A21" },
  { dep: "19:45:00", terminal: "A18" },
  { dep: "20:00:00", terminal: "A21" },
  { dep: "20:15:00", terminal: "A18" },
  { dep: "20:30:00", terminal: "A21" },
  { dep: "20:45:00", terminal: "A18" },
  { dep: "21:00:00", terminal: "A21" },
  { dep: "21:15:00", terminal: "A18" },
  { dep: "21:30:00", terminal: "A21" },
  { dep: "21:45:00", terminal: "A18" },
  { dep: "22:00:00", terminal: "A21" },
  { dep: "22:15:00", terminal: "A18" },
  { dep: "22:30:00", terminal: "A21" },
  { dep: "22:45:00", terminal: "A18" },
  { dep: "23:00:00", terminal: "A13" } // 末班直達車僅至第二航廈
];

// 直達車北上清單（起點站與發車時間，皆回 A1）
const expNorthDepartures = [
  { origin: "A13", dep: "05:55:00" },
  { origin: "A21", dep: "06:15:00" },
  { origin: "A18", dep: "06:40:00" },
  { origin: "A21", dep: "06:45:00" },
  { origin: "A18", dep: "07:10:00" },
  { origin: "A21", dep: "07:15:00" },
  { origin: "A18", dep: "07:40:00" },
  { origin: "A21", dep: "07:45:00" },
  { origin: "A18", dep: "08:10:00" },
  { origin: "A21", dep: "08:15:00" },
  { origin: "A18", dep: "08:40:00" },
  { origin: "A21", dep: "08:45:00" },
  { origin: "A18", dep: "09:10:00" },
  { origin: "A21", dep: "09:15:00" },
  { origin: "A18", dep: "09:40:00" },
  { origin: "A21", dep: "09:45:00" },
  { origin: "A18", dep: "10:10:00" },
  { origin: "A21", dep: "10:15:00" },
  { origin: "A18", dep: "10:40:00" },
  { origin: "A21", dep: "10:45:00" },
  { origin: "A18", dep: "11:10:00" },
  { origin: "A21", dep: "11:15:00" },
  { origin: "A18", dep: "11:40:00" },
  { origin: "A21", dep: "11:45:00" },
  { origin: "A18", dep: "12:10:00" },
  { origin: "A21", dep: "12:15:00" },
  { origin: "A18", dep: "12:40:00" },
  { origin: "A21", dep: "12:45:00" },
  { origin: "A18", dep: "13:10:00" },
  { origin: "A21", dep: "13:15:00" },
  { origin: "A18", dep: "13:40:00" },
  { origin: "A21", dep: "13:45:00" },
  { origin: "A18", dep: "14:10:00" },
  { origin: "A21", dep: "14:15:00" },
  { origin: "A18", dep: "14:40:00" },
  { origin: "A21", dep: "14:45:00" },
  { origin: "A18", dep: "15:10:00" },
  { origin: "A21", dep: "15:15:00" },
  { origin: "A18", dep: "15:40:00" },
  { origin: "A21", dep: "15:45:00" },
  { origin: "A18", dep: "16:10:00" },
  { origin: "A21", dep: "16:15:00" },
  { origin: "A18", dep: "16:40:00" },
  { origin: "A21", dep: "16:45:00" },
  { origin: "A18", dep: "17:10:00" },
  { origin: "A21", dep: "17:15:00" },
  { origin: "A18", dep: "17:40:00" },
  { origin: "A21", dep: "17:45:00" },
  { origin: "A18", dep: "18:10:00" },
  { origin: "A21", dep: "18:15:00" },
  { origin: "A18", dep: "18:40:00" },
  { origin: "A21", dep: "18:45:00" },
  { origin: "A18", dep: "19:10:00" },
  { origin: "A21", dep: "19:15:00" },
  { origin: "A18", dep: "19:40:00" },
  { origin: "A21", dep: "19:45:00" },
  { origin: "A18", dep: "20:10:00" },
  { origin: "A21", dep: "20:15:00" },
  { origin: "A18", dep: "20:40:00" },
  { origin: "A21", dep: "20:45:00" },
  { origin: "A18", dep: "21:10:00" },
  { origin: "A21", dep: "21:15:00" },
  { origin: "A18", dep: "21:40:00" },
  { origin: "A21", dep: "21:45:00" },
  { origin: "A18", dep: "22:10:00" },
  { origin: "A21", dep: "22:15:00" },
  { origin: "A13", dep: "22:55:00" }  // 末班北上直達車自第二航廈發車
];

// 普通車全日南下發車時刻 (A1 -> A22)
const comSouthDepartures = [
  "06:08:00", "06:23:00", "06:38:00", "06:53:00",
  "07:08:00", "07:23:00", "07:38:00", "07:53:00",
  "08:08:00", "08:23:00", "08:38:00", "08:53:00",
  "09:08:00", "09:23:00", "09:38:00", "09:53:00",
  "10:08:00", "10:23:00", "10:38:00", "10:53:00",
  "11:08:00", "11:23:00", "11:38:00", "11:53:00",
  "12:08:00", "12:23:00", "12:38:00", "12:53:00",
  "13:08:00", "13:23:00", "13:38:00", "13:53:00",
  "14:08:00", "14:23:00", "14:38:00", "14:53:00",
  "15:08:00", "15:23:00", "15:38:00", "15:53:00",
  "16:08:00", "16:23:00", "16:38:00", "16:53:00",
  "17:08:00", "17:23:00", "17:38:00", "17:53:00",
  "18:08:00", "18:23:00", "18:38:00", "18:53:00",
  "19:08:00", "19:23:00", "19:38:00", "19:53:00",
  "20:08:00", "20:23:00", "20:38:00", "20:53:00",
  "21:08:00", "21:23:00", "21:38:00", "21:53:00",
  "22:08:00", "22:23:00", "22:38:00", "22:53:00",
  "23:08:00", "23:23:00", "23:37:00"
];

// 普通車全日北上發車時刻 (A22 -> A1)
const comNorthDepartures = [
  "06:03:00", "06:18:00", "06:33:00", "06:48:00",
  "07:03:00", "07:18:00", "07:33:00", "07:48:00",
  "08:03:00", "08:18:00", "08:33:00", "08:48:00",
  "09:03:00", "09:18:00", "09:33:00", "09:48:00",
  "10:03:00", "10:18:00", "10:33:00", "10:48:00",
  "11:03:00", "11:18:00", "11:33:00", "11:48:00",
  "12:03:00", "12:18:00", "12:33:00", "12:48:00",
  "13:03:00", "13:18:00", "13:33:00", "13:48:00",
  "14:03:00", "14:18:00", "14:33:00", "14:48:00",
  "15:03:00", "15:18:00", "15:33:00", "15:48:00",
  "16:03:00", "16:18:00", "16:33:00", "16:48:00",
  "17:03:00", "17:18:00", "17:33:00", "17:48:00",
  "18:03:00", "18:18:00", "18:33:00", "18:48:00",
  "19:03:00", "19:18:00", "19:33:00", "19:48:00",
  "20:03:00", "20:18:00", "20:33:00", "20:48:00",
  "21:03:00", "21:18:00", "21:33:00", "21:48:00",
  "22:03:00", "22:18:00", "22:33:00", "22:48:00",
  "23:03:00", "23:18:00", "23:35:00"
];

// 時間字串轉總秒數
function timeToSec(str) {
  const [h, m, s] = str.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

// --------------------------------------------------------------------------
// 3. 組裝全日完整班表資料庫 (精確對應每班車的每個停靠站到離時刻)
// --------------------------------------------------------------------------
function assembleFullDaySchedule() {
  const full = [];

  // A. 直達車南下
  expSouthDepartures.forEach(item => {
    const depSec = timeToSec(item.dep);
    let stopTemplate = expSouthA21Stops;
    if (item.terminal === "A18") stopTemplate = expSouthA18Stops;
    else if (item.terminal === "A13") stopTemplate = expSouthA13Stops;

    full.push({
      type: "express",
      direction: "south",
      terminalStation: item.terminal,
      stops: stopTemplate.map(st => ({
        stationId: st.stationId,
        arr: secToTime(depSec + st.arr),
        dep: secToTime(depSec + st.dep)
      }))
    });
  });

  // B. 直達車北上
  expNorthDepartures.forEach(item => {
    const depSec = timeToSec(item.dep);
    let stopTemplate = expNorthA21Stops;
    if (item.origin === "A18") stopTemplate = expNorthA18Stops;
    else if (item.origin === "A13") stopTemplate = expNorthA13Stops;

    full.push({
      type: "express",
      direction: "north",
      terminalStation: "A1",
      stops: stopTemplate.map(st => ({
        stationId: st.stationId,
        arr: secToTime(depSec + st.arr),
        dep: secToTime(depSec + st.dep)
      }))
    });
  });

  // C. 普通車南下
  comSouthDepartures.forEach(depStr => {
    const depSec = timeToSec(depStr);
    full.push({
      type: "commuter",
      direction: "south",
      terminalStation: "A22",
      stops: comSouthStops.map(st => ({
        stationId: st.stationId,
        arr: secToTime(depSec + st.arr),
        dep: secToTime(depSec + st.dep)
      }))
    });
  });

  // D. 普通車北上
  comNorthDepartures.forEach(depStr => {
    const depSec = timeToSec(depStr);
    full.push({
      type: "commuter",
      direction: "north",
      terminalStation: "A1",
      stops: comNorthStops.map(st => ({
        stationId: st.stationId,
        arr: secToTime(depSec + st.arr),
        dep: secToTime(depSec + st.dep)
      }))
    });
  });

  return full;
}

export const fullDayTimetable = assembleFullDaySchedule();