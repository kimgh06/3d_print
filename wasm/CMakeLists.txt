cmake_minimum_required(VERSION 3.16)
project(WASMSlicer)

# Emscripten 설정
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Emscripten 컴파일러 플래그
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O2 -s WASM=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']")

# 소스 파일
set(SOURCES
    src/slicer.cpp
)

# WASM 모듈 생성
add_executable(slicer ${SOURCES})

# Emscripten 링커 플래그
set_target_properties(slicer PROPERTIES
    SUFFIX ".js"
    LINK_FLAGS "-s EXPORTED_FUNCTIONS=['_main'] -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=128MB"
)

# 출력 디렉토리 설정
set_target_properties(slicer PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}"
) 