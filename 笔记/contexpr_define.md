define:
    本质：在编译之前替换文本
    缺点：污染全局，不参与调试
constexpr:
    本质：在define的基础上加上了限定
    其实就是普通的char int long long 提前算好了值而已

    优点：
    不会污染全局：static constexpr
    有类型
    可以参与调试
    有作用域
    编译器执行：
        constexpr int square(int x) { return x * x; }
        constexpr int v = square(5);   // 编译期就是 25，运行时零开销
    