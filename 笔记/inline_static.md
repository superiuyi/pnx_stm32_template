
// A.hpp
#pragma once
static constexpr int a = 10;      // B.cpp、C.cpp 各自一份
inline constexpr int b = 10;      // B.cpp、C.cpp 共享同一份