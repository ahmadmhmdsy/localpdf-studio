@echo off
REM Source MSVC build env then run the rest of the command line.
REM Usage: scripts\with-msvc.cmd <command> [args...]
REM Example: scripts\with-msvc.cmd cargo check --manifest-path src-tauri/Cargo.toml

setlocal

set "MSVC_VER=14.16.27023"
set "MSVC_ROOT=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\%MSVC_VER%"
set "SDK_VER=10.0.22621.0"
set "SDK_ROOT=C:\Program Files (x86)\Windows Kits\10"
set "CARGO_HOME=C:\Users\%USERNAME%\.cargo"

REM Initialize vcvars64 if available (preferred path).
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" >nul
)

REM Explicitly set LIB, INCLUDE, and PATH for the linker.
set "LIB=%MSVC_ROOT%\lib\x64;%SDK_ROOT%\Lib\%SDK_VER%\um\x64;%SDK_ROOT%\Lib\%SDK_VER%\ucrt\x64"
set "INCLUDE=%MSVC_ROOT%\include;%SDK_ROOT%\Include\%SDK_VER%\ucrt;%SDK_ROOT%\Include\%SDK_VER%\um;%SDK_ROOT%\Include\%SDK_VER%\shared;%SDK_ROOT%\Include\%SDK_VER%\winrt"
set "PATH=%MSVC_ROOT%\bin\Hostx64\x64;%SDK_ROOT%\bin\%SDK_VER%\x64;%CARGO_HOME%\bin;%PATH%"

REM Hand off to the requested command.
%*
endlocal
