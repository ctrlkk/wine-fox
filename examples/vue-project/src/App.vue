<script setup lang="ts">
import { debounce } from 'lodash'
import { Clock } from 'three'
import { onMounted, onUnmounted, ref } from 'vue'
import { KanbanGirl } from 'wine-fox'
import HelloWorld from './components/HelloWorld.vue'

const container = ref<HTMLDivElement>()

let destroy = () => {}

onMounted(() => {
  // 推荐使用闭包防止意外的内存泄漏
  (async () => {
    let kanbanGirl: KanbanGirl
    let animationFrameId: number
    const mouse = {
      x: 0,
      y: 0,
    }

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
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
    kanbanGirl = new KanbanGirl(container.value!)
    animationFrameId = requestAnimationFrame(animate)
    // 加载主模型
    const mainModel = await kanbanGirl.load()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize', onResize)
    destroy = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      mainModel.dispose()
      cancelAnimationFrame(animationFrameId)
    }
  })()
})

onUnmounted(() => {
  // 组件销毁时调用销毁函数
  destroy()
})
</script>

<template>
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo">
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo">
    </a>
  </div>
  <div ref="container" style="width: 100%; height: 20rem;" />
  <HelloWorld msg="Vite + Vue + WineFox" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
