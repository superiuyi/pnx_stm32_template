#include "tx_api.h"
#include "bsp_gpio.hpp"
#include "config.hpp"

static TX_THREAD led_thread;
static UCHAR stack[1024];

static void entry(ULONG)
{
    for (;;)
    {
        bsp::gpio::toggle(board::led::green);
        tx_thread_sleep(500);
        bsp::gpio::toggle(board::led::red);
        tx_thread_sleep(500);
        bsp::gpio::toggle(board::led::blue);
        tx_thread_sleep(500);
    }
}

void led_start()
{

    tx_thread_create(&led_thread, (CHAR*)"thread", entry, 0,
                     stack, sizeof(stack), 15, 15,
                     TX_NO_TIME_SLICE, TX_AUTO_START);
}