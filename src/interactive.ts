import * as THREE from 'three'

/**
 * 控制器配置选项接口
 */
interface TouchControllerOptions {
  /**
   * 是否启用鼠标事件模拟触摸
   * @default true
   */
  enableMouse?: boolean
}

type EventType = 'touchstart' | 'touchmove' | 'touchend'

/**
 * 触摸事件回调函数类型
 */
interface TouchEventCallback {
  (event: TouchEvent | MouseEvent, intersected: THREE.Object3D[]): void
}

/**
 * Three.js 触摸交互控制器
 * 用于处理3D场景中的触摸交互事件
 */
class TouchController {
  private camera: THREE.Camera
  private domElement: HTMLElement
  private raycaster: THREE.Raycaster
  private pointer: THREE.Vector2
  private enabled: boolean
  private objects: THREE.Object3D[]
  private eventListeners: Map<EventType, TouchEventCallback[]>
  private options: TouchControllerOptions

  /**
   * 构造函数
   * @param camera - 场景相机
   * @param domElement - 绑定事件的DOM元素，默认为document.body
   * @param options - 控制器配置选项
   */
  constructor(camera: THREE.Camera, domElement: HTMLElement = document.body, options: TouchControllerOptions = {}) {
    this.camera = camera
    this.domElement = domElement
    this.objects = []
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.eventListeners = new Map()
    this.enabled = true
    this.options = {
      enableMouse: true,
      ...options,
    }
  }

  /**
   * 添加可交互的3D对象
   * @param object - Three.js Object3D对象或其子类实例
   */
  add(object: THREE.Object3D): void {
    if (!this.objects.includes(object)) {
      this.objects.push(object)
    }
  }

  /**
   * 移除可交互的3D对象
   * @param object - 要移除的Three.js Object3D对象
   */
  remove(object: THREE.Object3D): void {
    const index = this.objects.indexOf(object)
    if (index !== -1) {
      this.objects.splice(index, 1)
    }
  }

  /**
   * 更新控制器
   * 在渲染循环中调用此方法
   */
  update(): void {
    // 在此处可以添加需要每帧更新的逻辑
  }

  /**
   * 添加事件监听器
   * @param type - 事件类型
   * @param callback - 事件回调函数
   */
  addEventListener(type: EventType, callback: TouchEventCallback): void {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.push(callback)
    }
  }

  /**
   * 移除事件监听器
   * @param type - 事件类型
   * @param callback - 要移除的回调函数
   */
  removeEventListener(type: EventType, callback: TouchEventCallback): void {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 销毁控制器，移除所有事件监听
   */
  dispose(): void {
    this.objects = []
    this.eventListeners.clear()
  }
}

export default TouchController
