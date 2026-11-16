
void led_start();
void oled_start();
extern "C" void app_start()
{
    led_start();
    oled_start();
}