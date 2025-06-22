import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three'

/**
 * 绑定 WASD 移动控制
 * @returns 清理函数
 */
function bindWASDMovement(camera: THREE.Camera, controls: OrbitControls, moveSpeed = 0.01): () => void {
  const direction = new THREE.Vector3() // 相机朝向
  const right = new THREE.Vector3() // 相机右侧方向
  const moveState = { forward: false, backward: false, left: false, right: false }

  // 按键按下事件
  const onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key.toLowerCase()) {
      case 'w':
        moveState.forward = true
        break
      case 's':
        moveState.backward = true
        break
      case 'd':
        moveState.left = true
        break
      case 'a':
        moveState.right = true
        break
    }
  }

  // 按键松开事件
  const onKeyUp = (event: KeyboardEvent): void => {
    switch (event.key.toLowerCase()) {
      case 'w':
        moveState.forward = false
        break
      case 's':
        moveState.backward = false
        break
      case 'd':
        moveState.left = false
        break
      case 'a':
        moveState.right = false
        break
    }
  }

  // 更新相机位置
  function updateMovement(): void {
    camera.getWorldDirection(direction)
    direction.y = 0 // 限制在 XZ 平面
    direction.normalize()

    right.crossVectors(camera.up, direction).normalize()

    const moveVector = new THREE.Vector3()
    if (moveState.forward)
      moveVector.add(direction)
    if (moveState.backward)
      moveVector.sub(direction)
    if (moveState.left)
      moveVector.sub(right)
    if (moveState.right)
      moveVector.add(right)

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(moveSpeed)
      camera.position.add(moveVector)
      controls.target.add(moveVector)
    }

    requestAnimationFrame(updateMovement)
  }

  // 绑定事件并启动移动循环
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  requestAnimationFrame(updateMovement)

  // 返回清理函数
  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  }
}

/**
 * 基于RAF的计时器
 * @param ms 等待时间 毫秒
 */
function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    const startTime = performance.now()

    function checkTime(currentTime: number) {
      const elapsed = currentTime - startTime
      if (elapsed >= ms) {
        resolve()
      }
      else {
        requestAnimationFrame(checkTime)
      }
    }

    requestAnimationFrame(checkTime)
  })
}

/**
 * 等待动画fade结束 beta
 * 理论上性能更好，但是使用了不安全的变量
 * @param animation 动画
 */
function waitFadeEndBeta(animation: THREE.AnimationAction): Promise<void> {
  return new Promise((resolve) => {
    const mixer = animation.getMixer()

    const checkFade = () => {
      // @ts-expect-error: _weightInterpolant是一个存在的私有变量
      const interpolant = animation._weightInterpolant
      if (!interpolant || mixer.time >= interpolant.parameterPositions[1]) {
        resolve()
        return
      }
      requestAnimationFrame(checkFade)
    }
    requestAnimationFrame(checkFade)
  })
}

/**
 * 等待 AnimationAction 的淡入或淡出效果结束，仅基于权重检查
 * @param animation - THREE.AnimationAction 对象
 * @param targetWeight - 目标权重，1 表示完全淡入，0 表示完全淡出
 * @param options - 配置选项
 * @param options.tolerance - 权重容差，处理浮点数精度问题，默认 0.01
 * @param options.maxIteraTions - 最大循环次数限制，防止无限等待，默认 1000
 * @returns 当动画权重稳定达到目标值时，返回一个 Promise 以通知结束
 */
function waitFadeEnd(
  animation: THREE.AnimationAction,
  targetWeight: 1 | 0,
  options: {
    tolerance?: number
    maxIteraTions?: number
  } = {},
): Promise<void> {
  const { tolerance = 0.01 } = options
  let { maxIteraTions = 1000 } = options

  return new Promise((resolve) => {
    let stableCount = 0
    const checkFade = () => {
      maxIteraTions--
      if (maxIteraTions <= 0)
        return
      const currentWeight = animation.getEffectiveWeight()
      if (Math.abs(currentWeight - targetWeight) <= tolerance) {
        // 如果权重连续多帧稳定，认为淡入淡出结束
        stableCount++
        if (stableCount >= 2) {
          resolve()
          return
        }
      }
      else {
        stableCount = 0
      }
      requestAnimationFrame(checkFade)
    }
    // 延迟一帧检查，确保淡入淡出开始
    requestAnimationFrame(() => requestAnimationFrame(checkFade))
  })
}

/**
 * 一个可以限制执行帧率的渲染器方法
 */
function frameRateThrottle<T extends (...args: unknown[]) => void>(task: T, fps: number): (...args: Parameters<T>) => void {
  const frameInterval = 1000 / fps
  let lastTime = 0
  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    const timestamp = performance.now()
    const delta = timestamp - lastTime
    if (delta <= frameInterval)
      return
    // 存储时间并修正误差
    lastTime = timestamp - delta % frameInterval
    task.apply(this, args)
  }
}

export {
  bindWASDMovement,
  frameRateThrottle,
  sleep,
  waitFadeEnd,
  waitFadeEndBeta,
}
