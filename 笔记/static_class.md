class

普通成员：每个对象一份，跟着对象走。
static 成员：属于类，不属于对象。
static constexpr 类成员：属于类，且每个 .cpp 各有一份相同的编译期常量。
inline constexpr 类成员：属于类，且整个程序共享同一份。

namespace 只负责给名字加前缀，比如 NS::x；
static 负责说：这个名字只在当前 .cpp 里有效！！！！！！