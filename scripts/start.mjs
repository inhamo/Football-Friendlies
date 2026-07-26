import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const terminal = createInterface({ input, output });

console.log('\nFriendlies · Expo 54\n');
console.log('1  Start on this network');
console.log('2  Start with a tunnel');

const answer = (await terminal.question('\nChoose 1 or 2: ')).trim();
terminal.close();

const useTunnel = answer === '2';
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['expo', 'start', ...(useTunnel ? ['--tunnel'] : [])];

console.log(`\nStarting Friendlies${useTunnel ? ' with a tunnel' : ''}…\n`);

const child = spawn(command, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
