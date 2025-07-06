import type GUI from 'lil-gui'
import type { OrbitControls } from 'three/examples/jsm/Addons.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { MainModel } from './model-object.ts'
import * as TWEEN from '@tweenjs/tween.js'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { waitAnimationEnd, waitFadeEnd } from './tools'

async function initSlashBlade(mainModel: MainModel, gui: GUI) {
  const animation1 = mainModel.animationsManage.get('slashblade:sneaking') as THREE.AnimationAction
  const animation2 = mainModel.animationsManage.get('slashblade:combo_a4ex') as THREE.AnimationAction
  const idle = mainModel.animationsManage.get('slashblade:idle') as THREE.AnimationAction

  // 拔刀剑刀身定位组
  const bladeLocator = mainModel.object3d.getObjectByName('BladeLocator')
  // 拔刀剑刀鞘定位组
  const sheathLocator = mainModel.object3d.getObjectByName('SheathLocator')
  // 左腰部(副手)
  const leftWaistLocator = mainModel.object3d.getObjectByName('LeftWaistLocator')
  // 右腰部
  const rightWaistLocator = mainModel.object3d.getObjectByName('RightWaistLocator')
  if (!bladeLocator || !sheathLocator || !leftWaistLocator || !rightWaistLocator) {
    console.error('拔刀剑定位组未找到')
    console.warn(!bladeLocator, !sheathLocator, !leftWaistLocator, !rightWaistLocator)
    return
  }

  const scale = 1.5
  {
    const sword = (await loadSlashBladeModel()).scene
    const sheath = (await loadSheathModel()).scene

    // 拔刀剑
    sword.rotation.x = -Math.PI * 1.5
    sword.scale.set(scale, scale, scale)
    sword.position.z = -0.75
    leftWaistLocator.add(sword)

    // 独立剑鞘
    sheath.rotation.x = Math.PI * 1.5
    sheath.rotation.z = Math.PI
    sheath.rotation.y = Math.PI * 1
    sheath.position.y = -0.05
    sheath.scale.set(scale, scale, scale)
  }

  // 待机动画
  idle.play().fadeIn(0.3)

  // 剑 鞘分离
  const sword = (await loadSlashBladeModel()).scene
  const sheath = (await loadSheathModel()).scene;
  (sword.getObjectByName('sheath') as THREE.Object3D).scale.set(0, 0, 0)

  sword.scale.set(scale, scale, scale)
  sheath.scale.set(scale, scale, scale)
  sword.visible = false
  sheath.visible = false

  sword.rotation.x = Math.PI * 1.5

  sheath.rotation.x = Math.PI * 1.5
  sheath.rotation.z = Math.PI
  sheath.rotation.y = Math.PI * 1
  sheath.position.y = -0.05

  bladeLocator.add(sword)
  sheathLocator.add(sheath)

  gui.add({
    async trigger() {
      idle.stop()

      // 准备架势
      animation1.clampWhenFinished = true
      animation1.reset().play().setLoop(THREE.LoopOnce, 1).fadeIn(0.3)
      await Promise.all([waitAnimationEnd(animation1), waitFadeEnd(animation1, 1)])

      sword.visible = true
      sheath.visible = true
      // 剑技
      animation1.stop()
      animation2.clampWhenFinished = true
      animation2.reset().play().setLoop(THREE.LoopOnce, 1).fadeIn(0.1)
      await Promise.all([waitAnimationEnd(animation2), waitFadeEnd(animation2, 1)])

      // 结束
      idle.reset().play()
      animation2.crossFadeTo(idle, 0.3, true)

      sword.visible = false
      sheath.visible = false
    },
  }, 'trigger').name('拔刀斩')
}

function loadSlashBladeModel() {
  return new Promise<GLTF>((resolve, reject) => {
    new GLTFLoader().load(new URL('@/assets/weapon.glb', import.meta.url).href, (gltf: GLTF) => {
      resolve(gltf)
    }, void 0, (err: unknown) => {
      reject(err)
    })
  })
}

function loadSheathModel() {
  return new Promise<GLTF>((resolve, reject) => {
    new GLTFLoader().load(new URL('@/assets/sheath.glb', import.meta.url).href, (gltf: GLTF) => {
      resolve(gltf)
    }, void 0, (err: unknown) => {
      reject(err)
    })
  })
}

function startCameraAnimation(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
  const endPos = { x: 2.18, y: 0.9, z: 4.9 }
  const startTarget = controls.target.clone()
  const endTarget = new THREE.Vector3(-1.8, 0.8, 0.8)

  // camera.rotation.set(-8.4, 0.74, 5.69);
  // controls.target.set(-1.8, 0.8, 0.8);

  new TWEEN.Tween(startPos)
    .to(endPos, 1000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.position.set(startPos.x, startPos.y, startPos.z)
    })
    .onComplete(() => {
      camera.position.copy(new THREE.Vector3(endPos.x, endPos.y, endPos.z))
    })
    .start()

  const startTime = performance.now()
  new TWEEN.Tween(startTarget)
    .to(endTarget, 2000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.lookAt(startTarget)
    })
    .onComplete(() => {
      controls.target.copy(endTarget)
      console.warn(`耗时${performance.now() - startTime}`)
    })
    .start()
}

export { initSlashBlade, startCameraAnimation }
