import { reactive, createApp } from './vendor/petite-vue.es.js'

const STATIC = 'https://cdn.antiddos.lol/_antiddos_static/'
const SLOW_MS = 2500
const FADE_MS = 160

const texts = {
  contact: 'Возникли сложности? Напишите в поддержку:',
  checkbox: 'Я не робот',
  loading: 'Подготовка проверки...',
  solving: 'Выполнение проверки...',
  captcha: 'Пройдите проверку ниже',
  verifying: 'Проверка на сервере...',
  success: 'Готово. Перенаправляем...',
  error: 'Проверка не пройдена, повторите попытку',
  retry: 'Повторить / Retry',
  cookies: 'Не удалось сохранить результат проверки. Включите cookies и обновите страницу',
  direct: 'Эта страница открывается только через защищаемый сайт'
}

const store = reactive({
  mode: 'pending',
  theme: 'dark',
  state: 'boot',
  key: 'loading',
  pct: 0,
  retry: false,
  leaving: false,
  slow: false,
  host: location.hostname,
  logo: '/api/guard/client-logo?host=' + encodeURIComponent(location.hostname)
})

let pending = null
let slowTimer = null

function apply(patch) {
  Object.assign(store, patch)
  store.leaving = false
  clearTimeout(slowTimer)
  store.slow = false
  if (store.mode === 'passive' && store.state === 'progress') {
    slowTimer = setTimeout(() => { store.slow = true }, SLOW_MS)
  }
}

function set(patch) {
  if (pending) {
    Object.assign(pending, patch)
    return
  }
  const stateChange = patch.state && patch.state !== store.state && store.mode === 'card' && store.state !== 'boot'
  if (!stateChange) {
    apply(patch)
    return
  }
  pending = { ...patch }
  store.leaving = true
  setTimeout(() => {
    const next = pending
    pending = null
    apply(next)
  }, FADE_MS)
}

function captchaSlot() {
  return new Promise((resolve) => {
    set({ state: 'captcha', key: 'captcha' })
    const poll = () => {
      const el = document.getElementById('vf-widget')
      if (el) resolve(el)
      else setTimeout(poll, 40)
    }
    setTimeout(poll, FADE_MS + 40)
  })
}

const core = window.__adl ? window.__adl.start({ set, captchaSlot }) : null

if (!core) {
  const direct = location.hostname === 'cdn.antiddos.lol'
  apply({ state: 'fatal', key: direct ? 'direct' : 'error', retry: !direct })
}

createApp({
  s: store,
  text: (key) => texts[key] || '',
  staticBase: STATIC,
  click: () => core && core.click(),
  retryClick: () => (core ? core.retry() : location.reload()),
  logoFallback: (event) => {
    event.target.onerror = null
    event.target.src = STATIC + 'brand-logo.svg'
  }
}).mount('#guard-page')
