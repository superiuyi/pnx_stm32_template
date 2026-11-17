#include "tx_api.h"
#include "user_config.hpp"
#include <cstdio>
#include "bmi088.hpp"
#include "bsp_usart.hpp"

static TX_THREAD bmi088_thread;
static UCHAR stack[4096];
static imu::bmi088 sensor{user_config::bmi088};
alignas(8) static uint8_t heater_stack[user_config::bmi088_heater_stack_size];
static void entry(ULONG)
{
    pnxtypes::status bmi_status = sensor.configure();
    pnxtypes::status heater_status = imu::bmi088_heater::init(user_config::bmi088_thermal,user_config::bmi088_heater,heater_stack,sizeof(heater_stack));
    for(;;)
    {
        float temp=0;
        math::vector3 accel{};
        math::vector3 gyro{};
        sensor.read_acc(&accel);
        sensor.read_gyro(&gyro);
        sensor.read_temperature(&temp);
        imu::bmi088_heater::submit(temp, HAL_GetTick());
        const auto heater = imu::bmi088_heater::read();

        char prt[128];
        int n=snprintf(prt, sizeof(prt), 
        "temp=%d ax=%d ay=%d az=%d | gx=%d gy=%d gz=%d\n", 
        (long)(temp),
        (long)(accel.x*1000.0f),
        (long)(accel.y * 1000.0f),
        (long)(accel.z * 1000.0f),
        (long)(gyro.x * 1000.0f),
        (long)(gyro.y * 1000.0f),
        (long)(gyro.z * 1000.0f));

        tx_thread_sleep(100);
        // bsp::usart::transmit();

    }
   // pnxtypes::status a=sensor.readreg();
}

void bmi088_start()
{
    tx_thread_create(&bmi088_thread, (CHAR*)"bmi088_thread", entry, 0,
                     stack, sizeof(stack), 15, 15,
                     TX_NO_TIME_SLICE, TX_AUTO_START);
}