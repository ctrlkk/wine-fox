import type { Assets } from './assets'
import { BloomEffect, ColorDepthEffect, EffectComposer, EffectPass, FXAAEffect, GodRaysEffect, RenderPass } from 'postprocessing'
import * as THREE from 'three'
import { InteractionManager } from 'three.interactive'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Apple, Bottle, MainModel, Torch } from './model-object'
import { createModelFromImage, getScreenPositionAndSize, loader } from './tools'

export interface Models {
  apple?: Apple
  wineFox?: MainModel
  torch?: Torch
  bottle?: Bottle
}

export class KanbanGirl {
  private container: HTMLDivElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer | undefined
  private interactionManager: InteractionManager | undefined
  private controls: OrbitControls | undefined
  private ambient: THREE.AmbientLight

  public mainModel: MainModel | undefined
  public models: Models = {}

  constructor(container: HTMLDivElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera()
    this.camera.position.z = 80
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
    })
    this.renderer.setPixelRatio(window.devicePixelRatio * 1)
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.container.appendChild(this.renderer.domElement)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.composer.addPass(new EffectPass(this.camera, new FXAAEffect()))
    const bloomEffect = new BloomEffect({
      intensity: 0.3,
      luminanceSmoothing: 0.03,
      luminanceThreshold: 0.9,
      radius: 1,
    })
    const colorDepthEffect = new ColorDepthEffect()
    const effectPass = new EffectPass(this.camera, bloomEffect, colorDepthEffect)
    this.composer.addPass(effectPass)

    this.interactionManager = new InteractionManager(this.renderer, this.camera, this.container)
    this.controls = new OrbitControls(this.camera, this.container)

    this.ambient = new THREE.AmbientLight(0xFFFFFF)
    this.scene.add(this.ambient)
    this.setTheme('light')
    this.resize()
  }

  /**
   * 加载模型资源
   * @param assets 资源路径对象
   * @returns Promise
   */
  async load(assets: Assets) {
    return Promise.all([loader.loadAsync(assets.wineFox), loader.loadAsync(assets.torch), createModelFromImage(assets.apple), createModelFromImage(assets.bottle)])
      .then(([gltf, ...args]) => {
        gltf.scene.rotateY(Math.PI)
        this.mainModel = new MainModel(this, gltf.scene, gltf.animations)
        this.mainModel.object3d.scale.set(20, 20, 20)
        const box = new THREE.Box3().setFromObject(this.mainModel.object3d)
        const size = box.getSize(new THREE.Vector3())
        this.mainModel.object3d.position.y = -size.y / 2
        this.scene.add(this.mainModel.object3d)
        this.interactionManager?.add(this.mainModel.object3d)
        this.mainModel.object3d.scale.set(20, 20, 20)
        this.models.wineFox = this.mainModel
        return args
      })
      .then(([gltf, ...args]) => {
        gltf.scene.rotateX(Math.PI * 1.5)
        this.models.torch = new Torch(gltf.scene, this.mainModel!)
        const light = new THREE.PointLight(0xFFA500, 1000)
        this.models.torch.object3d.getObjectByName('fire')?.add(light)
        this.models.torch.object3d.getObjectByName('fire')?.traverse((child: THREE.Object3D<THREE.Object3DEventMap>) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            const material = mesh.material as THREE.MeshStandardMaterial
            material.emissive = new THREE.Color(0xFFA500)
            material.emissiveIntensity = 0.5
            const effect = new EffectPass(
              this.camera,
              new GodRaysEffect(this.camera, mesh),
            )
            this.composer?.addPass(effect)
          }
        })
        return args
      })
      .then(([object, ...args]) => {
        object.scale.set(0.03, 0.03, 0.03)
        object.rotateX(Math.PI * -0.5)
        object.position.setZ(-0.2)
        const apple = new Apple(object, this.mainModel!)
        this.models.apple = apple
        return args
      })
      .then(([object, ...args]) => {
        object.scale.set(0.03, 0.03, 0.03)
        object.rotateX(Math.PI * -0.5)
        object.position.setZ(-0.2)
        const bottle = new Bottle(object, this.mainModel!)
        this.models.bottle = bottle
        return args
      })
  }

  getThreeInfo() {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      composer: this.composer,
    }
  }

  /**
   * 更新渲染和交互状态
   * @param deltaTime 渲染间隔时间，用于动画和交互的时间更新
   */
  update(deltaTime: number) {
    this.renderer.render(this.scene, this.camera)
    this.composer?.render(deltaTime)
    this.interactionManager?.update()
    this.controls?.update(deltaTime)
    this.mainModel?.update(deltaTime)
  }

  /**
   * 销毁组件
   */
  dispose() {
    this.renderer.dispose()
    this.composer?.dispose()
    this.composer?.dispose()
    this.interactionManager?.dispose()
    this.controls?.dispose()
    this.mainModel?.dispose()
  }

  /**
   * 重新调整渲染器和相机的尺寸
   */
  resize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  /**
   * 设置场景主题
   * @param theme 主题类型
   *
   * 根据传入的主题参数，调整场景中的光照等元素。
   */
  setTheme(theme: 'dark' | 'light' = 'light') {
    switch (theme) {
      case 'dark': {
        this.ambient.intensity = 0
        this.mainModel?.leftHand.add(this.models.torch!)
        break
      }
      case 'light': {
        this.ambient.intensity = 2
        break
      }
    }
  }

  /**
   * 使模型看向屏幕空间中的某一个点
   * @param position 屏幕空间中的目标点坐标，包含x和y属性
   * @param position.x x坐标
   * @param position.y y坐标
   */
  lookAt(position: { x: number, y: number }) {
    if (!this.mainModel)
      return
    const headModel = this.mainModel.head.object3d
    const camera = this.camera
    const renderer = this.renderer
    const MAX_ANGLE = 0.3 // 最大旋转角度
    const ROTATION_SPEED = 0.05 // 每秒旋转速度

    let { screenX, screenY, pixelWidth, pixelHeight } = getScreenPositionAndSize(headModel, camera, renderer)
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
}
