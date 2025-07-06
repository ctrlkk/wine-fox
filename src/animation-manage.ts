import type { AnimationAction, AnimationClip, AnimationMixer } from 'three'
import { waitAnimationEnd } from './tools'

export class AnimationManage {
  public clips: AnimationClip[] = []
  public animations: Map<string, AnimationAction> = new Map()
  public mixer: AnimationMixer

  constructor(mixer: AnimationMixer, clips: AnimationClip[]) {
    this.mixer = mixer
    this.clips = clips

    const parallels = []
    const preParallels = []

    for (const clip of clips) {
      const action = mixer.clipAction(clip)
      if (this.isPreParallelAnimation(clip.name)) {
        preParallels.push(action)
      }
      else if (this.isParallelAnimation(clip.name)) {
        parallels.push(action)
      }
      this.animations.set(clip.name, action)
    }
    // preParallels.sort((a, b) => a.getClip().name.localeCompare(b.getClip().name))
    // parallels.sort((a, b) => a.getClip().name.localeCompare(b.getClip().name))
    parallels.reverse().forEach((item) => {
      item.play()
    })
    preParallels.reverse().forEach((item) => {
      this.play(item.getClip().name)
    })
  }

  private isParallelAnimation(name: string) {
    return /^parallel\d+$/.test(name)
  }

  private isPreParallelAnimation(name: string) {
    if (name === 'ear' || name === 'blink' || name === 'tail')
      return true
    return /^pre_parallel\d+$/.test(name)
  }

  public update(deltaTime: number) {
    this.mixer.update(deltaTime)
  }

  /**
   * 获取动画
   */
  public get(name: string): AnimationAction | undefined {
    return this.animations.get(name)
  }

  /**
   * 播放动画
   */
  public play(name: string) {
    const animation = this.get(name)
    if (!animation) {
      console.warn(`Animation ${name} not found`)
      return
    }
    this.animations.forEach((item) => {
      const clip = item.getClip()
      if (this.isParallelAnimation(clip.name)) {
        return
      }
      if (isConflict(clip, animation.getClip())) {
        item.stop()
        if (this.isPreParallelAnimation(clip.name)) {
          waitAnimationEnd(item).then(() => {
            animation.play()
          })
        }
      }
    })
    animation.play()
  }
}

/**
 * 判断两个动画剪辑是否存在冲突
 * 冲突的定义是两个动画中是否有相同名称的轨道（track）
 * @param animation1 - 第一个动画剪辑
 * @param animation2 - 第二个动画剪辑
 * @returns 如果存在相同名称的轨道，则返回 true，表示冲突；否则返回 false
 */
function isConflict(animation1: AnimationClip, animation2: AnimationClip): boolean {
  for (const track1 of animation1.tracks) {
    for (const track2 of animation2.tracks) {
      if (track1.name === track2.name) {
        return true
      }
    }
  }
  return false
}
