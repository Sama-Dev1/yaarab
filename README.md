# NEON STRIKE: Online Multiplayer

A high-performance two-player fighting game built with a hybrid tech stack:

## 🚀 Tech Stack
- **Frontend**: JavaScript (ES6+, Canvas API) & CSS3 (Glassmorphism + Neon Design)
- **Engine Logic**: C++ (Intended for WebAssembly)
- **Multiplayer Backend**: C# (.NET 8.0 SignalR)

## 📂 Project Structure
- `/client`: The web-based game interface.
- `/engine`: C++ source code for high-performance physics/damage.
- `/server`: C# ASP.NET Core Web API with SignalR for real-time sync.

## 🕹️ How to Play (Online)
1.  **Start the Server**:
    - You must have the **.NET 8.0 SDK** installed.
    - Open a terminal in the `server` folder.
    - Run: `dotnet run`
    - The server will listen on `http://localhost:5000`.

2.  **Start the Client**:
    - Open `client/index.html` in **two different browser windows**.
    - In Window A, click **"Join as Player 1"**.
    - In Window B, click **"Join as Player 2"**.
    - Use **WASD** to control Player 1 (Window A).
    - Use **Arrow Keys** to control Player 2 (Window B).
    - You will see movements synchronized in real-time!

## 🔧 Building the C++ Engine (Optional)
To use the C++ logic for damage calculation:
1.  Install Emscripten.
2.  Run:
    ```bash
    emcc engine/engine.cpp -o client/engine.js -s EXPORTED_FUNCTIONS="['_calculateDamage', '_checkCollision']" -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap']"
    ```

## ⚠️ Troubleshooting
- **Server Not Starting**: Ensure you have .NET SDK installed (`dotnet --version`).
- **Connection Failed**: Ensure the server is running on port 5000 before opening the game.
