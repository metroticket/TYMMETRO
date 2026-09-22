// src/services.js
// 專門抓取桃捷全線快取客流總結 (Flow Summary)

const FLOW_GAS_URL = "https://script.google.com/macros/s/AKfycbx83C7UWPYe5ycOh-QzJdbYbChvtSo15L5QTPd0fWcP3E7X9OvV6IzQVSyv5s6EteHVpw/exec?action=flowSummary";

/**
 * 抓取桃捷全線最新快取客流資料
 * @returns {Promise<Object|null>}
 */
export async function fetchPassengerFlow() {
  try {
    const res = await fetch(FLOW_GAS_URL);
    const result = await res.json();
    if (result && result.status === 'success') {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error("人流 GAS 連線異常：", error);
    return null;
  }
}