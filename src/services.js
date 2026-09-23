const FLOW_GAS_URL = "https://script.google.com/macros/s/AKfycbx83C7UWPYe5ycOh-QzJdbYbChvtSo15L5QTPd0fWcP3E7X9OvV6IzQVSyv5s6EteHVpw/exec?action=flowSummary";
const CACHE_KEY = "TYM_LOCAL_PASSENGER_FLOW";

/**
 * 抓取桃捷全線最新快取客流資料（支援本地極速秒開與靜默同步）
 * @param {Function} [onCacheLoaded] - 若有本地舊快取時的回呼函式
 * @returns {Promise<Object|null>}
 */
export async function fetchPassengerFlow(onCacheLoaded) {
  // 1. 本地瞬間讀取：若手機存有先前的數據，0.01 秒先傳回顯示
  const cachedStr = localStorage.getItem(CACHE_KEY);
  if (cachedStr) {
    try {
      const cached = JSON.parse(cachedStr);
      if (typeof onCacheLoaded === 'function') {
        onCacheLoaded(cached);
      }
    } catch (e) {
      console.warn("本地快取解析略過:", e);
    }
  }

  // 2. 向 GAS 發送請求抓取最新數據
  try {
    const res = await fetch(FLOW_GAS_URL);
    if (!res.ok) throw new Error(`HTTP 錯誤: ${res.status}`);
    
    const result = await res.json();

    // 檢查回傳的 JSON 是否為合法的運量資料（直接包含 totals 或 stationStats）
    const flowData = (result && result.data) ? result.data : result;

    if (flowData && (flowData.totals || flowData.stationStats)) {
      // 存入手機本地快取，供下次秒開
      localStorage.setItem(CACHE_KEY, JSON.stringify(flowData));
      return flowData;
    }

    return null;
  } catch (error) {
    console.error("人流 GAS 連線異常：", error);
    // 網路延遲或斷線時，保留本地舊資料供畫面展示
    if (cachedStr) {
      return JSON.parse(cachedStr);
    }
    return null;
  }
}