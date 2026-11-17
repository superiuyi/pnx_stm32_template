namespace 是“名字的文件夹”，其本质就是决定了内部的函数的作用域。
出现就是为了解决函数名字重复的问题

class 是“定义一种新类型”

如何定义一个新类型：
    struct
    class
    enum class status : uint8_t
    {
        ok = 0,
        error,
        not_configured,
        invalid_arg,
        busy,
        not_initialized,
        timeout,
    };
    默认赋值规则，error=1，not_configured=2......

