import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
    CONFIG_PATH,
    CONTEXT_PATH,
    FILES_DIR,
    MCP_NAME,
    ROOT,
    TEMPLATES_DIR,
    WORKSPACES_DIR,
    loadConfig,
    platformName,
    saveConfig,
    slugify,
} from './lib/config.mjs';
import { AGENTS } from './lib/agents.mjs';
import { hasCommand, runShell } from './lib/proc.mjs';
import { renderAll } from './lib/render.mjs';
import { ask, askSecret, banner, c, confirm, section, select } from './lib/ui.mjs';

function checkPrerequisites() {
    section('Verificando a máquina');
    console.log(`Sistema operacional: ${c.bold(platformName())}`);

    const nodeMajor = Number(process.versions.node.split('.')[0]);
    const nodeOk = nodeMajor >= 18;
    console.log(`${nodeOk ? c.green('✔') : c.red('✘')} Node.js ${process.versions.node}${nodeOk ? '' : ' (precisa ser 18 ou mais novo)'}`);

    const npxOk = hasCommand('npx');
    console.log(`${npxOk ? c.green('✔') : c.red('✘')} npx`);

    const agents = AGENTS.map((agent) => ({ agent, ok: hasCommand(agent.bin, agent.versionArg) }));
    agents.forEach(({ agent, ok }) => {
        console.log(`${ok ? c.green('✔') : c.gray('–')} ${agent.label} (${agent.bin})${ok ? '' : c.gray(' não instalado')}`);
    });
    const agyOk = agents.some(({ agent, ok }) => agent.bin === 'agy' && ok);
    const anyAgent = agents.some(({ ok }) => ok);

    if (!anyAgent) {
        console.log(c.yellow('  Instale pelo menos uma IA: Antigravity CLI (agy), Codex (codex) ou Claude Code (claude).'));
    }
    if (!nodeOk || !npxOk) {
        console.log(c.yellow('  Instale/atualize o Node.js em https://nodejs.org (versão LTS).'));
    }
    return { ok: nodeOk && npxOk && anyAgent, agyOk, npxOk };
}

async function askProject(previous) {
    section('Projeto');
    const name = await ask('Nome do projeto', { def: previous?.name, required: true });
    const description = await ask('Descrição curta (opcional)', { def: previous?.description });

    mkdirSync(dirname(CONTEXT_PATH), { recursive: true });
    if (!existsSync(CONTEXT_PATH)) {
        copyFileSync(join(TEMPLATES_DIR, 'PROJECT.md'), CONTEXT_PATH);
        console.log(c.green(`\nCriado ${CONTEXT_PATH}`));
    }
    console.log(c.gray('Preencha context/PROJECT.md com o contexto do projeto (perfis, módulos, regras, como autenticar na API).'));
    console.log(c.gray('O agente lê esse arquivo em toda execução.'));
    return { name, description };
}

async function askProfiles(previous) {
    section('Perfis de usuário');
    console.log(c.gray('O agente testa com dois perfis: um administrador e um usuário padrão.'));
    console.log(c.gray('Dê o nome que eles têm neste projeto (ex.: "Franqueadora" e "Franqueado").'));
    const adminLabel = await ask('Nome do perfil administrador', { def: previous?.admin.label ?? 'Administrador', required: true });
    const userLabel = await ask('Nome do perfil padrão', { def: previous?.user.label ?? 'Usuário padrão', required: true });
    const differences = await ask('O que muda entre eles, em uma frase (opcional)', { def: previous?.differences });
    return { admin: { label: adminLabel }, user: { label: userLabel }, differences };
}

async function askUser(label, previous) {
    const username = await ask(`  Usuário ${label}`, { def: previous?.username, required: true });
    const password = await askSecret(`  Senha ${label}`, { def: previous?.password });
    return { username, password };
}

async function askEnvironment(profiles, environments, previous) {
    const name = await ask('Nome do ambiente (ex.: Homologação, Local)', { def: previous?.name, required: true });
    let slug = await ask('Nome da pasta', { def: previous?.slug ?? slugify(name), required: true });
    slug = slugify(slug);
    while (environments.some((e) => e.slug === slug)) {
        console.log(c.yellow(`  Já existe um ambiente com a pasta "${slug}".`));
        slug = slugify(await ask('Nome da pasta', { required: true }));
    }
    const frontUrl = await ask('URL do front', { def: previous?.frontUrl, required: true });
    const apiUrl = await ask('URL da API (opcional)', { def: previous?.apiUrl });
    const notes = await ask('Observações sobre o ambiente (opcional)', { def: previous?.notes });

    let users;
    const last = environments.at(-1);
    if (last && (await confirm(`Usar as mesmas credenciais do ambiente "${last.name}"?`))) {
        users = structuredClone(last.users);
    } else {
        console.log(c.gray('\nCredenciais deste ambiente:'));
        users = {
            admin: await askUser(`(${profiles.admin.label})`, previous?.users.admin),
            user: await askUser(`(${profiles.user.label})`, previous?.users.user),
        };
    }
    return { name, slug, frontUrl, apiUrl, notes, users };
}

async function askEnvironments(profiles, previous = []) {
    section('Ambientes');
    const environments = [];
    let index = 0;
    do {
        console.log(c.cyan(`\nAmbiente ${index + 1}`));
        environments.push(await askEnvironment(profiles, environments, previous[index]));
        index++;
    } while (await confirm('Adicionar outro ambiente?', index < previous.length));
    return environments;
}

async function setupMachine(config, prerequisites) {
    section('Navegador do agente (Playwright MCP)');
    if (!prerequisites.npxOk) {
        console.log(c.yellow('Pulado: falta o npx. Instale o Node.js e rode o setup de novo escolhendo "Só configurar a máquina".'));
        return false;
    }

    const browserChoice = await select('Qual navegador o agente deve usar?', [
        'Google Chrome já instalado na máquina',
        'Chromium do Playwright (baixa agora, ~150 MB)',
    ], { initial: config.browser === 'chromium' ? 1 : 0 });
    config.browser = browserChoice === 1 ? 'chromium' : 'chrome';

    if (config.browser === 'chromium') {
        console.log(c.gray('\nBaixando o Chromium do Playwright...'));
        const installed = runShell('npx', ['-y', 'playwright@latest', 'install', 'chromium'], { inherit: true });
        console.log(installed.ok ? c.green('✔ Chromium instalado') : c.yellow('Não foi possível baixar o Chromium agora; o agente tentará na primeira execução.'));
    }

    console.log(c.gray('Codex e Claude Code recebem o navegador a cada execução; não precisam de configuração.'));

    if (!prerequisites.agyOk) return true;

    const mcpArgs = ['-y', '@playwright/mcp@latest', '--output-dir', WORKSPACES_DIR];
    if (config.browser === 'chromium') mcpArgs.push('--browser', 'chromium');

    console.log(c.gray(`\nRegistrando o MCP "${MCP_NAME}" no Antigravity...`));
    const added = runShell('agy', ['mcp', 'add', MCP_NAME, '--', 'npx', ...mcpArgs]);
    if (!added.ok) {
        console.log(c.red('Falha ao registrar o MCP no Antigravity:'));
        console.log(added.stderr || added.stdout);
        return false;
    }
    console.log(c.green(`✔ MCP "${MCP_NAME}" registrado no Antigravity`));
    return true;
}

async function main() {
    banner('Setup');
    const prerequisites = checkPrerequisites();

    let config = loadConfig();
    let mode = 0;
    if (config) {
        mode = await select(`Já existe uma configuração (${config.project.name}). O que deseja fazer?`, [
            'Reconfigurar (respostas atuais viram padrão)',
            'Adicionar um ambiente',
            'Só configurar a máquina (MCP / navegador)',
            'Sair',
        ]);
        if (mode === 3) return;
    }

    if (!config || mode === 0) {
        const project = await askProject(config?.project);
        const profiles = await askProfiles(config?.profiles);
        const environments = await askEnvironments(profiles, config?.environments);
        config = { version: 1, project, profiles, environments, browser: config?.browser ?? 'chrome' };
    } else if (mode === 1) {
        section('Novo ambiente');
        config.environments.push(await askEnvironment(config.profiles, config.environments));
    }

    saveConfig(config);
    mkdirSync(FILES_DIR, { recursive: true });
    const dirs = renderAll(config);

    if (!config.machineReady || mode === 0 || mode === 2) {
        config.machineReady = await setupMachine(config, prerequisites);
        saveConfig(config);
    }

    section('Pronto');
    console.log(`Configuração salva em ${c.bold(CONFIG_PATH)} ${c.gray('(fica só na sua máquina)')}`);
    console.log('Pastas dos ambientes:');
    dirs.forEach((d) => console.log(`  • ${d}`));
    console.log('');
    console.log(`Próximos passos:`);
    console.log(`  1. Preencha ${c.bold(join('context', 'PROJECT.md'))}`);
    console.log(`  2. Rode ${c.bold(process.platform === 'win32' ? 'qa.bat' : './qa.sh')} (ou ${c.bold('npm run qa')}) para testar`);
    if (!config.machineReady) {
        console.log(c.yellow('  ! A máquina não ficou pronta (veja os avisos acima). Rode o setup de novo depois de corrigir.'));
    }
    console.log(c.gray(`\nRaiz do projeto: ${ROOT}`));
}

main().catch((error) => {
    console.error(c.red(`\nErro: ${error.message}`));
    process.exit(1);
});
