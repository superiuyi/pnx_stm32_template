C610：不断读取数据，用来存数据->过滤器（看看反馈帧的id是不是在设置的范围里面）->Rx FIFO0/FIFO1(3个mailbox)->触发中断->挂起数据
```cpp
void HAL_CAN_RxFifo0MsgPendingCallback(CAN_HandleTypeDef *hcan)
{
    CAN_RxHeaderTypeDef rx;
    uint8_t data[8];
    HAL_CAN_GetRxMessage(hcan, CAN_RX_FIFO0, &rx, data);
    // 解析电机角度、转速、电流、温度
}
//“请去操作 hcan1 代表的 CAN1 外设，从它的 FIFO0 里取一帧数据。”
