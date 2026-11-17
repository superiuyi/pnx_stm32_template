#include "tx_api.h"
#include "user_config.hpp"
#include <cstdio>
#include "bmi088.hpp"
#include "bsp_usart.hpp"

static TX_THREAD bmi088_thread;
static UCHAR stack[4096];
static imu::bmi088 sensor{user_config::bmi088};//构造函数传参数
// namesapce user_config 
// inline constexpr imu::bmi088_config bmi088{board::bmi088::spi, board::bmi088::acc_cs,
        //namespace board::bmi088
        // {
        // inline constexpr auto spi = bsp::spi::handle::spi1;
        // inline constexpr bsp::gpio::config acc_cs{
        //     bsp::gpio::port::a, 4, bsp::active_level::low};
        // inline constexpr bsp::gpio::config gyro_cs{
        //     bsp::gpio::port::b, 0, bsp::active_level::low};
        // }
            //BMI088 使用 SPI1
            // 加速度计 CS = PA4，低有效
            // 陀螺仪 CS  = PB0，低有效
alignas(8) static uint8_t heater_stack[user_config::bmi088_heater_stack_size];
//线程有时候要求8字节对齐

static void entry(ULONG)
{
    pnxtypes::status bmi_status = sensor.configure();//sensor完成初始化
    pnxtypes::status heater_status = imu::bmi088_heater::init(user_config::bmi088_thermal,user_config::bmi088_heater,heater_stack,sizeof(heater_stack));//初始化加热线程，分配栈空间
    for(;;)
    {
        float temp=0;
        math::vector3 accel{};//定义一个三维向量
        math::vector3 gyro{};
        sensor.read_acc(&accel);
        sensor.read_gyro(&gyro);
        sensor.read_temperature(&temp);
        imu::bmi088_heater::submit(temp, HAL_GetTick());//温度+现在时间
        // pid->integral += error * dt;这里 HALGetTick 就是提供 dt
        const auto heater = imu::bmi088_heater::read();

        char prt[128];

        int n=snprintf(prt, sizeof(prt), 
        "temp=%ld.%ld ax=%ld ay=%ld az=%ld | gx=%ld gy=%ld gz=%ld\n", 
        (long)(temp),(long)(((long)(temp*100))%100),
        (long)(accel.x*1000.0f),
        (long)(accel.y * 1000.0f),
        (long)(accel.z * 1000.0f),
        (long)(gyro.x * 1000.0f),
        (long)(gyro.y * 1000.0f),
        (long)(gyro.z * 1000.0f));
        HAL_UART_Transmit(&huart6, (uint8_t*)prt, (uint16_t)n, 100);//stm32不可以识别float类型
        tx_thread_sleep(100);
    }
}

void bmi088_start()
{
    tx_thread_create(&bmi088_thread, (CHAR*)"bmi088_thread", entry, 0,
                     stack, sizeof(stack), 15, 15,
                     TX_NO_TIME_SLICE, TX_AUTO_START);
}