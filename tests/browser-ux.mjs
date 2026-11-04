// UX regression entry point. The former runner targeted the pre-Frame-11
// inventory/fusion UI and obsolete rules. Keep this command on the maintained
// tablet suite; the original runner is retained in the pre-integration archive.
// Run: node tests/browser-ux.mjs [path-to-Chromium-or-Edge]
// Requires Python Playwright (the runner also discovers ignored .test-tools).
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';

const runner=resolve(import.meta.dirname,'browser-frame11.py');
const env={...process.env};
if(process.argv[2])env.PQ_EDGE_EXECUTABLE=resolve(process.argv[2]);
const child=spawn(process.env.PYTHON||'python',[runner,'edge'],{stdio:'inherit',windowsHide:true,env});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
