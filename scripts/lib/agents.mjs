import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MCP_NAME, WORKSPACES_DIR } from './config.mjs';
import { hasCommand, runShell } from './proc.mjs';

const isWindows = process.platform === 'win32';

function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

function latest(ids, pattern) {
    return ids
        .map((id) => ({ id, match: id.match(pattern) }))
        .filter((x) => x.match)
        .sort((x, y) => compareVersions(y.match[1], x.match[1]))[0]?.id;
}

function antigravityModels() {
    const listed = runShell('agy', ['models']);
    const ids = listed.ok
        ? listed.stdout.split(/\r?\n/).filter((l) => l.includes('\t')).map((l) => l.split('\t')[0].trim())
        : [];
    const flash = latest(ids, /^gemini-([\d.]+)-flash-high$/) ?? 'gemini-3.8-flash-high';
    const pro = latest(ids, /^gemini-([\d.]+)-pro-high$/) ?? 'gemini-3.1-pro-high';
    return [
        { id: flash, label: `Gemini Flash  (${flash})` },
        { id: pro, label: `Gemini Pro    (${pro})` },
    ];
}

const CODEX_MODELS = [
    { id: 'gpt-6-luna', label: 'GPT-6 Luna' },
    { id: 'gpt-6-sol', label: 'GPT-6 Sol' },
    { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
];

function codexModels() {
    const cache = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'models_cache.json');
    if (!existsSync(cache)) return CODEX_MODELS;
    const slugs = new Set([...readFileSync(cache, 'utf8').matchAll(/"slug"\s*:\s*"([^"]+)"/g)].map((m) => m[1]));
    const available = CODEX_MODELS.filter((m) => slugs.has(m.id));
    return available.length ? available : CODEX_MODELS;
}

function claudeModels() {
    return [
        { id: 'claude-opus-5-5', label: 'Opus 5.5' },
        { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
    ];
}

function playwrightServer(config) {
    const args = ['-y', '@playwright/mcp@latest', '--output-dir', WORKSPACES_DIR];
    if (config.browser === 'chromium') args.push('--browser', 'chromium');
    return isWindows ? { command: 'cmd', args: ['/c', 'npx', ...args] } : { command: 'npx', args };
}

function skillName(command) {
    return command.replace(/^\//, '');
}

export const AGENTS = [
    {
        id: 'antigravity',
        label: 'Antigravity',
        bin: 'agy',
        versionArg: '--help',
        effort: 'máximo',
        models: antigravityModels,
        prompt: ({ command, argument, file }) => `${command} ${file ? `@${file}` : argument}`.trim(),
        args: ({ model, prompt, filesDir }) => [
            '--dangerously-skip-permissions',
            '--model', model,
            '--effort', 'high',
            ...(filesDir ? ['--add-dir', filesDir] : []),
            '-i', prompt,
        ],
    },
    {
        id: 'codex',
        label: 'Codex',
        bin: 'codex',
        versionArg: '--version',
        effort: 'medium',
        models: codexModels,
        prompt: ({ command, argument, file }) => {
            const name = skillName(command);
            const input = file
                ? `Arquivo de especificação: ${file}`
                : argument
                    ? `Argumento: ${argument}`
                    : 'Nenhum argumento: pergunte ao usuário o que testar.';
            return `Execute o comando ${name} seguindo as instruções de .agents/skills/${name}/SKILL.md. ${input}`;
        },
        args: ({ model, prompt, filesDir, cwd, config }) => {
            const server = playwrightServer(config);
            const key = `mcp_servers.${MCP_NAME}`;
            return [
                '--no-daemon',
                '--dangerously-bypass-approvals-and-sandbox',
                '-m', model,
                '-c', 'model_reasoning_effort="medium"',
                '-c', `${key}.command=${JSON.stringify(server.command)}`,
                '-c', `${key}.args=[${server.args.map((a) => JSON.stringify(a)).join(',')}]`,
                '-c', `${key}.startup_timeout_sec=120`,
                '-C', cwd,
                ...(filesDir ? ['--add-dir', filesDir] : []),
                prompt,
            ];
        },
    },
    {
        id: 'claude',
        label: 'Claude Code',
        bin: 'claude',
        versionArg: '--version',
        effort: 'medium',
        models: claudeModels,
        prompt: ({ command, argument, file }) => `${command} ${file ? `@${file}` : argument}`.trim(),
        args: ({ model, prompt, filesDir, cwd, config }) => {
            const mcpConfig = join(cwd, '.mcp-qa.json');
            writeFileSync(mcpConfig, JSON.stringify({ mcpServers: { [MCP_NAME]: playwrightServer(config) } }, null, 2));
            return [
                prompt,
                '--dangerously-skip-permissions',
                '--model', model,
                '--effort', 'medium',
                '--mcp-config', mcpConfig,
                ...(filesDir ? ['--add-dir', filesDir] : []),
            ];
        },
    },
];

export function installedAgents() {
    return AGENTS.filter((agent) => hasCommand(agent.bin, agent.versionArg));
}
