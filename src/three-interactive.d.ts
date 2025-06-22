import type { Intersection } from 'three'

declare module 'three' {
  /** three.interactive 支持的事件类型 */
  type InteractiveEventType
    = | 'mouseover' // 鼠标移入（冒泡）
      | 'mouseout' // 鼠标移出（冒泡）
      | 'mousedown' // 鼠标按下
      | 'mouseup' // 鼠标松开
      | 'click' // 点击
      | 'touchstart' // 触摸开始
      | 'touchmove' // 触摸移动
      | 'touchend' // 触摸结束
      | 'mouseenter' // 鼠标进入（不冒泡）
      | 'mouseleave' // 鼠标离开（不冒泡）

  interface Object3D {
    addEventListener: <T extends InteractiveEventType>(
      type: T,
      listener: (
        event: Intersection & {
          target: Object3D // 目标对象
          wasIntersectedOnMouseDown?: boolean // mouseup 时是否已按下
        }
      ) => void
    ) => void
  }
}
