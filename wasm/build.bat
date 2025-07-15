@echo off
REM WASM 빌드 스크립트 (Windows)

echo 🚀 WASM Slicer 빌드 시작...

REM Emscripten 환경 설정 확인
if "%EMSDK%"=="" (
    echo ❌ Emscripten SDK가 설정되지 않았습니다.
    echo 다음 명령어로 Emscripten을 설치하세요:
    echo git clone https://github.com/emscripten-core/emsdk.git
    echo cd emsdk
    echo emsdk install latest
    echo emsdk activate latest
    echo emsdk_env.bat
    pause
    exit /b 1
)

REM 빌드 디렉토리 생성
if not exist "build" mkdir build
cd build

REM CMake 설정
echo 📦 CMake 설정 중...
emcmake cmake ..

REM 빌드 실행
echo 🔨 WASM 모듈 빌드 중...
emmake make

REM 결과 확인
if exist "slicer.js" if exist "slicer.wasm" (
    echo ✅ WASM 빌드 성공!
    echo 📁 생성된 파일:
    echo   - slicer.js (JavaScript 래퍼)
    echo   - slicer.wasm (WebAssembly 모듈)
    
    REM 파일 크기 확인
    echo 📊 파일 크기:
    for %%F in (slicer.js) do echo   - slicer.js: %%~zF bytes
    for %%F in (slicer.wasm) do echo   - slicer.wasm: %%~zF bytes
    
    REM public 디렉토리로 복사
    echo 📋 public 디렉토리로 복사 중...
    copy slicer.js ..\..\public\
    copy slicer.wasm ..\..\public\
    
    echo 🎉 WASM Slicer가 성공적으로 빌드되었습니다!
) else (
    echo ❌ WASM 빌드 실패!
    pause
    exit /b 1
)

cd ..
pause 