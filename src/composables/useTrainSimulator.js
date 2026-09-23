import { ref } from 'vue';
import * as turf from '@turf/turf';
import { stations, calibratedCoords } from '../trackData.js';
import { fullDayTimetable } from '../timetable.js';

export function useTrainSimulator() {
  function timeStrToSeconds(str) {
    const [h, m, s] = str.split(':').map(Number);
    return h * 3600 + m * 60 + s;
  }

  const getNowSeconds = () => {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  };

  const simSeconds = ref(getNowSeconds());
  const timeMultiplier = ref(1);
  const activeExpressCount = ref(0);
  const activeCommuterCount = ref(0);

  let commuterLine = null;
  let expressLine = null;
  let commuterCoords = [];
  let expressCoords = [];
  let commuterTotalKm = 0;
  let expressTotalKm = 0;
  const stationDistanceMap = { commuter: {}, express: {} };

  // 1. 初始化雙軌幾何
  const buildSmoothDualTracks = () => {
    const line = turf.lineString(calibratedCoords);
    const simplified = turf.simplify(line, { tolerance: 0.00008, highQuality: true });
    const len = turf.length(simplified, { units: 'kilometers' });
    const stepKm = 0.06;
    const steps = Math.ceil(len / stepKm);
    const samplePts = [];
    for (let i = 0; i <= steps; i++) {
      samplePts.push(turf.along(simplified, (i / steps) * len, { units: 'kilometers' }).geometry.coordinates);
    }

    const sampledLine = turf.lineString(samplePts);
    const offsetExpress = turf.lineOffset(sampledLine, 0.015, { units: 'kilometers' });
    const offsetCommuter = turf.lineOffset(sampledLine, -0.015, { units: 'kilometers' });

    const ptA21 = turf.point(stations[20].coord);
    const expressFullCoords = offsetExpress.geometry.coordinates;
    let closestIdxA21 = 0;
    let minDist = Infinity;
    expressFullCoords.forEach((c, i) => {
      const d = turf.distance(turf.point(c), ptA21);
      if (d < minDist) {
        minDist = d;
        closestIdxA21 = i;
      }
    });

    expressCoords = expressFullCoords.slice(0, closestIdxA21 + 1);
    commuterCoords = offsetCommuter.geometry.coordinates;
    commuterLine = turf.lineString(commuterCoords);
    expressLine = turf.lineString(expressCoords);
    commuterTotalKm = turf.length(commuterLine, { units: 'kilometers' });
    expressTotalKm = turf.length(expressLine, { units: 'kilometers' });

    stations.forEach(s => {
      const pt = turf.point(s.coord);
      stationDistanceMap.commuter[s.id] = turf.nearestPointOnLine(commuterLine, pt).properties.location;
      if (s.express) {
        stationDistanceMap.express[s.id] = turf.nearestPointOnLine(expressLine, pt).properties.location;
      }
    });
  };

  buildSmoothDualTracks();

  // 2. 啟動 SVG 動畫渲染迴圈
  const initTrainAnimation = (map, svgTrainsGroup) => {
    const svgTrainElements = new Map();

    const getOrCreateSvgTrain = (trainId, train) => {
      if (svgTrainElements.has(trainId)) return svgTrainElements.get(trainId);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `svg-train ${train.type === 'express' ? 'train-exp' : 'train-com'}`);

      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('r', '10');
      halo.setAttribute('class', 'train-halo');
      g.appendChild(halo);

      const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      core.setAttribute('r', '5');
      core.setAttribute('class', 'train-core');
      g.appendChild(core);

      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      arrow.setAttribute('points', '0,-12 -3,-6 3,-6');
      arrow.setAttribute('class', 'train-arrow');
      g.appendChild(arrow);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('y', '16');
      text.setAttribute('class', 'train-text');
      text.textContent = train.type === 'express' ? `直達 ${train.terminalStation}` : `普通 ${train.terminalStation}`;
      g.appendChild(text);

      if (svgTrainsGroup) svgTrainsGroup.appendChild(g);
      const item = { g, currentCoord: null, prevCoord: null };
      svgTrainElements.set(trainId, item);
      return item;
    };

    const updateTrainsRendering = () => {
      svgTrainElements.forEach(item => {
        if (item.currentCoord && item.prevCoord) {
          const p = map.project(item.currentCoord);
          const pPrev = map.project(item.prevCoord);
          const angle = Math.atan2(p.y - pPrev.y, p.x - pPrev.x) * (180 / Math.PI) + 90;
          item.g.setAttribute('transform', `translate(${p.x.toFixed(2)}, ${p.y.toFixed(2)}) rotate(${angle.toFixed(1)})`);
        }
      });
    };

    let lastTimestamp = performance.now();

    function frame() {
      const nowTimestamp = performance.now();
      const dt = (nowTimestamp - lastTimestamp) / 1000;
      lastTimestamp = nowTimestamp;

      simSeconds.value = (simSeconds.value + dt * timeMultiplier.value) % 86400;
      const currentSec = simSeconds.value;

      let activeExp = 0;
      let activeCom = 0;

      fullDayTimetable.forEach(train => {
        const stops = train.stops;
        const firstStop = stops[0];
        const lastStop = stops[stops.length - 1];
        const trainId = `${train.type}-${train.direction}-${firstStop.dep}-${train.terminalStation}`;

        const startDepSec = timeStrToSeconds(firstStop.dep);
        const readySec = startDepSec - 60;
        const endArrSec = timeStrToSeconds(lastStop.arr);

        const targetLine = train.type === 'express' ? expressLine : commuterLine;
        const lineMaxKm = train.type === 'express' ? expressTotalKm : commuterTotalKm;
        const distMap = train.type === 'express' ? stationDistanceMap.express : stationDistanceMap.commuter;

        if (currentSec < readySec || currentSec > endArrSec) {
          if (svgTrainElements.has(trainId)) {
            svgTrainElements.get(trainId).g.remove();
            svgTrainElements.delete(trainId);
          }
          return;
        }

        if (train.type === 'express') activeExp++;
        else activeCom++;

        const trainItem = getOrCreateSvgTrain(trainId, train);
        const firstDist = Math.max(0, Math.min(lineMaxKm, distMap[firstStop.stationId] ?? 0));
        const initialPt = turf.along(targetLine, firstDist, { units: 'kilometers' });
        const offsetStep = train.direction === 'south' ? 0.05 : -0.05;
        const prevPt = turf.along(targetLine, Math.max(0, Math.min(lineMaxKm, firstDist - offsetStep)), { units: 'kilometers' });

        if (currentSec >= readySec && currentSec < startDepSec) {
          trainItem.currentCoord = initialPt.geometry.coordinates;
          trainItem.prevCoord = prevPt ? prevPt.geometry.coordinates : initialPt.geometry.coordinates;
          trainItem.g.classList.add('waiting');
          return;
        }

        trainItem.g.classList.remove('waiting');

        for (let i = 0; i < stops.length; i++) {
          const curStop = stops[i];
          const arrSec = timeStrToSeconds(curStop.arr);
          const depSec = timeStrToSeconds(curStop.dep);

          if (currentSec >= arrSec && currentSec <= depSec) {
            const stopDist = Math.max(0, Math.min(lineMaxKm, distMap[curStop.stationId] ?? 0));
            const pt = turf.along(targetLine, stopDist, { units: 'kilometers' });
            const pPrev = turf.along(targetLine, Math.max(0, Math.min(lineMaxKm, stopDist - offsetStep)), { units: 'kilometers' });
            if (pt?.geometry?.coordinates) {
              trainItem.currentCoord = pt.geometry.coordinates;
              trainItem.prevCoord = pPrev ? pPrev.geometry.coordinates : pt.geometry.coordinates;
            }
            return;
          }

          if (i < stops.length - 1) {
            const nextStop = stops[i + 1];
            const segDep = timeStrToSeconds(curStop.dep);
            const segArr = timeStrToSeconds(nextStop.arr);

            if (currentSec > segDep && currentSec < segArr) {
              const progress = (currentSec - segDep) / (segArr - segDep);
              const dStart = distMap[curStop.stationId] ?? 0;
              const dEnd = distMap[nextStop.stationId] ?? 0;
              const curD = Math.max(0, Math.min(lineMaxKm, dStart + (dEnd - dStart) * progress));
              const pt = turf.along(targetLine, curD, { units: 'kilometers' });
              const pPrev = turf.along(targetLine, Math.max(0, Math.min(lineMaxKm, curD - offsetStep)), { units: 'kilometers' });
              if (pt?.geometry?.coordinates) {
                trainItem.currentCoord = pt.geometry.coordinates;
                trainItem.prevCoord = pPrev ? pPrev.geometry.coordinates : pt.geometry.coordinates;
              }
              return;
            }
          }
        }
      });

      activeExpressCount.value = activeExp;
      activeCommuterCount.value = activeCom;
      updateTrainsRendering();
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return { updateTrainsRendering };
  };

  return {
    simSeconds,
    timeMultiplier,
    commuterCoords,
    expressCoords,
    activeExpressCount,
    activeCommuterCount,
    getNowSeconds,
    initTrainAnimation
  };
}