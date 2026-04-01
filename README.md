# Swytch.sh 
A real-time, collaborative multiplayer drawing and guessing game.

swytch.sh is a unique twist on the classic "Pictionary" style game. Unlike traditional games where one person draws the entire word, swytch forces two players to collaborate on a single drawing. The catch? The pen "swytches" between them every 20 seconds. It’s a test of intuition, teamwork, and artistic speed.

Play [**Swytch.sh Live**](https://swytch-sh-app.onrender.com/)

> **Note:** This project is hosted on a Render free tier. If the site has been inactive, the backend server may take **up to 50 seconds** to "wake up" before you can create or join a room.

---

## 🚀 Key Features
* **Unique "Relay" Mechanic:** Two players (The Starter and The Finisher) share the drawing duties in 20-second intervals.
* **Real-Time Interaction:** Powered by Socket.io for instantaneous drawing sync and chat-based guessing.
* **Fully Responsive:** Play on a laptop with a massive canvas or on your phone with a touch-optimized UI.
* **Custom Game Settings:** Hosts can adjust the number of rounds and drawing time to fit their group.
* **Dynamic Avatars:** Choose from a library of 50+ unique pixel-art characters.
* **Smart Tools:** Includes a flood-fill (bucket) tool, eraser, and full Undo/Redo history.

---

## 🎮 How to Play
1.  **Join the Lobby:** Enter your name, pick an avatar, and share your Room ID with friends.
2.  **The Roles:** 
    * **Drawer 1 (The Foundation):** You see the secret word immediately. You have 20 seconds to start the sketch before the pen is taken away.
    * **Drawer 2 (The Finisher):** You start with only a hint (dashes and a few letters). You must pick up exactly where Drawer 1 left off. The secret word is revealed to you only after 60 seconds.
    * **Guessers:** Everyone else watches the live "swytch" and types their guesses in the chat.
3.  **The Swytch:** The drawing control toggles between the two artists every 20 seconds until time runs out.
4.  **Scoring:** Points are awarded based on how quickly the word is guessed. Artists earn points when their peers are successful.

---

## 📸 Screenshots

### A. Landing Page
*Choose your identity and enter the game*
![Landing Page](./screenshots/landing.png)

### B. Game Lobby
*Host controls for setting up rounds and managing players*
![Lobby View](./screenshots/lobby.png)

### C. Desktop Gaming View
*Optimized for a large drawing area with side-by-side chat.*
![Desktop View](./screenshots/desktop_game.png)

### D. Mobile View
*Vertical layout designed for touch-screens*
![Mobile View](./screenshots/mobile_view.png)

### E. The Reveal
*The moment where roles and secret words are assigned.*
![Reveal View](./screenshots/reveal.png)

---

## 🛠️ Tech Stack
* **Frontend:** React.js, Tailwind CSS
* **Backend:** Node.js, Express
* **Real-time Communication:** Socket.io (WebSockets)
* **Deployment:** Render (Web Service & Static Site)

---

## 🛠️ Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/Swytch.sh.git
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   node server.js
   ```

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

4. **Configuration:**
   Update the socket connection in frontend/src/App.js to http://localhost:4000 for local development.
