<template>
  <div class="metro-container">
    <!-- 戰情室 HUD 左側主控面板 -->
    <div class="hud-panel">
      <div class="hud-header">
        <div class="status-indicator"></div>
        <span class="hud-title">TAOYUAN METRO 即時數據中心</span>
      </div>
      <div class="hud-sub">桃園捷運即時運量監控</div>

      <div class="divider"></div>

      <!-- 全線即時運量動態監控卡片 -->
      <div class="flow-info-card">
        <div class="flow-card-header">
          <span class="flow-card-title">👥 全線即時運量</span>
          <span class="flow-badge">每5分鐘自動同步</span>
        </div>
        <div class="flow-stats-grid">
          <div class="flow-stat-box">
            <span class="flow-stat-label">今日累計進站</span>
            <span class="flow-stat-val val-in">
              {{ flowSummary?.totals?.sumTodayIn ? Number(flowSummary.totals.sumTodayIn).toLocaleString() : '--' }}
            </span>
            <span class="flow-stat-rate" v-if="flowSummary?.totals?.rateIn">
              較前期 {{ Number(flowSummary.totals.rateIn) >= 0 ? '+' : '' }}{{ flowSummary.totals.rateIn }}%
            </span>
          </div>
          <div class="flow-stat-box">
            <span class="flow-stat-label">今日累計出站</span>
            <span class="flow-stat-val val-out">
              {{ flowSummary?.totals?.sumTodayOut ? Number(flowSummary.totals.sumTodayOut).toLocaleString() : '--' }}
            </span>
            <span class="flow-stat-rate" v-if="flowSummary?.totals?.rateOut">
              較前期 {{ Number(flowSummary.totals.rateOut) >= 0 ? '+' : '' }}{{ flowSummary.totals.rateOut }}%
            </span>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 時間控制面板 -->
      <div class="time-control-box">
        <div class="sim-time-display">
          <span class="clock-label">當前監控時刻</span>
          <span class="clock-value">{{ formattedSimTime }}</span>
        </div>
        <div class="time-btn-row">
          <button class="time-btn" :class="{ active: timeMultiplier === 1 }" @click="setTimeSpeed(1)">1x 即時</button>
          <button class="time-btn" :class="{ active: timeMultiplier === 10 }" @click="setTimeSpeed(10)">10x 快進</button>
          <button class="time-btn" :class="{ active: timeMultiplier === 60 }" @click="setTimeSpeed(60)">60x 預演</button>
          <button class="time-btn sync-btn" @click="syncToRealTime">現在時間</button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 暫時隱藏：線上車輛班次統計
      <div class="stat-row">
        <span class="label">線上直達車 (紫)</span>
        <span class="value val-express">{{ activeExpressCount }} 列 (全日 {{ totalExpressTrips }} 班)</span>
      </div>
      <div class="stat-row">
        <span class="label">線上普通車 (藍)</span>
        <span class="value val-commuter">{{ activeCommuterCount }} 列 (全日 {{ totalCommuterTrips }} 班)</span>
      </div>
      <div class="divider"></div>
      -->

      <!-- ⭐ 站點運量檢視抽屜 / 排行榜 -->
      <div class="station-drawer-box">
        <!-- 抽屜標題列與切換返回鈕 -->
        <div class="drawer-header">
          <span class="drawer-title">
            <span v-if="!selectedStationId">🏆 即時站點熱區 Top 5</span>
            <span v-else>🔍 站點運量明細：{{ selectedStationName }}</span>
          </span>
          <button v-if="selectedStationId" class="drawer-reset-btn" @click="resetToOverview">
            返回全線
          </button>
        </div>

        <!-- 模式 1：Top 5 熱區排行模式 -->
        <div v-if="!selectedStationId" class="top-ranking-list">
          <div
            v-for="(st, idx) in top5Stations"
            :key="st.stationId"
            class="top-ranking-item"
            @click="selectStation(st.stationId)"
          >
            <span class="rank-badge" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</span>
            <span class="rank-name">{{ st.name }}</span>
            <div class="rank-counts">
              <span class="rank-live">{{ st.count }} 人</span>
              <span class="rank-sub-in">進 {{ formatCompactNumber(st.todayIn) }}</span>
              <span class="rank-sub-out">出 {{ formatCompactNumber(st.todayOut) }}</span>
            </div>
          </div>
        </div>

        <!-- 模式 2：單站深度同比明細卡片 -->
        <div v-else class="station-detail-card">
          <div class="date-comparison-tag">
            <span>營運日: {{ flowSummary.currentOperDateStr || '今日' }}</span>
            <span>比較日: {{ flowSummary.historyDateStr || '歷史比較日' }}</span>
          </div>

          <div class="detail-grid">
            <div class="detail-cell">
              <div class="cell-label">進站運量</div>
              <div class="cell-main val-in">{{ currentStationDetail.todayIn.toLocaleString() }}</div>
              <div class="cell-sub">
                比較日: {{ currentStationDetail.historyIn.toLocaleString() }}
                <span :class="currentStationDetail.diffIn >= 0 ? 'text-red' : 'text-green'">
                  ({{ currentStationDetail.diffIn >= 0 ? '+' : '' }}{{ currentStationDetail.rateIn }}%)
                </span>
              </div>
            </div>
            <div class="detail-cell">
              <div class="cell-label">出站運量</div>
              <div class="cell-main val-out">{{ currentStationDetail.todayOut.toLocaleString() }}</div>
              <div class="cell-sub">
                比較日: {{ currentStationDetail.historyOut.toLocaleString() }}
                <span :class="currentStationDetail.diffOut >= 0 ? 'text-red' : 'text-green'">
                  ({{ currentStationDetail.diffOut >= 0 ? '+' : '' }}{{ currentStationDetail.rateOut }}%)
                </span>
              </div>
            </div>
          </div>
          <div class="detail-live-bar">
            <span>當前站內即時人數：</span>
            <strong>{{ currentStationDetail.count }} 人</strong>
          </div>
        </div>
      </div>

      <!-- 暫時隱藏：路線圖例
      <div class="divider"></div>
      <div class="route-legend">
        <div class="legend-item">
          <span class="legend-line purple-line"></span>
          <span class="legend-text">直達車</span>
        </div>
        <div class="legend-item">
          <span class="legend-line blue-line"></span>
          <span class="legend-text">普通車</span>
        </div>
      </div>
      -->

      <div class="divider"></div>

      <div class="footer-stats">
        <span>SVG 同源絕對零脫軌</span>
        <span>車頭尖端切線修正 (100% 朝前)</span>
      </div>
    </div>

    <!-- 右上方：5分鐘更新倒數與全線即時運量狀態窗 -->
    <div class="top-right-countdown-hud">
      <div class="countdown-pulse-ring"></div>
      <div class="countdown-body">
        <div class="cd-title-row">
          <span class="cd-label">運量同步倒數</span>
          <span class="cd-timer">{{ formattedCountdown }}</span>
        </div>
        <div class="cd-progress-track">
          <div class="cd-progress-bar" :style="{ width: `${(countdownSec / 300) * 100}%` }"></div>
        </div>
        <div class="cd-meta-row">
          <span>今日總運量(出站)：<strong>{{ totalDailyPassengers }}</strong> 人次</span>
          <span class="cd-refresh-link" @click="triggerImmediateRefresh">立即更新</span>
        </div>
      </div>
    </div>

    <!-- 地圖容器 -->
    <div id="map"></div>

    <!-- 頂層 SVG 圖層 (層級最高，列車覆蓋在標籤與地圖之上) -->
    <svg id="svg-track-layer">
      <path id="svg-commuter-glow" class="track-glow-blue" />
      <path id="svg-commuter-core" class="track-core-blue" />

      <path id="svg-express-glow" class="track-glow-purple" />
      <path id="svg-express-core" class="track-core-purple" />

      <g id="svg-trains-group"></g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';

import { stations, calibratedCoords } from './trackData.js';
import { fullDayTimetable } from './timetable.js';
import { fetchPassengerFlow } from './services.js';

let mapInstance = null;

// 人流快取數據狀態
const flowSummary = ref({
  totals: { sumTodayIn: 0, sumTodayOut: 0, rateIn: '', rateOut: '' },
  stationRange: [],
  stationStats: {},
  currentOperDateStr: '',
  historyDateStr: ''
});

// 當前選中的車站 ID
const selectedStationId = ref(null);

const selectedStationName = computed(() => {
  if (!selectedStationId.value) return '';
  const s = stations.find(item => item.id === selectedStationId.value);
  return s ? s.name : selectedStationId.value;
});

// 今日總運量（出站人次）
const totalDailyPassengers = computed(() => {
  const t = flowSummary.value?.totals;
  if (!t || t.sumTodayOut === undefined || t.sumTodayOut === null) return '--';
  return Number(t.sumTodayOut).toLocaleString();
});

// 5 分鐘倒數計時狀態
const REFRESH_INTERVAL_SEC = 300;
const countdownSec = ref(REFRESH_INTERVAL_SEC);

const formattedCountdown = computed(() => {
  const m = String(Math.floor(countdownSec.value / 60)).padStart(2, '0');
  const s = String(countdownSec.value % 60).padStart(2, '0');
  return `${m}:${s}`;
});

// 格式化縮寫數字（萬/k）
const formatCompactNumber = (num) => {
  const n = Number(num) || 0;
  if (n >= 10000) return (n / 10000).toFixed(1) + '萬';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

// 計算即時人數 Top 5 車站
const top5Stations = computed(() => {
  if (!flowSummary.value?.stationRange) return [];
  const range = [...flowSummary.value.stationRange];
  return range
    .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
    .slice(0, 5)
    .map(item => {
      const matched = item.station?.match(/A[0-9a-zA-Z]+/);
      const stId = matched ? matched[0] : item.station;
      const stObj = stations.find(s => s.id === stId);
      const stats = flowSummary.value.stationStats?.[stId] || {};
      return {
        stationId: stId,
        name: stObj ? stObj.name : stId,
        count: Number(item.count) || 0,
        todayIn: Number(stats.todayIn) || 0,
        todayOut: Number(stats.todayOut) || 0
      };
    });
});

// 當前選中車站的進出明細與對比日計算
const currentStationDetail = computed(() => {
  const stId = selectedStationId.value;
  if (!stId) return null;

  const stats = flowSummary.value.stationStats?.[stId] || {};
  const todayIn = Number(stats.todayIn) || 0;
  const historyIn = Number(stats.historyIn) || 0;
  const todayOut = Number(stats.todayOut) || 0;
  const historyOut = Number(stats.historyOut) || 0;

  const diffIn = todayIn - historyIn;
  const diffOut = todayOut - historyOut;

  const rateIn = historyIn > 0 ? ((diffIn / historyIn) * 100).toFixed(1) : '0.0';
  const rateOut = historyOut > 0 ? ((diffOut / historyOut) * 100).toFixed(1) : '0.0';

  const rangeItem = flowSummary.value.stationRange?.find(r => {
    const m = r.station?.match(/A[0-9a-zA-Z]+/);
    return (m ? m[0] : r.station) === stId;
  });

  return {
    todayIn,
    historyIn,
    diffIn,
    rateIn,
    todayOut,
    historyOut,
    diffOut,
    rateOut,
    count: rangeItem ? Number(rangeItem.count) || 0 : 0
  };
});

// ⭐ 返回全線整體大小視角函式
const resetToOverview = () => {
  selectedStationId.value = null;
  // 清除地圖上所有鎖定的卡片標籤
  document.querySelectorAll('.station-flow-capsule.is-pinned').forEach(el => {
    el.classList.remove('is-pinned');
  });

  if (mapInstance) {
    mapInstance.easeTo({
      center: [121.320, 25.040],
      zoom: 12.2,
      duration: 800
    });
  }
};

// ⭐ 點擊車站切換並鎖定停留
const selectStation = (stationId) => {
  selectedStationId.value = stationId;

  // 1. 移除先前所有鎖定狀態
  document.querySelectorAll('.station-flow-capsule').forEach(el => {
    el.classList.remove('is-pinned');
  });

  // 2. 替目標車站加上鎖定常駐 class
  const elObj = stationElementsMap.get(stationId);
  if (elObj && elObj.bubbleEl) {
    elObj.bubbleEl.classList.add('is-pinned');
  }

  // 3. 地圖平滑特寫放大
  const targetStation = stations.find(s => s.id === stationId);
  if (targetStation && mapInstance) {
    mapInstance.easeTo({
      center: targetStation.coord,
      zoom: 14.0, // 特寫放大
      duration: 800
    });
  }
};

const stationElementsMap = new Map();

// 避障方位映射
const stationOffsets = {
  A1:   'top',
  A2:   'top-left',
  A3:   'bottom',
  A4:   'top',
  A5:   'left',
  A6:   'right',
  A7:   'right',
  A8:   'left',
  A9:   'top',
  A10:  'top',
  A11:  'top',
  A12:  'top-left',
  A13:  'right',
  A14a: 'left',
  A15:  'right',
  A16:  'right',
  A17:  'right',
  A18:  'right',
  A19:  'left',
  A20:  'right',
  A21:  'left',
  A22:  'bottom'
};

const updateStationMarkersData = () => {
  if (!flowSummary.value) return;

  const liveCountMap = {};
  if (Array.isArray(flowSummary.value.stationRange)) {
    flowSummary.value.stationRange.forEach(item => {
      const matched = item.station?.match(/A[0-9a-zA-Z]+/);
      const key = matched ? matched[0] : item.station;
      liveCountMap[key] = Number(item.count || 0);
    });
  }

  stations.forEach(s => {
    const elObj = stationElementsMap.get(s.id);
    if (!elObj) return;

    const count = liveCountMap[s.id] ?? 0;
    elObj.countEl.innerText = `${count}人`;

    // 填寫懸停微型卡片內容
    const stats = flowSummary.value.stationStats?.[s.id] || {};
    const todayIn = Number(stats.todayIn) || 0;
    const historyIn = Number(stats.historyIn) || 0;
    const todayOut = Number(stats.todayOut) || 0;
    const historyOut = Number(stats.historyOut) || 0;

    const rateIn = historyIn > 0 ? (((todayIn - historyIn) / historyIn) * 100).toFixed(1) : '0';
    const rateOut = historyOut > 0 ? (((todayOut - historyOut) / historyOut) * 100).toFixed(1) : '0';

    elObj.tooltipIn.innerHTML = `進: <strong>${todayIn.toLocaleString()}</strong> <small>(同期 ${historyIn.toLocaleString()} <span class="${Number(rateIn)>=0? 'text-red' : 'text-green'}">${Number(rateIn)>=0?'+':''}${rateIn}%</span>)</small>`;
    elObj.tooltipOut.innerHTML = `出: <strong>${todayOut.toLocaleString()}</strong> <small>(同期 ${historyOut.toLocaleString()} <span class="${Number(rateOut)>=0? 'text-red' : 'text-green'}">${Number(rateOut)>=0?'+':''}${rateOut}%</span>)</small>`;

    if (count >= 150) {
      elObj.bubbleEl.classList.add('high-density');
    } else {
      elObj.bubbleEl.classList.remove('high-density');
    }
  });
};

const refreshFlowData = async () => {
  try {
    const data = await fetchPassengerFlow();
    if (data) {
      flowSummary.value = data;
      updateStationMarkersData();
    }
  } catch (e) {
    console.warn("載入人流失敗：", e);
  }
};

const triggerImmediateRefresh = async () => {
  countdownSec.value = REFRESH_INTERVAL_SEC;
  await refreshFlowData();
};

let commuterLine = null;
let expressLine = null;
let commuterCoords = [];
let expressCoords = [];
let commuterTotalKm = 0;
let expressTotalKm = 0;

const stationDistanceMap = {
  commuter: {},
  express: {}
};

const buildSmoothDualTracks = () => {
  const line = turf.lineString(calibratedCoords);
  const simplified = turf.simplify(line, { tolerance: 0.00008, highQuality: true });

  const len = turf.length(simplified, { units: 'kilometers' });
  const stepKm = 0.06;
  const steps = Math.ceil(len / stepKm);
  const samplePts = [];
  for (let i = 0; i <= steps; i++) {
    const d = (i / steps) * len;
    samplePts.push(turf.along(simplified, d, { units: 'kilometers' }).geometry.coordinates);
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
    const snapCom = turf.nearestPointOnLine(commuterLine, pt);
    stationDistanceMap.commuter[s.id] = snapCom.properties.location;

    if (s.express) {
      const snapExp = turf.nearestPointOnLine(expressLine, pt);
      stationDistanceMap.express[s.id] = snapExp.properties.location;
    }
  });
};

buildSmoothDualTracks();

function timeStrToSeconds(str) {
  const [h, m, s] = str.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

const totalExpressTrips = fullDayTimetable.filter(t => t.type === 'express').length;
const totalCommuterTrips = fullDayTimetable.filter(t => t.type === 'commuter').length;

const getNowSeconds = () => {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
};

const simSeconds = ref(getNowSeconds());
const timeMultiplier = ref(1);

const formattedSimTime = computed(() => {
  const total = Math.floor(simSeconds.value);
  const h = String(Math.floor(total / 3600) % 24).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
});

const setTimeSpeed = (speed) => {
  timeMultiplier.value = speed;
};

const syncToRealTime = () => {
  simSeconds.value = getNowSeconds();
  timeMultiplier.value = 1;
};

const activeExpressCount = ref(0);
const activeCommuterCount = ref(0);

onMounted(() => {
  refreshFlowData();

  setInterval(() => {
    if (countdownSec.value <= 1) {
      countdownSec.value = REFRESH_INTERVAL_SEC;
      refreshFlowData();
    } else {
      countdownSec.value -= 1;
    }
  }, 1000);

  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        'nlsc-emap': {
          type: 'raster',
          tiles: [
            'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '&copy; 內政部國土測繪中心'
        }
      },
      layers: [
        {
          id: 'nlsc-layer',
          type: 'raster',
          source: 'nlsc-emap',
          minzoom: 8,
          maxzoom: 19
        }
      ]
    },
    center: [121.320, 25.040],
    zoom: 12.2,
    minZoom: 10,
    maxZoom: 17.5,
    maxBounds: [
      [120.95, 24.80],
      [121.75, 25.25]
    ],
    dragPan: true,
    scrollZoom: true,
    boxZoom: false,
    dragRotate: false,
    pitchWithRotate: false
  });

  mapInstance = map;

  map.scrollZoom.setWheelZoomRate(1 / 450);
  map.scrollZoom.setZoomRate(1 / 450);

  const commuterGlow = document.getElementById('svg-commuter-glow');
  const commuterCore = document.getElementById('svg-commuter-core');
  const expressGlow = document.getElementById('svg-express-glow');
  const expressCore = document.getElementById('svg-express-core');
  const svgTrainsGroup = document.getElementById('svg-trains-group');

  const coordsToSmoothSvgPath = (coords) => {
    if (!coords || coords.length < 2) return '';
    const pts = coords.map(c => map.project(c));

    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}, ${xc.toFixed(2)} ${yc.toFixed(2)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
    return d;
  };

  const updateSvgTracks = () => {
    const commuterD = coordsToSmoothSvgPath(commuterCoords);
    const expressD = coordsToSmoothSvgPath(expressCoords);

    if (commuterGlow) commuterGlow.setAttribute('d', commuterD);
    if (commuterCore) commuterCore.setAttribute('d', commuterD);
    if (expressGlow) expressGlow.setAttribute('d', expressD);
    if (expressCore) expressCore.setAttribute('d', expressD);

    updateTrainsRendering();
  };

  map.on('move', updateSvgTracks);
  map.on('zoom', updateSvgTracks);
  map.on('load', updateSvgTracks);

  // ⭐ 車站避障標籤與懸停/點擊鎖定對比微型卡片
  stations.forEach((s) => {
    const markerEl = document.createElement('div');
    const pos = stationOffsets[s.id] || 'top';
    markerEl.className = `station-marker-container pos-${pos}`;

    const dot = document.createElement('div');
    dot.className = s.express ? 'station-dot dot-express' : 'station-dot dot-commuter';
    markerEl.appendChild(dot);

    const line = document.createElement('div');
    line.className = 'leader-line';
    markerEl.appendChild(line);

    // 水平膠囊本體
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'station-flow-capsule';

    const label = document.createElement('span');
    label.className = 'st-name';
    label.innerText = s.name;
    bubbleEl.appendChild(label);

    const countEl = document.createElement('span');
    countEl.className = 'st-live-count';
    countEl.innerText = '--人';
    bubbleEl.appendChild(countEl);

    // 方案 A：懸停與點擊鎖定微型卡片容器（Hover & Pinned Card）
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'station-hover-card';
    tooltipEl.innerHTML = `
      <div class="th-header-bar">
        <span class="th-title">${s.name}</span>
        <button class="th-close-btn" title="關閉面板">✕</button>
      </div>
      <div class="th-row th-in">進: --</div>
      <div class="th-row th-out">出: --</div>
      <div class="th-action-row">
        <button class="th-overview-btn">⛶ 返回全線視角</button>
      </div>
    `;
    bubbleEl.appendChild(tooltipEl);

    const tooltipIn = tooltipEl.querySelector('.th-in');
    const tooltipOut = tooltipEl.querySelector('.th-out');
    const closeBtn = tooltipEl.querySelector('.th-close-btn');
    const overviewBtn = tooltipEl.querySelector('.th-overview-btn');

    // 關閉按鈕點擊：解除當前鎖定
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bubbleEl.classList.remove('is-pinned');
    });

    // 返回全線視角按鈕點擊：鏡頭拉遠並解除停留
    overviewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetToOverview();
    });

    // 點擊膠囊：平移放大至車站並鎖定停留
    bubbleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      selectStation(s.id);
    });

    markerEl.appendChild(bubbleEl);

    stationElementsMap.set(s.id, {
      bubbleEl,
      countEl,
      tooltipIn,
      tooltipOut
    });

    new maplibregl.Marker({
      element: markerEl,
      anchor: 'center'
    })
      .setLngLat(s.coord)
      .addTo(map);
  });

  const svgTrainElements = new Map();

  const getOrCreateSvgTrain = (trainId, train) => {
    if (svgTrainElements.has(trainId)) {
      return svgTrainElements.get(trainId);
    }

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

  function updateTrainsRendering() {
    svgTrainElements.forEach(item => {
      if (item.currentCoord && item.prevCoord) {
        const p = map.project(item.currentCoord);
        const pPrev = map.project(item.prevCoord);

        const dx = p.x - pPrev.x;
        const dy = p.y - pPrev.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

        item.g.setAttribute('transform', `translate(${p.x.toFixed(2)}, ${p.y.toFixed(2)}) rotate(${angle.toFixed(1)})`);
      }
    });
  }

  let lastTimestamp = performance.now();

  function updateTrainsByTimetable() {
    const nowTimestamp = performance.now();
    const dt = (nowTimestamp - lastTimestamp) / 1000;
    lastTimestamp = nowTimestamp;

    simSeconds.value = (simSeconds.value + dt * timeMultiplier.value) % 86400;
    const currentSec = simSeconds.value;

    let activeExpress = 0;
    let activeCommuter = 0;

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

      if (train.type === 'express') activeExpress++;
      else activeCommuter++;

      const trainItem = getOrCreateSvgTrain(trainId, train);

      const firstRawDist = distMap[firstStop.stationId] ?? 0;
      const firstDist = Math.max(0, Math.min(lineMaxKm, firstRawDist));
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
          const rawDist = distMap[curStop.stationId] ?? 0;
          const stopDist = Math.max(0, Math.min(lineMaxKm, rawDist));
          const pt = turf.along(targetLine, stopDist, { units: 'kilometers' });
          const ptPrev = turf.along(targetLine, Math.max(0, Math.min(lineMaxKm, stopDist - offsetStep)), { units: 'kilometers' });

          if (pt && pt.geometry && Array.isArray(pt.geometry.coordinates)) {
            trainItem.currentCoord = pt.geometry.coordinates;
            trainItem.prevCoord = ptPrev ? ptPrev.geometry.coordinates : pt.geometry.coordinates;
          }
          return;
        }

        if (i < stops.length - 1) {
          const nextStop = stops[i + 1];
          const segDepSec = timeStrToSeconds(curStop.dep);
          const segArrSec = timeStrToSeconds(nextStop.arr);

          if (currentSec > segDepSec && currentSec < segArrSec) {
            const progress = (currentSec - segDepSec) / (segArrSec - segDepSec);
            const distStart = distMap[curStop.stationId] ?? 0;
            const distEnd = distMap[nextStop.stationId] ?? 0;

            const rawCurDist = distStart + (distEnd - distStart) * progress;
            const safeCurDist = Math.max(0, Math.min(lineMaxKm, rawCurDist));

            const pt = turf.along(targetLine, safeCurDist, { units: 'kilometers' });
            const ptPrev = turf.along(targetLine, Math.max(0, Math.min(lineMaxKm, safeCurDist - offsetStep)), { units: 'kilometers' });

            if (pt && pt.geometry && Array.isArray(pt.geometry.coordinates)) {
              trainItem.currentCoord = pt.geometry.coordinates;
              trainItem.prevCoord = ptPrev ? ptPrev.geometry.coordinates : pt.geometry.coordinates;
            }
            return;
          }
        }
      }
    });

    activeExpressCount.value = activeExpress;
    activeCommuterCount.value = activeCommuter;

    updateTrainsRendering();
    requestAnimationFrame(updateTrainsByTimetable);
  }

  requestAnimationFrame(updateTrainsByTimetable);
});
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.metro-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}

#map {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

#map .maplibregl-canvas-container canvas {
  filter: grayscale(100%) brightness(108%) contrast(80%) opacity(0.85);
}

/* SVG 軌道與列車圖層 */
#svg-track-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none !important;
  z-index: 10;
  shape-rendering: geometricPrecision;
}

#svg-track-layer path {
  pointer-events: none !important;
}

.track-glow-blue {
  fill: none;
  stroke: #0284c7;
  stroke-width: 8px;
  stroke-opacity: 0.35;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.track-core-blue {
  fill: none;
  stroke: #0284c7;
  stroke-width: 3.5px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.track-glow-purple {
  fill: none;
  stroke: #9333ea;
  stroke-width: 8px;
  stroke-opacity: 0.35;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.track-core-purple {
  fill: none;
  stroke: #9333ea;
  stroke-width: 3.5px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 車站標籤容器與引線 */
.station-marker-container {
  position: absolute;
  pointer-events: none !important;
  z-index: 5;
}

.station-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
  z-index: 6;
}

.dot-commuter {
  border: 2px solid #0284c7;
}

.dot-express {
  border: 2px solid #9333ea;
  width: 10px;
  height: 10px;
}

.leader-line {
  position: absolute;
  background: rgba(148, 163, 184, 0.65) !important;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

/* 膠囊本體（可點擊與懸停） */
.station-flow-capsule {
  position: absolute;
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(8px);
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  border-radius: 20px;
  padding: 3px 9px;
  display: flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  user-select: none;
  white-space: nowrap;
  pointer-events: auto !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.station-flow-capsule:hover {
  border-color: #38bdf8;
  transform: scale(1.08) !important;
  z-index: 80;
}

.st-name {
  font-size: 12px;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.8px;
}

.st-live-count {
  font-size: 11px;
  font-weight: 800;
  color: #38bdf8;
  font-family: monospace;
  letter-spacing: 0.5px;
}

.station-flow-capsule.high-density {
  border-color: rgba(244, 63, 94, 0.6) !important;
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.4);
}
.station-flow-capsule.high-density .st-live-count {
  color: #fb7185 !important;
}

/* ⭐ 方案 A：微型對比卡片 (加大、清晰、支援 hover 與 click is-pinned 鎖定) */
.station-hover-card {
  position: absolute;
  min-width: 220px;
  background: rgba(15, 23, 42, 0.96);
  border: 1.5px solid rgba(56, 189, 248, 0.5);
  backdrop-filter: blur(14px);
  border-radius: 10px;
  padding: 10px 14px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
  z-index: 100;
}

/* 核心：懸停 (:hover) 或 點擊鎖定 (.is-pinned) 時強制常駐並允許點擊按鈕 */
.station-flow-capsule:hover .station-hover-card,
.station-flow-capsule.is-pinned .station-hover-card {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
}

/* 鎖定時膠囊外框持續發光提示 */
.station-flow-capsule.is-pinned {
  border-color: #38bdf8 !important;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.8) !important;
  z-index: 999 !important;
}

/* 頂部標題列與關閉按鈕 */
.th-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  padding-bottom: 5px;
  margin-bottom: 6px;
}

.th-title {
  font-size: 15px;
  font-weight: 800;
  color: #38bdf8;
  margin: 0;
  padding: 0;
}

.th-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.th-close-btn:hover {
  color: #f43f5e;
}

.th-row {
  font-size: 13px;
  color: #cbd5e1;
  font-family: monospace;
  line-height: 1.6;
}
.th-row strong {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
}
.th-row small {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 6px;
}

/* 底部操作按鈕列 */
.th-action-row {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
}

.th-overview-btn {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.th-overview-btn:hover {
  background: #38bdf8;
  color: #0f172a;
}

/* ⭐ 五向反推避障：同時支援 :hover 與 .is-pinned，絕不蓋到軌道 */
.pos-top .station-hover-card {
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
}
.pos-top .station-flow-capsule:hover .station-hover-card,
.pos-top .station-flow-capsule.is-pinned .station-hover-card {
  transform: translateX(-50%) translateY(-4px) !important;
}

.pos-bottom .station-hover-card {
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
}
.pos-bottom .station-flow-capsule:hover .station-hover-card,
.pos-bottom .station-flow-capsule.is-pinned .station-hover-card {
  transform: translateX(-50%) translateY(4px) !important;
}

.pos-left .station-hover-card {
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
}
.pos-left .station-flow-capsule:hover .station-hover-card,
.pos-left .station-flow-capsule.is-pinned .station-hover-card {
  transform: translateY(-50%) translateX(-4px) !important;
}

.pos-right .station-hover-card {
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
}
.pos-right .station-flow-capsule:hover .station-hover-card,
.pos-right .station-flow-capsule.is-pinned .station-hover-card {
  transform: translateY(-50%) translateX(4px) !important;
}

.pos-top-left .station-hover-card {
  right: calc(100% + 12px);
  top: 50%;
  left: auto;
  bottom: auto;
  transform: translateY(-50%);
}
.pos-top-left .station-flow-capsule:hover .station-hover-card,
.pos-top-left .station-flow-capsule.is-pinned .station-hover-card {
  transform: translateY(-50%) translateX(-4px) !important;
}

/* 避障引線與膠囊位置映射 */
.pos-top .leader-line {
  left: 50%;
  bottom: 0;
  width: 1px;
  height: 38px;
  transform: translateX(-50%);
}
.pos-top .station-flow-capsule {
  left: 50%;
  bottom: 38px;
  transform: translateX(-50%);
}

.pos-bottom .leader-line {
  left: 50%;
  top: 0;
  width: 1px;
  height: 38px;
  transform: translateX(-50%);
}
.pos-bottom .station-flow-capsule {
  left: 50%;
  top: 38px;
  transform: translateX(-50%);
}

.pos-left .leader-line {
  top: 50%;
  right: 0;
  height: 1px;
  width: 45px;
  transform: translateY(-50%);
}
.pos-left .station-flow-capsule {
  right: 45px;
  top: 50%;
  transform: translateY(-50%);
}

.pos-right .leader-line {
  top: 50%;
  left: 0;
  height: 1px;
  width: 48px;
  transform: translateY(-50%);
}
.pos-right .station-flow-capsule {
  left: 48px;
  top: 50%;
  transform: translateY(-50%);
}

.pos-top-left .leader-line {
  left: 50%;
  top: 50%;
  width: 1px;
  height: 48px;
  transform-origin: top center;
  transform: rotate(45deg);
}
.pos-top-left .station-flow-capsule {
  right: 28px;
  bottom: 28px;
  transform: translate(0, 0);
}

/* 列車圖層樣式 */
.svg-train { pointer-events: none; }
.train-exp .train-halo {
  fill: #c084fc; fill-opacity: 0.5; filter: drop-shadow(0 0 6px #9333ea);
}
.train-exp .train-core { fill: #9333ea; stroke: #ffffff; stroke-width: 1.5px; }
.train-exp .train-arrow { fill: #9333ea; stroke: #ffffff; stroke-width: 1px; }

.train-com .train-halo {
  fill: #38bdf8; fill-opacity: 0.5; filter: drop-shadow(0 0 6px #0284c7);
}
.train-com .train-core { fill: #0284c7; stroke: #ffffff; stroke-width: 1.5px; }
.train-com .train-arrow { fill: #0284c7; stroke: #ffffff; stroke-width: 1px; }

.train-text {
  font-size: 11px;
  font-weight: 800;
  fill: #0f172a;
  text-anchor: middle;
  stroke: #ffffff;
  stroke-width: 2.5px;
  paint-order: stroke fill;
}

.waiting .train-halo {
  animation: svg-pulse 1.2s infinite alternate ease-in-out;
}
@keyframes svg-pulse {
  0% { r: 6px; fill-opacity: 0.3; }
  100% { r: 15px; fill-opacity: 0.8; }
}

/* 左側主控 HUD 面板（寬度擴大至 360px，充裕大器） */
.hud-panel {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 20;
  width: 360px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  color: #e2e8f0;
  pointer-events: auto;
}

.hud-panel::-webkit-scrollbar {
  width: 4px;
}
.hud-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.hud-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}
.hud-title {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #f8fafc;
}
.hud-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 12px 0;
}

.flow-info-card {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 8px;
  padding: 10px;
}
.flow-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.flow-card-title {
  font-weight: 700;
  color: #34d399;
  font-size: 13px;
}
.flow-badge {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.flow-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.flow-stat-box {
  background: rgba(0, 0, 0, 0.25);
  padding: 6px 8px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
}
.flow-stat-label {
  font-size: 11px;
  color: #94a3b8;
}
.flow-stat-val {
  font-size: 16px;
  font-weight: 800;
  font-family: monospace;
  margin-top: 2px;
}
.flow-stat-rate {
  font-size: 10px;
  color: #38bdf8;
  margin-top: 2px;
}
.val-in { color: #fbbf24; }
.val-out { color: #c084fc; }

/* ⭐ 站點運量檢視抽屜 / 排行榜樣式（整體加大、單行不換行） */
.station-drawer-box {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.drawer-title {
  font-size: 13px;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: 0.5px;
}

.drawer-reset-btn {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.drawer-reset-btn:hover {
  background: rgba(56, 189, 248, 0.3);
}

.top-ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.top-ranking-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  gap: 8px;
  transition: all 0.2s ease;
}
.top-ranking-item:hover {
  background: rgba(56, 189, 248, 0.15);
  transform: translateX(2px);
}

.rank-badge {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  background: #334155;
  color: #cbd5e1;
  flex-shrink: 0;
}
.rank-1 { background: #eab308; color: #0f172a; box-shadow: 0 0 6px rgba(234, 179, 8, 0.4); }
.rank-2 { background: #94a3b8; color: #0f172a; }
.rank-3 { background: #b45309; color: #ffffff; }

.rank-name {
  font-size: 13px;
  font-weight: 800;
  color: #f8fafc;
  flex: 1;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-counts {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-family: monospace;
  white-space: nowrap;
  flex-shrink: 0;
}

.rank-live {
  color: #38bdf8;
  font-weight: 800;
  font-size: 12px;
}

.rank-sub-in { 
  color: #fbbf24; 
  font-weight: 600;
}

.rank-sub-out { 
  color: #c084fc; 
  font-weight: 600;
}

/* 單站深度同比明細卡片 */
.station-detail-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.date-comparison-tag {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.35);
  padding: 5px 8px;
  border-radius: 6px;
  font-family: monospace;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.detail-cell {
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.cell-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}
.cell-main {
  font-size: 18px;
  font-weight: 800;
  font-family: monospace;
  margin-top: 4px;
  letter-spacing: 0.5px;
}
.cell-sub {
  font-size: 10px;
  color: #cbd5e1;
  margin-top: 4px;
  font-family: monospace;
  white-space: nowrap;
}
.detail-live-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px dashed rgba(56, 189, 248, 0.35);
  padding: 6px 10px;
  border-radius: 6px;
  color: #e2e8f0;
}
.detail-live-bar strong {
  color: #38bdf8;
  font-size: 15px;
  font-family: monospace;
}

.text-red { color: #f87171; font-weight: 700; }   /* 正值 / 上漲 */
.text-green { color: #34d399; font-weight: 700; } /* 負值 / 下跌 */

.time-control-box {
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.sim-time-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.clock-label {
  font-size: 11px;
  color: #94a3b8;
}
.clock-value {
  font-size: 16px;
  font-weight: 800;
  color: #38bdf8;
  font-family: monospace;
  letter-spacing: 1px;
}
.time-btn-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.time-btn {
  background: #1e293b;
  border: 1px solid #475569;
  color: #cbd5e1;
  padding: 4px 0;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}
.time-btn.active {
  background: #38bdf8;
  color: #0f172a;
  border-color: #38bdf8;
}
.sync-btn {
  background: #334155;
}

.footer-stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
  margin-top: 6px;
}

/* 右上方 5 分鐘倒數計時 HUD */
.top-right-countdown-hud {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  color: #f1f5f9;
  pointer-events: auto;
}

.countdown-pulse-ring {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 10px #38bdf8;
  animation: ring-pulse 1.8s infinite;
}

@keyframes ring-pulse {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.countdown-body {
  display: flex;
  flex-direction: column;
  width: 240px;
  gap: 4px;
}

.cd-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cd-label {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 600;
}

.cd-timer {
  font-family: monospace;
  font-size: 13px;
  font-weight: 800;
  color: #38bdf8;
  letter-spacing: 0.8px;
}

.cd-progress-track {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.cd-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #0284c7, #38bdf8);
  transition: width 1s linear;
}

.cd-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: #cbd5e1;
  margin-top: 2px;
}

.cd-meta-row strong {
  color: #34d399;
}

.cd-refresh-link {
  color: #38bdf8;
  cursor: pointer;
  text-decoration: underline;
}

.cd-refresh-link:hover {
  color: #7dd3fc;
}
</style>