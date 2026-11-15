cmake_minimum_required(VERSION 3.22.1)
project(joyconmerge LANGUAGES CXX)

add_library(joyconmerge SHARED joyconmerge.cpp)
target_compile_features(joyconmerge PRIVATE cxx_std_17)
target_compile_options(joyconmerge PRIVATE -Wall -Wextra -Werror)
