import { reactive, createApp } from './vendor/petite-vue.es.js'

const STATIC = 'https://cdn.antiddos.lol/_antiddos_static/'
const SLOW_MS = 2500
const FADE_MS = 160

const EN = {
  by: 'By antiddos.lol',
  title: 'Additional Verification Required',
  lead: 'Please complete the CAPTCHA below to proceed',
  checkbox: "I'm not a robot",
  loading: 'Preparing the check...',
  stageLoad: 'Loading...',
  stageSecurity: 'Loading security data...',
  stageBrowser: 'Collecting browser data...',
  solving: 'Running the check...',
  captcha: 'Please complete the check above',
  verifying: 'Verifying...',
  success: 'Done. Redirecting...',
  error: 'Verification failed',
  retry: 'Retry',
  waitTitle: 'Please wait a few seconds',
  waitText: 'You will be redirected automatically.',
  failTitle: 'Verification failed',
  errorFatal: 'Something went wrong. Please try again.',
  contact: 'If you are experiencing any issues, please contact us at:',
  cookies: 'The result could not be saved. Please enable cookies and reload the page.',
  direct: 'This page only opens through a protected website.',
  directTitle: 'antiddos.lol'
}
const RU = {
  by: 'By antiddos.lol',
  title: 'Требуется дополнительная проверка',
  lead: 'Пройдите проверку ниже, чтобы продолжить',
  checkbox: 'Я не робот',
  loading: 'Подготовка проверки...',
  stageLoad: 'Загрузка...',
  stageSecurity: 'Загрузка данных безопасности...',
  stageBrowser: 'Сбор данных браузера...',
  solving: 'Выполнение проверки...',
  captcha: 'Пройдите проверку выше',
  verifying: 'Проверка...',
  success: 'Готово. Перенаправляем...',
  error: 'Проверка не пройдена',
  retry: 'Повторить',
  waitTitle: 'Подождите несколько секунд',
  waitText: 'Мы автоматически перенаправим вас.',
  failTitle: 'Проверка не пройдена',
  errorFatal: 'Что-то пошло не так. Повторите попытку.',
  contact: 'Если возникли проблемы, напишите нам:',
  cookies: 'Не удалось сохранить результат. Включите cookies и обновите страницу.',
  direct: 'Эта страница открывается только через защищаемый сайт.',
  directTitle: 'antiddos.lol'
}
const texts = /^(ru|uk|be|kk|ky)\b/i.test(navigator.language || '') ? RU : EN
document.documentElement.lang = texts === RU ? 'ru' : 'en'

const STEPS = { stageLoad: 1, stageSecurity: 2, stageBrowser: 3, solving: 4 }

const store = reactive({
  staged: false,
  mode: 'pending',
  theme: 'dark',
  state: 'boot',
  key: 'loading',
  pct: 0,
  retry: false,
  leaving: false,
  slow: false
})

let pending = null
let slowTimer = null

function apply(patch) {
  Object.assign(store, patch)
  if (patch.key === 'stageLoad') store.staged = true
  store.leaving = false
  clearTimeout(slowTimer)
  store.slow = false
  if (store.mode === 'invisible' && store.state === 'progress') {
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

// Прямой заход на cdn (ядро проверки отдаёт только защищаемый сайт): показываем дизайн как демо.
const demo = !core && location.hostname === 'cdn.antiddos.lol'
if (!core && !demo) {
  apply({ state: 'fatal', key: 'error', retry: true })
}
if (demo) {
  const demoMode = new URLSearchParams(location.search).get('demo')
  if (demoMode === 'passive') {
    apply({ mode: 'passive', state: 'progress', key: 'loading' })
  } else {
    demoStages()
  }
}

function demoStages() {
  apply({ mode: 'card', state: 'progress', key: 'stageLoad', pct: 0 })
  const keys = ['stageSecurity', 'stageBrowser', 'solving']
  keys.forEach((key, i) => setTimeout(() => set({ state: 'progress', key, pct: 0 }), 350 * (i + 1)))
  setTimeout(() => set({ state: 'ready', key: 'checkbox' }), 350 * (keys.length + 1))
}

createApp({
  s: store,
  text: (key) => texts[key] || '',
  staticBase: STATIC,
  get step() {
    if (!store.staged || store.mode !== 'card') return 0
    if (store.state === 'progress') return STEPS[store.key] || 5
    return store.state === 'ready' || store.state === 'success' ? 5 : 0
  },
  get tail() {
    if (store.state !== 'progress') return ''
    return store.pct ? store.pct + '%' : ''
  },
  get bar() {
    return { transform: 'scaleX(' + (store.pct ? store.pct / 100 : 0.88) + ')' }
  },
  get showWait() {
    return store.state !== 'fatal' && (store.mode === 'passive' || (store.mode === 'invisible' && store.slow))
  },
  click: () => {
    if (core) return core.click()
    if (!demo) return
    set({ state: 'progress', key: 'verifying', pct: 0 })
    setTimeout(() => set({ state: 'success', key: 'success' }), 900)
    setTimeout(demoStages, 2600)
  },
  retryClick: () => (core ? core.retry() : location.reload())
}).mount('#guard-page')
