




C610：
    不断读取数据，用来存数据->过滤器（看看反馈帧的id是不是在设置的范围里面）->Rx FIFO0/FIFO1(3个mailbox)->触发中断->挂起数据
```cpp
    void HAL_CAN_RxFifo0MsgPendingCallback(CAN_HandleTypeDef *hcan)
    {
        CAN_RxHeaderTypeDef rx;
        uint8_t data[8];
        HAL_CAN_GetRxMessage(hcan, CAN_RX_FIFO0, &rx, data);
        // 解析电机角度、转速、电流、温度
    }
    //“请去操作 hcan1 代表的 CAN1 外设，从它的 FIFO0 里取一帧数据。”

    每一个C610都有对应的id:
    id设置：长按设置，闪烁检验，橙长设置，橙闪冲突

CAN的要求：
要接两个120欧姆的电阻，一个在C板的内部，一个要手动调整

    菊花链

        C 板 CAN1（内置 120Ω）      C610 #1（OFF）        C610 #2（ON）
        CAN_H ──┬──────────────────┬──────────────────┬──
                │                  │                  │
            [120Ω]             (OFF)              [120Ω]
                │                  │                  │
        CAN_L ──┴──────────────────┴──────────────────┴──
    星状链

        两个can1口只是并联关系
        其实和菊花链一模一样

CAN的帧：
    控制帧：
        0x200 控制 ID 1～4
        0x1FF 控制 ID 5～8
        一帧 8 字节，放 4 个电机
        每个电机 2 字节
    反馈帧：0x201～0x208
        一条 CAN 最多 8 个 DJI 电机
CAN的发送和接收：
    发送：
    CPU → 发送邮箱 Mailbox → CAN 控制器 → 收发器 → CAN_H/CAN_L

    接收：
    CAN_H/CAN_L → 收发器 → 过滤器 Filter → 接收 FIFO → 中断 → 回调

//
1. 核心术语
术语	含义
Bus	总线，多个节点共享 CAN_H / CAN_L
Node	节点，比如控制板、C610、C620
Frame	一帧 CAN 数据：ID + 数据
Standard ID	11 位 ID
Extended ID	29 位 ID
DLC	数据长度，经典 CAN 是 0～8 字节
Bitrate	位速率，DJI 电机是 1 Mbps
Arbitration	仲裁，ID 越小优先级越高
ACK	接收确认
CRC	数据校验
Transceiver	收发器，比如 TJA1044，把 TTL 变成差分信号
Termination	终端电阻，通常 120Ω
Filter	硬件过滤器，决定哪些 ID 能进 FIFO
FIFO	接收队列，先入先出
Mailbox	发送邮箱，待发送帧的硬件槽位
Bus-off	总线关闭，错误太多后控制器离线