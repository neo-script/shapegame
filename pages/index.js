// pages/index.js
import Head from 'next/head';
import Script from 'next/script';
import '../public/style.css';

export default function Home() {
  return (
    <>
      <Head>
        <title>Circles vs Triangles</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Schoolbell&display=swap"
          rel="stylesheet"
        />
      </Head>

      <canvas id="gameCanvas"></canvas>
      <h1 id="title">Circles vs Triangles</h1>
      <div id="scoreDisplay">0</div>
      <button id="startBtn">Start Game</button>
      <button id="restartBtn">Retry</button>

      <aside id="leftSidebar">
        <section id="userSection">
          <h3>Username</h3>
          <div id="usernameRow">
            <input type="text" id="usernameInput" placeholder="Enter a name" />
            <button id="saveNameBtn" className="iconBtn">✓</button>
          </div>
          <p id="usernameHint">Press <b>Enter</b> or click <b>✓</b> to save</p>
          <p id="usernameError">This username is taken</p>
          <button id="pauseBtn" className="sideBtn">Pause</button>
        </section>

        <section id="leaderboardSection">
          <h3>Leaderboard</h3>
          <ul id="leaderboardList"></ul>
        </section>
      </aside>

      {/* Load your vanilla JS game logic */}
      <Script src="/script.js" strategy="afterInteractive" />
    </>
  );
}
