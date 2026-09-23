<template>
  <div class="top-right-countdown-hud desktop-only">
    <!-- 依連線狀態變更燈號 class: status-syncing(黃), status-success(藍/綠), status-error(紅) -->
    <div class="countdown-pulse-ring" :class="`status-${syncStatus}`"></div>
    <div class="countdown-body">
      <div class="cd-title-row">
        <span class="cd-label">運量同步狀態</span>
        <span class="cd-timer" :class="`text-${syncStatus}`">
          <template v-if="syncStatus === 'syncing'">同步中...</template>
          <template v-else-if="syncStatus === 'error'">連線失敗</template>
          <template v-else>{{ formattedCountdown }}</template>
        </span>
      </div>
      <div class="cd-progress-track">
        <div 
          class="cd-progress-bar" 
          :class="`bar-${syncStatus}`"
          :style="{ width: syncStatus === 'syncing' ? '100%' : `${(countdownSec / 300) * 100}%` }"
        ></div>
      </div>
      <div class="cd-meta-row">
        <span>今日總運量(出站)：<strong>{{ totalDailyPassengers }}</strong> 人次</span>
        <span 
          class="cd-refresh-link" 
          :class="{ 'is-disabled': syncStatus === 'syncing' }" 
          @click="onRefreshClick"
        >
          {{ syncStatus === 'syncing' ? '更新中...' : '立即更新' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  countdownSec: { type: Number, required: true },
  totalPassengers: { type: [Number, String], default: '--' },
  syncStatus: { type: String, default: 'syncing' } // 'syncing' | 'success' | 'error'
});

const emit = defineEmits(['refresh']);

const formattedCountdown = computed(() => {
  const m = String(Math.floor(props.countdownSec / 60)).padStart(2, '0');
  const s = String(props.countdownSec % 60).padStart(2, '0');
  return `${m}:${s}`;
});

const totalDailyPassengers = computed(() => {
  if (!props.totalPassengers || props.totalPassengers === '--') return '--';
  return Number(props.totalPassengers).toLocaleString();
});

const onRefreshClick = () => {
  if (props.syncStatus !== 'syncing') {
    emit('refresh');
  }
};
</script>