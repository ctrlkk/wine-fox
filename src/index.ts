import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import * as TWEEN from '@tweenjs/tween.js'
import { BloomEffect, ColorDepthEffect, EffectComposer, EffectPass, FXAAEffect, GodRaysEffect, RenderPass, SMAAEffect } from 'postprocessing'
import * as THREE from 'three'
import { InteractionManager } from 'three.interactive'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { getScreenPositionAndSize } from './animation-tools.js'
import { KanBanGirlModel, TorchModel } from './loader.js'
import { MainModel, Torch } from './model-object.js'
import './three-interactive.d'

class KanbanGirlRenderer {
  container: HTMLElement
  scene: THREE.Scene
  // 相机
  camera: THREE.PerspectiveCamera
  // 渲染器
  renderer: THREE.WebGLRenderer
  // 后期处理器
  composer: EffectComposer

  config = {
    // 渲染倍率
    renderScale: 1.5,
    // 抗锯齿类型
    currentAntiAliasing: 'SMAA',
  }

  constructor(container: HTMLElement, scene: THREE.Scene) {
    this.container = container
    this.scene = scene
    this.camera = this.initCamera(container)
    this.renderer = this.initRenderer(container)
    this.composer = this.initComposer(scene, this.camera, this.renderer)
    this.antiAliasing(this.composer, this.camera)
  }

  render(deltaTime: number) {
    this.renderer.render(this.scene, this.camera)
    this.composer.render(deltaTime)
  }

  dispose() {
    this.renderer.dispose()
    this.composer.dispose()
  }

  resize() {
    const { clientWidth, clientHeight } = this.container
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight)
    this.renderer.setPixelRatio(
      window.devicePixelRatio * this.config.renderScale,
    )
  }

  // 初始化相机
  initCamera(threeContainer: HTMLElement): THREE.PerspectiveCamera {
    const aspect = threeContainer.clientWidth / threeContainer.clientHeight
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 3000)
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)
    return camera
  }

  // 初始化渲染器
  initRenderer(threeContainer: HTMLElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio * this.config.renderScale)
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight)
    threeContainer.appendChild(renderer.domElement)
    // 启用阴影
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    return renderer
  }

  antiAliasing(composer: EffectComposer, camera: THREE.Camera) {
    if (this.config.currentAntiAliasing === 'SMAA') {
      composer.addPass(new EffectPass(camera, new SMAAEffect()))
    }
    if (this.config.currentAntiAliasing === 'FXAA') {
      composer.addPass(new EffectPass(camera, new FXAAEffect()))
    }
  }

  // 初始化后期处理器
  initComposer(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
  ) {
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    // 创建 Bloom 效果
    const bloomEffect = new BloomEffect({
      intensity: 0.3,
      luminanceSmoothing: 0.03,
      luminanceThreshold: 0.9,
      radius: 1,
    })
    // 色深
    const colorDepthEffect = new ColorDepthEffect()
    const effect = new EffectPass(camera, bloomEffect, colorDepthEffect)
    composer.addPass(effect)
    return composer
  }
}

type Theme = 'dark' | 'light'

class KanbanGirl {
  // 场景
  scene: THREE.Scene
  // 控制器
  controls: OrbitControls
  // 交互控制器
  interactionManager: InteractionManager
  // 渲染器
  renderer: KanbanGirlRenderer
  light!: {
    ambientLight: THREE.AmbientLight
    directionalLight: THREE.DirectionalLight
  }

  mainModel?: MainModel
  config = {
    // 阴影质量
    shadowSize: new THREE.Vector2(1024, 1024),
    // 全局光照设置
    ambientLight: {
      // 强度
      intensity: 0.3,
    },
  }

  protected theme: Theme = 'light'
  protected clock = new THREE.Clock()

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.renderer = new KanbanGirlRenderer(container, this.scene)
    this.controls = this.initControls(
      this.renderer.camera,
      this.renderer.renderer,
    )
    this.controls.dispose()
    this.interactionManager = new InteractionManager(
      this.renderer.renderer,
      this.renderer.camera,
      container,
    )
    this.buildLight(this.config.ambientLight)
    this.scene.add(this.light.ambientLight)
    this.setTheme('light')
  }

  update(timestamp: number, deltaTime: number) {
    this.renderer.render(deltaTime)
    this.controls.update(deltaTime)
    this.interactionManager.update()
    this.mainModel?.update(deltaTime)
    TWEEN.update(timestamp)
  }

  /**
   * 释放资源
   */
  dispose() {
    this.renderer.dispose()
    this.controls.dispose()
    this.interactionManager.dispose()
    this.mainModel?.dispose()
  }

  resize() {
    this.renderer.resize()
  }

  private themeDispose = () => {}

  async setTheme(theme: Theme) {
    this.theme = theme
    this.themeDispose()
    if (this.theme === 'dark') {
      this.scene.remove(this.light.directionalLight)
      const { torch, godRaysEffevt } = await this.initTorchModel(this.renderer)
      this.renderer.composer.addPass(godRaysEffevt)
      this.mainModel?.leftHand.add(torch)
      this.themeDispose = () => {
        this.renderer.composer.removePass(godRaysEffevt)
        this.mainModel?.leftHand.remove(torch)
      }
    }
    if (this.theme === 'light') {
      this.scene.add(this.light.directionalLight)
    }
  }

  /**
   * 3D空间看向屏幕空间的某一个点
   */
  lookAt(position: { x: number, y: number }) {
    if (!this.mainModel)
      return
    const headModel = this.mainModel.head.object3d
    const camera = this.renderer.camera
    const renderer = this.renderer.renderer
    const MAX_ANGLE = 0.3 // 最大旋转角度
    const ROTATION_SPEED = 0.05 // 每秒旋转速度

    let { screenX, screenY, pixelWidth, pixelHeight }
      = getScreenPositionAndSize(headModel, camera, renderer)
    screenX += window.screenX
    screenY += window.screenY

    const deltaX = position.x - screenX
    const deltaY = screenY - position.y
    const angleX = THREE.MathUtils.clamp(
      deltaY / pixelHeight,
      -MAX_ANGLE,
      MAX_ANGLE,
    )
    const angleY = THREE.MathUtils.clamp(
      deltaX / pixelWidth,
      -MAX_ANGLE,
      MAX_ANGLE,
    )

    const t = THREE.MathUtils.clamp(ROTATION_SPEED, 0, 1)
    headModel.rotation.x = THREE.MathUtils.lerp(
      headModel.rotation.x,
      angleX,
      t,
    )
    headModel.rotation.y = THREE.MathUtils.lerp(
      headModel.rotation.y,
      angleY,
      t,
    )
    return { pixelHeight, pixelWidth }
  }

  async load() {
    const mainModel = await this.initMainModel()
    mainModel.object3d.position.y = -2
    mainModel.object3d.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = false
        const mesh = child as THREE.Mesh
        const material = mesh.material as THREE.MeshStandardMaterial
        material.emissiveMap = material.map
        material.emissive = new THREE.Color(0xFFFFFF)
        material.emissiveIntensity = 0.1
        material.toneMapped = false
      }
    })
    this.scene.add(mainModel.object3d)
    this.mainModel = mainModel
    this.interactionManager.add(mainModel.object3d)
    return mainModel
  }

  /**
   * 创建灯光资源
   */
  private buildLight(ambient: { intensity: number }) {
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, ambient.intensity)
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 2)
    directionalLight.position.set(0, 10, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize = this.config.shadowSize
    this.light = {
      ambientLight,
      directionalLight,
    }
  }

  private initControls(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
  ): OrbitControls {
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = true
    controls.minDistance = 1
    controls.maxDistance = 50
    controls.maxPolarAngle = Math.PI / 2
    return controls
  }

  private async initMainModel() {
    const kanBanGirlModel = new KanBanGirlModel()
    const kanBanGirlGltf: GLTF = await kanBanGirlModel.load()
    const mainModel = new MainModel(
      kanBanGirlGltf.scene,
      kanBanGirlGltf.animations,
    )
    return mainModel
  }

  private async initTorchModel(renderer: KanbanGirlRenderer) {
    if (!this.mainModel)
      throw new Error('mainModel is not loaded')

    const torchModel = new TorchModel()
    const torchGltf: GLTF = await torchModel.load()
    torchGltf.scene.rotateX(Math.PI * 1.5)

    const fire = torchGltf.scene.getObjectByName('fire') as THREE.Object3D
    const torchLight = new THREE.PointLight(0xFFA500, 2, 5)
    torchLight.decay = torchLight.intensity / torchLight.distance
    torchLight.castShadow = true
    fire.add(torchLight)

    let godRaysEffevt!: EffectPass
    fire.traverse((child: THREE.Object3D<THREE.Object3DEventMap>) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const material = mesh.material as THREE.MeshStandardMaterial
        material.emissive = new THREE.Color(0xFFA500)
        material.emissiveIntensity = 0.5
        godRaysEffevt = new EffectPass(
          renderer.camera,
          new GodRaysEffect(renderer.camera, mesh),
        )
      }
    })
    const torch = new Torch(torchGltf.scene, this.mainModel.tools.animation)
    return {
      torch,
      godRaysEffevt,
    }
  }
}

export { KanbanGirl }
