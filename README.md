# wine-fox

[简体中文](README.md) | [English](docs/README_EN.md)

![酒狐](docs/assets/PixPin_2025-06-22_19-12-34.webp)

## 安装依赖

`wine-fox`依赖 [three](https://www.npmjs.com/package/three) 和 [lodash](https://www.npmjs.com/package/lodash)（可选，部分示例中使用）。

```bash
pnpm install three lodash wine-fox
# 如果你需要typescript支持
pnpm install -D  @types/three @types/lodash
```

## 使用方式

- 具体 API 使用方式请参考类型文件。
- 注意：API 可能随时变动，请持续关注项目更新。

- 首先需要创建wine-fox实例

```JavaScript
// 此时仅初始化场景，模型资源并未加载
const model = new KanbanGirl(document.querySelector('#container'));
```

- 导入并加载模型

```JavaScript
import { urls } from 'wine-fox/assets';
await model.load(urls);
```

- 接下来就可以渲染场景了，你可能需要通过限制动画帧率来节省性能

```JavaScript
import { withFrameRateLimit } from 'wine-fox/tools';

const limit = withFrameRateLimit(60)(() => {
    // 这里的回调函数将会以每秒60帧的速度执行
});

limit.start();
```

- 如果需要更低的帧率

```JavaScript
const limit = withFrameRateLimit(30)(() => {});
```

- 如果不需要限制帧率

```JavaScript
const limit = withFrameRateLimit(-1)(() => {});
// 如果不需要帧率限制，直接使用requestAnimationFrame会是更优的选择
```

- 在渲染之前，需要`THREE.Clock`来确保在不同帧率下的模型保持一致的速度

```JavaScript
import * as THREE from 'three';
const clock = new THREE.Clock();
```

- 开始渲染

```JavaScript
const clock = new THREE.Clock();

const limit = withFrameRateLimit(60)(() => {
    model.update(clock.getDelta());
});

limit.start();
```

- 如果你需要让`wine-fox`的视线朝向鼠标的位置

```JavaScript
const mouse = {
    x: 0,
    y: 0,
};

const onMouseMove = (e) => {
    mouse.x = e.screenX
    mouse.y = e.screenY
};

window.addEventListener('mousemove', onMouseMove);

const limit = withFrameRateLimit(60)(() => {
    model.update(clock.getDelta());
    // 在这里进行设置
    model.lookAt(mouse);
});
```

- 如果需要适配dark模式，你可以这样做

```JavaScript
const model = new KanbanGirl(document.querySelector('#container'));
const isDarkMode = true;

function toggleDarkMode() {
  isDarkMode = !isDarkMode
  model?.setTheme(isDarkMode.value ? 'dark' : 'light')
}
```

![dark mode](docs/assets/dark.png)

### 在原生 JS 中使用

参考示例：

[examples/vanilla-project/src/main.ts](examples/vanilla-project/src/main.ts)

### 在 Vue 项目中使用

参考示例：

[examples/vue-project/src/App.vue](examples/vue-project/src/App.vue)

## 许可

驱动`wine-fox`的代码为[MIT license](https://opensource.org/licenses/MIT)许可。
`wine-fox`模型的许可证为[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/40/deed.en)，她来自[Yes Steve Model](https://modrinth.com/mod/yes-steve-model)。

---

如有问题或建议，欢迎提交 issue 或 PR。
