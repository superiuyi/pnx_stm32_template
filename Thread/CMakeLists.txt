target_sources(${CMAKE_PROJECT_NAME} PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}/thread.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/led.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/oled.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/bmi088.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/motor.cpp"

)
# #  写法 1：绝对路径（当前做法，最清晰）
# target_sources(${CMAKE_PROJECT_NAME} PRIVATE
#     "${CMAKE_CURRENT_SOURCE_DIR}/thread.cpp")

# # 写法 2：相对路径（相对当前源码目录）
# target_sources(${CMAKE_PROJECT_NAME} PRIVATE thread.cpp)

# # 写法 3：直接在顶层 add_executable 里写
# add_executable(${PROJECT_NAME} Thread/thread.cpp)