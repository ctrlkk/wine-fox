import { debounce } from 'lodash'
import { Clock } from 'three'
import { KanbanGirl } from 'wine-fox'
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

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!);

// 推荐使用闭包防止意外的内存泄漏
(async () => {
  let kanbanGirl: KanbanGirl
  let animationFrameId: number
  const mouse = {
    x: 0,
    y: 0,
  }

  const onMouseMove = (e: MouseEvent) => {
    mouse.x = e.screenX
    mouse.y = e.screenY
  }

  const onResize = debounce(() => {
    kanbanGirl.resize()
  }, 500)

  const animate = (() => {
    let lastTime = 0
    const clock = new Clock()
    return function (timestamp: number) {
      // 限制60hz刷新率
      const frameInterval = 1000 / 60
      animationFrameId = requestAnimationFrame(animate)
      const delta = timestamp - lastTime

      if (delta >= frameInterval) {
        // 更新酒狐模型
        kanbanGirl.update(timestamp, clock.getDelta())
        // 让酒狐看向鼠标位置
        kanbanGirl.lookAt(mouse)
        lastTime = timestamp - (delta % frameInterval)
      }
    }
  })()
  // 创建酒狐实例并在动画循环中更新
  kanbanGirl = new KanbanGirl(document.querySelector<HTMLDivElement>('#container')!)
  animationFrameId = requestAnimationFrame(animate)
  // 加载主模型
  const mainModel = await kanbanGirl.load()

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onResize)
  const destroy = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('beforeunload', destroy)
    mainModel.dispose()
    cancelAnimationFrame(animationFrameId)
  }
  // 销毁事件监听器和模型
  window.addEventListener('beforeunload', destroy)
})()
