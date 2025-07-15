#!/bin/bash

# WASM 빌드 스크립트

echo "🚀 WASM Slicer 빌드 시작..."

# Emscripten 환경 설정
if [ -z "$EMSDK" ]; then
    echo "❌ Emscripten SDK가 설정되지 않았습니다."
    echo "다음 명령어로 Emscripten을 설치하세요:"
    echo "git clone https://github.com/emscripten-core/emsdk.git"
    echo "cd emsdk"
    echo "./emsdk install latest"
    echo "./emsdk activate latest"
    echo "source ./emsdk_env.sh"
    exit 1
fi

# 빌드 디렉토리 생성
mkdir -p build
cd build

# CMake 설정
echo "📦 CMake 설정 중..."
emcmake cmake ..

# 빌드 실행
echo "🔨 WASM 모듈 빌드 중..."
emmake make

# 결과 확인
if [ -f "slicer.js" ] && [ -f "slicer.wasm" ]; then
    echo "✅ WASM 빌드 성공!"
    echo "📁 생성된 파일:"
    echo "  - slicer.js (JavaScript 래퍼)"
    echo "  - slicer.wasm (WebAssembly 모듈)"
    
    # 파일 크기 확인
    echo "📊 파일 크기:"
    echo "  - slicer.js: $(du -h slicer.js | cut -f1)"
    echo "  - slicer.wasm: $(du -h slicer.wasm | cut -f1)"
    
    # public 디렉토리로 복사
    echo "📋 public 디렉토리로 복사 중..."
    cp slicer.js ../../public/
    cp slicer.wasm ../../public/
    
    echo "🎉 WASM Slicer가 성공적으로 빌드되었습니다!"
else
    echo "❌ WASM 빌드 실패!"
    exit 1
fi 