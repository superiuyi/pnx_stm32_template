# Embedded Framework · 架构导览

一个可离线打开的单页网站，用来理解这个仓库的分层、子文件夹职责、调用链和加功能时该改哪里。

## 打开方式

直接双击：

```text
docs/architecture/index.html
```

不需要安装依赖、不需要启动服务器。所有 CSS/JS 都在本目录内，断网也能用。

## 页面里有什么

| 模块 | 作用 |
| --- | --- |
| 01 · 为什么分层 | “一锅炖”和“分层”的对比；模拟换板子，看改动范围差异；6 张可翻转的问题卡 |
| 02 · 架构地图 | 三栏：层 → 子文件夹 → 文件/接口；每个子文件夹含“谁在用 / 依赖谁 / 关键接口 / 注意” |
| 03 · 请求旅程 | 4 个场景：OLED、LED、RFID、IMU；逐步看控制流穿过哪一层 |
| 04 · 构建链路 | CMake target 依赖图；点节点看职责；可切换“只看主链” |
| 05 · 加功能向导 | 6 个常见任务：加线程、加传感器、换引脚、换板子、改串口、用 OLED |
| 06 · 文件词典 | 186 个条目（55 个子文件夹 + 文件/接口），支持搜索和按层筛选 |
| 07 · 小测验 | 4 道题，点选项立即反馈 |

## 验证

用无头 Edge 跑了 57 项交互测试：基础导航/场景/答题 21 项，细分地图/文件词典 36 项；没有页面错误。

## 数据来源

- 根目录与各层 README
- `CMakeLists.txt` / `CMakePresets.json` / 链接脚本
- `configs/user_config.json`
- `Thread/`、`modules/`、`devices/`、`bsp/`、`boards/` 的实际目录与源码

## 想修改内容

- 架构层、文件夹、场景、CMake 图、向导、测验：编辑 `app.js` 顶部的数据对象
- 颜色、排版、动画：编辑 `styles.css`
- 页面结构：编辑 `index.html`

## 网站里标注的几个“当前状态”

这些不是设计意图，而是检查源码时发现的现状：

- `Thread/CMakeLists.txt` 现在已收集 `thread.cpp`、`led.cpp`、`oled.cpp`
- `modules/oled/src/oled_test.cpp` 已改名为 `.cpp`，会被 modules 的 GLOB 收集
- `bmp.hpp` 里四张图（cat / horse / patrick / pig）都已存在
- `boards/wrapper/f407_cboard/src/init.cpp` 仍没有调用 `MX_I2C3_Init()`
- `OLED_Clear()` 仍用 `0xFF` 刷白屏；`HAL_I2C_Master_Transmit` 仍用 `HAL_MAX_DELAY`
- `oled_test.hpp` 里还留着旧的无参 `OLED_SendCmd()` 声明
- `Thread/bmi088.cpp` 当前内容与 `led.cpp` 重复，且没有加入构建

当前 F407 构建可以通过；网站会在对应页面用黄色提示标出这些点。
