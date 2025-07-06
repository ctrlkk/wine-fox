import type { AnimationAction } from 'three'
import type { MainModel } from './model-object'
import { LoopRepeat } from 'three'
import { waitAnimationEnd, waitFadeEnd } from './tools'

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

  constructor(mainModel: MainModel, animationName?: string) {
    this.mainModel = mainModel
    this.name = animationName || ''
    if (animationName) {
      const animation = this.mainModel.animationsManage.get(animationName)
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

class Task1 extends TaskImpl {
  constructor(mainModel: MainModel) {
    super(mainModel)
  }
}

class Task2 extends TaskImpl {
  baseWeight: number = 0.4
  moodRange: [number, number] = [50, 100]

  constructor(mainModel: MainModel) {
    super(mainModel, 'game_win')
  }
}

class Task3 extends TaskImpl {
  baseWeight: number = 0.3
  moodRange: [number, number] = [0, 50]

  constructor(mainModel: MainModel) {
    super(mainModel, 'game_lost')
  }
}

class Task4 extends TaskImpl {
  baseWeight: number = 0.6
  moodRange: [number, number] = [30, 100]

  constructor(mainModel: MainModel) {
    super(mainModel, 'picnic')
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
}

class Task6 extends TaskImpl {
  baseWeight: number = 0.5
  moodRange: [number, number] = [0, 100]

  constructor(mainModel: MainModel) {
    super(mainModel)
  }

  trigger(): AnimationAction | undefined {
    const apple = this.mainModel.render.models.apple
    if (!apple)
      return
    this.mainModel.rightHand.add(apple)
    this.animation = apple.animations.eat().fadeIn(0.3).play()
    waitAnimationEnd(this.animation).then(() => {
      apple.object3d.visible = false
      this.animation?.fadeOut(0.3)
      waitFadeEnd(this.animation!, 0).then(() => {
        this.mainModel.rightHand.remove(apple)
      })
    })
    return this.animation
  }
}

class Task7 extends TaskImpl {
  baseWeight: number = 0.5
  moodRange: [number, number] = [0, 100]

  constructor(mainModel: MainModel) {
    super(mainModel)
  }

  trigger(): AnimationAction | undefined {
    const bottle = this.mainModel.render.models.bottle
    if (!bottle)
      return
    this.mainModel.rightHand.add(bottle)
    this.animation = bottle.animations.eat().fadeIn(0.3).play()
    waitAnimationEnd(this.animation).then(() => {
      this.animation?.fadeOut(0.3)
      waitFadeEnd(this.animation!, 0).then(() => {
        this.mainModel.rightHand.remove(bottle)
      })
    })
    return this.animation
  }
}

class RandomTask {
  private mainModel: MainModel
  private lastTime = 0
  private mood = 80
  private actionTask: Task | undefined

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
    tasks.push(new Task6(mainModel))
    tasks.push(new Task7(mainModel))
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
