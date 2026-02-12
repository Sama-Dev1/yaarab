#include <emscripten/emscripten.h>
#include <iostream>
#include <cmath>

extern "C" {

    // EMSCRIPTEN_KEEPALIVE makes sure the function is available in JS
    EMSCRIPTEN_KEEPALIVE
    float calculateDamage(float baseDamage, float chargeMultiplier, float distance) {
        // Advanced C++ logic for damage calculation
        // Damage falls off with distance
        float distanceFactor = 1.0f / (1.0f + (distance * 0.01f));
        float totalDamage = baseDamage * chargeMultiplier * distanceFactor;
        
        return totalDamage;
    }

    EMSCRIPTEN_KEEPALIVE
    bool checkCollision(float r1x, float r1y, float r1w, float r1h,
                        float r2x, float r2y, float r2w, float r2h) {
        // High-performance AABB collision detection in C++
        return (r1x < r2x + r2w &&
                r1x + r1w > r2x &&
                r1y < r2y + r2h &&
                r1y + r1h > r2y);
    }
}

int main() {
    std::cout << "C++ Game Engine Initialized via WebAssembly" << std::endl;
    return 0;
}
