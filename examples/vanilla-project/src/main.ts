import { debounce } from 'lodash'
import * as THREE from 'three'
import { KanbanGirl } from 'wine-fox'
import { urls } from 'wine-fox/assets'
import { withFrameRateLimit } from 'wine-fox/tools'
import { setupCounter } from './counter.ts'
import typescriptLogo from './typescript.svg'
import './style.css'
import viteLogo from '/vite.svg'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <div id="container" style="width: 100%; height: 20rem;"></div>
    <h1>Vite + TypeScript + WineFox</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

;(async () => {
  const mouse = {
    x: 0,
    y: 0,
  }
  const onMouseMove = (e: MouseEvent) => {
    mouse.x = e.screenX
    mouse.y = e.screenY
  }
  window.addEventListener('mousemove', onMouseMove)

  // 创建KanbanGirl实例，此时会初始化场景
  const model = new KanbanGirl(document.querySelector('#container')!)
  // 在这里才会加载所需要的模型资源
  await model.load(urls)
  const clock = new THREE.Clock()
  // withFrameRateLimit函数可以限制帧率，避免资源浪费
  const limit = withFrameRateLimit(60)(() => {
    // 更新场景
    model.update(clock.getDelta())
    // 让模型看向鼠标的位置
    model.lookAt(mouse)
  })
  limit.start()

  // 如果需要重新调整画布
  const onResize = debounce(() => {
    model.resize()
  }, 500)
  window.addEventListener('resize', onResize)

  // 在页面卸载前释放资源
  window.addEventListener('beforeunload', () => {
    limit.stop()
    model.dispose()
    window.removeEventListener('resize', onResize)
    window.removeEventListener('mousemove', onMouseMove)
  })
})()
