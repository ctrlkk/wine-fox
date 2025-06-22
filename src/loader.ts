import type { Object3D } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
// @ts-expect-error 静态资源
import DiamondSwordGLTF from './assets/diamond_sword.glb'
// @ts-expect-error 静态资源
import torchGLTF from './assets/torch.glb'
// @ts-expect-error 静态资源
import wineFoxGLTF from './assets/wine_fox.glb'

const loader = new GLTFLoader()

interface ModelConfig {
  url: string
  onModelLoaded?: (model: Object3D) => void
}

class BaseModel {
  gltf?: GLTF
  private config: ModelConfig

  constructor(config: ModelConfig) {
    this.config = config
  }

  async load(onProgress?: (event: ProgressEvent) => void) {
    const gltf = await loader.loadAsync(this.config.url, onProgress)
    this.gltf = gltf
    if (this.config.onModelLoaded) {
      this.config.onModelLoaded(gltf.scene)
    }
    return gltf
  }
}

class KanBanGirlModel extends BaseModel {
  constructor() {
    super({
      url: wineFoxGLTF,
      onModelLoaded(model) {
        model.rotateY(Math.PI)
      },
    })
  }
}

class TorchModel extends BaseModel {
  constructor() {
    super({
      url: torchGLTF,
    })
  }
}

class DiamondSwordModel extends BaseModel {
  constructor() {
    super({
      url: DiamondSwordGLTF,
    })
  }
}

export { DiamondSwordModel, KanBanGirlModel, TorchModel }
