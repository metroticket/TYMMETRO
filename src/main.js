import { createApp } from 'vue'
import App from './App.vue'

// ⭐ 改為引入拆分後的兩支獨立 CSS
import './map.css'
import './hud.css'

createApp(App).mount('#app')