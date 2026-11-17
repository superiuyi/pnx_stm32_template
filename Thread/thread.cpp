
void led_start();
void oled_start();
void bmi088_start();

extern "C" void app_start()
{
    led_start();
    oled_start();
    bmi088_start();
}