import * as THREE from 'three'
import { AnimationManage } from './animation-manage'
import { RandomTask } from './random-task'
import { waitAnimationEnd, waitFadeEnd } from './tools'

class Animations {
  private mainModel: MainModel

  constructor(mainModel: MainModel) {
    this.mainModel = mainModel
  }

  public async cute() {
    const animationsManage = this.mainModel.animationsManage
    const extra5 = animationsManage.get('extra5')
    if (!extra5)
      throw new Error('无效动画extra5')
    // animationsManage.stopPreParallelConflicts(true, extra5)
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
  animationsManage: AnimationManage
  animations: Animations

  // 随机任务
  public randomTask: RandomTask

  constructor(object3d: THREE.Object3D, animations: THREE.AnimationClip[]) {
    this.object3d = object3d
    const head = object3d.getObjectByName('Head')
    const rightHandLocator = object3d.getObjectByName('RightHandLocator')
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

    this.animations = new Animations(this)
    this.randomTask = new RandomTask(this)
    animations.push(new THREE.AnimationClip('hold_mainhand:empty', -1, []))
    animations.push(new THREE.AnimationClip('hold_offhand:empty', -1, []))
    this.animationsManage = new AnimationManage(new THREE.AnimationMixer(this.object3d), animations)
  }

  public update(deltaTime: number) {
    this.animationsManage.update(deltaTime)
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
  add(holdObject: HoldObject): this {
    holdObject.holdType = 'offHand'

    holdObject.animations.hold().play().fadeIn(0.1)
    return super.add(holdObject)
  }

  remove(holdObject?: HoldObject | undefined): this {
    holdObject?.animations.hold().stop().fadeOut(0.1)
    return super.remove(holdObject)
  }
}

/**
 * 主手
 */
class RightHand extends Hand {
  add(holdObject: HoldObject): this {
    holdObject.holdType = 'mainHand'
    holdObject.animations.hold().play().fadeIn(0.1)
    return super.add(holdObject)
  }

  remove(holdObject?: HoldObject | undefined): this {
    holdObject?.animations.hold().stop().fadeOut(0.1)
    return super.remove(holdObject)
  }
}

interface HoldObjectAnimations {
  hold: () => THREE.AnimationAction
  swing: () => THREE.AnimationAction
  eat: () => THREE.AnimationAction
}

/**
 * 手持物
 */
class HoldObject<T extends HoldObjectAnimations = HoldObjectAnimations> {
  public mainModel: MainModel
  public object3d: THREE.Object3D<THREE.Object3DEventMap>
  public animations: T
  // 标记手持物类型
  public type = 'default'
  // 标记主副手
  public holdType: 'mainHand' | 'offHand' = 'mainHand'

  constructor(object: THREE.Object3D, mainModel: MainModel, holdObjectType: string = 'empty') {
    this.object3d = object
    this.mainModel = mainModel
    const rightHandHold = mainModel.animationsManage.get(`hold_mainhand:${holdObjectType}`)!
    rightHandHold.clampWhenFinished = true
    rightHandHold.setLoop(THREE.LoopOnce, 1)
    const leftHandHold = mainModel.animationsManage.get(`hold_offhand:${holdObjectType}`)!
    leftHandHold.clampWhenFinished = true
    leftHandHold.setLoop(THREE.LoopOnce, 1)
    const rightHandSwing = mainModel.animationsManage.get('swing_hand')!
    rightHandSwing.clampWhenFinished = true
    rightHandSwing.setLoop(THREE.LoopOnce, 1)
    const leftHandSwing = mainModel.animationsManage.get('use_offhand')!
    leftHandSwing.clampWhenFinished = true
    leftHandSwing.setLoop(THREE.LoopOnce, 1)

    this.animations = {
      hold: () => {
        if (this.holdType === 'mainHand')
          return rightHandHold
        return leftHandHold
      },
      swing: () => {
        if (this.holdType === 'mainHand')
          return rightHandSwing
        return leftHandSwing
      },
    } as T
  }
}

class Sword extends HoldObject<HoldObjectAnimations> {
  public object3d: THREE.Object3D<THREE.Object3DEventMap>
  public type = 'sword'

  constructor(object: THREE.Object3D, mainModel: MainModel) {
    super(object, mainModel, 'sword')
    this.object3d = object
    this.object3d.rotation.y = Math.PI * 0.5
    this.object3d.rotation.x = Math.PI * 1.4
    const rightHandSwing = mainModel.animationsManage.get('swing:sword')!
    rightHandSwing.clampWhenFinished = true
    rightHandSwing.setLoop(THREE.LoopOnce, 1)

    this.animations = {
      ...this.animations,
      swing: () => {
        if (this.holdType === 'mainHand')
          return rightHandSwing
        throw new Error('副手不能挥动')
      },
    }
  }
}

class Torch extends HoldObject {
  public type = 'torch'

  constructor(object: THREE.Object3D, mainModel: MainModel) {
    super(object, mainModel, 'axe')
  }
}

class Apple extends HoldObject {
  public type = 'apple'

  constructor(object: THREE.Object3D, mainModel: MainModel) {
    super(object, mainModel)

    const mainHandEat = mainModel.animationsManage.get('use_mainhand:eat')!
    const offHandEat = mainModel.animationsManage.get('use_offhand:eat')!

    this.animations.eat = () => {
      if (this.holdType === 'mainHand')
        return mainHandEat
      return offHandEat
    }
  }
}

export {
  Apple,
  Hand,
  Head,
  HoldObject,
  LeftHand,
  MainModel,
  RightHand,
  Sword,
  Torch,
}
