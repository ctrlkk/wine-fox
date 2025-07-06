import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/**
 * 绑定 WASD 移动控制
 * @returns 清理函数
 */
function bindWASDMovement(camera: THREE.Camera, controls: OrbitControls, moveSpeed = 0.01): () => void {
  const direction = new THREE.Vector3() // 相机朝向
  const right = new THREE.Vector3() // 相机右侧方向
  const moveState = { forward: false, backward: false, left: false, right: false }
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
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  requestAnimationFrame(updateMovement)
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

/**
 * 从图片 URL 创建一个基于像素的模型
 * @param imageUrl - 图片的 URL 地址
 * @returns THREE.Group 对象，每个立方体对应图片中的一个非透明像素，颜色与像素颜色一致
 */
async function createModelFromImage(imageUrl: string): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
  const image = new Image()
  image.src = imageUrl
  await new Promise(resolve => image.onload = resolve)
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx)
    throw new Error('Canvas 2D context is null')
  ctx.drawImage(image, 0, 0)
  const imageData = ctx.getImageData(0, 0, image.width, image.height).data
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const index = (y * image.width + x) * 4
      const r = imageData[index] / 255
      const g = imageData[index + 1] / 255
      const b = imageData[index + 2] / 255
      const a = imageData[index + 3] / 255
      if (a > 0) {
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(r, g, b).convertSRGBToLinear(),
        })
        const cube = new THREE.Mesh(geometry, material)
        cube.position.set(x - image.width / 2, image.height / 2 - y, 0)
        group.add(cube)
      }
    }
  }
  return group
}

/**
 * 创建一个带帧率限制的动画回调包装器
 * @param fps - 目标帧率，默认 60 帧每秒
 * @returns 返回一个函数，接收一个回调函数，返回一个控制动画开始和停止的对象
 *
 * limiter.start() // 开始动画
 * limiter.stop()  // 停止动画
 */
function withFrameRateLimit(fps: number = 60) {
  return function (callback: (timestamp: number) => void) {
    let lastTime = 0
    const frameInterval = 1000 / fps
    let animationFrameId: number | null = null

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate)
      const delta = timestamp - lastTime

      if (delta >= frameInterval) {
        lastTime = timestamp - (delta % frameInterval)
        callback(timestamp)
      }
    }

    return {
      start: () => animate(0),
      stop: () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId)
          animationFrameId = null
        }
      },
    }
  }
}

const loader = new GLTFLoader()

export {
  bindWASDMovement,
  createModelFromImage,
  frameRateThrottle,
  getScreenPositionAndSize,
  loader,
  ndcToPixel,
  sleep,
  waitAnimationEnd,
  waitAnimationLoopEnd,
  waitFadeEnd,
  waitFadeEndBeta,
  withFrameRateLimit,
}
