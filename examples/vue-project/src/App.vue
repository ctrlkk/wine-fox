<script setup lang="ts">
import { debounce } from 'lodash'
import { Clock } from 'three'
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import { KanbanGirl } from 'wine-fox'
import { urls } from 'wine-fox/assets'
import { withFrameRateLimit } from 'wine-fox/tools'
import HelloWorld from './components/HelloWorld.vue'

const container = useTemplateRef('container')

const mouse = {
  x: 0,
  y: 0,
}
function onMouseMove(e: MouseEvent) {
  mouse.x = e.screenX
  mouse.y = e.screenY
}
window.addEventListener('mousemove', onMouseMove)

let dispose = () => {}

onMounted(async () => {
  const clock = new Clock()
  const model = new KanbanGirl(container.value!)
  await model.load(urls)

  const limit = withFrameRateLimit(60)(() => {
    model.update(clock.getDelta())
    model.lookAt(mouse)
  })
  limit.start()

  const onResize = debounce(() => {
    model.resize()
  }, 500)
  window.addEventListener('resize', onResize)

  dispose = () => {
    limit.stop()
    model.dispose()
    window.removeEventListener('resize', onResize)
  }
})

onUnmounted(() => {
  dispose()
  window.removeEventListener('mousemove', onMouseMove)
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
