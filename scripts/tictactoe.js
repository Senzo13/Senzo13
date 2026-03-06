const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'game-state.json');
const README_FILE = path.join(__dirname, '..', 'README.md');

const REPO = 'Senzo13/Senzo13';

const EMOJIS = {
  X: ':x:',
  O: ':o:',
  '': ':white_large_square:'
};

const EMOJIS_UNICODE = {
  X: ':x:',
  O: ':o:'
};

function loadState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function checkWinner(board) {
  const lines = [
    [[0,0],[0,1],[0,2]],
    [[1,0],[1,1],[1,2]],
    [[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]],
    [[0,1],[1,1],[2,1]],
    [[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]],
    [[0,2],[1,1],[2,0]]
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a[0]][a[1]] && board[a[0]][a[1]] === board[b[0]][b[1]] && board[a[0]][a[1]] === board[c[0]][c[1]]) {
      return board[a[0]][a[1]];
    }
  }
  return null;
}

function generateBoardMarkdown(state) {
  let md = '';
  md += '<table align="center">\n';

  for (let r = 0; r < 3; r++) {
    md += '  <tr>\n';
    for (let c = 0; c < 3; c++) {
      const cell = state.board[r][c];

      if (cell === '' && state.status === 'playing') {
        const issueTitle = encodeURIComponent(`tictactoe|move|${r}|${c}`);
        const url = `https://github.com/${REPO}/issues/new?title=${issueTitle}&body=Just+click+Submit!`;
        md += `    <td align="center"><a href="${url}">${EMOJIS['']}</a></td>\n`;
      } else if (cell !== '') {
        md += `    <td align="center">${EMOJIS[cell]}</td>\n`;
      } else {
        md += `    <td align="center">${EMOJIS['']}</td>\n`;
      }
    }
    md += '  </tr>\n';
  }

  md += '</table>';

  if (state.status === 'won') {
    md += `\n<p align="center"><b>${EMOJIS[state.winner]} ${state.winner} wins!</b> — played by <a href="https://github.com/${state.last_player}">@${state.last_player}</a></p>`;
    md += `\n<p align="center"><a href="https://github.com/${REPO}/issues/new?title=tictactoe%7Creset&body=Reset+the+board!"><b>:arrows_counterclockwise: New Game</b></a></p>`;
  } else if (state.status === 'draw') {
    md += `\n<p align="center"><b>It's a draw! :handshake:</b></p>`;
    md += `\n<p align="center"><a href="https://github.com/${REPO}/issues/new?title=tictactoe%7Creset&body=Reset+the+board!"><b>:arrows_counterclockwise: New Game</b></a></p>`;
  } else {
    md += `\n<p align="center"><b>Current turn: ${EMOJIS[state.turn]} ${state.turn}</b> — Click a white square to play!</p>`;
  }

  return md;
}

function updateReadme(state) {
  let readme = fs.readFileSync(README_FILE, 'utf8');

  const startMarker = '<!-- TICTACTOE_START -->';
  const endMarker = '<!-- TICTACTOE_END -->';

  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find TICTACTOE markers in README.md');
    process.exit(1);
  }

  const boardMd = generateBoardMarkdown(state);
  const before = readme.substring(0, startIdx + startMarker.length);
  const after = readme.substring(endIdx);

  readme = before + '\n' + boardMd + '\n' + after;
  fs.writeFileSync(README_FILE, readme);
}

function main() {
  const issueTitle = process.env.ISSUE_TITLE || '';
  const issueUser = process.env.ISSUE_USER || 'unknown';

  console.log(`Processing: "${issueTitle}" by ${issueUser}`);

  const parts = issueTitle.split('|');
  if (parts[0] !== 'tictactoe') {
    console.log('Not a tictactoe issue, skipping.');
    process.exit(0);
  }

  const state = loadState();
  const action = parts[1];

  if (action === 'reset') {
    state.board = [['','',''],['','',''],['','','']];
    state.turn = 'X';
    state.moves = 0;
    state.status = 'playing';
    state.last_player = '';
    delete state.winner;
    console.log('Game reset!');
    saveState(state);
    updateReadme(state);
    console.log('COMMENT=Game has been reset! New game started. X goes first.');
    return;
  }

  if (action === 'move') {
    const row = parseInt(parts[2]);
    const col = parseInt(parts[3]);

    if (isNaN(row) || isNaN(col) || row < 0 || row > 2 || col < 0 || col > 2) {
      console.log('COMMENT=Invalid move coordinates.');
      return;
    }

    if (state.status !== 'playing') {
      console.log('COMMENT=Game is already over! Click "New Game" to reset.');
      return;
    }

    if (state.board[row][col] !== '') {
      console.log(`COMMENT=Cell (${row},${col}) is already taken!`);
      return;
    }

    state.board[row][col] = state.turn;
    state.moves++;
    state.last_player = issueUser;

    const winner = checkWinner(state.board);
    if (winner) {
      state.status = 'won';
      state.winner = winner;
      console.log(`COMMENT=${winner} wins! Played by @${issueUser}. Click "New Game" to play again!`);
    } else if (state.moves >= 9) {
      state.status = 'draw';
      console.log(`COMMENT=It's a draw! Click "New Game" to play again!`);
    } else {
      state.turn = state.turn === 'X' ? 'O' : 'X';
      console.log(`COMMENT=@${issueUser} played at (${row},${col}). Next turn: ${state.turn}`);
    }

    saveState(state);
    updateReadme(state);
  }
}

main();
