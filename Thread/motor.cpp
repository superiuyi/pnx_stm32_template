#include "tx_api.h"
#include "config.hpp"
#include "dji_manager.hpp"
#include "m2006.hpp"
#include "bsp_dwt.hpp"
#include <cstdint>
#include <cstdio>
#include "usart.h"
static TX_THREAD motor_thread;
static UCHAR stack[2048];
static motor::dji::m2006 left_up;
static motor::dji::m2006 right_up;
static motor::dji::manager motors;


static void entry(ULONG)
{
    int a=0;
    for (;;)
    {
        // 取反馈
        motors.update_feedback(left_up);
        motors.update_feedback(right_up);
        // 先不转，输出 0
        left_up.motor_mode = motor::mode::current;
        right_up.motor_mode = motor::mode::current;
        left_up.cmd.current = 300;
        right_up.cmd.current = 300;

        motors.update();
        motors.transmit(bsp::dwt::timeline_us());//manager要不要transmit
        //时间由set_period决定
        a++;
        if(a==100)
        {
            long v = (long)(left_up.fdb.velocity * 1000.0f);
            bool negative = v < 0;
            if (negative)
            {
                v = -v;
            }
            char prt[256];

            int n = std::snprintf(prt, sizeof(prt),"left_speed=%s%ld.%03ld rad/s\r\n",
            negative ? "-" : "",
            v / 1000,
            v % 1000);
            a=0;
            // int n = std::snprintf(prt, sizeof(prt),"speed=%d.%d rad/s \n",((int)((left_up.fdb.velocity))),((int8_t)((int8_t)(left_up.fdb.velocity*1000)%1000)));
            HAL_UART_Transmit(&huart6, (uint8_t*)prt, (uint16_t)n, 100);
            v = (long)(right_up.fdb.velocity * 1000.0f);
            negative = v < 0;
            if (negative)
            {
                v = -v;
            }
            prt[256];

            n = std::snprintf(prt, sizeof(prt),"right_speed=%s%ld.%03ld rad/s\r\n",
            negative ? "-" : "",
            v / 1000,
            v % 1000);
            a=0;
            HAL_UART_Transmit(&huart6, (uint8_t*)prt, (uint16_t)n, 100);

        }
        tx_thread_sleep(1);
    }
}

void motor_start()
{
    motors.set_period(0.001f);//过多久更新一次
    motors.register_motor(left_up,bsp::can::handle::can1,0x201);   // 反馈 ID
    motors.register_motor(right_up,bsp::can::handle::can1,0x204);   // 反馈 ID

    // 1. 先注册回调
    // 2. 再初始化 CAN
    bsp::can::config can_cfg{
    bsp::can::handle::can1,
    bsp::can::id_type::standard
};

bsp::can::init(can_cfg);
    // 3. 初始化 DWT
    bsp::dwt::init();
    tx_thread_create(&motor_thread, (CHAR*)"motor_thread", entry, 0,
                     stack, sizeof(stack), 15, 15,
                     TX_NO_TIME_SLICE, TX_AUTO_START);
}