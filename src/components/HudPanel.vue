<template>
  <!-- 手機版未點開時顯示的「詳細資料」浮動按鈕 -->
  <button 
    class="mobile-open-drawer-btn" 
    v-if="isCollapsed" 
    @click="$emit('update:isCollapsed', false)" 
    type="button"
  >
    <span class="btn-icon">{{ currentTab === 'event' ? '🎪' : '📊' }}</span>
    <span class="btn-text">{{ currentTab === 'event' ? '活動觀察中' : '戰情詳細資料' }}</span>
  </button>

  <!-- 手機版抽屜開啟時的黑色遮罩 -->
  <div 
    class="mobile-panel-backdrop" 
    v-if="!isCollapsed" 
    @click="$emit('update:isCollapsed', true)"
  ></div>

  <!-- HUD 面板主體 -->
  <div class="hud-panel" :class="{ 'is-collapsed': isCollapsed }">
    <!-- 標題列 -->
    <div class="hud-header">
      <div class="header-left">
        <div class="status-indicator" :class="{ 'event-indicator': currentTab === 'event' }"></div>
        <span class="hud-title">
          {{ currentTab === 'event' ? '🎪 活動疏運專案監控' : 'TAOYUAN METRO 即時數據中心' }}
        </span>
      </div>

      <div class="header-actions">
        <!-- 切換按鈕：戰情室 vs 活動觀察 -->
        <button 
          type="button" 
          class="hud-tab-toggle-btn"
          @click="currentTab = (currentTab === 'overview' ? 'event' : 'overview')"
        >
          {{ currentTab === 'overview' ? '🎪 活動觀察' : '← 返回戰情' }}
        </button>

        <!-- 手機版收回按鈕 -->
        <button 
          class="hud-close-collapse-btn" 
          @click="$emit('update:isCollapsed', true)" 
          type="button"
        >
          ✕ 縮回
        </button>
      </div>
    </div>

    <!-- ==================== 視圖 A：戰情儀表板 ==================== -->
    <div v-if="currentTab === 'overview'" class="hud-body-content">
      <!-- 手機版頂部同步狀態條 -->
      <div class="mobile-sync-bar">
        <div class="msb-left">
          <div class="countdown-pulse-ring" :class="`status-${syncStatus}`"></div>
          <span class="msb-timer" :class="`text-${syncStatus}`">
            <template v-if="syncStatus === 'syncing'">正在同步運量...</template>
            <template v-else-if="syncStatus === 'error'">連線失敗</template>
            <template v-else>同步倒數 {{ formattedCountdown }}</template>
          </span>
        </div>
        <button 
          class="msb-refresh-btn" 
          :disabled="syncStatus === 'syncing'"
          @click="$emit('triggerRefresh')"
        >
          <span class="refresh-icon" :class="{ 'is-spinning': syncStatus === 'syncing' }">🔄</span>
          {{ syncStatus === 'syncing' ? '更新中' : '立即更新' }}
        </button>
      </div>

      <div class="hud-sub">桃園捷運即時運量監控</div>
      <div class="divider"></div>

      <!-- 全線即時運量 -->
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
          <button class="time-btn" :class="{ active: timeMultiplier === 1 }" @click="$emit('setSpeed', 1)">1x 即時</button>
          <button class="time-btn" :class="{ active: timeMultiplier === 10 }" @click="$emit('setSpeed', 10)">10x 快進</button>
          <button class="time-btn" :class="{ active: timeMultiplier === 60 }" @click="$emit('setSpeed', 60)">60x 預演</button>
          <button class="time-btn sync-btn" @click="$emit('syncRealTime')">現在時間</button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 排行榜與單站明細 -->
      <div class="station-drawer-box">
        <div class="drawer-header">
          <span class="drawer-title">
            <span v-if="!selectedStationId">
              🏆 {{ rankingMode === 'live' ? '即時站點熱區' : '全日累計運量' }} Top 5
            </span>
            <span v-else>🔍 站點運量明細：{{ selectedStationName }}</span>
          </span>

          <div v-if="!selectedStationId" class="rank-mode-toggle">
            <button 
              type="button" 
              class="mode-btn" 
              :class="{ active: rankingMode === 'live' }"
              @click="rankingMode = 'live'"
            >
              人流
            </button>
            <button 
              type="button" 
              class="mode-btn" 
              :class="{ active: rankingMode === 'total' }"
              @click="rankingMode = 'total'"
            >
              運量
            </button>
          </div>

          <button v-else class="drawer-reset-btn" @click="$emit('resetOverview')">
            返回全線
          </button>
        </div>

        <!-- Top 5 列表 -->
        <div v-if="!selectedStationId" class="top-ranking-list">
          <div
            v-for="(st, idx) in displayedTop5Stations"
            :key="st.stationId"
            class="top-ranking-item"
            @click="$emit('selectStation', st.stationId);$emit('update:isCollapsed', true)"
          >
            <span class="rank-badge" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</span>
            <span class="rank-name">{{ st.name }}</span>
            <div class="rank-counts">
              <span class="rank-live">{{ st.count }} 人</span>
              <span class="rank-sub-in">進 {{ formatCompactNumber(st.todayIn) }}</span>
              <span class="rank-sub-out">出 {{ formatCompactNumber(st.todayOut) }}</span>
            </div>
          </div>
          <div v-if="displayedTop5Stations.length === 0" class="empty-list-tip">
            資料同步中，請稍候...
          </div>
        </div>

        <!-- 單站深度卡片 -->
        <div v-else class="station-detail-card">
          <div class="date-comparison-tag">
            <span>營運日: {{ flowSummary?.currentOperDateStr || '今日' }}</span>
            <span>比較日: {{ flowSummary?.historyDateStr || '歷史比較日' }}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-cell">
              <div class="cell-label">進站運量</div>
              <div class="cell-main val-in">{{ currentStationDetail?.todayIn?.toLocaleString() || '--' }}</div>
              <div class="cell-sub">
                比較日: {{ currentStationDetail?.historyIn?.toLocaleString() || '--' }}
                <span :class="(currentStationDetail?.diffIn || 0) >= 0 ? 'text-red' : 'text-green'">
                  ({{ (currentStationDetail?.diffIn || 0) >= 0 ? '+' : '' }}{{ currentStationDetail?.rateIn || '0' }}%)
                </span>
              </div>
            </div>
            <div class="detail-cell">
              <div class="cell-label">出站運量</div>
              <div class="cell-main val-out">{{ currentStationDetail?.todayOut?.toLocaleString() || '--' }}</div>
              <div class="cell-sub">
                比較日: {{ currentStationDetail?.historyOut?.toLocaleString() || '--' }}
                <span :class="(currentStationDetail?.diffOut || 0) >= 0 ? 'text-red' : 'text-green'">
                  ({{ (currentStationDetail?.diffOut || 0) >= 0 ? '+' : '' }}{{ currentStationDetail?.rateOut || '0' }}%)
                </span>
              </div>
            </div>
          </div>
          <div class="detail-live-bar">
            <span>當前站內即時人數：</span>
            <strong>{{ currentStationDetail?.count || 0 }} 人</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 視圖 B：活動專案觀察視圖 ==================== -->
    <div v-else class="hud-body-content event-monitor-view">
      <div class="hud-sub">自選活動站點數據與全線佔比監控</div>
      <div class="divider"></div>

      <!-- 快捷情境按鈕列 (純淨標籤 + 新增彈性) -->
      <div class="preset-scenario-row">
        <span class="preset-label">快捷載入:</span>
        <div class="preset-tags-container">
          <button 
            v-for="(preset, idx) in customPresets" 
            :key="idx" 
            type="button" 
            class="preset-tag" 
            :title="`包含站點: ${preset.stations.join(', ')}`"
            @click="applyPreset(preset.stations)"
          >
            {{ preset.name }}
          </button>

          <button 
            type="button" 
            class="preset-tag add-preset-btn" 
            @click="promptAddPreset"
          >
            ＋ 新增
          </button>
          <button 
            type="button" 
            class="preset-tag reset" 
            @click="selectedEventStations = []"
          >
            清空
          </button>
        </div>
      </div>

      <!-- 活動群組 KPI 聚合看板 -->
      <div class="event-kpi-grid">
        <!-- 左側：即時在站人流焦點卡 -->
        <div class="event-kpi-card focus-live-card">
          <div class="kpi-card-header">
            <span class="kpi-label">觀察站即時在站</span>
            <span class="kpi-badge badge-blue">即時</span>
          </div>

          <div class="kpi-main-block">
            <div class="kpi-value text-blue">
              {{ eventAggregate.totalLiveCount.toLocaleString() }}
              <span class="kpi-unit">人</span>
            </div>
            <div class="kpi-progress-track">
              <div 
                class="kpi-progress-fill fill-blue"
                :style="{ width: `${eventAggregate.allLiveCount > 0 ? Math.min(100, (eventAggregate.totalLiveCount / eventAggregate.allLiveCount) * 100) : 0}%` }"
              ></div>
            </div>
          </div>

          <div class="kpi-sub-row">
            <span>全線在站</span>
            <strong>{{ eventAggregate.allLiveCount.toLocaleString() }} 人</strong>
          </div>
        </div>

        <!-- 右側：上進下出切半雙色卡片 (不加總) -->
        <div class="event-kpi-card split-io-card">
          <!-- 上半部：累計進站 -->
          <div class="io-cell cell-in">
            <div class="io-meta">
              <span class="io-tag tag-in">進站</span>
              <span class="io-share-badge badge-gold">佔 {{ eventAggregate.inShare }}%</span>
            </div>
            <div class="io-val val-in">
              {{ eventAggregate.totalIn.toLocaleString() }}
              <span class="io-unit">人次</span>
            </div>
          </div>

          <div class="io-cell-divider"></div>

          <!-- 下半部：累計出站 -->
          <div class="io-cell cell-out">
            <div class="io-meta">
              <span class="io-tag tag-out">出站</span>
              <span class="io-share-badge badge-purple">佔 {{ eventAggregate.outShare }}%</span>
            </div>
            <div class="io-val val-out">
              {{ eventAggregate.totalOut.toLocaleString() }}
              <span class="io-unit">人次</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 進出站對比小條 (差額滯留量) -->

      <div class="event-io-bar">
        <span>累計進: <strong class="val-in">{{ eventAggregate.totalIn.toLocaleString() }}</strong></span>
        <span>累計出: <strong class="val-out">{{ eventAggregate.totalOut.toLocaleString() }}</strong></span>
        <span>差額(進-出): <strong :class="eventAggregate.netStay >= 0 ? 'diff-positive' : 'diff-negative'">{{ eventAggregate.netStay >= 0 ? '+' : '' }}{{ eventAggregate.netStay.toLocaleString() }}</strong></span>
      </div>
      <div class="divider"></div>

      <!-- 車站選擇膠囊列 (可橫向捲動) -->
      <div class="station-selector-section">
        <div class="section-title">選擇監控車站 (點擊切換)</div>
        <div class="station-chip-scroller">
          <button
            v-for="(name, id) in stationNamesMap"
            :key="id"
            type="button"
            class="station-chip"
            :class="{ active: selectedEventStations.includes(id) }"
            @click="toggleStation(id)"
          >
            {{ id }}
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 已選車站即時數據列表 -->
      <div class="event-station-list-box">
        <div class="section-title">已選車站數據明細 ({{ selectedEventStations.length }} 站)</div>
        
        <div v-if="eventStationDetails.length > 0" class="event-station-list">
          <div 
            v-for="st in eventStationDetails" 
            :key="st.id" 
            class="event-station-row"
            @click="$emit('selectStation', st.id);$emit('update:isCollapsed', true)"
          >
            <div class="es-left">
              <span class="es-name">{{ st.name }}</span>
              <span class="es-live">{{ st.count }} 人在站</span>
            </div>
            <div class="es-right">
              <div class="es-counts">
                <span class="val-in">進 {{ formatCompactNumber(st.todayIn) }}</span>
                <span class="val-out">出 {{ formatCompactNumber(st.todayOut) }}</span>
              </div>
              <button class="es-remove-btn" @click.stop="toggleStation(st.id)">✕</button>
            </div>
          </div>
        </div>
        <div v-else class="empty-list-tip">
          請於上方點選車站標籤加入觀察
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps({
  isCollapsed: { type: Boolean, required: true },
  flowSummary: { type: Object, required: true },
  selectedStationId: { type: String, default: null },
  selectedStationName: { type: String, default: '' },
  currentStationDetail: { type: Object, default: () => null },
  formattedSimTime: { type: String, default: '' },
  timeMultiplier: { type: Number, default: 1 },
  countdownSec: { type: Number, default: 300 },
  syncStatus: { type: String, default: 'success' }
});

defineEmits([
  'update:isCollapsed', 
  'setSpeed', 
  'syncRealTime', 
  'resetOverview', 
  'selectStation', 
  'triggerRefresh'
]);

// 車站名稱字典
const stationNamesMap = {
  A1: 'A1 台北車站', A2: 'A2 三重站', A3: 'A3 新北產業園區', A4: 'A4 新莊副都心',
  A5: 'A5 泰山站', A6: 'A6 泰山貴和', A7: 'A7 體育大學', A8: 'A8 長庚醫院',
  A9: 'A9 林口站', A10: 'A10 山鼻站', A11: 'A11 坑口站', A12: 'A12 機場第一航廈',
  A13: 'A13 機場第二航廈', A14a: 'A14a 機場旅館', A15: 'A15 大園站', A16: 'A16 橫山站',
  A17: 'A17 領航站', A18: 'A18 高鐵桃園站', A19: 'A19 桃園體育園區', A20: 'A20 興南站',
  A21: 'A21 環北站', A22: 'A22 老街溪站'
};

// 視圖分頁：'overview' (戰情中心) | 'event' (活動專案觀察)
const currentTab = ref('overview');

// 快捷標籤清單
const INITIAL_PRESETS = [
  { name: 'A19棒球/演唱會', stations: ['A19', 'A18'] },
  { name: '設計展活動', stations: ['A17', 'A18', 'A19', 'A20', 'A21'] }
];

const PRESETS_STORAGE_KEY = '_tym_custom_event_presets';
const customPresets = ref([...INITIAL_PRESETS]);

// 活動觀察已選車站
const EVENT_STORAGE_KEY = '_tym_event_selected_stations';
const selectedEventStations = ref(['A19', 'A18']);

onMounted(() => {
  const savedStations = localStorage.getItem(EVENT_STORAGE_KEY);
  if (savedStations) {
    try { selectedEventStations.value = JSON.parse(savedStations); } catch (e) {}
  }

  const savedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
  if (savedPresets) {
    try {
      const parsed = JSON.parse(savedPresets);
      if (Array.isArray(parsed) && parsed.length > 0) {
        customPresets.value = parsed;
      }
    } catch (e) {}
  }
});

watch(selectedEventStations, (val) => {
  localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(val));
}, { deep: true });

const savePresetsToStorage = () => {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customPresets.value));
};

const toggleStation = (id) => {
  const idx = selectedEventStations.value.indexOf(id);
  if (idx >= 0) {
    selectedEventStations.value.splice(idx, 1);
  } else {
    selectedEventStations.value.push(id);
  }
};

const applyPreset = (list) => {
  selectedEventStations.value = [...list];
};

// 新增標籤：將當前勾選的車站儲存為新快捷標籤
const promptAddPreset = () => {
  if (selectedEventStations.value.length === 0) {
    alert('請先在下方勾選至少 1 個監控車站！');
    return;
  }

  const name = window.prompt(`請輸入新標籤名稱：\n(目前包含: ${selectedEventStations.value.join(', ')})`);
  if (!name || !name.trim()) return;

  const trimmed = name.trim();
  const existingIdx = customPresets.value.findIndex(p => p.name === trimmed);

  if (existingIdx >= 0) {
    customPresets.value[existingIdx].stations = [...selectedEventStations.value];
  } else {
    customPresets.value.push({
      name: trimmed,
      stations: [...selectedEventStations.value]
    });
  }

  savePresetsToStorage();
};

// 計算已選活動站點詳細數據
const eventStationDetails = computed(() => {
  const summary = props.flowSummary;
  if (!summary) return [];

  const rawRange = Array.isArray(summary.stationRange) ? summary.stationRange : [];
  const statsMap = summary.stationStats || {};

  return selectedEventStations.value.map(stId => {
    const stats = statsMap[stId] || {};
    const rangeItem = rawRange.find(r => (r.station?.match(/A[0-9a-zA-Z]+/)?.[0] || r.station) === stId);

    const todayIn = Number(stats.todayIn) || 0;
    const todayOut = Number(stats.todayOut) || 0;
    const count = rangeItem ? Number(rangeItem.count) || 0 : (Number(stats.rtTotal) || 0);

    return {
      id: stId,
      name: stationNamesMap[stId] || stId,
      count,
      todayIn,
      todayOut,
      totalVolume: todayIn + todayOut
    };
  });
});

// 計算活動觀察 KPI 聚合數據與個別進出佔比
const eventAggregate = computed(() => {
  const details = eventStationDetails.value;
  const totals = props.flowSummary?.totals || {};

  const totalLiveCount = details.reduce((sum, item) => sum + item.count, 0);
  const totalIn = details.reduce((sum, item) => sum + item.todayIn, 0);
  const totalOut = details.reduce((sum, item) => sum + item.todayOut, 0);
  const netStay = totalIn - totalOut;

  const allIn = Number(totals.sumTodayIn) || 0;
  const allOut = Number(totals.sumTodayOut) || 0;

  const inShare = allIn > 0 ? ((totalIn / allIn) * 100).toFixed(1) : '0.0';
  const outShare = allOut > 0 ? ((totalOut / allOut) * 100).toFixed(1) : '0.0';

  const allLiveCount = Array.isArray(props.flowSummary?.stationRange)
    ? props.flowSummary.stationRange.reduce((acc, cur) => acc + (Number(cur.count) || 0), 0)
    : 0;

  return {
    totalLiveCount,
    allLiveCount,
    totalIn,
    totalOut,
    netStay,
    inShare,
    outShare
  };
});

// 原有 Top 5 榜單計算
const rankingMode = ref('live');

const displayedTop5Stations = computed(() => {
  const summary = props.flowSummary;
  if (!summary) return [];

  const rawRange = Array.isArray(summary.stationRange) ? summary.stationRange : [];
  const statsMap = summary.stationStats || {};
  if (rawRange.length === 0 && Object.keys(statsMap).length === 0) return [];

  const stationIdSet = new Set([
    ...Object.keys(statsMap),
    ...rawRange.map(r => r.station?.match(/A[0-9a-zA-Z]+/)?.[0] || r.station)
  ]);

  const list = [];
  stationIdSet.forEach(stId => {
    if (!stId) return;
    const stats = statsMap[stId] || {};
    const rangeItem = rawRange.find(r => (r.station?.match(/A[0-9a-zA-Z]+/)?.[0] || r.station) === stId);
    const todayIn = Number(stats.todayIn) || 0;
    const todayOut = Number(stats.todayOut) || 0;
    const totalFlow = (stats.todayTotal !== undefined) ? Number(stats.todayTotal) : (todayIn + todayOut);
    const count = rangeItem ? Number(rangeItem.count) || 0 : (Number(stats.rtTotal) || 0);

    list.push({
      stationId: stId,
      name: stationNamesMap[stId] || stId,
      count,
      todayIn,
      todayOut,
      totalFlow
    });
  });

  if (rankingMode.value === 'total') {
    list.sort((a, b) => b.totalFlow - a.totalFlow);
  } else {
    list.sort((a, b) => b.count - a.count);
  }

  return list.slice(0, 5);
});

const formattedCountdown = computed(() => {
  const m = String(Math.floor(props.countdownSec / 60)).padStart(2, '0');
  const s = String(props.countdownSec % 60).padStart(2, '0');
  return `${m}:${s}`;
});

const formatCompactNumber = (num) => {
  const n = Number(num) || 0;
  if (n >= 10000) return (n / 10000).toFixed(1) + '萬';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};
</script>