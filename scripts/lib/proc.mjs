import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

function quote(arg) {
    if (/^[\w@%+=:,./\\-]+$/.test(arg)) return arg;
    return isWindows ? `"${arg.replace(/"/g, '\\"')}"` : `'${arg.replace(/'/g, `'\\''`)}'`;
}

export function runShell(command, args = [], { inherit = false, cwd } = {}) {
    const line = [command, ...args.map(quote)].join(' ');
    const result = spawnSync(line, {
        shell: true,
        cwd,
        stdio: inherit ? 'inherit' : 'pipe',
        encoding: 'utf8',
    });
    return {
        ok: result.status === 0,
        status: result.status,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
    };
}

export function hasCommand(command, versionArg = '--version') {
    return runShell(command, [versionArg]).ok;
}

export function runInteractive(bin, args, { cwd } = {}) {
    const useShell = isWindows && bin !== 'agy';
    const result = useShell
        ? spawnSync([bin, ...args.map(quote)].join(' '), { cwd, stdio: 'inherit', shell: true })
        : spawnSync(bin, args, { cwd, stdio: 'inherit' });
    if (result.error) throw result.error;
    return result.status ?? 1;
}
