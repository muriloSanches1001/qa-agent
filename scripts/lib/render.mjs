import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { CONTEXT_PATH, MCP_NAME, TEMPLATES_DIR, workspaceDir } from './config.mjs';

const WORKSPACE_TEMPLATE = join(TEMPLATES_DIR, 'workspace');

function listFiles(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        return entry.isDirectory() ? listFiles(full) : [full];
    });
}

function cell(value) {
    return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function envTable(env) {
    const rows = [
        ['Ambiente', env.name],
        ['Front', env.frontUrl],
        ['API', env.apiUrl || 'não informada — descubra pelas requisições de rede do front e registre no relatório'],
    ];
    return rows.map(([k, v]) => `| ${k} | ${cell(v)} |`).join('\n');
}

function envNotes(env) {
    if (!env.notes) return '';
    return `\n> **Observações deste ambiente:** ${env.notes.trim()}\n`;
}

function credentialsTable(config, env) {
    const { admin, user } = config.profiles;
    return [
        `| ${cell(admin.label)} (administrador) | \`${cell(env.users.admin.username)}\` | \`${cell(env.users.admin.password)}\` |`,
        `| ${cell(user.label)} (padrão) | \`${cell(env.users.user.username)}\` | \`${cell(env.users.user.password)}\` |`,
    ].join('\n');
}

function profileDiff(config) {
    const text = config.profiles.differences?.trim();
    return text || 'Não descrito no setup. Consulte a seção "Perfis de usuário" do `CONTEXT.md`.';
}

function variables(config, env) {
    return {
        PROJECT_NAME: config.project.name,
        PROJECT_DESCRIPTION: config.project.description || '',
        ENV_NAME: env.name,
        ENV_SLUG: env.slug,
        FRONT_URL: env.frontUrl,
        ENV_TABLE: envTable(env),
        ENV_NOTES: envNotes(env),
        CREDENTIALS_TABLE: credentialsTable(config, env),
        PROFILE_DIFF: profileDiff(config),
        ADMIN_LABEL: config.profiles.admin.label,
        USER_LABEL: config.profiles.user.label,
        MCP_NAME,
    };
}

function fill(template, vars) {
    return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => (key in vars ? vars[key] : match));
}

export function renderWorkspace(config, env) {
    const target = workspaceDir(env);
    const vars = variables(config, env);

    for (const source of listFiles(WORKSPACE_TEMPLATE)) {
        const path = relative(WORKSPACE_TEMPLATE, source);
        const content = fill(readFileSync(source, 'utf8'), vars);
        const destinations = [path];
        if (path.startsWith(join('.agents', 'skills'))) {
            destinations.push(join('.claude', relative('.agents', path)));
        }
        for (const destination of destinations.map((p) => join(target, p))) {
            mkdirSync(join(destination, '..'), { recursive: true });
            writeFileSync(destination, content, 'utf8');
        }
    }

    const context = existsSync(CONTEXT_PATH)
        ? readFileSync(CONTEXT_PATH, 'utf8')
        : '# Contexto do projeto\n\nNão preenchido. Peça ao usuário o contexto que faltar.\n';
    writeFileSync(join(target, 'CONTEXT.md'), context, 'utf8');

    return target;
}

export function renderAll(config) {
    return config.environments.map((env) => renderWorkspace(config, env));
}
