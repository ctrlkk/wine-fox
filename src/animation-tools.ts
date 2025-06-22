import * as THREE from 'three'

/**
 * 动画工具类，用于管理和控制动画的播放和冲突处理。
 */
class AnimationTools {
  readonly DEFAULT_FADE_TIME = 0.5

  /**
   * 并行动画 高优先级
   */
  public parallelAnimations: Array<THREE.AnimationAction> = []

  /**
   * 并行动画 低优先级
   */
  public preParallelAnimations: Array<THREE.AnimationAction> = []

  /**
   * 正在运行的动画
   */
  public animations: Array<THREE.AnimationAction> = []

  constructor() {}

  /**
   * 初始化方法
   */
  init() {}

  /**
   * 运行所有并行动画
   */
  run() {
    this.preParallelAnimations.forEach((animation) => {
      this.stopPreParallelConflicts(false, animation)
      animation.play()
    })
    this.parallelAnimations.forEach((animation) => {
      this.stopPreParallelConflicts(false, animation)
      animation.play()
    })
  }

  /**
   * 根据动画名称获取动画
   * @param animationName 动画名称
   * @returns 动画对象
   */
  getAnimationByName(animationName: string) {
    const animation = this.animations.find(
      action => action.getClip().name === animationName,
    )
    return animation
  }

  /**
   * 播放动画，并停止与之冲突的低优先级并行动画。
   * @param animation 要播放的动画
   */
  playAnimation(animation: THREE.AnimationAction) {
    for (const parallel of this.preParallelAnimations) {
      if (this.hasConflict(parallel.getClip(), animation.getClip())) {
        parallel.stop()
      }
    }
  }

  /**
   * 停止与当前动画冲突的低优先级并行动画，播放当前动画，播放完后重新播放冲突的动画。
   * @param selfHealing 是否自恢复
   * @param animations 当前要播放的动画
   * @returns 返回停止的动画列表
   */
  stopPreParallelConflicts(
    selfHealing: boolean = true,
    ...animations: THREE.AnimationAction[]
  ): THREE.AnimationAction[] {
    const stopAnimations: THREE.AnimationAction[] = []
    for (const animation of animations) {
      for (const action of this.preParallelAnimations) {
        if (this.hasConflict(animation.getClip(), action.getClip())) {
          action.stop()
          if (selfHealing) {
            action.clampWhenFinished = true
            stopAnimations.push(action)
          }
        }
      }
      if (selfHealing) {
        waitAnimationEnd(animation).then(() => {
          for (const action of stopAnimations) {
            action.play().fadeIn(this.DEFAULT_FADE_TIME)
          }
        })
      }
    }
    return stopAnimations
  }

  /**
   * 判断两个动画剪辑是否有冲突。
   * @param anim1 动画剪辑1
   * @param anim2 动画剪辑2
   * @returns 如果有冲突返回 true，否则返回 false
   */
  hasConflict(anim1: THREE.AnimationClip, anim2: THREE.AnimationClip): boolean {
    for (const track1 of anim1.tracks) {
      for (const track2 of anim2.tracks) {
        if (track1.name === track2.name) {
          return true
        }
      }
    }
    return false
  }
}

/**
 * udc坐标转屏幕坐标
 * @param ndcX NDC坐标X
 * @param ndcY NDC坐标Y
 * @param width 屏幕宽度
 * @param height 屏幕高度
 * @returns 屏幕坐标
 */
function ndcToPixel(
  ndcX: number,
  ndcY: number,
  width: number,
  height: number,
): { x: number, y: number } {
  const pixelX = ((ndcX + 1) / 2) * width
  const pixelY = ((1 - ndcY) / 2) * height
  return { x: pixelX, y: pixelY }
}

/**
 * 计算模型在屏幕上的位置和尺寸
 * @param model 模型对象
 * @param camera 相机对象
 * @param renderer 渲染器对象
 * @returns 模型在屏幕上的位置和尺寸
 */
function getScreenPositionAndSize(
  model: THREE.Object3D,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
): {
    screenX: number
    screenY: number
    pixelWidth: number
    pixelHeight: number
    screenVertices: { x: number, y: number }[]
  } {
  const worldPosition = new THREE.Vector3()
  model.getWorldPosition(worldPosition)
  const ndc = worldPosition.clone().project(camera)
  const { top, left, width, height }
    = renderer.domElement.getBoundingClientRect()
  let { x: screenX, y: screenY } = ndcToPixel(ndc.x, ndc.y, width, height)
  screenX += left
  screenY += top

  const box = new THREE.Box3().setFromObject(model)
  const vertices = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ]

  const screenVertices = vertices.map((v) => {
    const ndc = v.clone().project(camera)
    return {
      x: Math.round(((ndc.x + 1) * renderer.domElement.width) / 2),
      y: Math.round(((-ndc.y + 1) * renderer.domElement.height) / 2),
    }
  })

  // 计算模型在屏幕上的像素尺寸
  const minX = Math.min(...screenVertices.map(v => v.x))
  const maxX = Math.max(...screenVertices.map(v => v.x))
  const minY = Math.min(...screenVertices.map(v => v.y))
  const maxY = Math.max(...screenVertices.map(v => v.y))

  const pixelWidth = maxX - minX
  const pixelHeight = maxY - minY

  return {
    screenX, // 模型中心在屏幕上的 X 坐标
    screenY, // 模型中心在屏幕上的 Y 坐标
    pixelWidth, // 模型在屏幕上的宽度（像素）
    pixelHeight, // 模型在屏幕上的高度（像素）
    screenVertices, // 包围盒顶点在屏幕上的坐标
  }
}

/**
 * 等待动画循环完毕
 * @param animation 动画对象
 * @param loop 循环次数
 * @returns Promise对象，表示动画循环完毕
 */
function waitAnimationLoopEnd(
  animation: THREE.AnimationAction,
  loop: number,
): Promise<void> {
  let loopIndex = 0
  return new Promise((resolve) => {
    const func = (event: { action: THREE.AnimationAction }) => {
      if (event.action !== animation)
        return
      loopIndex++
      if (loopIndex === loop) {
        animation.getMixer().removeEventListener('loop', func)
        resolve()
      }
    }
    animation.getMixer().addEventListener('loop', func)
  })
}

/**
 * 等待动画结束
 * @param animation 动画对象
 * @returns Promise对象，表示动画结束
 */
function waitAnimationEnd(animation: THREE.AnimationAction): Promise<void> {
  return new Promise((resolve) => {
    const func = (event: { action: THREE.AnimationAction }) => {
      if (event.action !== animation)
        return
      resolve()
      animation.getMixer().removeEventListener('finished', func)
    }
    animation.getMixer().addEventListener('finished', func)
  })
}

export {
  AnimationTools,
  getScreenPositionAndSize,
  ndcToPixel,
  waitAnimationEnd,
  waitAnimationLoopEnd,
}
