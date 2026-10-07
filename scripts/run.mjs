import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { installedAgents } from './lib/agents.mjs';
import { FILES_DIR, loadConfig, saveConfig, workspaceDir } from './lib/config.mjs';
import { runInteractive } from './lib/proc.mjs';
import { renderWorkspace } from './lib/render.mjs';
import { ask, banner, c, section, select } from './lib/ui.mjs';

const MODES = [
    { label: 'Navegador  (/qa-browser)', command: '/qa-browser' },
    { label: 'API        (/qa-api)', command: '/qa-api' },
    { label: 'Reexecutar cases existentes  (/qa-run)', command: '/qa-run' },
];

async function pickEnvironment(config) {
    if (config.environments.length === 1) return config.environments[0];
    const labels = config.environments.map((e) => `${e.name.padEnd(16)} ${e.frontUrl}`);
    return config.environments[await select('Em qual ambiente quer testar?', labels)];
}

async function pickAgent(config) {
    const agents = installedAgents();
    if (agents.length === 0) {
        console.log(c.yellow('\nNenhuma IA encontrada (agy, codex ou claude). Instale pelo menos uma e rode de novo.'));
        process.exit(1);
    }
    const last = config.lastRun ?? {};
    const agentIndex = Math.max(agents.findIndex((a) => a.id === last.agent), 0);
    const agent = agents[await select('Qual IA vai testar?', agents.map((a) => a.label), { initial: agentIndex })];

    const models = agent.models();
    const modelIndex = Math.max(models.findIndex((m) => m.id === last.model), 0);
    const model = models[await select(`Qual modelo do ${agent.label}? (raciocínio ${agent.effort})`, models.map((m) => m.label), { initial: modelIndex })];

    config.lastRun = { agent: agent.id, model: model.id };
    saveConfig(config);
    return { agent, model };
}

async function pickCases(dir) {
    const casesDir = join(dir, 'cases');
    const cases = existsSync(casesDir)
        ? readdirSync(casesDir).filter((f) => f.endsWith('.md') && f !== '_TEMPLATE.md').sort()
        : [];
    if (cases.length === 0) {
        console.log(c.yellow('\nAinda não há cases neste ambiente. Rode primeiro em modo Navegador ou API.'));
        process.exit(1);
    }
    const names = cases.map((f) => basename(f, '.md'));
    const picked = await select('Quais cases reexecutar?', ['Todos (all)', ...names]);
    return picked === 0 ? 'all' : names[picked - 1];
}

async function pickSource() {
    const source = await select('De onde vem o que deve ser testado?', [
        'Arquivo   (da pasta files/)',
        'Contexto  (digitar agora)',
    ]);

    if (source === 1) {
        console.log(c.cyan('\nDescreva o que deve ser testado (Enter vazio = o agente pergunta):'));
        return { argument: await ask('>') };
    }

    mkdirSync(FILES_DIR, { recursive: true });
    const files = readdirSync(FILES_DIR, { withFileTypes: true })
        .filter((e) => e.isFile() && !e.name.startsWith('.'))
        .map((e) => e.name)
        .sort();
    if (files.length === 0) {
        console.log(c.yellow(`\nNenhum arquivo em ${FILES_DIR}`));
        console.log(c.yellow('Coloque o arquivo lá e rode de novo.'));
        process.exit(1);
    }
    const file = join(FILES_DIR, files[await select('Qual arquivo?', files)]);
    return { argument: `@${file}`, file };
}

async function main() {
    banner('Testes');

    const config = loadConfig();
    if (!config) {
        console.log(c.yellow('Nenhuma configuração encontrada. Rode o setup primeiro (setup.bat / ./setup.sh / npm run setup).'));
        process.exit(1);
    }
    console.log(c.gray(config.project.name));

    const { agent, model } = await pickAgent(config);
    const env = await pickEnvironment(config);
    const dir = workspaceDir(env);
    renderWorkspace(config, env);

    const mode = MODES[await select('Como quer testar?', MODES.map((m) => m.label))];

    let argument = '';
    let file = null;
    if (mode.command === '/qa-run') {
        argument = await pickCases(dir);
    } else {
        ({ argument, file } = await pickSource());
    }

    const prompt = agent.prompt({ command: mode.command, argument: file ? '' : argument, file });

    section('Iniciando o agente');
    console.log(`IA       : ${agent.label} · ${model.id} (raciocínio ${agent.effort})`);
    console.log(`Ambiente : ${env.name}`);
    console.log(`Pasta    : ${dir}`);
    console.log(`Comando  : ${prompt}`);
    if (file) console.log(`Arquivo  : ${basename(file)} ${c.gray('(será excluído de files/ ao final)')}`);
    console.log(c.yellow('Permissões: todas liberadas — o agente não vai pedir confirmação.'));
    console.log('');

    const args = agent.args({ model: model.id, prompt, filesDir: file ? FILES_DIR : null, cwd: dir, config });

    let status;
    try {
        status = runInteractive(agent.bin, args, { cwd: dir });
    } catch (error) {
        console.error(c.red(`Não foi possível iniciar o ${agent.bin}: ${error.message}`));
        process.exit(1);
    }

    console.log('');
    if (file) {
        if (status === 0) {
            rmSync(file, { force: true });
            console.log(c.green(`Arquivo ${basename(file)} excluído de files/.`));
        } else {
            console.log(c.yellow(`O agente terminou com erro (código ${status}); o arquivo ${basename(file)} foi mantido em files/.`));
        }
    }
    console.log(c.cyan(`Cases e relatórios ficam em ${dir}`));
    process.exit(status);
}

main().catch((error) => {
    console.error(c.red(`\nErro: ${error.message}`));
    process.exit(1);
});
