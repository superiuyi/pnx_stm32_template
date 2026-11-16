#include "tx_api.h"
#include "config.hpp"
#include "bmp.hpp"
#include "oled_test.hpp"

static TX_THREAD oled_thread;
static UCHAR stack[1024];

static void entry(ULONG)
{
    OLED_Init();
    while(1)
    {
        OLED_SendData_Buffer(cat_bmp);
        tx_thread_sleep(500);

        OLED_SendData_Buffer(horse_bmp);
        tx_thread_sleep(500);

        OLED_SendData_Buffer(pig_bmp);
        tx_thread_sleep(500);

        OLED_SendData_Buffer(patrick_bmp);
        tx_thread_sleep(500);
    }
}

void oled_start()
{
    tx_thread_create(&oled_thread, (CHAR*)"oled_thread", entry, 0,
                     stack, sizeof(stack), 15, 15,
                     TX_NO_TIME_SLICE, TX_AUTO_START);
}