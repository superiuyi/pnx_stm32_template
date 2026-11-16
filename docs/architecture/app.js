/* =========================================================
   Embedded Framework · 架构导览
   数据 + 交互逻辑，无外部依赖
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let initialTheme = "dark";
try {
  initialTheme = localStorage.getItem("ef-theme") || "dark";
} catch (e) {
  /* file:// 或隐私模式下可能不可用 */
}

const state = {
  layer: "app",
  group: null,
  scenario: "oled",
  step: 0,
  autoPlay: null,
  whyView: "both",
  boardSwapped: false,
  graphNode: "exe",
  graphMode: "all",
  wizard: "thread",
  dictLayer: "all",
  dictQuery: "",
  quiz: new Map(),
  theme: initialTheme,
};

/* =========================================================
   数据：架构层
   ========================================================= */

const LAYERS = [
  {
    id: "app",
    name: "应用层",
    path: "Thread/",
    icon: "🎯",
    color: "#fbbf24",
    tagline: "你写“机器人要做什么”的地方",
    plain:
      "这里是整台车的指挥中心。你决定启动哪些服务、创建哪些线程，以及业务逻辑怎么走。它调用下层的服务、设备或 BSP，不直接碰寄存器。",
    responsible: ["创建应用线程", "决定启动哪些服务", "组织业务顺序"],
    notResponsible: ["直接操作寄存器", "解析 RFID 协议", "配置 CubeMX"],
    folders: [
      {
        name: "thread.cpp",
        path: "Thread/thread.cpp",
        desc: "应用的启动入口",
        detail:
          "实现 app_start()。BSP 里有一个空的弱符号 app_start，链接器会用这里的强符号覆盖它。这里只负责把线程和服务拉起来。",
        tags: ["入口", "app_start"],
      },
      {
        name: "led.cpp",
        path: "Thread/led.cpp",
        desc: "LED 线程",
        detail:
          "每 500ms 切换绿、红、蓝灯。代码很短，但能同时验证 ThreadX、BSP GPIO 和板级映射三件事。",
        tags: ["线程", "GPIO"],
      },
      {
        name: "oled.cpp",
        path: "Thread/oled.cpp",
        desc: "OLED 线程",
        detail:
          "初始化 OLED，循环显示猫、马、猪、Patrick 四张图，每张停 500ms。它调用 modules/oled 的驱动。",
        tags: ["线程", "I2C"],
      },
      {
        name: "bmi088.cpp",
        path: "Thread/bmi088.cpp",
        desc: "未接入的副本",
        detail:
          "当前内容和 led.cpp 重复，也没有加入构建。可以删除，或者改成真正的 IMU 线程。",
        tags: ["未接入", "可删除"],
        warn: "它现在不会参与编译，因为 Thread/CMakeLists.txt 没有收集它。",
      },
      {
        name: "CMakeLists.txt",
        path: "Thread/CMakeLists.txt",
        desc: "线程源文件清单",
        detail:
          "当前收集 thread.cpp、led.cpp、oled.cpp。新增线程文件仍然要手动加进 target_sources，CMake 不会自动发现。",
        tags: ["构建", "清单"],
        warn:
          "bmi088.cpp 没有加入；如果直接加入，会和 led.cpp 重复定义 led_start。",
      },
    ],
  },
  {
    id: "modules",
    name: "服务层",
    path: "modules/",
    icon: "⚙️",
    color: "#f472b6",
    tagline: "会自己开线程、持续干活的服务",
    plain:
      "这一层不是“一个器件的说明书”，而是“一个持续运行的服务”。它拥有线程、栈、缓冲区和生命周期，负责把设备数据变成应用能用的结果。",
    responsible: ["创建并管理后台线程", "组织采样/接收/解析循环", "发布结果或缓存"],
    notResponsible: ["直接写寄存器", "定义引脚", "决定业务策略"],
    folders: [
      {
        name: "imu/bmi088",
        path: "modules/imu/bmi088",
        desc: "BMI088 姿态服务",
        detail:
          "通过 SPI 读 BMI088，跑 ESKF，发布姿态；还包含温控线程。它需要 CMSIS-DSP，所以 bmi088 分支会链接 dsp。",
        tags: ["线程", "SPI", "ESKF"],
      },
      {
        name: "imu/dmimu",
        path: "modules/imu/dmimu",
        desc: "DMIMU 姿态服务",
        detail:
          "通过 CAN 读 DMIMU，发布姿态。和 BMI088 二选一，由 user_config.json 的 ahrs_device 决定。",
        tags: ["线程", "CAN"],
      },
      {
        name: "imu/include",
        path: "modules/imu/include",
        desc: "姿态公共接口",
        detail:
          "应用通过 msg 库订阅姿态输出。具体是 BMI088 还是 DMIMU，对应用透明。",
        tags: ["接口", "msg"],
      },
      {
        name: "rfid",
        path: "modules/rfid",
        desc: "RFID 服务",
        detail:
          "开机自动启动：读卡、蜂鸣提示、控制遥控输入权限。根 CMake 用 --wrap 把 ThreadX 启动入口接到这里，所以它不需要应用手动启动。",
        tags: ["自动启动", "UART", "线程"],
      },
      {
        name: "referee",
        path: "modules/referee",
        desc: "裁判服务",
        detail:
          "接收裁判系统串口数据，组帧、校验、解析、缓存；可以按类型注册回调。线程栈和优先级由 JSON 配置。",
        tags: ["线程", "UART", "协议"],
      },
      {
        name: "oled",
        path: "modules/oled",
        desc: "OLED 驱动",
        detail:
          "oled_test.cpp 实现 SSD1306 初始化、清屏、按页写图；bmp.hpp 放四张 const 位图。线程在 Thread/oled.cpp。",
        tags: ["驱动", "I2C"],
        warn:
          "wrapper 的 main 还缺 MX_I2C3_Init()；OLED_Clear 用 0xFF 会刷白屏；HAL 用了 HAL_MAX_DELAY。",
      },
    ],
  },
  {
    id: "devices",
    name: "设备层",
    path: "devices/",
    icon: "🔌",
    color: "#60a5fa",
    tagline: "具体器件的“说明书”，由别人调用",
    plain:
      "这一层知道“一个 LED、一个电机、一个遥控器怎么说话”，但不会自己开线程。它把协议、反馈、解码整理成函数，交给应用或服务层调用。",
    responsible: ["器件协议与反馈解析", "提供 init/read/write 等接口", "维护器件状态"],
    notResponsible: ["创建后台线程", "决定采样周期", "直接操作 HAL 寄存器"],
    folders: [
      {
        name: "led",
        path: "devices/led",
        desc: "LED 器件",
        detail:
          "F407 用 GPIO 三色灯，H723 用 WS2812。提供 on/toggle/blink/all_off，不创建线程。",
        tags: ["GPIO", "WS2812"],
      },
      {
        name: "buzzer",
        path: "devices/buzzer",
        desc: "蜂鸣器",
        detail:
          "用 PWM 播放提示音序列。play/update 由调用方驱动，不创建线程。",
        tags: ["PWM", "提示音"],
      },
      {
        name: "motor/dji",
        path: "devices/motor/dji",
        desc: "DJI 电机",
        detail:
          "M3508 / M2006 / GM6020 的协议、反馈和 manager。发送回调由应用提供，把逻辑总线映射到实际 CAN。",
        tags: ["CAN", "电机"],
      },
      {
        name: "motor/dm",
        path: "devices/motor/dm",
        desc: "DM 电机",
        detail: "DM4310 / DM8009P 等达妙电机，包含固件模式、特殊指令和反馈解析。",
        tags: ["CAN", "电机"],
      },
      {
        name: "motor/lk",
        path: "devices/motor/lk",
        desc: "LK 电机",
        detail: "LK8016 / LK9025 等瓴控电机。",
        tags: ["CAN", "电机"],
      },
      {
        name: "motor/motor",
        path: "devices/motor/motor",
        desc: "电机公共类型",
        detail: "控制模式、反馈结构、结果码等基础定义。",
        tags: ["类型", "电机"],
      },
      {
        name: "remoter/dr16",
        path: "devices/remoter/dr16",
        desc: "DR16 遥控",
        detail: "18 字节一帧、100000 baud、8E1。解码成归一化摇杆和按键。",
        tags: ["UART", "遥控"],
      },
      {
        name: "remoter/vt03",
        path: "devices/remoter/vt03",
        desc: "VT03 遥控",
        detail: "21 字节一帧、115200 baud、8N1。",
        tags: ["UART", "遥控"],
      },
      {
        name: "remoter/ps2",
        path: "devices/remoter/ps2",
        desc: "PS2 手柄",
        detail: "SPI 模式 3、LSB first，解码摇杆和按键。F407 默认未配置。",
        tags: ["SPI", "手柄"],
      },
      {
        name: "remoter/remoter",
        path: "devices/remoter/remoter",
        desc: "遥控权限",
        detail:
          "统一控制 DR16/VT03/PS2 的输出是否允许。RFID 服务会调用 set_enabled(false) 来限制遥控。",
        tags: ["权限", "遥控"],
      },
      {
        name: "rfid",
        path: "devices/rfid",
        desc: "RFID 协议",
        detail:
          "A3 读块请求和字节流解码。串口、线程、蜂鸣器时序由 modules/rfid 管。",
        tags: ["协议", "UART"],
      },
      {
        name: "ui",
        path: "devices/ui",
        desc: "裁判 UI",
        detail:
          "画线、字符串、图形，周期发送。共享串口由应用统一协调。",
        tags: ["UI", "UART"],
      },
    ],
  },
  {
    id: "libs",
    name: "基础设施层",
    path: "libs/",
    icon: "🧰",
    color: "#a78bfa",
    tagline: "和硬件无关的通用工具",
    plain:
      "这一层是“工具箱”：状态码、CRC、数学、滤波器、PID、消息发布订阅。它不碰引脚，也不创建线程，谁需要谁链接。",
    responsible: ["通用算法与数据结构", "状态码/回调/消息", "可复用的头文件工具"],
    notResponsible: ["读写硬件", "创建线程", "知道具体板子"],
    folders: [
      {
        name: "types",
        path: "libs/types",
        desc: "状态码与回调",
        detail: "pnxtypes::status（ok/busy/timeout…）和轻量 callback，不动态分配。",
        tags: ["状态码", "callback"],
      },
      {
        name: "msg",
        path: "libs/msg",
        desc: "最新值发布订阅",
        detail:
          "基于 ThreadX mutex 的 topic。发布者覆盖旧值，订阅者读最新值；适合姿态这类“只关心最新”的数据。",
        tags: ["ThreadX", "topic"],
      },
      {
        name: "crc",
        path: "libs/crc",
        desc: "CRC 校验",
        detail: "CRC8、CRC16、Modbus CRC16 的计算、校验和追加。",
        tags: ["CRC", "协议"],
      },
      {
        name: "math",
        path: "libs/math",
        desc: "数学工具",
        detail: "常量、限幅、回绕、三维向量、四元数、欧拉角、反量化。",
        tags: ["数学", "几何"],
      },
      {
        name: "filters",
        path: "libs/filters",
        desc: "滤波器",
        detail: "Biquad 二阶滤波、Butterworth 高通、IIR 低通。",
        tags: ["滤波", "信号"],
      },
      {
        name: "control",
        path: "libs/control",
        desc: "PID 控制",
        detail:
          "位置式 PID，支持积分分离、变速积分、积分限幅、微分先行等组合模式。",
        tags: ["PID", "控制"],
      },
    ],
  },
  {
    id: "bsp",
    name: "外设层",
    path: "bsp/",
    icon: "🔧",
    color: "#34d399",
    tagline: "把 HAL 翻译成“读、写、发、收”",
    plain:
      "BSP 是硬件和上层之间的翻译官。它把 HAL 的句柄、状态、回调包装成更简单的接口，让设备和模块不用直接面对寄存器细节。",
    responsible: ["GPIO/SPI/CAN/UART/PWM 操作", "统一状态码与回调", "按板子选择实现"],
    notResponsible: ["定义业务逻辑", "解析器件协议", "创建应用线程"],
    folders: [
      {
        name: "gpio",
        path: "bsp/gpio",
        desc: "引脚读写/翻转",
        detail: "read/write/toggle/set_active，支持有效电平。header-only。",
        tags: ["GPIO", "header-only"],
      },
      {
        name: "spi",
        path: "bsp/spi",
        desc: "SPI 收发",
        detail: "阻塞、中断、DMA 的单向/全双工传输、状态与中止。",
        tags: ["SPI", "DMA"],
      },
      {
        name: "can",
        path: "bsp/can",
        desc: "CAN / FDCAN",
        detail:
          "经典 CAN 和 CAN FD、接收回调、错误通知。H723 编译 fdcan.cpp，F407 编译 bxcan.cpp。",
        tags: ["CAN", "按板选择"],
      },
      {
        name: "usart",
        path: "bsp/usart",
        desc: "串口",
        detail: "阻塞/DMA 发送、线路配置、接收到空闲（RX to idle）。",
        tags: ["UART", "DMA"],
      },
      {
        name: "pwm",
        path: "bsp/pwm",
        desc: "PWM",
        detail: "启停、占空比、周期、脉宽。周期由同一定时器的所有通道共享。",
        tags: ["PWM", "定时器"],
      },
      {
        name: "adc",
        path: "bsp/adc",
        desc: "ADC",
        detail: "轮询、中断、DMA、校准和转换状态。当前板级配置只有 H723 启用。",
        tags: ["ADC", "H723"],
      },
      {
        name: "dwt",
        path: "bsp/dwt",
        desc: "微秒计时",
        detail: "周期计数、微秒时间线、时间差与忙等待延时。",
        tags: ["DWT", "计时"],
      },
      {
        name: "usb",
        path: "bsp/usb",
        desc: "USB CDC",
        detail: "CDC ACM 收发、连接状态、接收回调。USBX 由 BSP 初始化。",
        tags: ["USB", "CDC"],
      },
      {
        name: "threadx",
        path: "bsp/threadx",
        desc: "RTOS 接入",
        detail:
          "tx_application_define、弱 app_start、USB 接收线程。应用的 app_start 会覆盖这里的弱实现。",
        tags: ["ThreadX", "app_start"],
      },
      {
        name: "bsp",
        path: "bsp/bsp",
        desc: "公共状态转换",
        detail: "把 HAL 状态统一转成 pnxtypes::status。",
        tags: ["状态码", "辅助"],
      },
    ],
  },
  {
    id: "board",
    name: "板级层",
    path: "boards/",
    icon: "🧩",
    color: "#22d3ee",
    tagline: "告诉工程“这块板子是什么”",
    plain:
      "板级层把 CubeMX 生成的硬件代码、手写的启动入口、引脚映射、内存布局和链接脚本接在一起。它是“换板子”时主要改的地方。",
    responsible: ["CubeMX 生成代码", "手写 main() 与资源映射", "链接脚本与内存布局"],
    notResponsible: ["业务逻辑", "器件协议", "应用线程"],
    folders: [
      {
        name: "cubemx/f407_cboard",
        path: "boards/cubemx/f407_cboard",
        desc: "F407 的 CubeMX 工程",
        detail:
          "HAL、启动文件、链接脚本、ThreadX/USBX 都由 CubeMX 生成。自动生成，别手改；要改逻辑请放 wrapper。",
        tags: ["生成代码", "F407"],
      },
      {
        name: "cubemx/h723_mc02",
        path: "boards/cubemx/h723_mc02",
        desc: "H723 的 CubeMX 工程",
        detail: "同上，另一块板。H723 有 FDCAN、USBX、更多定时器。",
        tags: ["生成代码", "H723"],
      },
      {
        name: "wrapper/f407_cboard",
        path: "boards/wrapper/f407_cboard",
        desc: "F407 手写接入层",
        detail:
          "真正的 main()、config.hpp 引脚映射、peripherals.hpp 句柄映射、memory.hpp 内存约束。CubeMX 重新生成不会覆盖这里。",
        tags: ["手写", "main", "映射"],
      },
      {
        name: "wrapper/h723_mc02",
        path: "boards/wrapper/h723_mc02",
        desc: "H723 手写接入层",
        detail: "同上，另一块板的 main、映射和内存约束。",
        tags: ["手写", "main", "映射"],
      },
      {
        name: "memory",
        path: "boards/memory",
        desc: "链接脚本",
        detail:
          "规定 Flash、RAM、CCM RAM 的地址和段布局。_estack、_sdata、_ebss 等符号都在这里定义。",
        tags: ["链接脚本", "内存"],
      },
      {
        name: "dsp",
        path: "boards/dsp",
        desc: "CMSIS-DSP",
        detail:
          "BMI088 的 ESKF 用到的矩阵/向量函数。只在 bmi088 分支链接。",
        tags: ["DSP", "BMI088"],
      },
      {
        name: "CMakeLists.txt",
        path: "boards/CMakeLists.txt",
        desc: "板级构建入口",
        detail:
          "校验 BOARD、选择链接脚本、加入 cubemx/dsp/wrapper。换板子时 CMake preset 和这里会一起变化。",
        tags: ["构建", "BOARD"],
      },
    ],
  },
  {
    id: "hardware",
    name: "硬件",
    path: "STM32",
    icon: "🧠",
    color: "#94a3b8",
    tagline: "真正执行代码、读写外设的芯片",
    plain:
      "代码最终跑在 STM32F407 或 STM32H723 上。GPIO、I2C、SPI、UART、CAN、定时器、USB 都是芯片里的外设，通过寄存器控制。",
    responsible: ["执行机器码", "提供外设", "响应中断"],
    notResponsible: ["理解业务", "知道 C++ 名字", "自动找数据"],
    folders: [
      {
        name: "STM32F407 / STM32H723",
        path: "芯片",
        desc: "两块目标 MCU",
        detail:
          "F407：Cortex-M4，1MB Flash，128KB SRAM，64KB CCM。H723：Cortex-M7，更多外设和 RAM。",
        tags: ["MCU", "Cortex-M"],
      },
      {
        name: "GPIO / I2C / SPI / UART / CAN / TIM / USB",
        path: "外设",
        desc: "芯片里的硬件模块",
        detail:
          "代码通过这些外设和外部器件通信。寄存器地址通常在 0x40000000 附近，和变量所在的 RAM 不是一回事。",
        tags: ["外设", "寄存器"],
      },
    ],
  },
  {
    id: "config",
    name: "配置层",
    path: "configs/",
    icon: "🎛️",
    color: "#facc15",
    crosscut: true,
    tagline: "整台车的设置面板（横切所有层）",
    plain:
      "配置层不参与运行时调用，但它决定所有层的资源选择：用哪个串口、哪个 CAN、哪个 IMU、线程优先级和栈多大。改 JSON，生成 C++ 头。",
    responsible: ["集中放用户参数", "校验资源冲突", "生成 user_config.hpp"],
    notResponsible: ["初始化硬件", "创建线程", "处理业务"],
    folders: [
      {
        name: "user_config.json",
        path: "configs/user_config.json",
        desc: "用户设置",
        detail:
          "USB 开关、串口/CAN/PS2 资源、IMU 后端、RFID、遥控、PID、线程优先级和栈大小。改这里，不手改生成头。",
        tags: ["JSON", "设置"],
      },
      {
        name: "scripts",
        path: "configs/scripts",
        desc: "生成器",
        detail:
          "读取 JSON、校验数值/资源冲突、生成 user_config.hpp。CMake 配置阶段自动执行。",
        tags: ["CMake", "校验"],
      },
      {
        name: "include/user_config.hpp",
        path: "configs/include/user_config.hpp",
        desc: "生成结果",
        detail:
          "代码里看到的 user_config::xxx 都来自这里。不要手改；改 JSON 后重新配置。",
        tags: ["生成", "C++"],
      },
    ],
  },
  {
    id: "build",
    name: "构建层",
    path: "CMake",
    icon: "🏗️",
    color: "#94a3b8",
    crosscut: true,
    tagline: "把源码、库、链接脚本凑成固件（横切所有层）",
    plain:
      "CMake 不参与运行时，但它决定哪些源文件被编译、哪些头文件路径生效、链接哪个库、用哪个链接脚本。INTERFACE 库是“清单”，不是产物。",
    responsible: ["收集源码", "传递头文件路径", "选择板卡与链接脚本"],
    notResponsible: ["执行代码", "管理线程", "处理硬件中断"],
    folders: [
      {
        name: "CMakeLists.txt",
        path: "CMakeLists.txt",
        desc: "顶层构建入口",
        detail:
          "创建 embedded_framework，选择 BOARD 和工具链，按顺序加入 boards/libs/bsp/devices/modules/Thread，最后链接 modules。",
        tags: ["CMake", "入口"],
      },
      {
        name: "CMakePresets.json",
        path: "CMakePresets.json",
        desc: "构建预设",
        detail:
          "f407_cboard / h723_mc02 两套配置：生成器、构建目录、BOARD、Debug。命令：cmake --preset f407_cboard。",
        tags: ["preset", "板卡"],
      },
      {
        name: "工具链文件",
        path: "boards/cubemx/<board>/cmake/gcc-arm-none-eabi.cmake",
        desc: "交叉编译说明书",
        detail:
          "告诉 CMake 用 arm-none-eabi-gcc，CPU 参数、浮点 ABI、链接选项、.elf 后缀。必须在 project() 之前加载。",
        tags: ["交叉编译", "工具链"],
      },
      {
        name: "链接脚本",
        path: "boards/memory/<board>.ld",
        desc: "内存布局",
        detail:
          "定义 FLASH/RAM/CCM 的地址和大小，把 .isr_vector/.text/.rodata 放 Flash，.data/.bss/堆栈放 RAM。",
        tags: ["链接", "内存"],
      },
    ],
  },
];

const layerById = (id) => LAYERS.find((l) => l.id === id);

/* =========================================================
   细粒度数据：每个子文件夹里的文件 / 接口 / 依赖 / 注意
   key = `${layerId}::${folder.name}`
   ========================================================= */

const C = (name, path, desc, detail = "", tags = [], kind = "file") => ({
  name,
  path,
  desc,
  detail,
  tags,
  kind,
});

const groupInfo = (children, usedBy = [], dependsOn = [], api = [], pitfalls = []) => ({
  children,
  usedBy,
  dependsOn,
  api,
  pitfalls,
});

const GROUP_DETAILS = {
  /* ---------------- 应用层 ---------------- */
  "app::thread.cpp": groupInfo(
    [
      C("app_start()", "Thread/thread.cpp", "应用启动入口", "BSP 的弱符号 app_start 被这里的强符号覆盖；调度器启动前调用，只负责创建线程。", ["入口", "extern C"], "function"),
      C("led_start() / oled_start()", "Thread/thread.cpp", "应用线程启动函数", "声明在 thread.cpp 顶部，定义分别在 led.cpp 和 oled.cpp。", ["线程"], "function"),
    ],
    ["BSP 的 tx_application_define（弱钩子）"],
    ["Thread/led.cpp", "Thread/oled.cpp", "tx_api.h"],
    ["app_start"],
    ["不要在 app_start 里 sleep/阻塞", "只能有一个强 app_start"]
  ),
  "app::led.cpp": groupInfo(
    [
      C("led_thread / stack", "Thread/led.cpp", "线程控制块 + 1KB 静态栈", "static 存储，线程活到固件结束。", ["static", "ThreadX"], "data"),
      C("entry(ULONG)", "Thread/led.cpp", "LED 线程入口", "每 500ms 切换绿/红/蓝灯，永不返回。", ["入口"], "function"),
      C("led_start()", "Thread/led.cpp", "创建 LED 线程", "优先级 15，TX_NO_TIME_SLICE，TX_AUTO_START。", ["线程"], "function"),
    ],
    ["Thread/thread.cpp 的 app_start"],
    ["bsp/gpio", "boards/wrapper 的 board::led", "tx_api.h"],
    ["led_start"],
    ["栈和 TCB 必须 static/全局", "线程函数不能 return"]
  ),
  "app::oled.cpp": groupInfo(
    [
      C("oled_thread / stack", "Thread/oled.cpp", "OLED 线程 + 1KB 静态栈", "优先级 15，和 LED 线程同级。", ["static", "ThreadX"], "data"),
      C("entry(ULONG)", "Thread/oled.cpp", "OLED 线程入口", "先 OLED_Init()，再循环显示 4 张图，每张停 500ms。", ["入口"], "function"),
      C("oled_start()", "Thread/oled.cpp", "创建 OLED 线程", "调用 tx_thread_create；驱动在 modules/oled。", ["线程"], "function"),
    ],
    ["Thread/thread.cpp 的 app_start"],
    ["modules/oled", "bmp.hpp", "tx_api.h"],
    ["oled_start"],
    ["I2C3 必须在 main 里初始化", "OLED_Clear 用 0xFF 会刷白屏"]
  ),
  "app::bmi088.cpp": groupInfo(
    [
      C("led 的副本", "Thread/bmi088.cpp", "当前内容与 led.cpp 重复", "没有加入 Thread/CMakeLists.txt，不参与编译。", ["未接入", "可删除"], "file"),
    ],
    [],
    ["与 led.cpp 相同的依赖"],
    [],
    ["如果加入构建会和 led.cpp 重复定义 led_start", "建议删除或改成真正的 IMU 线程"]
  ),
  "app::CMakeLists.txt": groupInfo(
    [
      C("target_sources", "Thread/CMakeLists.txt", "把 thread.cpp、led.cpp、oled.cpp 加入固件", "新线程文件必须加到这里，否则链接时找不到定义。", ["CMake"], "file"),
    ],
    ["顶层 add_subdirectory(Thread)"],
    ["embedded_framework target"],
    [],
    ["bmi088.cpp 没有加入", "新增 .cpp 后要重新 configure"]
  ),

  /* ---------------- 服务层 ---------------- */
  "modules::imu/bmi088": groupInfo(
    [
      C("bmi088.hpp / bmi088.cpp", "modules/imu/bmi088", "BMI088 寄存器驱动", "SPI 读写、初始化、原始加速度/角速度；不创建线程。", ["SPI", "驱动"], "driver"),
      C("bmi088_service.cpp", "modules/imu/bmi088/src/bmi088_service.cpp", "姿态服务线程", "读传感器、跑 ESKF、发布 imu::attitude::output；优先级 3、栈 8192。", ["线程", "ESKF"], "thread"),
      C("bmi088_heater.cpp", "modules/imu/bmi088/src/bmi088_heater.cpp", "温控线程", "用 PWM 控制加热，PID 参数来自 user_config.json；F407 默认关闭。", ["线程", "PWM"], "thread"),
    ],
    ["应用调用 imu::start_bmi088()", "姿态订阅者"],
    ["bsp/spi", "bsp/pwm（加热）", "libs/math", "libs/msg", "boards/dsp", "configs"],
    ["imu::start_bmi088", "imu::attitude::output"],
    ["不会自动启动，应用要显式调用", "bmi088 分支才链接 dsp", "F407 的加热默认关闭", "服务线程优先级比 RFID 高"]
  ),
  "modules::imu/dmimu": groupInfo(
    [
      C("dmimu.hpp / dmimu.cpp", "modules/imu/dmimu", "DMIMU 设备驱动", "CAN 组帧、请求/主动模式、反馈解析。", ["CAN", "驱动"], "driver"),
      C("dmimu_service.cpp", "modules/imu/dmimu/src/dmimu_service.cpp", "姿态服务线程", "读 DMIMU，发布同一姿态 topic；不走 ESKF。", ["线程", "CAN"], "thread"),
    ],
    ["应用调用 imu::start_dmimu()", "姿态订阅者"],
    ["bsp/can", "libs/msg", "configs"],
    ["imu::start_dmimu", "imu::attitude::output"],
    ["请求模式要传共享 CAN 互斥量", "和 bmi088 二选一，由 ahrs_device 决定"]
  ),
  "modules::imu/include": groupInfo(
    [
      C("attitude.hpp", "modules/imu/include/attitude.hpp", "姿态状态与 topic", "定义 source/phase/state 和 imu::attitude::output。", ["接口", "msg"], "header"),
      C("attitude_eskf.hpp", "modules/imu/include/attitude_eskf.hpp", "ESKF 状态与接口", "BMI088 用的误差状态卡尔曼滤波；参数在 JSON 的 ahrs.eskf。", ["ESKF"], "header"),
    ],
    ["两个 IMU 服务", "应用订阅者"],
    ["libs/math", "libs/msg", "libs/types"],
    ["imu::attitude::output", "imu::attitude::state"],
    ["读取时要检查 online/stage/received_ms", "只有 BMI088 会填 ESKF 相关字段"]
  ),
  "modules::rfid": groupInfo(
    [
      C("rfid_service.hpp / .cpp", "modules/rfid", "RFID 读卡服务", "UART 配置、A3 读块、解码、蜂鸣、遥控权限；线程优先级 8。", ["线程", "UART"], "thread"),
      C("startup.cpp", "modules/rfid/src/startup.cpp", "ThreadX 启动包装", "__wrap_tx_application_define 先 rfid::init()，再调用真实入口，所以 RFID 自动启动。", ["--wrap", "自动启动"], "file"),
    ],
    ["ThreadX 启动", "遥控解码（权限）"],
    ["bsp/usart", "bsp/pwm", "devices/rfid", "devices/remoter", "configs"],
    ["rfid::init", "rfid::read"],
    ["独占 USART1 和 TIM4 CH3", "移卡不会改变遥控权限", "读卡器不在也不阻塞启动"]
  ),
  "modules::referee": groupInfo(
    [
      C("referee.hpp", "modules/referee/include/referee.hpp", "服务接口与 sample<T> 缓存", "init/read/callbacks，按协议类型读取。", ["接口", "缓存"], "header"),
      C("referee_protocol.hpp", "modules/referee/include/referee_protocol.hpp", "裁判协议结构", "命令 ID、固定长度数据、机器人交互数据。", ["协议"], "header"),
      C("referee.cpp", "modules/referee/src/referee.cpp", "接收线程与解析器", "组帧、CRC、按类型解析、缓存、可选回调；线程优先级 6。", ["线程", "UART", "CRC"], "thread"),
    ],
    ["应用调用 referee::init", "控制/UI 读取"],
    ["bsp/usart", "libs/crc", "configs"],
    ["referee::init", "referee::read", "referee::callbacks"],
    ["独占所配置的 UART", "回调在接收线程执行，不能阻塞", "缓存只保留最新一包"]
  ),
  "modules::oled": groupInfo(
    [
      C("oled_test.hpp", "modules/oled/include/oled_test.hpp", "OLED 驱动接口", "声明 Init/Clear/SendData_Buffer；当前还留着旧的无参 OLED_SendCmd() 声明。", ["接口"], "header"),
      C("oled_test.cpp", "modules/oled/src/oled_test.cpp", "SSD1306 驱动实现", "按页写 128 字节，I2C 地址 0x78；用 hi2c3，HAL_MAX_DELAY。", ["I2C", "SSD1306"], "driver"),
      C("bmp.hpp", "modules/oled/include/bmp.hpp", "四张 128×64 位图", "cat / horse / patrick / pig，页格式，const 放 Flash。", ["位图", "Flash"], "data"),
    ],
    ["Thread/oled.cpp"],
    ["HAL I2C3", "boards/wrapper（hi2c3）", "bmp.hpp"],
    ["OLED_Init", "OLED_Clear", "OLED_SendData_Buffer"],
    ["main 还没调用 MX_I2C3_Init()", "OLED_Clear 用 0xFF 会白屏", "HAL_MAX_DELAY 可能卡死", "头文件原型可以清理"]
  ),

  /* ---------------- 设备层 ---------------- */
  "devices::led": groupInfo(
    [
      C("led.hpp", "devices/led/include/led.hpp", "LED 统一接口", "init/on/all_off/all_on/toggle/blink；GPIO 灯只有开/关。", ["接口"], "header"),
      C("gpio.cpp", "devices/led/src/gpio.cpp", "F407 GPIO 灯后端", "把 RGB 映射到 board::led 的三个 GPIO。", ["GPIO", "F407"], "driver"),
      C("ws2812.cpp", "devices/led/src/ws2812.cpp", "H723 WS2812 后端", "阻塞 SPI 发送颜色数据，带亮度和超时。", ["WS2812", "H723"], "driver"),
      C("led.cpp", "devices/led/src/led.cpp", "公共 LED 逻辑", "处理 blink 计数等与后端无关的行为。", ["公共逻辑"], "driver"),
    ],
    ["应用线程", "UI/状态指示"],
    ["bsp/gpio", "bsp/spi（WS2812）", "boards/wrapper 的 board::led"],
    ["led::init", "led::on", "led::toggle", "led::blink"],
    ["调用要串行", "WS2812 是阻塞 SPI，不要在中断里调", "blink 按调用次数计，不按 tick"]
  ),
  "devices::buzzer": groupInfo(
    [
      C("buzzer.hpp", "devices/buzzer/include/buzzer.hpp", "PWM 蜂鸣器提示序列", "config 定义定时器/通道/周期/响停时间；player 提供 play/update。", ["PWM", "header-only"], "header"),
    ],
    ["modules/rfid（刷卡提示）"],
    ["bsp/pwm", "boards/wrapper 的 PWM 资源"],
    ["buzzer::player::play", "buzzer::player::update"],
    ["调用方负责周期调用 update", "不创建线程", "独占定时器通道", "周期单位是微秒，响停单位是毫秒"]
  ),
  "devices::motor/dji": groupInfo(
    [
      C("dji_motor.hpp / .cpp", "devices/motor/dji", "DJI 电机基类", "反馈结构、模式、输出帧。", ["电机", "CAN"], "driver"),
      C("m3508 / m2006 / gm6020.hpp", "devices/motor/dji/include", "具体型号", "不同减速比、量程、控制模式。", ["型号"], "header"),
      C("dji_manager.hpp / .cpp", "devices/motor/dji", "多电机管理器", "register_motor/update/transmit/receive，发送回调由应用提供。", ["manager"], "driver"),
    ],
    ["应用控制线程"],
    ["bsp/can", "libs/pid", "boards/wrapper 的 can 配置"],
    ["register_motor", "manager.update", "manager.transmit", "manager.receive"],
    ["应用提供发送回调", "接收和控制不能并发改同一电机", "反馈帧只在回调期间有效"]
  ),
  "devices::motor/dm": groupInfo(
    [
      C("dm_motor.hpp / .cpp", "devices/motor/dm", "DM 电机基类", "模式、反馈、特殊指令。", ["电机", "CAN"], "driver"),
      C("dm4310 / dm8009p.hpp", "devices/motor/dm/include", "具体型号", "不同量程和固件模式。", ["型号"], "header"),
      C("dm_manager.hpp / .cpp", "devices/motor/dm", "DM 电机管理器", "注册、更新、收发、特殊指令。", ["manager"], "driver"),
    ],
    ["应用控制线程"],
    ["bsp/can", "libs/pid"],
    ["register_motor", "manager.update", "manager.special"],
    ["firmware_mode 必须和电机固件一致", "特殊指令走 manager"]
  ),
  "devices::motor/lk": groupInfo(
    [
      C("lk_motor.hpp / .cpp", "devices/motor/lk", "LK 电机基类", "模式、反馈、控制帧。", ["电机", "CAN"], "driver"),
      C("lk8016 / lk9025.hpp", "devices/motor/lk/include", "具体型号", "不同减速比和量程。", ["型号"], "header"),
      C("lk_manager.hpp / .cpp", "devices/motor/lk", "LK 电机管理器", "注册、更新、收发。", ["manager"], "driver"),
    ],
    ["应用控制线程"],
    ["bsp/can", "libs/pid"],
    ["register_motor", "manager.update"],
    ["按型号检查支持的控制模式"]
  ),
  "devices::motor/motor": groupInfo(
    [
      C("motor.hpp", "devices/motor/motor/include/motor.hpp", "电机公共类型", "模式、反馈、结果码。", ["类型"], "header"),
      C("motor_manager.hpp", "devices/motor/motor/include/motor_manager.hpp", "manager 公共接口", "注册、周期、收发。", ["manager"], "header"),
      C("motor_utils.hpp", "devices/motor/motor/include/motor_utils.hpp", "电机工具", "限幅、单位换算等。", ["工具"], "header"),
    ],
    ["DJI/DM/LK 三套 manager"],
    ["libs/math", "libs/pid"],
    ["motor::mode", "motor::result"],
    ["位置/速度单位是 rad、rad/s", "电流/电压原始单位由型号协议决定"]
  ),
  "devices::remoter/dr16": groupInfo(
    [
      C("dr16.cpp", "devices/remoter/dr16/src/dr16.cpp", "DR16 解码", "18 字节帧、100000 baud、8E1；输出归一化摇杆/按键。", ["UART", "协议"], "driver"),
    ],
    ["应用遥控线程", "remotes::set_enabled 权限门"],
    ["bsp/usart", "devices/remoter/remoter"],
    ["remotes::dr16::decode"],
    ["帧长固定 18 字节", "HAL 9 位字长包含偶校验", "失联/按键边沿由应用处理"]
  ),
  "devices::remoter/vt03": groupInfo(
    [
      C("vt03.cpp", "devices/remoter/vt03/src/vt03.cpp", "VT03 解码", "21 字节帧、115200 baud、8N1。", ["UART", "协议"], "driver"),
    ],
    ["应用遥控线程", "remotes::set_enabled 权限门"],
    ["bsp/usart", "devices/remoter/remoter"],
    ["remotes::vt03::decode"],
    ["和 DR16 使用不同串口配置", "失联判断由应用做"]
  ),
  "devices::remoter/ps2": groupInfo(
    [
      C("ps2.hpp", "devices/remoter/ps2/include/ps2.hpp", "PS2 手柄接口", "init/start/read/decode/cancel，SPI 模式 3、LSB first。", ["SPI", "手柄"], "header"),
      C("ps2.cpp", "devices/remoter/ps2/src/ps2.cpp", "PS2 实现", "中断收发、原始字节解析。", ["SPI", "中断"], "driver"),
    ],
    ["应用遥控线程"],
    ["bsp/spi", "boards/wrapper 的 ps2_spi/ps2_cs"],
    ["ps2::init", "ps2::start", "ps2::read", "ps2::decode"],
    ["F407 默认未配置", "busy 时让出 CPU", "按键边沿由应用处理"]
  ),
  "devices::remoter/remoter": groupInfo(
    [
      C("remoter.hpp / .cpp", "devices/remoter/remoter", "遥控权限与公共类型", "set_enabled/enabled，统一 DR16/VT03/PS2 的输出门。", ["权限", "公共"], "driver"),
    ],
    ["modules/rfid", "三个遥控解码器"],
    ["无（纯公共状态）"],
    ["remotes::set_enabled", "remotes::enabled"],
    ["禁用期间坏帧也输出中立值", "不会停止串口接收", "不能撤回应用已保存的历史副本"]
  ),
  "devices::rfid": groupInfo(
    [
      C("rfid.hpp", "devices/rfid/include/rfid.hpp", "A3 读块协议与解码器", "read_block、decoder::push/reset，固定 16 字节输出。", ["协议", "header-only"], "header"),
      C("rfid.cpp", "devices/rfid/src/rfid.cpp", "协议实现", "地址/块/校验和解析；单线程使用。", ["协议"], "driver"),
    ],
    ["modules/rfid"],
    ["无硬件依赖（只处理字节）"],
    ["rfid::read_block", "rfid::decoder::push"],
    ["只支持读，不提供 UID/写卡", "解码器单线程使用", "字节流要连续喂"]
  ),
  "devices::ui": groupInfo(
    [
      C("ui.hpp", "devices/ui/include/ui.hpp", "裁判 UI 画布接口", "init、create_*、move_to、set_color、update、remove。", ["UI", "UART"], "header"),
      C("ui.cpp", "devices/ui/src/ui.cpp", "UI 协议实现", "图形对象、字符串、图层、逐帧发送。", ["UI", "协议"], "driver"),
    ],
    ["应用 UI 线程"],
    ["bsp/usart", "boards/wrapper 的 ui_uart", "configs"],
    ["ui::canvas::init", "create_line/create_string", "update"],
    ["同一 canvas 调用要串行", "共享串口由应用协调", "字符串生命周期由调用方保证"]
  ),

  /* ---------------- 基础设施层 ---------------- */
  "libs::types": groupInfo(
    [
      C("status.hpp", "libs/types/include/status.hpp", "统一状态码", "ok/busy/timeout/not_configured/...，全工程复用。", ["状态码"], "header"),
      C("callback.hpp", "libs/types/include/callback.hpp", "轻量回调", "函数/成员函数回调，不动态分配；绑定对象要活得更久。", ["callback"], "header"),
    ],
    ["几乎所有层"],
    ["无硬件依赖"],
    ["pnxtypes::status", "pnxtypes::callback"],
    ["回调不拥有对象", "默认构造的回调为空，调用前检查"]
  ),
  "libs::msg": groupInfo(
    [
      C("msg.hpp", "libs/msg/include/msg.hpp", "最新值发布订阅", "topic::init/publish/subscribe；基于 ThreadX mutex；最多 8 个订阅槽。", ["ThreadX", "topic"], "header"),
    ],
    ["IMU 姿态发布", "应用控制读取"],
    ["ThreadX mutex", "libs/types"],
    ["topic.init", "publish", "subscribe", "sub.read"],
    ["只保留最新值", "读不到时返回 busy 不阻塞", "不是 ISR 安全", "销毁前 deinit"]
  ),
  "libs::crc": groupInfo(
    [
      C("crc.hpp", "libs/crc/include/crc.hpp", "CRC 计算/校验", "CRC8、CRC16、Modbus CRC16，支持追加与校验。", ["CRC", "header-only"], "header"),
    ],
    ["modules/referee", "自定义协议"],
    ["无硬件依赖"],
    ["crc8", "crc16", "modbus_crc16"],
    ["注意初值和字节序", "不同协议的多项式不同"]
  ),
  "libs::math": groupInfo(
    [
      C("constants.hpp", "libs/math/include/constants.hpp", "数学常量/角度转换", "pi、deg/rad、平方根倒数。", ["数学"], "header"),
      C("constrains.hpp", "libs/math/include/constrains.hpp", "限幅/回绕", "clamp、wrap、绝对值限幅。", ["数学"], "header"),
      C("geometry.hpp", "libs/math/include/geometry.hpp", "向量/四元数/欧拉角", "三维向量、四元数乘法、旋转、欧拉角转换。", ["几何"], "header"),
      C("quantize.hpp", "libs/math/include/quantize.hpp", "协议反量化", "dequantize(value,min,max,bits)。", ["量化"], "header"),
    ],
    ["IMU/ESKF", "PID", "电机控制"],
    ["无硬件依赖"],
    ["math::vector3", "math::quaternion", "math::wrap"],
    ["wrap 区间是半开 [min,max)", "四元数乘法顺序是 W,X,Y,Z"]
  ),
  "libs::filters": groupInfo(
    [
      C("biquad.hpp", "libs/filters/include/biquad.hpp", "二阶滤波/Butterworth 高通", "状态 + 系数，固定周期调用。", ["滤波"], "header"),
      C("iir.hpp", "libs/filters/include/iir.hpp", "二阶 IIR 低通", "简单低通滤波。", ["滤波"], "header"),
      C("kalman_1d.hpp", "libs/filters/include/kalman_1d.hpp", "一维卡尔曼（空）", "当前为空，尚未实现。", ["未实现"], "header"),
    ],
    ["IMU/控制"],
    ["libs/math"],
    ["biquad", "iir"],
    ["kalman_1d 不可用", "采样周期变化要重新设计"]
  ),
  "libs::control": groupInfo(
    [
      C("pid.hpp", "libs/control/include/pid.hpp", "位置式 PID", "支持积分分离、变速积分、积分限幅、微分先行；header-only。", ["PID", "控制"], "header"),
    ],
    ["电机 manager", "温控", "应用控制"],
    ["libs/math"],
    ["control::pid", "update", "tune", "reset_state"],
    ["固定周期调用", "ki/kd 已包含采样周期", "输入必须是有限值", "同一实例读写要串行"]
  ),

  /* ---------------- 外设层 ---------------- */
  "bsp::gpio": groupInfo(
    [
      C("bsp_gpio.hpp", "bsp/gpio/include/bsp_gpio.hpp", "引脚读写/翻转/有效电平", "read/write/toggle/set_active/is_active；header-only。", ["GPIO", "header-only"], "header"),
    ],
    ["devices/led", "应用线程", "其他 BSP 的片选/复位脚"],
    ["boards/wrapper 的 gpio::config", "boards/wrapper 的 peripherals::gpio_port/gpio_pin", "stm32cubemx 的 HAL_GPIO"],
    ["bsp::gpio::read", "write", "toggle", "set_active"],
    ["toggle 是物理电平翻转，不看 active_level", "pin 是 0~15，不是 HAL 位掩码"]
  ),
  "bsp::spi": groupInfo(
    [
      C("bsp_spi.hpp", "bsp/spi/include/bsp_spi.hpp", "SPI 接口", "阻塞/中断/DMA、单向/全双工、状态与中止。", ["SPI", "接口"], "header"),
      C("bsp_spi.cpp", "bsp/spi/src/bsp_spi.cpp", "SPI 实现", "HAL SPI 封装、DMA 缓冲区生命周期、完成/错误状态。", ["SPI", "DMA"], "driver"),
    ],
    ["BMI088", "PS2", "WS2812", "其他 SPI 器件"],
    ["boards/wrapper 的 spi1", "stm32cubemx 的 HAL SPI"],
    ["bsp::spi::transmit", "receive", "transfer", "state", "abort"],
    ["CubeMX 负责初始化，BSP 不再 init", "缓冲区要保留到完成或成功 abort", "错误不会自动释放所有权"]
  ),
  "bsp::can": groupInfo(
    [
      C("bsp_can.hpp", "bsp/can/include/bsp_can.hpp", "CAN 公共接口", "经典/FD、接收回调、错误通知、重启。", ["CAN", "接口"], "header"),
      C("bxcan.cpp", "bsp/can/src/bxcan.cpp", "F407 经典 CAN 实现", "CAN1/CAN2，按 board 选择。", ["CAN", "F407"], "driver"),
      C("fdcan.cpp", "bsp/can/src/fdcan.cpp", "H723 FDCAN 实现", "FDCAN1/2/3，经典+FD。", ["FDCAN", "H723"], "driver"),
    ],
    ["DJI/DM/LK 电机", "DMIMU"],
    ["boards/wrapper 的 can 配置", "stm32cubemx 的 HAL CAN/FDCAN"],
    ["bsp::can::init", "register_rx_callback", "send", "restart", "err_sem"],
    ["最多 8 个接收回调", "回调里的帧只在调用期间有效", "bus-off 后由线程 restart", "F407 不支持 FD"]
  ),
  "bsp::usart": groupInfo(
    [
      C("bsp_usart.hpp", "bsp/usart/include/bsp_usart.hpp", "串口接口", "线路配置、阻塞/DMA 发送、RX-to-idle、重启/中止。", ["UART", "接口"], "header"),
      C("bsp_usart.cpp", "bsp/usart/src/bsp_usart.cpp", "串口实现", "HAL UART + DMA + 空闲中断；TX 内部 256 字节暂存。", ["UART", "DMA"], "driver"),
    ],
    ["RFID", "裁判", "遥控", "UI"],
    ["boards/wrapper 的 usart 配置", "stm32cubemx 的 HAL UART/DMA"],
    ["bsp::usart::init", "configure", "start_rx_to_idle", "restart_rx", "abort_tx"],
    ["同一外设前台操作要串行", "RX 缓冲/回调目标保留到 stop_rx 成功", "9 位串口每个字占两个字节"]
  ),
  "bsp::pwm": groupInfo(
    [
      C("bsp_pwm.hpp", "bsp/pwm/include/bsp_pwm.hpp", "PWM 启停/占空比/周期/脉宽", "header-only；通过 board 的 pwm_configs 找 TIM 句柄和通道。", ["PWM", "header-only"], "header"),
    ],
    ["devices/buzzer", "modules/imu/bmi088（加热）"],
    ["boards/wrapper 的 pwm::config/pwm_channel", "stm32cubemx 的 HAL TIM"],
    ["bsp::pwm::start", "stop", "set_duty", "set_period_us", "set_pulse_width_us", "disable_output"],
    ["周期由同一定时器所有通道共享", "timer_clock_hz 是内核时钟，不是输出频率", "超出计数器范围返回 invalid_arg"]
  ),
  "bsp::adc": groupInfo(
    [
      C("bsp_adc.hpp", "bsp/adc/include/bsp_adc.hpp", "ADC 接口", "init/calibrate/read_raw/start_it/stop_it/start_dma/stop_dma。", ["ADC", "接口"], "header"),
      C("bsp_adc.cpp", "bsp/adc/src/bsp_adc.cpp", "ADC 实现", "轮询/中断/DMA、转换状态、DMA 缓冲区。", ["ADC", "DMA"], "driver"),
    ],
    ["应用采样"],
    ["boards/wrapper 的 adc 配置（仅 H723）", "stm32cubemx 的 HAL ADC/DMA"],
    ["bsp::adc::init", "read_raw", "start_dma", "state"],
    ["当前只有 H723 启用", "DMA 缓冲区要在 D1，不能 CCM", "异步完成后要 stop 才能复用"]
  ),
  "bsp::dwt": groupInfo(
    [
      C("bsp_dwt.hpp", "bsp/dwt/include/bsp_dwt.hpp", "周期计数/微秒时间线/忙等延时", "header-only；init 后使用 cycles32/cycles64/timeline_us/delta_s/delay_us/delay_ms。", ["DWT", "header-only"], "header"),
    ],
    ["PID/控制周期", "性能测量"],
    ["系统时钟"],
    ["bsp::dwt::init", "cycles32", "timeline_us", "delta_s", "delay_us"],
    ["delay 是忙等，不睡线程", "线程休眠用 tx_thread_sleep", "64 位计数需要定期采样"]
  ),
  "bsp::usb": groupInfo(
    [
      C("bsp_usb.hpp", "bsp/usb/include/bsp_usb.hpp", "USB CDC 接口", "init/connected/on_rx/poll/read/write。", ["USB", "CDC"], "header"),
      C("bsp_usb.cpp", "bsp/usb/src/bsp_usb.cpp", "USB CDC 实现", "USBX 设备栈、接收回调、读写。", ["USB", "USBX"], "driver"),
    ],
    ["bsp/threadx 的 USB 线程", "应用收发"],
    ["boards/cubemx 的 USB PCD/描述符", "stm32cubemx 的 USBX"],
    ["bsp::usb::init", "on_rx", "poll", "read", "write"],
    ["poll/read/write 只能在线程里调", "RX 长度必须是 64 的倍数", "回调数据只在调用期间有效"]
  ),
  "bsp::threadx": groupInfo(
    [
      C("bsp_threadx.cpp", "bsp/threadx/src/bsp_threadx.cpp", "ThreadX 启动接入", "定义 tx_application_define，初始化 USB（可选），创建 USB 线程，调用弱 app_start。", ["ThreadX", "启动"], "driver"),
    ],
    ["ThreadX 内核", "应用 app_start"],
    ["stm32cubemx 的 ThreadX", "configs（USB 开关）"],
    ["tx_application_define", "app_start（弱）"],
    ["app_start 必须 extern C", "不要在启动钩子里阻塞", "USB 关闭时仍会调用 app_start"]
  ),
  "bsp::bsp": groupInfo(
    [
      C("bsp.hpp", "bsp/bsp/include/bsp.hpp", "HAL 状态转换", "把 HAL_StatusTypeDef 转成 pnxtypes::status。", ["状态码", "header-only"], "header"),
    ],
    ["各 BSP 模块"],
    ["stm32cubemx 的 HAL", "libs/types"],
    ["bsp::to_status"],
    ["不要在这里做业务逻辑"]
  ),

  /* ---------------- 板级层 ---------------- */
  "board::cubemx/f407_cboard": groupInfo(
    [
      C("Core/Src + Core/Inc", "boards/cubemx/f407_cboard/Core", "CubeMX 生成的外设初始化", "main.c、gpio.c、i2c.c、spi.c、usart.c、can.c、tim.c、dma.c、中断、MSP。", ["生成代码", "HAL"], "folder"),
      C("Drivers/", "boards/cubemx/f407_cboard/Drivers", "STM32F4 HAL + CMSIS", "厂商库，不要手改。", ["HAL", "CMSIS"], "folder"),
      C("Middlewares/", "boards/cubemx/f407_cboard/Middlewares", "ThreadX/USBX", "RTOS 和 USB 协议栈。", ["ThreadX", "USBX"], "folder"),
      C("startup_stm32f407xx.s", "boards/cubemx/f407_cboard/startup_stm32f407xx.s", "启动文件", "向量表、Reset_Handler、.data 复制、.bss 清零。", ["启动", "汇编"], "file"),
      C("f407_cboard.ioc", "boards/cubemx/f407_cboard/f407_cboard.ioc", "CubeMX 工程", "引脚/时钟/外设/RTOS 配置的源头；改完要重新生成。", ["CubeMX"], "file"),
    ],
    ["boards/wrapper 的 wrapper/CMakeLists", "CMake stm32cubemx target"],
    ["STM32F4 HAL", "CMSIS", "ThreadX/USBX"],
    ["MX_*_Init", "HAL_*", "SystemClock_Config"],
    ["自动生成，别手改", "重新生成后要检查 wrapper 是否仍匹配", "I2C3 已生成但 main 未调用 MX_I2C3_Init"]
  ),
  "board::cubemx/h723_mc02": groupInfo(
    [
      C("Core/Src + Core/Inc", "boards/cubemx/h723_mc02/Core", "H723 外设初始化", "FDCAN、USART10、TIM12、USBX、ADC 等。", ["生成代码", "HAL"], "folder"),
      C("Drivers/ + Middlewares/", "boards/cubemx/h723_mc02", "H7 HAL + ThreadX/USBX", "厂商库和 RTOS。", ["HAL", "ThreadX"], "folder"),
      C("USBX/ + AZURE_RTOS/", "boards/cubemx/h723_mc02", "USBX 设备栈和 Azure RTOS 应用文件", "部分文件会被 BSP 的 CMake 排除，由 BSP 接管入口。", ["USBX", "AZURE_RTOS"], "folder"),
    ],
    ["boards/wrapper h723", "CMake stm32cubemx target"],
    ["STM32H7 HAL", "CMSIS", "ThreadX/USBX"],
    ["MX_*_Init", "HAL_*"],
    ["H723 的 I/D cache 要注意 DMA 一致性", "生成文件不要手改"]
  ),
  "board::wrapper/f407_cboard": groupInfo(
    [
      C("config.hpp", "boards/wrapper/f407_cboard/include/config.hpp", "资源类型 + 板级映射", "spi/gpio/pwm/usart config；bsp::peripherals 常量；board::bmi088/led。", ["映射", "手写"], "header"),
      C("peripherals.hpp", "boards/wrapper/f407_cboard/include/peripherals.hpp", "抽象 ID → HAL 句柄", "spi::handle::spi1→&hspi1，usart1→&huart1，tim1/4/8/10→&htimX，GPIO 端口映射。", ["句柄", "手写"], "header"),
      C("memory.hpp", "boards/wrapper/f407_cboard/include/memory.hpp", "DMA 内存约束", "memory::buffer、对齐、有效范围；CCM 不能 DMA。", ["DMA", "内存"], "header"),
      C("init.cpp", "boards/wrapper/f407_cboard/src/init.cpp", "手写 main()", "HAL_Init、时钟、MX_*_Init、tx_kernel_enter；当前缺 MX_I2C3_Init。", ["main", "启动"], "file"),
    ],
    ["board target", "bsp", "devices"],
    ["boards/cubemx 的 HAL 句柄", "核心启动文件"],
    ["main", "bsp::peripherals::*", "board::led", "board::bmi088"],
    ["CubeMX 重新生成不会覆盖 wrapper", "I2C3 初始化缺失", "引脚映射改了要同步 config.hpp"]
  ),
  "board::wrapper/h723_mc02": groupInfo(
    [
      C("config.hpp", "boards/wrapper/h723_mc02/include/config.hpp", "H723 资源映射", "FDCAN、USART10、TIM12、ADC、WS2812 等。", ["映射", "手写"], "header"),
      C("peripherals.hpp", "boards/wrapper/h723_mc02/include/peripherals.hpp", "抽象 ID → HAL 句柄", "H723 的 hfdcanX、huartX、htimX、GPIO。", ["句柄", "手写"], "header"),
      C("memory.hpp", "boards/wrapper/h723_mc02/include/memory.hpp", "D1/CCM 内存约束", "DMA 缓冲放 D1，cache line 维护。", ["DMA", "内存"], "header"),
      C("init.cpp", "boards/wrapper/h723_mc02/src/init.cpp", "手写 main()", "时钟、cache、外设、tx_kernel_enter。", ["main", "启动"], "file"),
    ],
    ["board target", "bsp", "devices"],
    ["boards/cubemx h723", "H7 HAL"],
    ["main", "bsp::peripherals::*"],
    ["I/D cache 与 DMA 一致性", "CCM 不能 DMA"]
  ),
  "board::memory": groupInfo(
    [
      C("f407_cboard.ld", "boards/memory/f407_cboard.ld", "F407 链接脚本", "FLASH 0x08000000/1M，RAM 0x20000000/128K，CCM 0x10000000/64K；.data LMA、.bss、堆栈。", ["链接脚本", "F407"], "file"),
      C("h723_mc02.ld", "boards/memory/h723_mc02.ld", "H723 链接脚本", "更大的 Flash/RAM、D1/D2/D3、DTCM/ITCM 等。", ["链接脚本", "H723"], "file"),
    ],
    ["boards/CMakeLists"],
    ["芯片内存布局"],
    ["_estack", "_sdata", "_sidata", "_sbss", "_ebss"],
    ["改芯片/改内存布局才动", "堆栈大小影响能否链接", ".data 同时占 Flash 和 RAM"]
  ),
  "board::dsp": groupInfo(
    [
      C("include/arm_math.h", "boards/dsp/include", "CMSIS-DSP 头文件", "矩阵/向量/基本数学函数声明。", ["CMSIS-DSP"], "header"),
      C("src/MatrixFunctions/", "boards/dsp/src/MatrixFunctions", "矩阵运算", "arm_mat_mult_f32、inverse、transpose、add/sub。", ["矩阵运算"], "folder"),
      C("src/BasicMathFunctions/", "boards/dsp/src/BasicMathFunctions", "基础数学", "arm_dot_prod_f32 等。", ["点积"], "folder"),
      C("CMakeLists.txt", "boards/dsp/CMakeLists.txt", "静态库 dsp", "只编译用到的几个 CMSIS-DSP 源文件；PUBLIC 链接 stm32cubemx。", ["STATIC", "CMake"], "file"),
    ],
    ["modules/imu/bmi088 的 ESKF"],
    ["CMSIS Core/device 头文件（来自 stm32cubemx）"],
    ["arm_mat_mult_f32", "arm_mat_inverse_f32", "arm_dot_prod_f32"],
    ["只有 bmi088 分支链接 dsp", "dmimu 分支不需要", "不要全量编译 CMSIS-DSP，浪费 Flash"]
  ),
  "board::CMakeLists.txt": groupInfo(
    [
      C("BOARD 校验", "boards/CMakeLists.txt", "检查 h723_mc02 / f407_cboard", "不支持的板子直接 FATAL_ERROR。", ["校验"], "file"),
      C("链接脚本选择", "boards/CMakeLists.txt", "boards/memory/<BOARD>.ld", "作为 LINKER:-T 选项加入固件。", ["链接"], "file"),
      C("add_subdirectory", "boards/CMakeLists.txt", "cubemx/<BOARD>、dsp、wrapper", "把生成代码、DSP 和手写 main 接进来。", ["CMake"], "file"),
    ],
    ["顶层 CMakeLists"],
    ["boards/cubemx", "boards/dsp", "boards/wrapper", "boards/memory"],
    [],
    ["换板子要同时加 BOARD 列表、链接脚本和 preset"]
  ),

  /* ---------------- 硬件 ---------------- */
  "hardware::STM32F407 / STM32H723": groupInfo(
    [
      C("STM32F407", "芯片", "Cortex-M4，1MB Flash，128KB SRAM，64KB CCM", "当前 f407_cboard 使用；I2C3 在 PA8/PC9。", ["F407"], "chip"),
      C("STM32H723", "芯片", "Cortex-M7，更大 Flash/RAM，FDCAN/ADC/USBX", "h723_mc02 使用；有 D1/D2/D3 和 cache。", ["H723"], "chip"),
    ],
    ["所有代码最终都在这里执行"],
    [],
    [],
    ["RAM 掉电丢失", "CCM 不能 DMA", "外设寄存器在固定地址"]
  ),
  "hardware::GPIO / I2C / SPI / UART / CAN / TIM / USB": groupInfo(
    [
      C("GPIO", "外设", "引脚电平/复用功能", "LED、片选、复位、EXTI 等。", ["GPIO"], "peripheral"),
      C("I2C3", "外设", "OLED 使用的 I2C", "F407：PA8 SCL / PC9 SDA；地址 0x78。", ["I2C"], "peripheral"),
      C("SPI1", "外设", "BMI088/PS2/WS2812 等", "F407 已配置 SPI1，DMA 收发。", ["SPI"], "peripheral"),
      C("USART1/2/3/6", "外设", "RFID/裁判/遥控/UI", "F407 的 RFID 默认 USART1。", ["UART"], "peripheral"),
      C("CAN1/CAN2", "外设", "电机/DMIMU", "F407 经典 CAN。", ["CAN"], "peripheral"),
      C("TIM1/4/8/10", "外设", "PWM/蜂鸣器/加热", "9 个通道，其中 2 个被板载功能占用。", ["PWM"], "peripheral"),
      C("USB OTG FS", "外设", "CDC ACM", "USB 关闭时不影响启动。", ["USB"], "peripheral"),
    ],
    ["所有 BSP/驱动"],
    [],
    [],
    ["寄存器地址不是变量地址", "外设要先初始化再使用", "共享总线要串行化"]
  ),

  /* ---------------- 配置层 ---------------- */
  "config::user_config.json": groupInfo(
    [
      C("usb / ui / ps2 / remoter", "configs/user_config.json", "通用功能参数", "USB 开关、UI 超时、PS2 死区、遥控调度。", ["JSON", "功能"], "config"),
      C("boards.<board>", "configs/user_config.json", "板级资源选择", "串口、CAN、PS2、IMU 后端、RFID、蜂鸣器、温控。", ["JSON", "资源"], "config"),
      C("ahrs / dmimu / bmi088_heater", "configs/user_config.json", "IMU 与温控参数", "优先级、周期、栈、ESKF、零偏、PID。", ["JSON", "IMU"], "config"),
      C("referee / rfid", "configs/user_config.json", "服务参数", "线程优先级、周期、栈、读卡协议、蜂鸣时序。", ["JSON", "服务"], "config"),
    ],
    ["所有层"],
    ["configs/scripts 生成器"],
    [],
    ["改完要重新 configure", "资源名必须存在于板级 config.hpp", "none 表示未连接"]
  ),
  "config::scripts": groupInfo(
    [
      C("generate_config.cmake", "configs/scripts/generate_config.cmake", "生成入口", "读取 JSON、调用各校验脚本、configure_file 输出 user_config.hpp。", ["生成", "CMake"], "file"),
      C("values.cmake", "configs/scripts/values.cmake", "数值/布尔/向量校验", "整数、浮点、布尔、vector3 的范围检查。", ["校验"], "file"),
      C("communication.cmake", "configs/scripts/communication.cmake", "通信参数", "UI、PS2、遥控、裁判接收参数。", ["通信"], "file"),
      C("imu.cmake", "configs/scripts/imu.cmake", "IMU 参数", "DMIMU、AHRS、ESKF、温控。", ["IMU"], "file"),
      C("boards.cmake", "configs/scripts/boards.cmake", "板级资源与冲突检查", "串口/CAN/PS2 资源、启用选择、冲突校验，并设置 USER_AHRS_DEVICE。", ["板级", "冲突检查"], "file"),
      C("user_config.hpp.in", "configs/scripts/user_config.hpp.in", "C++ 输出模板", "把校验后的值渲染成 user_config::xxx 常量。", ["模板"], "file"),
    ],
    ["CMake configure", "所有代码"],
    ["configs/user_config.json", "CMake", "板级 config.hpp 资源名"],
    [],
    ["全部校验通过才写文件", "不要手改生成头", "资源冲突在 boards.cmake 里检查"]
  ),
  "config::include/user_config.hpp": groupInfo(
    [
      C("user_config 常量", "configs/include/user_config.hpp", "生成的 C++ 配置", "user_config::usb、rfid_uart、ahrs、referee、rfid 等；带板型 #if 分支。", ["生成", "C++"], "header"),
    ],
    ["所有模块/设备/应用"],
    ["configs/scripts 生成器"],
    ["user_config::usb::enabled", "user_config::rfid_uart", "user_config::ahrs::thread_priority"],
    ["不要手改", "改 JSON 后重新生成", "文件随仓库提交"]
  ),

  /* ---------------- 构建层 ---------------- */
  "build::CMakeLists.txt": groupInfo(
    [
      C("顶层配置", "CMakeLists.txt", "项目、BOARD、工具链、语言标准", "cmake_minimum_required、BOARD 默认值、CMAKE_TOOLCHAIN_FILE、C/C++ 标准。", ["CMake", "入口"], "file"),
      C("目标与子目录", "CMakeLists.txt", "add_executable + add_subdirectory", "boards/libs/bsp/devices/modules/Thread，最后 target_link_libraries(modules)。", ["CMake", "target"], "file"),
      C("--wrap", "CMakeLists.txt", "tx_application_define 包装", "LINKER:--wrap=tx_application_define，把 RFID 启动接进来。", ["链接", "--wrap"], "file"),
    ],
    ["所有构建"],
    ["CMakePresets", "工具链文件", "链接脚本"],
    [],
    ["BOARD 默认 h723_mc02，f407 要用 preset", "不要把 build/ 提交", "改 CMakeLists 后重新 configure"]
  ),
  "build::CMakePresets.json": groupInfo(
    [
      C("f407_cboard", "CMakePresets.json", "F407 构建预设", "Ninja、build/f407_cboard、BOARD=f407_cboard、Debug。", ["preset", "F407"], "config"),
      C("h723_mc02", "CMakePresets.json", "H723 构建预设", "Ninja、build/h723_mc02、BOARD=h723_mc02、Debug。", ["preset", "H723"], "config"),
    ],
    ["开发者命令行/IDE"],
    ["CMakeLists", "工具链文件"],
    ["cmake --preset f407_cboard", "cmake --build --preset f407_cboard"],
    ["每个预设独立 build 目录", "换板子别复用同一个 build 目录"]
  ),
  "build::工具链文件": groupInfo(
    [
      C("gcc-arm-none-eabi.cmake", "boards/cubemx/<board>/cmake/gcc-arm-none-eabi.cmake", "交叉编译说明书", "CMAKE_SYSTEM_NAME=Generic、arm-none-eabi-gcc/g++、CPU/FPU 参数、.elf 后缀、链接选项。", ["工具链", "交叉编译"], "file"),
    ],
    ["CMake 配置阶段"],
    ["Arm GNU Toolchain"],
    ["CMAKE_C_COMPILER", "CMAKE_CXX_COMPILER", "TARGET_FLAGS"],
    ["必须在 project() 之前加载", "CPU 参数选错会跑不起来", "换板子/换芯片要换工具链或参数"]
  ),
  "build::链接脚本": groupInfo(
    [
      C("f407_cboard.ld / h723_mc02.ld", "boards/memory", "内存布局", "MEMORY 区域、.isr_vector/.text/.rodata/.data/.bss/.ccmram、堆栈符号。", ["链接", "内存"], "file"),
    ],
    ["链接器"],
    ["芯片内存布局", "启动文件"],
    ["_estack", "_sdata", "_sidata", "_sbss", "_ebss"],
    ["堆栈不够会链接报错", ".data 同时占 Flash 和 RAM", "CCM 段不能放 DMA 缓冲"]
  ),
};

/* =========================================================
   数据：为什么要分层
   ========================================================= */

const PAINS = [
  {
    icon: "🔁",
    title: "换板子要全局改",
    problem:
      "引脚、串口、定时器散落在业务代码里，换一块板子要全工程搜索替换，还容易漏。",
    solution:
      "业务只认 board::led、user_config::rfid_uart；板级映射集中在 boards/wrapper，换板子只改这一层。",
  },
  {
    icon: "♻️",
    title: "CubeMX 覆盖手写代码",
    problem:
      "CubeMX 重新生成会覆盖它自己的目录，手写的 main、引脚映射、补丁很容易丢。",
    solution:
      "生成代码放 boards/cubemx，手写接入放 boards/wrapper；CubeMX 怎么重新生成都碰不到 wrapper。",
  },
  {
    icon: "🧱",
    title: "业务代码混进 HAL",
    problem:
      "业务函数里直接出现 HAL_GPIO_WritePin、hi2c1、GPIOH，读起来像寄存器手册，换个外设就要重写。",
    solution:
      "BSP 把 HAL 包成 read/write/toggle；设备层包协议；应用层只表达“做什么”。",
  },
  {
    icon: "🧵",
    title: "设备偷偷开线程",
    problem:
      "每个驱动都自己创建线程，谁在跑、优先级多少、栈多大，没人说得清。",
    solution:
      "devices 不创建线程；有后台线程的完整服务放 modules；应用通过 app_start 显式启动。",
  },
  {
    icon: "🎛️",
    title: "配置散落各处",
    problem:
      "串口、CAN、IMU 后端、PID 参数散落在多个头文件和宏里，改一个资源要翻半天。",
    solution:
      "一个 user_config.json 管资源与参数，CMake 生成 user_config.hpp；代码只读生成结果。",
  },
  {
    icon: "📚",
    title: "构建列表越来越长",
    problem:
      "每加一个文件都要改顶层 CMakeLists，多人协作时天天冲突。",
    solution:
      "各层用 INTERFACE 库 + GLOB 收集自己的源码；顶层只链接 modules，加文件通常不用改顶层。",
  },
];

/* =========================================================
   数据：请求旅程
   ========================================================= */

const SCENARIOS = [
  {
    id: "oled",
    name: "让 OLED 显示图片",
    icon: "🖼️",
    color: "#22d3ee",
    summary: "从复位、ThreadX、app_start 到 I2C3，把一张 128×64 的图送到 OLED。",
    steps: [
      {
        layer: "board",
        title: "复位：从 Flash 开头出发",
        text:
          "CPU 复位后，硬件从 0x08000000 取栈顶和 Reset_Handler。启动代码把 .data 从 Flash 搬进 RAM、把 .bss 清零，然后调用 main。",
        file: "boards/cubemx/f407_cboard/startup_stm32f407xx.s",
        code: `Reset_Handler:
  ldr sp, =_estack
  bl  SystemInit
  ; copy .data, zero .bss
  bl  __libc_init_array
  bl  main`,
        note: "这一段是汇编，不经过 C++ 编译器。",
      },
      {
        layer: "board",
        title: "main()：把硬件点亮",
        text:
          "F407 的 main 在 wrapper 里。它初始化 HAL、时钟、GPIO、I2C3 等，然后交给 ThreadX。",
        file: "boards/wrapper/f407_cboard/src/init.cpp",
        code: `HAL_Init();
SystemClock_Config();
MX_GPIO_Init();
MX_I2C3_Init();   // OLED 需要；当前 init.cpp 还没调用
tx_kernel_enter();`,
        warn:
          "当前 wrapper 的 main() 没有调用 MX_I2C3_Init()，I2C3 不会工作。要让 OLED 亮，必须补上这一行。",
      },
      {
        layer: "modules",
        title: "tx_kernel_enter()：交给 RTOS",
        text:
          "ThreadX 接管后初始化内核，调用 tx_application_define，再启动调度器。main 永远不会再回来。",
        file: "Middlewares/ST/threadx/common/src/tx_initialize_kernel_enter.c",
        code: `_tx_initialize_low_level();
_tx_initialize_high_level();
tx_application_define(_tx_initialize_unused_memory);
_tx_thread_schedule();`,
        note: "tx_kernel_enter 是一个宏，实际调用 _tx_initialize_kernel_enter。",
      },
      {
        layer: "modules",
        title: "启动包装：RFID 先插队",
        text:
          "根 CMake 用 --wrap 把 tx_application_define 接到 modules/rfid/startup.cpp：先创建 RFID 线程，再转给 BSP 的原始实现。",
        file: "modules/rfid/src/startup.cpp",
        code: `extern "C" void __wrap_tx_application_define(void* memory)
{
    rfid::init();
    __real_tx_application_define(memory);
}`,
        note: "这就是为什么 RFID 不需要应用手动启动。",
      },
      {
        layer: "app",
        title: "app_start()：你的应用入口",
        text:
          "BSP 的 tx_application_define 最后调用 app_start()。你在 Thread/thread.cpp 里提供强符号，覆盖 BSP 的空弱实现。",
        file: "Thread/thread.cpp",
        code: `extern "C" void app_start()
{
    led_start();
    oled_start();
}`,
        note: "BSP 里是 weak app_start；这里没有 weak，所以链接器选你的版本。",
      },
      {
        layer: "app",
        title: "oled_start()：创建 OLED 线程",
        text:
          "准备线程控制块和静态栈，调用 tx_thread_create。优先级 15，比 RFID(8) 和 IMU(3) 低。",
        file: "Thread/oled.cpp",
        code: `tx_thread_create(&oled_thread, "oled_thread", entry, 0,
                 stack, sizeof(stack), 15, 15,
                 TX_NO_TIME_SLICE, TX_AUTO_START);`,
        note: "TCB 和栈必须是 static/全局，否则函数返回后就失效。",
      },
      {
        layer: "app",
        title: "调度器：进入 entry()",
        text:
          "线程进入就绪态后，调度器在合适时机切到 entry()：先 OLED_Init()，然后循环显示四张图，每张停 500ms。",
        file: "Thread/oled.cpp",
        code: `OLED_Init();
for (;;)
{
    OLED_SendData_Buffer(cat_bmp);
    tx_thread_sleep(500);
    OLED_SendData_Buffer(horse_bmp);
    tx_thread_sleep(500);
    // ...
}`,
        note: "tx_thread_sleep 会让出 CPU，rfid 和更高优先级服务可以继续跑。",
      },
      {
        layer: "modules",
        title: "OLED 驱动：按页写数据",
        text:
          "OLED_SendData_Buffer 把 8×128 的位图拆成 8 页，每页 128 字节，加一个 0x40 控制字节，共 129 字节。",
        file: "modules/oled/src/oled_test.cpp",
        code: `for (uint8_t page = 0; page < 8; page++)
{
    OLED_SendCmd(0xB0 | page);
    memcpy(&buf[1], bmp[page], 128);
    HAL_I2C_Master_Transmit(&hi2c3, 0x78, buf, 129, HAL_MAX_DELAY);
}`,
        warn:
          "驱动现在是 .cpp，已经被 modules 收集。剩余问题：OLED_Clear 用 0xFF 会刷白屏、HAL_MAX_DELAY 可能卡死、oled_test.hpp 还留着旧的无参原型。",
      },
      {
        layer: "board",
        title: "HAL → I2C3 → OLED",
        text:
          "HAL_I2C_Master_Transmit 把 129 字节写到地址 0x78。F407 的 I2C3 使用 PA8(SCL) / PC9(SDA)。",
        file: "boards/cubemx/f407_cboard/Core/Src/i2c.c",
        code: `HAL_I2C_Master_Transmit(&hi2c3, 0x78, buf, 129, 100);
// PA8  = I2C3_SCL
// PC9  = I2C3_SDA`,
        note: "如果黑屏，先查 MX_I2C3_Init、0x78 地址和 PA8/PC9 接线。",
      },
      {
        layer: "hardware",
        title: "OLED 亮起，睡 500ms，循环",
        text:
          "OLED 收到数据后刷新；线程睡眠，让出 CPU。500ms 后调度器再切回来，显示下一张图。",
        file: "硬件",
        code: `tx_thread_sleep(500);   // 1000 ticks = 1s
// 下一轮：换下一张图`,
        note: "到这里，一次请求就从代码走到了硬件。",
      },
    ],
  },
  {
    id: "led",
    name: "让 LED 闪烁",
    icon: "💡",
    color: "#fbbf24",
    summary: "最短的一条链：app_start → 线程 → BSP GPIO → HAL → 灯。",
    steps: [
      {
        layer: "app",
        title: "app_start()：应用入口",
        text:
          "BSP 的 app_start 弱符号被 Thread/thread.cpp 的强符号覆盖。这里调用 led_start()。",
        file: "Thread/thread.cpp",
        code: `extern "C" void app_start()
{
    led_start();
    oled_start();
}`,
      },
      {
        layer: "app",
        title: "led_start()：创建线程",
        text:
          "准备 TCB 和 1KB 静态栈，优先级 15，自动启动。",
        file: "Thread/led.cpp",
        code: `tx_thread_create(&led_thread, "led_thread", entry, 0,
                 stack, sizeof(stack), 15, 15,
                 TX_NO_TIME_SLICE, TX_AUTO_START);`,
      },
      {
        layer: "app",
        title: "entry()：翻转三色灯",
        text:
          "线程循环：绿 → 睡 500ms → 红 → 睡 500ms → 蓝 → 睡 500ms。",
        file: "Thread/led.cpp",
        code: `for (;;)
{
    bsp::gpio::toggle(board::led::green);
    tx_thread_sleep(500);
    bsp::gpio::toggle(board::led::red);
    tx_thread_sleep(500);
    bsp::gpio::toggle(board::led::blue);
    tx_thread_sleep(500);
}`,
      },
      {
        layer: "bsp",
        title: "BSP：把“绿色”翻译成引脚操作",
        text:
          "bsp::gpio::toggle 接收一个 gpio::config，取出端口和引脚，调用 HAL_GPIO_TogglePin。",
        file: "bsp/gpio/include/bsp_gpio.hpp",
        code: `inline status toggle(const config& pin) noexcept
{
    auto* port = peripherals::gpio_port(pin.instance);
    const auto mask = peripherals::gpio_pin(pin.pin);
    HAL_GPIO_TogglePin(port, mask);
    return status::ok;
}`,
      },
      {
        layer: "board",
        title: "板级映射：绿色到底是哪个引脚",
        text:
          "board::led::green 定义在 wrapper 的 config.hpp 里：GPIOH 第 11 脚，高有效。",
        file: "boards/wrapper/f407_cboard/include/config.hpp",
        code: `namespace board::led
{
inline constexpr bsp::gpio::config green{
    bsp::gpio::port::h, 11, bsp::active_level::high};
}`,
        note: "业务代码里没有出现 GPIOH；换板子只改这个映射。",
      },
      {
        layer: "board",
        title: "HAL：真正翻转寄存器",
        text:
          "HAL_GPIO_TogglePin 操作 GPIOH 的输出寄存器，引脚电平翻转。",
        file: "Drivers/STM32F4xx_HAL_Driver/Src/stm32f4xx_hal_gpio.c",
        code: `HAL_GPIO_TogglePin(GPIOH, GPIO_PIN_11);
// ODR ^= GPIO_PIN_11`,
      },
      {
        layer: "hardware",
        title: "灯亮 / 灯灭",
        text:
          "GPIOH 第 11 脚电平变化，板载绿灯亮或灭。线程睡 500ms 后继续。",
        file: "硬件",
        code: `// 电平翻转 → LED 状态变化
tx_thread_sleep(500);`,
        note: "如果你看到灯在闪，说明 ThreadX、BSP、板级映射、HAL 全部正常。",
      },
    ],
  },
  {
    id: "rfid",
    name: "刷 RFID 卡",
    icon: "🪪",
    color: "#f472b6",
    summary: "开机自动启动的 RFID 线程：UART 读卡、解码、蜂鸣、限制遥控。",
    steps: [
      {
        layer: "modules",
        title: "ThreadX 启动：先经过 RFID 包装",
        text:
          "tx_kernel_enter → _tx_initialize_kernel_enter → tx_application_define。链接器的 --wrap 把这次调用接到 modules/rfid/startup.cpp。",
        file: "modules/rfid/src/startup.cpp",
        code: `extern "C" void __wrap_tx_application_define(void* memory)
{
    rfid::init();
    __real_tx_application_define(memory);
}`,
      },
      {
        layer: "modules",
        title: "rfid::init()：创建读卡线程",
        text:
          "创建优先级 8 的线程，栈 2KB。初始化失败会重试；读卡器不在也不会阻塞系统启动。",
        file: "modules/rfid/src/rfid_service.cpp",
        code: `tx_thread_create(&thread, "rfid", run, 0, stack,
                 sizeof(stack), user_config::rfid::priority,
                 user_config::rfid::priority,
                 TX_NO_TIME_SLICE, TX_AUTO_START);`,
      },
      {
        layer: "modules",
        title: "run()：配置串口并开始接收",
        text:
          "线程里配置 USART1（9600 8N1），启动 RX-to-idle + DMA，然后按 120ms 周期发读卡命令。",
        file: "modules/rfid/src/rfid_service.cpp",
        code: `bsp::usart::configure(port, line);
bsp::usart::init(user_config::rfid_uart, mode::dma);
bsp::usart::start_rx_to_idle(port, dma_rx, callback);
// 每 poll_ms 发一次 A3 读块命令`,
      },
      {
        layer: "bsp",
        title: "BSP USART：把 HAL 包成“配置/收发”",
        text:
          "bsp::usart 负责线路配置、DMA 发送、接收到空闲。中断里只复制字节，协议解析留给线程。",
        file: "bsp/usart/src/bsp_usart.cpp",
        code: `// 配置 9600 8N1
// 启动 DMA 接收
// 空闲中断后回调
HAL_UARTEx_ReceiveToIdle_DMA(...);`,
      },
      {
        layer: "board",
        title: "板级：USART1 和 DMA",
        text:
          "F407 的 RFID 串口是 USART1，PA9 TX / PB7 RX；蜂鸣器是 TIM4 CH3。这些都在 JSON 里选择。",
        file: "boards/wrapper/f407_cboard/include/config.hpp",
        code: `inline constexpr usart::config usart1{...};
inline constexpr pwm::config tim4{84'000'000U, ...};`,
        note: "换串口只改 user_config.json 的 rfid_uart。",
      },
      {
        layer: "modules",
        title: "解码：全 0x01 / 全 0x00",
        text:
          "读到 16 字节后：全 0x01 → 禁用遥控并响一声；全 0x00 → 恢复遥控并响两声。混合内容不改权限。",
        file: "modules/rfid/src/rfid_service.cpp",
        code: `if (all_bytes(data, 0x01)) {
    remotes::set_enabled(false);
    sound.play(1, now);
} else if (all_bytes(data, 0x00)) {
    remotes::set_enabled(true);
    sound.play(2, now);
}`,
      },
      {
        layer: "bsp",
        title: "蜂鸣器：PWM 提示",
        text:
          "buzzer::player 用 TIM4 CH3 输出 333us 周期的 PWM，响 100ms、停 100ms。",
        file: "devices/buzzer/include/buzzer.hpp",
        code: `sound.play(1, HAL_GetTick());
sound.update(HAL_GetTick());`,
      },
      {
        layer: "hardware",
        title: "读卡器 / 蜂鸣器 / 遥控权限",
        text:
          "UART 帧到达 STM32，线程解析；蜂鸣器响；遥控解码输出被允许或禁用。移卡本身不改变权限。",
        file: "硬件",
        code: `// USART1 RX → DMA → 线程
// TIM4 CH3 → 蜂鸣器
// remotes::enabled() → DR16/VT03/PS2`,
        note: "这就是“刷卡控制遥控权限”的完整链路。",
      },
    ],
  },
  {
    id: "imu",
    name: "启动 IMU 姿态",
    icon: "🧭",
    color: "#a78bfa",
    summary: "服务线程读 BMI088，跑 ESKF，通过 msg 发布姿态。",
    steps: [
      {
        layer: "app",
        title: "应用显式启动 IMU 服务",
        text:
          "和 RFID 不同，IMU 不会自动启动。应用需要调用 imu::start_bmi088()（或 start_dmimu()）。当前 Thread/thread.cpp 还没有调用它。",
        file: "Thread/thread.cpp",
        code: `extern "C" void app_start()
{
    led_start();
    oled_start();
    // imu::start_bmi088();  ← 需要时加上
}`,
        warn: "如果 IMU 没数据，先确认应用是否真的调用了启动函数。",
      },
      {
        layer: "modules",
        title: "服务线程：3 号优先级",
        text:
          "BMI088 服务创建优先级 3、栈 8192 的线程。它比 RFID(8) 和 OLED(15) 都高。",
        file: "modules/imu/bmi088/src/bmi088_service.cpp",
        code: `tx_thread_create(&worker, "ahrs bmi088", run, 0,
                 stack, sizeof(stack),
                 user_config::ahrs::thread_priority, ...,
                 TX_NO_TIME_SLICE, TX_AUTO_START);`,
      },
      {
        layer: "bsp",
        title: "BSP SPI：读传感器",
        text:
          "服务通过 bsp::spi 读 BMI088 的加速度计和陀螺仪。SPI1 在 F407 上使用 DMA。",
        file: "bsp/spi/src/bsp_spi.cpp",
        code: `bsp::spi::receive_dma(bsp::spi::handle::spi1, buffer);
// 或阻塞/中断模式`,
      },
      {
        layer: "board",
        title: "板级：SPI1 与片选",
        text:
          "board::bmi088 定义了 SPI1、加速度计 CS、陀螺仪 CS 和加热定时器。",
        file: "boards/wrapper/f407_cboard/include/config.hpp",
        code: `namespace board::bmi088
{
inline constexpr auto spi = bsp::spi::handle::spi1;
inline constexpr bsp::gpio::config acc_cs{port::a, 4, active_level::low};
inline constexpr bsp::gpio::config gyro_cs{port::b, 0, active_level::low};
}`,
      },
      {
        layer: "hardware",
        title: "BMI088 返回原始数据",
        text:
          "加速度、角速度通过 SPI 回到 STM32。服务再做温度补偿、零偏扣除和坐标系转换。",
        file: "硬件",
        code: `// accel x/y/z
// gyro x/y/z
// temperature`,
      },
      {
        layer: "modules",
        title: "ESKF：把原始数据变成姿态",
        text:
          "服务用 ESKF 融合加速度和角速度，输出四元数/欧拉角。参数在 user_config.json 的 ahrs.eskf 里。",
        file: "modules/imu/bmi088/src/bmi088_service.cpp",
        code: `// predict(gyro, dt)
// update(accel)
// publish(attitude)`,
      },
      {
        layer: "libs",
        title: "msg：发布最新姿态",
        text:
          "姿态通过 msg::topic 发布。订阅者只读最新值，不阻塞；适合控制循环。",
        file: "libs/msg/include/msg.hpp",
        code: `attitude.publish(sample);
auto sub = attitude.subscribe();
sub.read(out);`,
      },
      {
        layer: "app",
        title: "应用订阅姿态",
        text:
          "控制线程订阅姿态 topic，拿最新姿态做控制。发布和读取都不阻塞。",
        file: "应用代码",
        code: `imu::attitude::output.subscribe();
if (sub.read(attitude) == status::ok)
{
    // 用 attitude 做控制
}`,
        note: "IMU 服务负责“采”，应用负责“用”。",
      },
    ],
  },
];

const scenarioById = (id) => SCENARIOS.find((s) => s.id === id);

/* =========================================================
   数据：CMake 依赖图
   ========================================================= */

const GRAPH_NODES = [
  {
    id: "exe",
    label: "embedded_framework",
    type: "EXECUTABLE",
    x: 410,
    y: 18,
    w: 190,
    color: "#fbbf24",
    desc: "最终固件 .elf。所有源码最终都汇总到这里。",
    links: ["modules", "Thread 源文件", "wrapper/init.cpp"],
    detail:
      "由顶层 add_executable 创建。Thread/ 和 wrapper 的源文件直接加入；链接 modules，获得服务、设备、BSP、板级和基础库。",
    one: "所有东西最后都汇总到这个可执行文件。",
  },
  {
    id: "modules",
    label: "modules",
    type: "INTERFACE",
    x: 410,
    y: 118,
    w: 190,
    color: "#f472b6",
    desc: "服务清单：收集模块源码，二选一 IMU 服务。",
    links: ["devices", "dsp (bmi088)"],
    detail:
      "GLOB modules/*/src/*.cpp；先移除 bmi088_service、bmi088_heater、dmimu_service，再按 USER_AHRS_DEVICE 加回一个。链接 devices；bmi088 时链接 dsp。",
    one: "它是清单：告诉固件要编译哪些模块源码、依赖谁。",
  },
  {
    id: "devices",
    label: "devices",
    type: "INTERFACE",
    x: 410,
    y: 218,
    w: 190,
    color: "#60a5fa",
    desc: "设备驱动清单：收集 devices/*/src/*.cpp。",
    links: ["board", "libs", "bsp"],
    detail:
      "GLOB 两层目录的 include/src；按 BOARD 选择 LED 后端（F407 gpio.cpp / H723 ws2812.cpp）。链接 board、libs、bsp。",
    one: "它知道器件怎么说话，但不创建线程。",
  },
  {
    id: "bsp",
    label: "bsp",
    type: "INTERFACE",
    x: 410,
    y: 318,
    w: 190,
    color: "#34d399",
    desc: "外设操作清单：GPIO/SPI/CAN/UART/PWM。",
    links: ["board", "libs"],
    detail:
      "GLOB bsp/*/src/*.cpp；按 BOARD 选择 bxcan.cpp 或 fdcan.cpp；排除生成的应用入口文件。链接 board 和 libs。",
    one: "把 HAL 包成 read/write/send/receive。",
  },
  {
    id: "board",
    label: "board",
    type: "INTERFACE",
    x: 150,
    y: 438,
    w: 180,
    color: "#22d3ee",
    desc: "板级清单：wrapper + 生成代码 + 链接脚本。",
    links: ["stm32cubemx"],
    detail:
      "校验 BOARD、设置链接脚本、加入 wrapper/init.cpp、链接 stm32cubemx。板级映射和 main 都在这里。",
    one: "告诉工程：这块板子的启动方式、引脚和内存布局。",
  },
  {
    id: "libs",
    label: "libs",
    type: "INTERFACE",
    x: 640,
    y: 438,
    w: 180,
    color: "#a78bfa",
    desc: "头文件工具库：math/CRC/PID/msg/types。",
    links: ["stm32cubemx"],
    detail:
      "GLOB libs/*/include；链接 stm32cubemx 获取所选板子的 ThreadX 头文件。全部 header-only。",
    one: "与硬件无关的工具箱。",
  },
  {
    id: "stm32cubemx",
    label: "stm32cubemx",
    type: "LIBRARY",
    x: 410,
    y: 538,
    w: 190,
    color: "#94a3b8",
    desc: "CubeMX 生成的所有 C 源码。",
    links: [],
    detail:
      "HAL、CMSIS、ThreadX、USBX、启动文件、链接脚本都由 CubeMX 生成。BSP CMake 会排除几个生成的应用入口，由自己的实现接管。",
    one: "CubeMX 提供的“零件库”。",
  },
  {
    id: "dsp",
    label: "dsp",
    type: "STATIC",
    x: 770,
    y: 218,
    w: 160,
    color: "#fb923c",
    desc: "CMSIS-DSP 子集。",
    links: ["stm32cubemx"],
    detail:
      "矩阵乘法、求逆、点积等。只有 bmi088 的 ESKF 分支链接它。",
    one: "BMI088 姿态算法用的数学加速库。",
  },
  {
    id: "thread",
    label: "Thread 源文件",
    type: "SOURCES",
    x: 770,
    y: 18,
    w: 170,
    color: "#fbbf24",
    desc: "thread.cpp / led.cpp / oled.cpp。",
    links: ["embedded_framework"],
    detail:
      "通过 Thread/CMakeLists.txt 的 target_sources 直接加入可执行文件。当前收集 thread.cpp 和 led.cpp；oled.cpp 需要补上。",
    one: "应用层源码直接进入固件。",
  },
  {
    id: "wrapper",
    label: "wrapper/init.cpp",
    type: "SOURCES",
    x: 60,
    y: 168,
    w: 180,
    color: "#22d3ee",
    desc: "手写的 main()。",
    links: ["embedded_framework"],
    detail:
      "boards/wrapper/CMakeLists.txt 把 init.cpp 直接加入固件。它负责硬件初始化和 tx_kernel_enter。",
    one: "真正调用 tx_kernel_enter 的 main。",
  },
];

const GRAPH_EDGES = [
  { from: "wrapper", to: "exe", main: false },
  { from: "thread", to: "exe", main: false },
  { from: "exe", to: "modules", main: true },
  { from: "modules", to: "devices", main: true },
  { from: "modules", to: "dsp", main: false },
  { from: "devices", to: "bsp", main: true },
  { from: "devices", to: "libs", main: false },
  { from: "bsp", to: "board", main: true },
  { from: "bsp", to: "libs", main: false },
  { from: "board", to: "stm32cubemx", main: true },
  { from: "libs", to: "stm32cubemx", main: false },
  { from: "dsp", to: "stm32cubemx", main: false },
];

/* =========================================================
   数据：加功能向导
   ========================================================= */

const WIZARD_TASKS = [
  {
    id: "thread",
    icon: "🧵",
    title: "加一个线程",
    short: "在应用层创建自己的后台任务",
    color: "#fbbf24",
    intro:
      "线程属于应用/服务层。设备驱动不创建线程；应用通过 app_start() 决定启动哪些线程。",
    layer: "应用层 Thread/。BSP 只提供弱钩子 app_start；线程创建归应用/服务层。",
    files: [
      "Thread/your_thread.cpp",
      "Thread/CMakeLists.txt",
      "Thread/thread.cpp",
    ],
    steps: [
      "定义 TX_THREAD、static 栈、entry(ULONG) 入口函数。",
      "在 app_start() 里调用 tx_thread_create，设置优先级和栈。",
      "把新 .cpp 加入 Thread/CMakeLists.txt 的 target_sources。",
      "重新 configure + build，烧录后打断点或看 xRTOS。",
    ],
    dont: [
      "不要在 app_start 里 sleep/阻塞——调度器还没启动。",
      "不要把 TCB 或栈写成局部变量。",
      "不要重复定义 app_start 强符号。",
    ],
    verify: [
      "nm 里 app_start 应为 T（强符号）。",
      "xRTOS 视图能看到新线程。",
      "entry 里的断点能命中。",
    ],
    command: "cmake --preset f407_cboard && cmake --build --preset f407_cboard",
  },
  {
    id: "sensor",
    icon: "📡",
    title: "加一个传感器",
    short: "先写器件协议，再决定要不要服务线程",
    color: "#60a5fa",
    intro:
      "先判断：它需要持续后台采集吗？不需要 → devices；需要 → modules。总线操作放 bsp，资源选择放 configs。",
    layer: "devices（协议）+ bsp（总线）+ configs（资源）；需要持续采集再加 modules。",
    files: [
      "devices/<sensor>/",
      "bsp/<bus>/",
      "modules/<service>/",
      "configs/user_config.json",
    ],
    steps: [
      "确认总线（I2C/SPI/CAN/UART）和引脚，CubeMX 先配好。",
      "在 devices 写协议/反馈，不创建线程。",
      "如果需要持续采集，在 modules 写服务线程，调用 devices 和 bsp。",
      "把资源选择写进 user_config.json，代码读 user_config::xxx。",
    ],
    dont: [
      "不要在 devices 里创建后台线程。",
      "不要把 HAL 句柄和引脚宏写进业务代码。",
      "不要在中断里做耗时解析。",
    ],
    verify: [
      "先离线测试协议解码。",
      "上板看原始数据是否合理。",
      "检查线程栈余量和 CPU 占用。",
    ],
    command: "cmake --preset f407_cboard && cmake --build --preset f407_cboard",
  },
  {
    id: "pin",
    icon: "📍",
    title: "换一个引脚",
    short: "CubeMX + wrapper 映射 + JSON 选择",
    color: "#22d3ee",
    intro:
      "引脚属于板级资源，不属于业务。业务只认 board::xxx 或 user_config::xxx，换引脚只改板级。",
    layer: "板级层 boards/wrapper + CubeMX；可选资源放到 configs。",
    files: [
      "boards/cubemx/<board>/*.ioc",
      "boards/wrapper/<board>/include/config.hpp",
      "configs/user_config.json",
    ],
    steps: [
      "在 CubeMX 里改引脚/外设，重新生成代码。",
      "在 wrapper 的 config.hpp 里导出新的资源常量。",
      "如果这个资源是可选项，在 user_config.json 里选择它。",
      "重新 configure + build，检查生成头。",
    ],
    dont: [
      "不要手改 CubeMX 生成文件里的引脚配置。",
      "不要在业务代码里直接写 GPIOH / GPIO_PIN_11。",
      "不要忘记检查资源冲突（同一串口/定时器被两个功能占用）。",
    ],
    verify: [
      "编译无资源冲突报错。",
      "用万用表/逻辑分析仪看新引脚。",
      "旧功能没有受到影响。",
    ],
    command: "cmake --preset f407_cboard && cmake --build --preset f407_cboard",
  },
  {
    id: "board",
    icon: "🧩",
    title: "换一块板子",
    short: "新增 cubemx + wrapper + 链接脚本 + preset",
    color: "#a78bfa",
    intro:
      "换板子是板级层的工作。业务、服务、设备、BSP 应该尽量不动；它们通过 board/wrapper 和 JSON 适配新板。",
    layer: "板级层 boards/ + configs + CMakePresets。",
    files: [
      "boards/cubemx/<new>/",
      "boards/wrapper/<new>/",
      "boards/memory/<new>.ld",
      "CMakePresets.json",
      "configs/user_config.json",
    ],
    steps: [
      "用 CubeMX 建新板工程，生成 HAL/启动/链接。",
      "写 wrapper 的 main、config.hpp、peripherals.hpp、memory.hpp。",
      "准备链接脚本，加入 boards/CMakeLists 的 BOARD 列表。",
      "加 CMake preset，在 JSON 加 boards.<new> 段。",
      "先编译，再逐个验证外设。",
    ],
    dont: [
      "不要复制 build/ 目录。",
      "不要把业务层写死成某块板的引脚。",
      "不要同时改多块板，先把一块跑通。",
    ],
    verify: [
      "cmake --preset <new> 配置成功。",
      "链接脚本地址和芯片一致。",
      "LED/串口/时钟先跑通。",
    ],
    command: "cmake --preset <new_board> && cmake --build --preset <new_board>",
  },
  {
    id: "config",
    icon: "🎛️",
    title: "改串口 / CAN 选择",
    short: "只改 user_config.json，再重新生成",
    color: "#facc15",
    intro:
      "资源选择集中在 JSON。代码通过 user_config::xxx 读取生成结果；不要直接改 user_config.hpp。",
    layer: "配置层 configs/；不碰 C++ 源码。",
    files: ["configs/user_config.json", "configs/include/user_config.hpp（生成）"],
    steps: [
      "在 boards.<board> 段改 rfid_uart / dr16_uart / dmimu_can 等字段。",
      "确认资源在板级 config.hpp 里存在，且没有冲突。",
      "运行 cmake --preset <board> 重新生成头文件。",
      "编译、烧录，验证对应外设。",
    ],
    dont: [
      "不要手改 configs/include/user_config.hpp。",
      "不要把串口协议格式写成可配置项——格式由生成脚本固定。",
      "不要让两个功能抢同一个串口/定时器。",
    ],
    verify: [
      "生成头里的 user_config::xxx 指向新资源。",
      "对应串口/CAN 有波形或数据。",
      "旧资源不再被初始化。",
    ],
    command: "cmake --preset f407_cboard && cmake --build --preset f407_cboard",
  },
  {
    id: "oled",
    icon: "🖼️",
    title: "让 OLED 显示",
    short: "驱动 + 线程 + CMake + I2C 初始化",
    color: "#22d3ee",
    intro:
      "OLED 涉及三层：modules/oled 的驱动、Thread/oled.cpp 的线程、wrapper/init.cpp 的 I2C3 初始化。",
    layer: "modules/oled（驱动）+ Thread（线程）+ boards/wrapper（I2C 初始化）。",
    files: [
      "modules/oled/src/oled_test.cpp",
      "modules/oled/include/oled_test.hpp",
      "Thread/oled.cpp",
      "Thread/CMakeLists.txt",
      "boards/wrapper/f407_cboard/src/init.cpp",
    ],
    steps: [
      "确认 modules/oled/src/oled_test.cpp 已被 modules 的 GLOB 收集（现在已经满足）。",
      "确认 bmp.hpp 里 cat / horse / patrick / pig 四张图都在（现在已经满足）。",
      "确认 Thread/CMakeLists.txt 已加入 oled.cpp（现在已经满足）。",
      "在 wrapper 的 main() 里调用 MX_I2C3_Init()。",
      "清屏用 0x00；顺手清理 oled_test.hpp 的旧无参原型和 HAL_MAX_DELAY。",
    ],
    dont: [
      "不要直接改 HAL 生成的 i2c.c。",
      "不要把 4 张 128×64 图放 RAM；用 const 放 Flash。",
      "不要用 HAL_MAX_DELAY 让 I2C 卡死；给有限超时。",
    ],
    verify: [
      "nm 里 oled_start 有定义，app_start 是 T。",
      "PA8/PC9 上有 I2C 波形。",
      "OLED 地址 0x78 有应答。",
    ],
    command: "cmake --preset f407_cboard && cmake --build --preset f407_cboard",
  },
];

/* =========================================================
   数据：小测验
   ========================================================= */

const QUIZ = [
  {
    q: "业务代码要点亮 LED，最合适调用谁？",
    options: [
      "直接调用 HAL_GPIO_WritePin",
      "调用 bsp::gpio 或 board::led 提供的接口",
      "直接写 GPIOH 的寄存器",
      "在 modules 里新建一个线程",
    ],
    answer: 1,
    explain:
      "业务层不直接碰 HAL/寄存器。BSP 提供 read/write/toggle，board 提供引脚映射，业务只表达“点亮哪个灯”。",
  },
  {
    q: "哪些层应该创建后台线程？",
    options: [
      "devices 层",
      "bsp 层",
      "modules 服务层或应用层",
      "libs 层",
    ],
    answer: 2,
    explain:
      "devices 只提供由调用方驱动的设备接口，不创建线程。含后台线程的完整服务放 modules；应用在 app_start 里显式启动。",
  },
  {
    q: "要把 RFID 从 USART1 换到 USART3，最先应该改哪里？",
    options: [
      "业务代码里的串口初始化",
      "configs/user_config.json",
      "HAL 库源码",
      "链接脚本",
    ],
    answer: 1,
    explain:
      "资源选择集中在 user_config.json。改 boards.f407_cboard.rfid_uart，重新 configure 生成 user_config.hpp，代码不用改。",
  },
  {
    q: "add_library(bsp INTERFACE) 是什么意思？",
    options: [
      "生成 libbsp.a",
      "创建一个可执行文件",
      "只传递源码、头文件路径和依赖，不产出文件",
      "生成链接脚本",
    ],
    answer: 2,
    explain:
      "INTERFACE 库是“清单/配置包”，自己不编译。谁链接它，谁就获得它的源文件、include 路径和依赖。",
  },
];

/* =========================================================
   工具函数
   ========================================================= */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightCode(code) {
  let s = escapeHtml(code);
  s = s.replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="c-string">$1</span>');
  s = s.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span class="c-comment">$1</span>');
  s = s.replace(
    /\b(void|int|char|const|static|extern|return|for|while|if|else|true|false|namespace|using|auto|constexpr|class|struct|UINT|ULONG|TX_THREAD|UCHAR|HAL_StatusTypeDef|inline)\b/g,
    '<span class="c-keyword">$1</span>'
  );
  s = s.replace(/\b(0x[0-9a-fA-F]+|\d+)\b/g, '<span class="c-number">$1</span>');
  return s;
}

function copyText(text, button) {
  const done = () => {
    if (!button) return;
    const old = button.textContent;
    button.textContent = "已复制";
    setTimeout(() => {
      button.textContent = old;
    }, 1200);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(done);
  } else {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* ignore */
    }
    ta.remove();
    done();
  }
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =========================================================
   渲染：Hero 分层
   ========================================================= */

function renderHeroStack() {
  const host = $("#heroStack");
  if (!host) return;
  const stackLayers = LAYERS.filter((l) => !l.crosscut && l.id !== "hardware");
  host.innerHTML =
    stackLayers
      .map(
        (l) => `
      <button class="hero-layer" type="button" data-layer="${l.id}" style="--c:${l.color}">
        <span class="hero-layer-name">${escapeHtml(l.name)}</span>
        <span class="hero-layer-path">${escapeHtml(l.path)}</span>
        <span class="hero-layer-bar" aria-hidden="true"></span>
      </button>`
      )
      .join("") +
    `<div class="hero-hardware">STM32 硬件 · 真正执行代码的地方</div>`;

  $$(".hero-layer", host).forEach((btn) => {
    btn.addEventListener("click", () => {
      selectLayer(btn.dataset.layer);
      scrollToSection("map");
    });
  });
}

/* =========================================================
   渲染：Why
   ========================================================= */

function renderPainCards() {
  const host = $("#painGrid");
  if (!host) return;
  host.innerHTML = PAINS.map(
    (p) => `
    <div class="pain-card" role="button" tabindex="0" aria-pressed="false">
      <div class="flip-inner">
        <div class="flip-front">
          <span class="pain-icon" aria-hidden="true">${p.icon}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.problem)}</p>
          <span class="flip-hint">点一下，看分层怎么解</span>
        </div>
        <div class="flip-back">
          <span class="badge good">分层后</span>
          <p>${escapeHtml(p.solution)}</p>
        </div>
      </div>
    </div>`
  ).join("");

  $$(".pain-card", host).forEach((card) => {
    const toggle = () => {
      const flipped = card.classList.toggle("flipped");
      card.setAttribute("aria-pressed", String(flipped));
    };
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
  });
}

function setWhyView(view) {
  state.whyView = view;
  const stage = $("#whyStage");
  if (!stage) return;
  stage.classList.toggle("focus-flat", view === "flat");
  stage.classList.toggle("focus-layered", view === "layered");
  $$("#whyToggle button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view)
  );
}

function updateBoardSwap() {
  const stage = $("#whyStage");
  const flatNote = $("#flatNote");
  const layeredNote = $("#layeredNote");
  const flatMeter = $("#flatMeter");
  const layeredMeter = $("#layeredMeter");
  const btn = $("#btnBoardSwap");
  if (!stage) return;

  state.boardSwapped = !state.boardSwapped;
  stage.classList.toggle("swapped", state.boardSwapped);

  if (state.boardSwapped) {
    flatNote.textContent =
      "换板子：引脚宏、串口初始化、HAL 句柄、CubeMX 配置、链接脚本……至少 12 处要改，而且很容易漏。";
    layeredNote.textContent =
      "换板子：主要改 boards/ 和 configs/；业务、服务、设备、BSP 基本不动。";
    flatMeter.hidden = false;
    layeredMeter.hidden = false;
    btn.textContent = "恢复原状";
    const boardLayer = $$(".mini-layer")[5];
    if (boardLayer) boardLayer.dataset.hot = "true";
  } else {
    flatNote.textContent =
      "换一个引脚，要在这个文件里全局搜索；CubeMX 重新生成，还可能把手写代码覆盖掉。";
    layeredNote.textContent =
      "换板子时，业务、服务、设备、外设层基本不动；只改板级映射、配置和构建预设。";
    flatMeter.hidden = true;
    layeredMeter.hidden = true;
    btn.textContent = "模拟：换一块板子";
    $$(".mini-layer").forEach((l) => delete l.dataset.hot);
  }
}

/* =========================================================
   渲染：架构地图
   ========================================================= */

function renderLayerList() {
  const host = $("#layerList");
  if (!host) return;
  host.innerHTML = LAYERS.filter((l) => !l.crosscut)
    .map(
      (l) => `
      <button class="layer-btn ${l.id === state.layer ? "active" : ""}"
              type="button" role="tab" aria-selected="${l.id === state.layer}"
              data-layer="${l.id}" style="--c:${l.color}">
        <span class="layer-icon" aria-hidden="true">${l.icon}</span>
        <span class="layer-name">${escapeHtml(l.name)}</span>
        <span class="layer-path">${escapeHtml(l.path)}</span>
      </button>`
    )
    .join("");

  $$(".layer-btn", host).forEach((btn) => {
    btn.addEventListener("click", () => selectLayer(btn.dataset.layer));
  });
}

function renderCrosscut() {
  const host = $("#crosscutGrid");
  if (!host) return;
  host.innerHTML = LAYERS.filter((l) => l.crosscut)
    .map(
      (l) => `
      <button class="crosscut-card" type="button" data-layer="${l.id}" style="--c:${l.color}">
        <div class="crosscut-kicker">横切关注点</div>
        <h3>${l.icon} ${escapeHtml(l.name)} · ${escapeHtml(l.path)}</h3>
        <p>${escapeHtml(l.tagline)}</p>
      </button>`
    )
    .join("");

  $$(".crosscut-card", host).forEach((btn) => {
    btn.addEventListener("click", () => {
      selectLayer(btn.dataset.layer);
      scrollToSection("map");
    });
  });
}

function groupKey(layerId, folderName) {
  return `${layerId}::${folderName}`;
}

function selectLayer(id) {
  state.layer = id;
  state.group = null;
  $$(".layer-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.layer === id)
  );
  renderGroupList();
  const rail = $("#groupList");
  if (rail) {
    rail.scrollTop = 0;
    rail.scrollLeft = 0;
  }
  renderLayerDetail();
}

function selectGroup(name) {
  state.group = name;
  renderGroupList();
  renderLayerDetail();
  if (window.matchMedia("(max-width: 1050px)").matches) {
    const target = $("#layerDetail");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderGroupList() {
  const host = $("#groupList");
  const l = layerById(state.layer);
  if (!host || !l) return;
  const keepTop = host.scrollTop;
  const keepLeft = host.scrollLeft;

  host.innerHTML = `
    <button class="group-btn group-overview ${state.group === null ? "active" : ""}"
            type="button" data-group="__overview" style="--c:${l.color}">
      <span class="group-name">层总览</span>
      <span class="group-path">${escapeHtml(l.path)}</span>
      <span class="group-desc">${escapeHtml(l.tagline)}</span>
    </button>
    ${l.folders
      .map(
        (f) => `
      <button class="group-btn ${state.group === f.name ? "active" : ""}"
              type="button" data-group="${escapeHtml(f.name)}" style="--c:${l.color}">
        <span class="group-name">${escapeHtml(f.name)}</span>
        <span class="group-path">${escapeHtml(f.path)}</span>
        <span class="group-desc">${escapeHtml(f.desc)}</span>
      </button>`
      )
      .join("")}
  `;

  host.scrollTop = keepTop;
  host.scrollLeft = keepLeft;

  $$(".group-btn", host).forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.group;
      selectGroup(name === "__overview" ? null : name);
    });
  });
}

function renderLayerDetail() {
  const host = $("#layerDetail");
  const l = layerById(state.layer);
  if (!host || !l) return;

  if (state.group === null) {
    renderLayerOverview(host, l);
    return;
  }

  const folder = l.folders.find((f) => f.name === state.group);
  if (!folder) {
    state.group = null;
    renderLayerOverview(host, l);
    return;
  }

  renderGroupDetail(host, l, folder);
}

function renderLayerOverview(host, l) {
  const folderCards = l.folders
    .map(
      (f) => `
      <button class="folder-card folder-link" type="button"
              data-group="${escapeHtml(f.name)}" style="--c:${l.color}">
        <span class="folder-name">${escapeHtml(f.name)}</span>
        <span class="folder-path">${escapeHtml(f.path)}</span>
        <span class="folder-desc">${escapeHtml(f.desc)}</span>
        <span class="folder-arrow" aria-hidden="true">→</span>
      </button>`
    )
    .join("");

  host.innerHTML = `
    <div class="layer-hero" style="--c:${l.color}">
      <div class="layer-hero-icon" aria-hidden="true">${l.icon}</div>
      <div>
        <h3>${escapeHtml(l.name)}</h3>
        <div class="layer-hero-path">${escapeHtml(l.path)}${l.crosscut ? " · 横切关注点" : ""}</div>
        <p class="layer-tagline">${escapeHtml(l.tagline)}</p>
        <p class="layer-plain">${escapeHtml(l.plain)}</p>
      </div>
    </div>
    <div class="duty-grid">
      <div class="duty yes">
        <h4>它负责</h4>
        <ul>${l.responsible.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>
      <div class="duty no">
        <h4>它不负责</h4>
        <ul>${l.notResponsible.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>
    </div>
    <div class="folder-grid">${folderCards}</div>
    <p class="layer-plain" style="margin-top:14px;font-size:12px;">
      点任意子文件夹，看它里面的文件、关键接口、调用方和注意事项。
    </p>
  `;

  $$(".folder-link", host).forEach((btn) => {
    btn.addEventListener("click", () => selectGroup(btn.dataset.group));
  });
}

function childCard(child) {
  return `
    <div class="child-card">
      <div class="child-top">
        <span class="child-name">${escapeHtml(child.name)}</span>
        <span class="child-kind">${escapeHtml(child.kind || "file")}</span>
      </div>
      <div class="child-path">${escapeHtml(child.path)}</div>
      <p class="child-desc">${escapeHtml(child.desc)}</p>
      ${child.detail ? `<p class="child-detail">${escapeHtml(child.detail)}</p>` : ""}
      ${
        child.tags && child.tags.length
          ? `<div class="child-tags">${child.tags
              .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
              .join("")}</div>`
          : ""
      }
    </div>`;
}

function renderGroupDetail(host, l, folder) {
  const info =
    GROUP_DETAILS[groupKey(l.id, folder.name)] ||
    groupInfo([], [], [], [], []);
  host.style.setProperty("--c", l.color);

  const list = (items, empty = "无") =>
    items && items.length
      ? `<ul>${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
      : `<ul><li>${empty}</li></ul>`;

  host.innerHTML = `
    <div class="group-detail-head" style="--c:${l.color}">
      <div class="group-detail-title">
        <div class="group-icon">${l.icon}</div>
        <div>
          <h3>${escapeHtml(folder.name)}</h3>
          <div class="group-path">${escapeHtml(folder.path)}</div>
        </div>
      </div>
      <button class="group-back" id="groupBack" type="button">← 层总览</button>
    </div>
    <p class="group-detail-desc">${escapeHtml(folder.detail || folder.desc)}</p>
    ${folder.warn ? `<div class="warn">${escapeHtml(folder.warn)}</div>` : ""}
    <div class="child-grid">
      ${info.children.length ? info.children.map(childCard).join("") : `<div class="child-card"><p class="child-desc">这个子文件夹暂时没有更细的文件条目。</p></div>`}
    </div>
    <div class="meta-grid">
      <div class="meta-box">
        <h4>谁在用它</h4>
        ${list(info.usedBy)}
      </div>
      <div class="meta-box">
        <h4>它依赖谁</h4>
        ${list(info.dependsOn)}
      </div>
    </div>
    ${
      info.api.length
        ? `<div class="meta-box" style="margin-top:9px">
             <h4>关键接口 / 入口</h4>
             <div class="api-row">${info.api
               .map((a) => `<span class="api-pill">${escapeHtml(a)}</span>`)
               .join("")}</div>
           </div>`
        : ""
    }
    ${
      info.pitfalls.length
        ? `<div class="pitfall-box">
             <strong>注意</strong>
             <ul>${info.pitfalls.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
           </div>`
        : ""
    }
  `;

  $("#groupBack")?.addEventListener("click", () => selectGroup(null));
}

/* =========================================================
   渲染：请求旅程
   ========================================================= */

function renderScenarioTabs() {
  const host = $("#scenarioTabs");
  if (!host) return;
  host.innerHTML = SCENARIOS.map(
    (s) => `
    <button class="scenario-btn ${s.id === state.scenario ? "active" : ""}"
            type="button" role="tab" aria-selected="${s.id === state.scenario}"
            data-scenario="${s.id}" style="--c:${s.color}">
      <span class="scenario-icon" aria-hidden="true">${s.icon}</span>
      ${escapeHtml(s.name)}
    </button>`
  ).join("");

  $$(".scenario-btn", host).forEach((btn) => {
    btn.addEventListener("click", () => setScenario(btn.dataset.scenario));
  });
}

function renderJourneyLayerChips() {
  const host = $("#journeyLayerChips");
  const scenario = scenarioById(state.scenario);
  if (!host || !scenario) return;
  const activeId = scenario.steps[state.step]?.layer;
  const chips = LAYERS.filter((l) => !l.crosscut);
  host.innerHTML = chips
    .map(
      (l) => `
      <span class="j-layer-chip ${l.id === activeId ? "active" : ""}"
            style="--c:${l.color}">${escapeHtml(l.name)}</span>`
    )
    .join("");
}

function renderJourneySteps() {
  const host = $("#journeySteps");
  const scenario = scenarioById(state.scenario);
  if (!host || !scenario) return;
  host.innerHTML = scenario.steps
    .map((step, i) => {
      const layer = layerById(step.layer);
      const classes = [
        "step",
        i === state.step ? "active" : "",
        i < state.step ? "done" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <button class="${classes}" type="button" data-step="${i}" style="--c:${layer.color}">
          <span class="step-index">${String(i + 1).padStart(2, "0")}</span>
          <span class="step-body">
            <span class="step-title">${escapeHtml(step.title)}</span>
            <span class="step-layer">${escapeHtml(layer.name)} · ${escapeHtml(layer.path)}</span>
          </span>
        </button>`;
    })
    .join("");

  $$(".step", host).forEach((btn) => {
    btn.addEventListener("click", () => {
      stopAutoPlay();
      setStep(Number(btn.dataset.step));
    });
  });
}

function renderJourneyCard() {
  const host = $("#journeyCard");
  const scenario = scenarioById(state.scenario);
  if (!host || !scenario) return;
  const step = scenario.steps[state.step];
  const layer = layerById(step.layer);
  const total = scenario.steps.length;
  const progress = ((state.step + 1) / total) * 100;

  host.style.setProperty("--c", layer.color);
  host.innerHTML = `
    <div class="journey-step-head">
      <div>
        <div class="journey-step-num">STEP ${String(state.step + 1).padStart(2, "0")} / ${String(
    total
  ).padStart(2, "0")}</div>
        <h3>${escapeHtml(step.title)}</h3>
      </div>
      <span class="journey-layer-badge">${escapeHtml(layer.name)}</span>
    </div>
    <p class="journey-text">${escapeHtml(step.text)}</p>
    <div class="journey-file">📄 ${escapeHtml(step.file)}</div>
    ${step.code ? `<pre class="code-block"><code>${highlightCode(step.code)}</code></pre>` : ""}
    ${step.note ? `<div class="note">${escapeHtml(step.note)}</div>` : ""}
    ${step.warn ? `<div class="warn">${escapeHtml(step.warn)}</div>` : ""}
  `;

  const bar = $("#journeyProgress");
  if (bar) bar.style.width = `${progress}%`;

  const prev = $("#btnPrev");
  const next = $("#btnNext");
  if (prev) prev.disabled = state.step === 0;
  if (next) next.disabled = state.step === total - 1;

  renderJourneyLayerChips();
  $$(".step").forEach((el, i) => {
    el.classList.toggle("active", i === state.step);
    el.classList.toggle("done", i < state.step);
  });
}

function setScenario(id) {
  state.scenario = id;
  state.step = 0;
  stopAutoPlay();
  $$(".scenario-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.scenario === id)
  );
  renderJourneySteps();
  renderJourneyCard();
}

function setStep(index) {
  const scenario = scenarioById(state.scenario);
  if (!scenario) return;
  state.step = Math.max(0, Math.min(index, scenario.steps.length - 1));
  renderJourneyCard();
}

function stopAutoPlay() {
  if (state.autoPlay) {
    clearInterval(state.autoPlay);
    state.autoPlay = null;
  }
  const btn = $("#btnAuto");
  if (btn) btn.textContent = "▶ 自动播放";
}

function toggleAutoPlay() {
  const scenario = scenarioById(state.scenario);
  if (!scenario) return;
  if (state.autoPlay) {
    stopAutoPlay();
    return;
  }
  if (state.step >= scenario.steps.length - 1) setStep(0);
  const btn = $("#btnAuto");
  if (btn) btn.textContent = "⏸ 暂停";
  state.autoPlay = setInterval(() => {
    const current = scenarioById(state.scenario);
    if (!current) return stopAutoPlay();
    if (state.step >= current.steps.length - 1) {
      stopAutoPlay();
      return;
    }
    setStep(state.step + 1);
  }, 1900);
}

/* =========================================================
   渲染：CMake 图
   ========================================================= */

function graphNodeById(id) {
  return GRAPH_NODES.find((n) => n.id === id);
}

function edgePath(from, to) {
  const x1 = from.x + from.w / 2;
  const y1 = from.y + 30;
  const x2 = to.x + to.w / 2;
  const y2 = to.y + 30;
  const mid = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
}

function renderGraph() {
  const svg = $("#graphSvg");
  if (!svg) return;
  svg.classList.toggle("main-only", state.graphMode === "main");

  const defs = `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#7dd3fc"></path>
      </marker>
    </defs>`;

  const edges = GRAPH_EDGES.map((e) => {
    const from = graphNodeById(e.from);
    const to = graphNodeById(e.to);
    if (!from || !to) return "";
    return `<path class="graph-edge ${e.main ? "main" : "secondary"}"
                  data-from="${e.from}" data-to="${e.to}"
                  d="${edgePath(from, to)}"
                  marker-end="url(#arrow)"></path>`;
  }).join("");

  const nodes = GRAPH_NODES.map((n) => {
    const selected = n.id === state.graphNode ? "selected" : "";
    const type = n.type
      ? `<text class="node-type" x="${n.x + 30}" y="${n.y + 44}">${escapeHtml(n.type)}</text>`
      : "";
    return `
      <g class="graph-node ${selected}" data-node="${n.id}" style="--c:${n.color}"
         tabindex="0" role="button" aria-label="${escapeHtml(n.label)}">
        <rect x="${n.x}" y="${n.y}" width="${n.w}" height="60" rx="12" ry="12"></rect>
        <circle class="node-dot" cx="${n.x + 16}" cy="${n.y + 30}" r="4"></circle>
        <text x="${n.x + 30}" y="${n.y + 27}">${escapeHtml(n.label)}</text>
        ${type}
      </g>`;
  }).join("");

  svg.innerHTML = defs + edges + nodes;

  $$(".graph-node", svg).forEach((node) => {
    const id = node.dataset.node;
    const activate = () => {
      $$(".graph-edge", svg).forEach((edge) => {
        const on = edge.dataset.from === id || edge.dataset.to === id;
        edge.classList.toggle("active", on);
      });
    };
    const deactivate = () => {
      $$(".graph-edge.active", svg).forEach((edge) => edge.classList.remove("active"));
    };
    node.addEventListener("mouseenter", activate);
    node.addEventListener("mouseleave", deactivate);
    node.addEventListener("focus", activate);
    node.addEventListener("blur", deactivate);
    node.addEventListener("click", () => {
      state.graphNode = id;
      $$(".graph-node", svg).forEach((n) =>
        n.classList.toggle("selected", n.dataset.node === id)
      );
      renderGraphDetail();
    });
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        node.click();
      }
    });
  });
}

function renderGraphDetail() {
  const host = $("#graphDetail");
  const n = graphNodeById(state.graphNode);
  if (!host || !n) return;
  host.style.setProperty("--c", n.color);
  host.innerHTML = `
    <span class="graph-type">${escapeHtml(n.type || "NODE")}</span>
    <h3>${escapeHtml(n.label)}</h3>
    <p>${escapeHtml(n.detail)}</p>
    <div class="graph-links">
      ${n.links.map((x) => `<span class="graph-link">↳ ${escapeHtml(x)}</span>`).join("") || '<span class="graph-link">无下游依赖</span>'}
    </div>
    <div class="graph-one-liner">${escapeHtml(n.one)}</div>
  `;
}

/* =========================================================
   渲染：加功能向导
   ========================================================= */

function renderWizard() {
  const grid = $("#wizardGrid");
  const detail = $("#wizardDetail");
  if (!grid || !detail) return;

  grid.innerHTML = WIZARD_TASKS.map(
    (t) => `
    <button class="wizard-card ${t.id === state.wizard ? "active" : ""}"
            type="button" data-wizard="${t.id}" style="--c:${t.color}">
      <span class="wizard-icon" aria-hidden="true">${t.icon}</span>
      <h3>${escapeHtml(t.title)}</h3>
      <p>${escapeHtml(t.short)}</p>
    </button>`
  ).join("");

  $$(".wizard-card", grid).forEach((btn) => {
    btn.addEventListener("click", () => {
      state.wizard = btn.dataset.wizard;
      renderWizard();
    });
  });

  const task = WIZARD_TASKS.find((t) => t.id === state.wizard) || WIZARD_TASKS[0];
  detail.style.setProperty("--c", task.color);
  detail.innerHTML = `
    <h3>${task.icon} ${escapeHtml(task.title)}</h3>
    <p class="wizard-sub">${escapeHtml(task.intro)}</p>
    <div class="wizard-section">
      <h4>改哪一层</h4>
      <p class="muted">${escapeHtml(task.layer)}</p>
    </div>
    <div class="wizard-section">
      <h4>改哪些文件</h4>
      <div class="path-row">
        ${task.files
          .map(
            (f) => `
          <span class="path-pill">${escapeHtml(f)}
            <button class="copy-btn" type="button" data-copy="${escapeHtml(f)}">复制</button>
          </span>`
          )
          .join("")}
      </div>
    </div>
    <div class="wizard-section">
      <h4>步骤</h4>
      <ol class="wizard-list">${task.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
    </div>
    <div class="wizard-section">
      <h4>不要动 / 注意</h4>
      <ul class="danger-list">${task.dont.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
    </div>
    <div class="wizard-section">
      <h4>怎么验证</h4>
      <ul class="wizard-list">${task.verify.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
    </div>
    <div class="wizard-section">
      <h4>构建命令</h4>
      <pre class="code-block"><code>${highlightCode(task.command)}</code></pre>
    </div>
  `;

  $$(".copy-btn", detail).forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      copyText(btn.dataset.copy, btn);
    });
  });
}

/* =========================================================
   渲染：文件词典
   ========================================================= */

function allDictEntries() {
  return LAYERS.flatMap((l) =>
    l.folders.flatMap((f) => {
      const group = {
        ...f,
        layerId: l.id,
        layerName: l.name,
        color: l.color,
        groupName: "",
        groupPath: "",
        kind: "group",
      };
      const info = GROUP_DETAILS[groupKey(l.id, f.name)] || groupInfo([], [], [], [], []);
      const children = info.children.map((child) => ({
        ...child,
        layerId: l.id,
        layerName: l.name,
        color: l.color,
        groupName: f.name,
        groupPath: f.path,
        kind: "file",
      }));
      return [group, ...children];
    })
  );
}

function renderDictFilters() {
  const host = $("#dictFilters");
  if (!host) return;
  const items = [{ id: "all", name: "全部", color: "#94a3b8" }, ...LAYERS.map((l) => ({ id: l.id, name: l.name, color: l.color }))];
  host.innerHTML = items
    .map(
      (item) => `
      <button class="dict-filter ${state.dictLayer === item.id ? "active" : ""}"
              type="button" data-filter="${item.id}" style="--c:${item.color}">
        ${escapeHtml(item.name)}
      </button>`
    )
    .join("");

  $$(".dict-filter", host).forEach((btn) => {
    btn.addEventListener("click", () => {
      state.dictLayer = btn.dataset.filter;
      renderDictFilters();
      renderDict();
    });
  });
}

function renderDict() {
  const host = $("#dictGrid");
  const count = $("#dictCount");
  if (!host) return;

  const q = state.dictQuery.trim().toLowerCase();
  const entries = allDictEntries().filter((e) => {
    if (state.dictLayer !== "all" && e.layerId !== state.dictLayer) return false;
    if (!q) return true;
    const hay = [
      e.name,
      e.path,
      e.desc,
      e.detail,
      (e.tags || []).join(" "),
      e.layerName,
      e.groupName,
      e.groupPath,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  if (count) count.textContent = `${entries.length} 个条目`;

  if (!entries.length) {
    host.innerHTML = `<div class="empty-state">没有找到匹配的文件夹。换个关键词，或点“全部”。</div>`;
    return;
  }

  host.innerHTML = entries
    .map(
      (e, i) => `
      <article class="dict-card" data-dict="${i}" style="--c:${e.color}">
        <div class="dict-layer">
          ${escapeHtml(e.layerName)}${e.groupName ? ` · ${escapeHtml(e.groupName)}` : ""}
          <span class="dict-kind">${e.kind === "group" ? "子文件夹" : e.kind === "folder" ? "子目录" : "文件/接口"}</span>
        </div>
        <h3>${escapeHtml(e.name)}</h3>
        <div class="dict-desc" style="font-family:var(--mono);font-size:10px;color:var(--faint);">${escapeHtml(e.path)}</div>
        <p class="dict-desc">${escapeHtml(e.desc)}</p>
        <div class="dict-extra">
          <p>${escapeHtml(e.detail || e.desc)}</p>
          ${e.warn ? `<div class="warn">${escapeHtml(e.warn)}</div>` : ""}
          <div class="tags">${(e.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
        </div>
      </article>`
    )
    .join("");

  $$(".dict-card", host).forEach((card) => {
    card.addEventListener("click", () => card.classList.toggle("open"));
  });
}

/* =========================================================
   渲染：小测验
   ========================================================= */

function renderQuiz() {
  const host = $("#quizList");
  const score = $("#quizScore");
  if (!host) return;

  host.innerHTML = QUIZ.map(
    (q, qi) => `
    <article class="quiz-card ${state.quiz.has(qi) ? "answered" : ""}" data-q="${qi}">
      <h3>${qi + 1}. ${escapeHtml(q.q)}</h3>
      <div class="quiz-options">
        ${q.options
          .map(
            (opt, oi) => `
          <button class="option" type="button" data-q="${qi}" data-o="${oi}">
            <span class="option-key">${String.fromCharCode(65 + oi)}</span>
            <span>${escapeHtml(opt)}</span>
          </button>`
          )
          .join("")}
      </div>
      <div class="quiz-explain">${escapeHtml(q.explain)}</div>
    </article>`
  ).join("");

  $$(".option", host).forEach((btn) => {
    btn.addEventListener("click", () => {
      const qi = Number(btn.dataset.q);
      const oi = Number(btn.dataset.o);
      if (state.quiz.has(qi)) return;
      state.quiz.set(qi, oi);
      const card = btn.closest(".quiz-card");
      card.classList.add("answered");
      $$(".option", card).forEach((b) => {
        const index = Number(b.dataset.o);
        b.disabled = true;
        if (index === QUIZ[qi].answer) b.classList.add("correct");
        if (index === oi && oi !== QUIZ[qi].answer) b.classList.add("wrong");
      });
      updateQuizScore();
    });
  });

  updateQuizScore();
}

function updateQuizScore() {
  const score = $("#quizScore");
  if (!score) return;
  let correct = 0;
  state.quiz.forEach((answer, qi) => {
    if (answer === QUIZ[qi].answer) correct++;
  });
  score.textContent = `答对 ${correct} / ${QUIZ.length}`;
}

/* =========================================================
   初始化与事件
   ========================================================= */

function initTheme() {
  document.documentElement.dataset.theme = state.theme;
  const btn = $("#themeToggle");
  if (btn) btn.textContent = state.theme === "dark" ? "🌙" : "☀️";
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("ef-theme", state.theme);
  } catch (e) {
    /* ignore */
  }
  initTheme();
}

function initReveal() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  items.forEach((el) => observer.observe(el));
}

function initNav() {
  const nav = $("#nav");
  const toggle = $("#navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", nav).forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  const topbar = $(".topbar");
  window.addEventListener(
    "scroll",
    () => {
      if (topbar) topbar.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true }
  );
}

function initJourneyControls() {
  $("#btnPrev")?.addEventListener("click", () => {
    stopAutoPlay();
    setStep(state.step - 1);
  });
  $("#btnNext")?.addEventListener("click", () => {
    stopAutoPlay();
    setStep(state.step + 1);
  });
  $("#btnAuto")?.addEventListener("click", toggleAutoPlay);
  $("#btnReplay")?.addEventListener("click", () => {
    stopAutoPlay();
    setStep(0);
  });
}

function initGraphControls() {
  $("#btnGraphMode")?.addEventListener("click", () => {
    state.graphMode = state.graphMode === "main" ? "all" : "main";
    const btn = $("#btnGraphMode");
    if (btn) btn.textContent = state.graphMode === "main" ? "显示全部" : "只看主链";
    renderGraph();
  });
}

function initDictControls() {
  const search = $("#dictSearch");
  if (search) {
    search.addEventListener("input", () => {
      state.dictQuery = search.value;
      renderDict();
    });
  }
}

function initQuizControls() {
  $("#quizReset")?.addEventListener("click", () => {
    state.quiz.clear();
    renderQuiz();
  });
}

function init() {
  initTheme();
  renderHeroStack();
  renderPainCards();
  renderLayerList();
  renderGroupList();
  renderCrosscut();
  renderLayerDetail();
  renderScenarioTabs();
  renderJourneySteps();
  renderJourneyCard();
  renderGraph();
  renderGraphDetail();
  renderWizard();
  renderDictFilters();
  renderDict();
  renderQuiz();
  initReveal();
  initNav();
  initJourneyControls();
  initGraphControls();
  initDictControls();
  initQuizControls();

  $$("#whyToggle button").forEach((btn) => {
    btn.addEventListener("click", () => setWhyView(btn.dataset.view));
  });
  $("#btnBoardSwap")?.addEventListener("click", updateBoardSwap);
  $("#themeToggle")?.addEventListener("click", toggleTheme);

  // 默认打开第一个文件夹，给用户一个“可以点”的提示
  const firstFolder = $(".folder-head");
  if (firstFolder) firstFolder.click();
}

init();
