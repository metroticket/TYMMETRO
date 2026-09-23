<template>
  <div class="metro-container">
    <!-- 1. 底圖與 SVG 軌道/列車圖層 -->
    <div id="map"></div>
    <svg id="svg-track-layer">
      <path id="svg-commuter-glow" class="track-glow-blue" />
      <path id="svg-commuter-core" class="track-core-blue" />
      <path id="svg-express-glow" class="track-glow-purple" />
      <path id="svg-express-core" class="track-core-purple" />
      <g id="svg-trains-group"></g>
    </svg>

    <!-- 2. 右上角倒數同步卡片 (串接狀態燈號：黃燈/藍燈/紅燈) -->
    <CountdownHud 
      :countdown-sec="countdownSec"
      :total-passengers="flowSummary?.totals?.sumTodayOut"
      :sync-status="syncStatus"
      @refresh="triggerImmediateRefresh"
    />

    <!-- 3. 左側戰情室 HUD 面板 / 手機底部抽屜 -->
    <HudPanel 
      v-model:is-collapsed="isPanelCollapsed"
      :flow-summary="flowSummary"
      :selected-station-id="selectedStationId"
      :selected-station-name="selectedStationName"
      :current-station-detail="currentStationDetail"
      :formatted-sim-time="formattedSimTime"
      :time-multiplier="timeMultiplier"
      :countdown-sec="countdownSec"
      :sync-status="syncStatus"
      @set-speed="setTimeSpeed"
      @sync-real-time="syncToRealTime"
      @reset-overview="resetToOverview"
      @select-station="selectStation"
      @trigger-refresh="triggerImmediateRefresh"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// 引入拆分後的組件與 Composable
import CountdownHud from './components/CountdownHud.vue';
import HudPanel from './components/HudPanel.vue';
import { useTrainSimulator } from './composables/useTrainSimulator.js';

import { stations } from './trackData.js';
import { fetchPassengerFlow } from './services.js';

// 列車動態模擬系統
const {
  simSeconds,
  timeMultiplier,
  commuterCoords,
  expressCoords,
  getNowSeconds,
  initTrainAnimation
} = useTrainSimulator();

let mapInstance = null;
const stationElementsMap = new Map();

// 抽屜開關狀態：手機版預設收起
const isPanelCollapsed = ref(window.innerWidth <= 1024);

// 連線同步狀態：'syncing' (黃燈) | 'success' (藍燈) | 'error' (紅燈)
const syncStatus = ref('syncing');

// 客流資料狀態
const flowSummary = ref({
  totals: { sumTodayIn: 0, sumTodayOut: 0, rateIn: '', rateOut: '' },
  stationRange: [],
  stationStats: {},
  currentOperDateStr: '',
  historyDateStr: ''
});

// 當前選取的車站
const selectedStationId = ref(null);
const selectedStationName = computed(() => {
  if (!selectedStationId.value) return '';
  const s = stations.find(item => item.id === selectedStationId.value);
  return s ? s.name : selectedStationId.value;
});

// Top 5 榜單計算
const top5Stations = computed(() => {
  if (!flowSummary.value?.stationRange) return [];
  return [...flowSummary.value.stationRange]
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

// 單站深度數據計算
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
  const rangeItem = flowSummary.value.stationRange?.find(
    r => (r.station?.match(/A[0-9a-zA-Z]+/)?.[0] || r.station) === stId
  );

  return {
    todayIn,
    historyIn,
    diffIn,
    rateIn: historyIn > 0 ? ((diffIn / historyIn) * 100).toFixed(1) : '0.0',
    todayOut,
    historyOut,
    diffOut,
    rateOut: historyOut > 0 ? ((diffOut / historyOut) * 100).toFixed(1) : '0.0',
    count: rangeItem ? Number(rangeItem.count) || 0 : 0
  };
});

// 5 分鐘同步倒數計時狀態
const REFRESH_INTERVAL_SEC = 300;
const countdownSec = ref(REFRESH_INTERVAL_SEC);

const formattedSimTime = computed(() => {
  const total = Math.floor(simSeconds.value);
  const h = String(Math.floor(total / 3600) % 24).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
});

const setTimeSpeed = (speed) => { timeMultiplier.value = speed; };
const syncToRealTime = () => {
  simSeconds.value = getNowSeconds();
  timeMultiplier.value = 1;
};

// 車站切換與平滑特寫
const selectStation = (stationId) => {
  selectedStationId.value = stationId;
  const isMobile = window.innerWidth <= 1024;

  document.querySelectorAll('.station-flow-capsule').forEach(el => el.classList.remove('is-pinned'));
  
  if (!isMobile) {
    const elObj = stationElementsMap.get(stationId);
    if (elObj && elObj.bubbleEl) {
      elObj.bubbleEl.classList.remove('is-dismissed');
      elObj.bubbleEl.classList.add('is-pinned');
    }
  }

  const targetStation = stations.find(s => s.id === stationId);
  if (targetStation && mapInstance) {
    mapInstance.easeTo({ center: targetStation.coord, zoom: 14.0, duration: 800 });
  }

  if (isMobile) {
    isPanelCollapsed.value = false;
  }
};

// 返回全線視角
const resetToOverview = () => {
  selectedStationId.value = null;
  document.querySelectorAll('.station-flow-capsule.is-pinned').forEach(el => el.classList.remove('is-pinned'));
  if (mapInstance) {
    mapInstance.easeTo({ center: [121.320, 25.040], zoom: 12.2, duration: 800 });
  }
};

// 更新車站微型卡片內容
const updateStationMarkersData = () => {
  if (!flowSummary.value) return;
  const liveCountMap = {};
  flowSummary.value.stationRange?.forEach(item => {
    const key = item.station?.match(/A[0-9a-zA-Z]+/)?.[0] || item.station;
    liveCountMap[key] = Number(item.count || 0);
  });

  stations.forEach(s => {
    const elObj = stationElementsMap.get(s.id);
    if (!elObj) return;
    const count = liveCountMap[s.id] ?? 0;
    elObj.countEl.innerText = `${count}人`;

    const stats = flowSummary.value.stationStats?.[s.id] || {};
    const todayIn = Number(stats.todayIn) || 0;
    const historyIn = Number(stats.historyIn) || 0;
    const todayOut = Number(stats.todayOut) || 0;
    const historyOut = Number(stats.historyOut) || 0;

    const rateIn = historyIn > 0 ? (((todayIn - historyIn) / historyIn) * 100).toFixed(1) : '0';
    const rateOut = historyOut > 0 ? (((todayOut - historyOut) / historyOut) * 100).toFixed(1) : '0';

    if (elObj.tooltipIn) {
      elObj.tooltipIn.innerHTML = `進: <strong>${todayIn.toLocaleString()}</strong> <small>(同期 ${historyIn.toLocaleString()} <span class="${Number(rateIn)>=0? 'text-red' : 'text-green'}">${Number(rateIn)>=0?'+':''}${rateIn}%</span>)</small>`;
    }
    if (elObj.tooltipOut) {
      elObj.tooltipOut.innerHTML = `出: <strong>${todayOut.toLocaleString()}</strong> <small>(同期 ${historyOut.toLocaleString()} <span class="${Number(rateOut)>=0? 'text-red' : 'text-green'}">${Number(rateOut)>=0?'+':''}${rateOut}%</span>)</small>`;
    }

    if (count >= 300) elObj.bubbleEl.classList.add('high-density');
    else elObj.bubbleEl.classList.remove('high-density');
  });
};

// 抓取客流資料：抓取中黃燈、抓完藍燈開始倒數、失敗紅燈
const refreshFlowData = async () => {
  syncStatus.value = 'syncing'; // 進入黃燈，暫停倒數

  try {
    const data = await fetchPassengerFlow((fastCache) => {
      flowSummary.value = fastCache;
      updateStationMarkersData();
    });

    if (data && (data.totals || data.stationStats)) {
      flowSummary.value = data;
      updateStationMarkersData();

      // ⭐ 成功收到 GAS 回傳：重設為 300 秒，亮藍燈，開始倒數計時！
      countdownSec.value = REFRESH_INTERVAL_SEC;
      syncStatus.value = 'success';
    } else {
      syncStatus.value = 'error'; // 回傳格式不符亮紅燈
    }
  } catch (err) {
    console.error("同步客流失敗:", err);
    syncStatus.value = 'error'; // 網路異常亮紅燈
  }
};

const triggerImmediateRefresh = async () => {
  await refreshFlowData();
};

// 避障方位對應表
const stationOffsets = {
  A1:'top', A2:'top-left', A3:'bottom', A4:'top', A5:'left', A6:'right', A7:'right',
  A8:'left', A9:'top', A10:'top', A11:'top', A12:'top-left', A13:'right', A14a:'left',
  A15:'right', A16:'right', A17:'right', A18:'right', A19:'left', A20:'right', A21:'left', A22:'bottom'
};

onMounted(() => {
  // 頁面初次載入資料
  refreshFlowData();

  // 每秒倒數計時：只有在成功完成 (success) 狀態才倒數，同步中 (syncing) 保持暫停
  setInterval(() => {
    if (syncStatus.value === 'success') {
      if (countdownSec.value <= 1) {
        refreshFlowData(); // 時間到，觸發下一次同步（自動變為黃燈並重抓）
      } else {
        countdownSec.value -= 1;
      }
    }
  }, 1000);

  // 初始化 MapLibre 地圖
  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        'nlsc-emap': {
          type: 'raster',
          tiles: ['https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '&copy; 內政部國土測繪中心'
        }
      },
      layers: [{ id: 'nlsc-layer', type: 'raster', source: 'nlsc-emap', minzoom: 8, maxzoom: 19 }]
    },
    center: [121.320, 25.040],
    zoom: 12.2,
    minZoom: 10,
    maxZoom: 17.5,
    maxBounds: [[120.95, 24.80], [121.75, 25.25]],
    dragPan: true,
    scrollZoom: true,
    boxZoom: false,
    dragRotate: false,
    pitchWithRotate: false
  });

  mapInstance = map;

  // 點擊地圖任意空白處，自動收起車站鎖定卡片
  map.on('click', (e) => {
    if (e.originalEvent.target.closest('.station-flow-capsule')) return;
    document.querySelectorAll('.station-flow-capsule.is-pinned').forEach(el => el.classList.remove('is-pinned'));
    selectedStationId.value = null;
  });

  // 列車動態圖層初始化
  const svgTrainsGroup = document.getElementById('svg-trains-group');
  const { updateTrainsRendering } = initTrainAnimation(map, svgTrainsGroup);

  const coordsToSmoothSvgPath = (coords) => {
    if (!coords || coords.length < 2) return '';
    const pts = coords.map(c => map.project(c));
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}, ${xc.toFixed(2)} ${yc.toFixed(2)}`;
    }
    return d + ` L ${pts[pts.length - 1].x.toFixed(2)} ${pts[pts.length - 1].y.toFixed(2)}`;
  };

  const updateSvgTracks = () => {
    document.getElementById('svg-commuter-glow')?.setAttribute('d', coordsToSmoothSvgPath(commuterCoords));
    document.getElementById('svg-commuter-core')?.setAttribute('d', coordsToSmoothSvgPath(commuterCoords));
    document.getElementById('svg-express-glow')?.setAttribute('d', coordsToSmoothSvgPath(expressCoords));
    document.getElementById('svg-express-core')?.setAttribute('d', coordsToSmoothSvgPath(expressCoords));
    updateTrainsRendering();
  };

  map.on('move', updateSvgTracks);
  map.on('zoom', updateSvgTracks);
  map.on('load', updateSvgTracks);

  // 完整建立各站 Marker 與微型卡片
  stations.forEach(s => {
    const markerEl = document.createElement('div');
    markerEl.className = `station-marker-container pos-${stationOffsets[s.id] || 'top'}`;

    const dot = document.createElement('div');
    dot.className = s.express ? 'station-dot dot-express' : 'station-dot dot-commuter';
    markerEl.appendChild(dot);

    const line = document.createElement('div');
    line.className = 'leader-line';
    markerEl.appendChild(line);

    // 膠囊本體
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

    // 微型資訊卡片 (station-hover-card)
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

    // ⭐ 關閉按鈕點擊：解除鎖定並標記 dismissed，避免游標停在原處時被 :hover 重新彈出
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      bubbleEl.classList.remove('is-pinned');
      bubbleEl.classList.add('is-dismissed');
      if (selectedStationId.value === s.id) {
        selectedStationId.value = null;
      }
    });

    // 當滑鼠移開膠囊時，清空 dismissed 標記以恢復後續 hover 響應
    bubbleEl.addEventListener('mouseleave', () => {
      bubbleEl.classList.remove('is-dismissed');
    });

    overviewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetToOverview();
    });

    bubbleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      bubbleEl.classList.remove('is-dismissed');
      selectStation(s.id);
    });

    markerEl.appendChild(bubbleEl);

    stationElementsMap.set(s.id, {
      bubbleEl,
      countEl,
      tooltipIn,
      tooltipOut
    });

    new maplibregl.Marker({ element: markerEl, anchor: 'center' })
      .setLngLat(s.coord)
      .addTo(map);
  });
});
</script>