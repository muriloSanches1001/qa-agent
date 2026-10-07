import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const wrap = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`;

export const c = {
    cyan: wrap('36'),
    gray: wrap('90'),
    yellow: wrap('33'),
    green: wrap('32'),
    red: wrap('31'),
    bold: wrap('1'),
    selected: wrap('30;46'),
};

const LOGO = [
    ' ██████╗  █████╗      █████╗  ██████╗ ███████╗███╗   ██╗████████╗',
    '██╔═══██╗██╔══██╗    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝',
    '██║   ██║███████║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ',
    '██║▄▄ ██║██╔══██║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ',
    '╚██████╔╝██║  ██║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ',
    ' ╚══▀▀═╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ',
];

function packageVersion() {
    try {
        return JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json'), 'utf8')).version;
    } catch {
        return '';
    }
}

export function banner(subtitle) {
    const width = LOGO[0].length;
    const version = packageVersion();
    console.log('');
    if ((process.stdout.columns || 80) > width + 2) {
        LOGO.forEach((line) => console.log(` ${c.cyan(line)}`));
    } else {
        console.log(c.bold(c.cyan('  QA AGENT')));
    }
    const left = `  ${subtitle}${version ? ` · v${version}` : ''}`;
    const right = 'by: Murilo Sanches';
    const gap = Math.max(width + 1 - left.length - right.length, 2);
    console.log(`${c.bold(left)}${' '.repeat(gap)}${c.gray(right)}`);
    console.log(c.cyan(` ${'─'.repeat(width)}`));
}

export function section(title) {
    console.log('');
    console.log(c.bold(c.cyan(`── ${title} `.padEnd(60, '─'))));
}

function cancel() {
    process.stdout.write('\x1b[?25h');
    console.log(c.yellow('\nCancelado.'));
    process.exit(1);
}

function truncate(text) {
    const max = Math.max((process.stdout.columns || 80) - 8, 20);
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function select(title, options, { initial = 0 } = {}) {
    if (!process.stdin.isTTY) {
        console.log(`\n${title}`);
        options.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
        const answer = await ask('Número', { required: true });
        const n = Number(answer) - 1;
        return n >= 0 && n < options.length ? n : initial;
    }

    const lines = options.map(truncate);
    const out = process.stdout;
    const inp = process.stdin;

    out.write(`\n${c.cyan(title)}\n${c.gray('(setas para navegar, Enter para confirmar, Esc para sair)')}\n`);

    return new Promise((resolve) => {
        let index = initial;

        const render = (first) => {
            if (!first) out.write(`\x1b[${lines.length}A`);
            lines.forEach((line, i) => {
                out.write('\x1b[2K');
                out.write(i === index ? `${c.selected(`  > ${line}  `)}\n` : `    ${line}\n`);
            });
        };

        const cleanup = () => {
            inp.off('keypress', onKey);
            inp.setRawMode(false);
            inp.pause();
            out.write('\x1b[?25h');
        };

        const onKey = (_str, key) => {
            if (!key) return;
            if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
                cleanup();
                cancel();
            }
            if (key.name === 'up') index = (index - 1 + lines.length) % lines.length;
            else if (key.name === 'down') index = (index + 1) % lines.length;
            else if (key.name === 'return' || key.name === 'enter') {
                cleanup();
                resolve(index);
                return;
            } else return;
            render(false);
        };

        readline.emitKeypressEvents(inp);
        inp.setRawMode(true);
        inp.resume();
        out.write('\x1b[?25l');
        render(true);
        inp.on('keypress', onKey);
    });
}

export async function confirm(question, defaultYes = true) {
    const options = defaultYes ? ['Sim', 'Não'] : ['Não', 'Sim'];
    const picked = await select(question, options);
    return options[picked] === 'Sim';
}

export async function ask(question, { def = '', required = false } = {}) {
    while (true) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.on('SIGINT', () => {
            rl.close();
            cancel();
        });
        const hint = def ? c.gray(` [${def}]`) : '';
        const answer = await new Promise((resolve) => rl.question(`${question}${hint}: `, resolve));
        rl.close();
        const value = answer.trim() || def;
        if (value || !required) return value;
        console.log(c.yellow('  Campo obrigatório.'));
    }
}

export async function askSecret(question, { def = '' } = {}) {
    if (!process.stdin.isTTY) return ask(question, { def });

    const out = process.stdout;
    const inp = process.stdin;
    const hint = def ? c.gray(' [Enter mantém a atual]') : '';
    out.write(`${question}${hint}: `);

    return new Promise((resolve) => {
        let value = '';

        const cleanup = () => {
            inp.off('keypress', onKey);
            inp.setRawMode(false);
            inp.pause();
        };

        const onKey = (str, key) => {
            if (key && key.ctrl && key.name === 'c') {
                cleanup();
                cancel();
            }
            if (key && (key.name === 'return' || key.name === 'enter')) {
                cleanup();
                out.write('\n');
                resolve(value || def);
                return;
            }
            if (key && key.name === 'backspace') {
                if (value) {
                    value = value.slice(0, -1);
                    out.write('\b \b');
                }
                return;
            }
            if (str && !(key && key.ctrl) && /^[^\x00-\x1f\x7f]+$/.test(str)) {
                value += str;
                out.write('*'.repeat(str.length));
            }
        };

        readline.emitKeypressEvents(inp);
        inp.setRawMode(true);
        inp.resume();
        inp.on('keypress', onKey);
    });
}
