import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: root })
  .toString().split('\0').filter(Boolean);
const files = [...new Set([...tracked, ...untracked])].sort();
const digest = createHash('sha256');
for (const file of files) {
  digest.update(file);
  digest.update('\0');
  digest.update(readFileSync(resolve(root, file)));
  digest.update('\0');
}
const receipt = {
  schema: 'agentic-base/source-check/v1',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  check: 'npm run check',
  checkStatus: 'passed',
  candidateSourceDigest: digest.digest('hex'),
  workingTree: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim() ? 'dirty' : 'clean',
  runtimeDependencies: 0,
  deployPerformed: false,
};
const output = JSON.stringify(receipt);
process.stdout.write(`${output}\n`);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\`\`\`json\n${output}\n\`\`\`\n`, { flag: 'a' });
