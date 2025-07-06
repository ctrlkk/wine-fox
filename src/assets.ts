// @ts-expect-error 静态资源
import diamindSword from './assets/diamond_sword.glb'
// @ts-expect-error 静态资源
import apple from './assets/minecraft/apple.png'
// @ts-expect-error 静态资源
import bottle from './assets/minecraft/glass_bottle.png'
// @ts-expect-error 静态资源
import torch from './assets/torch.glb'
// @ts-expect-error 静态资源
import wineFox from './assets/wine_fox.glb'

export interface Assets {
  apple: string
  diamindSword: string
  torch: string
  wineFox: string
  bottle: string
}

export const urls: Assets = {
  apple,
  diamindSword,
  torch,
  wineFox,
  bottle,
}
