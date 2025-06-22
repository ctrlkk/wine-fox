import * as THREE from 'three'
import { AnimationTools, waitAnimationEnd } from './animation-tools'
import { RandomTask } from './random-task'
import { waitFadeEnd } from './tools'

/*
class Animation {
  public animationAction: THREE.AnimationAction;
  // 当前动画是否循环播放
  public loop: boolean = false;

  constructor(animationAction: THREE.AnimationAction) {
    this.animationAction = animationAction;
  }

  play() {
    this.animationAction.play().fadeIn(0.1);
    return this;
  }

  stop() {
    this.animationAction.stop();
    return this;
  }

  disabled() {
    return this;
  }
} */

class Animations {
  private mainModel: MainModel

  constructor(mainModel: MainModel) {
    this.mainModel = mainModel
  }

  public async cute() {
    const animationTools = this.mainModel.tools.animation
    const extra5 = animationTools.getAnimationByName('extra5')
    if (!extra5)
      throw new Error('无效动画extra5')
    animationTools.stopPreParallelConflicts(true, extra5)
    extra5.clampWhenFinished = true
    extra5.setLoop(THREE.LoopRepeat, 5)
    extra5.play().fadeIn(0.5)
    await waitAnimationEnd(extra5)
    extra5.fadeOut(0.5)
    await waitFadeEnd(extra5, 0)
    extra5.stop()
  }
}

class MainModel {
  public object3d: THREE.Object3D
  head: Head
  leftHand: LeftHand
  rightHand: RightHand
  mixer: THREE.AnimationMixer
  tools: {
    animation: AnimationTools
  }

  animations: Animations

  // 随机任务
  public randomTask: RandomTask

  constructor(object3d: THREE.Object3D, animations: THREE.AnimationClip[]) {
    this.object3d = object3d
    // 头部定位组
    const head = object3d.getObjectByName('Head')
    // 主手定位组
    const rightHandLocator = object3d.getObjectByName('RightHandLocator')
    // 副手定位组
    const leftHandLocator = object3d.getObjectByName('LeftHandLocator')
    if (!head)
      throw new Error('Head locator not found')
    if (!rightHandLocator)
      throw new Error('RightHandLocator not found')
    if (!leftHandLocator)
      throw new Error('LeftHandLocator not found')
    this.head = new Head(head)
    this.leftHand = new LeftHand(leftHandLocator)
    this.rightHand = new RightHand(rightHandLocator)

    this.mixer = new THREE.AnimationMixer(this.object3d)
    const animation = this.loadModelAction(this.mixer, animations)
    animation.run()
    this.tools = {
      animation,
    }
    this.animations = new Animations(this)
    this.randomTask = new RandomTask(this)
  }

  private loadModelAction(mixer: THREE.AnimationMixer, animations: THREE.AnimationClip[]) {
    const animationTools = new AnimationTools()
    const preParallel: Array<THREE.AnimationAction> = []
    const parallel: Array<THREE.AnimationAction> = []
    let ear!: THREE.AnimationAction
    let blink!: THREE.AnimationAction
    let tail!: THREE.AnimationAction
    for (const animation of animations) {
      const action = mixer.clipAction(animation)
      if (animation.name.startsWith('pre_parallel'))
        preParallel.push(action)
      else if (animation.name.startsWith('parallel'))
        parallel.push(action)
      else if (animation.name === 'ear')
        ear = action
      else if (animation.name === 'blink')
        blink = action
      else if (animation.name === 'tail')
        tail = action
      else animationTools.animations.push(action)
    }
    animationTools.parallelAnimations.push(...parallel)
    animationTools.preParallelAnimations.push(...preParallel)
    animationTools.preParallelAnimations.push(...[ear, blink, tail])
    return animationTools
  }

  public update(deltaTime: number) {
    this.mixer.update(deltaTime)
    this.randomTask.update()
  }

  dispose() {
    this.object3d.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose())
        }
        else {
          obj.material?.dispose()
        }
      }
    })
  }
}

/**
 * 头
 */
class Head {
  object3d: THREE.Object3D

  constructor(object: THREE.Object3D) {
    this.object3d = object
  }
}

/**
 * 手
 */
class Hand {
  object3d: THREE.Object3D<THREE.Object3DEventMap>
  private hold: HoldObject | undefined

  constructor(object: THREE.Object3D) {
    this.object3d = object
    const oldAdd = this.object3d.add.bind(this.object3d)
    const oldRemove = this.object3d.remove.bind(this.object3d)
    this.object3d.add = (...object: THREE.Object3D[]) => {
      return oldAdd(...object)
    }
    this.object3d.remove = (...object: THREE.Object3D[]) => {
      return oldRemove(...object)
    }
  }

  getHold() {
    return this.hold
  }

  add(holdObject: HoldObject): this {
    if (this.hold)
      this.remove(this.hold)
    this.object3d.add(holdObject.object3d)
    this.hold = holdObject
    return this
  }

  remove(holdObject?: HoldObject | undefined): this {
    if (!holdObject) {
      this.object3d.remove(...this.object3d.children)
      this.hold = void 0
    }
    else if (holdObject === this.hold) {
      this.object3d.remove(holdObject.object3d)
      this.hold = void 0
    }
    return this
  }
}

/**
 * 副手
 */
class LeftHand extends Hand {
  constructor(object: THREE.Object3D) {
    super(object)
  }

  add(holdObject: HoldObject): this {
    holdObject.animations.leftHandHold().play().fadeIn(0.1)
    return super.add(holdObject)
  }

  remove(holdObject?: HoldObject | undefined): this {
    holdObject?.animations.leftHandHold().stop().fadeOut(0.1)
    return super.remove(holdObject)
  }
}

/**
 * 主手
 */
class RightHand extends Hand {
  constructor(object: THREE.Object3D) {
    super(object)
  }

  add(holdObject: HoldObject): this {
    holdObject.animations.rightHandHold().play().fadeIn(0.1)
    return super.add(holdObject)
  }

  remove(holdObject?: HoldObject | undefined): this {
    holdObject?.animations.rightHandHold().stop().fadeOut(0.1)
    return super.remove(holdObject)
  }
}

interface HoldObjectAnimations {
  leftHandHold: () => THREE.AnimationAction
  rightHandHold: () => THREE.AnimationAction
}

/**
 * 手持物
 */
class HoldObject<T extends HoldObjectAnimations = HoldObjectAnimations> {
  public object3d: THREE.Object3D<THREE.Object3DEventMap>
  public animations: T
  public type = 'default'

  constructor(object: THREE.Object3D, animationTools: AnimationTools, holdObjectType: string = 'empty') {
    this.object3d = object
    const rightHandHold = animationTools.getAnimationByName(`hold_mainhand:${holdObjectType}`)
    const leftHandHold = animationTools.getAnimationByName(`hold_offhand:${holdObjectType}`)
    if (!leftHandHold || !rightHandHold)
      throw new Error('模型错误！！')
    rightHandHold.clampWhenFinished = true
    rightHandHold.setLoop(THREE.LoopOnce, 1)
    leftHandHold.clampWhenFinished = true
    leftHandHold.setLoop(THREE.LoopOnce, 1)

    this.animations = {
      leftHandHold: () => leftHandHold,
      rightHandHold: () => rightHandHold,
    } as T
  }
}

interface SwordAnimations extends HoldObjectAnimations {
  swing: () => THREE.AnimationAction
}

class Sword extends HoldObject<SwordAnimations> {
  public object3d: THREE.Object3D<THREE.Object3DEventMap>
  public type = 'sword'

  constructor(object: THREE.Object3D, animationTools: AnimationTools) {
    super(object, animationTools, 'sword')
    this.object3d = object
    this.object3d.rotation.y = Math.PI * 0.5
    this.object3d.rotation.x = Math.PI * 1.4
    const swing = animationTools.getAnimationByName('swing:sword')
    if (!swing)
      throw new Error('模型错误！！')
    swing.clampWhenFinished = true
    swing.setLoop(THREE.LoopOnce, 1)

    this.animations = {
      ...this.animations,
      swing: () => swing,
    }
  }
}

class Torch extends HoldObject {
  public type = 'torch'

  constructor(object: THREE.Object3D, animationTools: AnimationTools) {
    super(object, animationTools, 'axe')
  }
}

export {
  Hand,
  Head,
  HoldObject,
  LeftHand,
  MainModel,
  RightHand,
  Sword,
  Torch,
}
