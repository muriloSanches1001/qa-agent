import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONFIG_PATH = join(ROOT, 'qa.config.json');
export const TEMPLATES_DIR = join(ROOT, 'templates');
export const WORKSPACES_DIR = join(ROOT, 'workspaces');
export const FILES_DIR = join(ROOT, 'files');
export const CONTEXT_PATH = join(ROOT, 'context', 'PROJECT.md');

export const MCP_NAME = 'qa-playwright';

export function loadConfig() {
    if (!existsSync(CONFIG_PATH)) return null;
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
}

export function saveConfig(config) {
    writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export function slugify(text) {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function workspaceDir(env) {
    return join(WORKSPACES_DIR, env.slug);
}

export function platformName() {
    return { win32: 'Windows', darwin: 'macOS', linux: 'Linux' }[process.platform] ?? process.platform;
}
