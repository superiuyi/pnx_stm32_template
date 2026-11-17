UART:
    tx/rx
    优点：线少简单
    缺点：波特率约定一致
    
SPI:
    MOSI
    MISO
    SCK
    CS
    优点：速度快（双向通信，独立时钟，没有应答）
    缺点：布线复杂，没有检验
IIC:
    SDA
    SCL
    优点：布线简单
    缺点：速度慢
CAN:
    CAN_H
    CAN_L
    优点：信号稳定，优先仲裁，没有冲突，不漏数据
    缺点：速度比较慢

ACK：收到了数据 CAN,IIC
CRC:检验了数据 CAN
通信协议都需要单独供电
    比如说CAN通信：在C板上面有CAN1和CAN2，其中CAN1有两个接口，就需要单独供电。CAN_2有4个接口可以由开发板供电