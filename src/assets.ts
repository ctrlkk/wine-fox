// @ts-expect-error 静态资源
import diamindSwordURL from './assets/diamond_sword.glb'
// @ts-expect-error 静态资源
import appleURL from './assets/minecraft/apple.png'
// @ts-expect-error 静态资源
import torchURL from './assets/torch.glb'
// @ts-expect-error 静态资源
import wineFoxURL from './assets/wine_fox.glb'

export const urls: {
  apple: string
  diamindSword: string
  torch: string
  wineFox: string
} = {
  apple: appleURL,
  diamindSword: diamindSwordURL,
  torch: torchURL,
  wineFox: wineFoxURL,
}
