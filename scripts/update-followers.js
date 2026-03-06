const fs = require('fs');
const path = require('path');

const README_FILE = path.join(__dirname, '..', 'README.md');
const GITHUB_USER = 'Senzo13';

async function getFollowers() {
  const url = `https://api.github.com/users/${GITHUB_USER}/followers?per_page=5`;
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function getFollowerCount() {
  const url = `https://api.github.com/users/${GITHUB_USER}`;
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  return data.followers;
}

function generateFollowersMarkdown(followers, totalCount) {
  let md = '';
  md += '<table align="center">\n';
  md += '  <thead>\n';
  md += '    <tr>\n';
  md += `      <th colspan="3" width="512">Last Followers</th>\n`;
  md += '    </tr>\n';
  md += '  </thead>\n';
  md += '  <tbody>\n';

  followers.forEach((follower, i) => {
    const num = totalCount - i;
    md += '    <tr>\n';
    md += `      <td align="center">${num}</td>\n`;
    md += '      <td align="center">\n';
    md += `        <a href="https://github.com/${follower.login}">\n`;
    md += `          <img src="${follower.avatar_url}&s=40" alt="${follower.login}" width="40" height="40"/>\n`;
    md += '        </a>\n';
    md += '      </td>\n';
    md += '      <td>\n';
    md += `        <a href="https://github.com/${follower.login}">@${follower.login}</a>\n`;
    md += '      </td>\n';
    md += '    </tr>\n';
  });

  // "Maybe You?" row
  md += '    <tr>\n';
  md += `      <td align="center">${totalCount + 1}</td>\n`;
  md += `      <td align="center" colspan="2"><b>Maybe You?</b> <sub>(updated every hour)</sub></td>\n`;
  md += '    </tr>\n';

  md += '  </tbody>\n';
  md += '</table>';

  return md;
}

async function main() {
  console.log('Fetching followers...');
  const [followers, totalCount] = await Promise.all([
    getFollowers(),
    getFollowerCount()
  ]);

  console.log(`Found ${followers.length} recent followers (total: ${totalCount})`);

  const md = generateFollowersMarkdown(followers, totalCount);

  let readme = fs.readFileSync(README_FILE, 'utf8');
  const startMarker = '<!-- FOLLOWERS_START -->';
  const endMarker = '<!-- FOLLOWERS_END -->';

  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find FOLLOWERS markers in README.md');
    process.exit(1);
  }

  const before = readme.substring(0, startIdx + startMarker.length);
  const after = readme.substring(endIdx);

  readme = before + '\n' + md + '\n' + after;

  // Update timestamp
  const tsStart = '<!-- TIMESTAMP_START -->';
  const tsEnd = '<!-- TIMESTAMP_END -->';
  const tsStartIdx = readme.indexOf(tsStart);
  const tsEndIdx = readme.indexOf(tsEnd);
  if (tsStartIdx !== -1 && tsEndIdx !== -1) {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = days[now.getUTCDay()];
    const month = months[now.getUTCMonth()];
    const date = now.getUTCDate();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const timestamp = `${day} ${month} ${date} at ${hours}:${minutes} UTC`;
    const tsBefore = readme.substring(0, tsStartIdx + tsStart.length);
    const tsAfter = readme.substring(tsEndIdx);
    readme = tsBefore + `\n<p align="right"><sub>Last updated: ${timestamp}</sub></p>\n` + tsAfter;
  }

  fs.writeFileSync(README_FILE, readme);
  console.log('README updated with latest followers!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
