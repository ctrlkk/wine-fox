import type { AnimationAction } from 'three'
import type { MainModel } from './model-object'
import { LoopRepeat } from 'three'
import { waitAnimationEnd } from './animation-tools'
import { waitFadeEnd } from './tools'

interface Task {
  name: string
  baseWeight: number
  moodRange: [number, number]

  trigger: () => unknown
  stop: () => void
  update: () => void
}

/**
 * 标准模板
 */
class TaskImpl implements Task {
  name: string
  baseWeight: number = 0.8
  moodRange: [number, number] = [0, 100]
  mainModel: MainModel
  animation: AnimationAction | undefined

  constructor(mainModel: MainModel, animationName: string | null) {
    this.mainModel = mainModel
    this.name = animationName || ''
    if (animationName) {
      const animation = this.mainModel.tools.animation.getAnimationByName(animationName)
      if (!animation)
        throw new Error('build error')
      this.animation = animation
    }
  }

  trigger() {
    this.animation?.play().fadeIn(0.3)
    return this.animation
  }

  stop() {
    if (!this.animation)
      return
    this.animation.fadeOut(0.3)
    waitFadeEnd(this.animation, 0).then(() => {
      this.animation?.stop()
    })
  }

  update() {}
}

class Task1 extends TaskImpl implements Task {
  constructor(mainModel: MainModel) {
    super(mainModel, null)
  }

  trigger() {
    return super.trigger()
  }

  stop() {
    return super.stop()
  }

  update() {
    super.update()
  }
}

class Task2 extends TaskImpl implements Task {
  baseWeight: number = 0.4
  moodRange: [number, number] = [50, 100]

  constructor(mainModel: MainModel) {
    super(mainModel, 'game_win')
  }

  trigger() {
    return super.trigger()
  }

  stop() {
    super.stop()
  }

  update() {
    super.update()
  }
}

class Task3 extends TaskImpl implements Task {
  baseWeight: number = 0.3
  moodRange: [number, number] = [0, 50]

  constructor(mainModel: MainModel) {
    super(mainModel, 'game_lost')
  }

  trigger() {
    return super.trigger()
  }

  stop() {
    super.stop()
  }

  update() {
    super.update()
  }
}

class Task4 extends TaskImpl implements Task {
  baseWeight: number = 0.6
  moodRange: [number, number] = [30, 100]

  constructor(mainModel: MainModel) {
    super(mainModel, 'picnic')
  }

  trigger() {
    return super.trigger()
  }

  stop() {
    super.stop()
  }

  update() {
    super.update()
  }
}

class Task5 extends TaskImpl implements Task {
  baseWeight: number = 0.2
  moodRange: [number, number] = [50, 100]

  constructor(mainModel: MainModel) {
    super(mainModel, 'use_mainhand$minecraft:brush')
  }

  trigger() {
    const animation = super.trigger()
    if (animation) {
      animation.clampWhenFinished = true
      animation.setLoop(LoopRepeat, 5)
      waitAnimationEnd(animation).then(this.stop.bind(this))
    }
    return animation
  }

  stop() {
    super.stop()
  }

  update() {
    super.update()
  }
}

class RandomTask {
  private mainModel: MainModel
  private lastTime = 0 // 上次渲染时间
  private mood = 80 // 好感度
  private actionTask: Task | null | undefined = null

  constructor(mainModel: MainModel) {
    this.mainModel = mainModel
  }

  private build() {
    const mainModel = this.mainModel
    const tasks = []
    tasks.push(new Task1(mainModel))
    tasks.push(new Task2(mainModel))
    tasks.push(new Task3(mainModel))
    tasks.push(new Task4(mainModel))
    tasks.push(new Task5(mainModel))
    return tasks
  }

  private getActiveTasks() {
    return this.build().filter((task) => {
      return this.mood >= task.moodRange[0] && this.mood <= task.moodRange[1]
    })
  }

  reset() {
    this.actionTask?.stop()
    this.actionTask = void 0
    this.lastTime = performance.now()
  }

  // 每一帧执行
  update() {
    this.actionTask?.update()

    if ((performance.now() - this.lastTime) >= 60 * 1000) {
      // 获取当前可执行的任务
      const activeTasks = this.getActiveTasks()
      // doNothing的权重
      let accumulatedWeight = 0
      // 计算总权重
      const totalWeight = activeTasks.reduce((sum, task) => sum + task.baseWeight, 0) + accumulatedWeight

      const random = Math.random() * totalWeight
      for (const task of activeTasks) {
        accumulatedWeight += task.baseWeight
        if (random < accumulatedWeight) {
          if (this.actionTask?.name === task.name)
            break
          this.actionTask?.stop()
          this.actionTask = task
          task.trigger()
          break
        }
      }
      this.mood = Math.max(
        0,
        Math.min(100, this.mood + (Math.random() - 0.5) * 10),
      )
      this.lastTime = performance.now()
    }
  }
}

export { RandomTask }
